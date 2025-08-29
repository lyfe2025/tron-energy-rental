-- =====================================================
-- 整合数据库迁移文件
-- 基于实际数据库状态: latest_schema_20250829_191002.sql
-- 创建时间: 2025-01-29
-- 说明: 此文件包含当前数据库的完整结构，用于替代过时的迁移文件
-- 包含: 扩展、枚举、函数、表、索引、约束、触发器、外键等
-- =====================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建枚举类型
CREATE TYPE public.account_type AS ENUM (
    'energy_pool',
    'user_wallet'
);

-- 创建函数
CREATE OR REPLACE FUNCTION public.get_active_bots()
RETURNS TABLE(id uuid, bot_name character varying, bot_token character varying, bot_username character varying, webhook_url text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tb.id,
        tb.bot_name,
        tb.bot_token,
        tb.bot_username,
        tb.webhook_url,
        tb.is_active,
        tb.created_at,
        tb.updated_at,
        tb.created_by
    FROM telegram_bots tb
    WHERE tb.is_active = true
    ORDER BY tb.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bot_active_pricing_config(bot_id_param uuid)
RETURNS TABLE(id uuid, bot_id uuid, pricing_strategy_id uuid, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, strategy_name character varying, strategy_type character varying, base_price numeric, min_price numeric, max_price numeric, price_adjustment_factor numeric, is_strategy_active boolean)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bpc.id,
        bpc.bot_id,
        bpc.pricing_strategy_id,
        bpc.is_active,
        bpc.created_at,
        bpc.updated_at,
        ps.name as strategy_name,
        ps.type as strategy_type,
        ps.base_price,
        ps.min_price,
        ps.max_price,
        ps.price_adjustment_factor,
        ps.is_active as is_strategy_active
    FROM bot_pricing_configs bpc
    JOIN pricing_strategies ps ON bpc.pricing_strategy_id = ps.id
    WHERE bpc.bot_id = bot_id_param 
      AND bpc.is_active = true 
      AND ps.is_active = true
    ORDER BY bpc.created_at DESC
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bot_by_token(token_param character varying)
RETURNS TABLE(id uuid, bot_name character varying, bot_token character varying, bot_username character varying, webhook_url text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tb.id,
        tb.bot_name,
        tb.bot_token,
        tb.bot_username,
        tb.webhook_url,
        tb.is_active,
        tb.created_at,
        tb.updated_at,
        tb.created_by
    FROM telegram_bots tb
    WHERE tb.bot_token = token_param
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pricing_change_stats(days_back integer DEFAULT 30)
RETURNS TABLE(total_changes bigint, avg_price_change numeric, max_price_change numeric, min_price_change numeric, most_active_strategy character varying)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH price_changes AS (
        SELECT 
            ph.strategy_id,
            ps.name as strategy_name,
            ABS(ph.new_base_price - ph.old_base_price) as price_change
        FROM pricing_history ph
        JOIN pricing_strategies ps ON ph.strategy_id = ps.id
        WHERE ph.created_at >= NOW() - INTERVAL '1 day' * days_back
    ),
    strategy_activity AS (
        SELECT 
            strategy_name,
            COUNT(*) as change_count
        FROM price_changes
        GROUP BY strategy_name
        ORDER BY change_count DESC
        LIMIT 1
    )
    SELECT 
        COUNT(*)::bigint as total_changes,
        COALESCE(AVG(price_change), 0) as avg_price_change,
        COALESCE(MAX(price_change), 0) as max_price_change,
        COALESCE(MIN(price_change), 0) as min_price_change,
        COALESCE((SELECT strategy_name FROM strategy_activity), 'N/A'::varchar) as most_active_strategy
    FROM price_changes;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_strategy_history(strategy_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE(id uuid, strategy_id uuid, old_base_price numeric, new_base_price numeric, old_min_price numeric, new_min_price numeric, old_max_price numeric, new_max_price numeric, old_adjustment_factor numeric, new_adjustment_factor numeric, change_reason text, changed_by uuid, created_at timestamp with time zone, changer_name character varying)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ph.id,
        ph.strategy_id,
        ph.old_base_price,
        ph.new_base_price,
        ph.old_min_price,
        ph.new_min_price,
        ph.old_max_price,
        ph.new_max_price,
        ph.old_adjustment_factor,
        ph.new_adjustment_factor,
        ph.change_reason,
        ph.changed_by,
        ph.created_at,
        COALESCE(u.username, a.username, 'System') as changer_name
    FROM pricing_history ph
    LEFT JOIN users u ON ph.changed_by = u.id
    LEFT JOIN admins a ON ph.changed_by = a.id
    WHERE ph.strategy_id = strategy_id_param
    ORDER BY ph.created_at DESC
    LIMIT limit_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_pricing_strategy_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- 只有当价格相关字段发生变化时才记录
        IF (OLD.base_price IS DISTINCT FROM NEW.base_price OR
            OLD.min_price IS DISTINCT FROM NEW.min_price OR
            OLD.max_price IS DISTINCT FROM NEW.max_price OR
            OLD.price_adjustment_factor IS DISTINCT FROM NEW.price_adjustment_factor) THEN
            
            INSERT INTO pricing_history (
                strategy_id,
                old_base_price,
                new_base_price,
                old_min_price,
                new_min_price,
                old_max_price,
                new_max_price,
                old_adjustment_factor,
                new_adjustment_factor,
                change_reason,
                changed_by
            ) VALUES (
                NEW.id,
                OLD.base_price,
                NEW.base_price,
                OLD.min_price,
                NEW.min_price,
                OLD.max_price,
                NEW.max_price,
                OLD.price_adjustment_factor,
                NEW.price_adjustment_factor,
                COALESCE(NEW.change_reason, '价格策略更新'),
                NEW.updated_by
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_bot_activity(bot_id_param uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE telegram_bots 
    SET last_activity_at = NOW()
    WHERE id = bot_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_daily_consumption_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_history_user_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- 检查 changed_by 是否存在于 users 或 admins 表中
    IF NEW.changed_by IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.changed_by) AND
           NOT EXISTS (SELECT 1 FROM admins WHERE id = NEW.changed_by) THEN
            RAISE EXCEPTION 'changed_by 必须引用有效的用户或管理员 ID';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_user_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- 检查 updated_by 是否存在于 users 或 admins 表中
    IF NEW.updated_by IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.updated_by) AND
           NOT EXISTS (SELECT 1 FROM admins WHERE id = NEW.updated_by) THEN
            RAISE EXCEPTION 'updated_by 必须引用有效的用户或管理员 ID';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 创建表
CREATE TABLE public.admin_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    admin_id uuid NOT NULL,
    role_id uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    granted_by uuid,
    is_active boolean DEFAULT true NOT NULL
);

COMMENT ON TABLE public.admin_permissions IS '管理员权限分配表';
COMMENT ON COLUMN public.admin_permissions.id IS '权限分配ID';
COMMENT ON COLUMN public.admin_permissions.admin_id IS '管理员ID';
COMMENT ON COLUMN public.admin_permissions.role_id IS '角色ID';
COMMENT ON COLUMN public.admin_permissions.granted_at IS '授权时间';
COMMENT ON COLUMN public.admin_permissions.granted_by IS '授权人ID';
COMMENT ON COLUMN public.admin_permissions.is_active IS '是否激活';

CREATE TABLE public.admin_roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.admin_roles IS '管理员角色表';
COMMENT ON COLUMN public.admin_roles.id IS '角色ID';
COMMENT ON COLUMN public.admin_roles.name IS '角色名称';
COMMENT ON COLUMN public.admin_roles.description IS '角色描述';
COMMENT ON COLUMN public.admin_roles.permissions IS '权限配置JSON';
COMMENT ON COLUMN public.admin_roles.is_system IS '是否系统角色';
COMMENT ON COLUMN public.admin_roles.created_at IS '创建时间';
COMMENT ON COLUMN public.admin_roles.updated_at IS '更新时间';

CREATE TABLE public.admins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(100),
    phone character varying(20),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    last_login_at timestamp with time zone,
    login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    notes text
);

COMMENT ON TABLE public.admins IS '系统管理员表';
COMMENT ON COLUMN public.admins.id IS '管理员ID';
COMMENT ON COLUMN public.admins.username IS '用户名';
COMMENT ON COLUMN public.admins.email IS '邮箱地址';
COMMENT ON COLUMN public.admins.password_hash IS '密码哈希';
COMMENT ON COLUMN public.admins.full_name IS '真实姓名';
COMMENT ON COLUMN public.admins.phone IS '手机号码';
COMMENT ON COLUMN public.admins.status IS '账户状态: active, inactive, suspended';
COMMENT ON COLUMN public.admins.last_login_at IS '最后登录时间';
COMMENT ON COLUMN public.admins.login_attempts IS '登录尝试次数';
COMMENT ON COLUMN public.admins.locked_until IS '账户锁定到期时间';
COMMENT ON COLUMN public.admins.created_at IS '创建时间';
COMMENT ON COLUMN public.admins.updated_at IS '更新时间';
COMMENT ON COLUMN public.admins.created_by IS '创建人ID';
COMMENT ON COLUMN public.admins.notes IS '备注信息';

CREATE TABLE public.agent_applications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    application_reason text NOT NULL,
    expected_commission_rate numeric(5,4) DEFAULT 0.0500,
    contact_info jsonb DEFAULT '{}'::jsonb,
    business_plan text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.agent_applications IS '代理商申请表';
COMMENT ON COLUMN public.agent_applications.id IS '申请ID';
COMMENT ON COLUMN public.agent_applications.user_id IS '申请用户ID';
COMMENT ON COLUMN public.agent_applications.application_reason IS '申请理由';
COMMENT ON COLUMN public.agent_applications.expected_commission_rate IS '期望佣金比例';
COMMENT ON COLUMN public.agent_applications.contact_info IS '联系信息JSON';
COMMENT ON COLUMN public.agent_applications.business_plan IS '业务计划';
COMMENT ON COLUMN public.agent_applications.status IS '申请状态: pending, approved, rejected';
COMMENT ON COLUMN public.agent_applications.reviewed_by IS '审核人ID';
COMMENT ON COLUMN public.agent_applications.reviewed_at IS '审核时间';
COMMENT ON COLUMN public.agent_applications.review_notes IS '审核备注';
COMMENT ON COLUMN public.agent_applications.created_at IS '创建时间';
COMMENT ON COLUMN public.agent_applications.updated_at IS '更新时间';

CREATE TABLE public.agent_earnings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agent_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    commission_rate numeric(5,4) NOT NULL,
    order_amount numeric(15,6) NOT NULL,
    commission_amount numeric(15,6) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    settled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.agent_earnings IS '代理商收益记录表';
COMMENT ON COLUMN public.agent_earnings.id IS '收益记录ID';
COMMENT ON COLUMN public.agent_earnings.agent_id IS '代理商ID';
COMMENT ON COLUMN public.agent_earnings.user_id IS '用户ID';
COMMENT ON COLUMN public.agent_earnings.order_id IS '订单ID';
COMMENT ON COLUMN public.agent_earnings.commission_rate IS '佣金比例';
COMMENT ON COLUMN public.agent_earnings.order_amount IS '订单金额';
COMMENT ON COLUMN public.agent_earnings.commission_amount IS '佣金金额';
COMMENT ON COLUMN public.agent_earnings.status IS '状态: pending, settled, cancelled';
COMMENT ON COLUMN public.agent_earnings.settled_at IS '结算时间';
COMMENT ON COLUMN public.agent_earnings.created_at IS '创建时间';
COMMENT ON COLUMN public.agent_earnings.updated_at IS '更新时间';

CREATE TABLE public.agents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    agent_code character varying(20) NOT NULL,
    commission_rate numeric(5,4) DEFAULT 0.0500 NOT NULL,
    total_earnings numeric(15,6) DEFAULT 0 NOT NULL,
    total_referrals integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.agents IS '代理商信息表';
COMMENT ON COLUMN public.agents.id IS '代理商ID';
COMMENT ON COLUMN public.agents.user_id IS '关联用户ID';
COMMENT ON COLUMN public.agents.agent_code IS '代理商编码';
COMMENT ON COLUMN public.agents.commission_rate IS '佣金比例';
COMMENT ON COLUMN public.agents.total_earnings IS '总收益';
COMMENT ON COLUMN public.agents.total_referrals IS '总推荐人数';
COMMENT ON COLUMN public.agents.status IS '状态: active, inactive, suspended';
COMMENT ON COLUMN public.agents.approved_by IS '审批人ID';
COMMENT ON COLUMN public.agents.approved_at IS '审批时间';
COMMENT ON COLUMN public.agents.created_at IS '创建时间';
COMMENT ON COLUMN public.agents.updated_at IS '更新时间';

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    admin_id uuid,
    action character varying(100) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.audit_logs IS '系统审计日志表';
COMMENT ON COLUMN public.audit_logs.id IS '日志ID';
COMMENT ON COLUMN public.audit_logs.admin_id IS '操作管理员ID';
COMMENT ON COLUMN public.audit_logs.action IS '操作动作';
COMMENT ON COLUMN public.audit_logs.resource_type IS '资源类型';
COMMENT ON COLUMN public.audit_logs.resource_id IS '资源ID';
COMMENT ON COLUMN public.audit_logs.old_values IS '修改前的值';
COMMENT ON COLUMN public.audit_logs.new_values IS '修改后的值';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP地址';
COMMENT ON COLUMN public.audit_logs.user_agent IS '用户代理';
COMMENT ON COLUMN public.audit_logs.created_at IS '创建时间';

CREATE TABLE public.bot_users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    bot_id uuid NOT NULL,
    telegram_chat_id bigint NOT NULL,
    telegram_username character varying(100),
    first_name character varying(100),
    last_name character varying(100),
    language_code character varying(10) DEFAULT 'en'::character varying,
    is_bot boolean DEFAULT false,
    is_premium boolean DEFAULT false,
    last_interaction_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.bot_users IS '机器人用户关联表';
COMMENT ON COLUMN public.bot_users.id IS '关联ID';
COMMENT ON COLUMN public.bot_users.user_id IS '系统用户ID（可为空，表示未注册用户）';
COMMENT ON COLUMN public.bot_users.bot_id IS '机器人ID';
COMMENT ON COLUMN public.bot_users.telegram_chat_id IS 'Telegram聊天ID';
COMMENT ON COLUMN public.bot_users.telegram_username IS 'Telegram用户名';
COMMENT ON COLUMN public.bot_users.first_name IS '名字';
COMMENT ON COLUMN public.bot_users.last_name IS '姓氏';
COMMENT ON COLUMN public.bot_users.language_code IS '语言代码';
COMMENT ON COLUMN public.bot_users.is_bot IS '是否为机器人';
COMMENT ON COLUMN public.bot_users.is_premium IS '是否为Telegram Premium用户';
COMMENT ON COLUMN public.bot_users.last_interaction_at IS '最后交互时间';
COMMENT ON COLUMN public.bot_users.created_at IS '创建时间';
COMMENT ON COLUMN public.bot_users.updated_at IS '更新时间';

CREATE TABLE public.energy_consumption_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    pool_account_id uuid NOT NULL,
    transaction_type character varying(20) NOT NULL,
    energy_amount bigint NOT NULL,
    balance_before bigint NOT NULL,
    balance_after bigint NOT NULL,
    transaction_hash character varying(100),
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.energy_consumption_logs IS '能量消耗记录表';
COMMENT ON COLUMN public.energy_consumption_logs.id IS '记录ID';
COMMENT ON COLUMN public.energy_consumption_logs.pool_account_id IS '能量池账户ID';
COMMENT ON COLUMN public.energy_consumption_logs.transaction_type IS '交易类型: consume, refill, transfer';
COMMENT ON COLUMN public.energy_consumption_logs.energy_amount IS '能量数量';
COMMENT ON COLUMN public.energy_consumption_logs.balance_before IS '交易前余额';
COMMENT ON COLUMN public.energy_consumption_logs.balance_after IS '交易后余额';
COMMENT ON COLUMN public.energy_consumption_logs.transaction_hash IS '交易哈希';
COMMENT ON COLUMN public.energy_consumption_logs.description IS '描述';
COMMENT ON COLUMN public.energy_consumption_logs.created_at IS '创建时间';
COMMENT ON COLUMN public.energy_consumption_logs.updated_at IS '更新时间';

CREATE TABLE public.energy_packages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    energy_amount bigint NOT NULL,
    price_usdt numeric(10,6) NOT NULL,
    price_trx numeric(15,6),
    duration_hours integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.energy_packages IS '能量包配置表';
COMMENT ON COLUMN public.energy_packages.id IS '能量包ID';
COMMENT ON COLUMN public.energy_packages.name IS '能量包名称';
COMMENT ON COLUMN public.energy_packages.energy_amount IS '能量数量';
COMMENT ON COLUMN public.energy_packages.price_usdt IS 'USDT价格';
COMMENT ON COLUMN public.energy_packages.price_trx IS 'TRX价格';
COMMENT ON COLUMN public.energy_packages.duration_hours IS '有效期（小时）';
COMMENT ON COLUMN public.energy_packages.is_active IS '是否启用';
COMMENT ON COLUMN public.energy_packages.sort_order IS '排序';
COMMENT ON COLUMN public.energy_packages.description IS '描述';
COMMENT ON COLUMN public.energy_packages.created_at IS '创建时间';
COMMENT ON COLUMN public.energy_packages.updated_at IS '更新时间';

CREATE TABLE public.energy_pools (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    account_name character varying(100) NOT NULL,
    tron_address character varying(50) NOT NULL,
    private_key_encrypted text NOT NULL,
    account_type public.account_type DEFAULT 'energy_pool'::public.account_type NOT NULL,
    current_energy bigint DEFAULT 0 NOT NULL,
    max_energy bigint DEFAULT 0 NOT NULL,
    trx_balance numeric(15,6) DEFAULT 0 NOT NULL,
    usdt_balance numeric(15,6) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.energy_pools IS '能量池账户表';
COMMENT ON COLUMN public.energy_pools.id IS '账户ID';
COMMENT ON COLUMN public.energy_pools.account_name IS '账户名称';
COMMENT ON COLUMN public.energy_pools.tron_address IS 'TRON地址';
COMMENT ON COLUMN public.energy_pools.private_key_encrypted IS '加密的私钥';
COMMENT ON COLUMN public.energy_pools.account_type IS '账户类型';
COMMENT ON COLUMN public.energy_pools.current_energy IS '当前能量';
COMMENT ON COLUMN public.energy_pools.max_energy IS '最大能量';
COMMENT ON COLUMN public.energy_pools.trx_balance IS 'TRX余额';
COMMENT ON COLUMN public.energy_pools.usdt_balance IS 'USDT余额';
COMMENT ON COLUMN public.energy_pools.status IS '状态: active, inactive, maintenance';
COMMENT ON COLUMN public.energy_pools.priority IS '优先级（数字越大优先级越高）';
COMMENT ON COLUMN public.energy_pools.last_sync_at IS '最后同步时间';
COMMENT ON COLUMN public.energy_pools.created_at IS '创建时间';
COMMENT ON COLUMN public.energy_pools.updated_at IS '更新时间';

CREATE TABLE public.energy_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    pool_id uuid NOT NULL,
    energy_amount bigint NOT NULL,
    tx_hash character varying(100),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.energy_transactions IS '能量交易记录表';
COMMENT ON COLUMN public.energy_transactions.id IS '交易ID';
COMMENT ON COLUMN public.energy_transactions.order_id IS '订单ID';
COMMENT ON COLUMN public.energy_transactions.pool_id IS '能量池ID';
COMMENT ON COLUMN public.energy_transactions.energy_amount IS '能量数量';
COMMENT ON COLUMN public.energy_transactions.tx_hash IS '交易哈希';
COMMENT ON COLUMN public.energy_transactions.status IS '状态: pending, completed, failed';
COMMENT ON COLUMN public.energy_transactions.error_message IS '错误信息';
COMMENT ON COLUMN public.energy_transactions.created_at IS '创建时间';
COMMENT ON COLUMN public.energy_transactions.updated_at IS '更新时间';

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    package_id uuid NOT NULL,
    order_number character varying(50) NOT NULL,
    energy_amount bigint NOT NULL,
    price_usdt numeric(10,6) NOT NULL,
    price_trx numeric(15,6),
    payment_method character varying(20) NOT NULL,
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    target_address character varying(50) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    bot_id uuid
);

COMMENT ON TABLE public.orders IS '订单表';
COMMENT ON COLUMN public.orders.id IS '订单ID';
COMMENT ON COLUMN public.orders.user_id IS '用户ID';
COMMENT ON COLUMN public.orders.package_id IS '能量包ID';
COMMENT ON COLUMN public.orders.order_number IS '订单号';
COMMENT ON COLUMN public.orders.energy_amount IS '能量数量';
COMMENT ON COLUMN public.orders.price_usdt IS 'USDT价格';
COMMENT ON COLUMN public.orders.price_trx IS 'TRX价格';
COMMENT ON COLUMN public.orders.payment_method IS '支付方式: usdt, trx';
COMMENT ON COLUMN public.orders.payment_status IS '支付状态: pending, paid, failed, refunded';
COMMENT ON COLUMN public.orders.status IS '订单状态: pending, processing, completed, cancelled, failed';
COMMENT ON COLUMN public.orders.target_address IS '目标地址';
COMMENT ON COLUMN public.orders.expires_at IS '过期时间';
COMMENT ON COLUMN public.orders.completed_at IS '完成时间';
COMMENT ON COLUMN public.orders.created_at IS '创建时间';
COMMENT ON COLUMN public.orders.updated_at IS '更新时间';
COMMENT ON COLUMN public.orders.bot_id IS '机器人ID（如果通过机器人下单）';

CREATE TABLE public.pricing_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    strategy_id uuid NOT NULL,
    old_base_price numeric(10,6),
    new_base_price numeric(10,6),
    old_min_price numeric(10,6),
    new_min_price numeric(10,6),
    old_max_price numeric(10,6),
    new_max_price numeric(10,6),
    old_adjustment_factor numeric(5,4),
    new_adjustment_factor numeric(5,4),
    change_reason text,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.pricing_history IS '价格策略变更历史表';
COMMENT ON COLUMN public.pricing_history.id IS '历史记录ID';
COMMENT ON COLUMN public.pricing_history.strategy_id IS '价格策略ID';
COMMENT ON COLUMN public.pricing_history.old_base_price IS '原基础价格';
COMMENT ON COLUMN public.pricing_history.new_base_price IS '新基础价格';
COMMENT ON COLUMN public.pricing_history.old_min_price IS '原最低价格';
COMMENT ON COLUMN public.pricing_history.new_min_price IS '新最低价格';
COMMENT ON COLUMN public.pricing_history.old_max_price IS '原最高价格';
COMMENT ON COLUMN public.pricing_history.new_max_price IS '新最高价格';
COMMENT ON COLUMN public.pricing_history.old_adjustment_factor IS '原调整因子';
COMMENT ON COLUMN public.pricing_history.new_adjustment_factor IS '新调整因子';
COMMENT ON COLUMN public.pricing_history.change_reason IS '变更原因';
COMMENT ON COLUMN public.pricing_history.changed_by IS '变更人ID';
COMMENT ON COLUMN public.pricing_history.created_at IS '创建时间';

CREATE TABLE public.pricing_modes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    mode_type character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    config_schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.pricing_modes IS '价格模式配置表';
COMMENT ON COLUMN public.pricing_modes.id IS '模式ID';
COMMENT ON COLUMN public.pricing_modes.mode_type IS '模式类型: fixed, dynamic, tiered';
COMMENT ON COLUMN public.pricing_modes.name IS '模式名称';
COMMENT ON COLUMN public.pricing_modes.description IS '模式描述';
COMMENT ON COLUMN public.pricing_modes.config_schema IS '配置模式JSON';
COMMENT ON COLUMN public.pricing_modes.is_enabled IS '是否启用';
COMMENT ON COLUMN public.pricing_modes.created_at IS '创建时间';
COMMENT ON COLUMN public.pricing_modes.updated_at IS '更新时间';

CREATE TABLE public.pricing_strategies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    base_price numeric(10,6) NOT NULL,
    min_price numeric(10,6),
    max_price numeric(10,6),
    price_adjustment_factor numeric(5,4) DEFAULT 1.0000,
    config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    template_id uuid,
    created_by uuid,
    updated_by uuid,
    change_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.pricing_strategies IS '价格策略表';
COMMENT ON COLUMN public.pricing_strategies.id IS '策略ID';
COMMENT ON COLUMN public.pricing_strategies.name IS '策略名称';
COMMENT ON COLUMN public.pricing_strategies.type IS '策略类型: fixed, dynamic, tiered';
COMMENT ON COLUMN public.pricing_strategies.base_price IS '基础价格';
COMMENT ON COLUMN public.pricing_strategies.min_price IS '最低价格';
COMMENT ON COLUMN public.pricing_strategies.max_price IS '最高价格';
COMMENT ON COLUMN public.pricing_strategies.price_adjustment_factor IS '价格调整因子';
COMMENT ON COLUMN public.pricing_strategies.config IS '策略配置JSON';
COMMENT ON COLUMN public.pricing_strategies.is_active IS '是否激活';
COMMENT ON COLUMN public.pricing_strategies.template_id IS '模板ID';
COMMENT ON COLUMN public.pricing_strategies.created_by IS '创建人ID';
COMMENT ON COLUMN public.pricing_strategies.updated_by IS '更新人ID';
COMMENT ON COLUMN public.pricing_strategies.change_reason IS '变更原因';
COMMENT ON COLUMN public.pricing_strategies.created_at IS '创建时间';
COMMENT ON COLUMN public.pricing_strategies.updated_at IS '更新时间';

CREATE TABLE public.pricing_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    template_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.pricing_templates IS '价格模板表';
COMMENT ON COLUMN public.pricing_templates.id IS '模板ID';
COMMENT ON COLUMN public.pricing_templates.name IS '模板名称';
COMMENT ON COLUMN public.pricing_templates.type IS '模板类型';
COMMENT ON COLUMN public.pricing_templates.description IS '模板描述';
COMMENT ON COLUMN public.pricing_templates.template_config IS '模板配置JSON';
COMMENT ON COLUMN public.pricing_templates.is_system IS '是否系统模板';
COMMENT ON COLUMN public.pricing_templates.created_at IS '创建时间';
COMMENT ON COLUMN public.pricing_templates.updated_at IS '更新时间';

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.schema_migrations IS '数据库迁移记录表';
COMMENT ON COLUMN public.schema_migrations.id IS '迁移ID';
COMMENT ON COLUMN public.schema_migrations.filename IS '迁移文件名';
COMMENT ON COLUMN public.schema_migrations.executed_at IS '执行时间';

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;

CREATE TABLE public.system_config_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    config_id uuid NOT NULL,
    old_value text,
    new_value text NOT NULL,
    changed_by uuid,
    change_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.system_config_history IS '系统配置变更历史表';
COMMENT ON COLUMN public.system_config_history.id IS '历史记录ID';
COMMENT ON COLUMN public.system_config_history.config_id IS '配置项ID';
COMMENT ON COLUMN public.system_config_history.old_value IS '原值';
COMMENT ON COLUMN public.system_config_history.new_value IS '新值';
COMMENT ON COLUMN public.system_config_history.changed_by IS '变更人ID';
COMMENT ON COLUMN public.system_config_history.change_reason IS '变更原因';
COMMENT ON COLUMN public.system_config_history.created_at IS '创建时间';

CREATE TABLE public.system_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text NOT NULL,
    description text,
    category character varying(50) DEFAULT 'general'::character varying,
    data_type character varying(20) DEFAULT 'string'::character varying NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    validation_rules jsonb DEFAULT '{}'::jsonb,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.system_configs IS '系统配置表';
COMMENT ON COLUMN public.system_configs.id IS '配置ID';
COMMENT ON COLUMN public.system_configs.config_key IS '配置键';
COMMENT ON COLUMN public.system_configs.config_value IS '配置值';
COMMENT ON COLUMN public.system_configs.description IS '配置描述';
COMMENT ON COLUMN public.system_configs.category IS '配置分类';
COMMENT ON COLUMN public.system_configs.data_type IS '数据类型: string, number, boolean, json';
COMMENT ON COLUMN public.system_configs.is_public IS '是否公开（前端可访问）';
COMMENT ON COLUMN public.system_configs.validation_rules IS '验证规则JSON';
COMMENT ON COLUMN public.system_configs.updated_by IS '更新人ID';
COMMENT ON COLUMN public.system_configs.created_at IS '创建时间';
COMMENT ON COLUMN public.system_configs.updated_at IS '更新时间';

CREATE TABLE public.telegram_bots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    bot_name character varying(100) NOT NULL,
    bot_token character varying(200) NOT NULL,
    bot_username character varying(100) NOT NULL,
    webhook_url text,
    is_active boolean DEFAULT true NOT NULL,
    last_activity_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL
);

