--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'own_energy',
    'agent_energy',
    'third_party'
);


--
-- Name: get_active_bots(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_bots() RETURNS TABLE(bot_id uuid, bot_name character varying, bot_username character varying, description text, last_activity_at timestamp with time zone)
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


--
-- Name: FUNCTION get_active_bots(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_active_bots() IS '获取所有激活的Telegram机器人列表';


--
-- Name: get_bot_active_pricing_config(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_bot_active_pricing_config(p_bot_id uuid, p_mode_type character varying) RETURNS TABLE(config_id uuid, strategy_id uuid, strategy_name character varying, strategy_config jsonb, priority integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bpc.id,
        bpc.strategy_id,
        ps.name,
        ps.config,
        bpc.priority
    FROM bot_pricing_configs bpc
    JOIN pricing_strategies ps ON bpc.strategy_id = ps.id
    WHERE bpc.bot_id = p_bot_id
        AND bpc.mode_type = p_mode_type
        AND bpc.is_active = true
        AND ps.is_active = true
        AND bpc.effective_from <= NOW()
        AND (bpc.effective_until IS NULL OR bpc.effective_until > NOW())
    ORDER BY bpc.priority DESC, bpc.created_at DESC
    LIMIT 1;
END;
$$;


--
-- Name: FUNCTION get_bot_active_pricing_config(p_bot_id uuid, p_mode_type character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_bot_active_pricing_config(p_bot_id uuid, p_mode_type character varying) IS '获取指定机器人和模式类型的当前有效定价配置';


--
-- Name: get_bot_by_token(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_bot_by_token(p_bot_token character varying) RETURNS TABLE(bot_id uuid, bot_name character varying, bot_username character varying, config jsonb, is_active boolean)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION get_bot_by_token(p_bot_token character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_bot_by_token(p_bot_token character varying) IS '根据Bot Token获取机器人信息（安全函数）';


--
-- Name: get_pricing_change_stats(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pricing_change_stats(p_days integer DEFAULT 30) RETURNS TABLE(action_type character varying, change_count bigint, latest_change timestamp with time zone)
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


--
-- Name: FUNCTION get_pricing_change_stats(p_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_pricing_change_stats(p_days integer) IS '获取指定天数内的价格变更统计信息';


--
-- Name: get_strategy_history(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_strategy_history(p_strategy_id uuid, p_limit integer DEFAULT 50) RETURNS TABLE(history_id uuid, action_type character varying, change_reason text, changed_fields text[], created_by uuid, created_at timestamp with time zone)
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


--
-- Name: FUNCTION get_strategy_history(p_strategy_id uuid, p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_strategy_history(p_strategy_id uuid, p_limit integer) IS '获取指定策略的变更历史记录';


--
-- Name: log_pricing_strategy_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_pricing_strategy_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.config IS DISTINCT FROM NEW.config THEN
        INSERT INTO pricing_history (strategy_id, old_config, new_config, changed_by)
        VALUES (NEW.id, OLD.config, NEW.config, NEW.created_by);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION log_pricing_strategy_changes(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_pricing_strategy_changes() IS '自动记录价格策略变更的触发器函数';


--
-- Name: update_bot_activity(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_bot_activity(p_bot_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE telegram_bots 
    SET last_activity_at = NOW()
    WHERE id = p_bot_id AND is_active = true;
END;
$$;


--
-- Name: FUNCTION update_bot_activity(p_bot_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_bot_activity(p_bot_id uuid) IS '更新指定机器人的最后活动时间';


--
-- Name: update_daily_consumption_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_daily_consumption_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: validate_history_user_reference(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_history_user_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- 检查 changed_by 是否存在于 telegram_users 或 admins 表中
  IF NEW.changed_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM telegram_users WHERE id = NEW.changed_by
      UNION
      SELECT 1 FROM admins WHERE id = NEW.changed_by
    ) THEN
      RAISE EXCEPTION 'changed_by 必须引用有效的用户ID (telegram_users 或 admins)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION validate_history_user_reference(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_history_user_reference() IS '验证 system_config_history 表的用户引用，支持 telegram_users 和 admins 表';


--
-- Name: validate_user_reference(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_user_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- 检查 updated_by 是否存在于 telegram_users 或 admins 表中
  IF NEW.updated_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM telegram_users WHERE id = NEW.updated_by
      UNION
      SELECT 1 FROM admins WHERE id = NEW.updated_by
    ) THEN
      RAISE EXCEPTION 'updated_by 必须引用有效的用户ID (telegram_users 或 admins)';
    END IF;
  END IF;
  
  -- 检查 created_by 是否存在于 telegram_users 或 admins 表中
  IF NEW.created_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM telegram_users WHERE id = NEW.created_by
      UNION
      SELECT 1 FROM admins WHERE id = NEW.created_by
    ) THEN
      RAISE EXCEPTION 'created_by 必须引用有效的用户ID (telegram_users 或 admins)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION validate_user_reference(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_user_reference() IS '验证 system_configs 表的用户引用，支持 telegram_users 和 admins 表';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    role_id uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE admin_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_permissions IS '管理员权限分配表：记录管理员与角色的关联关系';


--
-- Name: COLUMN admin_permissions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_permissions.id IS '权限分配唯一标识符（UUID）';


--
-- Name: COLUMN admin_permissions.admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_permissions.admin_id IS '管理员ID';


--
-- Name: COLUMN admin_permissions.role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_permissions.role_id IS '角色ID';


--
-- Name: COLUMN admin_permissions.granted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_permissions.granted_at IS '权限授予时间';


--
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE admin_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_roles IS '管理员角色定义表：定义不同级别的管理员权限';


--
-- Name: COLUMN admin_roles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.id IS '角色唯一标识符（UUID）';


--
-- Name: COLUMN admin_roles.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.name IS '角色名称：super_admin=超级管理员，admin=普通管理员，operator=运营管理员，customer_service=客服管理员';


--
-- Name: COLUMN admin_roles.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.description IS '角色功能描述';


--
-- Name: COLUMN admin_roles.permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.permissions IS '角色权限列表（JSON格式）';


--
-- Name: COLUMN admin_roles.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.created_at IS '角色创建时间';


--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'admin'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT admins_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


--
-- Name: TABLE admins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admins IS '管理员账户表：管理系统管理员账户和认证信息';


--
-- Name: COLUMN admins.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.id IS '管理员唯一标识符（UUID）';


--
-- Name: COLUMN admins.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.username IS '管理员登录用户名';


--
-- Name: COLUMN admins.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.email IS '管理员联系邮箱地址';


--
-- Name: COLUMN admins.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.password_hash IS '管理员密码哈希值（加密存储）';


--
-- Name: COLUMN admins.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.role IS '管理员角色类型';


--
-- Name: COLUMN admins.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.status IS '账户状态：active=活跃，inactive=非活跃';


--
-- Name: COLUMN admins.last_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.last_login IS '最后登录时间';


--
-- Name: COLUMN admins.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.created_at IS '管理员账户创建时间';


--
-- Name: COLUMN admins.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.updated_at IS '管理员信息最后更新时间';


--
-- Name: agent_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_applications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    application_reason text,
    contact_info jsonb,
    experience_description text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agent_applications_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: TABLE agent_applications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_applications IS '代理申请表 - 记录用户申请成为代理的详细信息';


--
-- Name: COLUMN agent_applications.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.id IS '申请记录唯一标识符（UUID）';


--
-- Name: COLUMN agent_applications.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.user_id IS '申请用户ID';


--
-- Name: COLUMN agent_applications.application_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.application_reason IS '申请成为代理的原因';


--
-- Name: COLUMN agent_applications.contact_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.contact_info IS '联系信息（JSON格式）';


--
-- Name: COLUMN agent_applications.experience_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.experience_description IS '相关经验描述';


--
-- Name: COLUMN agent_applications.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.status IS '申请状态：pending=待审核，approved=已通过，rejected=已拒绝';


--
-- Name: COLUMN agent_applications.reviewed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.reviewed_by IS '审核人用户ID';


--
-- Name: COLUMN agent_applications.reviewed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.reviewed_at IS '审核时间';


--
-- Name: COLUMN agent_applications.review_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.review_notes IS '审核备注';


--
-- Name: COLUMN agent_applications.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.created_at IS '申请创建时间';


--
-- Name: COLUMN agent_applications.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.updated_at IS '申请最后更新时间';


--
-- Name: agent_earnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_earnings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    agent_id uuid NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    commission_rate numeric(5,4) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    order_amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agent_earnings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE agent_earnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_earnings IS '代理收益记录表 - 记录代理从订单中获得的佣金明细';


--
-- Name: COLUMN agent_earnings.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.id IS '收益记录唯一标识符（UUID）';


--
-- Name: COLUMN agent_earnings.agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.agent_id IS '代理用户ID';


--
-- Name: COLUMN agent_earnings.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.order_id IS '关联订单ID';


--
-- Name: COLUMN agent_earnings.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.user_id IS '下单用户ID';


--
-- Name: COLUMN agent_earnings.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.commission_rate IS '佣金比例（0-1之间的小数）';


--
-- Name: COLUMN agent_earnings.commission_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.commission_amount IS '佣金金额（TRX）';


--
-- Name: COLUMN agent_earnings.order_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.order_amount IS '订单金额（TRX）';


--
-- Name: COLUMN agent_earnings.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.status IS '收益状态：pending=待结算，paid=已结算，cancelled=已取消';


--
-- Name: COLUMN agent_earnings.paid_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.paid_at IS '结算时间';


--
-- Name: COLUMN agent_earnings.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.created_at IS '收益记录创建时间';


--
-- Name: COLUMN agent_earnings.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.updated_at IS '收益记录最后更新时间';


--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    agent_code character varying(50) NOT NULL,
    commission_rate numeric(5,4) DEFAULT 0.1 NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_earnings numeric(20,6) DEFAULT 0,
    total_orders integer DEFAULT 0,
    total_customers integer DEFAULT 0,
    approved_at timestamp with time zone,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agents_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'inactive'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: TABLE agents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agents IS '代理商信息表：管理系统代理商的基本信息和佣金配置';


--
-- Name: COLUMN agents.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.id IS '代理商唯一标识符（UUID）';


--
-- Name: COLUMN agents.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.user_id IS '关联的用户ID，引用telegram_users表';


--
-- Name: COLUMN agents.agent_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.agent_code IS '代理商代码，用于标识代理身份';


--
-- Name: COLUMN agents.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.commission_rate IS '代理商佣金比例（0-1之间的小数）';


--
-- Name: COLUMN agents.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.status IS '代理商状态：pending=待审核，active=活跃，inactive=非活跃，suspended=已暂停';


--
-- Name: COLUMN agents.total_earnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_earnings IS '代理商累计收益（TRX）';


--
-- Name: COLUMN agents.total_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_orders IS '代理商累计订单数量';


--
-- Name: COLUMN agents.total_customers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_customers IS '代理商累计客户数量';


--
-- Name: COLUMN agents.approved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.approved_at IS '代理商审核通过时间';


--
-- Name: COLUMN agents.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.approved_by IS '审核人用户ID';


--
-- Name: COLUMN agents.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.created_at IS '代理商记录创建时间';


--
-- Name: COLUMN agents.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.updated_at IS '代理商信息最后更新时间';


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    action character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    details jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_logs IS '系统审计日志表：记录所有管理操作的详细日志';


--
-- Name: COLUMN audit_logs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.id IS '日志记录唯一标识符（UUID）';


--
-- Name: COLUMN audit_logs.admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.admin_id IS '执行操作的管理员ID';


--
-- Name: COLUMN audit_logs.action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.action IS '执行的操作类型：如CREATE、UPDATE、DELETE等';


--
-- Name: COLUMN audit_logs.resource; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.resource IS '操作的目标资源：如users、orders、configs等';


--
-- Name: COLUMN audit_logs.details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.details IS '操作详细信息（JSON格式）';


--
-- Name: COLUMN audit_logs.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.ip_address IS '操作者IP地址';


--
-- Name: COLUMN audit_logs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.created_at IS '日志记录创建时间';


--
-- Name: bot_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    bot_id uuid NOT NULL,
    user_id uuid NOT NULL,
    telegram_chat_id bigint NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    last_interaction_at timestamp with time zone,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bot_users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'blocked'::character varying, 'inactive'::character varying])::text[])))
);


--
-- Name: TABLE bot_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bot_users IS '机器人用户关联表 - 管理用户与机器人的交互关系和个性化设置';


--
-- Name: COLUMN bot_users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.id IS '关联记录唯一标识符（UUID）';


--
-- Name: COLUMN bot_users.bot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.bot_id IS '机器人ID';


--
-- Name: COLUMN bot_users.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.user_id IS '用户ID';


--
-- Name: COLUMN bot_users.telegram_chat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.telegram_chat_id IS 'Telegram聊天ID';


--
-- Name: COLUMN bot_users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.status IS '用户状态：active=活跃，blocked=已屏蔽，inactive=非活跃';


--
-- Name: COLUMN bot_users.last_interaction_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.last_interaction_at IS '最后交互时间';


--
-- Name: COLUMN bot_users.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.settings IS '用户个性化设置（JSON格式）';


--
-- Name: COLUMN bot_users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.created_at IS '关联记录创建时间';


--
-- Name: COLUMN bot_users.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.updated_at IS '关联记录最后更新时间';


--
-- Name: energy_consumption_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.energy_consumption_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pool_account_id uuid NOT NULL,
    energy_amount bigint NOT NULL,
    cost_amount numeric(10,6) NOT NULL,
    transaction_type character varying(50) NOT NULL,
    order_id uuid,
    telegram_user_id bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE energy_consumption_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_consumption_logs IS '能量消耗记录表：追踪能量池的能量使用情况和成本统计';


--
-- Name: COLUMN energy_consumption_logs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.id IS '消耗记录唯一标识符（UUID）';


--
-- Name: COLUMN energy_consumption_logs.pool_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.pool_account_id IS '关联的能量池账户ID';


--
-- Name: COLUMN energy_consumption_logs.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.energy_amount IS '消耗的能量数量';


--
-- Name: COLUMN energy_consumption_logs.cost_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.cost_amount IS '消耗能量的成本金额（TRX）';


--
-- Name: COLUMN energy_consumption_logs.transaction_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.transaction_type IS '交易类型：reserve=预留，confirm=确认，release=释放';


--
-- Name: COLUMN energy_consumption_logs.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.order_id IS '关联的订单ID（如果有）';


--
-- Name: COLUMN energy_consumption_logs.telegram_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.telegram_user_id IS 'Telegram用户ID';


--
-- Name: COLUMN energy_consumption_logs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.created_at IS '消耗记录创建时间';


--
-- Name: COLUMN energy_consumption_logs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.updated_at IS '消耗记录最后更新时间';


--
-- Name: energy_pools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.energy_pools (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    tron_address character varying(255) NOT NULL,
    private_key_encrypted text NOT NULL,
    total_energy bigint DEFAULT 0 NOT NULL,
    available_energy bigint DEFAULT 0 NOT NULL,
    reserved_energy bigint DEFAULT 0 NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    last_updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    account_type public.account_type DEFAULT 'own_energy'::public.account_type,
    priority integer DEFAULT 1,
    cost_per_energy numeric(10,6) DEFAULT 0.001,
    description text,
    contact_info jsonb,
    daily_limit bigint,
    monthly_limit bigint,
    CONSTRAINT chk_cost_per_energy_positive CHECK ((cost_per_energy >= (0)::numeric)),
    CONSTRAINT chk_daily_limit_positive CHECK (((daily_limit IS NULL) OR (daily_limit > 0))),
    CONSTRAINT chk_monthly_limit_positive CHECK (((monthly_limit IS NULL) OR (monthly_limit > 0))),
    CONSTRAINT chk_priority_positive CHECK ((priority > 0)),
    CONSTRAINT energy_pools_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'maintenance'::character varying])::text[])))
);


--
-- Name: TABLE energy_pools; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_pools IS '能量池账户表';


--
-- Name: COLUMN energy_pools.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.id IS '能量池唯一标识符（UUID）';


--
-- Name: COLUMN energy_pools.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.name IS '能量池名称';


--
-- Name: COLUMN energy_pools.tron_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.tron_address IS '能量池TRON地址';


--
-- Name: COLUMN energy_pools.private_key_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.private_key_encrypted IS '加密的私钥（用于能量委托）';


--
-- Name: COLUMN energy_pools.total_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.total_energy IS '总能量数量';


--
-- Name: COLUMN energy_pools.available_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.available_energy IS '可用能量数量';


--
-- Name: COLUMN energy_pools.reserved_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.reserved_energy IS '预留能量数量';


--
-- Name: COLUMN energy_pools.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.status IS '能量池状态：active=已启用，inactive=已停用，maintenance=维护中';


--
-- Name: COLUMN energy_pools.last_updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.last_updated_at IS '最后更新时间';


--
-- Name: COLUMN energy_pools.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.created_at IS '创建时间';


--
-- Name: COLUMN energy_pools.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.updated_at IS '更新时间';


--
-- Name: COLUMN energy_pools.account_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.account_type IS '账户类型：own_energy=自有能量源，agent_energy=代理商能量源，third_party=第三方供应商';


--
-- Name: COLUMN energy_pools.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.priority IS '优先级，数字越大优先级越高，用于能量分配时的优先级排序';


--
-- Name: COLUMN energy_pools.cost_per_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.cost_per_energy IS '每单位能量的成本（TRX），用于计算能量使用的成本';


--
-- Name: COLUMN energy_pools.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.description IS '账户描述信息，说明账户的用途和特点';


--
-- Name: COLUMN energy_pools.contact_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.contact_info IS '联系信息（JSON格式），包含账户管理员的联系方式';


--
-- Name: COLUMN energy_pools.daily_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.daily_limit IS '日消耗限制，控制账户每日的最大能量消耗量';


--
-- Name: COLUMN energy_pools.monthly_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.monthly_limit IS '月消耗限制，控制账户每月的最大能量消耗量';


--
-- Name: daily_energy_consumption; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.daily_energy_consumption AS
 SELECT date(ecl.created_at) AS consumption_date,
    ecl.pool_account_id,
    ep.name AS account_name,
    ep.account_type,
    sum(
        CASE
            WHEN ((ecl.transaction_type)::text = 'confirm'::text) THEN ecl.energy_amount
            ELSE (0)::bigint
        END) AS total_consumed_energy,
    sum(
        CASE
            WHEN ((ecl.transaction_type)::text = 'confirm'::text) THEN ecl.cost_amount
            ELSE (0)::numeric
        END) AS total_cost,
    count(
        CASE
            WHEN ((ecl.transaction_type)::text = 'confirm'::text) THEN 1
            ELSE NULL::integer
        END) AS transaction_count
   FROM (public.energy_consumption_logs ecl
     JOIN public.energy_pools ep ON ((ecl.pool_account_id = ep.id)))
  GROUP BY (date(ecl.created_at)), ecl.pool_account_id, ep.name, ep.account_type;


--
-- Name: VIEW daily_energy_consumption; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.daily_energy_consumption IS '每日能量消耗统计视图：提供按日期分组的能量消耗统计信息，支持成本分析和资源规划';


--
-- Name: energy_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.energy_packages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    energy_amount bigint NOT NULL,
    price numeric(10,2) NOT NULL,
    duration_hours integer DEFAULT 24 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE energy_packages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_packages IS '能量包配置表 - 定义可购买的能量套餐规格和价格';


--
-- Name: COLUMN energy_packages.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.id IS '能量包唯一标识符（UUID）';


--
-- Name: COLUMN energy_packages.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.name IS '能量包名称';


--
-- Name: COLUMN energy_packages.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.description IS '能量包详细描述';


--
-- Name: COLUMN energy_packages.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.energy_amount IS '能量包包含的能量数量';


--
-- Name: COLUMN energy_packages.price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.price IS '能量包价格（TRX）';


--
-- Name: COLUMN energy_packages.duration_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.duration_hours IS '能量包有效期（小时）';


--
-- Name: COLUMN energy_packages.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.is_active IS '能量包是否激活可用';


--
-- Name: COLUMN energy_packages.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.created_at IS '能量包创建时间';


--
-- Name: COLUMN energy_packages.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.updated_at IS '能量包最后更新时间';


--
-- Name: energy_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.energy_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    pool_id uuid NOT NULL,
    from_address character varying(255) NOT NULL,
    to_address character varying(255) NOT NULL,
    energy_amount bigint NOT NULL,
    tx_hash character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    block_number bigint,
    gas_used bigint,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT energy_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: TABLE energy_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_transactions IS '能量交易记录表 - 记录所有能量委托交易的区块链信息';


--
-- Name: COLUMN energy_transactions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.id IS '交易记录唯一标识符（UUID）';


--
-- Name: COLUMN energy_transactions.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.order_id IS '关联订单ID';


--
-- Name: COLUMN energy_transactions.pool_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.pool_id IS '能量池ID';


--
-- Name: COLUMN energy_transactions.from_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.from_address IS '发送方地址（能量池地址）';


--
-- Name: COLUMN energy_transactions.to_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.to_address IS '接收方地址（用户地址）';


--
-- Name: COLUMN energy_transactions.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.energy_amount IS '交易能量数量';


--
-- Name: COLUMN energy_transactions.tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.tx_hash IS '交易哈希';


--
-- Name: COLUMN energy_transactions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.status IS '交易状态：pending=待确认，confirmed=已确认，failed=失败';


--
-- Name: COLUMN energy_transactions.block_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.block_number IS '交易所在区块号';


--
-- Name: COLUMN energy_transactions.gas_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.gas_used IS '交易消耗的gas';


--
-- Name: COLUMN energy_transactions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.created_at IS '交易记录创建时间';


--
-- Name: COLUMN energy_transactions.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.updated_at IS '交易记录最后更新时间';


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number character varying(100) NOT NULL,
    user_id uuid NOT NULL,
    bot_id uuid,
    package_id uuid,
    energy_amount bigint NOT NULL,
    price numeric(10,2) NOT NULL,
    commission_rate numeric(5,4) DEFAULT 0,
    commission_amount numeric(10,2) DEFAULT 0,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    payment_status character varying(50) DEFAULT 'unpaid'::character varying NOT NULL,
    tron_tx_hash character varying(255),
    delegate_tx_hash character varying(255),
    target_address character varying(255) NOT NULL,
    expires_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['unpaid'::character varying, 'paid'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'refunded'::character varying])::text[])))
);


