-- 创建 system_config_history 审计表
-- 记录所有系统配置变更历史，支持审计和回滚功能
-- 创建时间: 2025-01-25
-- 作者: 配置管理迁移项目

-- 开始事务
BEGIN;

-- 创建 system_config_history 表
CREATE TABLE IF NOT EXISTS system_config_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    operation_type VARCHAR(20) NOT NULL,
    field_name VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT,
    change_description TEXT,
    user_id UUID,
    user_type VARCHAR(20) DEFAULT 'admin',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    rollback_id UUID,
    is_rollback BOOLEAN DEFAULT false,
    severity VARCHAR(20) DEFAULT 'info',
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE system_config_history IS '系统配置变更历史表：记录所有配置变更，支持审计、追踪和回滚功能';

-- 添加字段注释
COMMENT ON COLUMN system_config_history.id IS '历史记录唯一标识符（UUID）';
COMMENT ON COLUMN system_config_history.entity_type IS '实体类型：telegram_bot, tron_network, energy_pool, bot_network_config等';
COMMENT ON COLUMN system_config_history.entity_id IS '实体ID，关联具体的配置记录';
COMMENT ON COLUMN system_config_history.operation_type IS '操作类型：create, update, delete, activate, deactivate等';
COMMENT ON COLUMN system_config_history.field_name IS '变更的字段名称，NULL表示整个记录变更';
COMMENT ON COLUMN system_config_history.old_value IS '变更前的值（JSON格式）';
COMMENT ON COLUMN system_config_history.new_value IS '变更后的值（JSON格式）';
COMMENT ON COLUMN system_config_history.change_reason IS '变更原因';
COMMENT ON COLUMN system_config_history.change_description IS '变更详细描述';
COMMENT ON COLUMN system_config_history.user_id IS '操作用户ID';
COMMENT ON COLUMN system_config_history.user_type IS '用户类型：admin, system, api等';
COMMENT ON COLUMN system_config_history.ip_address IS '操作来源IP地址';
COMMENT ON COLUMN system_config_history.user_agent IS '用户代理信息';
COMMENT ON COLUMN system_config_history.session_id IS '会话ID';
COMMENT ON COLUMN system_config_history.request_id IS '请求ID，用于关联同一次请求的多个变更';
COMMENT ON COLUMN system_config_history.rollback_id IS '回滚关联ID，指向被回滚的记录';
COMMENT ON COLUMN system_config_history.is_rollback IS '是否为回滚操作';
COMMENT ON COLUMN system_config_history.severity IS '严重程度：info, warning, error, critical';
COMMENT ON COLUMN system_config_history.tags IS '标签数组，用于分类和过滤';
COMMENT ON COLUMN system_config_history.metadata IS '额外的元数据信息';
COMMENT ON COLUMN system_config_history.created_at IS '记录创建时间';

-- 添加约束
ALTER TABLE system_config_history 
    ADD CONSTRAINT chk_operation_type 
    CHECK (operation_type IN (
        'create', 'update', 'delete', 'activate', 'deactivate', 
        'enable', 'disable', 'sync', 'rollback', 'migrate'
    ));

ALTER TABLE system_config_history 
    ADD CONSTRAINT chk_user_type 
    CHECK (user_type IN ('admin', 'system', 'api', 'migration', 'scheduler'));

ALTER TABLE system_config_history 
    ADD CONSTRAINT chk_severity 
    CHECK (severity IN ('info', 'warning', 'error', 'critical'));

ALTER TABLE system_config_history 
    ADD CONSTRAINT chk_entity_type 
    CHECK (entity_type IN (
        'telegram_bot', 'tron_network', 'energy_pool', 
        'bot_network_config', 'system_config', 'user_config'
    ));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_config_history_entity ON system_config_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_config_history_operation ON system_config_history(operation_type);
CREATE INDEX IF NOT EXISTS idx_system_config_history_user ON system_config_history(user_id);
CREATE INDEX IF NOT EXISTS idx_system_config_history_created_at ON system_config_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_config_history_severity ON system_config_history(severity);
CREATE INDEX IF NOT EXISTS idx_system_config_history_request_id ON system_config_history(request_id);
CREATE INDEX IF NOT EXISTS idx_system_config_history_rollback ON system_config_history(rollback_id);
CREATE INDEX IF NOT EXISTS idx_system_config_history_is_rollback ON system_config_history(is_rollback);
CREATE INDEX IF NOT EXISTS idx_system_config_history_tags ON system_config_history USING GIN(tags);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_system_config_history_entity_time 
    ON system_config_history(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_config_history_user_time 
    ON system_config_history(user_id, created_at DESC);

-- 创建函数：记录配置变更
CREATE OR REPLACE FUNCTION log_config_change(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_operation_type VARCHAR,
    p_field_name VARCHAR DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_change_reason TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_user_type VARCHAR DEFAULT 'system',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL,
    p_request_id VARCHAR DEFAULT NULL,
    p_severity VARCHAR DEFAULT 'info',
    p_tags JSONB DEFAULT '[]',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
BEGIN
    INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        old_value, new_value, change_reason, user_id, user_type,
        ip_address, user_agent, session_id, request_id,
        severity, tags, metadata
    ) VALUES (
        p_entity_type, p_entity_id, p_operation_type, p_field_name,
        p_old_value, p_new_value, p_change_reason, p_user_id, p_user_type,
        p_ip_address, p_user_agent, p_session_id, p_request_id,
        p_severity, p_tags, p_metadata
    ) RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取实体变更历史
CREATE OR REPLACE FUNCTION get_entity_history(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    operation_type VARCHAR,
    field_name VARCHAR,
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT,
    user_id UUID,
    user_type VARCHAR,
    severity VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.operation_type,
        h.field_name,
        h.old_value,
        h.new_value,
        h.change_reason,
        h.user_id,
        h.user_type,
        h.severity,
        h.created_at
    FROM system_config_history h
    WHERE h.entity_type = p_entity_type 
        AND h.entity_id = p_entity_id
    ORDER BY h.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取用户操作历史
CREATE OR REPLACE FUNCTION get_user_operation_history(
    p_user_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    entity_type VARCHAR,
    entity_id UUID,
    operation_type VARCHAR,
    field_name VARCHAR,
    change_reason TEXT,
    severity VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.entity_type,
        h.entity_id,
        h.operation_type,
        h.field_name,
        h.change_reason,
        h.severity,
        h.created_at
    FROM system_config_history h
    WHERE h.user_id = p_user_id
        AND (p_start_time IS NULL OR h.created_at >= p_start_time)
        AND (p_end_time IS NULL OR h.created_at <= p_end_time)
    ORDER BY h.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 创建数据清理函数（保留最近6个月的记录）
CREATE OR REPLACE FUNCTION cleanup_old_config_history()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM system_config_history 
    WHERE created_at < NOW() - INTERVAL '6 months'
        AND severity NOT IN ('error', 'critical');
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 提交事务
COMMIT;

-- 验证迁移结果
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'system_config_history' 
    AND schemaname = 'public'
ORDER BY indexname;