COMMENT ON TABLE public.telegram_bots IS 'Telegram机器人配置表';
COMMENT ON COLUMN public.telegram_bots.id IS '机器人ID';
COMMENT ON COLUMN public.telegram_bots.bot_name IS '机器人名称';
COMMENT ON COLUMN public.telegram_bots.bot_token IS '机器人Token';
COMMENT ON COLUMN public.telegram_bots.bot_username IS '机器人用户名';
COMMENT ON COLUMN public.telegram_bots.webhook_url IS 'Webhook URL';
COMMENT ON COLUMN public.telegram_bots.is_active IS '是否激活';
COMMENT ON COLUMN public.telegram_bots.last_activity_at IS '最后活动时间';
COMMENT ON COLUMN public.telegram_bots.created_at IS '创建时间';
COMMENT ON COLUMN public.telegram_bots.updated_at IS '更新时间';
COMMENT ON COLUMN public.telegram_bots.created_by IS '创建人ID';

CREATE TABLE public.user_level_changes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    old_level character varying(20),
    new_level character varying(20) NOT NULL,
    change_type character varying(50) NOT NULL,
    change_reason text,
    effective_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.user_level_changes IS '用户等级变更记录表';
COMMENT ON COLUMN public.user_level_changes.id IS '变更记录ID';
COMMENT ON COLUMN public.user_level_changes.user_id IS '用户ID';
COMMENT ON COLUMN public.user_level_changes.old_level IS '原等级';
COMMENT ON COLUMN public.user_level_changes.new_level IS '新等级';
COMMENT ON COLUMN public.user_level_changes.change_type IS '变更类型: upgrade, downgrade, manual';
COMMENT ON COLUMN public.user_level_changes.change_reason IS '变更原因';
COMMENT ON COLUMN public.user_level_changes.effective_date IS '生效日期';
COMMENT ON COLUMN public.user_level_changes.changed_by IS '变更人ID';
COMMENT ON COLUMN public.user_level_changes.created_at IS '创建时间';
COMMENT ON COLUMN public.user_level_changes.updated_at IS '更新时间';

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    telegram_id bigint,
    username character varying(100),
    email character varying(100),
    phone character varying(20),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tron_address character varying(50),
    balance numeric(15,6) DEFAULT 0 NOT NULL,
    total_orders integer DEFAULT 0 NOT NULL,
    total_energy_used bigint DEFAULT 0 NOT NULL,
    referral_code character varying(20),
    referred_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    password_hash character varying(255),
    login_type character varying(20) DEFAULT 'telegram'::character varying,
    last_login_at timestamp with time zone,
    password_reset_token character varying(255),
    password_reset_expires timestamp with time zone,
    usdt_balance numeric(15,6) DEFAULT 0.000000,
    trx_balance numeric(15,6) DEFAULT 0.000000,
    agent_id uuid,
    user_type character varying(20) DEFAULT 'regular'::character varying
);