--
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orders IS '订单信息表 - 记录所有能量租赁订单的完整生命周期';


--
-- Name: COLUMN orders.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.id IS '订单唯一标识符（UUID）';


--
-- Name: COLUMN orders.order_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.order_number IS '订单编号，用于用户查询和系统追踪';


--
-- Name: COLUMN orders.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.user_id IS '下单用户ID';


--
-- Name: COLUMN orders.bot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.bot_id IS '处理订单的机器人ID';


--
-- Name: COLUMN orders.package_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.package_id IS '购买的能量包ID';


--
-- Name: COLUMN orders.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.energy_amount IS '订单能量数量';


--
-- Name: COLUMN orders.price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.price IS '订单价格（TRX）';


--
-- Name: COLUMN orders.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.commission_rate IS '佣金比例（0-1之间的小数）';


--
-- Name: COLUMN orders.commission_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.commission_amount IS '佣金金额（TRX）';


--
-- Name: COLUMN orders.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.status IS '订单状态：pending=待处理，processing=处理中，completed=已完成，failed=失败，cancelled=已取消，refunded=已退款';


--
-- Name: COLUMN orders.payment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.payment_status IS '支付状态：unpaid=未支付，paid=已支付，refunded=已退款';


--
-- Name: COLUMN orders.tron_tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.tron_tx_hash IS '用户支付TRX的交易哈希';


