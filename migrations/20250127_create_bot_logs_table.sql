-- 创建机器人日志表
-- 用于存储机器人运行时的各种日志信息

CREATE TABLE IF NOT EXISTS bot_logs (
    id SERIAL PRIMARY KEY,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
    message TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_id ON bot_logs(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_level ON bot_logs(level);
CREATE INDEX IF NOT EXISTS idx_bot_logs_created_at ON bot_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_id_created_at ON bot_logs(bot_id, created_at DESC);

-- 添加表注释
COMMENT ON TABLE bot_logs IS '机器人运行日志表';
COMMENT ON COLUMN bot_logs.id IS '日志记录ID';
COMMENT ON COLUMN bot_logs.bot_id IS '机器人ID，关联telegram_bots表';
COMMENT ON COLUMN bot_logs.level IS '日志级别：info-信息，warn-警告，error-错误，debug-调试';
COMMENT ON COLUMN bot_logs.message IS '日志消息内容';
COMMENT ON COLUMN bot_logs.context IS '日志上下文信息，JSON格式存储额外数据';
COMMENT ON COLUMN bot_logs.created_at IS '日志创建时间';

-- 插入一些示例日志数据
INSERT INTO bot_logs (bot_id, level, message, context) 
SELECT 
    id,
    'info',
    '机器人启动成功',
    jsonb_build_object(
        'version', '1.0.0',
        'startup_time', extract(epoch from now()),
        'network', name
    )
FROM telegram_bots 
WHERE is_active = true
LIMIT 3;

INSERT INTO bot_logs (bot_id, level, message, context)
SELECT 
    id,
    'warn',
    '网络连接不稳定',
    jsonb_build_object(
        'retry_count', 3,
        'last_error', 'Connection timeout',
        'network_status', 'unstable'
    )
FROM telegram_bots 
WHERE is_active = true
LIMIT 2;

INSERT INTO bot_logs (bot_id, level, message, context)
SELECT 
    id,
    'error',
    'API调用失败',
    jsonb_build_object(
        'api_endpoint', '/api/energy/transfer',
        'error_code', 500,
        'error_message', 'Internal server error',
        'request_id', gen_random_uuid()::text
    )
FROM telegram_bots 
WHERE is_active = true
LIMIT 1;

-- 创建清理旧日志的函数（可选）
CREATE OR REPLACE FUNCTION cleanup_old_bot_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM bot_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_bot_logs(INTEGER) IS '清理指定天数之前的机器人日志记录';