COMMENT ON TABLE public.users IS '用户表';
COMMENT ON COLUMN public.users.id IS '用户ID';
COMMENT ON COLUMN public.users.telegram_id IS 'Telegram用户ID';
COMMENT ON COLUMN public.users.username IS '用户名';
COMMENT ON COLUMN public.users.email IS '邮箱';
COMMENT ON COLUMN public.users.phone IS '手机号';
COMMENT ON COLUMN public.users.status IS '状态: active, inactive, banned';
COMMENT ON COLUMN public.users.tron_address IS 'TRON地址';
COMMENT ON COLUMN public.users.balance IS '余额';
COMMENT ON COLUMN public.users.total_orders IS '总订单数';
COMMENT ON COLUMN public.users.total_energy_used IS '总使用能量';
COMMENT ON COLUMN public.users.referral_code IS '推荐码';
COMMENT ON COLUMN public.users.referred_by IS '推荐人ID';
COMMENT ON COLUMN public.users.created_at IS '创建时间';
COMMENT ON COLUMN public.users.updated_at IS '更新时间';
COMMENT ON COLUMN public.users.password_hash IS '密码哈希';
COMMENT ON COLUMN public.users.login_type IS '登录类型: telegram, email, phone';
COMMENT ON COLUMN public.users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN public.users.password_reset_token IS '密码重置令牌';
COMMENT ON COLUMN public.users.password_reset_expires IS '密码重置过期时间';
COMMENT ON COLUMN public.users.usdt_balance IS 'USDT余额';
COMMENT ON COLUMN public.users.trx_balance IS 'TRX余额';
COMMENT ON COLUMN public.users.agent_id IS '关联代理商ID';
COMMENT ON COLUMN public.users.user_type IS '用户类型: regular, vip, agent';

