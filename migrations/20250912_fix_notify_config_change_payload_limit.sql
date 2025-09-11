-- 修复 notify_config_change() 函数的 payload 长度限制问题
-- PostgreSQL 的 pg_notify 限制 payload 最大 8000 字节

-- 删除旧函数并重新创建
DROP FUNCTION IF EXISTS notify_config_change() CASCADE;

-- 创建改进的配置变更触发器函数
CREATE OR REPLACE FUNCTION notify_config_change()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    notification_payload JSONB;
    payload_text TEXT;
    truncated_payload JSONB;
    max_payload_size INTEGER := 7500; -- 留一些缓冲空间，低于 8000 字节限制
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
    
    -- 记录变更日志（完整数据保存到日志表）
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
    
    -- 构建基础通知载荷（不包含完整数据）
    notification_payload := jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'record_id', COALESCE(NEW.id, OLD.id),
        'action', TG_OP,
        'changed_fields', changed_fields,
        'timestamp', CURRENT_TIMESTAMP
    );
    
    -- 尝试添加数据，如果太长则截断
    IF TG_OP != 'DELETE' THEN
        -- 先尝试添加完整的 new_data
        truncated_payload := notification_payload || jsonb_build_object('new_data', new_data);
        payload_text := truncated_payload::text;
        
        -- 如果太长，只添加关键字段
        IF length(payload_text) > max_payload_size THEN
            truncated_payload := notification_payload || jsonb_build_object(
                'new_data_summary', jsonb_build_object(
                    'id', new_data->>'id',
                    'name', COALESCE(new_data->>'name', new_data->>'bot_name', new_data->>'title'),
                    'updated_at', new_data->>'updated_at',
                    'data_truncated', true,
                    'full_data_size', length(new_data::text)
                )
            );
            payload_text := truncated_payload::text;
        END IF;
        
        notification_payload := truncated_payload;
    END IF;
    
    IF TG_OP != 'INSERT' THEN
        -- 检查添加 old_data 后是否会超长
        truncated_payload := notification_payload || jsonb_build_object('old_data', old_data);
        payload_text := truncated_payload::text;
        
        -- 如果太长，只添加关键字段
        IF length(payload_text) > max_payload_size THEN
            truncated_payload := notification_payload || jsonb_build_object(
                'old_data_summary', jsonb_build_object(
                    'id', old_data->>'id',
                    'name', COALESCE(old_data->>'name', old_data->>'bot_name', old_data->>'title'),
                    'updated_at', old_data->>'updated_at',
                    'data_truncated', true,
                    'full_data_size', length(old_data::text)
                )
            );
        END IF;
        
        notification_payload := truncated_payload;
    END IF;
    
    -- 创建通知记录（使用基础载荷）
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
    
    -- 最终检查并发送PostgreSQL通知
    payload_text := notification_payload::text;
    
    -- 如果仍然太长，发送最小化的通知
    IF length(payload_text) > max_payload_size THEN
        notification_payload := jsonb_build_object(
            'table_name', TG_TABLE_NAME,
            'record_id', COALESCE(NEW.id, OLD.id),
            'action', TG_OP,
            'timestamp', CURRENT_TIMESTAMP,
            'payload_truncated', true,
            'message', 'Payload too large, check config_change_logs for full details'
        );
    END IF;
    
    -- 发送PostgreSQL通知
    PERFORM pg_notify('config_change', notification_payload::text);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 重新创建所有触发器
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

-- 机器人网络配置表触发器（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bot_network_configs') THEN
        EXECUTE 'DROP TRIGGER IF EXISTS bot_network_configs_change_trigger ON bot_network_configs';
        EXECUTE 'CREATE TRIGGER bot_network_configs_change_trigger
                 AFTER INSERT OR UPDATE OR DELETE ON bot_network_configs
                 FOR EACH ROW EXECUTE FUNCTION notify_config_change()';
    END IF;
END $$;

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

-- 添加注释
COMMENT ON FUNCTION notify_config_change() IS '配置变更通知函数 - 修复版，处理大载荷截断问题';