--
-- Name: COLUMN orders.delegate_tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.delegate_tx_hash IS '能量委托交易哈希';


--
-- Name: COLUMN orders.target_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.target_address IS '目标TRON地址，能量将被委托到此地址';


--
-- Name: COLUMN orders.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.expires_at IS '订单过期时间';


--
-- Name: COLUMN orders.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.completed_at IS '订单完成时间';


--
-- Name: COLUMN orders.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.created_at IS '订单创建时间';


--
-- Name: COLUMN orders.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.updated_at IS '订单最后更新时间';


--
-- Name: pricing_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    strategy_id uuid NOT NULL,
    old_config jsonb,
    new_config jsonb NOT NULL,
    change_reason character varying(255),
    changed_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE pricing_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pricing_history IS '价格历史表：记录价格策略的变更历史和审计日志，支持完整的变更追踪';


--
-- Name: COLUMN pricing_history.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_history.id IS '历史记录唯一标识符（UUID）';


--
-- Name: COLUMN pricing_history.strategy_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_history.strategy_id IS '关联的价格策略ID';


--
-- Name: COLUMN pricing_history.old_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_history.old_config IS '变更前的配置（JSON格式），记录变更前的完整状态';


--
-- Name: COLUMN pricing_history.new_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_history.new_config IS '变更后的配置（JSON格式），记录变更后的完整状态';


