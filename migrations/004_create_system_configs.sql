-- 系统配置表迁移
-- 创建时间: 2024-01-01
-- 版本: 1.0.0
-- 用于存储系统参数配置、功能开关、维护模式等

-- 系统配置表
CREATE TABLE system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value TEXT,
    config_type VARCHAR(50) NOT NULL DEFAULT 'string' CHECK (config_type IN ('string', 'number', 'boolean', 'json', 'array')),
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    is_editable BOOLEAN DEFAULT true,
    validation_rules JSONB,
    default_value TEXT,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置历史表
CREATE TABLE system_config_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES system_configs(id),
    old_value TEXT,
    new_value TEXT,
    change_reason VARCHAR(255),
    changed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_system_configs_key ON system_configs(config_key);
CREATE INDEX idx_system_configs_category ON system_configs(category);
CREATE INDEX idx_system_configs_is_public ON system_configs(is_public);
CREATE INDEX idx_system_configs_updated_at ON system_configs(updated_at);

CREATE INDEX idx_system_config_history_config_id ON system_config_history(config_id);
CREATE INDEX idx_system_config_history_created_at ON system_config_history(created_at);

-- 插入默认系统配置
INSERT INTO system_configs (config_key, config_value, config_type, category, description, is_public, is_editable, default_value) VALUES
-- 系统基础配置
('system.name', 'TRON能量租赁系统', 'string', 'system', '系统名称', true, true, 'TRON能量租赁系统'),
('system.version', '1.0.0', 'string', 'system', '系统版本', true, false, '1.0.0'),
('system.maintenance_mode', 'false', 'boolean', 'system', '维护模式开关', false, true, 'false'),
('system.maintenance_message', '系统正在维护中，请稍后再试', 'string', 'system', '维护模式提示信息', true, true, '系统正在维护中，请稍后再试'),

-- 功能开关
('feature.user_registration', 'true', 'boolean', 'features', '用户注册功能开关', false, true, 'true'),
('feature.agent_application', 'true', 'boolean', 'features', '代理申请功能开关', false, true, 'true'),
('feature.energy_trading', 'true', 'boolean', 'features', '能量交易功能开关', false, true, 'true'),
('feature.referral_system', 'true', 'boolean', 'features', '推荐系统功能开关', false, true, 'true'),

-- 业务配置
('business.min_order_amount', '100', 'number', 'business', '最小订单金额(TRX)', false, true, '100'),
('business.max_order_amount', '10000', 'number', 'business', '最大订单金额(TRX)', false, true, '10000'),
('business.default_commission_rate', '0.1', 'number', 'business', '默认佣金比例', false, true, '0.1'),
('business.order_timeout_hours', '24', 'number', 'business', '订单超时时间(小时)', false, true, '24'),
('business.energy_unit_price', '0.0001', 'number', 'business', '能量单价(TRX/能量)', false, true, '0.0001'),

-- 安全配置
('security.max_login_attempts', '5', 'number', 'security', '最大登录尝试次数', false, true, '5'),
('security.login_lockout_minutes', '30', 'number', 'security', '登录锁定时间(分钟)', false, true, '30'),
('security.jwt_expire_hours', '24', 'number', 'security', 'JWT过期时间(小时)', false, true, '24'),
('security.password_min_length', '8', 'number', 'security', '密码最小长度', false, true, '8'),

-- 通知配置
('notification.email_enabled', 'true', 'boolean', 'notification', '邮件通知开关', false, true, 'true'),
('notification.sms_enabled', 'false', 'boolean', 'notification', '短信通知开关', false, true, 'false'),
('notification.telegram_enabled', 'true', 'boolean', 'notification', 'Telegram通知开关', false, true, 'true'),

-- API配置
('api.rate_limit_per_minute', '100', 'number', 'api', 'API每分钟请求限制', false, true, '100'),
('api.rate_limit_per_hour', '1000', 'number', 'api', 'API每小时请求限制', false, true, '1000'),
('api.enable_cors', 'true', 'boolean', 'api', 'CORS开关', false, true, 'true'),

-- 支付配置
('payment.tron_network', 'mainnet', 'string', 'payment', 'TRON网络类型', false, true, 'mainnet'),
('payment.confirmation_blocks', '19', 'number', 'payment', '支付确认区块数', false, true, '19'),
('payment.auto_refund_hours', '72', 'number', 'payment', '自动退款时间(小时)', false, true, '72'),

-- 缓存配置
('cache.redis_ttl_seconds', '3600', 'number', 'cache', 'Redis缓存过期时间(秒)', false, true, '3600'),
('cache.enable_query_cache', 'true', 'boolean', 'cache', '查询缓存开关', false, true, 'true'),

-- 日志配置
('logging.level', 'info', 'string', 'logging', '日志级别', false, true, 'info'),
('logging.retention_days', '30', 'number', 'logging', '日志保留天数', false, true, '30'),
('logging.enable_file_log', 'true', 'boolean', 'logging', '文件日志开关', false, true, 'true');