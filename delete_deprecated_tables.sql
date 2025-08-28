-- 删除废弃表的SQL脚本
-- 执行前已备份数据库：db_backup_tron_energy_rental_20250828_194713.sql

-- 1. 删除外键约束
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_bot_id_fkey;
ALTER TABLE bot_users DROP CONSTRAINT IF EXISTS bot_users_bot_id_fkey;
ALTER TABLE price_configs DROP CONSTRAINT IF EXISTS price_configs_bot_id_fkey;
ALTER TABLE price_history DROP CONSTRAINT IF EXISTS price_history_config_id_fkey;
ALTER TABLE price_history DROP CONSTRAINT IF EXISTS price_history_changed_by_fkey;
ALTER TABLE price_templates DROP CONSTRAINT IF EXISTS price_templates_created_by_fkey;
ALTER TABLE bots DROP CONSTRAINT IF EXISTS bots_agent_id_fkey;

-- 2. 删除废弃表
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS price_templates CASCADE;
DROP TABLE IF EXISTS bots CASCADE;

-- 3. 重新创建必要的外键约束（如果需要）
-- 注意：这里只重新创建不涉及废弃表的外键约束
-- orders、bot_users、price_configs 表的 bot_id 外键将不再重新创建，因为 bots 表已删除
-- 如果这些表需要引用新的 telegram_bots 表，需要单独处理

SELECT 'Deprecated tables deletion completed' AS status;