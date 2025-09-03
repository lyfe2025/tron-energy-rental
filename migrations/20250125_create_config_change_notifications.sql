-- 配置变更通知系统
-- 创建配置变更日志表和触发器，实现自动通知机制

-- 创建配置变更日志表
CREATE TABLE IF NOT EXISTS config_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    changed_by UUID,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_config_change_logs_table_name ON config_change_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_config_change_logs_record_id ON config_change_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_config_change_logs_action ON config_change_logs(action);
CREATE INDEX IF NOT EXISTS idx_config_change_logs_created_at ON config_change_logs(created_at);

-- 添加表注释
COMMENT ON TABLE config_change_logs IS '配置变更日志表，记录所有配置相关表的变更历史';
COMMENT ON COLUMN config_change_logs.table_name IS '发生变更的表名';
COMMENT ON COLUMN config_change_logs.record_id IS '变更记录的ID';
COMMENT ON COLUMN config_change_logs.action IS '变更操作类型：INSERT、UPDATE、DELETE';
COMMENT ON COLUMN config_change_logs.old_data IS '变更前的数据（JSON格式）';
COMMENT ON COLUMN config_change_logs.new_data IS '变更后的数据（JSON格式）';
COMMENT ON COLUMN config_change_logs.changed_fields IS '发生变更的字段列表';
COMMENT ON COLUMN config_change_logs.changed_by IS '执行变更的用户ID';
COMMENT ON COLUMN config_change_logs.change_reason IS '变更原因说明';

-- 创建配置变更通知表
CREATE TABLE IF NOT EXISTS config_change_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'config_change',
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_config_notifications_status ON config_change_notifications(status);
CREATE INDEX IF NOT EXISTS idx_config_notifications_table_name ON config_change_notifications(table_name);
CREATE INDEX IF NOT EXISTS idx_config_notifications_created_at ON config_change_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_config_notifications_next_retry ON config_change_notifications(next_retry_at);

-- 添加表注释
COMMENT ON TABLE config_change_notifications IS '配置变更通知队列表';
COMMENT ON COLUMN config_change_notifications.notification_type IS '通知类型';
COMMENT ON COLUMN config_change_notifications.payload IS '通知载荷数据';
COMMENT ON COLUMN config_change_notifications.status IS '通知状态：pending、sent、failed';
COMMENT ON COLUMN config_change_notifications.retry_count IS '重试次数';
COMMENT ON COLUMN config_change_notifications.max_retries IS '最大重试次数';

-- 创建通用的配置变更触发器函数
CREATE OR REPLACE FUNCTION notify_config_change()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    notification_payload JSONB;
BEGIN
    -- 根据操作类型设置数据
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
        changed_fields := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
        changed_fields := NULL;
    ELSE -- UPDATE
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- 计算变更的字段
        SELECT array_agg(key) INTO changed_fields
        FROM (
            SELECT key
            FROM jsonb_each(old_data) old_kv
            FULL OUTER JOIN jsonb_each(new_data) new_kv USING (key)
            WHERE old_kv.value IS DISTINCT FROM new_kv.value
        ) changed;
    END IF;
    
    -- 记录变更日志
    INSERT INTO config_change_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_fields
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        old_data,
        new_data,
        changed_fields
    );
    
    -- 构建通知载荷
    notification_payload := jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'record_id', COALESCE(NEW.id, OLD.id),
        'action', TG_OP,
        'changed_fields', changed_fields,
        'timestamp', CURRENT_TIMESTAMP
    );
    
    -- 添加具体数据（根据需要）
    IF TG_OP != 'DELETE' THEN
        notification_payload := notification_payload || jsonb_build_object('new_data', new_data);
    END IF;
    
    IF TG_OP != 'INSERT' THEN
        notification_payload := notification_payload || jsonb_build_object('old_data', old_data);
    END IF;
    
    -- 创建通知记录
    INSERT INTO config_change_notifications (
        table_name,
        record_id,
        action,
        payload
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        notification_payload
    );
    
    -- 发送PostgreSQL通知
    PERFORM pg_notify('config_change', notification_payload::text);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 为配置相关表创建触发器

-- TRON网络配置表触发器
DROP TRIGGER IF EXISTS tron_networks_change_trigger ON tron_networks;
CREATE TRIGGER tron_networks_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tron_networks
    FOR EACH ROW EXECUTE FUNCTION notify_config_change();

-- Telegram机器人配置表触发器
DROP TRIGGER IF EXISTS telegram_bots_change_trigger ON telegram_bots;
CREATE TRIGGER telegram_bots_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON telegram_bots
    FOR EACH ROW EXECUTE FUNCTION notify_config_change();

-- 机器人网络配置表触发器
DROP TRIGGER IF EXISTS bot_network_configs_change_trigger ON bot_network_configs;
CREATE TRIGGER bot_network_configs_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bot_network_configs
    FOR EACH ROW EXECUTE FUNCTION notify_config_change();

-- 系统配置表触发器（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_configs') THEN
        EXECUTE 'DROP TRIGGER IF EXISTS system_configs_change_trigger ON system_configs';
        EXECUTE 'CREATE TRIGGER system_configs_change_trigger
                 AFTER INSERT OR UPDATE OR DELETE ON system_configs
                 FOR EACH ROW EXECUTE FUNCTION notify_config_change()';
    END IF;
END $$;

-- 创建清理旧日志的函数
CREATE OR REPLACE FUNCTION cleanup_old_config_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM config_change_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 同时清理已处理的通知记录
    DELETE FROM config_change_notifications 
    WHERE status = 'sent' 
      AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * (days_to_keep / 2);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建定期清理任务（需要pg_cron扩展，如果可用）
-- SELECT cron.schedule('cleanup-config-logs', '0 2 * * *', 'SELECT cleanup_old_config_logs(30);');

-- 授权（本地PostgreSQL环境，跳过Supabase特定角色）
-- GRANT SELECT, INSERT, UPDATE, DELETE ON config_change_logs TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON config_change_notifications TO authenticated;
-- GRANT SELECT ON config_change_logs TO anon;
-- GRANT SELECT ON config_change_notifications TO anon;

-- 创建用于获取配置变更历史的视图
CREATE OR REPLACE VIEW config_change_history AS
SELECT 
    ccl.id,
    ccl.table_name,
    ccl.record_id,
    ccl.action,
    ccl.changed_fields,
    ccl.created_at,
    ccl.change_reason,
    -- 根据表名添加友好的显示名称
    CASE ccl.table_name
        WHEN 'tron_networks' THEN 'TRON网络配置'
        WHEN 'telegram_bots' THEN 'Telegram机器人配置'
        WHEN 'bot_network_configs' THEN '机器人网络关联配置'
        WHEN 'system_configs' THEN '系统配置'
        ELSE ccl.table_name
    END as table_display_name,
    -- 提取记录名称（如果可能）
    CASE ccl.table_name
        WHEN 'tron_networks' THEN ccl.new_data->>'name'
        WHEN 'telegram_bots' THEN ccl.new_data->>'bot_name'
        ELSE ccl.record_id::text
    END as record_name
FROM config_change_logs ccl
ORDER BY ccl.created_at DESC;

-- GRANT SELECT ON config_change_history TO authenticated, anon;

COMMENT ON VIEW config_change_history IS '配置变更历史视图，提供友好的变更记录展示';