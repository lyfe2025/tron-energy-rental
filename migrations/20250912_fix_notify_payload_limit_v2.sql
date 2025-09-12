-- 进一步修复 notify_config_change() 函数的 payload 长度限制问题
-- PostgreSQL 的 pg_notify 限制 payload 最大 8000 字节，我们设置更严格的限制

-- 删除旧函数并重新创建
DROP FUNCTION IF EXISTS notify_config_change() CASCADE;

-- 创建更严格的配置变更触发器函数
CREATE OR REPLACE FUNCTION notify_config_change()
RETURNS TRIGGER AS $$
DECLARE
    notification_payload JSONB;
    payload_text TEXT;
    max_payload_size INTEGER := 6000; -- 更严格的限制，确保不会超过 8000 字节
    record_id_str TEXT;
BEGIN
    -- 获取记录ID（兼容不同表的ID字段）
    record_id_str := COALESCE(NEW.id, OLD.id)::text;
    
    -- 记录完整变更日志到日志表（不影响通知）
    BEGIN
        INSERT INTO config_change_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            changed_fields
        ) VALUES (
            TG_TABLE_NAME,
            record_id_str,
            TG_OP,
            CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
            CASE 
                WHEN TG_OP = 'UPDATE' THEN 
                    (SELECT array_agg(key) FROM (
                        SELECT key FROM jsonb_each(to_jsonb(OLD)) old_kv
                        FULL OUTER JOIN jsonb_each(to_jsonb(NEW)) new_kv USING (key)
                        WHERE old_kv.value IS DISTINCT FROM new_kv.value
                    ) changed)
                ELSE NULL 
            END
        );
    EXCEPTION 
        WHEN OTHERS THEN
            -- 如果日志记录失败，不影响主流程
            RAISE NOTICE 'Config change log failed: %', SQLERRM;
    END;
    
    -- 构建最小化的通知载荷
    notification_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'id', record_id_str,
        'op', TG_OP,
        'ts', extract(epoch from CURRENT_TIMESTAMP)::bigint
    );
    
    -- 尝试添加关键信息
    IF TG_OP != 'DELETE' AND NEW IS NOT NULL THEN
        notification_payload := notification_payload || jsonb_build_object(
            'name', COALESCE(
                NEW.name, 
                NEW.bot_name, 
                NEW.title,
                NEW.username,
                NEW.bot_username,
                'unnamed'
            ),
            'status', COALESCE(
                NEW.status,
                NEW.is_active,
                NEW.health_status,
                'unknown'
            )
        );
    END IF;
    
    -- 检查载荷大小
    payload_text := notification_payload::text;
    
    -- 如果仍然太长，使用最小载荷
    IF length(payload_text) > max_payload_size THEN
        notification_payload := jsonb_build_object(
            'table', TG_TABLE_NAME,
            'id', record_id_str,
            'op', TG_OP,
            'ts', extract(epoch from CURRENT_TIMESTAMP)::bigint,
            'truncated', true
        );
        payload_text := notification_payload::text;
    END IF;
    
    -- 最终安全检查
    IF length(payload_text) > max_payload_size THEN
        payload_text := format('{"table":"%s","id":"%s","op":"%s","error":"payload_too_large"}', 
                              TG_TABLE_NAME, 
                              substring(record_id_str from 1 for 50), 
                              TG_OP);
    END IF;
    
    -- 记录通知到通知表
    BEGIN
        INSERT INTO config_change_notifications (
            table_name,
            record_id,
            action,
            payload
        ) VALUES (
            TG_TABLE_NAME,
            record_id_str,
            TG_OP,
            notification_payload
        );
    EXCEPTION 
        WHEN OTHERS THEN
            -- 如果通知记录失败，不影响主流程
            RAISE NOTICE 'Config change notification record failed: %', SQLERRM;
    END;
    
    -- 发送PostgreSQL通知（使用安全的载荷）
    BEGIN
        PERFORM pg_notify('config_change', payload_text);
    EXCEPTION 
        WHEN OTHERS THEN
            -- 如果通知失败，记录错误但不中断流程
            RAISE NOTICE 'pg_notify failed: %, payload length: %', SQLERRM, length(payload_text);
            -- 发送错误通知
            PERFORM pg_notify('config_change', 
                format('{"table":"%s","id":"%s","op":"%s","error":"notify_failed"}', 
                       TG_TABLE_NAME, 
                       substring(record_id_str from 1 for 20), 
                       TG_OP)
            );
    END;
    
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

-- 添加注释
COMMENT ON FUNCTION notify_config_change() IS '配置变更通知函数 - 修复版v2，更严格的载荷限制和错误处理';
