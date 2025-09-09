-- 为 telegram_bots 表添加缺失的字段
-- 这些字段在前端编辑表单中使用，但数据库中缺失

BEGIN;

-- 添加描述字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 添加欢迎消息字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS welcome_message TEXT;

-- 添加帮助消息字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS help_message TEXT;

-- 添加字段注释
COMMENT ON COLUMN telegram_bots.description IS '机器人描述信息';
COMMENT ON COLUMN telegram_bots.welcome_message IS '欢迎消息内容';
COMMENT ON COLUMN telegram_bots.help_message IS '帮助消息内容';

COMMIT;
