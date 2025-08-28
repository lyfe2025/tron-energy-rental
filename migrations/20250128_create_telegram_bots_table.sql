-- 创建Telegram机器人表
-- Migration: 20250128_create_telegram_bots_table.sql
-- Created: 2025-01-28
-- Description: 创建Telegram机器人表，用于管理多个Telegram机器人实例

-- 1. 创建Telegram机器人表
CREATE TABLE IF NOT EXISTS telegram_bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_name VARCHAR(255) NOT NULL,
    bot_token VARCHAR(500) NOT NULL UNIQUE,
    bot_username VARCHAR(255) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    max_connections INTEGER DEFAULT 40,
    allowed_updates TEXT[],
    drop_pending_updates BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES telegram_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_telegram_bots_name ON telegram_bots(bot_name);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_username ON telegram_bots(bot_username);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_active ON telegram_bots(is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_activity ON telegram_bots(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_created_by ON telegram_bots(created_by);

-- 3. 创建更新时间触发器
CREATE TRIGGER update_telegram_bots_updated_at
    BEFORE UPDATE ON telegram_bots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 添加表和字段注释
COMMENT ON TABLE telegram_bots IS 'Telegram机器人表：管理多个Telegram机器人实例';
COMMENT ON COLUMN telegram_bots.id IS '机器人唯一标识';
COMMENT ON COLUMN telegram_bots.bot_name IS '机器人显示名称';
COMMENT ON COLUMN telegram_bots.bot_token IS 'Telegram Bot API Token';
COMMENT ON COLUMN telegram_bots.bot_username IS '机器人用户名（@username）';
COMMENT ON COLUMN telegram_bots.description IS '机器人描述';
COMMENT ON COLUMN telegram_bots.is_active IS '是否激活该机器人';
COMMENT ON COLUMN telegram_bots.webhook_url IS 'Webhook URL';
COMMENT ON COLUMN telegram_bots.webhook_secret IS 'Webhook密钥';
COMMENT ON COLUMN telegram_bots.max_connections IS '最大并发连接数';
COMMENT ON COLUMN telegram_bots.allowed_updates IS '允许的更新类型数组';
COMMENT ON COLUMN telegram_bots.drop_pending_updates IS '是否丢弃待处理的更新';
COMMENT ON COLUMN telegram_bots.config IS '机器人配置（JSON格式）';
COMMENT ON COLUMN telegram_bots.stats IS '机器人统计信息（JSON格式）';
COMMENT ON COLUMN telegram_bots.last_activity_at IS '最后活动时间';
COMMENT ON COLUMN telegram_bots.created_by IS '创建者用户ID';
COMMENT ON COLUMN telegram_bots.created_at IS '创建时间';
COMMENT ON COLUMN telegram_bots.updated_at IS '更新时间';

-- 5. 权限配置已完成

-- 9. 添加约束确保bot_token格式正确
ALTER TABLE telegram_bots ADD CONSTRAINT telegram_bots_token_format_check 
CHECK (bot_token ~ '^[0-9]+:[A-Za-z0-9_-]+$');

-- 10. 添加约束确保bot_username格式正确（如果提供）
ALTER TABLE telegram_bots ADD CONSTRAINT telegram_bots_username_format_check 
CHECK (bot_username IS NULL OR bot_username ~ '^[a-zA-Z0-9_]+$');

-- 11. 添加约束确保max_connections在合理范围内
ALTER TABLE telegram_bots ADD CONSTRAINT telegram_bots_max_connections_check 
CHECK (max_connections >= 1 AND max_connections <= 100);

-- 12. 创建函数：更新机器人最后活动时间
CREATE OR REPLACE FUNCTION update_bot_activity(
    p_bot_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE telegram_bots 
    SET last_activity_at = NOW()
    WHERE id = p_bot_id AND is_active = true;
END;
$$;

-- 13. 创建函数：获取激活的机器人列表
CREATE OR REPLACE FUNCTION get_active_bots()
RETURNS TABLE (
    bot_id UUID,
    bot_name VARCHAR(255),
    bot_username VARCHAR(255),
    description TEXT,
    last_activity_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tb.id,
        tb.bot_name,
        tb.bot_username,
        tb.description,
        tb.last_activity_at
    FROM telegram_bots tb
    WHERE tb.is_active = true
    ORDER BY tb.last_activity_at DESC NULLS LAST, tb.created_at DESC;
END;
$$;

-- 14. 创建函数：根据token获取机器人信息
CREATE OR REPLACE FUNCTION get_bot_by_token(
    p_bot_token VARCHAR(500)
)
RETURNS TABLE (
    bot_id UUID,
    bot_name VARCHAR(255),
    bot_username VARCHAR(255),
    config JSONB,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tb.id,
        tb.bot_name,
        tb.bot_username,
        tb.config,
        tb.is_active
    FROM telegram_bots tb
    WHERE tb.bot_token = p_bot_token
    LIMIT 1;
END;
$$;

-- 15. 为函数添加注释
COMMENT ON FUNCTION update_bot_activity(UUID) IS '更新指定机器人的最后活动时间';
COMMENT ON FUNCTION get_active_bots() IS '获取所有激活的Telegram机器人列表';
COMMENT ON FUNCTION get_bot_by_token(VARCHAR) IS '根据Bot Token获取机器人信息（安全函数）';

-- 16. 插入示例机器人数据（可选）
-- INSERT INTO telegram_bots (bot_name, bot_token, bot_username, description) VALUES
-- ('能量租赁机器人', '123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'energy_rental_bot', '提供TRON能量租赁服务的Telegram机器人');