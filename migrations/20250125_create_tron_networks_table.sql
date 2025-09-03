-- 创建 tron_networks 表
-- 用于管理多个TRON网络配置（主网、测试网、私有网络等）
-- 创建时间: 2025-01-25
-- 作者: 配置管理迁移项目

-- 开始事务
BEGIN;

-- 创建 tron_networks 表
CREATE TABLE IF NOT EXISTS tron_networks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    network_type VARCHAR(20) NOT NULL DEFAULT 'mainnet',
    rpc_url VARCHAR(500) NOT NULL,
    api_key VARCHAR(255),
    chain_id INTEGER,
    block_explorer_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    timeout_ms INTEGER DEFAULT 30000,
    retry_count INTEGER DEFAULT 3,
    rate_limit_per_second INTEGER DEFAULT 10,
    config JSONB DEFAULT '{}',
    health_check_url VARCHAR(500),
    last_health_check TIMESTAMP WITH TIME ZONE,
    health_status VARCHAR(20) DEFAULT 'unknown',
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE tron_networks IS 'TRON网络配置表：管理多个TRON网络环境，支持主网、测试网和私有网络';

-- 添加字段注释
COMMENT ON COLUMN tron_networks.id IS '网络配置唯一标识符（UUID）';
COMMENT ON COLUMN tron_networks.name IS '网络名称，如 "Mainnet", "Shasta Testnet", "Nile Testnet"';
COMMENT ON COLUMN tron_networks.network_type IS '网络类型：mainnet, testnet, private';
COMMENT ON COLUMN tron_networks.rpc_url IS 'TRON节点RPC URL';
COMMENT ON COLUMN tron_networks.api_key IS 'API密钥（如TronGrid API Key）';
COMMENT ON COLUMN tron_networks.chain_id IS '链ID标识符';
COMMENT ON COLUMN tron_networks.block_explorer_url IS '区块浏览器URL';
COMMENT ON COLUMN tron_networks.is_active IS '是否启用该网络';
COMMENT ON COLUMN tron_networks.is_default IS '是否为默认网络';
COMMENT ON COLUMN tron_networks.priority IS '网络优先级，数值越大优先级越高';
COMMENT ON COLUMN tron_networks.timeout_ms IS '请求超时时间（毫秒）';
COMMENT ON COLUMN tron_networks.retry_count IS '重试次数';
COMMENT ON COLUMN tron_networks.rate_limit_per_second IS '每秒请求限制';
COMMENT ON COLUMN tron_networks.config IS '网络特定配置（JSON格式）';
COMMENT ON COLUMN tron_networks.health_check_url IS '健康检查URL';
COMMENT ON COLUMN tron_networks.last_health_check IS '最后健康检查时间';
COMMENT ON COLUMN tron_networks.health_status IS '健康状态：healthy, unhealthy, unknown, error';
COMMENT ON COLUMN tron_networks.description IS '网络描述信息';
COMMENT ON COLUMN tron_networks.created_by IS '创建者用户ID';
COMMENT ON COLUMN tron_networks.created_at IS '创建时间';
COMMENT ON COLUMN tron_networks.updated_at IS '最后更新时间';

-- 添加约束
ALTER TABLE tron_networks 
    ADD CONSTRAINT chk_network_type 
    CHECK (network_type IN ('mainnet', 'testnet', 'private'));

ALTER TABLE tron_networks 
    ADD CONSTRAINT chk_health_status 
    CHECK (health_status IN ('healthy', 'unhealthy', 'unknown', 'error'));

ALTER TABLE tron_networks 
    ADD CONSTRAINT chk_timeout_positive 
    CHECK (timeout_ms > 0);

ALTER TABLE tron_networks 
    ADD CONSTRAINT chk_retry_count_positive 
    CHECK (retry_count >= 0);

ALTER TABLE tron_networks 
    ADD CONSTRAINT chk_rate_limit_positive 
    CHECK (rate_limit_per_second > 0);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tron_networks_is_active ON tron_networks(is_active);
CREATE INDEX IF NOT EXISTS idx_tron_networks_is_default ON tron_networks(is_default);
CREATE INDEX IF NOT EXISTS idx_tron_networks_network_type ON tron_networks(network_type);
CREATE INDEX IF NOT EXISTS idx_tron_networks_priority ON tron_networks(priority DESC);
CREATE INDEX IF NOT EXISTS idx_tron_networks_health_status ON tron_networks(health_status);
CREATE INDEX IF NOT EXISTS idx_tron_networks_last_health_check ON tron_networks(last_health_check DESC);

-- 创建唯一约束：确保只有一个默认网络
CREATE UNIQUE INDEX IF NOT EXISTS idx_tron_networks_unique_default 
    ON tron_networks(is_default) 
    WHERE is_default = true;

-- 插入默认网络配置
INSERT INTO tron_networks (
    name, network_type, rpc_url, chain_id, block_explorer_url, 
    is_active, is_default, priority, description
) VALUES 
(
    'TRON Mainnet',
    'mainnet',
    'https://api.trongrid.io',
    1,
    'https://tronscan.org',
    true,
    true,
    100,
    'TRON主网，用于生产环境'
),
(
    'Shasta Testnet',
    'testnet',
    'https://api.shasta.trongrid.io',
    2,
    'https://shasta.tronscan.org',
    true,
    false,
    50,
    'TRON Shasta测试网，用于开发和测试'
),
(
    'Nile Testnet',
    'testnet',
    'https://nile.trongrid.io',
    3,
    'https://nile.tronscan.org',
    false,
    false,
    30,
    'TRON Nile测试网，备用测试环境'
)
ON CONFLICT (name) DO NOTHING;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_tron_networks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tron_networks_updated_at
    BEFORE UPDATE ON tron_networks
    FOR EACH ROW
    EXECUTE FUNCTION update_tron_networks_updated_at();

-- 提交事务
COMMIT;

-- 验证迁移结果
SELECT 
    id, name, network_type, rpc_url, is_active, is_default, priority
FROM tron_networks 
ORDER BY priority DESC, name;