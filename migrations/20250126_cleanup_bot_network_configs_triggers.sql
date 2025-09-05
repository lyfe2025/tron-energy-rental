-- 清理bot_network_configs表相关的触发器
-- 创建时间: 2025-01-26
-- 作者: 表结构优化项目

-- 删除bot_network_configs表的触发器
DROP TRIGGER IF EXISTS trigger_update_bot_network_configs_updated_at ON bot_network_configs;
DROP TRIGGER IF EXISTS bot_network_configs_change_trigger ON bot_network_configs;

-- 删除相关的触发器函数（如果不再被其他地方使用）
DROP FUNCTION IF EXISTS update_bot_network_configs_updated_at();

-- 注意：bot_network_configs_change_trigger对应的函数可能还被其他地方使用，
-- 所以暂时不删除，需要进一步检查