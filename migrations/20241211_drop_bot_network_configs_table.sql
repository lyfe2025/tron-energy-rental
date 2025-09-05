-- 删除bot_network_configs表
-- 此表的数据已经迁移到telegram_bots表的network_configurations字段中

-- 删除bot_network_configs表
DROP TABLE IF EXISTS bot_network_configs CASCADE;

-- 添加注释说明
COMMENT ON SCHEMA public IS 'bot_network_configs表已删除，数据已迁移到telegram_bots.network_configurations字段';
