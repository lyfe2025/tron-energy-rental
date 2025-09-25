-- ========================================================================
-- 修复数据库表所有者脚本
-- 将所有表和序列的所有者从 root 改为 db_tron_admin
-- ========================================================================

-- 修复所有表的所有者
ALTER TABLE admin_roles OWNER TO db_tron_admin;
ALTER TABLE admin_sessions OWNER TO db_tron_admin;
ALTER TABLE admins OWNER TO db_tron_admin;
ALTER TABLE agent_applications OWNER TO db_tron_admin;
ALTER TABLE agent_earnings OWNER TO db_tron_admin;
ALTER TABLE agents OWNER TO db_tron_admin;
ALTER TABLE bot_logs OWNER TO db_tron_admin;
ALTER TABLE config_change_logs OWNER TO db_tron_admin;
ALTER TABLE config_change_notifications OWNER TO db_tron_admin;
ALTER TABLE daily_fee_logs OWNER TO db_tron_admin;
ALTER TABLE departments OWNER TO db_tron_admin;
ALTER TABLE energy_pools OWNER TO db_tron_admin;
ALTER TABLE energy_usage_logs OWNER TO db_tron_admin;
ALTER TABLE login_logs OWNER TO db_tron_admin;
ALTER TABLE menus OWNER TO db_tron_admin;
ALTER TABLE operation_logs OWNER TO db_tron_admin;
ALTER TABLE orders OWNER TO db_tron_admin;
ALTER TABLE positions OWNER TO db_tron_admin;
ALTER TABLE price_configs OWNER TO db_tron_admin;
ALTER TABLE role_permissions OWNER TO db_tron_admin;
ALTER TABLE roles OWNER TO db_tron_admin;
ALTER TABLE scheduled_tasks OWNER TO db_tron_admin;
ALTER TABLE schema_migrations OWNER TO db_tron_admin;
ALTER TABLE system_config_history OWNER TO db_tron_admin;
ALTER TABLE system_configs OWNER TO db_tron_admin;
ALTER TABLE system_monitoring_logs OWNER TO db_tron_admin;
ALTER TABLE task_execution_logs OWNER TO db_tron_admin;
ALTER TABLE telegram_bot_notification_configs OWNER TO db_tron_admin;
ALTER TABLE telegram_bot_status OWNER TO db_tron_admin;
ALTER TABLE telegram_bots OWNER TO db_tron_admin;
ALTER TABLE telegram_message_templates OWNER TO db_tron_admin;
ALTER TABLE telegram_notification_analytics OWNER TO db_tron_admin;
ALTER TABLE telegram_notification_logs OWNER TO db_tron_admin;
ALTER TABLE tron_networks OWNER TO db_tron_admin;
ALTER TABLE user_level_changes OWNER TO db_tron_admin;
ALTER TABLE user_notification_preferences OWNER TO db_tron_admin;
ALTER TABLE users OWNER TO db_tron_admin;

-- 修复所有序列的所有者
DO $$ 
DECLARE 
    seq_record RECORD;
BEGIN 
    FOR seq_record IN 
        SELECT sequence_name FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP 
        EXECUTE format('ALTER SEQUENCE %I OWNER TO db_tron_admin', seq_record.sequence_name);
    END LOOP; 
END $$;

-- 授予所有权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO db_tron_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO db_tron_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO db_tron_admin;

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO db_tron_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO db_tron_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO db_tron_admin;

-- 确保数据库所有者正确
ALTER DATABASE tron_energy OWNER TO db_tron_admin;

SELECT '✅ 表所有者修复完成！' as status;