-- 创建视图
CREATE VIEW public.daily_energy_consumption AS
 SELECT date_trunc('day'::text, energy_consumption_logs.created_at) AS consumption_date,
    energy_consumption_logs.pool_account_id,
    sum(energy_consumption_logs.energy_amount) AS total_consumed,
    count(*) AS transaction_count
   FROM public.energy_consumption_logs
  WHERE (energy_consumption_logs.transaction_type = 'consume'::text)
  GROUP BY (date_trunc('day'::text, energy_consumption_logs.created_at)), energy_consumption_logs.pool_account_id
  ORDER BY (date_trunc('day'::text, energy_consumption_logs.created_at)) DESC;

COMMENT ON VIEW public.daily_energy_consumption IS '每日能量消耗统计视图';

-- 设置序列默认值
ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);

-- 添加主键约束
ALTER TABLE ONLY public.admin_permissions ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admin_roles ADD CONSTRAINT admin_roles_name_key UNIQUE (name);
ALTER TABLE ONLY public.admin_roles ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admins ADD CONSTRAINT admins_email_key UNIQUE (email);
ALTER TABLE ONLY public.admins ADD CONSTRAINT admins_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admins ADD CONSTRAINT admins_username_key UNIQUE (username);
ALTER TABLE ONLY public.agent_applications ADD CONSTRAINT agent_applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agent_earnings ADD CONSTRAINT agent_earnings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agents ADD CONSTRAINT agents_agent_code_key UNIQUE (agent_code);
ALTER TABLE ONLY public.agents ADD CONSTRAINT agents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agents ADD CONSTRAINT agents_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.bot_users ADD CONSTRAINT bot_users_bot_id_telegram_chat_id_key UNIQUE (bot_id, telegram_chat_id);
ALTER TABLE ONLY public.bot_users ADD CONSTRAINT bot_users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.energy_consumption_logs ADD CONSTRAINT energy_consumption_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.energy_packages ADD CONSTRAINT energy_packages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.energy_pools ADD CONSTRAINT energy_pools_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.energy_pools ADD CONSTRAINT energy_pools_tron_address_key UNIQUE (tron_address);
ALTER TABLE ONLY public.energy_transactions ADD CONSTRAINT energy_transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pricing_history ADD CONSTRAINT pricing_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pricing_modes ADD CONSTRAINT pricing_modes_mode_type_key UNIQUE (mode_type);
ALTER TABLE ONLY public.pricing_modes ADD CONSTRAINT pricing_modes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pricing_strategies ADD CONSTRAINT pricing_strategies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pricing_templates ADD CONSTRAINT pricing_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.schema_migrations ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);
ALTER TABLE ONLY public.schema_migrations ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_config_history ADD CONSTRAINT system_config_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_configs ADD CONSTRAINT system_configs_config_key_key UNIQUE (config_key);
ALTER TABLE ONLY public.system_configs ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.telegram_bots ADD CONSTRAINT telegram_bots_bot_token_key UNIQUE (bot_token);
ALTER TABLE ONLY public.telegram_bots ADD CONSTRAINT telegram_bots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_level_changes ADD CONSTRAINT user_level_changes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);

