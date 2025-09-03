-- 扩展 energy_pools 表字段
-- 添加网络关联、账户管理、监控等字段
-- 创建时间: 2025-01-25
-- 作者: 配置管理迁移项目

-- 开始事务
BEGIN;

-- 添加新字段到 energy_pools 表
ALTER TABLE energy_pools 
    ADD COLUMN IF NOT EXISTS network_id UUID,
    ADD COLUMN IF NOT EXISTS account_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS account_alias VARCHAR(100),
    ADD COLUMN IF NOT EXISTS account_group VARCHAR(50),
    ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS api_settings JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS monitoring_settings JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS security_settings JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS last_balance_check TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS balance_trx NUMERIC(20,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance_energy BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance_bandwidth BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_error TEXT,
    ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS is_managed BOOLEAN DEFAULT true;

-- 添加外键约束（如果 tron_networks 表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tron_networks') THEN
        ALTER TABLE energy_pools 
            ADD CONSTRAINT fk_energy_pools_network_id 
            FOREIGN KEY (network_id) REFERENCES tron_networks(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

-- 添加字段注释
COMMENT ON COLUMN energy_pools.network_id IS '关联的TRON网络ID，关联tron_networks表';
COMMENT ON COLUMN energy_pools.account_name IS '账户显示名称，用于管理界面标识';
COMMENT ON COLUMN energy_pools.account_alias IS '账户别名，便于记忆和管理';
COMMENT ON COLUMN energy_pools.account_group IS '账户分组，用于批量管理';
COMMENT ON COLUMN energy_pools.config IS '账户特定配置（JSON格式）';
COMMENT ON COLUMN energy_pools.api_settings IS 'API相关设置（超时、重试等）';
COMMENT ON COLUMN energy_pools.monitoring_settings IS '监控设置（阈值、告警等）';
COMMENT ON COLUMN energy_pools.security_settings IS '安全设置（访问控制、加密等）';
COMMENT ON COLUMN energy_pools.auto_sync_enabled IS '是否启用自动同步';
COMMENT ON COLUMN energy_pools.sync_interval_minutes IS '同步间隔（分钟）';
COMMENT ON COLUMN energy_pools.last_sync_at IS '最后同步时间';
COMMENT ON COLUMN energy_pools.sync_status IS '同步状态：pending, syncing, synced, error';
COMMENT ON COLUMN energy_pools.last_balance_check IS '最后余额检查时间';
COMMENT ON COLUMN energy_pools.balance_trx IS 'TRX余额';
COMMENT ON COLUMN energy_pools.balance_energy IS '能量余额';
COMMENT ON COLUMN energy_pools.balance_bandwidth IS '带宽余额';
COMMENT ON COLUMN energy_pools.health_status IS '健康状态：healthy, unhealthy, unknown, error';
COMMENT ON COLUMN energy_pools.last_health_check IS '最后健康检查时间';
COMMENT ON COLUMN energy_pools.error_count IS '错误计数';
COMMENT ON COLUMN energy_pools.last_error IS '最后错误信息';
COMMENT ON COLUMN energy_pools.last_error_at IS '最后错误时间';
COMMENT ON COLUMN energy_pools.tags IS '标签数组，用于分类和过滤';
COMMENT ON COLUMN energy_pools.metadata IS '额外的元数据信息';
COMMENT ON COLUMN energy_pools.created_by IS '创建者用户ID';
COMMENT ON COLUMN energy_pools.is_managed IS '是否为托管账户';

-- 添加约束
ALTER TABLE energy_pools 
    ADD CONSTRAINT chk_sync_status 
    CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error'));

ALTER TABLE energy_pools 
    ADD CONSTRAINT chk_health_status 
    CHECK (health_status IN ('healthy', 'unhealthy', 'unknown', 'error'));

ALTER TABLE energy_pools 
    ADD CONSTRAINT chk_sync_interval_positive 
    CHECK (sync_interval_minutes > 0);

ALTER TABLE energy_pools 
    ADD CONSTRAINT chk_error_count_positive 
    CHECK (error_count >= 0);

ALTER TABLE energy_pools 
    ADD CONSTRAINT chk_balance_trx_positive 
    CHECK (balance_trx >= 0);

ALTER TABLE energy_pools 
    ADD CONSTRAINT chk_balance_energy_positive 
    CHECK (balance_energy >= 0);

ALTER TABLE energy_pools 
    ADD CONSTRAINT chk_balance_bandwidth_positive 
    CHECK (balance_bandwidth >= 0);

-- 创建新索引
CREATE INDEX IF NOT EXISTS idx_energy_pools_network_id ON energy_pools(network_id);
CREATE INDEX IF NOT EXISTS idx_energy_pools_account_group ON energy_pools(account_group);
CREATE INDEX IF NOT EXISTS idx_energy_pools_sync_status ON energy_pools(sync_status);
CREATE INDEX IF NOT EXISTS idx_energy_pools_health_status ON energy_pools(health_status);
CREATE INDEX IF NOT EXISTS idx_energy_pools_auto_sync ON energy_pools(auto_sync_enabled);
CREATE INDEX IF NOT EXISTS idx_energy_pools_last_sync ON energy_pools(last_sync_at DESC);
CREATE INDEX IF NOT EXISTS idx_energy_pools_last_health_check ON energy_pools(last_health_check DESC);
CREATE INDEX IF NOT EXISTS idx_energy_pools_error_count ON energy_pools(error_count DESC);
CREATE INDEX IF NOT EXISTS idx_energy_pools_is_managed ON energy_pools(is_managed);
CREATE INDEX IF NOT EXISTS idx_energy_pools_tags ON energy_pools USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_energy_pools_created_by ON energy_pools(created_by);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_energy_pools_network_status 
    ON energy_pools(network_id, status, health_status);
CREATE INDEX IF NOT EXISTS idx_energy_pools_group_priority 
    ON energy_pools(account_group, priority DESC);

-- 更新现有记录的默认值
UPDATE energy_pools 
SET 
    config = COALESCE(config, '{}'),
    api_settings = COALESCE(api_settings, '{}'),
    monitoring_settings = COALESCE(monitoring_settings, '{}'),
    security_settings = COALESCE(security_settings, '{}'),
    auto_sync_enabled = COALESCE(auto_sync_enabled, true),
    sync_interval_minutes = COALESCE(sync_interval_minutes, 30),
    sync_status = COALESCE(sync_status, 'pending'),
    balance_trx = COALESCE(balance_trx, 0),
    balance_energy = COALESCE(balance_energy, 0),
    balance_bandwidth = COALESCE(balance_bandwidth, 0),
    health_status = COALESCE(health_status, 'unknown'),
    error_count = COALESCE(error_count, 0),
    tags = COALESCE(tags, '[]'),
    metadata = COALESCE(metadata, '{}'),
    is_managed = COALESCE(is_managed, true)
WHERE 
    config IS NULL 
    OR api_settings IS NULL 
    OR monitoring_settings IS NULL 
    OR security_settings IS NULL 
    OR auto_sync_enabled IS NULL 
    OR sync_interval_minutes IS NULL 
    OR sync_status IS NULL 
    OR balance_trx IS NULL 
    OR balance_energy IS NULL 
    OR balance_bandwidth IS NULL 
    OR health_status IS NULL 
    OR error_count IS NULL 
    OR tags IS NULL 
    OR metadata IS NULL 
    OR is_managed IS NULL;

-- 创建函数：获取能量池网络配置
CREATE OR REPLACE FUNCTION get_energy_pool_network_config(p_pool_id UUID)
RETURNS TABLE (
    pool_id UUID,
    pool_name VARCHAR,
    network_id UUID,
    network_name VARCHAR,
    network_type VARCHAR,
    rpc_url VARCHAR,
    tron_address VARCHAR,
    status VARCHAR,
    health_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ep.id,
        ep.name,
        ep.network_id,
        tn.name,
        tn.network_type,
        tn.rpc_url,
        ep.tron_address,
        ep.status,
        ep.health_status
    FROM energy_pools ep
    LEFT JOIN tron_networks tn ON ep.network_id = tn.id
    WHERE ep.id = p_pool_id;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取网络下的所有能量池
CREATE OR REPLACE FUNCTION get_network_energy_pools(p_network_id UUID)
RETURNS TABLE (
    pool_id UUID,
    pool_name VARCHAR,
    account_name VARCHAR,
    account_group VARCHAR,
    tron_address VARCHAR,
    status VARCHAR,
    health_status VARCHAR,
    priority INTEGER,
    available_energy BIGINT,
    balance_trx NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ep.id,
        ep.name,
        ep.account_name,
        ep.account_group,
        ep.tron_address,
        ep.status,
        ep.health_status,
        ep.priority,
        ep.available_energy,
        ep.balance_trx
    FROM energy_pools ep
    WHERE ep.network_id = p_network_id
        AND ep.status = 'active'
    ORDER BY ep.priority DESC, ep.available_energy DESC;
END;
$$ LANGUAGE plpgsql;

-- 提交事务
COMMIT;

-- 验证迁移结果
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'energy_pools' 
    AND table_schema = 'public'
    AND column_name IN (
        'network_id', 'account_name', 'account_alias', 'account_group',
        'config', 'api_settings', 'monitoring_settings', 'security_settings',
        'auto_sync_enabled', 'sync_interval_minutes', 'last_sync_at', 'sync_status',
        'last_balance_check', 'balance_trx', 'balance_energy', 'balance_bandwidth',
        'health_status', 'last_health_check', 'error_count', 'last_error',
        'last_error_at', 'tags', 'metadata', 'created_by', 'is_managed'
    )
ORDER BY ordinal_position;