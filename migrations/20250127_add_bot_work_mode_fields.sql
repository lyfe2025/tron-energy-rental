-- 为telegram_bots表添加工作模式相关字段
-- 迁移文件：20250127_add_bot_work_mode_fields.sql

-- 添加工作模式字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS work_mode VARCHAR(20) DEFAULT 'polling' CHECK (work_mode IN ('polling', 'webhook'));

-- 添加webhook密钥字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(256);

-- 添加最大连接数字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS max_connections INTEGER DEFAULT 40 CHECK (max_connections BETWEEN 1 AND 100);

-- 为work_mode字段创建索引
CREATE INDEX IF NOT EXISTS idx_telegram_bots_work_mode ON telegram_bots(work_mode);

-- 添加字段注释
COMMENT ON COLUMN telegram_bots.work_mode IS '机器人工作模式：polling(轮询) 或 webhook(推送)';
COMMENT ON COLUMN telegram_bots.webhook_secret IS 'Webhook验证密钥，用于验证请求来源';
COMMENT ON COLUMN telegram_bots.max_connections IS 'Webhook模式下Telegram的最大并发连接数(1-100)';

-- 为现有记录设置默认值
UPDATE telegram_bots 
SET work_mode = 'polling' 
WHERE work_mode IS NULL;

-- 输出执行结果
SELECT 
    'telegram_bots表字段添加完成' as message,
    count(*) as total_bots,
    sum(CASE WHEN work_mode = 'polling' THEN 1 ELSE 0 END) as polling_bots,
    sum(CASE WHEN work_mode = 'webhook' THEN 1 ELSE 0 END) as webhook_bots
FROM telegram_bots;
