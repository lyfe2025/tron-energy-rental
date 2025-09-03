-- 创建 bot_network_configs 关联表
-- 管理机器人与TRON网络的多对多关系配置
-- 创建时间: 2025-01-25
-- 作者: 配置管理迁移项目

-- 开始事务
BEGIN;

-- 创建 bot_network_configs 表
CREATE TABLE IF NOT EXISTS bot_network_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bot_id UUID NOT NULL,
    network_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}',
    api_settings JSONB DEFAULT '{}',
    contract_addresses JSONB DEFAULT '{}',
    gas_settings JSONB DEFAULT '{}',
    monitoring_settings JSONB DEFAULT '{}',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'pending',
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 外键约束
    CONSTRAINT fk_bot_network_configs_bot_id 
        FOREIGN KEY (bot_id) REFERENCES telegram_bots(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_bot_network_configs_network_id 
        FOREIGN KEY (network_id) REFERENCES tron_networks(id) 
        ON DELETE CASCADE,
    
    -- 唯一约束：每个机器人在每个网络上只能有一个配置
    CONSTRAINT uk_bot_network_configs_bot_network 
        UNIQUE (bot_id, network_id)
);

-- 添加表注释
COMMENT ON TABLE bot_network_configs IS '机器人网络配置关联表：管理机器人与TRON网络的多对多关系和特定配置';

-- 添加字段注释
COMMENT ON COLUMN bot_network_configs.id IS '配置记录唯一标识符（UUID）';
COMMENT ON COLUMN bot_network_configs.bot_id IS '机器人ID，关联telegram_bots表';
COMMENT ON COLUMN bot_network_configs.network_id IS '网络ID，关联tron_networks表';
COMMENT ON COLUMN bot_network_configs.is_active IS '是否启用该网络配置';
COMMENT ON COLUMN bot_network_configs.is_primary IS '是否为该机器人的主要网络';
COMMENT ON COLUMN bot_network_configs.priority IS '网络优先级，数值越大优先级越高';
COMMENT ON COLUMN bot_network_configs.config IS '机器人在该网络上的特定配置';
COMMENT ON COLUMN bot_network_configs.api_settings IS 'API相关设置（超时、重试等）';
COMMENT ON COLUMN bot_network_configs.contract_addresses IS '智能合约地址配置';
COMMENT ON COLUMN bot_network_configs.gas_settings IS 'Gas费用设置';
COMMENT ON COLUMN bot_network_configs.monitoring_settings IS '监控设置';
COMMENT ON COLUMN bot_network_configs.last_sync_at IS '最后同步时间';
COMMENT ON COLUMN bot_network_configs.sync_status IS '同步状态：pending, syncing, synced, error';
COMMENT ON COLUMN bot_network_configs.error_count IS '错误计数';
COMMENT ON COLUMN bot_network_configs.last_error IS '最后错误信息';
COMMENT ON COLUMN bot_network_configs.last_error_at IS '最后错误时间';
COMMENT ON COLUMN bot_network_configs.created_by IS '创建者用户ID';
COMMENT ON COLUMN bot_network_configs.created_at IS '创建时间';
COMMENT ON COLUMN bot_network_configs.updated_at IS '最后更新时间';

-- 添加约束
ALTER TABLE bot_network_configs 
    ADD CONSTRAINT chk_sync_status 
    CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error'));

ALTER TABLE bot_network_configs 
    ADD CONSTRAINT chk_error_count_positive 
    CHECK (error_count >= 0);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_bot_network_configs_bot_id ON bot_network_configs(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_network_configs_network_id ON bot_network_configs(network_id);
CREATE INDEX IF NOT EXISTS idx_bot_network_configs_is_active ON bot_network_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_bot_network_configs_is_primary ON bot_network_configs(is_primary);
CREATE INDEX IF NOT EXISTS idx_bot_network_configs_priority ON bot_network_configs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_bot_network_configs_sync_status ON bot_network_configs(sync_status);
CREATE INDEX IF NOT EXISTS idx_bot_network_configs_last_sync ON bot_network_configs(last_sync_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_network_configs_error_count ON bot_network_configs(error_count DESC);

-- 创建唯一约束：确保每个机器人只有一个主要网络
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_network_configs_unique_primary 
    ON bot_network_configs(bot_id, is_primary) 
    WHERE is_primary = true;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_bot_network_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bot_network_configs_updated_at
    BEFORE UPDATE ON bot_network_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_bot_network_configs_updated_at();

-- 创建函数：获取机器人的主要网络配置
CREATE OR REPLACE FUNCTION get_bot_primary_network(p_bot_id UUID)
RETURNS TABLE (
    bot_id UUID,
    network_id UUID,
    network_name VARCHAR,
    network_type VARCHAR,
    rpc_url VARCHAR,
    config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bnc.bot_id,
        bnc.network_id,
        tn.name,
        tn.network_type,
        tn.rpc_url,
        bnc.config
    FROM bot_network_configs bnc
    JOIN tron_networks tn ON bnc.network_id = tn.id
    WHERE bnc.bot_id = p_bot_id 
        AND bnc.is_active = true 
        AND bnc.is_primary = true
        AND tn.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取机器人的所有网络配置
CREATE OR REPLACE FUNCTION get_bot_network_configs(p_bot_id UUID)
RETURNS TABLE (
    config_id UUID,
    bot_id UUID,
    network_id UUID,
    network_name VARCHAR,
    network_type VARCHAR,
    rpc_url VARCHAR,
    is_active BOOLEAN,
    is_primary BOOLEAN,
    priority INTEGER,
    config JSONB,
    sync_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bnc.id,
        bnc.bot_id,
        bnc.network_id,
        tn.name,
        tn.network_type,
        tn.rpc_url,
        bnc.is_active,
        bnc.is_primary,
        bnc.priority,
        bnc.config,
        bnc.sync_status
    FROM bot_network_configs bnc
    JOIN tron_networks tn ON bnc.network_id = tn.id
    WHERE bnc.bot_id = p_bot_id
    ORDER BY bnc.priority DESC, tn.priority DESC, tn.name;
END;
$$ LANGUAGE plpgsql;

-- 提交事务
COMMIT;

-- 验证迁移结果
SELECT 
    table_name, 
    constraint_name, 
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'bot_network_configs' 
    AND table_schema = 'public'
ORDER BY constraint_type, constraint_name;