-- 创建索引
CREATE INDEX idx_admin_permissions_admin_id ON public.admin_permissions USING btree (admin_id);
CREATE INDEX idx_admin_permissions_role_id ON public.admin_permissions USING btree (role_id);
CREATE INDEX idx_admin_roles_name ON public.admin_roles USING btree (name);
CREATE INDEX idx_admins_email ON public.admins USING btree (email);
CREATE INDEX idx_admins_status ON public.admins USING btree (status);
CREATE INDEX idx_admins_username ON public.admins USING btree (username);
CREATE INDEX idx_agent_earnings_agent_id ON public.agent_earnings USING btree (agent_id);
CREATE INDEX idx_agent_earnings_order_id ON public.agent_earnings USING btree (order_id);
CREATE INDEX idx_agent_earnings_status ON public.agent_earnings USING btree (status);
CREATE INDEX idx_agents_agent_code ON public.agents USING btree (agent_code);
CREATE INDEX idx_agents_status ON public.agents USING btree (status);
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs USING btree (admin_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs USING btree (resource_type);
CREATE INDEX idx_bot_users_bot_id ON public.bot_users USING btree (bot_id);
CREATE INDEX idx_bot_users_telegram_chat_id ON public.bot_users USING btree (telegram_chat_id);
CREATE INDEX idx_bot_users_user_id ON public.bot_users USING btree (user_id);
CREATE INDEX idx_energy_consumption_logs_created_at ON public.energy_consumption_logs USING btree (created_at);
CREATE INDEX idx_energy_consumption_logs_pool_account_id ON public.energy_consumption_logs USING btree (pool_account_id);
CREATE INDEX idx_energy_consumption_logs_transaction_type ON public.energy_consumption_logs USING btree (transaction_type);
CREATE INDEX idx_energy_packages_is_active ON public.energy_packages USING btree (is_active);
CREATE INDEX idx_energy_pools_status ON public.energy_pools USING btree (status);
CREATE INDEX idx_energy_pools_tron_address ON public.energy_pools USING btree (tron_address);
CREATE INDEX idx_energy_transactions_order_id ON public.energy_transactions USING btree (order_id);
CREATE INDEX idx_energy_transactions_pool_id ON public.energy_transactions USING btree (pool_id);
CREATE INDEX idx_energy_transactions_status ON public.energy_transactions USING btree (status);
CREATE INDEX idx_orders_bot_id ON public.orders USING btree (bot_id);
CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);
CREATE INDEX idx_orders_package_id ON public.orders USING btree (package_id);
CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);
CREATE INDEX idx_orders_status ON public.orders USING btree (status);
CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);
CREATE INDEX idx_pricing_history_created_at ON public.pricing_history USING btree (created_at);
CREATE INDEX idx_pricing_history_strategy_id ON public.pricing_history USING btree (strategy_id);
CREATE INDEX idx_pricing_strategies_is_active ON public.pricing_strategies USING btree (is_active);
CREATE INDEX idx_pricing_strategies_type ON public.pricing_strategies USING btree (type);
CREATE INDEX idx_system_config_history_config_id ON public.system_config_history USING btree (config_id);
CREATE INDEX idx_system_config_history_created_at ON public.system_config_history USING btree (created_at);
CREATE INDEX idx_system_configs_category ON public.system_configs USING btree (category);
CREATE INDEX idx_system_configs_config_key ON public.system_configs USING btree (config_key);
CREATE INDEX idx_telegram_bots_bot_token ON public.telegram_bots USING btree (bot_token);
CREATE INDEX idx_telegram_bots_is_active ON public.telegram_bots USING btree (is_active);
CREATE INDEX idx_user_level_changes_created_at ON public.user_level_changes USING btree (created_at);
CREATE INDEX idx_user_level_changes_user_id ON public.user_level_changes USING btree (user_id);
CREATE INDEX idx_users_agent_id ON public.users USING btree (agent_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_referral_code ON public.users USING btree (referral_code);
CREATE INDEX idx_users_referred_by ON public.users USING btree (referred_by);
CREATE INDEX idx_users_status ON public.users USING btree (status);
CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);
CREATE INDEX idx_users_user_type ON public.users USING btree (user_type);

