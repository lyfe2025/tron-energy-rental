-- 创建价格历史表
-- Migration: 20250128_create_pricing_history_table.sql
-- Created: 2025-01-28
-- Description: 创建价格历史表，用于记录价格策略的变更历史和审计日志

-- 1. 创建价格历史表
CREATE TABLE IF NOT EXISTS pricing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    old_config JSONB,
    new_config JSONB,
    change_reason TEXT,
    changed_fields TEXT[],
    bot_id UUID,
    effective_from TIMESTAMP WITH TIME ZONE,
    effective_until TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES telegram_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 外键约束
    CONSTRAINT fk_pricing_history_strategy FOREIGN KEY (strategy_id) REFERENCES pricing_strategies(id) ON DELETE CASCADE,
    CONSTRAINT fk_pricing_history_bot FOREIGN KEY (bot_id) REFERENCES telegram_bots(id) ON DELETE SET NULL
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_pricing_history_strategy_id ON pricing_history(strategy_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_action_type ON pricing_history(action_type);
CREATE INDEX IF NOT EXISTS idx_pricing_history_created_at ON pricing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_history_created_by ON pricing_history(created_by);
CREATE INDEX IF NOT EXISTS idx_pricing_history_bot_id ON pricing_history(bot_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_effective ON pricing_history(effective_from, effective_until);

-- 3. 添加表和字段注释
COMMENT ON TABLE pricing_history IS '价格历史表：记录价格策略的变更历史和审计日志';
COMMENT ON COLUMN pricing_history.id IS '历史记录唯一标识';
COMMENT ON COLUMN pricing_history.strategy_id IS '关联的价格策略ID';
COMMENT ON COLUMN pricing_history.action_type IS '操作类型：CREATE-创建，UPDATE-更新，DELETE-删除，ACTIVATE-激活，DEACTIVATE-停用';
COMMENT ON COLUMN pricing_history.old_config IS '变更前的配置（JSON格式）';
COMMENT ON COLUMN pricing_history.new_config IS '变更后的配置（JSON格式）';
COMMENT ON COLUMN pricing_history.change_reason IS '变更原因说明';
COMMENT ON COLUMN pricing_history.changed_fields IS '变更的字段列表';
COMMENT ON COLUMN pricing_history.bot_id IS '关联的机器人ID（如果变更与特定机器人相关）';
COMMENT ON COLUMN pricing_history.effective_from IS '变更生效开始时间';
COMMENT ON COLUMN pricing_history.effective_until IS '变更生效结束时间';
COMMENT ON COLUMN pricing_history.created_by IS '操作者用户ID';
COMMENT ON COLUMN pricing_history.created_at IS '记录创建时间';

-- 4. 权限配置已完成

-- 8. 添加约束确保action_type的有效性
ALTER TABLE pricing_history ADD CONSTRAINT pricing_history_action_type_check 
CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE', 'CONFIG_CHANGE', 'BOT_ASSIGN', 'BOT_UNASSIGN'));

-- 9. 创建触发器函数：自动记录价格策略变更
CREATE OR REPLACE FUNCTION log_pricing_strategy_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    changed_fields_array TEXT[] := ARRAY[]::TEXT[];
    change_reason_text TEXT := '';
BEGIN
    -- 处理INSERT操作
    IF TG_OP = 'INSERT' THEN
        INSERT INTO pricing_history (
            strategy_id,
            action_type,
            new_config,
            change_reason,
            created_by
        ) VALUES (
            NEW.id,
            'CREATE',
            row_to_json(NEW)::jsonb,
            '创建新的价格策略',
            NEW.created_by
        );
        RETURN NEW;
    END IF;
    
    -- 处理UPDATE操作
    IF TG_OP = 'UPDATE' THEN
        -- 检查哪些字段发生了变更
        IF OLD.name != NEW.name THEN
            changed_fields_array := array_append(changed_fields_array, 'name');
        END IF;
        
        IF OLD.type != NEW.type THEN
            changed_fields_array := array_append(changed_fields_array, 'type');
        END IF;
        
        IF OLD.config != NEW.config THEN
            changed_fields_array := array_append(changed_fields_array, 'config');
        END IF;
        
        IF OLD.is_active != NEW.is_active THEN
            changed_fields_array := array_append(changed_fields_array, 'is_active');
            IF NEW.is_active THEN
                change_reason_text := '激活价格策略';
            ELSE
                change_reason_text := '停用价格策略';
            END IF;
        END IF;
        
        IF OLD.template_id != NEW.template_id THEN
            changed_fields_array := array_append(changed_fields_array, 'template_id');
        END IF;
        
        -- 如果有字段变更，记录历史
        IF array_length(changed_fields_array, 1) > 0 THEN
            IF change_reason_text = '' THEN
                change_reason_text := '更新价格策略配置';
            END IF;
            
            INSERT INTO pricing_history (
                strategy_id,
                action_type,
                old_config,
                new_config,
                change_reason,
                changed_fields,
                created_by
            ) VALUES (
                NEW.id,
                CASE 
                    WHEN 'is_active' = ANY(changed_fields_array) AND NEW.is_active THEN 'ACTIVATE'
                    WHEN 'is_active' = ANY(changed_fields_array) AND NOT NEW.is_active THEN 'DEACTIVATE'
                    ELSE 'UPDATE'
                END,
                row_to_json(OLD)::jsonb,
                row_to_json(NEW)::jsonb,
                change_reason_text,
                changed_fields_array,
                NEW.created_by
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- 处理DELETE操作
    IF TG_OP = 'DELETE' THEN
        INSERT INTO pricing_history (
            strategy_id,
            action_type,
            old_config,
            change_reason,
            created_by
        ) VALUES (
            OLD.id,
            'DELETE',
            row_to_json(OLD)::jsonb,
            '删除价格策略',
            OLD.created_by
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- 10. 创建触发器：自动记录pricing_strategies表的变更
CREATE TRIGGER pricing_strategies_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON pricing_strategies
    FOR EACH ROW
    EXECUTE FUNCTION log_pricing_strategy_changes();

-- 11. 创建函数：获取策略变更历史
CREATE OR REPLACE FUNCTION get_strategy_history(
    p_strategy_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    history_id UUID,
    action_type VARCHAR(50),
    change_reason TEXT,
    changed_fields TEXT[],
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ph.id,
        ph.action_type,
        ph.change_reason,
        ph.changed_fields,
        ph.created_by,
        ph.created_at
    FROM pricing_history ph
    WHERE ph.strategy_id = p_strategy_id
    ORDER BY ph.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 12. 创建函数：获取价格变更统计
CREATE OR REPLACE FUNCTION get_pricing_change_stats(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    action_type VARCHAR(50),
    change_count BIGINT,
    latest_change TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ph.action_type,
        COUNT(*) as change_count,
        MAX(ph.created_at) as latest_change
    FROM pricing_history ph
    WHERE ph.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY ph.action_type
    ORDER BY change_count DESC;
END;
$$;

-- 13. 为函数添加注释
COMMENT ON FUNCTION log_pricing_strategy_changes() IS '自动记录价格策略变更的触发器函数';
COMMENT ON FUNCTION get_strategy_history(UUID, INTEGER) IS '获取指定策略的变更历史记录';
COMMENT ON FUNCTION get_pricing_change_stats(INTEGER) IS '获取指定天数内的价格变更统计信息';

-- 14. 创建视图：价格变更摘要
CREATE OR REPLACE VIEW pricing_change_summary AS
SELECT 
    ps.id as strategy_id,
    ps.name as strategy_name,
    ps.type as strategy_type,
    COUNT(ph.id) as total_changes,
    MAX(ph.created_at) as last_changed,
    array_agg(DISTINCT ph.action_type ORDER BY ph.action_type) as action_types
FROM pricing_strategies ps
LEFT JOIN pricing_history ph ON ps.id = ph.strategy_id
GROUP BY ps.id, ps.name, ps.type
ORDER BY last_changed DESC NULLS LAST;

-- 15. 为视图添加注释
COMMENT ON VIEW pricing_change_summary IS '价格策略变更摘要视图：显示每个策略的变更统计信息';

-- 16. 权限配置已完成