--
-- Name: COLUMN pricing_history.change_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_history.change_reason IS '变更原因说明，记录变更的目的和背景';


--
-- Name: COLUMN pricing_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_history.changed_by IS '操作者用户ID，记录谁执行了变更操作';


--
-- Name: COLUMN pricing_history.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_history.created_at IS '记录创建时间';


--
-- Name: pricing_modes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_modes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    mode_type character varying(50) NOT NULL,
    config_schema jsonb NOT NULL,
    default_config jsonb NOT NULL,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pricing_modes_mode_type_check CHECK (((mode_type)::text = ANY ((ARRAY['energy_flash'::character varying, 'transaction_package'::character varying])::text[])))
);


--
-- Name: TABLE pricing_modes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pricing_modes IS '定价模式表：定义能量闪租和笔数套餐的标准化配置模式';


--
-- Name: COLUMN pricing_modes.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_modes.id IS '模式唯一标识符（UUID）';


--
-- Name: COLUMN pricing_modes.mode_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_modes.mode_type IS '模式类型：energy_flash=能量闪租，transaction_package=笔数套餐';


--
-- Name: COLUMN pricing_modes.config_schema; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_modes.config_schema IS '配置参数的JSON Schema定义，用于验证配置有效性';


--
-- Name: COLUMN pricing_modes.default_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_modes.default_config IS '默认配置参数（JSON格式），提供标准化的初始配置';