-- 创建触发器
CREATE TRIGGER pricing_strategies_history_trigger AFTER UPDATE ON public.pricing_strategies FOR EACH ROW EXECUTE FUNCTION public.log_pricing_strategy_changes();
CREATE TRIGGER pricing_strategies_validate_user_trigger BEFORE INSERT OR UPDATE ON public.pricing_strategies FOR EACH ROW EXECUTE FUNCTION public.validate_user_reference();
CREATE TRIGGER pricing_history_validate_user_trigger BEFORE INSERT OR UPDATE ON public.pricing_history FOR EACH ROW EXECUTE FUNCTION public.validate_history_user_reference();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON public.admin_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_applications_updated_at BEFORE UPDATE ON public.agent_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_earnings_updated_at BEFORE UPDATE ON public.agent_earnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bot_users_updated_at BEFORE UPDATE ON public.bot_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_energy_consumption_logs_updated_at BEFORE UPDATE ON public.energy_consumption_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_energy_packages_updated_at BEFORE UPDATE ON public.energy_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_energy_pools_updated_at BEFORE UPDATE ON public.energy_pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_energy_transactions_updated_at BEFORE UPDATE ON public.energy_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pricing_modes_updated_at BEFORE UPDATE ON public.pricing_modes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pricing_strategies_updated_at BEFORE UPDATE ON public.pricing_strategies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pricing_templates_updated_at BEFORE UPDATE ON public.pricing_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON public.system_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_telegram_bots_updated_at BEFORE UPDATE ON public.telegram_bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_level_changes_updated_at BEFORE UPDATE ON public.user_level_changes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 添加外键约束
ALTER TABLE ONLY public.admin_permissions ADD CONSTRAINT admin_permissions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.admin_permissions ADD CONSTRAINT admin_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.admin_roles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.agent_applications ADD CONSTRAINT agent_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.admins(id);
ALTER TABLE ONLY public.agent_applications ADD CONSTRAINT agent_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.agent_earnings ADD CONSTRAINT agent_earnings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.agent_earnings ADD CONSTRAINT agent_earnings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.agent_earnings ADD CONSTRAINT agent_earnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.agents ADD CONSTRAINT agents_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.admins(id);
ALTER TABLE ONLY public.agents ADD CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id);
ALTER TABLE ONLY public.bot_users ADD CONSTRAINT bot_users_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.telegram_bots(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.bot_users ADD CONSTRAINT bot_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.energy_consumption_logs ADD CONSTRAINT energy_consumption_logs_pool_account_id_fkey FOREIGN KEY (pool_account_id) REFERENCES public.energy_pools(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.energy_transactions ADD CONSTRAINT energy_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.energy_transactions ADD CONSTRAINT energy_transactions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.energy_pools(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.telegram_bots(id);
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.energy_packages(id);
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pricing_history ADD CONSTRAINT pricing_history_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.pricing_strategies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pricing_strategies ADD CONSTRAINT pricing_strategies_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.pricing_templates(id);
ALTER TABLE ONLY public.system_config_history ADD CONSTRAINT system_config_history_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.system_configs(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.telegram_bots ADD CONSTRAINT telegram_bots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id);
ALTER TABLE ONLY public.user_level_changes ADD CONSTRAINT user_level_changes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.users ADD CONSTRAINT users_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id);

-- 迁移完成
-- 此文件包含了当前数据库的完整结构
-- 可以安全地替代过时的迁移文件