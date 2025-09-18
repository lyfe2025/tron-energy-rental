-- 资源消耗配置迁移脚本
-- 添加资源消耗相关的系统配置项
-- 执行时间: 2025-01-20

-- 插入资源消耗配置项
INSERT INTO system_configs (
    config_key,
    config_value,
    config_type,
    category,
    description,
    is_public,
    is_editable,
    validation_rules,
    default_value
) VALUES 
-- 能量消耗阈值配置
(
    'resource_consumption.energy_threshold.warning',
    '80',
    'number',
    'resource_consumption',
    '能量消耗警告阈值（百分比）',
    true,
    true,
    '{"min": 1, "max": 100, "type": "integer"}',
    '80'
),
(
    'resource_consumption.energy_threshold.critical',
    '95',
    'number',
    'resource_consumption',
    '能量消耗严重阈值（百分比）',
    true,
    true,
    '{"min": 1, "max": 100, "type": "integer"}',
    '95'
),

-- 带宽消耗阈值配置
(
    'resource_consumption.bandwidth_threshold.warning',
    '75',
    'number',
    'resource_consumption',
    '带宽消耗警告阈值（百分比）',
    true,
    true,
    '{"min": 1, "max": 100, "type": "integer"}',
    '75'
),
(
    'resource_consumption.bandwidth_threshold.critical',
    '90',
    'number',
    'resource_consumption',
    '带宽消耗严重阈值（百分比）',
    true,
    true,
    '{"min": 1, "max": 100, "type": "integer"}',
    '90'
),

-- 监控间隔配置
(
    'resource_consumption.monitoring_interval',
    '300',
    'number',
    'resource_consumption',
    '资源消耗监控间隔（秒）',
    true,
    true,
    '{"min": 60, "max": 3600, "type": "integer"}',
    '300'
),

-- 历史数据保留配置
(
    'resource_consumption.history_retention_days',
    '30',
    'number',
    'resource_consumption',
    '资源消耗历史数据保留天数',
    true,
    true,
    '{"min": 1, "max": 365, "type": "integer"}',
    '30'
),

-- 自动优化配置
(
    'resource_consumption.auto_optimization.enabled',
    'false',
    'boolean',
    'resource_consumption',
    '是否启用自动资源优化',
    true,
    true,
    '{"type": "boolean"}',
    'false'
),
(
    'resource_consumption.auto_optimization.strategy',
    'conservative',
    'string',
    'resource_consumption',
    '自动优化策略（conservative/balanced/aggressive）',
    true,
    true,
    '{"enum": ["conservative", "balanced", "aggressive"]}',
    'conservative'
),

-- 通知配置
(
    'resource_consumption.notifications.enabled',
    'true',
    'boolean',
    'resource_consumption',
    '是否启用资源消耗通知',
    true,
    true,
    '{"type": "boolean"}',
    'true'
),
(
    'resource_consumption.notifications.channels',
    '["email", "telegram"]',
    'json',
    'resource_consumption',
    '通知渠道配置',
    true,
    true,
    '{"type": "array", "items": {"enum": ["email", "telegram", "webhook"]}}',
    '["email", "telegram"]'
),

-- 预测配置
(
    'resource_consumption.prediction.enabled',
    'true',
    'boolean',
    'resource_consumption',
    '是否启用资源消耗预测',
    true,
    true,
    '{"type": "boolean"}',
    'true'
),
(
    'resource_consumption.prediction.horizon_hours',
    '24',
    'number',
    'resource_consumption',
    '资源消耗预测时间范围（小时）',
    true,
    true,
    '{"min": 1, "max": 168, "type": "integer"}',
    '24'
),

-- 报告配置
(
    'resource_consumption.reports.enabled',
    'true',
    'boolean',
    'resource_consumption',
    '是否启用资源消耗报告',
    true,
    true,
    '{"type": "boolean"}',
    'true'
),
(
    'resource_consumption.reports.frequency',
    'daily',
    'string',
    'resource_consumption',
    '报告生成频率（daily/weekly/monthly）',
    true,
    true,
    '{"enum": ["daily", "weekly", "monthly"]}',
    'daily'
),

-- 缓存配置
(
    'resource_consumption.cache.enabled',
    'true',
    'boolean',
    'resource_consumption',
    '是否启用资源消耗数据缓存',
    true,
    true,
    '{"type": "boolean"}',
    'true'
),
(
    'resource_consumption.cache.ttl_seconds',
    '300',
    'number',
    'resource_consumption',
    '缓存生存时间（秒）',
    true,
    true,
    '{"min": 60, "max": 3600, "type": "integer"}',
    '300'
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_system_configs_category_resource_consumption 
ON system_configs (category) 
WHERE category = 'resource_consumption';

-- 添加注释
COMMENT ON INDEX idx_system_configs_category_resource_consumption IS '资源消耗配置分类索引，提高查询性能';

-- 验证插入的数据
DO $$
BEGIN
    -- 检查是否成功插入了所有配置项
    IF (SELECT COUNT(*) FROM system_configs WHERE category = 'resource_consumption') < 16 THEN
        RAISE EXCEPTION '资源消耗配置项插入不完整，请检查数据';
    END IF;
    
    RAISE NOTICE '资源消耗配置迁移完成，共插入 % 个配置项', 
        (SELECT COUNT(*) FROM system_configs WHERE category = 'resource_consumption');
END $$;