--
-- Name: COLUMN pricing_modes.is_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_modes.is_enabled IS '是否启用该定价模式';


--
-- Name: COLUMN pricing_modes.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_modes.created_at IS '模式创建时间';


--
-- Name: COLUMN pricing_modes.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_modes.updated_at IS '模式最后更新时间';


--
-- Name: pricing_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_strategies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    config jsonb NOT NULL,
    template_id uuid,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pricing_strategies_type_check CHECK (((type)::text = ANY ((ARRAY['energy_flash'::character varying, 'transaction_package'::character varying])::text[])))
);


--
-- Name: TABLE pricing_strategies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pricing_strategies IS '价格策略表：统一管理能量闪租和笔数套餐的定价策略';


--
-- Name: COLUMN pricing_strategies.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_strategies.id IS '策略唯一标识符（UUID）';


--
-- Name: COLUMN pricing_strategies.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_strategies.name IS '策略名称，用于标识不同的定价策略';


--
-- Name: COLUMN pricing_strategies.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_strategies.type IS '策略类型：energy_flash=能量闪租，transaction_package=笔数套餐';


--
-- Name: COLUMN pricing_strategies.config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_strategies.config IS '策略配置参数（JSON格式），包含具体的定价规则';


--
-- Name: COLUMN pricing_strategies.template_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_strategies.template_id IS '基于的定价模板ID，用于继承模板配置';


--
-- Name: COLUMN pricing_strategies.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_strategies.is_active IS '策略是否激活可用';


--
-- Name: COLUMN pricing_strategies.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_strategies.created_by IS '创建者用户ID';


--
-- Name: COLUMN pricing_strategies.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_strategies.created_at IS '策略创建时间';


--
-- Name: COLUMN pricing_strategies.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_strategies.updated_at IS '策略最后更新时间';


--
-- Name: pricing_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    default_config jsonb NOT NULL,
    description text,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pricing_templates_type_check CHECK (((type)::text = ANY ((ARRAY['energy_flash'::character varying, 'transaction_package'::character varying])::text[])))
);


--
-- Name: TABLE pricing_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pricing_templates IS '定价模板表：提供可复用的标准化定价策略模板';


--
-- Name: COLUMN pricing_templates.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_templates.id IS '模板唯一标识符（UUID）';


--
-- Name: COLUMN pricing_templates.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_templates.name IS '模板名称，用于描述模板的用途和特点';


--
-- Name: COLUMN pricing_templates.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_templates.type IS '模板类型：energy_flash=能量闪租，transaction_package=笔数套餐';


--
-- Name: COLUMN pricing_templates.default_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_templates.default_config IS '默认配置参数（JSON格式），定义模板的标准配置';


--
-- Name: COLUMN pricing_templates.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_templates.description IS '模板详细描述，说明适用场景和配置特点';


--
-- Name: COLUMN pricing_templates.is_system; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_templates.is_system IS '是否为系统内置模板，系统模板不可删除';


--
-- Name: COLUMN pricing_templates.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_templates.created_at IS '模板创建时间';


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.schema_migrations IS '数据库迁移记录表 - 记录所有已执行的数据库迁移脚本';


--
-- Name: COLUMN schema_migrations.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.id IS '迁移记录唯一标识符';


--
-- Name: COLUMN schema_migrations.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.filename IS '迁移文件名';


--
-- Name: COLUMN schema_migrations.executed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.executed_at IS '迁移执行时间';


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: system_config_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    config_id uuid NOT NULL,
    old_value text,
    new_value text,
    change_reason character varying(255),
    changed_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE system_config_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_config_history IS '系统配置历史表 - 记录配置变更历史';


--
-- Name: COLUMN system_config_history.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.id IS '历史记录唯一标识符（UUID）';


--
-- Name: COLUMN system_config_history.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.config_id IS '配置ID - 关联system_configs表';


--
-- Name: COLUMN system_config_history.old_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.old_value IS '旧值 - 修改前的值';


--
-- Name: COLUMN system_config_history.new_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.new_value IS '新值 - 修改后的值';


--
-- Name: COLUMN system_config_history.change_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.change_reason IS '变更原因 - 说明为什么修改';


--
-- Name: COLUMN system_config_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.changed_by IS '变更人 - 执行修改的用户ID';


--
-- Name: COLUMN system_config_history.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.created_at IS '变更记录创建时间';


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    config_key character varying(255) NOT NULL,
    config_value text,
    config_type character varying(50) DEFAULT 'string'::character varying NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    is_editable boolean DEFAULT true,
    validation_rules jsonb,
    default_value text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT system_configs_config_type_check CHECK (((config_type)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying, 'array'::character varying])::text[])))
);


--
-- Name: TABLE system_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_configs IS '系统配置表 - 存储系统参数配置';


--
-- Name: COLUMN system_configs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.id IS '配置项唯一标识符（UUID）';


--
-- Name: COLUMN system_configs.config_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_key IS '配置键名 - 唯一标识';


--
-- Name: COLUMN system_configs.config_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_value IS '配置值 - 以字符串形式存储';


--
-- Name: COLUMN system_configs.config_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_type IS '配置类型 - string/number/boolean/json/array';


--
-- Name: COLUMN system_configs.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.category IS '配置分类 - system/security/notification等';


--
-- Name: COLUMN system_configs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.description IS '配置描述 - 说明配置的用途';


--
-- Name: COLUMN system_configs.is_public; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.is_public IS '是否公开 - 普通用户是否可见';


--
-- Name: COLUMN system_configs.is_editable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.is_editable IS '是否可编辑 - 是否允许修改';


--
-- Name: COLUMN system_configs.validation_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.validation_rules IS '验证规则 - JSON格式的验证规则';


--
-- Name: COLUMN system_configs.default_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.default_value IS '默认值 - 重置时使用的默认值';


--
-- Name: COLUMN system_configs.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.created_by IS '创建人用户ID';


--
-- Name: COLUMN system_configs.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.updated_by IS '最后更新人用户ID';


--
-- Name: COLUMN system_configs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.created_at IS '配置创建时间';


--
-- Name: COLUMN system_configs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.updated_at IS '配置最后更新时间';


--
-- Name: telegram_bots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_bots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bot_token character varying(255) NOT NULL,
    bot_name character varying(100) NOT NULL,
    bot_username character varying(100),
    webhook_url character varying(500),
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE telegram_bots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.telegram_bots IS 'Telegram机器人表：管理多个Telegram机器人实例，支持多机器人部署和配置';


