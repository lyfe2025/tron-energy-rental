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
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: account_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.account_type AS ENUM (
    'own_energy',
    'agent_energy',
    'third_party'
);


ALTER TYPE public.account_type OWNER TO postgres;

--
-- Name: get_active_bots(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.get_active_bots() OWNER TO postgres;

--
-- Name: FUNCTION get_active_bots(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_active_bots() IS '获取所有激活的Telegram机器人列表';


--
-- Name: get_bot_active_pricing_config(uuid, character varying); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.get_bot_active_pricing_config(p_bot_id uuid, p_mode_type character varying) OWNER TO postgres;

--
-- Name: FUNCTION get_bot_active_pricing_config(p_bot_id uuid, p_mode_type character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_bot_active_pricing_config(p_bot_id uuid, p_mode_type character varying) IS '获取指定机器人和模式类型的当前有效定价配置';


--
-- Name: get_bot_by_token(character varying); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.get_bot_by_token(p_bot_token character varying) OWNER TO postgres;

--
-- Name: FUNCTION get_bot_by_token(p_bot_token character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_bot_by_token(p_bot_token character varying) IS '根据Bot Token获取机器人信息（安全函数）';


--
-- Name: get_pricing_change_stats(integer); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.get_pricing_change_stats(p_days integer) OWNER TO postgres;

--
-- Name: FUNCTION get_pricing_change_stats(p_days integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_pricing_change_stats(p_days integer) IS '获取指定天数内的价格变更统计信息';


--
-- Name: get_strategy_history(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.get_strategy_history(p_strategy_id uuid, p_limit integer) OWNER TO postgres;

--
-- Name: FUNCTION get_strategy_history(p_strategy_id uuid, p_limit integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_strategy_history(p_strategy_id uuid, p_limit integer) IS '获取指定策略的变更历史记录';


--
-- Name: log_pricing_strategy_changes(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.log_pricing_strategy_changes() OWNER TO postgres;

--
-- Name: FUNCTION log_pricing_strategy_changes(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.log_pricing_strategy_changes() IS '自动记录价格策略变更的触发器函数';


--
-- Name: update_bot_activity(uuid); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_bot_activity(p_bot_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION update_bot_activity(p_bot_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_bot_activity(p_bot_id uuid) IS '更新指定机器人的最后活动时间';


--
-- Name: update_daily_consumption_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_daily_consumption_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_daily_consumption_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_history_user_reference(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.validate_history_user_reference() OWNER TO postgres;

--
-- Name: FUNCTION validate_history_user_reference(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validate_history_user_reference() IS '验证 system_config_history 表的用户引用，支持 telegram_users 和 admins 表';


--
-- Name: validate_user_reference(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.validate_user_reference() OWNER TO postgres;

--
-- Name: FUNCTION validate_user_reference(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validate_user_reference() IS '验证 system_configs 表的用户引用，支持 telegram_users 和 admins 表';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    role_id uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.admin_permissions OWNER TO postgres;

--
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.admin_roles OWNER TO postgres;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.admins OWNER TO postgres;

--
-- Name: agent_applications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.agent_applications OWNER TO postgres;

--
-- Name: TABLE agent_applications; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.agent_applications IS '代理申请表 - 记录用户申请成为代理的详细信息';


--
-- Name: COLUMN agent_applications.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.id IS '申请记录唯一标识符（UUID）';


--
-- Name: COLUMN agent_applications.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.user_id IS '申请用户ID';


--
-- Name: COLUMN agent_applications.application_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.application_reason IS '申请成为代理的原因';


--
-- Name: COLUMN agent_applications.contact_info; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.contact_info IS '联系信息（JSON格式）';


--
-- Name: COLUMN agent_applications.experience_description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.experience_description IS '相关经验描述';


--
-- Name: COLUMN agent_applications.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.status IS '申请状态：pending=待审核，approved=已通过，rejected=已拒绝';


--
-- Name: COLUMN agent_applications.reviewed_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.reviewed_by IS '审核人用户ID';


--
-- Name: COLUMN agent_applications.reviewed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.reviewed_at IS '审核时间';


--
-- Name: COLUMN agent_applications.review_notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.review_notes IS '审核备注';


--
-- Name: COLUMN agent_applications.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.created_at IS '申请创建时间';


--
-- Name: COLUMN agent_applications.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_applications.updated_at IS '申请最后更新时间';


--
-- Name: agent_earnings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.agent_earnings OWNER TO postgres;

--
-- Name: TABLE agent_earnings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.agent_earnings IS '代理收益记录表 - 记录代理从订单中获得的佣金明细';


--
-- Name: COLUMN agent_earnings.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.id IS '收益记录唯一标识符（UUID）';


--
-- Name: COLUMN agent_earnings.agent_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.agent_id IS '代理用户ID';


--
-- Name: COLUMN agent_earnings.order_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.order_id IS '关联订单ID';


--
-- Name: COLUMN agent_earnings.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.user_id IS '下单用户ID';


--
-- Name: COLUMN agent_earnings.commission_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.commission_rate IS '佣金比例（0-1之间的小数）';


--
-- Name: COLUMN agent_earnings.commission_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.commission_amount IS '佣金金额（TRX）';


--
-- Name: COLUMN agent_earnings.order_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.order_amount IS '订单金额（TRX）';


--
-- Name: COLUMN agent_earnings.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.status IS '收益状态：pending=待结算，paid=已结算，cancelled=已取消';


--
-- Name: COLUMN agent_earnings.paid_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.paid_at IS '结算时间';


--
-- Name: COLUMN agent_earnings.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.created_at IS '收益记录创建时间';


--
-- Name: COLUMN agent_earnings.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agent_earnings.updated_at IS '收益记录最后更新时间';


--
-- Name: agents; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.agents OWNER TO postgres;

--
-- Name: TABLE agents; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.agents IS '代理用户表 - 管理系统的代理用户信息和收益统计';


--
-- Name: COLUMN agents.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.id IS '代理记录唯一标识符（UUID）';


--
-- Name: COLUMN agents.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.user_id IS '代理用户ID';


--
-- Name: COLUMN agents.agent_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.agent_code IS '代理代码，用于标识代理身份';


--
-- Name: COLUMN agents.commission_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.commission_rate IS '代理佣金比例（0-1之间的小数）';


--
-- Name: COLUMN agents.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.status IS '代理状态：pending=待审核，active=活跃，inactive=非活跃，suspended=已暂停';


--
-- Name: COLUMN agents.total_earnings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.total_earnings IS '代理累计收益（TRX）';


--
-- Name: COLUMN agents.total_orders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.total_orders IS '代理累计订单数量';


--
-- Name: COLUMN agents.total_customers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.total_customers IS '代理累计客户数量';


--
-- Name: COLUMN agents.approved_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.approved_at IS '代理审核通过时间';


--
-- Name: COLUMN agents.approved_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.approved_by IS '审核人用户ID';


--
-- Name: COLUMN agents.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.created_at IS '代理申请创建时间';


--
-- Name: COLUMN agents.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agents.updated_at IS '代理信息最后更新时间';


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: bot_users; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.bot_users OWNER TO postgres;

--
-- Name: TABLE bot_users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.bot_users IS '机器人用户关联表 - 管理用户与机器人的交互关系和个性化设置';


--
-- Name: COLUMN bot_users.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bot_users.id IS '关联记录唯一标识符（UUID）';


--
-- Name: COLUMN bot_users.bot_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bot_users.bot_id IS '机器人ID';


--
-- Name: COLUMN bot_users.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bot_users.user_id IS '用户ID';


--
-- Name: COLUMN bot_users.telegram_chat_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bot_users.telegram_chat_id IS 'Telegram聊天ID';


--
-- Name: COLUMN bot_users.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bot_users.status IS '用户状态：active=活跃，blocked=已屏蔽，inactive=非活跃';


--
-- Name: COLUMN bot_users.last_interaction_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bot_users.last_interaction_at IS '最后交互时间';


--
-- Name: COLUMN bot_users.settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bot_users.settings IS '用户个性化设置（JSON格式）';


--
-- Name: COLUMN bot_users.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bot_users.created_at IS '关联记录创建时间';


--
-- Name: COLUMN bot_users.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bot_users.updated_at IS '关联记录最后更新时间';


--
-- Name: energy_consumption_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.energy_consumption_logs OWNER TO postgres;

--
-- Name: TABLE energy_consumption_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.energy_consumption_logs IS '能量消耗记录表';


--
-- Name: energy_pools; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.energy_pools OWNER TO postgres;

--
-- Name: TABLE energy_pools; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.energy_pools IS '能量池账户表';


--
-- Name: COLUMN energy_pools.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.id IS '能量池唯一标识符（UUID）';


--
-- Name: COLUMN energy_pools.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.name IS '能量池名称';


--
-- Name: COLUMN energy_pools.tron_address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.tron_address IS '能量池TRON地址';


--
-- Name: COLUMN energy_pools.private_key_encrypted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.private_key_encrypted IS '加密的私钥（用于能量委托）';


--
-- Name: COLUMN energy_pools.total_energy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.total_energy IS '总能量数量';


--
-- Name: COLUMN energy_pools.available_energy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.available_energy IS '可用能量数量';


--
-- Name: COLUMN energy_pools.reserved_energy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.reserved_energy IS '预留能量数量';


--
-- Name: COLUMN energy_pools.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.status IS '能量池状态：active=已启用，inactive=已停用，maintenance=维护中';


--
-- Name: COLUMN energy_pools.last_updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.last_updated_at IS '最后更新时间';


--
-- Name: COLUMN energy_pools.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.created_at IS '创建时间';


--
-- Name: COLUMN energy_pools.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.updated_at IS '更新时间';


--
-- Name: COLUMN energy_pools.account_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.account_type IS '账户类型：own_energy=自有能量源，agent_energy=代理商能量源，third_party=第三方供应商';


--
-- Name: COLUMN energy_pools.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.priority IS '优先级：数值越小优先级越高 (1-100)';


--
-- Name: COLUMN energy_pools.cost_per_energy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.cost_per_energy IS '单位能量成本 (TRX)';


--
-- Name: COLUMN energy_pools.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.description IS '账户描述信息';


--
-- Name: COLUMN energy_pools.contact_info; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.contact_info IS '联系信息 (JSON格式)';


--
-- Name: COLUMN energy_pools.daily_limit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.daily_limit IS '每日最大能量使用量 (可选)';


--
-- Name: COLUMN energy_pools.monthly_limit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_pools.monthly_limit IS '每月最大能量使用量 (可选)';


--
-- Name: daily_energy_consumption; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.daily_energy_consumption OWNER TO postgres;

--
-- Name: energy_packages; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.energy_packages OWNER TO postgres;

--
-- Name: TABLE energy_packages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.energy_packages IS '能量包配置表 - 定义可购买的能量套餐规格和价格';


--
-- Name: COLUMN energy_packages.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_packages.id IS '能量包唯一标识符（UUID）';


--
-- Name: COLUMN energy_packages.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_packages.name IS '能量包名称';


--
-- Name: COLUMN energy_packages.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_packages.description IS '能量包详细描述';


--
-- Name: COLUMN energy_packages.energy_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_packages.energy_amount IS '能量包包含的能量数量';


--
-- Name: COLUMN energy_packages.price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_packages.price IS '能量包价格（TRX）';


--
-- Name: COLUMN energy_packages.duration_hours; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_packages.duration_hours IS '能量包有效期（小时）';


--
-- Name: COLUMN energy_packages.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_packages.is_active IS '能量包是否激活可用';


--
-- Name: COLUMN energy_packages.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_packages.created_at IS '能量包创建时间';


--
-- Name: COLUMN energy_packages.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_packages.updated_at IS '能量包最后更新时间';


--
-- Name: energy_transactions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.energy_transactions OWNER TO postgres;

--
-- Name: TABLE energy_transactions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.energy_transactions IS '能量交易记录表 - 记录所有能量委托交易的区块链信息';


--
-- Name: COLUMN energy_transactions.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.id IS '交易记录唯一标识符（UUID）';


--
-- Name: COLUMN energy_transactions.order_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.order_id IS '关联订单ID';


--
-- Name: COLUMN energy_transactions.pool_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.pool_id IS '能量池ID';


--
-- Name: COLUMN energy_transactions.from_address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.from_address IS '发送方地址（能量池地址）';


--
-- Name: COLUMN energy_transactions.to_address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.to_address IS '接收方地址（用户地址）';


--
-- Name: COLUMN energy_transactions.energy_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.energy_amount IS '交易能量数量';


--
-- Name: COLUMN energy_transactions.tx_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.tx_hash IS '交易哈希';


--
-- Name: COLUMN energy_transactions.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.status IS '交易状态：pending=待确认，confirmed=已确认，failed=失败';


--
-- Name: COLUMN energy_transactions.block_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.block_number IS '交易所在区块号';


--
-- Name: COLUMN energy_transactions.gas_used; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.gas_used IS '交易消耗的gas';


--
-- Name: COLUMN energy_transactions.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.created_at IS '交易记录创建时间';


--
-- Name: COLUMN energy_transactions.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.energy_transactions.updated_at IS '交易记录最后更新时间';


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.orders IS '订单信息表 - 记录所有能量租赁订单的完整生命周期';


--
-- Name: COLUMN orders.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.id IS '订单唯一标识符（UUID）';


--
-- Name: COLUMN orders.order_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.order_number IS '订单编号，用于用户查询和系统追踪';


--
-- Name: COLUMN orders.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.user_id IS '下单用户ID';


--
-- Name: COLUMN orders.bot_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.bot_id IS '处理订单的机器人ID';


--
-- Name: COLUMN orders.package_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.package_id IS '购买的能量包ID';


--
-- Name: COLUMN orders.energy_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.energy_amount IS '订单能量数量';


--
-- Name: COLUMN orders.price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.price IS '订单价格（TRX）';


--
-- Name: COLUMN orders.commission_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.commission_rate IS '佣金比例（0-1之间的小数）';


--
-- Name: COLUMN orders.commission_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.commission_amount IS '佣金金额（TRX）';


--
-- Name: COLUMN orders.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.status IS '订单状态：pending=待处理，processing=处理中，completed=已完成，failed=失败，cancelled=已取消，refunded=已退款';


--
-- Name: COLUMN orders.payment_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.payment_status IS '支付状态：unpaid=未支付，paid=已支付，refunded=已退款';


--
-- Name: COLUMN orders.tron_tx_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.tron_tx_hash IS '用户支付TRX的交易哈希';


--
-- Name: COLUMN orders.delegate_tx_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.delegate_tx_hash IS '能量委托交易哈希';


--
-- Name: COLUMN orders.target_address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.target_address IS '目标TRON地址，能量将被委托到此地址';


--
-- Name: COLUMN orders.expires_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.expires_at IS '订单过期时间';


--
-- Name: COLUMN orders.completed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.completed_at IS '订单完成时间';


--
-- Name: COLUMN orders.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.created_at IS '订单创建时间';


--
-- Name: COLUMN orders.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.orders.updated_at IS '订单最后更新时间';


--
-- Name: pricing_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.pricing_history OWNER TO postgres;

--
-- Name: pricing_modes; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.pricing_modes OWNER TO postgres;

--
-- Name: TABLE pricing_modes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pricing_modes IS '定价模式表：定义能量闪租和笔数套餐的配置模式';


--
-- Name: COLUMN pricing_modes.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_modes.id IS '模式唯一标识';


--
-- Name: COLUMN pricing_modes.mode_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_modes.mode_type IS '模式类型：energy_flash-能量闪租，transaction_package-笔数套餐';


--
-- Name: COLUMN pricing_modes.config_schema; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_modes.config_schema IS '配置参数的JSON Schema定义';


--
-- Name: COLUMN pricing_modes.default_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_modes.default_config IS '默认配置参数（JSON格式）';


--
-- Name: COLUMN pricing_modes.is_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_modes.is_enabled IS '是否启用该模式';


--
-- Name: COLUMN pricing_modes.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_modes.created_at IS '创建时间';


--
-- Name: COLUMN pricing_modes.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_modes.updated_at IS '更新时间';


--
-- Name: pricing_strategies; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.pricing_strategies OWNER TO postgres;

--
-- Name: TABLE pricing_strategies; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pricing_strategies IS '价格策略表：统一管理能量闪租和笔数套餐的定价策略';


--
-- Name: COLUMN pricing_strategies.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_strategies.id IS '策略唯一标识';


--
-- Name: COLUMN pricing_strategies.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_strategies.name IS '策略名称';


--
-- Name: COLUMN pricing_strategies.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_strategies.type IS '策略类型：energy_flash-能量闪租，transaction_package-笔数套餐';


--
-- Name: COLUMN pricing_strategies.config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_strategies.config IS '策略配置参数（JSON格式）';


--
-- Name: COLUMN pricing_strategies.template_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_strategies.template_id IS '基于的模板ID';


--
-- Name: COLUMN pricing_strategies.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_strategies.is_active IS '是否激活';


--
-- Name: COLUMN pricing_strategies.created_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_strategies.created_by IS '创建者用户ID';


--
-- Name: COLUMN pricing_strategies.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_strategies.created_at IS '创建时间';


--
-- Name: COLUMN pricing_strategies.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pricing_strategies.updated_at IS '更新时间';


--
-- Name: pricing_templates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.pricing_templates OWNER TO postgres;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.schema_migrations IS '数据库迁移记录表 - 记录所有已执行的数据库迁移脚本';


--
-- Name: COLUMN schema_migrations.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schema_migrations.id IS '迁移记录唯一标识符';


--
-- Name: COLUMN schema_migrations.filename; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schema_migrations.filename IS '迁移文件名';


--
-- Name: COLUMN schema_migrations.executed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schema_migrations.executed_at IS '迁移执行时间';


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.schema_migrations_id_seq OWNER TO postgres;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: system_config_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.system_config_history OWNER TO postgres;

--
-- Name: TABLE system_config_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.system_config_history IS '系统配置历史表 - 记录配置变更历史';


--
-- Name: COLUMN system_config_history.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_config_history.id IS '历史记录唯一标识符（UUID）';


--
-- Name: COLUMN system_config_history.config_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_config_history.config_id IS '配置ID - 关联system_configs表';


--
-- Name: COLUMN system_config_history.old_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_config_history.old_value IS '旧值 - 修改前的值';


--
-- Name: COLUMN system_config_history.new_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_config_history.new_value IS '新值 - 修改后的值';


--
-- Name: COLUMN system_config_history.change_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_config_history.change_reason IS '变更原因 - 说明为什么修改';


--
-- Name: COLUMN system_config_history.changed_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_config_history.changed_by IS '变更人 - 执行修改的用户ID';


--
-- Name: COLUMN system_config_history.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_config_history.created_at IS '变更记录创建时间';


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.system_configs OWNER TO postgres;

--
-- Name: TABLE system_configs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.system_configs IS '系统配置表 - 存储系统参数配置';


--
-- Name: COLUMN system_configs.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.id IS '配置项唯一标识符（UUID）';


--
-- Name: COLUMN system_configs.config_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.config_key IS '配置键名 - 唯一标识';


--
-- Name: COLUMN system_configs.config_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.config_value IS '配置值 - 以字符串形式存储';


--
-- Name: COLUMN system_configs.config_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.config_type IS '配置类型 - string/number/boolean/json/array';


--
-- Name: COLUMN system_configs.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.category IS '配置分类 - system/security/notification等';


--
-- Name: COLUMN system_configs.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.description IS '配置描述 - 说明配置的用途';


--
-- Name: COLUMN system_configs.is_public; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.is_public IS '是否公开 - 普通用户是否可见';


--
-- Name: COLUMN system_configs.is_editable; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.is_editable IS '是否可编辑 - 是否允许修改';


--
-- Name: COLUMN system_configs.validation_rules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.validation_rules IS '验证规则 - JSON格式的验证规则';


--
-- Name: COLUMN system_configs.default_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.default_value IS '默认值 - 重置时使用的默认值';


--
-- Name: COLUMN system_configs.created_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.created_by IS '创建人用户ID';


--
-- Name: COLUMN system_configs.updated_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.updated_by IS '最后更新人用户ID';


--
-- Name: COLUMN system_configs.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.created_at IS '配置创建时间';


--
-- Name: COLUMN system_configs.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_configs.updated_at IS '配置最后更新时间';


--
-- Name: telegram_bots; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.telegram_bots OWNER TO postgres;

--
-- Name: telegram_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telegram_users (
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


ALTER TABLE public.telegram_users OWNER TO postgres;

--
-- Name: TABLE telegram_users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.telegram_users IS '用户信息表 - 存储系统所有用户的基本信息、认证信息和业务数据';


--
-- Name: COLUMN telegram_users.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.id IS '用户唯一标识符（UUID）';


--
-- Name: COLUMN telegram_users.telegram_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.telegram_id IS 'Telegram用户ID，用于Telegram登录';


--
-- Name: COLUMN telegram_users.username; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.username IS '用户名，用于显示和登录';


--
-- Name: COLUMN telegram_users.first_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.first_name IS '用户名字';


--
-- Name: COLUMN telegram_users.last_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.last_name IS '用户姓氏';


--
-- Name: COLUMN telegram_users.email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.email IS '用户邮箱地址，用于管理后台登录';


--
-- Name: COLUMN telegram_users.phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.phone IS '用户手机号码';


--
-- Name: COLUMN telegram_users.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.status IS '用户状态：active=活跃，inactive=非活跃，banned=已封禁';


--
-- Name: COLUMN telegram_users.tron_address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.tron_address IS '用户TRON钱包地址';


--
-- Name: COLUMN telegram_users.balance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.balance IS '用户账户余额（TRX）';


--
-- Name: COLUMN telegram_users.total_orders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.total_orders IS '用户总订单数量';


--
-- Name: COLUMN telegram_users.total_energy_used; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.total_energy_used IS '用户累计使用的能量数量';


--
-- Name: COLUMN telegram_users.referral_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.referral_code IS '用户推荐码，用于推荐系统';


--
-- Name: COLUMN telegram_users.referred_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.referred_by IS '推荐人用户ID';


--
-- Name: COLUMN telegram_users.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.created_at IS '用户创建时间';


--
-- Name: COLUMN telegram_users.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.updated_at IS '用户信息最后更新时间';


--
-- Name: COLUMN telegram_users.password_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.password_hash IS '用户密码哈希值，用于管理后台登录';


--
-- Name: COLUMN telegram_users.login_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.login_type IS '登录类型：telegram=仅Telegram登录，admin=仅管理后台登录，both=两种方式都支持';


--
-- Name: COLUMN telegram_users.last_login_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.last_login_at IS '最后登录时间';


--
-- Name: COLUMN telegram_users.password_reset_token; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.password_reset_token IS '密码重置令牌';


--
-- Name: COLUMN telegram_users.password_reset_expires; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.password_reset_expires IS '密码重置令牌过期时间';


--
-- Name: COLUMN telegram_users.usdt_balance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.usdt_balance IS 'USDT余额，精确到8位小数';


--
-- Name: COLUMN telegram_users.trx_balance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.trx_balance IS 'TRX余额，精确到8位小数';


--
-- Name: COLUMN telegram_users.user_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.telegram_users.user_type IS '用户类型：normal-普通用户，vip-VIP用户，premium-高级用户';


--
-- Name: user_level_changes; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_level_changes OWNER TO postgres;

--
-- Name: TABLE user_level_changes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_level_changes IS '用户等级变更记录表 - 记录用户等级的变更历史';


--
-- Name: COLUMN user_level_changes.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_level_changes.id IS '主键ID';


--
-- Name: COLUMN user_level_changes.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_level_changes.user_id IS '用户ID，关联telegram_users表';


--
-- Name: COLUMN user_level_changes.old_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_level_changes.old_level IS '变更前等级';


--
-- Name: COLUMN user_level_changes.new_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_level_changes.new_level IS '变更后等级';


--
-- Name: COLUMN user_level_changes.change_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_level_changes.change_reason IS '变更原因';


--
-- Name: COLUMN user_level_changes.changed_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_level_changes.changed_by IS '操作人ID，关联admins表';


--
-- Name: COLUMN user_level_changes.change_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_level_changes.change_type IS '变更类型：manual-手动，automatic-自动，system-系统';


--
-- Name: COLUMN user_level_changes.effective_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_level_changes.effective_date IS '生效时间';


--
-- Name: COLUMN user_level_changes.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_level_changes.created_at IS '创建时间';


--
-- Name: COLUMN user_level_changes.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_level_changes.updated_at IS '更新时间';


--
-- Name: users; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.users AS
 SELECT telegram_users.id,
    telegram_users.telegram_id,
    telegram_users.username,
    telegram_users.first_name,
    telegram_users.last_name,
    telegram_users.email,
    telegram_users.phone,
    telegram_users.status,
    telegram_users.tron_address,
    telegram_users.balance,
    telegram_users.total_orders,
    telegram_users.total_energy_used,
    telegram_users.referral_code,
    telegram_users.referred_by,
    telegram_users.created_at,
    telegram_users.updated_at,
    telegram_users.password_hash,
    telegram_users.login_type,
    telegram_users.last_login_at,
    telegram_users.password_reset_token,
    telegram_users.password_reset_expires,
    telegram_users.usdt_balance,
    telegram_users.trx_balance,
    telegram_users.agent_id,
    telegram_users.user_type
   FROM public.telegram_users;


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Data for Name: admin_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_permissions (id, admin_id, role_id, granted_at) FROM stdin;
78dd0b6c-d7ec-42bf-b764-0704866ebdac	980ff3a6-161d-49d6-9373-454d1e3cf4c4	25df2d58-d0ba-44fd-977f-717183c945f3	2025-08-28 18:37:58.087356+08
81050225-084c-4ab7-b838-256e3f98d4dc	980ff3a6-161d-49d6-9373-454d1e3cf4c4	0106750c-3fc8-4e07-8bdb-275be516188c	2025-08-28 18:37:58.089652+08
deb792b9-593f-44c5-8384-8a05cbe56e0f	833cf35a-0114-4d5c-aead-886d500a1570	25df2d58-d0ba-44fd-977f-717183c945f3	2025-08-28 18:53:02.258307+08
1110bfda-81e5-454e-9db9-226cec17bada	f46cbeb3-7d4f-41aa-ba82-b6f13a354ce6	8e1c1402-5a68-458d-b216-5eb95a12958b	2025-08-28 20:07:02.033466+08
\.


--
-- Data for Name: admin_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_roles (id, name, description, permissions, created_at) FROM stdin;
8e1c1402-5a68-458d-b216-5eb95a12958b	super_admin	超级管理员	["all"]	2025-08-28 14:44:32.806987+08
7239cff8-402b-465f-a856-401c27124522	admin	普通管理员	["users.read", "users.write", "orders.read", "statistics.read"]	2025-08-28 14:44:32.806987+08
0106750c-3fc8-4e07-8bdb-275be516188c	operator	运营管理员	["users.read", "agents.read", "agents.write", "statistics.read"]	2025-08-28 14:44:32.806987+08
25df2d58-d0ba-44fd-977f-717183c945f3	customer_service	客服管理员	["users.read", "orders.read", "orders.write"]	2025-08-28 14:44:32.806987+08
\.


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admins (id, username, email, password_hash, role, status, last_login, created_at, updated_at) FROM stdin;
fb9d5e25-7a11-439e-997e-80d9c49087a3	updatedadmin	updated@admin.com	$2a$12$9vPUF3UrFIthu94zAShaW.U6tUKPh6Bj6hdigc1p0NUlghCjnpOmC	admin	inactive	\N	2025-08-28 15:21:08.920763+08	2025-08-28 15:21:18.979508+08
833cf35a-0114-4d5c-aead-886d500a1570	customerservice	cs@tronrental.com	$2a$12$s0V6Ouna32mcabwlCWqYx.asXkO9mfVGk99zzi8vF3Uv.Db4Nooem	customer_service	active	\N	2025-08-28 18:52:41.584155+08	2025-08-28 18:52:41.584155+08
f46cbeb3-7d4f-41aa-ba82-b6f13a354ce6	testadmin	test@admin.com	$2a$12$MbbXXVdmRGLDVIDOgktH7.GXUft.PlyNoMgHB0SfkIjaZ.Z0B6Dra	admin	active	\N	2025-08-28 17:43:03.202006+08	2025-08-28 17:43:03.202006+08
980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	admin@tronrental.com	$2a$12$JV0X/zw6AEtYHJ71HM29IO5Vr3jHcM6KED/1o6P.Dz9SerwfeIFIe	super_admin	active	2025-08-28 20:51:53.966945+08	2025-08-28 14:44:32.807375+08	2025-08-28 20:51:53.966945+08
\.


--
-- Data for Name: agent_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agent_applications (id, user_id, application_reason, contact_info, experience_description, status, reviewed_by, reviewed_at, review_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: agent_earnings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agent_earnings (id, agent_id, order_id, user_id, commission_rate, commission_amount, order_amount, status, paid_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agents (id, user_id, agent_code, commission_rate, status, total_earnings, total_orders, total_customers, approved_at, approved_by, created_at, updated_at) FROM stdin;
2904d630-be20-4be0-b483-e73b4814be28	c380caa5-b04c-4f1a-a4e8-3cc7cc301021	AGENT001	0.2000	inactive	0.000000	0	0	\N	\N	2025-08-28 15:10:30.252394+08	2025-08-28 15:11:48.056396+08
d72e501e-656a-4e79-b859-0c1a09c90cc4	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	AGENT002	0.1500	pending	0.000000	0	0	\N	\N	2025-08-28 17:41:12.173474+08	2025-08-28 17:41:12.173474+08
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, admin_id, action, resource, details, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: bot_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bot_users (id, bot_id, user_id, telegram_chat_id, status, last_interaction_at, settings, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: energy_consumption_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.energy_consumption_logs (id, pool_account_id, energy_amount, cost_amount, transaction_type, order_id, telegram_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: energy_packages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.energy_packages (id, name, description, energy_amount, price, duration_hours, is_active, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440001	基础能量包	适合小额交易的基础能量包	10000	1.00	24	t	2025-08-27 09:18:42.096529+08	2025-08-27 09:18:42.096529+08
550e8400-e29b-41d4-a716-446655440002	标准能量包	适合日常使用的标准能量包	50000	4.50	24	t	2025-08-27 09:18:42.096529+08	2025-08-27 09:18:42.096529+08
550e8400-e29b-41d4-a716-446655440003	高级能量包	适合大额交易的高级能量包	100000	8.00	24	t	2025-08-27 09:18:42.096529+08	2025-08-27 09:18:42.096529+08
550e8400-e29b-41d4-a716-446655440004	企业能量包	适合企业用户的大容量能量包	500000	35.00	24	t	2025-08-27 09:18:42.096529+08	2025-08-27 09:18:42.096529+08
550e8400-e29b-41d4-a716-446655440005	超级能量包	适合超大额交易的超级能量包	1000000	65.00	24	t	2025-08-27 09:18:42.096529+08	2025-08-27 09:18:42.096529+08
\.


--
-- Data for Name: energy_pools; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.energy_pools (id, name, tron_address, private_key_encrypted, total_energy, available_energy, reserved_energy, status, last_updated_at, created_at, updated_at, account_type, priority, cost_per_energy, description, contact_info, daily_limit, monthly_limit) FROM stdin;
550e8400-e29b-41d4-a716-446655440021	主能量池2	TYour2MainPoolAddressHere123456789	encrypted_private_key_here_2	10000000	10000000	0	maintenance	2025-08-28 15:16:22.938697+08	2025-08-27 09:18:42.099478+08	2025-08-28 16:09:10.604225+08	own_energy	1	0.001000	\N	\N	\N	\N
0c0ea0b0-1c53-4881-aae2-19928f1b1a97	测试代理商账户	TTestAgentAddress123456789012345	encrypted_test_key_here	5000000	5000000	0	inactive	2025-08-28 16:52:09.88964+08	2025-08-28 12:38:47.834256+08	2025-08-28 16:52:09.88964+08	agent_energy	1	0.001000	\N	\N	\N	\N
550e8400-e29b-41d4-a716-446655440020	主能量池11111111111111	TYour1MainPoolAddressHere123456789	encrypted_private_key_here_1	10000000	10000000	0	active	2025-08-28 20:09:28.538167+08	2025-08-27 09:18:42.099478+08	2025-08-28 20:09:28.538167+08	own_energy	1	0.001000	\N	\N	\N	\N
\.


--
-- Data for Name: energy_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.energy_transactions (id, order_id, pool_id, from_address, to_address, energy_amount, tx_hash, status, block_number, gas_used, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_number, user_id, bot_id, package_id, energy_amount, price, commission_rate, commission_amount, status, payment_status, tron_tx_hash, delegate_tx_hash, target_address, expires_at, completed_at, created_at, updated_at) FROM stdin;
11427be5-8dbf-4f54-ba89-bbab14112c8b	ORD1756259427864GJFH	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	550e8400-e29b-41d4-a716-446655440010	550e8400-e29b-41d4-a716-446655440001	10000	1.00	0.0000	0.00	cancelled	unpaid	\N	\N	TRX123456789	2025-08-28 09:50:27.864+08	\N	2025-08-27 09:50:27.865697+08	2025-08-27 09:52:21.608322+08
0ea0c560-be19-4558-b96f-c7b85c46a051	ORD1756259608458BOTV	550e8400-e29b-41d4-a716-446655440000	550e8400-e29b-41d4-a716-446655440011	550e8400-e29b-41d4-a716-446655440002	50000	4.50	0.0000	0.00	pending	unpaid	\N	\N	TRX987654321	2025-08-28 09:53:28.458+08	\N	2025-08-27 09:53:28.45902+08	2025-08-27 09:53:28.45902+08
b1f0537c-ea72-4705-8b07-f52d210c430e	ORD1756259622011V9RK	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	550e8400-e29b-41d4-a716-446655440010	550e8400-e29b-41d4-a716-446655440003	100000	8.00	0.0000	0.00	pending	unpaid	\N	\N	TRX111222333	2025-08-28 09:53:42.011+08	\N	2025-08-27 09:53:42.011661+08	2025-08-27 09:53:42.011661+08
\.


--
-- Data for Name: pricing_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pricing_history (id, strategy_id, old_config, new_config, change_reason, changed_by, created_at) FROM stdin;
\.


--
-- Data for Name: pricing_modes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pricing_modes (id, mode_type, config_schema, default_config, is_enabled, created_at, updated_at) FROM stdin;
63e160bb-44d2-4167-b9be-431629a9447a	energy_flash	{"type": "object", "required": ["unit_price", "max_quantity", "expiry_hours"], "properties": {"unit_price": {"type": "number", "maximum": 10, "minimum": 0.1, "description": "单笔价格（TRX）"}, "expiry_hours": {"type": "integer", "maximum": 24, "minimum": 1, "description": "过期时间（小时）"}, "max_quantity": {"type": "integer", "maximum": 10, "minimum": 1, "description": "最大购买笔数"}, "collection_address": {"type": "string", "pattern": "^T[A-Za-z1-9]{33}$", "description": "收款地址"}, "double_energy_for_no_usdt": {"type": "boolean", "description": "向无USDT地址转账是否需要双倍能量"}}}	{"unit_price": 2.6, "expiry_hours": 1, "max_quantity": 5, "collection_address": "TWdcgk9NEsV1nt5yPrNfSYktbA12345678", "double_energy_for_no_usdt": true}	t	2025-08-28 19:23:18.121642+08	2025-08-28 19:23:18.121642+08
76c61aab-4332-4908-bba0-bdf97f1b1eb7	transaction_package	{"type": "object", "required": ["packages", "occupation_fee_hours", "occupation_fee_amount"], "properties": {"packages": {"type": "array", "items": {"type": "object", "required": ["transactions", "price"], "properties": {"price": {"type": "number", "minimum": 0.1, "description": "价格（TRX）"}, "transactions": {"type": "integer", "minimum": 1, "description": "笔数"}}}, "description": "套餐列表"}, "transfer_enabled": {"type": "boolean", "description": "是否允许转移笔数"}, "occupation_fee_hours": {"type": "integer", "maximum": 168, "minimum": 1, "description": "占用费扣除间隔（小时）"}, "occupation_fee_amount": {"type": "integer", "maximum": 10, "minimum": 1, "description": "占用费扣除笔数"}}}	{"packages": [{"price": 25, "transactions": 10}, {"price": 120, "transactions": 50}, {"price": 230, "transactions": 100}], "transfer_enabled": true, "occupation_fee_hours": 24, "occupation_fee_amount": 1}	t	2025-08-28 19:23:18.121642+08	2025-08-28 19:23:18.121642+08
\.


--
-- Data for Name: pricing_strategies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pricing_strategies (id, name, type, config, template_id, is_active, created_by, created_at, updated_at) FROM stdin;
f7a6e1f0-9ed3-4a45-b230-3d9e67f464a7	test-strategy	energy_flash	{"unit_price": 2.6, "expiry_hours": 1, "max_quantity": 5, "collection_address": "TWdcgk9NEsV1nt5yPrNfSYktbA12345678", "double_energy_for_no_usdt": true}	\N	t	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 20:14:45.780273+08	2025-08-28 20:14:45.780273+08
\.


--
-- Data for Name: pricing_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pricing_templates (id, name, type, default_config, description, is_system, created_at) FROM stdin;
30433a0d-4818-4072-a0fe-c48dc1d22b6f	标准能量闪租模板	energy_flash	{"unit_price": 2.6, "expiry_hours": 1, "max_quantity": 5, "collection_address": "TWdcgk9NEsV1nt5yPrNfSYktbA12345678", "double_energy_for_no_usdt": true}	标准的能量闪租定价模板	t	2025-08-28 19:43:31.030044+08
c700ac36-6cdf-42f3-9061-e90b501064e6	标准笔数套餐模板	transaction_package	{"packages": [{"price": 25, "transactions": 10}, {"price": 120, "transactions": 50}, {"price": 230, "transactions": 100}], "transfer_enabled": true, "occupation_fee_hours": 24, "occupation_fee_amount": 1}	标准的笔数套餐定价模板	t	2025-08-28 19:43:31.030044+08
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_migrations (id, filename, executed_at) FROM stdin;
1	001_create_tables.sql	2025-08-27 09:17:35.261284+08
2	002_insert_initial_data.sql	2025-08-27 09:21:08.199366+08
\.


--
-- Data for Name: system_config_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_config_history (id, config_id, old_value, new_value, change_reason, changed_by, created_at) FROM stdin;
378f3930-8eb4-4eb9-92e1-6a38f4dbe27b	e1a1e171-3413-4a20-bb31-36a05937e9a0	support@tron-energy.com	test@example.com	测试基础设置保存	550e8400-e29b-41d4-a716-446655440000	2025-08-28 11:10:49.259497+08
1e23188f-dcd5-4467-885a-ae91c6031a19	857927cc-a67f-4fe2-b691-6c6e16f62b84	TRON能量租赁系统	TRON能量租赁系统 1	批量更新系统设置	550e8400-e29b-41d4-a716-446655440000	2025-08-28 11:11:25.80523+08
a9b61f23-d704-4994-a80f-0811e069acc4	857927cc-a67f-4fe2-b691-6c6e16f62b84	TRON能量租赁系统 1	TRON能量租赁系统 11	批量更新系统设置	550e8400-e29b-41d4-a716-446655440000	2025-08-28 12:30:29.420523+08
d4e37d8e-73ca-4137-8059-efa80f2c33c4	857927cc-a67f-4fe2-b691-6c6e16f62b84	TRON能量租赁系统 11	TRON能量租赁系统 111	批量更新系统设置	550e8400-e29b-41d4-a716-446655440000	2025-08-28 12:46:23.876832+08
76ccb59b-7bb1-4291-b094-4164c886be8d	857927cc-a67f-4fe2-b691-6c6e16f62b84	TRON能量租赁系统 111	测试系统名称更新	API测试	550e8400-e29b-41d4-a716-446655440000	2025-08-28 12:54:21.60674+08
ef3c5ff3-632f-4de8-aabe-fb77bad55711	857927cc-a67f-4fe2-b691-6c6e16f62b84	测试系统名称更新	测试系统名称更新111	批量更新系统设置	550e8400-e29b-41d4-a716-446655440000	2025-08-28 13:07:26.118242+08
37faabfb-a70a-469f-a45f-ec2aff2003a0	857927cc-a67f-4fe2-b691-6c6e16f62b84	测试系统名称更新111	测试系统名称_2025-08-28T10:52:26.827Z	测试保存功能	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 18:52:26.844659+08
e98690b1-8684-44cc-a163-99048ab6734a	e1a1e171-3413-4a20-bb31-36a05937e9a0	test@example.com	test_1756378346828@example.com	测试保存功能	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 18:52:26.858257+08
38de7f97-da6d-449b-95ed-25506e2162ea	857927cc-a67f-4fe2-b691-6c6e16f62b84	测试系统名称_2025-08-28T10:52:26.827Z	测试系统名称_2025-08-28T10:52:26.827Z111	更新basic设置	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 19:49:52.72445+08
47a1acbe-804f-4130-bcf0-c6d6d5747362	857927cc-a67f-4fe2-b691-6c6e16f62b84	测试系统名称_2025-08-28T10:52:26.827Z111	测试系统名称_12312312	更新basic设置	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 19:49:59.824892+08
985f793c-1070-4df9-afd2-c7f97ec22320	857927cc-a67f-4fe2-b691-6c6e16f62b84	测试系统名称_12312312	测试系统名称_12312312111	更新basic设置	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 20:10:56.927658+08
\.


--
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_configs (id, config_key, config_value, config_type, category, description, is_public, is_editable, validation_rules, default_value, created_by, updated_by, created_at, updated_at) FROM stdin;
2dad6564-d212-4131-a199-1cacc7353e91	system.version	1.0.0	string	system	系统版本	t	f	\N	1.0.0	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
365b1611-f634-4f4c-a819-a124615b1d21	system.maintenance_mode	false	boolean	system	维护模式开关	f	t	\N	false	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
fc036bf8-0379-4a23-afad-34cf779c99d3	feature.user_registration	true	boolean	features	用户注册功能开关	f	t	\N	true	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
194be6b2-d47e-40a7-8053-ed24511c6266	feature.agent_application	true	boolean	features	代理申请功能开关	f	t	\N	true	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
eabab032-130b-4ba7-a677-478010be2f7f	feature.energy_trading	true	boolean	features	能量交易功能开关	f	t	\N	true	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
5fe6e180-bbbb-42c2-8d4f-1e76922ca123	feature.referral_system	true	boolean	features	推荐系统功能开关	f	t	\N	true	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
fc630553-823d-412d-b8fe-2cc84c183f78	business.min_order_amount	100	number	business	最小订单金额(TRX)	f	t	\N	100	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
21e0d7a7-3f7d-49c2-b014-581eee258bde	business.max_order_amount	10000	number	business	最大订单金额(TRX)	f	t	\N	10000	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
42369187-1e9e-432b-a3c7-6bb19692aee6	business.default_commission_rate	0.1	number	business	默认佣金比例	f	t	\N	0.1	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
2930b7a7-1afd-451c-abae-889096c82981	business.order_timeout_hours	24	number	business	订单超时时间(小时)	f	t	\N	24	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
b5311375-b230-46a6-837c-872ea17f6a4a	business.energy_unit_price	0.0001	number	business	能量单价(TRX/能量)	f	t	\N	0.0001	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
da83481a-a87c-4e09-be70-4d2010a99bd3	security.max_login_attempts	5	number	security	最大登录尝试次数	f	t	\N	5	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
bec93d38-870e-4763-a614-d82fa5d09f22	security.login_lockout_minutes	30	number	security	登录锁定时间(分钟)	f	t	\N	30	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
ecb37cc9-64bb-4167-8c69-ee83dfb8a63e	security.jwt_expire_hours	24	number	security	JWT过期时间(小时)	f	t	\N	24	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
d8f76ccf-3223-478d-801b-1d3a5562d070	security.password_min_length	8	number	security	密码最小长度	f	t	\N	8	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
5a396047-e67f-40b4-b327-e6b8a1c2855f	notification.email_enabled	true	boolean	notification	邮件通知开关	f	t	\N	true	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
6cc2627b-6cc6-468e-999d-a660fe4a2da3	notification.sms_enabled	false	boolean	notification	短信通知开关	f	t	\N	false	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
7c1a4e15-1c46-42c8-b3b0-b121efe02497	notification.telegram_enabled	true	boolean	notification	Telegram通知开关	f	t	\N	true	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
f7987958-7d72-4c43-a33d-d8247ddd25ae	api.rate_limit_per_minute	100	number	api	API每分钟请求限制	f	t	\N	100	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
6609faa1-bb7c-4680-af2c-dbf18d970701	api.rate_limit_per_hour	1000	number	api	API每小时请求限制	f	t	\N	1000	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
a34ab844-ae63-4752-a3de-010090f0846d	api.enable_cors	true	boolean	api	CORS开关	f	t	\N	true	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
3ca53f3c-fb70-405c-9d7b-cd7d3503d479	payment.tron_network	mainnet	string	payment	TRON网络类型	f	t	\N	mainnet	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
f684e5e3-80db-45c6-9d00-5f9e319df7ba	payment.confirmation_blocks	19	number	payment	支付确认区块数	f	t	\N	19	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
40f9bbfa-3440-4f1b-8e98-a54fb171517d	payment.auto_refund_hours	72	number	payment	自动退款时间(小时)	f	t	\N	72	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
e620c2ff-7cd7-4bf8-ba98-bbf19f64a021	cache.redis_ttl_seconds	3600	number	cache	Redis缓存过期时间(秒)	f	t	\N	3600	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
e1fb72c6-318f-46e0-9c8e-7521721454d1	cache.enable_query_cache	true	boolean	cache	查询缓存开关	f	t	\N	true	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
089d2935-bd70-4218-a859-50d428a176e6	logging.level	info	string	logging	日志级别	f	t	\N	info	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
b4cc9beb-66e5-49eb-947b-f62b20eb9b4b	logging.retention_days	30	number	logging	日志保留天数	f	t	\N	30	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
7d8407f6-96fc-4f4e-bdb1-5cbf6b43ea85	logging.enable_file_log	true	boolean	logging	文件日志开关	f	t	\N	true	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
5ffed6ce-c94c-4b73-b0a4-b0f34433eda8	system.maintenance_message	系统正在维护中，请稍后再试	string	system	维护模式提示信息	t	t	\N	系统正在维护中，请稍后再试	\N	550e8400-e29b-41d4-a716-446655440000	2025-08-27 10:45:18.241664+08	2025-08-28 09:56:54.317236+08
07c1264d-c312-4400-9921-179f40d74bd9	security.enable_two_factor	true	boolean	security	启用双因子认证	f	t	\N	true	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
a3ff2fa5-6d4d-435c-8d4b-88030200a88d	security.session_timeout	30	number	security	会话超时时间(分钟)	f	t	\N	30	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
eaf1b041-6db7-4391-a38a-65a08bd17419	security.password_expire_days	90	number	security	密码过期天数	f	t	\N	90	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
22cb7d6d-8581-47f1-b130-300ef5750cdb	security.enable_ip_whitelist	false	boolean	security	启用IP白名单	f	t	\N	false	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
8837bb7a-9fa5-43de-9b1b-3e36eb111e36	security.ip_whitelist	[]	array	security	IP白名单列表	f	t	\N	[]	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
b081d33a-c0e1-4b3f-9f5a-e126e4a4113e	security.enable_api_rate_limit	true	boolean	security	启用API速率限制	f	t	\N	true	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
44b93160-a466-4bf5-8d81-516de5339388	security.api_rate_limit	1000	number	security	API速率限制(每小时)	f	t	\N	1000	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
9354f6ff-076a-4e0a-90bd-afae9e58920b	notification.system_alerts	true	boolean	notification	系统警报通知	f	t	\N	true	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
3aba79dc-4a25-44b7-820a-3c77255afafb	notification.order_updates	true	boolean	notification	订单更新通知	f	t	\N	true	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
f6c849f3-58bb-471f-9cb0-7e7a94c42f77	notification.low_balance_alert	true	boolean	notification	余额不足警报	f	t	\N	true	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
169ce4a9-25ec-45b6-993d-144310fb775e	notification.maintenance_notifications	true	boolean	notification	维护通知	f	t	\N	true	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
2874576b-d747-4d2e-a36a-ee727343937b	notification.weekly_report	true	boolean	notification	周报通知	f	t	\N	true	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
32b81ab2-7108-4025-98d3-811f7ccdbf5d	notification.monthly_report	true	boolean	notification	月报通知	f	t	\N	true	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
f6a005a4-2020-430d-a446-f8364cd9737b	system.debug_mode	false	boolean	system	调试模式	f	t	\N	false	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
85132fcd-802d-4d53-94aa-0fa6f6de07e9	system.log_level	info	string	system	日志级别	f	t	\N	info	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
64357156-a5b1-4dee-b5e7-e79cc83bb901	system.auto_backup	true	boolean	system	自动备份	f	t	\N	true	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
73301580-d3a3-4d37-a295-d7b5b2dc228f	system.backup_retention_days	30	number	system	备份保留天数	f	t	\N	30	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
8cecd3d4-ad09-4418-a874-0af3abe948ac	system.cache_optimization	true	boolean	system	缓存优化	f	t	\N	true	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
0dfd7fc1-01bd-41d9-84d4-84f05241acc3	system.cache_expire_time	3600	number	system	缓存过期时间(秒)	f	t	\N	3600	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
bc920c98-0f94-4b62-a23e-bff19052fc39	pricing.energy_base_price	0.1	number	pricing	能量基础价格	f	t	\N	0.1	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
4be6c093-674c-45df-a141-b1bbc7418cb2	pricing.bandwidth_base_price	0.05	number	pricing	带宽基础价格	f	t	\N	0.05	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
491ab6ba-9408-40e2-a745-4f125bfc6788	pricing.emergency_fee_multiplier	1.5	number	pricing	紧急费用倍数	f	t	\N	1.5	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
70009f6e-516e-454e-ba46-472e26233f2e	pricing.minimum_order_amount	10	number	pricing	最小订单金额	f	t	\N	10	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
59d9a6e7-895a-4c07-956a-a9ccdc5f3906	pricing.maximum_order_amount	10000	number	pricing	最大订单金额	f	t	\N	10000	\N	\N	2025-08-28 08:44:26.036469+08	2025-08-28 08:44:26.036469+08
857927cc-a67f-4fe2-b691-6c6e16f62b84	system.name	测试系统名称_12312312111	string	system	系统名称	t	t	\N	TRON能量租赁系统	\N	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-27 10:45:18.241664+08	2025-08-28 20:10:56.931327+08
f244a391-2302-4f97-a51b-1f29551ff99b	system.description	专业的TRON网络能量和带宽租赁服务平台	string	system	系统描述	t	t	\N	专业的TRON网络能量和带宽租赁服务平台	\N	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 08:44:26.036469+08	2025-08-28 20:10:56.932723+08
e1a1e171-3413-4a20-bb31-36a05937e9a0	system.contact_email	test_1756378346828@example.com	string	system	联系邮箱	t	t	\N	support@tron-energy.com	\N	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 08:44:26.036469+08	2025-08-28 20:10:56.935142+08
b123106a-5191-4140-ac03-e5d3061607c4	system.support_phone	+86-400-123-4567	string	system	支持电话	t	t	\N	+86-400-123-4567	\N	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 08:44:26.036469+08	2025-08-28 20:10:56.936334+08
2a92f184-8dee-465e-8ccb-1c5ad4fc05b1	system.timezone	Asia/Shanghai	string	system	系统时区	t	t	\N	Asia/Shanghai	\N	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 08:44:26.036469+08	2025-08-28 20:10:56.937736+08
446679fe-b05e-4894-a0af-75aef15f2751	system.language	zh-CN	string	system	系统语言	t	t	\N	zh-CN	\N	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 08:44:26.036469+08	2025-08-28 20:10:56.938683+08
bedee1b1-6d54-4c2e-85b5-ab8aa2eed4e7	system.currency	CNY	string	system	系统货币	t	t	\N	CNY	\N	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 08:44:26.036469+08	2025-08-28 20:10:56.939429+08
91ac4825-62c8-4858-965a-fe9d21a2e167	system.date_format	YYYY-MM-DD	string	system	日期格式	t	t	\N	YYYY-MM-DD	\N	980ff3a6-161d-49d6-9373-454d1e3cf4c4	2025-08-28 08:44:26.036469+08	2025-08-28 20:10:56.940104+08
\.


--
-- Data for Name: telegram_bots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telegram_bots (id, bot_token, bot_name, bot_username, webhook_url, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: telegram_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telegram_users (id, telegram_id, username, first_name, last_name, email, phone, status, tron_address, balance, total_orders, total_energy_used, referral_code, referred_by, created_at, updated_at, password_hash, login_type, last_login_at, password_reset_token, password_reset_expires, usdt_balance, trx_balance, agent_id, user_type) FROM stdin;
09ad451f-3bd8-4ebd-a6e0-fc037db7e703	\N	\N	\N	\N	test@example.com	\N	active	\N	0.000000	0	0	\N	\N	2025-08-27 09:33:04.348682+08	2025-08-28 17:06:28.986061+08	$2a$10$E3QMocOmgGsRzKuV2db.j.OBVfdQ9hfnIkGfOOsNZo6HdAo2wPq6y	admin	\N	\N	\N	0.00000000	0.00000000	\N	normal
550e8400-e29b-41d4-a716-446655440000	123456789	admin	System Admin	\N	admin@tronrental.com	\N	active	\N	0.000000	0	0	ADMIN001	\N	2025-08-27 09:18:42.092445+08	2025-08-28 17:06:28.986061+08	$2a$10$czslCVI4UmXf1.j0zub2mesltXB66uCNJRJYj.1YSRJMSYSOrQeuG	both	2025-08-28 14:19:18.101117	\N	\N	0.00000000	0.00000000	\N	normal
c380caa5-b04c-4f1a-a4e8-3cc7cc301021	987654321	testuser	Updated Test	User	\N	\N	inactive	\N	0.000000	0	0	TEST001	\N	2025-08-28 15:00:07.511842+08	2025-08-28 17:06:28.966007+08	\N	telegram	\N	\N	\N	0.00000000	0.00000000	\N	vip
\.


--
-- Data for Name: user_level_changes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_level_changes (id, user_id, old_level, new_level, change_reason, changed_by, change_type, effective_date, created_at, updated_at) FROM stdin;
\.


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schema_migrations_id_seq', 2, true);


--
-- Name: admin_permissions admin_permissions_admin_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_admin_id_role_id_key UNIQUE (admin_id, role_id);


--
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_roles admin_roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_name_key UNIQUE (name);


--
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- Name: agent_applications agent_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_pkey PRIMARY KEY (id);


--
-- Name: agent_earnings agent_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_pkey PRIMARY KEY (id);


--
-- Name: agents agents_agent_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_agent_code_key UNIQUE (agent_code);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bot_users bot_users_bot_id_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_bot_id_telegram_chat_id_key UNIQUE (bot_id, telegram_chat_id);


--
-- Name: bot_users bot_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_pkey PRIMARY KEY (id);


--
-- Name: energy_consumption_logs energy_consumption_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_consumption_logs
    ADD CONSTRAINT energy_consumption_logs_pkey PRIMARY KEY (id);


--
-- Name: energy_packages energy_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_packages
    ADD CONSTRAINT energy_packages_pkey PRIMARY KEY (id);


--
-- Name: energy_pools energy_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_pools
    ADD CONSTRAINT energy_pools_pkey PRIMARY KEY (id);


--
-- Name: energy_pools energy_pools_tron_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_pools
    ADD CONSTRAINT energy_pools_tron_address_key UNIQUE (tron_address);


--
-- Name: energy_transactions energy_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_pkey PRIMARY KEY (id);


--
-- Name: energy_transactions energy_transactions_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_tx_hash_key UNIQUE (tx_hash);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: pricing_history pricing_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_history
    ADD CONSTRAINT pricing_history_pkey PRIMARY KEY (id);


--
-- Name: pricing_modes pricing_modes_mode_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_modes
    ADD CONSTRAINT pricing_modes_mode_type_key UNIQUE (mode_type);


--
-- Name: pricing_modes pricing_modes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_modes
    ADD CONSTRAINT pricing_modes_pkey PRIMARY KEY (id);


--
-- Name: pricing_strategies pricing_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_strategies
    ADD CONSTRAINT pricing_strategies_pkey PRIMARY KEY (id);


--
-- Name: pricing_templates pricing_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_templates
    ADD CONSTRAINT pricing_templates_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: system_config_history system_config_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_config_key_key UNIQUE (config_key);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: telegram_bots telegram_bots_bot_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_bot_token_key UNIQUE (bot_token);


--
-- Name: telegram_bots telegram_bots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_pkey PRIMARY KEY (id);


--
-- Name: user_level_changes user_level_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_pkey PRIMARY KEY (id);


--
-- Name: telegram_users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: telegram_users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: telegram_users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: telegram_users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- Name: idx_admin_permissions_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_permissions_admin_id ON public.admin_permissions USING btree (admin_id);


--
-- Name: idx_admin_permissions_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_permissions_role_id ON public.admin_permissions USING btree (role_id);


--
-- Name: idx_admin_roles_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_roles_name ON public.admin_roles USING btree (name);


--
-- Name: idx_admins_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admins_email ON public.admins USING btree (email);


--
-- Name: idx_admins_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admins_status ON public.admins USING btree (status);


--
-- Name: idx_admins_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admins_username ON public.admins USING btree (username);


--
-- Name: idx_agent_earnings_agent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_earnings_agent_id ON public.agent_earnings USING btree (agent_id);


--
-- Name: idx_agent_earnings_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_earnings_order_id ON public.agent_earnings USING btree (order_id);


--
-- Name: idx_agent_earnings_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agent_earnings_status ON public.agent_earnings USING btree (status);


--
-- Name: idx_agents_agent_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_agent_code ON public.agents USING btree (agent_code);


--
-- Name: idx_agents_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_status ON public.agents USING btree (status);


--
-- Name: idx_agents_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agents_user_id ON public.agents USING btree (user_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs USING btree (admin_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_bot_users_bot_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_users_bot_id ON public.bot_users USING btree (bot_id);


--
-- Name: idx_bot_users_telegram_chat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_users_telegram_chat_id ON public.bot_users USING btree (telegram_chat_id);


--
-- Name: idx_bot_users_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bot_users_user_id ON public.bot_users USING btree (user_id);


--
-- Name: idx_energy_consumption_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_consumption_logs_created_at ON public.energy_consumption_logs USING btree (created_at);


--
-- Name: idx_energy_consumption_logs_pool_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_consumption_logs_pool_account_id ON public.energy_consumption_logs USING btree (pool_account_id);


--
-- Name: idx_energy_consumption_logs_transaction_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_consumption_logs_transaction_type ON public.energy_consumption_logs USING btree (transaction_type);


--
-- Name: idx_energy_pools_account_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_pools_account_type ON public.energy_pools USING btree (account_type);


--
-- Name: idx_energy_pools_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_pools_priority ON public.energy_pools USING btree (priority DESC);


--
-- Name: idx_energy_pools_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_pools_status ON public.energy_pools USING btree (status);


--
-- Name: idx_energy_pools_tron_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_pools_tron_address ON public.energy_pools USING btree (tron_address);


--
-- Name: idx_energy_transactions_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_transactions_order_id ON public.energy_transactions USING btree (order_id);


--
-- Name: idx_energy_transactions_pool_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_transactions_pool_id ON public.energy_transactions USING btree (pool_id);


--
-- Name: idx_energy_transactions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_transactions_status ON public.energy_transactions USING btree (status);


--
-- Name: idx_energy_transactions_tx_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_transactions_tx_hash ON public.energy_transactions USING btree (tx_hash);


--
-- Name: idx_orders_bot_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_bot_id ON public.orders USING btree (bot_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_pricing_history_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_history_changed_by ON public.pricing_history USING btree (changed_by);


--
-- Name: idx_pricing_history_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_history_created_at ON public.pricing_history USING btree (created_at DESC);


--
-- Name: idx_pricing_history_strategy_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_history_strategy_id ON public.pricing_history USING btree (strategy_id);


--
-- Name: idx_pricing_modes_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_modes_enabled ON public.pricing_modes USING btree (is_enabled);


--
-- Name: idx_pricing_modes_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_modes_type ON public.pricing_modes USING btree (mode_type);


--
-- Name: idx_pricing_strategies_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_strategies_active ON public.pricing_strategies USING btree (is_active);


--
-- Name: idx_pricing_strategies_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_strategies_created_by ON public.pricing_strategies USING btree (created_by);


--
-- Name: idx_pricing_strategies_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_strategies_name ON public.pricing_strategies USING btree (name);


--
-- Name: idx_pricing_strategies_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_strategies_template ON public.pricing_strategies USING btree (template_id);


--
-- Name: idx_pricing_strategies_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_strategies_type ON public.pricing_strategies USING btree (type);


--
-- Name: idx_pricing_templates_system; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_templates_system ON public.pricing_templates USING btree (is_system);


--
-- Name: idx_pricing_templates_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_templates_type ON public.pricing_templates USING btree (type);


--
-- Name: idx_system_config_history_config_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_config_history_config_id ON public.system_config_history USING btree (config_id);


--
-- Name: idx_system_config_history_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_config_history_created_at ON public.system_config_history USING btree (created_at);


--
-- Name: idx_system_configs_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_configs_category ON public.system_configs USING btree (category);


--
-- Name: idx_system_configs_is_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_configs_is_public ON public.system_configs USING btree (is_public);


--
-- Name: idx_system_configs_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_configs_key ON public.system_configs USING btree (config_key);


--
-- Name: idx_system_configs_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_configs_updated_at ON public.system_configs USING btree (updated_at);


--
-- Name: idx_telegram_bots_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_bots_active ON public.telegram_bots USING btree (is_active);


--
-- Name: idx_telegram_bots_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_bots_created_by ON public.telegram_bots USING btree (created_by);


--
-- Name: idx_telegram_bots_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_bots_username ON public.telegram_bots USING btree (bot_username);


--
-- Name: idx_telegram_users_user_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_users_user_type ON public.telegram_users USING btree (user_type);


--
-- Name: idx_user_level_changes_change_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_level_changes_change_type ON public.user_level_changes USING btree (change_type);


--
-- Name: idx_user_level_changes_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_level_changes_changed_by ON public.user_level_changes USING btree (changed_by);


--
-- Name: idx_user_level_changes_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_level_changes_created_at ON public.user_level_changes USING btree (created_at);


--
-- Name: idx_user_level_changes_effective_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_level_changes_effective_date ON public.user_level_changes USING btree (effective_date);


--
-- Name: idx_user_level_changes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_level_changes_user_id ON public.user_level_changes USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.telegram_users USING btree (email);


--
-- Name: idx_users_login_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_login_type ON public.telegram_users USING btree (login_type);


--
-- Name: idx_users_password_reset_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_password_reset_token ON public.telegram_users USING btree (password_reset_token) WHERE (password_reset_token IS NOT NULL);


--
-- Name: idx_users_referral_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_referral_code ON public.telegram_users USING btree (referral_code);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_status ON public.telegram_users USING btree (status);


--
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_telegram_id ON public.telegram_users USING btree (telegram_id);


--
-- Name: idx_users_trx_balance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_trx_balance ON public.telegram_users USING btree (trx_balance);


--
-- Name: idx_users_usdt_balance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_usdt_balance ON public.telegram_users USING btree (usdt_balance);


--
-- Name: pricing_strategies pricing_strategies_history_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER pricing_strategies_history_trigger AFTER INSERT OR DELETE OR UPDATE ON public.pricing_strategies FOR EACH ROW EXECUTE FUNCTION public.log_pricing_strategy_changes();


--
-- Name: pricing_strategies pricing_strategy_change_log; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER pricing_strategy_change_log AFTER UPDATE ON public.pricing_strategies FOR EACH ROW EXECUTE FUNCTION public.log_pricing_strategy_changes();


--
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_applications update_agent_applications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_agent_applications_updated_at BEFORE UPDATE ON public.agent_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_earnings update_agent_earnings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_agent_earnings_updated_at BEFORE UPDATE ON public.agent_earnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agents update_agents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bot_users update_bot_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_bot_users_updated_at BEFORE UPDATE ON public.bot_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: energy_consumption_logs update_energy_consumption_logs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_energy_consumption_logs_updated_at BEFORE UPDATE ON public.energy_consumption_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: energy_packages update_energy_packages_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_energy_packages_updated_at BEFORE UPDATE ON public.energy_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: energy_pools update_energy_pools_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_energy_pools_updated_at BEFORE UPDATE ON public.energy_pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: energy_transactions update_energy_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_energy_transactions_updated_at BEFORE UPDATE ON public.energy_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pricing_modes update_pricing_modes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pricing_modes_updated_at BEFORE UPDATE ON public.pricing_modes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pricing_strategies update_pricing_strategies_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pricing_strategies_updated_at BEFORE UPDATE ON public.pricing_strategies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_bots update_telegram_bots_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_telegram_bots_updated_at BEFORE UPDATE ON public.telegram_bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_level_changes update_user_level_changes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_level_changes_updated_at BEFORE UPDATE ON public.user_level_changes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.telegram_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_config_history validate_system_config_history_user_reference; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_system_config_history_user_reference BEFORE INSERT OR UPDATE ON public.system_config_history FOR EACH ROW EXECUTE FUNCTION public.validate_history_user_reference();


--
-- Name: TRIGGER validate_system_config_history_user_reference ON system_config_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER validate_system_config_history_user_reference ON public.system_config_history IS '在插入或更新时验证用户引用';


--
-- Name: system_configs validate_system_configs_user_reference; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_system_configs_user_reference BEFORE INSERT OR UPDATE ON public.system_configs FOR EACH ROW EXECUTE FUNCTION public.validate_user_reference();


--
-- Name: TRIGGER validate_system_configs_user_reference ON system_configs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER validate_system_configs_user_reference ON public.system_configs IS '在插入或更新时验证用户引用';


--
-- Name: admin_permissions admin_permissions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- Name: admin_permissions admin_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.admin_roles(id) ON DELETE CASCADE;


--
-- Name: agent_applications agent_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.telegram_users(id);


--
-- Name: agent_applications agent_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.telegram_users(id);


--
-- Name: agent_earnings agent_earnings_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: agent_earnings agent_earnings_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: agent_earnings agent_earnings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.telegram_users(id);


--
-- Name: agents agents_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.telegram_users(id);


--
-- Name: agents agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.telegram_users(id);


--
-- Name: audit_logs audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id);


--
-- Name: bot_users bot_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.telegram_users(id);


--
-- Name: energy_consumption_logs energy_consumption_logs_pool_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_consumption_logs
    ADD CONSTRAINT energy_consumption_logs_pool_account_id_fkey FOREIGN KEY (pool_account_id) REFERENCES public.energy_pools(id) ON DELETE CASCADE;


--
-- Name: energy_transactions energy_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: energy_transactions energy_transactions_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.energy_pools(id);


--
-- Name: telegram_users fk_users_referred_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by) REFERENCES public.telegram_users(id);


--
-- Name: orders orders_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.energy_packages(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.telegram_users(id);


--
-- Name: pricing_history pricing_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_history
    ADD CONSTRAINT pricing_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.telegram_users(id);


--
-- Name: pricing_history pricing_history_strategy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_history
    ADD CONSTRAINT pricing_history_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.pricing_strategies(id) ON DELETE CASCADE;


--
-- Name: pricing_strategies pricing_strategies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_strategies
    ADD CONSTRAINT pricing_strategies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id);


--
-- Name: system_config_history system_config_history_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.system_configs(id);


--
-- Name: telegram_bots telegram_bots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.telegram_users(id);


--
-- Name: telegram_users telegram_users_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT telegram_users_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: user_level_changes user_level_changes_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.admins(id);


--
-- Name: user_level_changes user_level_changes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.telegram_users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

