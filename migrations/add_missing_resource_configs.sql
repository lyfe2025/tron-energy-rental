-- 添加缺失的资源消耗配置键
-- 为前端具体字段创建对应的数据库配置

INSERT INTO system_configs (config_key, config_value, config_type, category, description, is_public, is_editable, validation_rules, default_value, created_at, updated_at) VALUES

-- 能量配置的具体字段
('resource_consumption.energy.usdt_standard_energy', '15000', 'number', 'resource_consumption', 'USDT标准转账能量消耗', true, true, '{"min": 1000, "max": 100000}', '15000', NOW(), NOW()),
('resource_consumption.energy.usdt_max_energy', '30000', 'number', 'resource_consumption', 'USDT最大转账能量消耗', true, true, '{"min": 5000, "max": 200000}', '30000', NOW(), NOW()),
('resource_consumption.energy.usdt_buffer_percentage', '20', 'number', 'resource_consumption', 'USDT能量缓冲百分比', true, true, '{"min": 5, "max": 50}', '20', NOW(), NOW()),
('resource_consumption.energy.energy_price_trx_ratio', '0.00021', 'number', 'resource_consumption', '能量价格TRX比率', true, true, '{"min": 0.0001, "max": 0.01}', '0.00021', NOW(), NOW()),

-- 带宽配置的具体字段  
('resource_consumption.bandwidth.trx_transfer_bandwidth', '268', 'number', 'resource_consumption', 'TRX转账带宽消耗', true, true, '{"min": 200, "max": 500}', '268', NOW(), NOW()),
('resource_consumption.bandwidth.trc20_transfer_bandwidth', '345', 'number', 'resource_consumption', 'TRC20转账带宽消耗', true, true, '{"min": 300, "max": 600}', '345', NOW(), NOW()),
('resource_consumption.bandwidth.buffer_percentage', '15', 'number', 'resource_consumption', '带宽缓冲百分比', true, true, '{"min": 5, "max": 30}', '15', NOW(), NOW()),
('resource_consumption.bandwidth.max_bandwidth_limit', '5000', 'number', 'resource_consumption', '最大带宽限制', true, true, '{"min": 1000, "max": 10000}', '5000', NOW(), NOW())

ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();