--
-- Name: COLUMN telegram_bots.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.id IS '机器人唯一标识符（UUID）';


--
-- Name: COLUMN telegram_bots.bot_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.bot_token IS 'Telegram Bot API Token，用于与Telegram Bot API通信';


--
-- Name: COLUMN telegram_bots.bot_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.bot_name IS '机器人显示名称，用于在管理界面中标识机器人';


--
-- Name: COLUMN telegram_bots.bot_username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.bot_username IS '机器人用户名（@username），用于用户搜索和识别';


--
-- Name: COLUMN telegram_bots.webhook_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.webhook_url IS 'Webhook URL，用于接收Telegram的更新通知';


--
-- Name: COLUMN telegram_bots.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.is_active IS '是否激活该机器人，只有激活的机器人才能接收和处理消息';


--
-- Name: COLUMN telegram_bots.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.created_by IS '创建者用户ID，记录谁创建了这个机器人';


--
-- Name: COLUMN telegram_bots.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.created_at IS '机器人创建时间';


--
-- Name: COLUMN telegram_bots.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.updated_at IS '机器人配置最后更新时间';


--
-- Name: user_level_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_level_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    old_level character varying(50),
    new_level character varying(50) NOT NULL,
    change_reason character varying(255),
    changed_by uuid,
    change_type character varying(50) DEFAULT 'manual'::character varying NOT NULL,
    effective_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_level_changes_change_type_check CHECK (((change_type)::text = ANY ((ARRAY['manual'::character varying, 'automatic'::character varying, 'system'::character varying])::text[])))
);


--
-- Name: TABLE user_level_changes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_level_changes IS '用户等级变更记录表：追踪用户等级的变更历史，支持等级管理的审计需求';


--
-- Name: COLUMN user_level_changes.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.id IS '变更记录唯一标识符（UUID）';


--
-- Name: COLUMN user_level_changes.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.user_id IS '用户ID，关联telegram_users表';


--
-- Name: COLUMN user_level_changes.old_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.old_level IS '变更前等级，记录用户之前的等级状态';


--
-- Name: COLUMN user_level_changes.new_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.new_level IS '变更后等级，记录用户变更后的等级状态';


--
-- Name: COLUMN user_level_changes.change_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.change_reason IS '变更原因，说明等级变更的具体原因';


--
-- Name: COLUMN user_level_changes.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.changed_by IS '操作人ID，关联admins表，记录执行等级变更的管理员';


--
-- Name: COLUMN user_level_changes.change_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.change_type IS '变更类型：manual=手动变更，automatic=自动变更，system=系统变更';


--
-- Name: COLUMN user_level_changes.effective_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.effective_date IS '生效时间，等级变更开始生效的时间点';


--
-- Name: COLUMN user_level_changes.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.created_at IS '记录创建时间';


