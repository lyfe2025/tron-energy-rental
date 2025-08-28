-- 设置价格配置系统的权限和安全策略
-- Migration: 20250128_setup_pricing_security_policies.sql
-- Created: 2025-01-28
-- Description: 为价格配置系统设置RLS策略和角色授权

-- 1. 确保RLS已启用（在表创建时已启用，这里再次确认）
ALTER TABLE pricing_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_pricing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_history ENABLE ROW LEVEL SECURITY;

-- 2. 创建高级RLS策略：pricing_strategies表
-- 管理员可以查看和修改所有策略
CREATE POLICY "admin_full_access_pricing_strategies" ON pricing_strategies
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    );

-- 代理商只能查看分配给他们的策略
CREATE POLICY "agent_view_assigned_pricing_strategies" ON pricing_strategies
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'agent'
            AND EXISTS (
                SELECT 1 FROM bot_pricing_configs bpc
                JOIN telegram_bots tb ON bpc.bot_id = tb.id
                WHERE bpc.strategy_id = pricing_strategies.id
                AND tb.id IN (
                    SELECT bot_id FROM agent_bot_assignments aba
                    WHERE aba.agent_user_id = tu.user_id
                )
            )
        )
    );

-- 普通用户只能查看激活的策略
CREATE POLICY "user_view_active_pricing_strategies" ON pricing_strategies
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- 匿名用户只能查看激活的策略
CREATE POLICY "anon_view_active_pricing_strategies" ON pricing_strategies
    FOR SELECT
    TO anon
    USING (is_active = true);

-- 3. 创建RLS策略：pricing_templates表
-- 管理员可以查看和修改所有模板
CREATE POLICY "admin_full_access_pricing_templates" ON pricing_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    );

-- 所有认证用户可以查看模板
CREATE POLICY "authenticated_view_pricing_templates" ON pricing_templates
    FOR SELECT
    TO authenticated
    USING (true);

-- 匿名用户可以查看模板
CREATE POLICY "anon_view_pricing_templates" ON pricing_templates
    FOR SELECT
    TO anon
    USING (true);

-- 4. 创建RLS策略：pricing_modes表
-- 管理员可以查看和修改所有模式
CREATE POLICY "admin_full_access_pricing_modes" ON pricing_modes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    );

-- 所有认证用户可以查看启用的模式
CREATE POLICY "authenticated_view_enabled_pricing_modes" ON pricing_modes
    FOR SELECT
    TO authenticated
    USING (is_enabled = true);

-- 匿名用户可以查看启用的模式
CREATE POLICY "anon_view_enabled_pricing_modes" ON pricing_modes
    FOR SELECT
    TO anon
    USING (is_enabled = true);

-- 5. 创建RLS策略：bot_pricing_configs表
-- 管理员可以查看和修改所有配置
CREATE POLICY "admin_full_access_bot_pricing_configs" ON bot_pricing_configs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    );

-- 代理商只能查看分配给他们的机器人配置
CREATE POLICY "agent_view_assigned_bot_pricing_configs" ON bot_pricing_configs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'agent'
            AND bot_id IN (
                SELECT bot_id FROM agent_bot_assignments aba
                WHERE aba.agent_user_id = tu.user_id
            )
        )
    );

-- 普通用户只能查看激活的配置
CREATE POLICY "user_view_active_bot_pricing_configs" ON bot_pricing_configs
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- 匿名用户只能查看激活的配置
CREATE POLICY "anon_view_active_bot_pricing_configs" ON bot_pricing_configs
    FOR SELECT
    TO anon
    USING (is_active = true);

-- 6. 创建RLS策略：telegram_bots表
-- 管理员可以查看和修改所有机器人
CREATE POLICY "admin_full_access_telegram_bots" ON telegram_bots
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    );

-- 代理商只能查看分配给他们的机器人
CREATE POLICY "agent_view_assigned_telegram_bots" ON telegram_bots
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'agent'
            AND id IN (
                SELECT bot_id FROM agent_bot_assignments aba
                WHERE aba.agent_user_id = tu.user_id
            )
        )
    );

-- 普通用户只能查看激活的机器人（不包含敏感信息）
CREATE POLICY "user_view_active_telegram_bots" ON telegram_bots
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- 匿名用户只能查看激活的机器人（不包含敏感信息）
CREATE POLICY "anon_view_active_telegram_bots" ON telegram_bots
    FOR SELECT
    TO anon
    USING (is_active = true);

-- 7. 创建RLS策略：pricing_history表
-- 管理员可以查看所有历史记录
CREATE POLICY "admin_view_all_pricing_history" ON pricing_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    );

-- 代理商只能查看分配给他们的机器人相关的历史记录
CREATE POLICY "agent_view_assigned_pricing_history" ON pricing_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'agent'
            AND bot_id IN (
                SELECT bot_id FROM agent_bot_assignments aba
                WHERE aba.agent_user_id = tu.user_id
            )
        )
    );

-- 8. 创建代理商机器人分配表（如果不存在）
CREATE TABLE IF NOT EXISTS agent_bot_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_user_id VARCHAR(255) NOT NULL,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT unique_agent_bot_assignment UNIQUE (agent_user_id, bot_id)
);

