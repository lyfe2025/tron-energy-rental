-- 初始化资源消耗配置数据
-- 添加TRON网络资源消耗相关的系统配置项

INSERT INTO system_configs (config_key, config_value, config_type, category, description, is_public, is_editable, validation_rules, default_value, created_at, updated_at) VALUES

-- 能量阈值配置
('resource_consumption.energy_threshold.warning', '15000', 'number', 'resource_consumption', 'USDT转账能量消耗警告阈值', true, true, '{"min": 1000, "max": 100000}', '15000', NOW(), NOW()),
('resource_consumption.energy_threshold.critical', '30000', 'number', 'resource_consumption', 'USDT转账能量消耗危险阈值', true, true, '{"min": 5000, "max": 200000}', '30000', NOW(), NOW()),

-- 带宽阈值配置  
('resource_consumption.bandwidth_threshold.warning', '268', 'number', 'resource_consumption', 'TRX转账带宽消耗警告阈值', true, true, '{"min": 200, "max": 500}', '268', NOW(), NOW()),
('resource_consumption.bandwidth_threshold.critical', '345', 'number', 'resource_consumption', 'TRC20转账带宽消耗危险阈值', true, true, '{"min": 300, "max": 600}', '345', NOW(), NOW()),

-- 监控配置
('resource_consumption.monitoring_interval', '300', 'number', 'resource_consumption', '资源消耗监控间隔(秒)', true, true, '{"min": 60, "max": 3600}', '300', NOW(), NOW()),
('resource_consumption.history_retention_days', '30', 'number', 'resource_consumption', '历史数据保留天数', true, true, '{"min": 7, "max": 365}', '30', NOW(), NOW()),

-- 自动优化配置
('resource_consumption.auto_optimization.enabled', 'true', 'boolean', 'resource_consumption', '启用自动优化', true, true, '{"type": "boolean"}', 'true', NOW(), NOW()),
('resource_consumption.auto_optimization.strategy', 'balanced', 'string', 'resource_consumption', '自动优化策略', true, true, '{"enum": ["conservative", "balanced", "aggressive"]}', 'balanced', NOW(), NOW()),

-- 通知配置
('resource_consumption.notifications.enabled', 'true', 'boolean', 'resource_consumption', '启用通知', true, true, '{"type": "boolean"}', 'true', NOW(), NOW()),
('resource_consumption.notifications.channels', '["email", "webhook"]', 'json', 'resource_consumption', '通知渠道', true, true, '{"type": "array"}', '["email"]', NOW(), NOW()),

-- 预测配置
('resource_consumption.prediction.enabled', 'false', 'boolean', 'resource_consumption', '启用预测', true, true, '{"type": "boolean"}', 'false', NOW(), NOW()),
('resource_consumption.prediction.horizon_hours', '24', 'number', 'resource_consumption', '预测时间范围(小时)', true, true, '{"min": 1, "max": 168}', '24', NOW(), NOW()),

-- 报告配置
('resource_consumption.reports.enabled', 'true', 'boolean', 'resource_consumption', '启用报告', true, true, '{"type": "boolean"}', 'true', NOW(), NOW()),
('resource_consumption.reports.frequency', 'daily', 'string', 'resource_consumption', '报告频率', true, true, '{"enum": ["daily", "weekly", "monthly"]}', 'daily', NOW(), NOW()),

-- 缓存配置
('resource_consumption.cache.enabled', 'true', 'boolean', 'resource_consumption', '启用缓存', true, true, '{"type": "boolean"}', 'true', NOW(), NOW()),
('resource_consumption.cache.ttl_seconds', '300', 'number', 'resource_consumption', '缓存TTL(秒)', true, true, '{"min": 60, "max": 3600}', '300', NOW(), NOW())

ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();
