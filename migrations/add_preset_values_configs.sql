-- 添加preset_values配置项
-- 执行日期: 2025-09-18
-- 目的: 支持预设值的保存和读取

-- 添加能量配置的预设值配置
INSERT INTO system_configs (config_key, config_value, config_type, description, validation_rules) 
VALUES (
  'resource_consumption.energy.preset_values',
  '[{"name":"保守","value":32000},{"name":"标准","value":15000},{"name":"激进","value":13000}]',
  'json',
  '能量消耗预设值配置',
  '{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"value":{"type":"number"}}}}'
) 
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  validation_rules = EXCLUDED.validation_rules;

-- 添加带宽配置的预设值配置  
INSERT INTO system_configs (config_key, config_value, config_type, description, validation_rules)
VALUES (
  'resource_consumption.bandwidth.preset_values',
  '[{"name":"保守","value":500},{"name":"标准","value":345},{"name":"激进","value":268}]',
  'json',
  '带宽消耗预设值配置',
  '{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"value":{"type":"number"}}}}'
)
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  validation_rules = EXCLUDED.validation_rules;

-- 验证插入结果
SELECT config_key, config_value, config_type, description 
FROM system_configs 
WHERE config_key IN (
  'resource_consumption.energy.preset_values',
  'resource_consumption.bandwidth.preset_values'
) 
ORDER BY config_key;
