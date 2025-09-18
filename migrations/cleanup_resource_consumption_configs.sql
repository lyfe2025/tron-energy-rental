-- 清理资源消耗配置项
-- 删除不必要的配置项，添加缺失的配置项

-- 首先添加缺失的配置项
INSERT INTO system_configs (
  config_key, 
  config_value, 
  config_type, 
  category, 
  description, 
  is_public, 
  is_editable, 
  validation_rules, 
  default_value, 
  created_at, 
  updated_at
) VALUES
-- TRC10转账带宽消耗
('resource_consumption.bandwidth.trc10_transfer_bandwidth', '345', 'number', 'resource_consumption', 'TRC10转账带宽消耗', true, true, '{"min": 200, "max": 1000}', '345', NOW(), NOW()),

-- 账户创建带宽消耗  
('resource_consumption.bandwidth.account_create_bandwidth', '1000', 'number', 'resource_consumption', '账户创建带宽消耗', true, true, '{"min": 500, "max": 5000}', '1000', NOW(), NOW())

ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- 删除不必要的配置项
DELETE FROM system_configs WHERE config_key IN (
  -- 自动优化相关
  'resource_consumption.auto_optimization.enabled',
  'resource_consumption.auto_optimization.strategy',
  
  -- 阈值相关（已不使用）
  'resource_consumption.bandwidth_threshold.critical',
  'resource_consumption.bandwidth_threshold.warning', 
  'resource_consumption.energy_threshold.critical',
  'resource_consumption.energy_threshold.warning',
  
  -- 缓存相关
  'resource_consumption.cache.enabled',
  'resource_consumption.cache.ttl_seconds',
  
  -- 能量价格比率（页面已不使用）
  'resource_consumption.energy.energy_price_trx_ratio',
  
  -- 历史记录相关
  'resource_consumption.history_retention_days',
  
  -- 监控相关  
  'resource_consumption.monitoring_interval',
  
  -- 通知相关
  'resource_consumption.notifications.channels',
  'resource_consumption.notifications.enabled',
  
  -- 预测相关
  'resource_consumption.prediction.enabled', 
  'resource_consumption.prediction.horizon_hours',
  
  -- 报告相关
  'resource_consumption.reports.enabled',
  'resource_consumption.reports.frequency'
);

-- 显示清理后的配置项
SELECT 
  config_key,
  config_value,
  description
FROM system_configs 
WHERE category = 'resource_consumption' 
ORDER BY config_key;
