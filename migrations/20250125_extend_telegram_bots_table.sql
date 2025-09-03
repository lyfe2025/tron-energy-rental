-- 扩展 telegram_bots 表字段
-- 添加网络配置、Webhook配置、消息模板、频率限制、安全设置、健康检查等字段
-- 创建时间: 2025-01-25
-- 作者: 配置管理迁移项目

-- 开始事务
BEGIN;

-- 添加新字段到 telegram_bots 表
ALTER TABLE telegram_bots 
    ADD COLUMN IF NOT EXISTS network_config JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS webhook_config JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS message_templates JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS rate_limits JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS security_settings JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

-- 添加字段注释
COMMENT ON COLUMN telegram_bots.network_config IS 'Telegram网络配置（API端点、超时等）';
COMMENT ON COLUMN telegram_bots.webhook_config IS 'Webhook配置（URL、密钥、允许的更新类型）';
COMMENT ON COLUMN telegram_bots.message_templates IS '消息模板配置';
COMMENT ON COLUMN telegram_bots.rate_limits IS '频率限制配置';
COMMENT ON COLUMN telegram_bots.security_settings IS '安全设置（IP白名单、加密等）';
COMMENT ON COLUMN telegram_bots.last_health_check IS '最后健康检查时间';
COMMENT ON COLUMN telegram_bots.health_status IS '健康状态：healthy, unhealthy, unknown, error';
COMMENT ON COLUMN telegram_bots.description IS '机器人描述信息';
COMMENT ON COLUMN telegram_bots.config IS '机器人通用配置信息';
COMMENT ON COLUMN telegram_bots.last_activity_at IS '最后活动时间';

-- 创建健康状态检查约束
ALTER TABLE telegram_bots 
    ADD CONSTRAINT chk_health_status 
    CHECK (health_status IN ('healthy', 'unhealthy', 'unknown', 'error'));

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_telegram_bots_health_status ON telegram_bots(health_status);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_is_active ON telegram_bots(is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_last_activity ON telegram_bots(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_last_health_check ON telegram_bots(last_health_check DESC);

-- 更新现有记录的默认值
UPDATE telegram_bots 
SET 
    network_config = COALESCE(network_config, '{}'),
    webhook_config = COALESCE(webhook_config, '{}'),
    message_templates = COALESCE(message_templates, '{}'),
    rate_limits = COALESCE(rate_limits, '{}'),
    security_settings = COALESCE(security_settings, '{}'),
    config = COALESCE(config, '{}'),
    health_status = COALESCE(health_status, 'unknown')
WHERE 
    network_config IS NULL 
    OR webhook_config IS NULL 
    OR message_templates IS NULL 
    OR rate_limits IS NULL 
    OR security_settings IS NULL 
    OR config IS NULL 
    OR health_status IS NULL;

-- 提交事务
COMMIT;

-- 验证迁移结果
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'telegram_bots' 
    AND table_schema = 'public'
    AND column_name IN (
        'network_config', 'webhook_config', 'message_templates', 
        'rate_limits', 'security_settings', 'last_health_check', 
        'health_status', 'description', 'config', 'last_activity_at'
    )
ORDER BY ordinal_position;