-- 为代理商机器人分配表创建索引
CREATE INDEX IF NOT EXISTS idx_agent_bot_assignments_agent_user_id ON agent_bot_assignments(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_bot_assignments_bot_id ON agent_bot_assignments(bot_id);
CREATE INDEX IF NOT EXISTS idx_agent_bot_assignments_active ON agent_bot_assignments(is_active);

-- 为代理商机器人分配表添加注释
COMMENT ON TABLE agent_bot_assignments IS '代理商机器人分配表';
COMMENT ON COLUMN agent_bot_assignments.id IS '分配记录ID';
COMMENT ON COLUMN agent_bot_assignments.agent_user_id IS '代理商用户ID';
COMMENT ON COLUMN agent_bot_assignments.bot_id IS '机器人ID';
COMMENT ON COLUMN agent_bot_assignments.assigned_at IS '分配时间';
COMMENT ON COLUMN agent_bot_assignments.assigned_by IS '分配操作者';
COMMENT ON COLUMN agent_bot_assignments.is_active IS '是否激活';

-- 为代理商机器人分配表设置权限
ALTER TABLE agent_bot_assignments ENABLE ROW LEVEL SECURITY;

-- 管理员可以查看和修改所有分配
CREATE POLICY "admin_full_access_agent_bot_assignments" ON agent_bot_assignments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    );

-- 代理商只能查看自己的分配
CREATE POLICY "agent_view_own_assignments" ON agent_bot_assignments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'agent'
            AND tu.user_id = agent_user_id
        )
    );

-- 为代理商机器人分配表授权
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_bot_assignments TO authenticated;
GRANT SELECT ON agent_bot_assignments TO anon;

-- 9. 创建安全函数：检查用户权限
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id TEXT,
    p_required_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- 获取用户角色
    SELECT user_type INTO user_role
    FROM telegram_users
    WHERE user_id = p_user_id;
    
    -- 检查权限层级：admin > agent > user
    CASE p_required_role
        WHEN 'admin' THEN
            RETURN user_role = 'admin';
        WHEN 'agent' THEN
            RETURN user_role IN ('admin', 'agent');
        WHEN 'user' THEN
            RETURN user_role IN ('admin', 'agent', 'user');
        ELSE
            RETURN false;
    END CASE;
END;
$$;

-- 10. 创建安全函数：检查代理商机器人访问权限
CREATE OR REPLACE FUNCTION check_agent_bot_access(
    p_agent_user_id TEXT,
    p_bot_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 检查是否为管理员
    IF check_user_permission(p_agent_user_id, 'admin') THEN
        RETURN true;
    END IF;
    
    -- 检查代理商是否有该机器人的访问权限
    RETURN EXISTS (
        SELECT 1 FROM agent_bot_assignments
        WHERE agent_user_id = p_agent_user_id
        AND bot_id = p_bot_id
        AND is_active = true
    );
END;
$$;

-- 11. 为安全函数授权
GRANT EXECUTE ON FUNCTION check_user_permission(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_agent_bot_access(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_agent_bot_access(TEXT, UUID) TO anon;

-- 12. 为安全函数添加注释
COMMENT ON FUNCTION check_user_permission(TEXT, TEXT) IS '检查用户权限';
COMMENT ON FUNCTION check_agent_bot_access(TEXT, UUID) IS '检查代理商机器人访问权限';

-- 13. 创建视图：安全的机器人信息（隐藏敏感信息）
CREATE OR REPLACE VIEW public_telegram_bots AS
SELECT 
    id,
    bot_name,
    bot_username,
    description,
    is_active,
    created_at,
    updated_at
FROM telegram_bots
WHERE is_active = true;

-- 为公共视图授权
GRANT SELECT ON public_telegram_bots TO authenticated;
GRANT SELECT ON public_telegram_bots TO anon;

-- 为公共视图添加注释
COMMENT ON VIEW public_telegram_bots IS '公共机器人信息视图（隐藏敏感信息）';

-- 14. 创建审计日志触发器
CREATE OR REPLACE FUNCTION audit_pricing_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 记录敏感操作到审计日志
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
            OLD.config,
            'Strategy deleted',
            COALESCE(current_setting('app.current_user_id', true), 'system')
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 只有当配置实际发生变化时才记录
        IF OLD.config IS DISTINCT FROM NEW.config OR OLD.is_active IS DISTINCT FROM NEW.is_active THEN
            INSERT INTO pricing_history (
                strategy_id,
                action_type,
                old_config,
                new_config,
                change_reason,
                created_by
            ) VALUES (
                NEW.id,
                'UPDATE',
                OLD.config,
                NEW.config,
                COALESCE(NEW.name || ' updated', 'Strategy updated'),
                COALESCE(current_setting('app.current_user_id', true), 'system')
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO pricing_history (
            strategy_id,
            action_type,
            new_config,
            change_reason,
            created_by
        ) VALUES (
            NEW.id,
            'CREATE',
            NEW.config,
            'Strategy created',
            COALESCE(current_setting('app.current_user_id', true), 'system')
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- 创建审计触发器
CREATE TRIGGER audit_pricing_strategies_changes
    AFTER INSERT OR UPDATE OR DELETE ON pricing_strategies
    FOR EACH ROW
    EXECUTE FUNCTION audit_pricing_changes();

-- 为审计函数添加注释
COMMENT ON FUNCTION audit_pricing_changes() IS '价格策略变更审计触发器函数';

-- 完成权限和安全策略设置
SELECT 'Pricing system security policies and permissions have been set up successfully.' as result;