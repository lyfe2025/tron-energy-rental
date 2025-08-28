-- 清理旧的价格相关表
-- 执行前已备份数据库: db_backup_tron_energy_rental_20250828_203921.sql
-- 新的价格架构已经实施并运行正常

-- 删除旧的价格配置表
-- price_configs: 旧的价格配置表，已被 pricing_strategies 和 pricing_modes 替代
DROP TABLE IF EXISTS price_configs CASCADE;

-- agent_pricing: 代理定价表，功能已整合到新的价格策略中
DROP TABLE IF EXISTS agent_pricing CASCADE;

-- pricing_templates: 旧的定价模板表，已被新的 pricing_strategies 替代
-- 注意：这个表在新架构中仍然存在，但内容不同，这里删除的是旧版本
-- 如果新架构中的 pricing_templates 表结构不同，需要保留
-- DROP TABLE IF EXISTS pricing_templates CASCADE;

-- bot_pricing_configs: 机器人价格配置表，已被新架构替代
DROP TABLE IF EXISTS bot_pricing_configs CASCADE;

-- 清理相关的索引（如果存在）
DROP INDEX IF EXISTS idx_price_configs_bot_id;
DROP INDEX IF EXISTS idx_price_configs_type;
DROP INDEX IF EXISTS idx_price_configs_active;
DROP INDEX IF EXISTS idx_agent_pricing_agent_id;
DROP INDEX IF EXISTS idx_agent_pricing_energy_type;
DROP INDEX IF EXISTS idx_bot_pricing_configs_bot_id;
DROP INDEX IF EXISTS idx_bot_pricing_configs_strategy_id;

-- 清理相关的触发器（如果存在）
DROP TRIGGER IF EXISTS update_price_configs_updated_at ON price_configs;
DROP TRIGGER IF EXISTS update_agent_pricing_updated_at ON agent_pricing;
DROP TRIGGER IF EXISTS update_bot_pricing_configs_updated_at ON bot_pricing_configs;

-- 清理相关的函数（如果只被这些表使用）
-- 注意：update_updated_at_column 函数可能被其他表使用，所以不删除

SELECT 'Old pricing tables cleanup completed' as status;