--
-- Name: COLUMN user_level_changes.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.updated_at IS '记录最后更新时间';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    telegram_id bigint,
    username character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    email character varying(255),
    phone character varying(50),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    tron_address character varying(255),
    balance numeric(20,6) DEFAULT 0,
    total_orders integer DEFAULT 0,
    total_energy_used bigint DEFAULT 0,
    referral_code character varying(50),
    referred_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    password_hash character varying(255),
    login_type character varying(20) DEFAULT 'telegram'::character varying,
    last_login_at timestamp without time zone,
    password_reset_token character varying(255),
    password_reset_expires timestamp without time zone,
    usdt_balance numeric(20,8) DEFAULT 0.00000000 NOT NULL,
    trx_balance numeric(20,8) DEFAULT 0.00000000 NOT NULL,
    agent_id uuid,
    user_type character varying(50) DEFAULT 'normal'::character varying NOT NULL,
    CONSTRAINT check_admin_password CHECK (((((login_type)::text = 'telegram'::text) AND (password_hash IS NULL)) OR (((login_type)::text = 'admin'::text) AND (password_hash IS NOT NULL)) OR (((login_type)::text = 'both'::text) AND (password_hash IS NOT NULL)))),
    CONSTRAINT check_telegram_id CHECK (((((login_type)::text = 'admin'::text) AND (telegram_id IS NULL)) OR (((login_type)::text = ANY ((ARRAY['telegram'::character varying, 'both'::character varying])::text[])) AND (telegram_id IS NOT NULL)))),
    CONSTRAINT check_trx_balance_non_negative CHECK ((trx_balance >= (0)::numeric)),
    CONSTRAINT check_usdt_balance_non_negative CHECK ((usdt_balance >= (0)::numeric)),
    CONSTRAINT telegram_users_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['normal'::character varying, 'vip'::character varying, 'premium'::character varying, 'agent'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT users_login_type_check CHECK (((login_type)::text = ANY ((ARRAY['telegram'::character varying, 'admin'::character varying, 'both'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'banned'::character varying])::text[])))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS '用户信息表 - 存储系统所有用户的基本信息、认证信息和业务数据';


--
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.id IS '用户唯一标识符（UUID）';


--
-- Name: COLUMN users.telegram_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.telegram_id IS 'Telegram用户ID，用于Telegram登录';


--
-- Name: COLUMN users.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.username IS '用户名，用于显示和登录';


--
-- Name: COLUMN users.first_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.first_name IS '用户名字';


--
-- Name: COLUMN users.last_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_name IS '用户姓氏';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email IS '用户邮箱地址，用于管理后台登录';


--
-- Name: COLUMN users.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.phone IS '用户手机号码';


--
-- Name: COLUMN users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.status IS '用户状态：active=活跃，inactive=非活跃，banned=已封禁';


--
-- Name: COLUMN users.tron_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.tron_address IS '用户TRON钱包地址';


--
-- Name: COLUMN users.balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.balance IS '用户账户余额（TRX）';


--
-- Name: COLUMN users.total_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.total_orders IS '用户总订单数量';


--
-- Name: COLUMN users.total_energy_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.total_energy_used IS '用户累计使用的能量数量';


--
-- Name: COLUMN users.referral_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.referral_code IS '用户推荐码，用于推荐系统';


--
-- Name: COLUMN users.referred_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.referred_by IS '推荐人用户ID';


--
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.created_at IS '用户创建时间';


--
-- Name: COLUMN users.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.updated_at IS '用户信息最后更新时间';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS '用户密码哈希值，用于管理后台登录';


--
-- Name: COLUMN users.login_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.login_type IS '登录类型：telegram=Telegram登录，h5=网页登录，both=双端登录';


--
-- Name: COLUMN users.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_login_at IS '最后登录时间';


--
-- Name: COLUMN users.password_reset_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_reset_token IS '密码重置令牌';


--
-- Name: COLUMN users.password_reset_expires; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_reset_expires IS '密码重置令牌过期时间';


--
-- Name: COLUMN users.usdt_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.usdt_balance IS 'USDT余额，精确到8位小数';


--
-- Name: COLUMN users.trx_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.trx_balance IS 'TRX余额，精确到8位小数';


--
-- Name: COLUMN users.agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.agent_id IS '关联的代理商ID，如果用户是代理商的下级用户';


--
-- Name: COLUMN users.user_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.user_type IS '用户类型：normal-普通用户，vip-VIP用户，premium-套餐用户';


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: admin_permissions admin_permissions_admin_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_admin_id_role_id_key UNIQUE (admin_id, role_id);


--
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_roles admin_roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_name_key UNIQUE (name);


--
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- Name: agent_applications agent_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_pkey PRIMARY KEY (id);


--
-- Name: agent_earnings agent_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_pkey PRIMARY KEY (id);


--
-- Name: agents agents_agent_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_agent_code_key UNIQUE (agent_code);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bot_users bot_users_bot_id_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_bot_id_telegram_chat_id_key UNIQUE (bot_id, telegram_chat_id);


--
-- Name: bot_users bot_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_pkey PRIMARY KEY (id);


--
-- Name: energy_consumption_logs energy_consumption_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_consumption_logs
    ADD CONSTRAINT energy_consumption_logs_pkey PRIMARY KEY (id);


--
-- Name: energy_packages energy_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_packages
    ADD CONSTRAINT energy_packages_pkey PRIMARY KEY (id);


--
-- Name: energy_pools energy_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_pools
    ADD CONSTRAINT energy_pools_pkey PRIMARY KEY (id);


--
-- Name: energy_pools energy_pools_tron_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_pools
    ADD CONSTRAINT energy_pools_tron_address_key UNIQUE (tron_address);


--
-- Name: energy_transactions energy_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_pkey PRIMARY KEY (id);


--
-- Name: energy_transactions energy_transactions_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_tx_hash_key UNIQUE (tx_hash);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: pricing_history pricing_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_history
    ADD CONSTRAINT pricing_history_pkey PRIMARY KEY (id);


--
-- Name: pricing_modes pricing_modes_mode_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_modes
    ADD CONSTRAINT pricing_modes_mode_type_key UNIQUE (mode_type);


--
-- Name: pricing_modes pricing_modes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_modes
    ADD CONSTRAINT pricing_modes_pkey PRIMARY KEY (id);


--
-- Name: pricing_strategies pricing_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_strategies
    ADD CONSTRAINT pricing_strategies_pkey PRIMARY KEY (id);


--
-- Name: pricing_templates pricing_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_templates
    ADD CONSTRAINT pricing_templates_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: system_config_history system_config_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_config_key_key UNIQUE (config_key);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: telegram_bots telegram_bots_bot_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_bot_token_key UNIQUE (bot_token);


--
-- Name: telegram_bots telegram_bots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_pkey PRIMARY KEY (id);


--
-- Name: user_level_changes user_level_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- Name: idx_admin_permissions_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_permissions_admin_id ON public.admin_permissions USING btree (admin_id);


--
-- Name: idx_admin_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_permissions_role_id ON public.admin_permissions USING btree (role_id);


--
-- Name: idx_admin_roles_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_roles_name ON public.admin_roles USING btree (name);


--
-- Name: idx_admins_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_email ON public.admins USING btree (email);


--
-- Name: idx_admins_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_status ON public.admins USING btree (status);


--
-- Name: idx_admins_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_username ON public.admins USING btree (username);


--
-- Name: idx_agent_earnings_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_agent_id ON public.agent_earnings USING btree (agent_id);


--
-- Name: idx_agent_earnings_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_order_id ON public.agent_earnings USING btree (order_id);


--
-- Name: idx_agent_earnings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_status ON public.agent_earnings USING btree (status);


--
-- Name: idx_agents_agent_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_agent_code ON public.agents USING btree (agent_code);


--
-- Name: idx_agents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_status ON public.agents USING btree (status);


--
-- Name: idx_agents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_user_id ON public.agents USING btree (user_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs USING btree (admin_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_bot_users_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_bot_id ON public.bot_users USING btree (bot_id);


--
-- Name: idx_bot_users_telegram_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_telegram_chat_id ON public.bot_users USING btree (telegram_chat_id);


--
-- Name: idx_bot_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_user_id ON public.bot_users USING btree (user_id);


--
-- Name: idx_energy_consumption_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_consumption_logs_created_at ON public.energy_consumption_logs USING btree (created_at);


--
-- Name: idx_energy_consumption_logs_pool_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_consumption_logs_pool_account_id ON public.energy_consumption_logs USING btree (pool_account_id);


--
-- Name: idx_energy_consumption_logs_transaction_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_consumption_logs_transaction_type ON public.energy_consumption_logs USING btree (transaction_type);


--
-- Name: idx_energy_pools_account_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_account_type ON public.energy_pools USING btree (account_type);


--
-- Name: idx_energy_pools_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_priority ON public.energy_pools USING btree (priority DESC);


--
-- Name: idx_energy_pools_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_status ON public.energy_pools USING btree (status);


--
-- Name: idx_energy_pools_tron_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_tron_address ON public.energy_pools USING btree (tron_address);


--
-- Name: idx_energy_transactions_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_order_id ON public.energy_transactions USING btree (order_id);


--
-- Name: idx_energy_transactions_pool_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_pool_id ON public.energy_transactions USING btree (pool_id);


--
-- Name: idx_energy_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_status ON public.energy_transactions USING btree (status);


--
-- Name: idx_energy_transactions_tx_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_tx_hash ON public.energy_transactions USING btree (tx_hash);


--
-- Name: idx_orders_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_bot_id ON public.orders USING btree (bot_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_pricing_history_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_history_changed_by ON public.pricing_history USING btree (changed_by);


--
-- Name: idx_pricing_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_history_created_at ON public.pricing_history USING btree (created_at DESC);


--
-- Name: idx_pricing_history_strategy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_history_strategy_id ON public.pricing_history USING btree (strategy_id);


--
-- Name: idx_pricing_modes_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_modes_enabled ON public.pricing_modes USING btree (is_enabled);


--
-- Name: idx_pricing_modes_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_modes_type ON public.pricing_modes USING btree (mode_type);


--
-- Name: idx_pricing_strategies_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_strategies_active ON public.pricing_strategies USING btree (is_active);


--
-- Name: idx_pricing_strategies_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_strategies_created_by ON public.pricing_strategies USING btree (created_by);


--
-- Name: idx_pricing_strategies_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_strategies_name ON public.pricing_strategies USING btree (name);


--
-- Name: idx_pricing_strategies_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_strategies_template ON public.pricing_strategies USING btree (template_id);


--
-- Name: idx_pricing_strategies_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_strategies_type ON public.pricing_strategies USING btree (type);


--
-- Name: idx_pricing_templates_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_templates_system ON public.pricing_templates USING btree (is_system);


--
-- Name: idx_pricing_templates_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_templates_type ON public.pricing_templates USING btree (type);


--
-- Name: idx_system_config_history_config_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_history_config_id ON public.system_config_history USING btree (config_id);


--
-- Name: idx_system_config_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_history_created_at ON public.system_config_history USING btree (created_at);


--
-- Name: idx_system_configs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_category ON public.system_configs USING btree (category);


--
-- Name: idx_system_configs_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_is_public ON public.system_configs USING btree (is_public);


--
-- Name: idx_system_configs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_key ON public.system_configs USING btree (config_key);


--
-- Name: idx_system_configs_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_updated_at ON public.system_configs USING btree (updated_at);


--
-- Name: idx_telegram_bots_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bots_active ON public.telegram_bots USING btree (is_active);


--
-- Name: idx_telegram_bots_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bots_created_by ON public.telegram_bots USING btree (created_by);


--
-- Name: idx_telegram_bots_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bots_username ON public.telegram_bots USING btree (bot_username);


--
-- Name: idx_telegram_users_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_users_user_type ON public.users USING btree (user_type);


--
-- Name: idx_user_level_changes_change_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_change_type ON public.user_level_changes USING btree (change_type);


--
-- Name: idx_user_level_changes_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_changed_by ON public.user_level_changes USING btree (changed_by);


--
-- Name: idx_user_level_changes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_created_at ON public.user_level_changes USING btree (created_at);


--
-- Name: idx_user_level_changes_effective_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_effective_date ON public.user_level_changes USING btree (effective_date);


--
-- Name: idx_user_level_changes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_user_id ON public.user_level_changes USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_login_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_login_type ON public.users USING btree (login_type);


--
-- Name: idx_users_password_reset_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_password_reset_token ON public.users USING btree (password_reset_token) WHERE (password_reset_token IS NOT NULL);


--
-- Name: idx_users_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_referral_code ON public.users USING btree (referral_code);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);


--
-- Name: idx_users_trx_balance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_trx_balance ON public.users USING btree (trx_balance);


--
-- Name: idx_users_usdt_balance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_usdt_balance ON public.users USING btree (usdt_balance);


--
-- Name: pricing_strategies pricing_strategies_history_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pricing_strategies_history_trigger AFTER INSERT OR DELETE OR UPDATE ON public.pricing_strategies FOR EACH ROW EXECUTE FUNCTION public.log_pricing_strategy_changes();


--
-- Name: pricing_strategies pricing_strategy_change_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pricing_strategy_change_log AFTER UPDATE ON public.pricing_strategies FOR EACH ROW EXECUTE FUNCTION public.log_pricing_strategy_changes();


--
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_applications update_agent_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_applications_updated_at BEFORE UPDATE ON public.agent_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_earnings update_agent_earnings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_earnings_updated_at BEFORE UPDATE ON public.agent_earnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agents update_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bot_users update_bot_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bot_users_updated_at BEFORE UPDATE ON public.bot_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: energy_consumption_logs update_energy_consumption_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_consumption_logs_updated_at BEFORE UPDATE ON public.energy_consumption_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: energy_packages update_energy_packages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_packages_updated_at BEFORE UPDATE ON public.energy_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: energy_pools update_energy_pools_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_pools_updated_at BEFORE UPDATE ON public.energy_pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: energy_transactions update_energy_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_transactions_updated_at BEFORE UPDATE ON public.energy_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pricing_modes update_pricing_modes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pricing_modes_updated_at BEFORE UPDATE ON public.pricing_modes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pricing_strategies update_pricing_strategies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pricing_strategies_updated_at BEFORE UPDATE ON public.pricing_strategies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_bots update_telegram_bots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telegram_bots_updated_at BEFORE UPDATE ON public.telegram_bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_level_changes update_user_level_changes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_level_changes_updated_at BEFORE UPDATE ON public.user_level_changes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_config_history validate_system_config_history_user_reference; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_system_config_history_user_reference BEFORE INSERT OR UPDATE ON public.system_config_history FOR EACH ROW EXECUTE FUNCTION public.validate_history_user_reference();


--
-- Name: TRIGGER validate_system_config_history_user_reference ON system_config_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER validate_system_config_history_user_reference ON public.system_config_history IS '在插入或更新时验证用户引用';


--
-- Name: system_configs validate_system_configs_user_reference; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_system_configs_user_reference BEFORE INSERT OR UPDATE ON public.system_configs FOR EACH ROW EXECUTE FUNCTION public.validate_user_reference();


--
-- Name: TRIGGER validate_system_configs_user_reference ON system_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER validate_system_configs_user_reference ON public.system_configs IS '在插入或更新时验证用户引用';


--
-- Name: admin_permissions admin_permissions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- Name: admin_permissions admin_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.admin_roles(id) ON DELETE CASCADE;


--
-- Name: agent_applications agent_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: agent_applications agent_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: agent_earnings agent_earnings_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: agent_earnings agent_earnings_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: agent_earnings agent_earnings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: agents agents_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: agents agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audit_logs audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id);


--
-- Name: bot_users bot_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: energy_consumption_logs energy_consumption_logs_pool_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_consumption_logs
    ADD CONSTRAINT energy_consumption_logs_pool_account_id_fkey FOREIGN KEY (pool_account_id) REFERENCES public.energy_pools(id) ON DELETE CASCADE;


--
-- Name: energy_transactions energy_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: energy_transactions energy_transactions_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.energy_pools(id);


--
-- Name: users fk_users_referred_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by) REFERENCES public.users(id);


--
-- Name: orders orders_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.energy_packages(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: pricing_history pricing_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_history
    ADD CONSTRAINT pricing_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: pricing_history pricing_history_strategy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_history
    ADD CONSTRAINT pricing_history_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.pricing_strategies(id) ON DELETE CASCADE;


--
-- Name: pricing_strategies pricing_strategies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_strategies
    ADD CONSTRAINT pricing_strategies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id);


--
-- Name: system_config_history system_config_history_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.system_configs(id);


--
-- Name: telegram_bots telegram_bots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: users telegram_users_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT telegram_users_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: user_level_changes user_level_changes_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.admins(id);


--
-- Name: user_level_changes user_level_changes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

