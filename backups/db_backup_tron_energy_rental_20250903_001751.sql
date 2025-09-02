--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

-- Started on 2025-09-03 00:17:51 CST

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

DROP DATABASE tron_energy_rental;
--
-- TOC entry 4357 (class 1262 OID 28228)
-- Name: tron_energy_rental; Type: DATABASE; Schema: -; Owner: -
--

CREATE DATABASE tron_energy_rental WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'C';


\connect tron_energy_rental

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
-- TOC entry 2 (class 3079 OID 28239)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 4358 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 912 (class 1247 OID 34345)
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'own_energy',
    'agent_energy',
    'third_party'
);


--
-- TOC entry 263 (class 1255 OID 34775)
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
-- TOC entry 4359 (class 0 OID 0)
-- Dependencies: 263
-- Name: FUNCTION get_active_bots(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_active_bots() IS '获取所有激活的Telegram机器人列表';


--
-- TOC entry 279 (class 1255 OID 34661)
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
-- TOC entry 4360 (class 0 OID 0)
-- Dependencies: 279
-- Name: FUNCTION get_bot_active_pricing_config(p_bot_id uuid, p_mode_type character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_bot_active_pricing_config(p_bot_id uuid, p_mode_type character varying) IS '获取指定机器人和模式类型的当前有效定价配置';


--
-- TOC entry 264 (class 1255 OID 34776)
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
-- TOC entry 4361 (class 0 OID 0)
-- Dependencies: 264
-- Name: FUNCTION get_bot_by_token(p_bot_token character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_bot_by_token(p_bot_token character varying) IS '根据Bot Token获取机器人信息（安全函数）';


--
-- TOC entry 280 (class 1255 OID 34854)
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
-- TOC entry 4362 (class 0 OID 0)
-- Dependencies: 280
-- Name: FUNCTION get_pricing_change_stats(p_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_pricing_change_stats(p_days integer) IS '获取指定天数内的价格变更统计信息';


--
-- TOC entry 278 (class 1255 OID 34853)
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
-- TOC entry 4363 (class 0 OID 0)
-- Dependencies: 278
-- Name: FUNCTION get_strategy_history(p_strategy_id uuid, p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_strategy_history(p_strategy_id uuid, p_limit integer) IS '获取指定策略的变更历史记录';


--
-- TOC entry 262 (class 1255 OID 34851)
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
-- TOC entry 4364 (class 0 OID 0)
-- Dependencies: 262
-- Name: FUNCTION log_pricing_strategy_changes(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_pricing_strategy_changes() IS '自动记录价格策略变更的触发器函数';


--
-- TOC entry 261 (class 1255 OID 34774)
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
-- TOC entry 4365 (class 0 OID 0)
-- Dependencies: 261
-- Name: FUNCTION update_bot_activity(p_bot_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_bot_activity(p_bot_id uuid) IS '更新指定机器人的最后活动时间';


--
-- TOC entry 260 (class 1255 OID 34384)
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
-- TOC entry 259 (class 1255 OID 28593)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- TOC entry 277 (class 1255 OID 34533)
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
-- TOC entry 4366 (class 0 OID 0)
-- Dependencies: 277
-- Name: FUNCTION validate_history_user_reference(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_history_user_reference() IS '验证 system_config_history 表的用户引用，支持 telegram_users 和 admins 表';


--
-- TOC entry 268 (class 1255 OID 34531)
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
-- TOC entry 4367 (class 0 OID 0)
-- Dependencies: 268
-- Name: FUNCTION validate_user_reference(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_user_reference() IS '验证 system_configs 表的用户引用，支持 telegram_users 和 admins 表';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 238 (class 1259 OID 35125)
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_roles (
    id integer NOT NULL,
    admin_id uuid NOT NULL,
    role_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4368 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE admin_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_roles IS '管理员角色关联表，定义管理员与角色的多对多关系';


--
-- TOC entry 4369 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN admin_roles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.id IS '管理员角色关联唯一标识符';


--
-- TOC entry 4370 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN admin_roles.admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.admin_id IS '管理员ID，关联admins表';


--
-- TOC entry 4371 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN admin_roles.role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.role_id IS '角色ID，关联roles表';


--
-- TOC entry 4372 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN admin_roles.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.created_at IS '分配时间';


--
-- TOC entry 237 (class 1259 OID 35124)
-- Name: admin_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4373 (class 0 OID 0)
-- Dependencies: 237
-- Name: admin_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_roles_id_seq OWNED BY public.admin_roles.id;


--
-- TOC entry 247 (class 1259 OID 35289)
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    session_token text NOT NULL,
    ip_address inet NOT NULL,
    user_agent text,
    login_at timestamp with time zone DEFAULT now(),
    last_activity timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- TOC entry 224 (class 1259 OID 34422)
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
    department_id integer,
    position_id integer,
    last_login_at timestamp without time zone,
    name character varying(50),
    phone character varying(20),
    CONSTRAINT admins_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


--
-- TOC entry 4374 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE admins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admins IS '系统管理员表，存储后台管理系统的管理员账户信息';


--
-- TOC entry 4375 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.id IS '管理员唯一标识符（UUID）';


--
-- TOC entry 4376 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.username IS '管理员用户名，用于登录';


--
-- TOC entry 4377 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.email IS '管理员邮箱地址，用于登录和通知';


--
-- TOC entry 4378 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.password_hash IS '管理员密码哈希值，使用bcrypt加密';


--
-- TOC entry 4379 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.role IS '管理员角色类型';


--
-- TOC entry 4380 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.status IS '管理员状态：active-激活，inactive-禁用';


--
-- TOC entry 4381 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.last_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.last_login IS '最后登录时间';


--
-- TOC entry 4382 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.created_at IS '创建时间';


--
-- TOC entry 4383 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.updated_at IS '更新时间';


--
-- TOC entry 4384 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.department_id IS '所属部门ID';


--
-- TOC entry 4385 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.position_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.position_id IS '岗位ID';


--
-- TOC entry 4386 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.last_login_at IS '最后登录时间';


--
-- TOC entry 215 (class 1259 OID 28384)
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
-- TOC entry 4387 (class 0 OID 0)
-- Dependencies: 215
-- Name: TABLE agent_applications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_applications IS '代理申请表，存储用户申请成为代理的申请记录';


--
-- TOC entry 4388 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.id IS '申请记录唯一标识符';


--
-- TOC entry 4389 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.user_id IS '申请用户ID，关联users表';


--
-- TOC entry 4390 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.application_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.application_reason IS '申请理由';


--
-- TOC entry 4391 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.contact_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.contact_info IS '联系信息（JSON格式）';


--
-- TOC entry 4392 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.experience_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.experience_description IS '相关经验描述';


--
-- TOC entry 4393 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.status IS '申请状态：pending-待审核，approved-已通过，rejected-已拒绝';


--
-- TOC entry 4394 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.reviewed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.reviewed_by IS '审核人ID，关联users表';


--
-- TOC entry 4395 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.reviewed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.reviewed_at IS '审核时间';


--
-- TOC entry 4396 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.review_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.review_notes IS '审核备注';


--
-- TOC entry 4397 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.created_at IS '申请创建时间';


--
-- TOC entry 4398 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.updated_at IS '申请最后更新时间';


--
-- TOC entry 216 (class 1259 OID 28406)
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
-- TOC entry 4399 (class 0 OID 0)
-- Dependencies: 216
-- Name: TABLE agent_earnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_earnings IS '代理收益表，记录代理用户的收益明细';


--
-- TOC entry 4400 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.id IS '收益记录唯一标识符';


--
-- TOC entry 4401 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.agent_id IS '代理用户ID';


--
-- TOC entry 4402 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.order_id IS '关联订单ID，关联orders表';


--
-- TOC entry 4403 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.user_id IS '代理用户ID，关联users表';


--
-- TOC entry 4404 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.commission_rate IS '佣金比例（百分比）';


--
-- TOC entry 4405 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.commission_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.commission_amount IS '佣金金额（USDT）';


--
-- TOC entry 4406 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.order_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.order_amount IS '订单金额（TRX）';


--
-- TOC entry 4407 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.status IS '收益状态：pending-待结算，settled-已结算';


--
-- TOC entry 4408 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.paid_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.paid_at IS '结算时间';


--
-- TOC entry 4409 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.created_at IS '创建时间';


--
-- TOC entry 4410 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.updated_at IS '收益记录最后更新时间';


--
-- TOC entry 214 (class 1259 OID 28358)
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
-- TOC entry 4411 (class 0 OID 0)
-- Dependencies: 214
-- Name: TABLE agents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agents IS '代理表，存储已审核通过的代理用户信息';


--
-- TOC entry 4412 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.id IS '代理记录唯一标识符';


--
-- TOC entry 4413 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.user_id IS '代理用户ID，关联users表';


--
-- TOC entry 4414 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.agent_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.agent_code IS '代理商代码，用于标识代理身份';


--
-- TOC entry 4415 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.commission_rate IS '代理佣金比例（百分比）';


--
-- TOC entry 4416 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.status IS '代理状态：active-激活，suspended-暂停';


--
-- TOC entry 4417 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.total_earnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_earnings IS '累计收益金额（USDT）';


--
-- TOC entry 4418 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.total_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_orders IS '代理商累计订单数量';


--
-- TOC entry 4419 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.total_customers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_customers IS '代理商累计客户数量';


--
-- TOC entry 4420 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.approved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.approved_at IS '审核通过时间';


--
-- TOC entry 4421 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.approved_by IS '审核通过人ID，关联users表';


--
-- TOC entry 4422 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.created_at IS '创建时间';


--
-- TOC entry 4423 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.updated_at IS '更新时间';


--
-- TOC entry 217 (class 1259 OID 28431)
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
-- TOC entry 4424 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE bot_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bot_users IS '机器人用户表，存储通过Telegram机器人注册的用户信息';


--
-- TOC entry 4425 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.id IS '机器人用户记录唯一标识符';


--
-- TOC entry 4426 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.bot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.bot_id IS '机器人ID';


--
-- TOC entry 4427 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.user_id IS '关联用户ID，关联users表';


--
-- TOC entry 4428 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.telegram_chat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.telegram_chat_id IS 'Telegram聊天ID';


--
-- TOC entry 4429 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.status IS '用户状态：active=活跃，blocked=已屏蔽，inactive=非活跃';


--
-- TOC entry 4430 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.last_interaction_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.last_interaction_at IS '最后交互时间';


--
-- TOC entry 4431 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.settings IS '用户个性化设置（JSON格式）';


--
-- TOC entry 4432 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.created_at IS '创建时间';


--
-- TOC entry 4433 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.updated_at IS '更新时间';


--
-- TOC entry 222 (class 1259 OID 34355)
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
-- TOC entry 4434 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE energy_consumption_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_consumption_logs IS '能量消耗日志表，记录用户能量使用的详细日志';


--
-- TOC entry 4435 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.id IS '消耗日志唯一标识符';


--
-- TOC entry 4436 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.pool_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.pool_account_id IS '关联的能量池账户ID';


--
-- TOC entry 4437 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.energy_amount IS '消耗的能量数量';


--
-- TOC entry 4438 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.cost_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.cost_amount IS '消耗能量的成本金额（TRX）';


--
-- TOC entry 4439 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.transaction_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.transaction_type IS '交易类型：reserve=预留，confirm=确认，release=释放';


--
-- TOC entry 4440 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.order_id IS '关联订单ID，关联orders表';


--
-- TOC entry 4441 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.telegram_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.telegram_user_id IS 'Telegram用户ID';


--
-- TOC entry 4442 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.created_at IS '创建时间';


--
-- TOC entry 4443 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.updated_at IS '消耗记录最后更新时间';


--
-- TOC entry 218 (class 1259 OID 28456)
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
-- TOC entry 4444 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE energy_pools; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_pools IS '能量池表，存储系统中可用的能量资源池信息';


--
-- TOC entry 4445 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.id IS '能量池唯一标识符';


--
-- TOC entry 4446 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.name IS '能量池名称';


--
-- TOC entry 4447 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.tron_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.tron_address IS '能量池TRON地址';


--
-- TOC entry 4448 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.private_key_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.private_key_encrypted IS '加密的私钥（用于能量委托）';


--
-- TOC entry 4449 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.total_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.total_energy IS '总能量容量';


--
-- TOC entry 4450 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.available_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.available_energy IS '可用能量数量';


--
-- TOC entry 4451 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.reserved_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.reserved_energy IS '预留能量数量';


--
-- TOC entry 4452 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.status IS '能量池状态：active-激活，inactive-停用';


--
-- TOC entry 4453 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.last_updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.last_updated_at IS '最后更新时间';


--
-- TOC entry 4454 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.created_at IS '创建时间';


--
-- TOC entry 4455 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.updated_at IS '更新时间';


--
-- TOC entry 4456 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.account_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.account_type IS '账户类型：own_energy=自有能量源，agent_energy=代理商能量源，third_party=第三方供应商';


--
-- TOC entry 4457 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.priority IS '优先级，数字越大优先级越高，用于能量分配时的优先级排序';


--
-- TOC entry 4458 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.cost_per_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.cost_per_energy IS '每单位能量的成本（TRX），用于计算能量使用的成本';


--
-- TOC entry 4459 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.description IS '账户描述信息，说明账户的用途和特点';


--
-- TOC entry 4460 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.contact_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.contact_info IS '联系信息（JSON格式），包含账户管理员的联系方式';


--
-- TOC entry 4461 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.daily_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.daily_limit IS '日消耗限制，控制账户每日的最大能量消耗量';


--
-- TOC entry 4462 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.monthly_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.monthly_limit IS '月消耗限制，控制账户每月的最大能量消耗量';


--
-- TOC entry 223 (class 1259 OID 34379)
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
-- TOC entry 4463 (class 0 OID 0)
-- Dependencies: 223
-- Name: VIEW daily_energy_consumption; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.daily_energy_consumption IS '每日能量消耗统计视图：提供按日期分组的能量消耗统计信息，支持成本分析和资源规划';


--
-- TOC entry 230 (class 1259 OID 35046)
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    parent_id integer,
    level integer DEFAULT 1 NOT NULL,
    sort_order integer DEFAULT 0,
    leader_id integer,
    phone character varying(20),
    email character varying(100),
    status integer DEFAULT 1,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4464 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE departments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.departments IS '部门表，存储组织架构中的部门信息';


--
-- TOC entry 4465 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.id IS '部门唯一标识符';


--
-- TOC entry 4466 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.name IS '部门名称';


--
-- TOC entry 4467 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.code IS '部门编码，用于系统内部标识';


--
-- TOC entry 4468 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.parent_id IS '上级部门ID，关联departments表，支持树形结构';


--
-- TOC entry 4469 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.level IS '部门层级，从1开始';


--
-- TOC entry 4470 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.sort_order IS '排序顺序';


--
-- TOC entry 4471 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.leader_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.leader_id IS '部门负责人ID，关联admins表';


--
-- TOC entry 4472 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.phone IS '部门联系电话';


--
-- TOC entry 4473 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.email IS '部门联系邮箱';


--
-- TOC entry 4474 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.status IS '部门状态：1-启用，0-禁用';


--
-- TOC entry 4475 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.description IS '部门描述';


--
-- TOC entry 4476 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.created_at IS '创建时间';


--
-- TOC entry 4477 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.updated_at IS '更新时间';


--
-- TOC entry 229 (class 1259 OID 35045)
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4478 (class 0 OID 0)
-- Dependencies: 229
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- TOC entry 219 (class 1259 OID 28474)
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
-- TOC entry 4479 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE energy_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_transactions IS '能量交易表，记录所有能量买卖交易的详细信息';


--
-- TOC entry 4480 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.id IS '交易记录唯一标识符';


--
-- TOC entry 4481 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.order_id IS '关联订单ID，关联orders表';


--
-- TOC entry 4482 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.pool_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.pool_id IS '能量池ID';


--
-- TOC entry 4483 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.from_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.from_address IS '发送方地址（能量池地址）';


--
-- TOC entry 4484 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.to_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.to_address IS '接收方地址（用户地址）';


--
-- TOC entry 4485 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.energy_amount IS '交易能量数量';


--
-- TOC entry 4486 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.tx_hash IS '交易哈希';


--
-- TOC entry 4487 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.status IS '交易状态：pending-待处理，completed-已完成，failed-失败';


--
-- TOC entry 4488 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.block_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.block_number IS '交易所在区块号';


--
-- TOC entry 4489 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.gas_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.gas_used IS '交易消耗的gas';


--
-- TOC entry 4490 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.created_at IS '创建时间';


--
-- TOC entry 4491 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.updated_at IS '更新时间';


--
-- TOC entry 242 (class 1259 OID 35160)
-- Name: login_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_logs (
    id integer NOT NULL,
    user_id uuid,
    username character varying(100),
    ip_address inet,
    user_agent text,
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    logout_time timestamp without time zone,
    status integer DEFAULT 1,
    message text,
    location character varying(200)
);


--
-- TOC entry 4492 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE login_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.login_logs IS '登录日志表，记录用户登录系统的历史记录';


--
-- TOC entry 4493 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.id IS '登录日志唯一标识符';


--
-- TOC entry 4494 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.user_id IS '用户ID，关联admins表';


--
-- TOC entry 4495 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.username IS '登录用户名';


--
-- TOC entry 4496 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.ip_address IS '登录IP地址';


--
-- TOC entry 4497 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.user_agent IS '用户代理字符串（浏览器信息）';


--
-- TOC entry 4498 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.login_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.login_time IS '登录时间';


--
-- TOC entry 4499 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.logout_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.logout_time IS '登出时间';


--
-- TOC entry 4500 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.status IS '登录状态：success-成功，failed-失败';


--
-- TOC entry 4501 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.message IS '登录结果消息';


--
-- TOC entry 4502 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.location IS '登录地理位置';


--
-- TOC entry 241 (class 1259 OID 35159)
-- Name: login_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4503 (class 0 OID 0)
-- Dependencies: 241
-- Name: login_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_logs_id_seq OWNED BY public.login_logs.id;


--
-- TOC entry 236 (class 1259 OID 35105)
-- Name: menus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menus (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    parent_id integer,
    type integer DEFAULT 1 NOT NULL,
    path character varying(200),
    component character varying(200),
    permission character varying(100),
    icon character varying(100),
    sort_order integer DEFAULT 0,
    visible integer DEFAULT 1,
    status integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4504 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE menus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.menus IS '系统菜单表，存储后台管理系统的菜单结构和权限配置';


--
-- TOC entry 4505 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.id IS '菜单唯一标识符';


--
-- TOC entry 4506 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.name IS '菜单名称';


--
-- TOC entry 4507 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.parent_id IS '父菜单ID，关联menus表，支持树形结构';


--
-- TOC entry 4508 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.type IS '菜单类型：menu-菜单，button-按钮';


--
-- TOC entry 4509 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.path IS '菜单路径（前端路由）';


--
-- TOC entry 4510 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.component; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.component IS '菜单对应的前端组件';


--
-- TOC entry 4511 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.permission; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.permission IS '权限标识符，用于权限控制';


--
-- TOC entry 4512 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.icon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.icon IS '菜单图标';


--
-- TOC entry 4513 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.sort_order IS '排序顺序';


--
-- TOC entry 4514 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.visible; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.visible IS '是否可见：1-可见，0-隐藏';


--
-- TOC entry 4515 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.status IS '菜单状态：1-启用，0-禁用';


--
-- TOC entry 4516 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.created_at IS '创建时间';


--
-- TOC entry 4517 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.updated_at IS '更新时间';


--
-- TOC entry 235 (class 1259 OID 35104)
-- Name: menus_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4518 (class 0 OID 0)
-- Dependencies: 235
-- Name: menus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menus_id_seq OWNED BY public.menus.id;


--
-- TOC entry 244 (class 1259 OID 35171)
-- Name: operation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation_logs (
    id integer NOT NULL,
    admin_id uuid,
    username character varying(100),
    module character varying(100),
    operation character varying(100),
    method character varying(10),
    url character varying(500),
    ip_address inet,
    user_agent text,
    request_params text,
    response_data text,
    status integer DEFAULT 1,
    error_message text,
    execution_time integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4519 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE operation_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.operation_logs IS '操作日志表，记录用户在系统中的所有操作行为';


--
-- TOC entry 4520 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.id IS '操作日志唯一标识符';


--
-- TOC entry 4521 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.admin_id IS '操作用户ID，关联admins表';


--
-- TOC entry 4522 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.username IS '操作用户名';


--
-- TOC entry 4523 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.module; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.module IS '操作模块';


--
-- TOC entry 4524 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.operation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.operation IS '操作类型';


--
-- TOC entry 4525 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.method IS 'HTTP请求方法';


--
-- TOC entry 4526 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.url IS '请求URL';


--
-- TOC entry 4527 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.ip_address IS '操作IP地址';


--
-- TOC entry 4528 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.user_agent IS '用户代理字符串（浏览器信息）';


--
-- TOC entry 4529 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.request_params; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.request_params IS '请求参数（JSON格式）';


--
-- TOC entry 4530 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.response_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.response_data IS '响应数据（JSON格式）';


--
-- TOC entry 4531 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.status IS '操作状态：success-成功，failed-失败';


--
-- TOC entry 4532 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.error_message IS '错误信息';


--
-- TOC entry 4533 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.execution_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.execution_time IS '执行时间（毫秒）';


--
-- TOC entry 4534 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.created_at IS '创建时间';


--
-- TOC entry 243 (class 1259 OID 35170)
-- Name: operation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4535 (class 0 OID 0)
-- Dependencies: 243
-- Name: operation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operation_logs_id_seq OWNED BY public.operation_logs.id;


--
-- TOC entry 213 (class 1259 OID 28325)
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
-- TOC entry 4536 (class 0 OID 0)
-- Dependencies: 213
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orders IS '订单表，存储用户的能量租赁订单信息';


--
-- TOC entry 4537 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.id IS '订单唯一标识符';


--
-- TOC entry 4538 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.order_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.order_number IS '订单编号，用于用户查询和系统追踪';


--
-- TOC entry 4539 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.user_id IS '用户ID，关联users表';


--
-- TOC entry 4540 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.bot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.bot_id IS '处理订单的机器人ID';


--
-- TOC entry 4541 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.package_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.package_id IS '购买的能量包ID';


--
-- TOC entry 4542 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.energy_amount IS '能量数量';


--
-- TOC entry 4543 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.price IS '订单价格（TRX）';


--
-- TOC entry 4544 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.commission_rate IS '佣金比例（0-1之间的小数）';


--
-- TOC entry 4545 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.commission_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.commission_amount IS '佣金金额（TRX）';


--
-- TOC entry 4546 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.status IS '订单状态：pending-待支付，paid-已支付，active-激活中，completed-已完成，cancelled-已取消';


--
-- TOC entry 4547 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.payment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.payment_status IS '支付状态：unpaid=未支付，paid=已支付，refunded=已退款';


--
-- TOC entry 4548 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.tron_tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.tron_tx_hash IS '用户支付TRX的交易哈希';


--
-- TOC entry 4549 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.delegate_tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.delegate_tx_hash IS '能量委托交易哈希';


--
-- TOC entry 4550 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.target_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.target_address IS '目标TRON地址，能量将被委托到此地址';


--
-- TOC entry 4551 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.expires_at IS '订单过期时间';


--
-- TOC entry 4552 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.completed_at IS '订单完成时间';


--
-- TOC entry 4553 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.created_at IS '创建时间';


--
-- TOC entry 4554 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.updated_at IS '更新时间';


--
-- TOC entry 232 (class 1259 OID 35067)
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    department_id integer,
    level integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    status integer DEFAULT 1,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4555 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE positions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.positions IS '岗位表，存储组织架构中的岗位信息';


--
-- TOC entry 4556 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.id IS '岗位唯一标识符';


--
-- TOC entry 4557 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.name IS '岗位名称';


--
-- TOC entry 4558 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.code IS '岗位编码，唯一标识';


--
-- TOC entry 4559 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.department_id IS '所属部门ID，关联departments表';


--
-- TOC entry 4560 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.level IS '岗位级别：1-初级，2-中级，3-高级，4-专家级';


--
-- TOC entry 4561 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.sort_order IS '排序号，数字越小排序越靠前';


--
-- TOC entry 4562 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.status IS '状态：1-启用，0-禁用';


--
-- TOC entry 4563 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.description IS '岗位描述';


--
-- TOC entry 4564 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.created_at IS '创建时间';


--
-- TOC entry 4565 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.updated_at IS '更新时间';


--
-- TOC entry 231 (class 1259 OID 35066)
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.positions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4566 (class 0 OID 0)
-- Dependencies: 231
-- Name: positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.positions_id_seq OWNED BY public.positions.id;


--
-- TOC entry 228 (class 1259 OID 35018)
-- Name: price_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_configs (
    id integer NOT NULL,
    mode_type character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    config jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT price_configs_mode_type_check CHECK (((mode_type)::text = ANY (ARRAY[('energy_flash'::character varying)::text, ('transaction_package'::character varying)::text, ('vip_package'::character varying)::text, ('trx_exchange'::character varying)::text])))
);


--
-- TOC entry 4567 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE price_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.price_configs IS '价格配置表，存储系统中各种服务的价格配置信息';


--
-- TOC entry 4568 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.id IS '价格配置唯一标识符';


--
-- TOC entry 4569 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.mode_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.mode_type IS '价格模式类型：fixed-固定价格，dynamic-动态价格';


--
-- TOC entry 4570 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.name IS '价格配置名称';


--
-- TOC entry 4571 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.description IS '配置描述';


--
-- TOC entry 4572 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.config IS '价格配置详情，JSON格式存储';


--
-- TOC entry 4573 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.is_active IS '是否启用：true-启用，false-禁用';


--
-- TOC entry 4574 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.created_by IS '创建人ID，关联users表';


--
-- TOC entry 4575 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.created_at IS '创建时间';


--
-- TOC entry 4576 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.updated_at IS '更新时间';


--
-- TOC entry 227 (class 1259 OID 35017)
-- Name: price_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4577 (class 0 OID 0)
-- Dependencies: 227
-- Name: price_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_configs_id_seq OWNED BY public.price_configs.id;


--
-- TOC entry 240 (class 1259 OID 35140)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer,
    menu_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4578 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE role_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.role_permissions IS '角色权限关联表，定义角色与菜单权限的多对多关系';


--
-- TOC entry 4579 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN role_permissions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.id IS '角色权限关联唯一标识符';


--
-- TOC entry 4580 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN role_permissions.role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.role_id IS '角色ID，关联roles表';


--
-- TOC entry 4581 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN role_permissions.menu_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.menu_id IS '菜单ID，关联menus表';


--
-- TOC entry 4582 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN role_permissions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.created_at IS '创建时间';


--
-- TOC entry 239 (class 1259 OID 35139)
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4583 (class 0 OID 0)
-- Dependencies: 239
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- TOC entry 234 (class 1259 OID 35088)
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    type character varying(20) DEFAULT 'custom'::character varying,
    data_scope integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    status integer DEFAULT 1,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4584 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS '角色表，存储系统中的用户角色定义';


--
-- TOC entry 4585 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.id IS '角色唯一标识符';


--
-- TOC entry 4586 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.name IS '角色名称';


--
-- TOC entry 4587 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.code IS '角色编码，用于系统内部标识';


--
-- TOC entry 4588 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.type IS '角色类型：system-系统角色，custom-自定义角色';


--
-- TOC entry 4589 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.data_scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.data_scope IS '数据权限范围：1-全部，2-本部门及下级，3-本部门，4-仅本人';


--
-- TOC entry 4590 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.sort_order IS '排序顺序';


--
-- TOC entry 4591 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.status IS '角色状态：1-启用，0-禁用';


--
-- TOC entry 4592 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.description IS '角色描述';


--
-- TOC entry 4593 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.created_at IS '创建时间';


--
-- TOC entry 4594 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.updated_at IS '更新时间';


--
-- TOC entry 233 (class 1259 OID 35087)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4595 (class 0 OID 0)
-- Dependencies: 233
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 245 (class 1259 OID 35258)
-- Name: scheduled_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    cron_expression character varying(100) NOT NULL,
    command text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    next_run timestamp with time zone,
    last_run timestamp with time zone
);


--
-- TOC entry 4596 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE scheduled_tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_tasks IS '定时任务表，存储系统定时任务的配置信息';


--
-- TOC entry 4597 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN scheduled_tasks.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_tasks.name IS '任务名称，对应scheduler.ts中的任务标识';


--
-- TOC entry 4598 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN scheduled_tasks.cron_expression; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_tasks.cron_expression IS 'Cron表达式，定义任务执行时间';


--
-- TOC entry 4599 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN scheduled_tasks.command; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_tasks.command IS '执行命令或函数名';


--
-- TOC entry 4600 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN scheduled_tasks.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_tasks.description IS '任务描述';


--
-- TOC entry 4601 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN scheduled_tasks.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_tasks.is_active IS '是否启用该任务';


--
-- TOC entry 4602 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN scheduled_tasks.next_run; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_tasks.next_run IS '下次执行时间';


--
-- TOC entry 4603 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN scheduled_tasks.last_run; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_tasks.last_run IS '最后执行时间';


--
-- TOC entry 211 (class 1259 OID 28230)
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4604 (class 0 OID 0)
-- Dependencies: 211
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.schema_migrations IS '数据库迁移记录表，跟踪数据库结构变更历史';


--
-- TOC entry 4605 (class 0 OID 0)
-- Dependencies: 211
-- Name: COLUMN schema_migrations.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.id IS '迁移记录唯一标识符';


--
-- TOC entry 4606 (class 0 OID 0)
-- Dependencies: 211
-- Name: COLUMN schema_migrations.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.filename IS '迁移文件名';


--
-- TOC entry 4607 (class 0 OID 0)
-- Dependencies: 211
-- Name: COLUMN schema_migrations.executed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.executed_at IS '迁移执行时间';


--
-- TOC entry 210 (class 1259 OID 28229)
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
-- TOC entry 4608 (class 0 OID 0)
-- Dependencies: 210
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- TOC entry 221 (class 1259 OID 34312)
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
-- TOC entry 4609 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE system_config_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_config_history IS '系统配置历史表，记录系统配置的变更历史';


--
-- TOC entry 4610 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.id IS '配置历史记录唯一标识符';


--
-- TOC entry 4611 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.config_id IS '配置ID，关联system_configs表';


--
-- TOC entry 4612 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.old_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.old_value IS '修改前的配置值';


--
-- TOC entry 4613 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.new_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.new_value IS '修改后的配置值';


--
-- TOC entry 4614 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.change_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.change_reason IS '修改原因';


--
-- TOC entry 4615 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.changed_by IS '修改人ID，关联admins表';


--
-- TOC entry 4616 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.created_at IS '创建时间';


--
-- TOC entry 220 (class 1259 OID 34285)
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
-- TOC entry 4617 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE system_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_configs IS '系统配置表，存储系统运行所需的各种配置参数';


--
-- TOC entry 4618 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.id IS '系统配置唯一标识符';


--
-- TOC entry 4619 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.config_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_key IS '配置键名，用于系统内部标识';


--
-- TOC entry 4620 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.config_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_value IS '配置值';


--
-- TOC entry 4621 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.config_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_type IS '配置类型：string-字符串，number-数字，boolean-布尔值，json-JSON对象';


--
-- TOC entry 4622 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.category IS '配置分类 - system/security/notification等';


--
-- TOC entry 4623 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.description IS '配置描述';


--
-- TOC entry 4624 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.is_public; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.is_public IS '是否为公开配置（前端可访问）';


--
-- TOC entry 4625 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.is_editable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.is_editable IS '是否可编辑 - 是否允许修改';


--
-- TOC entry 4626 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.validation_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.validation_rules IS '验证规则 - JSON格式的验证规则';


--
-- TOC entry 4627 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.default_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.default_value IS '默认值 - 重置时使用的默认值';


--
-- TOC entry 4628 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.created_by IS '创建人用户ID';


--
-- TOC entry 4629 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.updated_by IS '最后更新人用户ID';


--
-- TOC entry 4630 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.created_at IS '创建时间';


--
-- TOC entry 4631 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.updated_at IS '更新时间';


--
-- TOC entry 248 (class 1259 OID 35311)
-- Name: system_monitoring_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_monitoring_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    action_type character varying(50) NOT NULL,
    action_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 246 (class 1259 OID 35271)
-- Name: task_execution_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_execution_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone,
    status character varying(20) NOT NULL,
    output text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_execution_logs_status_check CHECK (((status)::text = ANY ((ARRAY['running'::character varying, 'success'::character varying, 'failed'::character varying, 'timeout'::character varying])::text[])))
);


--
-- TOC entry 226 (class 1259 OID 34953)
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
-- TOC entry 4632 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE telegram_bots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.telegram_bots IS 'Telegram机器人配置表，存储系统中使用的机器人配置信息';


--
-- TOC entry 4633 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.id IS 'Telegram机器人配置唯一标识符';


--
-- TOC entry 4634 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.bot_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.bot_token IS '机器人Token（加密存储）';


--
-- TOC entry 4635 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.bot_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.bot_name IS '机器人名称';


--
-- TOC entry 4636 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.bot_username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.bot_username IS '机器人用户名';


--
-- TOC entry 4637 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.webhook_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.webhook_url IS 'Webhook回调URL';


--
-- TOC entry 4638 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.is_active IS '是否激活该机器人，只有激活的机器人才能接收和处理消息';


--
-- TOC entry 4639 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.created_by IS '创建人ID，关联users表';


--
-- TOC entry 4640 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.created_at IS '创建时间';


--
-- TOC entry 4641 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.updated_at IS '更新时间';


--
-- TOC entry 225 (class 1259 OID 34500)
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
-- TOC entry 4642 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE user_level_changes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_level_changes IS '用户等级变更表，记录用户等级变化的历史记录';


--
-- TOC entry 4643 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.id IS '用户等级变更记录唯一标识符';


--
-- TOC entry 4644 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.user_id IS '用户ID，关联users表';


--
-- TOC entry 4645 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.old_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.old_level IS '变更前等级';


--
-- TOC entry 4646 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.new_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.new_level IS '变更后等级';


--
-- TOC entry 4647 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.change_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.change_reason IS '等级变更原因';


--
-- TOC entry 4648 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.changed_by IS '操作人ID，关联admins表';


--
-- TOC entry 4649 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.change_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.change_type IS '变更类型：manual=手动变更，automatic=自动变更，system=系统变更';


--
-- TOC entry 4650 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.effective_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.effective_date IS '生效时间，等级变更开始生效的时间点';


--
-- TOC entry 4651 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.created_at IS '创建时间';


--
-- TOC entry 4652 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.updated_at IS '记录最后更新时间';


--
-- TOC entry 212 (class 1259 OID 28273)
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
    CONSTRAINT users_login_type_check CHECK (((login_type)::text = ANY ((ARRAY['telegram'::character varying, 'admin'::character varying, 'both'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('banned'::character varying)::text]))),
    CONSTRAINT users_user_type_check CHECK (((user_type)::text = ANY (ARRAY[('normal'::character varying)::text, ('vip'::character varying)::text, ('premium'::character varying)::text, ('agent'::character varying)::text])))
);


--
-- TOC entry 4653 (class 0 OID 0)
-- Dependencies: 212
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS '用户表，存储系统中所有用户的基本信息';


--
-- TOC entry 4654 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.id IS '用户唯一标识符（UUID）';


--
-- TOC entry 4655 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.telegram_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.telegram_id IS 'Telegram用户ID，用于Telegram登录';


--
-- TOC entry 4656 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.username IS '用户名，用于显示和登录';


--
-- TOC entry 4657 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.first_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.first_name IS '用户名字';


--
-- TOC entry 4658 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.last_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_name IS '用户姓氏';


--
-- TOC entry 4659 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email IS '用户邮箱地址，用于管理后台登录';


--
-- TOC entry 4660 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.phone IS '用户手机号码';


--
-- TOC entry 4661 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.status IS '用户状态：active-激活，banned-封禁';


--
-- TOC entry 4662 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.tron_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.tron_address IS '用户TRON钱包地址';


--
-- TOC entry 4663 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.balance IS '用户账户余额（TRX）';


--
-- TOC entry 4664 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.total_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.total_orders IS '用户总订单数量';


--
-- TOC entry 4665 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.total_energy_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.total_energy_used IS '用户累计使用的能量数量';


--
-- TOC entry 4666 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.referral_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.referral_code IS '用户推荐码，用于推荐系统';


--
-- TOC entry 4667 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.referred_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.referred_by IS '推荐人用户ID，关联users表';


--
-- TOC entry 4668 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.created_at IS '创建时间';


--
-- TOC entry 4669 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.updated_at IS '更新时间';


--
-- TOC entry 4670 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS '用户密码哈希值，使用bcrypt加密';


--
-- TOC entry 4671 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.login_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.login_type IS '登录类型：telegram-Telegram登录，admin-管理后台登录，both-两种方式都支持';


--
-- TOC entry 4672 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_login_at IS '最后登录时间';


--
-- TOC entry 4673 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.password_reset_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_reset_token IS '密码重置令牌';


--
-- TOC entry 4674 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.password_reset_expires; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_reset_expires IS '密码重置令牌过期时间';


--
-- TOC entry 4675 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.usdt_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.usdt_balance IS 'USDT余额，精确到8位小数';


--
-- TOC entry 4676 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.trx_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.trx_balance IS 'TRX余额，精确到8位小数';


--
-- TOC entry 4677 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.agent_id IS '所属代理ID，关联agents表';


--
-- TOC entry 4678 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.user_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.user_type IS '用户类型：normal-普通用户，vip-VIP用户，premium-套餐用户';


--
-- TOC entry 3916 (class 2604 OID 35128)
-- Name: admin_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles ALTER COLUMN id SET DEFAULT nextval('public.admin_roles_id_seq'::regclass);


--
-- TOC entry 3890 (class 2604 OID 35049)
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- TOC entry 3920 (class 2604 OID 35163)
-- Name: login_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs ALTER COLUMN id SET DEFAULT nextval('public.login_logs_id_seq'::regclass);


--
-- TOC entry 3909 (class 2604 OID 35108)
-- Name: menus id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus ALTER COLUMN id SET DEFAULT nextval('public.menus_id_seq'::regclass);


--
-- TOC entry 3923 (class 2604 OID 35174)
-- Name: operation_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_logs ALTER COLUMN id SET DEFAULT nextval('public.operation_logs_id_seq'::regclass);


--
-- TOC entry 3896 (class 2604 OID 35070)
-- Name: positions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- TOC entry 3885 (class 2604 OID 35021)
-- Name: price_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_configs ALTER COLUMN id SET DEFAULT nextval('public.price_configs_id_seq'::regclass);


--
-- TOC entry 3918 (class 2604 OID 35143)
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- TOC entry 3902 (class 2604 OID 35091)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3782 (class 2604 OID 34337)
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- TOC entry 4341 (class 0 OID 35125)
-- Dependencies: 238
-- Data for Name: admin_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_roles (id, admin_id, role_id, created_at) FROM stdin;
1	980ff3a6-161d-49d6-9373-454d1e3cf4c4	1	2025-09-01 15:36:49.844553
13	3d97a67a-71d8-4891-9ef8-5fe25c557ac5	5	2025-09-02 17:16:05.248747
16	833cf35a-0114-4d5c-aead-886d500a1570	1	2025-09-02 23:02:22.043031
\.


--
-- TOC entry 4350 (class 0 OID 35289)
-- Dependencies: 247
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_sessions (id, admin_id, session_token, ip_address, user_agent, login_at, last_activity, is_active) FROM stdin;
984dabb3-8522-4b68-8699-f53694150f45	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA2NzEwLCJleHAiOjE3NTY4OTMxMTAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.TWTzDAdg8tPU63Ihidecp94rKqcNMrAzZ9Q1SpuZPHw	::1	curl/8.7.1	2025-09-02 17:51:50.954844+08	2025-09-02 17:51:50.954844+08	t
c5ddbfc5-00ba-4282-9dbb-3ebe50b4347c	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA3MTgyLCJleHAiOjE3NTY4OTM1ODIsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.SyaXP_DEREpAlSjBHzFj7fe4AIAZsZ2s8YEGutouc5M	::1	curl/8.7.1	2025-09-02 17:59:42.828903+08	2025-09-02 17:59:42.828903+08	t
177a8b39-55a2-4d08-8818-7862c59b3f56	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzNzc3LCJleHAiOjE3NTY4OTAxNzcsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.ZRH3S-C8BeD5C2J1dOTXgRgJFDK2Lsi8de9Oby-Zzgw	::1	curl/8.7.1	2025-09-02 17:02:57.097756+08	2025-09-02 17:14:50.909899+08	f
99ae2d91-f139-4184-af78-be80e75b8195	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUwMTA4LCJleHAiOjE3NTY4MzY1MDgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.q3YSHHICbpau_9DaLOgzU3IrzouuNQwxRJmbB0gyow4	::1	curl/8.7.1	2025-09-02 02:08:28.137319+08	2025-09-02 02:10:57.460491+08	f
ddd76739-35a7-42ac-b83e-884594551038	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUwMTQ1LCJleHAiOjE3NTY4MzY1NDUsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.lDOWLx00S0OvLYxaNrZPT9jBg_AQlVl98YprJ7cDtTE	::1	curl/8.7.1	2025-09-02 02:09:05.587917+08	2025-09-02 02:10:57.460491+08	f
1cfd85b4-7c48-49f6-9172-52cc4767f8c7	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAxNTk4LCJleHAiOjE3NTY4ODc5OTgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.oV-xI-VLHZnAVwcDsWeyPAWdKJoKICGU2qadSOtwsIw	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-02 16:26:38.985439+08	2025-09-02 17:02:12.301232+08	f
daf18b57-7059-4038-b928-3b2a71201825	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUwMjAyLCJleHAiOjE3NTY4MzY2MDIsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.C0AYyiRGbgOHfE2Cv6L0hHfqaOgXTv3yLygW4J0DL2U	::1	curl/8.7.1	2025-09-02 02:10:02.608689+08	2025-09-02 02:10:57.460491+08	f
9b98a2cd-8df0-49c3-8e13-02a3895646d3	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4ODc1LCJleHAiOjE3NTY4OTUyNzUsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.NMNKAM7tlH1dZzX-j0FBJF-vzdUTD3P2obQQoJMFqOc	::1	curl/8.7.1	2025-09-02 18:27:55.159589+08	2025-09-02 18:27:55.159589+08	t
4bbe5c38-0ca4-430a-8088-f4f55bc59392	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzODc4LCJleHAiOjE3NTY4OTAyNzgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.GHrZAcglSb__Crtotq4S0XITxwGSJbnQgsF9EXUb7Zo	::1	curl/8.7.1	2025-09-02 17:04:38.085142+08	2025-09-02 17:14:50.909899+08	f
1316348a-2f2c-431d-a425-fd2315c7b6b8	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUwMzUxLCJleHAiOjE3NTY4MzY3NTEsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.UOBRrzyYu2oJSdYBAWTPv_KMg5nM51GrvYuoOwo183o	::1	curl/8.7.1	2025-09-02 02:12:31.270386+08	2025-09-02 02:20:23.93062+08	f
f626b3f4-2d0f-43b2-961d-59e1d6b24524	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODI1OTY1LCJleHAiOjE3NTY5MTIzNjUsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.Vrx3g6DBfXrcWDo_pUBfzDylMcdfNwTeQopUoqvA-V8	::1	curl/8.7.1	2025-09-02 23:12:45.339388+08	2025-09-02 23:12:45.353529+08	t
ad191d91-a2d1-40ce-8012-ad858114133a	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUwMzczLCJleHAiOjE3NTY4MzY3NzMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.bm8BHe5TLS_PyigTWyuKV2yqlYsSg82aezjv-55sHSY	::1	curl/8.7.1	2025-09-02 02:12:53.961033+08	2025-09-02 02:20:23.93062+08	f
007f7cd3-a2f8-4583-8a07-261fb61a942a	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUwNDU2LCJleHAiOjE3NTY4MzY4NTYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.HU2ex-Saj8TETxwQq3u16YXB3xLi-wprZN6QDsyUvdI	::1	curl/8.7.1	2025-09-02 02:14:16.068124+08	2025-09-02 02:20:23.93062+08	f
8357c3aa-5e62-429f-a6c7-57a193a90c22	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUwNjI1LCJleHAiOjE3NTY4MzcwMjUsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.Q5zcIb6DYwO5wvaVsSGJQcmSdGI0Vtk74D1RrGzMhMs	::1	curl/8.7.1	2025-09-02 02:17:05.915435+08	2025-09-02 02:20:23.93062+08	f
8b25ba80-f977-408d-8dfc-68a4bd31b23c	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUwNjY5LCJleHAiOjE3NTY4MzcwNjksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.iPy5camOxIfbqqe6YMvvgE7OdnDedcVKQdGb2f1OFQw	::1	curl/8.7.1	2025-09-02 02:17:49.824541+08	2025-09-02 02:20:23.93062+08	f
0f44189d-f2e6-4bbf-9ca2-ab16cc367780	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzODgzLCJleHAiOjE3NTY4OTAyODMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.uEmnAQOmuEkX7N6cXqVA1b5gW0y4KjwwVbnsTYD95sQ	::1	curl/8.7.1	2025-09-02 17:04:43.419251+08	2025-09-02 17:14:50.909899+08	f
7e790558-3c6e-430d-89c0-2d5a39203bae	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA1ODM0LCJleHAiOjE3NTY4OTIyMzQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.J3sHKBztT_upK6Ty8GLZ9xBaoccF-Z5Y4Xwrj8zKG8E	::1	curl/8.7.1	2025-09-02 17:37:14.363147+08	2025-09-02 17:37:14.363147+08	t
cba3f077-386c-4355-8649-5b52c17f4ae9	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA1OTkxLCJleHAiOjE3NTY4OTIzOTEsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.xhzwsC5bHzEbcYn9mrcRogLncBoU_qvnOmojIh4Ophk	::1	curl/8.7.1	2025-09-02 17:39:51.408329+08	2025-09-02 17:39:51.408329+08	t
c2fc75e4-0fc1-4fba-91e1-98f20a79cf8b	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA2OTcwLCJleHAiOjE3NTY4OTMzNzAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.W4tX06UHorfa1WVfnTk7m1hNx_hWi4iki0EXO6GzGV4	::1	curl/8.7.1	2025-09-02 17:56:10.668447+08	2025-09-02 17:56:10.668447+08	t
950f2f1a-717e-4dff-8131-4e9dc06ce282	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA2MjYxLCJleHAiOjE3NTY4OTI2NjEsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.OOnlzhoQhzeNm7nsHNeW1qzTNpOteCOGyPzFxpe3AD8	::1	curl/8.7.1	2025-09-02 17:44:21.455389+08	2025-09-02 17:44:21.455389+08	t
985ceaa5-393f-44e1-8607-1c8c89ac3e84	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA3MjM2LCJleHAiOjE3NTY4OTM2MzYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.B3NWnRtONCGKNxgXflsUqKDw8mkRgWZ2SPLdvqiblVY	::1	curl/8.7.1	2025-09-02 18:00:36.207877+08	2025-09-02 18:00:36.207877+08	t
6cdae3af-3f2c-407a-91c4-d983f48037ee	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA0MjQwLCJleHAiOjE3NTY4OTA2NDAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.txyKAx9SI7Cqxlw9pCTRMlKIfPxUHF2rAvOmIgM3A-k	::1	curl/8.7.1	2025-09-02 17:10:40.681622+08	2025-09-02 17:14:50.909899+08	f
a2bc612d-a113-48c8-95c7-95f68ea14f52	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA0MjY0LCJleHAiOjE3NTY4OTA2NjQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9._qGVe4flX-hql9Arld17oQsiJKEzUbAOQ7I5n3gT-uQ	::1	curl/8.7.1	2025-09-02 17:11:04.139517+08	2025-09-02 17:14:50.909899+08	f
db6bb9e0-39ea-46de-82bb-508c244a43a1	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA2MDM5LCJleHAiOjE3NTY4OTI0MzksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.A-FxsAmDBrAM_S8v_DZFaGt_JKivSOnDrFGDSMgWkuY	::1	curl/8.7.1	2025-09-02 17:40:39.992648+08	2025-09-02 17:40:39.992648+08	t
31694c2c-fdae-458f-9eaa-f63e9e931882	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA0MzA1LCJleHAiOjE3NTY4OTA3MDUsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.TqWjcRr4tjKBsCkDe_OIrh6Inh6LrZF3sgOqHi0TfDk	::1	curl/8.7.1	2025-09-02 17:11:45.767292+08	2025-09-02 17:14:50.909899+08	f
ba7d908c-a8a2-4ae0-946b-72e147f40c3f	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA2MDQ4LCJleHAiOjE3NTY4OTI0NDgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.Kaib7DLm-Px7amWCw98LSPxtUw8qFYtgFA8J1-uj59o	::1	curl/8.7.1	2025-09-02 17:40:48.020098+08	2025-09-02 17:40:48.020098+08	t
552c3630-317c-4489-ab20-0f1edf8f750a	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA2MDUyLCJleHAiOjE3NTY4OTI0NTIsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.BDyWx36SgISPZ3NYUk3pVpmeIDxKPCISGWVe8oFvlqg	::1	curl/8.7.1	2025-09-02 17:40:52.463911+08	2025-09-02 17:40:52.463911+08	t
cfc9f4f0-0a4f-44c4-981f-2211b4828e5c	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA2MDYyLCJleHAiOjE3NTY4OTI0NjIsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.402nQKTspVmAg3ls4bSFExt_25yOd44u4doeZsRU-Bo	::1	curl/8.7.1	2025-09-02 17:41:02.267353+08	2025-09-02 17:41:02.267353+08	t
bcca5cba-b850-4179-b9b8-b6f37053b1d5	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUzMjA2LCJleHAiOjE3NTY4Mzk2MDYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.lIi5bS0BImuoOfXSCSbsxAu89L2CUylE42UdK5K8UOo	::1	curl/8.7.1	2025-09-02 03:00:06.833696+08	2025-09-02 17:02:12.301232+08	f
42c44fd1-6d31-4910-8733-c9022ae22437	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA2MDc0LCJleHAiOjE3NTY4OTI0NzQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.2Lg8aX4NKIM-abUmBWMLA4CN3wjKleqUFHXV7oIP_X8	::1	curl/8.7.1	2025-09-02 17:41:14.777799+08	2025-09-02 17:41:14.777799+08	t
54658310-1d28-47d7-9a12-5ee9b1ef7578	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA3MDQ2LCJleHAiOjE3NTY4OTM0NDYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.DukgxtsWAUsaoKzw0UEG9mRKCYKWxjGKn_Khfzn8ipc	::1	curl/8.7.1	2025-09-02 17:57:26.1767+08	2025-09-02 17:57:26.1767+08	t
b6835fca-260f-406c-aa1c-b668559b9e18	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4OTE5LCJleHAiOjE3NTY4OTUzMTksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.3UrN0LjhPozHZszfmKtAqb70wyhoGXhN0pddUWxtUow	::1	curl/8.7.1	2025-09-02 18:28:39.727656+08	2025-09-02 18:28:39.727656+08	t
46a60c7b-5f27-4619-9d84-6e5b3e882dc4	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUzNjUzLCJleHAiOjE3NTY4NDAwNTMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.qxM8zNOye3oh8QCQZm7wRtGEeMEEKybsERI27AmOJSU	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 03:07:33.956311+08	2025-09-02 17:02:12.301232+08	f
7c66350e-5d1d-42cc-a7b2-a5cf6af0c4a7	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA0MzY2LCJleHAiOjE3NTY4OTA3NjYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.lUEHDnoPmJyweD9akBdJK6sbu43aFFDL_NYKoX29X6g	::1	curl/8.7.1	2025-09-02 17:12:46.103296+08	2025-09-02 17:14:50.909899+08	f
db2978b5-3b3a-48af-835f-2af5e572e5eb	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA0MzcwLCJleHAiOjE3NTY4OTA3NzAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.UeL80uqWKLSTsAF20zWFJke1ysjqXdw7MQjUCdoiH5g	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 17:12:50.108227+08	2025-09-02 17:14:50.909899+08	f
039e59c8-5edc-4efe-9254-2b1896983212	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzNzg3LCJleHAiOjE3NTY4OTAxODcsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.9NmzRzKR1vSkZ4KwnAIi0S7rPayBf--J34zLx8aU6fg	::1	curl/8.7.1	2025-09-02 17:03:07.543011+08	2025-09-02 17:14:50.909899+08	f
dcaba080-d3a2-480c-8414-017d837313bf	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUzMDc5LCJleHAiOjE3NTY4Mzk0NzksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.ZnpTH4MLs_ZLoJqBTXGST0W6m_UIXxnk283-BwLmDw4	::1	curl/8.7.1	2025-09-02 02:57:59.378596+08	2025-09-02 17:02:12.301232+08	f
031d3b45-74a5-4d81-8458-28e97bb92eea	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE0MDYxLCJleHAiOjE3NTY5MDA0NjEsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.Umd6_XxDMwOTOfvrgSwsXZLGcm5jm8rWWSLoffpOFmI	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 19:54:21.315305+08	2025-09-02 20:01:20.708768+08	t
99242847-33d3-476a-b7cf-8bac62c0ca62	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA0OTE0LCJleHAiOjE3NTY4OTEzMTQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.u_Fj04Q5CzR50LBLiVkhQubS5ws0I0xfyLixCXsgyvg	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-02 17:21:54.025147+08	2025-09-02 21:02:12.705768+08	t
8d9eecf2-e0b4-4484-bbb2-129cf04c6380	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA1ODY3LCJleHAiOjE3NTY4OTIyNjcsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.CWiSJr-p_UkKjSrPi-Ue0mQ0bjm2ZqJRMDJJ4Wkb4E8	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 17:37:47.841829+08	2025-09-02 21:48:46.664534+08	t
f0e56991-ce5b-4902-affb-f48c89922471	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzMDI5LCJleHAiOjE3NTY4ODk0MjksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.fUue8SdcQP20-yFCV_KDvvQ0R-QINjY0UDuqYSxBNCc	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 16:50:29.326971+08	2025-09-02 17:02:12.301232+08	f
d7fa8d00-ff3c-428e-bd06-f3c25ed257e4	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUxNDg2LCJleHAiOjE3NTY4Mzc4ODYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.zFbSTGII2IT_JEF4acAmkfaom1Nan57vEqse0OqFLqo	::1	curl/8.7.1	2025-09-02 02:31:26.222911+08	2025-09-02 17:02:12.301232+08	f
edc6ff4b-9704-40d4-8e6a-f4537cb296fd	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUxNTE1LCJleHAiOjE3NTY4Mzc5MTUsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.DuDEqMNN3Jzy9muTSOBSCMJunjM1CuqksOi3Y7YOnuU	::1	curl/8.7.1	2025-09-02 02:31:55.08554+08	2025-09-02 17:02:12.301232+08	f
9ed20d35-7101-4126-96d7-49a6a8a22b0a	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzNDY0LCJleHAiOjE3NTY4ODk4NjQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.PLpaFGwtj5HYk6J0eqsWVnUYBKjOqNFNyU7lnqEbgpQ	::1	curl/8.7.1	2025-09-02 16:57:44.59372+08	2025-09-02 17:02:12.301232+08	f
a48c5ae1-3adc-49c9-9c87-d300068d84ea	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUzMTI0LCJleHAiOjE3NTY4Mzk1MjQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.XhWznkccmJr6v2h17LkMTxPEbqX4DuxMhDCkbV0o9f0	::1	curl/8.7.1	2025-09-02 02:58:44.930729+08	2025-09-02 17:02:12.301232+08	f
4e2cf6d9-6c98-48a3-8227-fc19336bd83e	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUxNTIzLCJleHAiOjE3NTY4Mzc5MjMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.38WTh0NnaAqnGv-QY0Q-n9Ruqbe20weppbcL8H7PVKA	::1	curl/8.7.1	2025-09-02 02:32:03.503684+08	2025-09-02 17:02:12.301232+08	f
44a8a3c9-aa24-45eb-88a8-6261626e2430	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUyODg2LCJleHAiOjE3NTY4MzkyODYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.cElpGklfwqhEnWA5HcKOLUQiaXtYlC8VIaAKf7HBlKw	::1	curl/8.7.1	2025-09-02 02:54:46.60705+08	2025-09-02 17:02:12.301232+08	f
bcda5741-6d7e-4e52-bc18-72e8ced0d052	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUyOTEyLCJleHAiOjE3NTY4MzkzMTIsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.LSK4PFJXCQXm30ARXVDHlyMNWWmToRMXkIYK3cCxk3s	::1	curl/8.7.1	2025-09-02 02:55:12.520259+08	2025-09-02 17:02:12.301232+08	f
c783fad5-c118-40e9-a26d-c3b7ff7fe403	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUzMTgwLCJleHAiOjE3NTY4Mzk1ODAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.-6mHS3nsIeIwhABc3Hed2Ge5HfUFFIXDC0A-gb_Mths	::1	curl/8.7.1	2025-09-02 02:59:40.763886+08	2025-09-02 17:02:12.301232+08	f
e450cd3b-02c8-4fe7-b15d-183952679771	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUwODM2LCJleHAiOjE3NTY4MzcyMzYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.0-pDKji1YzOfg33BtCNr_62CP1bfBKC39dw0YKtFeSU	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 02:20:36.55834+08	2025-09-02 17:02:12.301232+08	f
0e56c952-0bcd-485f-8151-0fb055f29e9b	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzNDk2LCJleHAiOjE3NTY4ODk4OTYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.9dER-SRcA66rZYsTzE-TY4GHloHdeNSvbb-A-Vfo9ug	::1	curl/8.7.1	2025-09-02 16:58:16.125157+08	2025-09-02 17:02:12.301232+08	f
9f8b9dfc-1d48-4f6f-b03c-fd52aa1d1326	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAyNzYyLCJleHAiOjE3NTY4ODkxNjIsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.ThdCHLWPri5_2z2QYbojzlJhATE26pCxWZSwlaKN5Zs	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 16:46:02.762992+08	2025-09-02 17:02:12.301232+08	f
b37a609e-fc47-442e-85cb-500f07405b8d	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzMTUxLCJleHAiOjE3NTY4ODk1NTEsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.8BDSUDXNOKn-ngVZ2zy9FFxlJWDrP53LGG-Gr9dmFJ4	::1	curl/8.7.1	2025-09-02 16:52:31.276669+08	2025-09-02 17:02:12.301232+08	f
40576115-e49e-4927-8079-16ad2010e5c5	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUxNjI1LCJleHAiOjE3NTY4MzgwMjUsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.-aXlgTOW3xRwQ20gjPUR0SR8HtmtDvS6Fz3LeBXrmDA	::1	curl/8.7.1	2025-09-02 02:33:45.387732+08	2025-09-02 17:02:12.301232+08	f
9fb745a9-3723-4750-a4d1-59ff92a2e6e0	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUxNjMwLCJleHAiOjE3NTY4MzgwMzAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.N6D0S2BZz0anBF1B2dmlZLj47AT4N4Uk1O6avvMg5ls	::1	curl/8.7.1	2025-09-02 02:33:50.8251+08	2025-09-02 17:02:12.301232+08	f
eb456486-f1d2-4bed-9085-8b8f5611e9ae	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAyNzgxLCJleHAiOjE3NTY4ODkxODEsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.fXsND2Uo8oYOMVqBkfyxa51NB5SCFtsJUs8IbX6aqKs	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 16:46:21.081587+08	2025-09-02 17:02:12.301232+08	f
51416c75-40eb-4678-801a-719ebede4b37	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzMjY0LCJleHAiOjE3NTY4ODk2NjQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.yAfRXzSwfWI5Gnv-whs494I88yoLjJjbBOZFDlGQWVo	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 16:54:24.49938+08	2025-09-02 17:02:12.301232+08	f
4df3fff1-3920-4920-986e-944984f24ced	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUxNzE5LCJleHAiOjE3NTY4MzgxMTksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.L-mAqQo73prxlELCVGeE1sgZsknNjg5BdPBVEwki52w	::1	curl/8.7.1	2025-09-02 02:35:19.327252+08	2025-09-02 17:02:12.301232+08	f
87f67b34-ab90-4d06-b491-d1dfb1a961a8	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUzMDE5LCJleHAiOjE3NTY4Mzk0MTksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.Bl1arnlcURidcRFdnbRr9o3OySdcAwbReCjgjo2uh5U	::1	curl/8.7.1	2025-09-02 02:56:59.345767+08	2025-09-02 17:02:12.301232+08	f
d53e3133-6262-4dd7-82b0-d9e7c87b559e	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUzMjQxLCJleHAiOjE3NTY4Mzk2NDEsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.vYuw4EKTwLNcj7JX6iImpgpXlME6azbPJi0nY14Wd-E	::1	curl/8.7.1	2025-09-02 03:00:41.48048+08	2025-09-02 17:02:12.301232+08	f
5e872522-ce36-4af4-8126-581d7187c881	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzMTc2LCJleHAiOjE3NTY4ODk1NzYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.Vl-XLggtNXawzoADPpAk7v4iwgvukZ8I3HTimtRZHBk	::1	curl/8.7.1	2025-09-02 16:52:56.906781+08	2025-09-02 17:02:12.301232+08	f
36e3e8e6-9a14-4536-a947-0c8465a90315	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUzNzU0LCJleHAiOjE3NTY4NDAxNTQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.rmo_GekTRpa9mYvz8u-Xv-AASzuiPrsjWGDtdi9heVU	::1	curl/8.7.1	2025-09-02 03:09:14.022116+08	2025-09-02 17:02:12.301232+08	f
61f670a4-95e6-49f4-8a4e-87a70a74a58c	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAyNzIzLCJleHAiOjE3NTY4ODkxMjMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.REBj_EaqUWsJlpF_BQ0VADNJK98etswD1gcujVsB1zI	::1	curl/8.7.1	2025-09-02 16:45:23.224821+08	2025-09-02 17:02:12.301232+08	f
89952383-c264-445f-8e01-b4d2c4dc42b3	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAxODY4LCJleHAiOjE3NTY4ODgyNjgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.DN8D2UFrGauwclZ5dQd77I1NB2kwZU8M5rYHjPaL8Kw	::1	curl/8.7.1	2025-09-02 16:31:08.101597+08	2025-09-02 17:02:12.301232+08	f
fd873c02-a078-4216-82ea-77451d635d10	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAxODk0LCJleHAiOjE3NTY4ODgyOTQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.nq9FdFalQd-vOy8fvpiBXDTo1MGxjXme2nhw3b9k7h4	::1	curl/8.7.1	2025-09-02 16:31:34.089238+08	2025-09-02 17:02:12.301232+08	f
6db14bbc-036c-4562-a284-a9bb9ed86e5d	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2NzUyOTc4LCJleHAiOjE3NTY4MzkzNzgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.0RnQqtxcz30HeKcC4S6hrXA8q5RKJNJ1VEwudKua7pA	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 02:56:18.951344+08	2025-09-02 17:02:12.301232+08	f
7ad2934e-60ff-4e1d-954b-92a1e3ff6dcd	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA3MDg5LCJleHAiOjE3NTY4OTM0ODksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.-ewzMd9f4ck4bEltdpyxP7rKAH4OMpPB20iZuoo9kHQ	::1	curl/8.7.1	2025-09-02 17:58:09.457594+08	2025-09-02 17:58:09.457594+08	t
6e0f35c3-6248-4414-a37f-ebd524e1f9ab	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODAzNzcxLCJleHAiOjE3NTY4OTAxNzEsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.TbuYYiKUgUQX3tZ2M3wUicScALWQsy-nDyKdjhIf7zo	::1	curl/8.7.1	2025-09-02 17:02:51.994809+08	2025-09-02 17:14:50.909899+08	f
7e7a4273-8815-49e5-9caa-95cbf899cecd	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA0NTI2LCJleHAiOjE3NTY4OTA5MjYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.2z_NpazHlxeIzP55TNuffN-2l6jUiK1QevoaHHQzqoU	::1	curl/8.7.1	2025-09-02 17:15:26.053163+08	2025-09-02 17:15:26.053163+08	t
a1df3a9f-ad37-4db4-8958-d80e83c9bcc6	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA3NDE2LCJleHAiOjE3NTY4OTM4MTYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.WqggCHlfC4rLNJxrNMYQ9so5RrahwMDBOkkPIcGLGBY	::1	curl/8.7.1	2025-09-02 18:03:36.895101+08	2025-09-02 18:03:36.895101+08	t
7c62ea7b-86cc-4825-a9f9-dc88da883ca0	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODEyMTAwLCJleHAiOjE3NTY4OTg1MDAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.N0KEukCnCfYaQzLefWT3wFGfm9GnZ0uWVrAEFLABfhs	::1	curl/8.7.1	2025-09-02 19:21:40.819636+08	2025-09-02 19:21:40.819636+08	t
84416bb1-da81-4ae0-95e4-cda6ee003fa0	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA3NDQzLCJleHAiOjE3NTY4OTM4NDMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.SNtcQ5RQ637HswLhWkZrh98kyBpTleAAd2AuM3DuMHQ	::1	curl/8.7.1	2025-09-02 18:04:03.171298+08	2025-09-02 18:04:37.807213+08	t
79626ccf-3df5-496c-8c0f-aa08d2bca716	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4MDQzLCJleHAiOjE3NTY4OTQ0NDMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.l_f8i_vgRhrjuZE5-09YLvBT7FhZpeN5hHo09fUZCR8	::1	curl/8.7.1	2025-09-02 18:14:03.780007+08	2025-09-02 18:14:03.780007+08	t
a3684152-5b0b-4b5c-8098-2c16545118d7	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA5MDE5LCJleHAiOjE3NTY4OTU0MTksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.Bzu65638AW5Jd3JaZn09yFWp2nvk2sQscRKcc_7mm2E	::1	axios/1.11.0	2025-09-02 18:30:19.496751+08	2025-09-02 18:30:19.496751+08	t
8c538333-0861-422e-be2b-76707da3a699	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA5MTMyLCJleHAiOjE3NTY4OTU1MzIsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.iL7eLavvw5BqRJleSXTUUu326N3Vic_1zgcfK7sv2eg	::1	axios/1.11.0	2025-09-02 18:32:12.734272+08	2025-09-02 18:32:12.734272+08	t
d3a06719-5af7-4a5a-a8c4-0dc2f9f7dd28	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA5MjM5LCJleHAiOjE3NTY4OTU2MzksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.jFKvjbKwu25t48L-UD2VRo83WXKAEQ92CL7JNrWVEyI	::1	axios/1.11.0	2025-09-02 18:33:59.60445+08	2025-09-02 18:33:59.60445+08	t
a0bbf14d-4e29-43ac-8292-189710cbe014	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4MTU4LCJleHAiOjE3NTY4OTQ1NTgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.Px8zr6haoBOpzQaHCUsAOSjFnxti98zlve2L_6YHWEA	::1	curl/8.7.1	2025-09-02 18:15:58.707574+08	2025-09-02 18:15:58.707574+08	t
938de56d-acc8-4df9-bb33-f42232dd3a4c	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4MTYzLCJleHAiOjE3NTY4OTQ1NjMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.rvfoyCXNdz5v4IXPMn6jmfspTHl_S7QrU0U5Tf5lDNE	::1	curl/8.7.1	2025-09-02 18:16:03.340953+08	2025-09-02 18:16:03.340953+08	t
9c6aa02c-f363-4b98-8cae-11e94ce41a6b	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4MTcwLCJleHAiOjE3NTY4OTQ1NzAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.1w67Y3csrbYJvZpqU8MczCNoIiAbWPbV7gJgUqtSFM4	::1	curl/8.7.1	2025-09-02 18:16:10.235469+08	2025-09-02 18:16:10.235469+08	t
d1cca70c-712e-4de2-9e91-ce7d9d82aa8b	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4MTgwLCJleHAiOjE3NTY4OTQ1ODAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.FAZvYtN4ZHKcUWEajpZBZhQcx0bhQKBKNKJ7-b0qRiw	::1	curl/8.7.1	2025-09-02 18:16:20.943641+08	2025-09-02 18:16:20.943641+08	t
97dde141-ebde-415c-8031-d6dcc7af6857	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4MTkwLCJleHAiOjE3NTY4OTQ1OTAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.YTrbo8co3y2vIhlPMQa2TdaKDPhvaEIOURIO8tAciss	::1	curl/8.7.1	2025-09-02 18:16:30.83022+08	2025-09-02 18:16:30.83022+08	t
923a4e9f-818e-443f-b757-3d6ec26ca732	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4MTk4LCJleHAiOjE3NTY4OTQ1OTgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.78A65y9q_WeuC25Y12CbMgJC7zQicrxMXZQbzv6i3yY	::1	curl/8.7.1	2025-09-02 18:16:38.892885+08	2025-09-02 18:16:38.892885+08	t
b12d8e27-9b43-4616-a916-f250335583ba	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4MjMyLCJleHAiOjE3NTY4OTQ2MzIsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.rLGFE9yaGpJk3YU8vktsBGnrhQgGXoWPAY4o4JfYrqU	::1	curl/8.7.1	2025-09-02 18:17:12.699168+08	2025-09-02 18:17:12.699168+08	t
82a2e946-5061-47f3-b582-ef24b41ba7ed	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA5MDg4LCJleHAiOjE3NTY4OTU0ODgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.r6Hv7vzcOR05J1bnUDk5Jb9iS7gt7bgr5CQG_T6l1Nc	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 18:31:28.894961+08	2025-09-02 18:31:28.894961+08	t
c511afb9-7496-4164-958b-6a869629e051	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA5MDk4LCJleHAiOjE3NTY4OTU0OTgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.C5ysPuYGf2v_MZLYvnAMtJnQ7FsgrSa_7qSx5ZzV7wo	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 18:31:38.564272+08	2025-09-02 18:31:38.564272+08	t
1b0fa8c7-5889-4a37-ae0f-a57fe66c7145	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA5MTUwLCJleHAiOjE3NTY4OTU1NTAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.XVzov2yKdToWAOQdqSiLdO5eH69pyoy3gFAcKGz7ijA	::1	curl/8.7.1	2025-09-02 18:32:30.742339+08	2025-09-02 18:32:30.742339+08	t
b939e823-c8f1-4b78-87a7-e94196b52399	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA5MTY5LCJleHAiOjE3NTY4OTU1NjksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.5nU4thj-9WrJHlBqGZgeiSwusW0Lf951fpH-itu8fKs	::1	axios/1.11.0	2025-09-02 18:32:49.678437+08	2025-09-02 18:32:49.678437+08	t
c58ab8ad-7ca4-47c4-8217-c6d553006575	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4MzE4LCJleHAiOjE3NTY4OTQ3MTgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.W1CAPqXrlGlw_tEeFFMBP2jO1hPPUPM5ORLuLNaByKM	::1	curl/8.7.1	2025-09-02 18:18:38.217572+08	2025-09-02 18:24:50.955558+08	t
9fcc070e-07fe-4dce-af10-ddbaf71508f5	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA5MjY5LCJleHAiOjE3NTY4OTU2NjksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.cZxIfOHinlpZQCjEkzJE-370lPZgIay6UEjO8Ix8rtc	::1	axios/1.11.0	2025-09-02 18:34:29.598878+08	2025-09-02 18:34:29.598878+08	t
41459b08-aba2-4c9d-9ad2-81bd35f07581	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA5Mjc3LCJleHAiOjE3NTY4OTU2NzcsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.VK8tTxtId8dlRU_8OzV3GR8QOER_CozrWfBSr5vPAKg	::1	axios/1.11.0	2025-09-02 18:34:37.139997+08	2025-09-02 18:34:37.139997+08	t
a275d1b3-687d-469a-93a0-9a2238ee97ac	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE4NTQzLCJleHAiOjE3NTY5MDQ5NDMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.03SbhAloE4Y5btE7OLFRCi5Dp3yZfE6GHTKhJ5Rc_q4	::1	curl/8.7.1	2025-09-02 21:09:03.277509+08	2025-09-02 21:09:03.277509+08	t
506bac27-c966-4a1d-b113-55ab285920f5	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA5MzA3LCJleHAiOjE3NTY4OTU3MDcsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.gLFKnpKavwl0uxpJAAkoenCrBzgwdmfSIGoCT4BSZgY	::1	axios/1.11.0	2025-09-02 18:35:07.085237+08	2025-09-02 18:35:07.085237+08	t
e343d866-985e-4f84-b30c-c064cb8edd72	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE4NTY5LCJleHAiOjE3NTY5MDQ5NjksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.zlmO5bS0WWFNDsA-IVTLJYPog_Om9uSPudEhpjinACw	::1	curl/8.7.1	2025-09-02 21:09:29.370129+08	2025-09-02 21:09:29.381368+08	t
bfe36067-a1f1-4d1c-8ab3-70a0155cd1cc	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODI1OTc1LCJleHAiOjE3NTY5MTIzNzUsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.hZNmsbYHoLvNPScJ0pt0HFUZw-36ZFEufFdi1haldCo	::1	curl/8.7.1	2025-09-02 23:12:55.987792+08	2025-09-02 23:12:56.00408+08	t
5e1ae2b3-bf65-4c56-bdc5-4f439bff9975	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE0NjY1LCJleHAiOjE3NTY5MDEwNjUsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.2yZis8MkzNT6vcdnOMER1maJziK7ngB-EhTFpVInqAc	::1	curl/8.7.1	2025-09-02 20:04:25.760697+08	2025-09-02 20:04:25.760697+08	t
36148d22-4f5f-4423-b24a-04ef7af33c15	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODExMzUwLCJleHAiOjE3NTY4OTc3NTAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.ngvVs-Ak4Ehy95dkp9JIX6LQYQWWuWiI9dHHiod_slk	::1	curl/8.7.1	2025-09-02 19:09:10.955955+08	2025-09-02 19:09:10.955955+08	t
b31ad378-46d4-42ec-b544-42d62699864b	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODExMzU4LCJleHAiOjE3NTY4OTc3NTgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.71Nrf3tW4rnq3J-TuucSXmXO5DEt4wZ9j41JjT3sxic	::1	curl/8.7.1	2025-09-02 19:09:18.471098+08	2025-09-02 19:09:18.471098+08	t
a2726d59-fcb1-4241-93d2-b98b78e8f878	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODExNDQ5LCJleHAiOjE3NTY4OTc4NDksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.p6q2z1b75CHnye9g4u9Xj0U1UAgq-x5C6Tk1mjQ3ZSE	::1	curl/8.7.1	2025-09-02 19:10:49.491656+08	2025-09-02 19:10:49.491656+08	t
8ae4879a-9575-43fa-bf60-273ac744c657	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODExNDU3LCJleHAiOjE3NTY4OTc4NTcsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.x-Yx6eS0L0-IdbYjE6ZXK8owVGh5zYq0opRuvAQO1BU	::1	curl/8.7.1	2025-09-02 19:10:57.782254+08	2025-09-02 19:10:57.782254+08	t
aab39ed9-00af-459d-b6ba-6c802e66101c	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODExNDgxLCJleHAiOjE3NTY4OTc4ODEsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.kyJtVAc1BX58nAcS-vuVrdXqgM4_Fg_XafR4BBF5BnM	::1	curl/8.7.1	2025-09-02 19:11:21.388241+08	2025-09-02 19:11:21.388241+08	t
3215e408-bb06-48d4-9b31-68ecee4514d1	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODExNjQ2LCJleHAiOjE3NTY4OTgwNDYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.rRyvYTFgviGn_S-FMG3Uoll3HZsKjXFWi0OWpjGY82o	::1	curl/8.7.1	2025-09-02 19:14:06.391839+08	2025-09-02 19:14:06.391839+08	t
e780db6a-161f-4427-8d9a-9f5a7afdeb2f	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE4NzA1LCJleHAiOjE3NTY5MDUxMDUsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.hZR5loNUK2gWnofj217Sh16S9cyHWI6FoP5u3vtSobM	::1	curl/8.7.1	2025-09-02 21:11:45.607359+08	2025-09-02 21:11:45.607359+08	t
8ad6573d-003a-4916-95bd-3c0cd8594568	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE4NzI5LCJleHAiOjE3NTY5MDUxMjksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.ox3daCl2bO5go2Ivm1FybcdMsRvYBUhyaBxBSmdmuHE	::1	curl/8.7.1	2025-09-02 21:12:09.523464+08	2025-09-02 21:12:09.523464+08	t
7bdab34c-7d45-46ba-b77a-b0c636a21ad9	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE4NzM0LCJleHAiOjE3NTY5MDUxMzQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.oY1m4nK_Kapon05BDESDpdrFegtCpTSpbkP8CrKy2rs	::1	curl/8.7.1	2025-09-02 21:12:14.6163+08	2025-09-02 21:12:14.6163+08	t
282b78b9-55a1-43a5-be23-9b47964f6408	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE0NjkyLCJleHAiOjE3NTY5MDEwOTIsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.U9wGVxozmrJPF9X7g73v-8wZgfk_0nICkGYeIEL2vt0	::1	curl/8.7.1	2025-09-02 20:04:52.814471+08	2025-09-02 20:04:52.824401+08	t
4c5dfb7f-146c-443e-980c-106af94bc1d2	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE1NTczLCJleHAiOjE3NTY5MDE5NzMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.pY-iogEveWuDlDxG6DLSUnJAsMce1lSSbiJsn1s6ALg	::1	curl/8.7.1	2025-09-02 20:19:33.183846+08	2025-09-02 20:19:33.183846+08	t
59ca57c0-b260-4445-b1a2-e908c4e69d51	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE4Nzk5LCJleHAiOjE3NTY5MDUxOTksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.cmfUhSAS_0iy1n9m-xed5uC6yJa01Yaj9AN6L2fRNX8	::1	curl/8.7.1	2025-09-02 21:13:19.132811+08	2025-09-02 21:13:19.132811+08	t
6ed3f846-23e1-4da9-a50a-2cca82cd4c7f	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE4ODA0LCJleHAiOjE3NTY5MDUyMDQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.UoY57w5mAj63CvzvvqSQdtHnAJ-YJe3tl97AnMm94p0	::1	curl/8.7.1	2025-09-02 21:13:24.015425+08	2025-09-02 21:13:24.015425+08	t
e03d3252-648e-4c83-985f-795877c095aa	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODExODE4LCJleHAiOjE3NTY4OTgyMTgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.3XHUUhzV-eb3tf5VHYUhb88o7ZP3TN4iRsBQ2NrlZZo	::1	curl/8.7.1	2025-09-02 19:16:58.055762+08	2025-09-02 19:16:58.055762+08	t
6249fbf4-3d1d-4b42-bffc-7079b9ef1516	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE1NjQ0LCJleHAiOjE3NTY5MDIwNDQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.3WpXkhZbOEpodZn_N1-Q0-oEFlHxMK9Q7oSBNb_bhsY	::1	curl/8.7.1	2025-09-02 20:20:44.466248+08	2025-09-02 20:20:44.466248+08	t
5551d11c-9ac6-4f93-8907-524d25042d3d	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE1NjUzLCJleHAiOjE3NTY5MDIwNTMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.3GF2A6BhoI-RC24SPdW_Pe8SDn6UxI5UglI_B6pq5co	::1	curl/8.7.1	2025-09-02 20:20:53.382254+08	2025-09-02 20:20:53.382254+08	t
37b706e0-0345-40ac-819c-8c6408dcd53a	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE1NjY0LCJleHAiOjE3NTY5MDIwNjQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.Js-bfJQQadu8KLEgKr-kswuHKGtPcNlMqrGlwn_J_00	::1	curl/8.7.1	2025-09-02 20:21:04.461615+08	2025-09-02 20:21:04.461615+08	t
9b85e257-016b-48e5-b6dc-f537a95379ed	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE4ODA5LCJleHAiOjE3NTY5MDUyMDksImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.wCIS8bvrRVuYQzgnp2Sr04pUpocvtMHS2VcaoXR_oHk	::1	curl/8.7.1	2025-09-02 21:13:29.032028+08	2025-09-02 21:13:29.032028+08	t
866f17c4-4f4f-4d31-b0c4-8de1a247953e	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE4ODIwLCJleHAiOjE3NTY5MDUyMjAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.NLyqZ49QkIzUxWkw4Ylt6ti0TWI81Dsd4idsp0hmYds	::1	curl/8.7.1	2025-09-02 21:13:40.44698+08	2025-09-02 21:13:40.44698+08	t
26ce6582-4c99-4001-9528-9738702dd1f7	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODEyNjQ2LCJleHAiOjE3NTY4OTkwNDYsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.V8dnFegPASd3fjsmq4OQKokRdlE_yEhC8bPdo0sf8_k	::1	curl/8.7.1	2025-09-02 19:30:46.928139+08	2025-09-02 19:30:46.928139+08	t
e7ec1097-076d-4099-84d4-c20844f27df8	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE5NzcwLCJleHAiOjE3NTY5MDYxNzAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.l7_3kL7BgQdlybBsrDNnnhmsCZEo3V7xl35mtj4AtXk	::1	curl/8.7.1	2025-09-02 21:29:30.266184+08	2025-09-02 21:29:30.279065+08	t
f657ee8b-baa5-4667-b497-764f6e5a2003	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODIwOTgzLCJleHAiOjE3NTY5MDczODMsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.ZjPszm-ydLmz9x1Cv_bHMV-RN8Kl1lp0YEoQP6Z5Kd8	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-02 21:49:43.149738+08	2025-09-02 23:29:03.523849+08	t
d8cbc65f-0dcd-4284-ab7d-50addfba9abd	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODEyNjkwLCJleHAiOjE3NTY4OTkwOTAsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.y1x3Gf_OJQnPYxP1Xymrqth2mUd5j3enVecclJIiih8	::1	curl/8.7.1	2025-09-02 19:31:30.031951+08	2025-09-02 19:31:30.031951+08	t
0945e705-5ce0-4b57-9faf-62cf5965c0d0	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODEyNjk4LCJleHAiOjE3NTY4OTkwOTgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.ZvJiZ87cDDsrJa39YgbZ22bJkUlWx3a5xXNG3_ebxDs	::1	curl/8.7.1	2025-09-02 19:31:38.010905+08	2025-09-02 19:31:38.010905+08	t
3b18854b-1cba-4853-90ec-9a2519ab2554	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODIwNDc0LCJleHAiOjE3NTY5MDY4NzQsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.ldivB30wJRWqqS5wr6ucG3FsYLUGO5uNz7_mM8_7xSM	::1	curl/8.7.1	2025-09-02 21:41:14.82268+08	2025-09-02 21:41:14.82268+08	t
13cf26d8-66e2-413c-b9a2-a792b50fae9b	980ff3a6-161d-49d6-9373-454d1e3cf4c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODE2NTA3LCJleHAiOjE3NTY5MDI5MDcsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.LgJs0oF0Q6CytCP7VhrAj4Y7otCXj0Mw59kfbwxiiGY	::1	curl/8.7.1	2025-09-02 20:35:07.943567+08	2025-09-02 20:36:04.973281+08	t
\.


--
-- TOC entry 4327 (class 0 OID 34422)
-- Dependencies: 224
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admins (id, username, email, password_hash, role, status, last_login, created_at, updated_at, department_id, position_id, last_login_at, name, phone) FROM stdin;
fb9d5e25-7a11-439e-997e-80d9c49087a3	updatedadmin	updated@admin.com	$2a$12$9vPUF3UrFIthu94zAShaW.U6tUKPh6Bj6hdigc1p0NUlghCjnpOmC	admin	inactive	\N	2025-08-28 15:21:08.920763+08	2025-08-28 15:21:18.979508+08	\N	\N	\N	\N	\N
833cf35a-0114-4d5c-aead-886d500a1570	customerservice111	cs@tronrental.com	$2b$10$LG8H0qZx.ovbat.5jRJ/G.pHvgcN58ODSwLOtQoQxOJOfiv72otBu	customer_service	active	\N	2025-08-28 18:52:41.584155+08	2025-09-02 23:03:11.541597+08	\N	\N	\N	\N	\N
980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	admin@tronrental.com	$2a$12$JV0X/zw6AEtYHJ71HM29IO5Vr3jHcM6KED/1o6P.Dz9SerwfeIFIe	super_admin	active	2025-09-02 23:12:55.97645+08	2025-08-28 14:44:32.807375+08	2025-09-02 23:12:55.97645+08	\N	\N	2025-09-02 23:12:55.97645	\N	\N
3d97a67a-71d8-4891-9ef8-5fe25c557ac5	testloguser7	testlog7@example.com	$2b$10$8oLLeJlqjrhsF62pbukQG.ZhlsDReqMJBv8/tVsdp4EjGQ7sTUdKW	admin	active	\N	2025-09-01 22:03:32.860377+08	2025-09-01 22:03:32.860377+08	\N	\N	\N	\N	\N
\.


--
-- TOC entry 4319 (class 0 OID 28384)
-- Dependencies: 215
-- Data for Name: agent_applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_applications (id, user_id, application_reason, contact_info, experience_description, status, reviewed_by, reviewed_at, review_notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4320 (class 0 OID 28406)
-- Dependencies: 216
-- Data for Name: agent_earnings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_earnings (id, agent_id, order_id, user_id, commission_rate, commission_amount, order_amount, status, paid_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4318 (class 0 OID 28358)
-- Dependencies: 214
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agents (id, user_id, agent_code, commission_rate, status, total_earnings, total_orders, total_customers, approved_at, approved_by, created_at, updated_at) FROM stdin;
d72e501e-656a-4e79-b859-0c1a09c90cc4	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	AGENT002	0.1500	pending	0.000000	0	0	\N	\N	2025-08-28 17:41:12.173474+08	2025-08-28 17:41:12.173474+08
2904d630-be20-4be0-b483-e73b4814be28	c380caa5-b04c-4f1a-a4e8-3cc7cc301021	AGENT001	0.2000	active	0.000000	0	0	\N	\N	2025-08-28 15:10:30.252394+08	2025-08-29 22:19:34.918276+08
ad9202e1-7c0a-4f34-b082-ed91b7f6b7f4	7aed0f04-a936-4702-9ff8-beae6ec8f655	AGENT003	0.1500	active	0.000000	0	0	\N	\N	2025-08-29 22:29:27.627825+08	2025-08-29 22:29:27.627825+08
702888b3-5b2e-4d96-bbc5-3334a65cd094	e2c6f1de-8d9a-454b-a292-9f83c618dda9	AGENT004	0.1800	active	0.000000	0	0	\N	\N	2025-08-29 22:29:39.232277+08	2025-08-29 22:29:39.232277+08
\.


--
-- TOC entry 4321 (class 0 OID 28431)
-- Dependencies: 217
-- Data for Name: bot_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bot_users (id, bot_id, user_id, telegram_chat_id, status, last_interaction_at, settings, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4333 (class 0 OID 35046)
-- Dependencies: 230
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, name, code, parent_id, level, sort_order, leader_id, phone, email, status, description, created_at, updated_at) FROM stdin;
2	技术部	TECH_DEPT	1	2	1	\N	\N	\N	1	负责系统开发和技术支持	2025-09-01 13:52:52.087949	2025-09-01 13:52:52.087949
3	运营部	OPERATION_DEPT	1	2	2	\N	\N	\N	1	负责业务运营和客户服务	2025-09-01 13:52:52.087949	2025-09-01 13:52:52.087949
4	财务部	FINANCE_DEPT	1	2	3	\N	\N	\N	1	负责财务管理和资金结算	2025-09-01 13:52:52.087949	2025-09-01 13:52:52.087949
5	市场部	MARKETING_DEPT	1	2	4	\N	\N	\N	1	负责市场推广和商务合作	2025-09-01 13:52:52.087949	2025-09-01 13:52:52.087949
7	测试部门	TEST_DEPT	1	2	0	\N	\N	\N	1	测试新增部门功能	2025-09-01 21:29:35.536126	2025-09-01 21:29:35.536126
9	新测试部门	NEW_TEST_DEPT_001	10	2	1	\N	\N	\N	1	新测试部门描述	2025-09-01 21:36:22.301133	2025-09-01 21:44:41.392
10	新测试部门	NEW_TEST_DEPT	1	2	0	\N	\N	\N	1	新测试部门描述	2025-09-01 21:44:19.250702	2025-09-01 21:44:59.033
1	总公司	HEAD_OFFICE	\N	1	1	\N	\N	\N	1	TRON能量租赁系统总公司	2025-09-01 13:52:52.087949	2025-09-01 21:45:19.249
11	12312	123123	9	3	0	\N	\N	\N	0	\N	2025-09-01 22:13:33.769239	2025-09-01 22:13:37.92
12	新测试部门	NEW_TEST_DEPT_$(date +%s)	\N	1	1	\N	\N	\N	1	这是一个新的测试部门	2025-09-01 22:45:28.780824	2025-09-01 22:45:28.780824
13	前端测试部门	FRONTEND_TEST_$(date +%s)	\N	1	1	\N	\N	\N	1	通过前端代理测试	2025-09-01 22:48:39.607436	2025-09-01 22:48:39.607436
\.


--
-- TOC entry 4326 (class 0 OID 34355)
-- Dependencies: 222
-- Data for Name: energy_consumption_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.energy_consumption_logs (id, pool_account_id, energy_amount, cost_amount, transaction_type, order_id, telegram_user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4322 (class 0 OID 28456)
-- Dependencies: 218
-- Data for Name: energy_pools; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.energy_pools (id, name, tron_address, private_key_encrypted, total_energy, available_energy, reserved_energy, status, last_updated_at, created_at, updated_at, account_type, priority, cost_per_energy, description, contact_info, daily_limit, monthly_limit) FROM stdin;
550e8400-e29b-41d4-a716-446655440021	主能量池2	TYour2MainPoolAddressHere123456789	encrypted_private_key_here_2	10000000	10000000	0	maintenance	2025-08-28 15:16:22.938697+08	2025-08-27 09:18:42.099478+08	2025-08-28 16:09:10.604225+08	own_energy	1	0.001000	\N	\N	\N	\N
0c0ea0b0-1c53-4881-aae2-19928f1b1a97	测试代理商账户	TTestAgentAddress123456789012345	encrypted_test_key_here	5000000	5000000	0	inactive	2025-08-28 16:52:09.88964+08	2025-08-28 12:38:47.834256+08	2025-08-28 16:52:09.88964+08	agent_energy	1	0.001000	\N	\N	\N	\N
550e8400-e29b-41d4-a716-446655440020	主能量池11111111111111	TYour1MainPoolAddressHere123456789	encrypted_private_key_here_1	10000000	10000000	0	active	2025-08-28 20:09:28.538167+08	2025-08-27 09:18:42.099478+08	2025-08-28 20:09:28.538167+08	own_energy	1	0.001000	\N	\N	\N	\N
\.


--
-- TOC entry 4323 (class 0 OID 28474)
-- Dependencies: 219
-- Data for Name: energy_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.energy_transactions (id, order_id, pool_id, from_address, to_address, energy_amount, tx_hash, status, block_number, gas_used, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4345 (class 0 OID 35160)
-- Dependencies: 242
-- Data for Name: login_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.login_logs (id, user_id, username, ip_address, user_agent, login_time, logout_time, status, message, location) FROM stdin;
1	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 14:43:48.764859	\N	1	\N	\N
2	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 14:56:14.695248	\N	1	\N	\N
3	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 14:56:23.287683	\N	1	\N	\N
4	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 15:15:05.515344	\N	1	\N	\N
5	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 15:17:33.146097	\N	1	\N	\N
6	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 15:17:44.068281	\N	1	\N	\N
7	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 15:32:36.880622	\N	1	\N	\N
8	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:35:10.533348	\N	1	\N	\N
9	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:37:32.059847	\N	1	\N	\N
10	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:39:30.037755	\N	1	\N	\N
11	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 15:39:42.291534	\N	1	\N	\N
12	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 15:40:07.101119	\N	1	\N	\N
13	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-01 15:40:45.193281	\N	1	\N	\N
14	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 15:42:40.924626	\N	1	\N	\N
15	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:44:23.307278	\N	1	\N	\N
16	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:44:51.376458	\N	1	\N	\N
17	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:44:58.946239	\N	1	\N	\N
18	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:45:34.218667	\N	1	\N	\N
19	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:45:41.709392	\N	1	\N	\N
20	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:45:49.777456	\N	1	\N	\N
21	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:45:58.177334	\N	1	\N	\N
22	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Wget/1.25.0	2025-09-01 15:46:07.082113	\N	1	\N	\N
23	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:46:14.892859	\N	1	\N	\N
24	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	unknown	2025-09-01 15:46:47.707671	\N	1	\N	\N
25	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:49:29.05168	\N	1	\N	\N
26	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 15:50:39.246371	\N	1	\N	\N
27	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:10:02.529022	\N	1	\N	\N
28	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:12:56.737624	\N	1	\N	\N
29	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:13:25.281859	\N	1	\N	\N
30	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-01 16:19:19.961206	\N	1	\N	\N
31	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:21:05.134345	\N	1	\N	\N
32	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:21:38.084741	\N	1	\N	\N
33	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:23:06.268335	\N	1	\N	\N
34	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:23:26.928361	\N	1	\N	\N
35	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:24:15.399572	\N	1	\N	\N
36	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:24:54.351307	\N	1	\N	\N
37	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:25:25.248379	\N	1	\N	\N
38	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:25:44.819395	\N	1	\N	\N
39	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:25:51.385141	\N	1	\N	\N
40	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:27:05.077941	\N	1	\N	\N
41	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:27:11.474251	\N	1	\N	\N
42	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:27:17.839405	\N	1	\N	\N
43	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:28:52.662444	\N	1	\N	\N
44	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:32:47.006128	\N	1	\N	\N
45	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:37:18.340434	\N	1	\N	\N
46	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:38:13.325517	\N	1	\N	\N
47	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 16:53:06.191236	\N	1	\N	\N
48	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 16:53:32.412465	\N	1	\N	\N
49	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 16:54:10.617248	\N	1	\N	\N
50	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 16:55:56.770123	\N	1	\N	\N
51	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-01 16:57:29.323669	\N	1	\N	\N
52	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:01:11.192247	\N	1	\N	\N
53	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:02:46.226445	\N	1	\N	\N
54	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:02:53.005715	\N	1	\N	\N
55	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:09:03.475719	\N	1	\N	\N
56	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:09:15.072315	\N	1	\N	\N
57	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:19:27.272738	\N	1	\N	\N
58	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:20:49.108197	\N	1	\N	\N
59	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:22:06.698925	\N	1	\N	\N
60	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:23:47.992642	\N	1	\N	\N
61	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:25:17.00498	\N	1	\N	\N
62	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:26:50.064106	\N	1	\N	\N
63	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:29:05.266583	\N	1	\N	\N
64	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:29:11.563235	\N	1	\N	\N
65	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:29:17.405691	\N	1	\N	\N
66	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:29:28.213027	\N	1	\N	\N
67	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:30:25.297415	\N	1	\N	\N
68	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:30:31.429232	\N	1	\N	\N
69	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:31:30.108017	\N	1	\N	\N
70	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:49:07.335183	\N	1	\N	\N
71	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:49:39.33703	\N	1	\N	\N
72	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:50:05.373554	\N	1	\N	\N
73	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:50:11.879324	\N	1	\N	\N
74	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:50:34.969286	\N	1	\N	\N
75	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:50:40.835208	\N	1	\N	\N
76	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:50:49.939992	\N	1	\N	\N
77	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:51:21.318195	\N	1	\N	\N
78	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:52:09.561057	\N	1	\N	\N
79	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:52:15.522053	\N	1	\N	\N
80	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:52:45.229473	\N	1	\N	\N
81	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:53:44.906005	\N	1	\N	\N
82	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:53:54.086424	\N	1	\N	\N
83	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 17:54:40.3295	\N	1	\N	\N
84	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 18:06:44.35354	\N	1	\N	\N
85	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 18:12:46.117731	\N	1	\N	\N
86	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:20:18.525539	\N	1	\N	\N
87	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:20:33.086905	\N	1	\N	\N
88	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:20:39.421163	\N	1	\N	\N
89	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:23:51.451941	\N	1	\N	\N
90	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:24:30.46816	\N	1	\N	\N
91	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:24:38.653135	\N	1	\N	\N
92	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:24:45.368939	\N	1	\N	\N
93	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:24:51.13789	\N	1	\N	\N
94	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:28:02.210193	\N	1	\N	\N
95	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:28:34.181613	\N	1	\N	\N
96	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:28:42.932503	\N	1	\N	\N
97	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:28:50.056499	\N	1	\N	\N
98	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:28:55.863464	\N	1	\N	\N
99	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:29:50.631186	\N	1	\N	\N
100	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:32:00.917909	\N	1	\N	\N
101	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:32:37.876252	\N	1	\N	\N
102	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:36:51.397549	\N	1	\N	\N
103	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:37:51.551983	\N	1	\N	\N
104	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:42:48.839117	\N	1	\N	\N
105	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:43:18.942207	\N	1	\N	\N
106	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 18:51:23.237053	\N	1	\N	\N
107	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 18:54:02.960264	\N	1	\N	\N
108	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 18:58:37.01264	\N	1	\N	\N
109	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:03:41.185151	\N	1	\N	\N
110	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:05:35.057984	\N	1	\N	\N
111	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:05:40.357991	\N	1	\N	\N
112	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:07:11.483097	\N	1	\N	\N
113	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:07:20.288304	\N	1	\N	\N
114	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:08:03.841311	\N	1	\N	\N
115	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:08:33.844621	\N	1	\N	\N
116	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:08:54.060256	\N	1	\N	\N
117	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 19:13:47.900448	\N	1	\N	\N
118	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:14:12.795552	\N	1	\N	\N
119	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:14:45.238762	\N	1	\N	\N
120	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:15:00.159521	\N	1	\N	\N
121	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:15:08.567214	\N	1	\N	\N
122	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:17:38.830799	\N	1	\N	\N
123	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 19:19:04.689036	\N	1	\N	\N
124	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:19:53.700811	\N	1	\N	\N
125	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 19:21:43.993446	\N	1	\N	\N
126	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:23:36.505421	\N	1	\N	\N
127	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-01 19:23:47.687698	\N	1	\N	\N
128	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:25:57.882791	\N	1	\N	\N
129	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:31:34.819521	\N	1	\N	\N
130	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:31:41.293883	\N	1	\N	\N
131	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:31:47.277348	\N	1	\N	\N
132	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 19:31:47.290317	\N	1	\N	\N
133	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 19:33:27.21849	\N	1	\N	\N
134	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:38:23.25441	\N	1	\N	\N
135	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:38:56.386971	\N	1	\N	\N
136	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 19:41:51.022525	\N	1	\N	\N
137	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 19:47:56.190718	\N	1	\N	\N
138	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 19:48:53.260013	\N	1	\N	\N
139	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 20:29:50.642639	\N	1	\N	\N
140	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 20:53:17.261467	\N	1	\N	\N
141	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 20:55:38.885544	\N	1	\N	\N
142	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 20:55:44.321607	\N	1	\N	\N
143	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 20:55:50.31154	\N	1	\N	\N
144	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:01:15.072152	\N	1	\N	\N
145	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-01 21:15:48.038332	\N	1	\N	\N
146	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:27:18.74303	\N	1	\N	\N
147	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:27:50.619325	\N	1	\N	\N
148	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:28:00.298593	\N	1	\N	\N
149	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:28:09.354619	\N	1	\N	\N
150	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:28:17.836893	\N	1	\N	\N
151	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:28:57.228744	\N	1	\N	\N
152	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:29:27.72815	\N	1	\N	\N
153	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:29:35.521898	\N	1	\N	\N
154	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:29:41.951916	\N	1	\N	\N
155	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:36:15.387773	\N	1	\N	\N
156	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:36:22.289434	\N	1	\N	\N
157	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 21:39:08.35056	\N	1	\N	\N
158	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:42:29.397343	\N	1	\N	\N
159	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:42:36.115657	\N	1	\N	\N
160	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:42:41.691542	\N	1	\N	\N
161	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:42:47.585083	\N	1	\N	\N
162	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:42:57.17633	\N	1	\N	\N
163	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:43:35.734426	\N	1	\N	\N
164	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:43:42.606837	\N	1	\N	\N
165	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:43:48.963749	\N	1	\N	\N
166	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:43:59.366199	\N	1	\N	\N
167	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:44:05.168829	\N	1	\N	\N
168	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:44:11.954694	\N	1	\N	\N
169	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:44:19.237681	\N	1	\N	\N
170	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:49:19.694126	\N	1	\N	\N
171	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:49:27.968262	\N	1	\N	\N
172	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:51:48.998282	\N	1	\N	\N
173	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:52:20.973004	\N	1	\N	\N
174	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:52:38.604956	\N	1	\N	\N
175	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:52:48.463252	\N	1	\N	\N
176	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:53:12.801205	\N	1	\N	\N
177	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:58:06.645761	\N	1	\N	\N
178	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:58:39.118839	\N	1	\N	\N
179	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 21:59:13.215568	\N	1	\N	\N
180	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:00:03.662118	\N	1	\N	\N
181	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:00:09.457038	\N	1	\N	\N
182	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:01:05.236327	\N	1	\N	\N
183	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:01:10.907016	\N	1	\N	\N
184	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:01:41.686476	\N	1	\N	\N
185	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:01:47.493196	\N	1	\N	\N
186	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:01:59.58755	\N	1	\N	\N
187	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:02:21.876886	\N	1	\N	\N
188	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:02:28.312218	\N	1	\N	\N
189	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:02:51.419346	\N	1	\N	\N
190	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:03:03.898216	\N	1	\N	\N
191	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:03:09.62901	\N	1	\N	\N
192	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:03:20.767166	\N	1	\N	\N
193	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:08:19.610331	\N	1	\N	\N
194	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:08:28.69145	\N	1	\N	\N
195	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:09:38.28467	\N	1	\N	\N
196	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:09:45.320587	\N	1	\N	\N
197	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:09:53.310186	\N	1	\N	\N
198	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:10:02.387272	\N	1	\N	\N
199	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 22:11:22.488232	\N	1	\N	\N
200	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 22:12:52.665012	\N	1	\N	\N
201	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:21:59.56296	\N	1	\N	\N
202	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:30:18.031717	\N	1	\N	\N
203	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:37:07.472839	\N	1	\N	\N
204	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:37:07.476709	\N	1	\N	\N
205	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:37:38.689933	\N	1	\N	\N
206	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:38:25.325054	\N	1	\N	\N
207	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:42:43.419379	\N	1	\N	\N
208	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:42:53.67562	\N	1	\N	\N
209	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:43:03.885878	\N	1	\N	\N
210	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:43:19.804084	\N	1	\N	\N
211	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:44:11.370873	\N	1	\N	\N
212	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:44:39.050384	\N	1	\N	\N
213	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:44:44.964166	\N	1	\N	\N
214	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:44:57.668019	\N	1	\N	\N
215	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:46:17.755869	\N	1	\N	\N
216	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:47:22.097099	\N	1	\N	\N
217	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 22:52:10.345981	\N	1	\N	\N
218	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:54:00.197532	\N	1	\N	\N
219	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:54:07.445518	\N	1	\N	\N
220	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:58:39.850942	\N	1	\N	\N
221	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-01 22:59:20.211542	\N	1	\N	\N
222	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-01 23:00:12.425615	\N	1	\N	\N
223	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:12:40.395972	\N	1	\N	\N
224	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 00:17:02.535458	\N	1	\N	\N
225	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:18:09.658307	\N	1	\N	\N
226	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:27:55.835773	\N	1	\N	\N
227	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:28:58.793497	\N	1	\N	\N
228	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:30:01.171133	\N	1	\N	\N
229	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:30:06.746294	\N	1	\N	\N
230	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:30:16.891666	\N	1	\N	\N
231	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:30:54.491459	\N	1	\N	\N
232	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:32:22.431059	\N	1	\N	\N
233	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:32:50.900258	\N	1	\N	\N
234	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:33:01.176309	\N	1	\N	\N
235	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:33:46.97944	\N	1	\N	\N
236	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:33:52.975471	\N	1	\N	\N
237	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:34:09.043664	\N	1	\N	\N
238	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:36:52.369482	\N	1	\N	\N
239	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:36:58.849809	\N	1	\N	\N
240	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:37:11.236144	\N	1	\N	\N
241	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:39:43.766942	\N	1	\N	\N
242	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:43:57.987399	\N	1	\N	\N
243	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:46:03.667271	\N	1	\N	\N
244	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:47:41.298339	\N	1	\N	\N
245	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 00:47:42.412595	\N	1	\N	\N
246	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:52:57.659872	\N	1	\N	\N
247	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:53:06.718385	\N	1	\N	\N
248	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:53:16.490736	\N	1	\N	\N
249	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:53:25.309217	\N	1	\N	\N
250	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:56:18.173833	\N	1	\N	\N
251	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 00:57:28.565414	\N	1	\N	\N
252	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 01:02:01.912976	\N	1	\N	\N
253	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-02 01:02:54.146096	\N	1	\N	\N
254	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 01:07:45.995628	\N	1	\N	\N
255	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:12:07.607178	\N	1	\N	\N
256	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:12:22.609497	\N	1	\N	\N
257	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 01:13:18.852646	\N	1	\N	\N
258	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:13:46.871937	\N	1	\N	\N
259	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:13:58.948103	\N	1	\N	\N
260	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:14:15.406599	\N	1	\N	\N
261	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:14:26.036136	\N	1	\N	\N
262	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:16:07.862557	\N	1	\N	\N
263	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:16:35.502533	\N	1	\N	\N
264	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:16:43.337361	\N	1	\N	\N
265	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:16:52.4753	\N	1	\N	\N
266	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:17:01.546836	\N	1	\N	\N
267	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:17:09.990637	\N	1	\N	\N
268	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:23:12.021334	\N	1	\N	\N
269	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:23:20.436659	\N	1	\N	\N
270	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:27:48.124505	\N	1	\N	\N
271	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:28:14.391252	\N	1	\N	\N
272	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 01:28:22.364825	\N	1	\N	\N
273	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:29:43.114867	\N	1	\N	\N
274	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:34:17.289975	\N	1	\N	\N
275	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:35:29.403563	\N	1	\N	\N
276	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:40:00.685943	\N	1	\N	\N
277	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:40:06.313489	\N	1	\N	\N
278	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:42:07.481153	\N	1	\N	\N
279	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:42:32.948861	\N	1	\N	\N
280	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:42:57.896471	\N	1	\N	\N
281	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:44:30.16994	\N	1	\N	\N
282	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 01:47:59.63781	\N	1	\N	\N
283	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 01:48:32.811165	\N	1	\N	\N
284	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:55:21.411841	\N	1	\N	\N
285	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 01:57:15.248109	\N	1	\N	\N
286	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:00:16.531074	\N	1	\N	\N
287	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:01:39.180104	\N	1	\N	\N
288	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:04:38.483384	\N	1	\N	\N
289	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:05:30.056134	\N	1	\N	\N
290	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:06:08.516541	\N	1	\N	\N
291	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:07:26.438529	\N	1	\N	\N
292	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:07:59.766719	\N	1	\N	\N
293	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:08:28.135919	\N	1	\N	\N
294	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:09:05.586445	\N	1	\N	\N
295	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:10:02.605444	\N	1	\N	\N
296	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:12:31.267881	\N	1	\N	\N
297	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:12:53.959353	\N	1	\N	\N
298	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:14:16.065388	\N	1	\N	\N
299	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:17:05.911591	\N	1	\N	\N
300	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:17:49.820378	\N	1	\N	\N
301	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 02:20:36.55537	\N	1	\N	\N
302	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:31:26.219855	\N	1	\N	\N
303	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:31:55.083436	\N	1	\N	\N
304	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:32:03.498045	\N	1	\N	\N
305	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:33:45.385096	\N	1	\N	\N
306	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:33:50.824069	\N	1	\N	\N
307	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:35:19.324858	\N	1	\N	\N
308	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:54:46.604396	\N	1	\N	\N
309	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:55:12.518425	\N	1	\N	\N
310	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 02:56:18.948127	\N	1	\N	\N
311	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:56:59.344232	\N	1	\N	\N
312	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:57:59.376317	\N	1	\N	\N
313	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:58:44.928192	\N	1	\N	\N
314	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 02:59:40.762835	\N	1	\N	\N
315	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 03:00:06.831966	\N	1	\N	\N
316	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 03:00:41.477573	\N	1	\N	\N
317	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 03:07:33.953505	\N	1	\N	\N
318	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 03:09:14.019869	\N	1	\N	\N
319	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-02 16:26:38.982175	\N	1	\N	\N
320	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 16:31:08.099075	\N	1	\N	\N
321	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 16:31:34.088083	\N	1	\N	\N
322	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 16:45:23.221653	\N	1	\N	\N
323	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 16:46:02.761178	\N	1	\N	\N
324	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 16:46:21.079371	\N	1	\N	\N
325	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 16:50:29.324507	\N	1	\N	\N
326	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 16:52:31.273714	\N	1	\N	\N
327	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 16:52:56.904334	\N	1	\N	\N
328	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 16:54:24.496925	\N	1	\N	\N
329	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 16:57:44.590488	\N	1	\N	\N
330	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 16:58:16.122447	\N	1	\N	\N
331	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:02:51.993095	\N	1	\N	\N
332	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:02:57.095944	\N	1	\N	\N
333	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:03:07.542217	\N	1	\N	\N
334	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:04:38.084123	\N	1	\N	\N
335	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:04:43.416366	\N	1	\N	\N
336	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:10:40.679546	\N	1	\N	\N
337	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:11:04.138633	\N	1	\N	\N
338	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:11:45.76496	\N	1	\N	\N
339	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:12:46.100998	\N	1	\N	\N
340	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 17:12:50.107319	\N	1	\N	\N
341	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:15:26.051173	\N	1	\N	\N
342	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-02 17:21:54.021024	\N	1	\N	\N
343	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:37:14.360888	\N	1	\N	\N
344	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 17:37:47.839612	\N	1	\N	\N
345	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:39:51.406093	\N	1	\N	\N
346	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:40:39.991297	\N	1	\N	\N
347	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:40:48.019178	\N	1	\N	\N
348	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:40:52.462755	\N	1	\N	\N
349	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:41:02.266848	\N	1	\N	\N
350	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:41:14.776536	\N	1	\N	\N
351	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:44:21.454037	\N	1	\N	\N
352	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:51:50.9535	\N	1	\N	\N
353	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:56:10.666931	\N	1	\N	\N
354	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:57:26.174635	\N	1	\N	\N
355	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:58:09.456545	\N	1	\N	\N
356	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 17:59:42.826284	\N	1	\N	\N
357	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:00:36.205644	\N	1	\N	\N
358	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:03:36.892883	\N	1	\N	\N
359	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:04:03.170224	\N	1	\N	\N
360	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:14:03.778098	\N	1	\N	\N
361	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:15:58.705493	\N	1	\N	\N
362	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:16:03.340278	\N	1	\N	\N
363	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:16:10.234492	\N	1	\N	\N
364	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:16:20.942876	\N	1	\N	\N
365	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:16:30.829277	\N	1	\N	\N
366	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:16:38.891702	\N	1	\N	\N
367	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:17:12.697084	\N	1	\N	\N
368	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:18:38.214837	\N	1	\N	\N
369	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:27:55.155224	\N	1	\N	\N
370	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:28:39.72629	\N	1	\N	\N
371	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	axios/1.11.0	2025-09-02 18:30:19.493039	\N	1	\N	\N
372	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 18:31:28.893381	\N	1	\N	\N
373	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 18:31:38.563616	\N	1	\N	\N
374	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	axios/1.11.0	2025-09-02 18:32:12.732429	\N	1	\N	\N
375	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 18:32:30.740939	\N	1	\N	\N
376	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	axios/1.11.0	2025-09-02 18:32:49.677305	\N	1	\N	\N
377	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	axios/1.11.0	2025-09-02 18:33:59.60208	\N	1	\N	\N
378	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	axios/1.11.0	2025-09-02 18:34:29.596759	\N	1	\N	\N
379	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	axios/1.11.0	2025-09-02 18:34:37.138547	\N	1	\N	\N
380	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	axios/1.11.0	2025-09-02 18:35:07.083618	\N	1	\N	\N
381	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:09:10.952918	\N	1	\N	\N
382	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:09:18.470118	\N	1	\N	\N
383	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:10:49.490079	\N	1	\N	\N
384	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:10:57.781097	\N	1	\N	\N
385	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:11:21.387383	\N	1	\N	\N
386	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:14:06.390332	\N	1	\N	\N
387	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:16:58.05362	\N	1	\N	\N
388	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:21:40.817325	\N	1	\N	\N
389	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:30:46.925278	\N	1	\N	\N
390	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:31:30.030302	\N	1	\N	\N
391	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 19:31:38.010194	\N	1	\N	\N
392	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-02 19:54:21.31203	\N	1	\N	\N
393	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 20:04:25.758623	\N	1	\N	\N
394	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 20:04:52.811962	\N	1	\N	\N
395	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 20:19:33.181302	\N	1	\N	\N
396	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 20:20:44.464732	\N	1	\N	\N
397	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 20:20:53.381413	\N	1	\N	\N
398	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 20:21:04.460771	\N	1	\N	\N
399	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 20:35:07.940904	\N	1	\N	\N
400	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:09:03.274586	\N	1	\N	\N
401	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:09:29.369357	\N	1	\N	\N
402	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:11:45.604956	\N	1	\N	\N
403	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:12:09.522966	\N	1	\N	\N
404	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:12:14.615461	\N	1	\N	\N
405	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:13:19.129529	\N	1	\N	\N
406	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:13:24.014771	\N	1	\N	\N
407	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:13:29.031121	\N	1	\N	\N
408	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:13:40.444738	\N	1	\N	\N
409	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:29:30.264187	\N	1	\N	\N
410	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 21:41:14.820763	\N	1	\N	\N
411	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	2025-09-02 21:49:43.147351	\N	1	\N	\N
412	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 23:12:45.336604	\N	1	\N	\N
413	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	::1	curl/8.7.1	2025-09-02 23:12:55.986275	\N	1	\N	\N
\.


--
-- TOC entry 4339 (class 0 OID 35105)
-- Dependencies: 236
-- Data for Name: menus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menus (id, name, parent_id, type, path, component, permission, icon, sort_order, visible, status, created_at, updated_at) FROM stdin;
14	服务状态	9	1	/monitoring/service-status	ServiceStatus	monitoring:service	\N	5	1	1	2025-09-02 01:09:01.20476	2025-09-02 01:09:01.20476
15	缓存状态	9	1	/monitoring/cache-status	CacheStatus	monitoring:cache	\N	6	1	1	2025-09-02 01:09:01.205372	2025-09-02 01:09:01.205372
16	系统管理	\N	1	/system	System	system:view	Settings	10	1	1	2025-09-02 01:09:01.205919	2025-09-02 01:09:01.205919
17	部门管理	16	1	/system/departments	Departments	system:dept:list	\N	1	1	1	2025-09-02 01:09:01.206295	2025-09-02 01:09:01.206295
1	仪表板	\N	1	/dashboard	Dashboard	dashboard:view	LayoutDashboard	1	1	1	2025-09-02 01:09:01.196148	2025-09-02 01:09:01.196148
2	订单管理	\N	1	/orders	Orders	order:list	ShoppingCart	2	1	1	2025-09-02 01:09:01.197916	2025-09-02 01:09:01.197916
3	用户管理	\N	1	/users	Users	user:list	Users	3	1	1	2025-09-02 01:09:01.198479	2025-09-02 01:09:01.198479
4	价格配置	\N	1	/price-config	PriceConfig	price:config	DollarSign	4	1	1	2025-09-02 01:09:01.199014	2025-09-02 01:09:01.199014
5	机器人管理	\N	1	/bots	Bots	bot:list	Bot	5	1	1	2025-09-02 01:09:01.199485	2025-09-02 01:09:01.199485
6	能量池管理	\N	1	/energy-pool	EnergyPool	energy:pool	Fuel	6	1	1	2025-09-02 01:09:01.200057	2025-09-02 01:09:01.200057
7	代理商管理	\N	1	/agents	Agents	agent:list	UserCheck	7	1	1	2025-09-02 01:09:01.200547	2025-09-02 01:09:01.200547
8	统计分析	\N	1	/statistics	Statistics	statistics:view	BarChart3	8	1	1	2025-09-02 01:09:01.20098	2025-09-02 01:09:01.20098
9	监控中心	\N	1	/monitoring	Monitoring	monitoring:view	Monitor	9	1	1	2025-09-02 01:09:01.201466	2025-09-02 01:09:01.201466
10	监控概览	9	1	/monitoring/overview	MonitoringOverview	monitoring:overview	\N	1	1	1	2025-09-02 01:09:01.202027	2025-09-02 01:09:01.202027
11	在线用户	9	1	/monitoring/online-users	OnlineUsers	monitoring:users	\N	2	1	1	2025-09-02 01:09:01.20294	2025-09-02 01:09:01.20294
12	定时任务	9	1	/monitoring/scheduled-tasks	ScheduledTasks	monitoring:tasks	\N	3	1	1	2025-09-02 01:09:01.203638	2025-09-02 01:09:01.203638
13	数据监控	9	1	/monitoring/database	Database	monitoring:database	\N	4	1	1	2025-09-02 01:09:01.204238	2025-09-02 01:09:01.204238
18	岗位管理	16	1	/system/positions	Positions	system:position:list	\N	2	1	1	2025-09-02 01:09:01.206773	2025-09-02 01:09:01.206773
19	角色管理	16	1	/system/roles	Roles	system:role:list	\N	3	1	1	2025-09-02 01:09:01.207163	2025-09-02 01:09:01.207163
20	菜单管理	16	1	/system/menus	Menus	system:menu:list	\N	4	1	1	2025-09-02 01:09:01.207551	2025-09-02 01:09:01.207551
21	管理员管理	16	1	/system/user-roles	AdminRoles	system:user:list	\N	5	1	1	2025-09-02 01:09:01.207914	2025-09-02 01:09:01.207914
22	日志管理	16	1	/system/logs	Logs	system:log:view	\N	6	1	1	2025-09-02 01:09:01.208278	2025-09-02 01:09:01.208278
23	登录日志	22	1	/system/logs/login	LoginLogs	system:log:login:list	\N	1	1	1	2025-09-02 01:09:01.208649	2025-09-02 01:09:01.208649
24	操作日志	22	1	/system/logs/operation	OperationLogs	system:log:operation:list	\N	2	1	1	2025-09-02 01:09:01.20906	2025-09-02 01:09:01.20906
25	系统设置	16	1	/system/settings	Settings	system:settings:list	\N	7	1	1	2025-09-02 01:09:01.209429	2025-09-02 01:09:01.209429
\.


--
-- TOC entry 4347 (class 0 OID 35171)
-- Dependencies: 244
-- Data for Name: operation_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operation_logs (id, admin_id, username, module, operation, method, url, ip_address, user_agent, request_params, response_data, status, error_message, execution_time, created_at) FROM stdin;
3	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	创建管理员	创建管理员	POST	/api/admins	::1	curl/8.7.1	{"body":{"username":"testloguser7","email":"testlog7@example.com","password":"password123","role":"admin"},"query":{},"params":{}}	{"success":true,"data":{"id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5","username":"testloguser7","email":"testlog7@example.com","role":"admin","status":"active","department_id":null,"position_id":null,"created_at":"2025-09-01T14:03:32.860Z","updated_at":"2025-09-01T14:03:32.860Z"},"message":"管理员创建成功"}	201	\N	55	2025-09-01 22:03:32.862
4	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	创建部门	创建部门	POST	/api/system/departments	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"body":{"name":"12312","code":"123123","parent_id":9,"sort_order":0,"status":1},"query":{},"params":{}}	{"success":true,"data":{"id":11,"name":"12312","code":"123123","parent_id":9,"level":3,"sort_order":0,"status":1,"description":null,"created_at":"2025-09-01T14:13:33.769Z","updated_at":"2025-09-01T14:13:33.769Z"},"message":"部门创建成功"}	201	\N	7	2025-09-01 22:13:33.773
5	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新部门	更新部门	PUT	/api/system/departments/11	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"body":{"name":"12312","code":"123123","parent_id":9,"sort_order":0,"status":0},"query":{},"params":{"id":"11"}}	{"success":true,"data":{"id":11,"name":"12312","code":"123123","parent_id":9,"level":3,"sort_order":0,"status":0,"description":null,"created_at":"2025-09-01T14:13:33.769Z","updated_at":"2025-09-01T14:13:37.920Z"},"message":"部门更新成功"}	200	\N	3	2025-09-01 22:13:37.922
6	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	创建部门	创建部门	POST	/api/system/departments	::1	curl/8.7.1	{"body":{"name":"测试部门","code":"TEST_DEPT","description":"这是一个测试部门","sort_order":1,"status":1},"query":{},"params":{}}	{"success":false,"error":"部门编码已存在"}	500	\N	3	2025-09-01 22:45:05.761
7	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	创建部门	创建部门	POST	/api/system/departments	::1	curl/8.7.1	{"body":{"name":"新测试部门","code":"NEW_TEST_DEPT_$(date +%s)","description":"这是一个新的测试部门","sort_order":1,"status":1},"query":{},"params":{}}	{"success":true,"data":{"id":12,"name":"新测试部门","code":"NEW_TEST_DEPT_$(date +%s)","parent_id":null,"level":1,"sort_order":1,"status":1,"description":"这是一个新的测试部门","created_at":"2025-09-01T14:45:28.780Z","updated_at":"2025-09-01T14:45:28.780Z"},"message":"部门创建成功"}	201	\N	1	2025-09-01 22:45:28.781
8	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	创建部门	创建部门	POST	/api/system/departments	\N	curl/8.7.1	{"body":{"name":"前端测试部门","code":"FRONTEND_TEST_$(date +%s)","description":"通过前端代理测试","sort_order":1,"status":1},"query":{},"params":{}}	{"success":true,"data":{"id":13,"name":"前端测试部门","code":"FRONTEND_TEST_$(date +%s)","parent_id":null,"level":1,"sort_order":1,"status":1,"description":"通过前端代理测试","created_at":"2025-09-01T14:48:39.607Z","updated_at":"2025-09-01T14:48:39.607Z"},"message":"部门创建成功"}	201	\N	4	2025-09-01 22:48:39.609
9	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配管理员角色	分配管理员角色	POST	/api/system/admin-roles	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"body":{"admin_ids":["833cf35a-0114-4d5c-aead-886d500a1570"],"role_ids":[1,2,3,4,5],"operation":"assign","reason":""},"query":{},"params":{}}	{"success":true,"message":"角色分配完成：成功1个，失败0个","data":{"assigned_count":1,"failed_count":0,"failed_users":[]}}	200	\N	8	2025-09-02 00:37:07.472
10	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	创建管理员	创建管理员	POST	/api/admins	::1	curl/8.7.1	{"body":{"username":"testadmin","email":"test@example.com","password":"test123456","role_id":2,"department_id":1,"position_id":1,"status":"active","remark":"测试管理员"},"query":{},"params":{}}	{"success":false,"error":"用户名已存在"}	500	\N	3	2025-09-02 02:31:55.101
11	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	创建管理员	创建管理员	POST	/api/admins	::1	curl/8.7.1	{"body":{"username":"newadmin123","email":"newadmin123@example.com","password":"test123456","role_id":2,"department_id":1,"position_id":1,"status":"active","remark":"新测试管理员"},"query":{},"params":{}}	{"success":false,"error":"invalid input syntax for type integer: \\"active\\""}	500	\N	6	2025-09-02 02:32:03.522
12	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配管理员角色	分配管理员角色	POST	/api/system/admin-roles	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"admin_ids":["3d97a67a-71d8-4891-9ef8-5fe25c557ac5"],"role_ids":[2,3],"operation":"assign","reason":""},"query":{},"params":{}}	{"success":true,"message":"角色分配完成：成功1个，失败0个","data":{"assigned_count":1,"failed_count":0,"failed_users":[]}}	200	\N	6	2025-09-02 02:34:48.693
13	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配管理员角色	分配管理员角色	POST	/api/system/admin-roles	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"body":{"admin_ids":["fb9d5e25-7a11-439e-997e-80d9c49087a3"],"role_ids":[1,2,3,4,5],"operation":"assign","reason":""},"query":{},"params":{}}	{"success":true,"message":"角色分配完成：成功0个，失败1个","data":{"assigned_count":0,"failed_count":1,"failed_users":[{"admin_id":"fb9d5e25-7a11-439e-997e-80d9c49087a3","username":"未知","reason":"duplicate key value violates unique constraint \\"admin_roles_one_role_per_admin\\""}]}}	200	\N	22	2025-09-02 17:13:32.761
14	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	批量分配管理员权限	批量分配管理员权限	POST	/api/admins/3d97a67a-71d8-4891-9ef8-5fe25c557ac5/permissions/batch	::1	curl/8.7.1	{"body":{"permission_ids":["user:list","order:list"]},"query":{},"params":{"id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5"}}	{"success":true,"message":"权限分配成功"}	200	\N	6	2025-09-02 17:13:59.625
15	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/3d97a67a-71d8-4891-9ef8-5fe25c557ac5	::1	curl/8.7.1	{"body":{"role_id":"4"},"query":{},"params":{"id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5"}}	{"success":true,"data":{"id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5","username":"testloguser7","email":"testlog7@example.com","status":"active","department_id":null,"position_id":null,"created_at":"2025-09-01T14:03:32.860Z","updated_at":"2025-09-01T14:03:32.860Z","last_login":null,"last_login_at":null},"message":"管理员更新成功"}	200	\N	6	2025-09-02 17:14:17.631
16	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/3d97a67a-71d8-4891-9ef8-5fe25c557ac5	::1	curl/8.7.1	{"body":{"role_id":"4"},"query":{},"params":{"id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5"}}	{"success":true,"data":{"id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5","username":"testloguser7","email":"testlog7@example.com","status":"active","department_id":null,"position_id":null,"created_at":"2025-09-01T14:03:32.860Z","updated_at":"2025-09-01T14:03:32.860Z","last_login":null,"last_login_at":null},"message":"管理员更新成功"}	200	\N	4	2025-09-02 17:15:42.514
17	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/3d97a67a-71d8-4891-9ef8-5fe25c557ac5	::1	curl/8.7.1	{"body":{"role_id":"5"},"query":{},"params":{"id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5"}}	{"success":true,"data":{"id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5","username":"testloguser7","email":"testlog7@example.com","status":"active","department_id":null,"position_id":null,"created_at":"2025-09-01T14:03:32.860Z","updated_at":"2025-09-01T14:03:32.860Z","last_login":null,"last_login_at":null},"message":"管理员更新成功"}	200	\N	10	2025-09-02 17:16:05.252
18	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配管理员角色	分配管理员角色	POST	/api/system/admin-roles	::1	curl/8.7.1	{"body":{"admin_ids":["f46cbeb3-7d4f-41aa-ba82-b6f13a354ce6"],"role_ids":[2],"operation":"assign"},"query":{},"params":{}}	{"success":true,"message":"角色分配完成：成功1个，失败0个","data":{"assigned_count":1,"failed_count":0,"failed_users":[]}}	200	\N	4	2025-09-02 18:24:32.506
19	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	创建管理员	创建管理员	POST	/api/admins	::1	axios/1.11.0	{"body":{"username":"test_user_1756809132739","email":"test_1756809132739@example.com","password":"test123456","role":"agent","status":"active"},"query":{},"params":{}}	{"success":true,"data":{"id":"7b0f7ecf-30df-49e3-80b9-b157ba24ca88","username":"test_user_1756809132739","email":"test_1756809132739@example.com","status":"active","department_id":null,"position_id":null,"created_at":"2025-09-02T10:32:12.806Z","updated_at":"2025-09-02T10:32:12.806Z"},"message":"管理员创建成功"}	201	\N	67	2025-09-02 18:32:12.81
20	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/7b0f7ecf-30df-49e3-80b9-b157ba24ca88	::1	axios/1.11.0	{"body":{"role":"agent"},"query":{},"params":{"id":"7b0f7ecf-30df-49e3-80b9-b157ba24ca88"}}	{"success":true,"data":{"id":"7b0f7ecf-30df-49e3-80b9-b157ba24ca88","username":"test_user_1756809132739","email":"test_1756809132739@example.com","status":"active","department_id":null,"position_id":null,"created_at":"2025-09-02T10:32:12.806Z","updated_at":"2025-09-02T10:32:12.806Z","last_login":null,"last_login_at":null},"message":"管理员更新成功"}	200	\N	1	2025-09-02 18:32:12.828
21	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/7b0f7ecf-30df-49e3-80b9-b157ba24ca88	::1	axios/1.11.0	{"body":{"role":"admin"},"query":{},"params":{"id":"7b0f7ecf-30df-49e3-80b9-b157ba24ca88"}}	{"success":true,"data":{"id":"7b0f7ecf-30df-49e3-80b9-b157ba24ca88","username":"test_user_1756809132739","email":"test_1756809132739@example.com","status":"active","department_id":null,"position_id":null,"created_at":"2025-09-02T10:32:12.806Z","updated_at":"2025-09-02T10:32:12.806Z","last_login":null,"last_login_at":null},"message":"管理员更新成功"}	200	\N	13	2025-09-02 18:32:13.873
22	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/7b0f7ecf-30df-49e3-80b9-b157ba24ca88	::1	axios/1.11.0	{"body":{"role":"super_admin"},"query":{},"params":{"id":"7b0f7ecf-30df-49e3-80b9-b157ba24ca88"}}	{"success":true,"data":{"id":"7b0f7ecf-30df-49e3-80b9-b157ba24ca88","username":"test_user_1756809132739","email":"test_1756809132739@example.com","status":"active","department_id":null,"position_id":null,"created_at":"2025-09-02T10:32:12.806Z","updated_at":"2025-09-02T10:32:12.806Z","last_login":null,"last_login_at":null},"message":"管理员更新成功"}	200	\N	13	2025-09-02 18:32:14.92
23	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	删除管理员	删除管理员	DELETE	/api/admins/7b0f7ecf-30df-49e3-80b9-b157ba24ca88	::1	axios/1.11.0	{"body":{},"query":{},"params":{"id":"7b0f7ecf-30df-49e3-80b9-b157ba24ca88"}}	{"success":true,"message":"管理员删除成功"}	200	\N	22	2025-09-02 18:32:15.981
24	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配角色权限	分配角色权限	PUT	/api/system/roles/2/permissions	::1	curl/8.7.1	{"body":{"menu_ids":[1,2,3]},"query":{},"params":{"id":"2"}}	{"success":true,"message":"权限分配成功"}	200	\N	30	2025-09-02 19:12:01.009
25	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配角色权限	分配角色权限	PUT	/api/system/roles/2/permissions	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"menu_ids":[1,2,3,4]},"query":{},"params":{"id":"2"}}	{"success":true,"message":"权限分配成功"}	200	\N	17	2025-09-02 20:43:30.416
26	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	删除管理员	删除管理员	DELETE	/api/admins/f8cecf0b-8dd5-4347-9dee-35254957f243	::1	curl/8.7.1	{"body":{},"query":{},"params":{"id":"f8cecf0b-8dd5-4347-9dee-35254957f243"}}	{"success":true,"message":"管理员删除成功"}	200	\N	12	2025-09-02 21:41:56.431
27	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	重置管理员密码	重置管理员密码	PATCH	/api/admins/833cf35a-0114-4d5c-aead-886d500a1570/password	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"password":"^Dx4Gos1@r7a"},"query":{},"params":{"id":"833cf35a-0114-4d5c-aead-886d500a1570"}}	{"success":true,"message":"管理员密码重置成功"}	200	\N	71	2025-09-02 21:55:47.05
28	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	删除管理员	删除管理员	DELETE	/api/admins/f46cbeb3-7d4f-41aa-ba82-b6f13a354ce6	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{},"query":{},"params":{"id":"f46cbeb3-7d4f-41aa-ba82-b6f13a354ce6"}}	{"success":true,"message":"管理员删除成功"}	200	\N	8	2025-09-02 21:56:04.543
29	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配管理员角色	分配管理员角色	POST	/api/system/admin-roles	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"admin_ids":[null],"role_ids":[5],"operation":"replace","operation_type":"replace"},"query":{},"params":{}}	{"success":true,"message":"角色分配完成：成功0个，失败1个","data":{"assigned_count":0,"failed_count":1,"failed_users":[{"admin_id":null,"username":"未知","reason":"管理员不存在"}]}}	200	\N	1	2025-09-02 22:37:58.249
30	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配管理员角色	分配管理员角色	POST	/api/system/admin-roles	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"admin_ids":[null],"role_ids":[1],"operation":"replace","operation_type":"replace"},"query":{},"params":{}}	{"success":true,"message":"角色分配完成：成功0个，失败1个","data":{"assigned_count":0,"failed_count":1,"failed_users":[{"admin_id":null,"username":"未知","reason":"管理员不存在"}]}}	200	\N	0	2025-09-02 22:38:02.295
31	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配管理员角色	分配管理员角色	POST	/api/system/admin-roles	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"admin_ids":[null],"role_ids":[1],"operation":"replace","operation_type":"replace"},"query":{},"params":{}}	{"success":true,"message":"角色分配完成：成功0个，失败1个","data":{"assigned_count":0,"failed_count":1,"failed_users":[{"admin_id":null,"username":"未知","reason":"管理员不存在"}]}}	200	\N	3	2025-09-02 22:38:07.088
32	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配管理员角色	分配管理员角色	POST	/api/system/admin-roles	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"admin_ids":[null],"role_ids":[2],"operation":"replace","operation_type":"replace"},"query":{},"params":{}}	{"success":true,"message":"角色分配完成：成功0个，失败1个","data":{"assigned_count":0,"failed_count":1,"failed_users":[{"admin_id":null,"username":"未知","reason":"管理员不存在"}]}}	200	\N	0	2025-09-02 22:38:11.213
33	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配管理员角色	分配管理员角色	POST	/api/system/admin-roles	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"admin_ids":[null],"role_ids":[3],"operation":"replace","operation_type":"replace"},"query":{},"params":{}}	{"success":true,"message":"角色分配完成：成功0个，失败1个","data":{"assigned_count":0,"failed_count":1,"failed_users":[{"admin_id":null,"username":"未知","reason":"管理员不存在"}]}}	200	\N	1	2025-09-02 22:38:23.332
34	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	重置管理员密码	重置管理员密码	PATCH	/api/admins/833cf35a-0114-4d5c-aead-886d500a1570/password	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"password":"n#TelO$mEULc"},"query":{},"params":{"id":"833cf35a-0114-4d5c-aead-886d500a1570"}}	{"success":true,"message":"管理员密码重置成功"}	200	\N	79	2025-09-02 22:38:48.605
35	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	重置管理员密码	重置管理员密码	PATCH	/api/admins/833cf35a-0114-4d5c-aead-886d500a1570/password	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"password":"N2afEZ#OZCzj"},"query":{},"params":{"id":"833cf35a-0114-4d5c-aead-886d500a1570"}}	{"success":true,"message":"管理员密码重置成功"}	200	\N	66	2025-09-02 22:38:53.792
36	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/3d97a67a-71d8-4891-9ef8-5fe25c557ac5	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"username":"testloguser7","email":"testlog7@example.com","role_id":5,"department_id":1,"position_id":4,"status":"active"},"query":{},"params":{"id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5"}}	{"success":false,"error":"invalid input syntax for type integer: \\"active\\""}	500	\N	7	2025-09-02 22:39:24.38
37	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/980ff3a6-161d-49d6-9373-454d1e3cf4c4	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"username":"superadmin","email":"admin@tronrental.com","role_id":1,"department_id":null,"position_id":2,"status":"active"},"query":{},"params":{"id":"980ff3a6-161d-49d6-9373-454d1e3cf4c4"}}	{"success":false,"error":"invalid input syntax for type integer: \\"active\\""}	500	\N	3	2025-09-02 22:50:52.47
38	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/980ff3a6-161d-49d6-9373-454d1e3cf4c4	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"username":"superadmin","email":"admin@tronrental.com","role_id":1,"department_id":null,"position_id":3,"status":"active"},"query":{},"params":{"id":"980ff3a6-161d-49d6-9373-454d1e3cf4c4"}}	{"success":false,"error":"invalid input syntax for type integer: \\"active\\""}	500	\N	17	2025-09-02 22:51:09.294
39	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/980ff3a6-161d-49d6-9373-454d1e3cf4c4	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"username":"superadmin","email":"admin@tronrental.com","role_id":1,"department_id":null,"position_id":3,"status":"active"},"query":{},"params":{"id":"980ff3a6-161d-49d6-9373-454d1e3cf4c4"}}	{"success":false,"error":"invalid input syntax for type integer: \\"active\\""}	500	\N	12	2025-09-02 22:51:15.448
40	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新岗位	更新岗位	PUT	/api/system/positions/1	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"name":"系统管理员","code":"SYS_ADMIN","description":"系统最高管理权限","department_id":11,"sort_order":1,"status":1},"query":{},"params":{"id":"1"}}	{"success":true,"data":{"id":1,"name":"系统管理员","code":"SYS_ADMIN","department_id":11,"level":1,"sort_order":1,"status":1,"description":"系统最高管理权限","created_at":"2025-09-01T05:52:52.094Z","updated_at":"2025-09-02T14:51:59.444Z"},"message":"岗位更新成功"}	200	\N	7	2025-09-02 22:51:59.446
41	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新岗位	更新岗位	PUT	/api/system/positions/1	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"name":"系统管理员","code":"SYS_ADMIN","description":"系统最高管理权限","department_id":1,"sort_order":1,"status":1},"query":{},"params":{"id":"1"}}	{"success":true,"data":{"id":1,"name":"系统管理员","code":"SYS_ADMIN","department_id":1,"level":1,"sort_order":1,"status":1,"description":"系统最高管理权限","created_at":"2025-09-01T05:52:52.094Z","updated_at":"2025-09-02T14:52:05.138Z"},"message":"岗位更新成功"}	200	\N	6	2025-09-02 22:52:05.14
42	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新岗位	更新岗位	PUT	/api/system/positions/4	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"name":"运营经理","code":"OP_MANAGER","description":"运营部门负责人","department_id":9,"sort_order":1,"status":1},"query":{},"params":{"id":"4"}}	{"success":true,"data":{"id":4,"name":"运营经理","code":"OP_MANAGER","department_id":9,"level":2,"sort_order":1,"status":1,"description":"运营部门负责人","created_at":"2025-09-01T05:52:52.094Z","updated_at":"2025-09-02T14:52:11.874Z"},"message":"岗位更新成功"}	200	\N	5	2025-09-02 22:52:11.875
43	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	分配角色权限	分配角色权限	PUT	/api/system/roles/2/permissions	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"menu_ids":[1,2,3,4,5]},"query":{},"params":{"id":"2"}}	{"success":true,"message":"权限分配成功"}	200	\N	13	2025-09-02 22:52:19.818
44	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/833cf35a-0114-4d5c-aead-886d500a1570	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"username":"customerservice111","email":"cs@tronrental.com","role_id":"1","status":"active"},"query":{},"params":{"id":"833cf35a-0114-4d5c-aead-886d500a1570"}}	{"success":true,"data":{"id":"833cf35a-0114-4d5c-aead-886d500a1570","username":"customerservice111","email":"cs@tronrental.com","status":"active","role":"customer_service","department_id":null,"position_id":null,"created_at":"2025-08-28T10:52:41.584Z","updated_at":"2025-09-02T14:53:56.271Z","last_login":null,"last_login_at":null},"message":"管理员更新成功"}	200	\N	12	2025-09-02 22:53:56.276
45	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/833cf35a-0114-4d5c-aead-886d500a1570	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"username":"customerservice111","email":"cs@tronrental.com","role_id":"1","position_id":4,"status":"active"},"query":{},"params":{"id":"833cf35a-0114-4d5c-aead-886d500a1570"}}	{"success":false,"error":"invalid input syntax for type integer: \\"active\\""}	500	\N	3	2025-09-02 22:54:02.31
46	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	重置管理员密码	重置管理员密码	PATCH	/api/admins/833cf35a-0114-4d5c-aead-886d500a1570/password	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"password":"@Qxu8jJf&wgH"},"query":{},"params":{"id":"833cf35a-0114-4d5c-aead-886d500a1570"}}	{"success":true,"message":"管理员密码重置成功"}	200	\N	64	2025-09-02 23:01:23.911
47	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	重置管理员密码	重置管理员密码	PATCH	/api/admins/833cf35a-0114-4d5c-aead-886d500a1570/password	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"password":"VFoGGW6PBkEo"},"query":{},"params":{"id":"833cf35a-0114-4d5c-aead-886d500a1570"}}	{"success":true,"message":"管理员密码重置成功"}	200	\N	78	2025-09-02 23:01:30.129
48	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	重置管理员密码	重置管理员密码	PATCH	/api/admins/833cf35a-0114-4d5c-aead-886d500a1570/password	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"password":"Rrw%eRnf@2*l"},"query":{},"params":{"id":"833cf35a-0114-4d5c-aead-886d500a1570"}}	{"success":true,"message":"管理员密码重置成功"}	200	\N	72	2025-09-02 23:01:34.765
49	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新管理员	更新管理员	PUT	/api/admins/833cf35a-0114-4d5c-aead-886d500a1570	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"username":"customerservice111","email":"cs@tronrental.com","role_id":"1","position_id":4,"status":"active"},"query":{},"params":{"id":"833cf35a-0114-4d5c-aead-886d500a1570"}}	{"success":false,"error":"invalid input syntax for type integer: \\"active\\""}	500	\N	2	2025-09-02 23:02:16.724
50	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	批量操作管理员角色	批量操作管理员角色	POST	/api/system/admin-roles/batch	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"admin_ids":["833cf35a-0114-4d5c-aead-886d500a1570"],"role_ids":[1],"operation":"assign"},"query":{},"params":{}}	{"success":true,"message":"批量操作完成：成功1个，失败0个","data":{"total":1,"success":1,"failed":0,"results":[{"admin_id":"833cf35a-0114-4d5c-aead-886d500a1570","success":true,"message":"分配角色成功"}]}}	200	\N	3	2025-09-02 23:02:22.044
51	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	批量操作管理员角色	批量操作管理员角色	POST	/api/system/admin-roles/batch	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"admin_ids":["3d97a67a-71d8-4891-9ef8-5fe25c557ac5"],"role_ids":[2],"operation":"assign"},"query":{},"params":{}}	{"success":true,"message":"批量操作完成：成功0个，失败1个","data":{"total":1,"success":0,"failed":1,"results":[{"admin_id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5","success":false,"message":"duplicate key value violates unique constraint \\"admin_roles_one_role_per_admin\\""}]}}	200	\N	12	2025-09-02 23:02:26.862
52	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	批量操作管理员角色	批量操作管理员角色	POST	/api/system/admin-roles/batch	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"admin_ids":["3d97a67a-71d8-4891-9ef8-5fe25c557ac5"],"role_ids":[1],"operation":"assign"},"query":{},"params":{}}	{"success":true,"message":"批量操作完成：成功0个，失败1个","data":{"total":1,"success":0,"failed":1,"results":[{"admin_id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5","success":false,"message":"duplicate key value violates unique constraint \\"admin_roles_one_role_per_admin\\""}]}}	200	\N	13	2025-09-02 23:02:36.327
53	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	批量操作管理员角色	批量操作管理员角色	POST	/api/system/admin-roles/batch	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"admin_ids":["3d97a67a-71d8-4891-9ef8-5fe25c557ac5"],"role_ids":[1],"operation":"assign"},"query":{},"params":{}}	{"success":true,"message":"批量操作完成：成功0个，失败1个","data":{"total":1,"success":0,"failed":1,"results":[{"admin_id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5","success":false,"message":"duplicate key value violates unique constraint \\"admin_roles_one_role_per_admin\\""}]}}	200	\N	5	2025-09-02 23:02:45.061
54	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	重置管理员密码	重置管理员密码	PATCH	/api/admins/833cf35a-0114-4d5c-aead-886d500a1570/password	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Trae/1.100.3 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36	{"body":{"password":"$jEiO2FQreX!"},"query":{},"params":{"id":"833cf35a-0114-4d5c-aead-886d500a1570"}}	{"success":true,"message":"管理员密码重置成功"}	200	\N	81	2025-09-02 23:03:11.551
\.


--
-- TOC entry 4317 (class 0 OID 28325)
-- Dependencies: 213
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, user_id, bot_id, package_id, energy_amount, price, commission_rate, commission_amount, status, payment_status, tron_tx_hash, delegate_tx_hash, target_address, expires_at, completed_at, created_at, updated_at) FROM stdin;
11427be5-8dbf-4f54-ba89-bbab14112c8b	ORD1756259427864GJFH	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	550e8400-e29b-41d4-a716-446655440010	550e8400-e29b-41d4-a716-446655440001	10000	1.00	0.0000	0.00	cancelled	unpaid	\N	\N	TRX123456789	2025-08-28 09:50:27.864+08	\N	2025-08-27 09:50:27.865697+08	2025-08-27 09:52:21.608322+08
0ea0c560-be19-4558-b96f-c7b85c46a051	ORD1756259608458BOTV	550e8400-e29b-41d4-a716-446655440000	550e8400-e29b-41d4-a716-446655440011	550e8400-e29b-41d4-a716-446655440002	50000	4.50	0.0000	0.00	pending	unpaid	\N	\N	TRX987654321	2025-08-28 09:53:28.458+08	\N	2025-08-27 09:53:28.45902+08	2025-08-27 09:53:28.45902+08
b1f0537c-ea72-4705-8b07-f52d210c430e	ORD1756259622011V9RK	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	550e8400-e29b-41d4-a716-446655440010	550e8400-e29b-41d4-a716-446655440003	100000	8.00	0.0000	0.00	pending	unpaid	\N	\N	TRX111222333	2025-08-28 09:53:42.011+08	\N	2025-08-27 09:53:42.011661+08	2025-08-27 09:53:42.011661+08
\.


--
-- TOC entry 4335 (class 0 OID 35067)
-- Dependencies: 232
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.positions (id, name, code, department_id, level, sort_order, status, description, created_at, updated_at) FROM stdin;
2	技术经理	TECH_MANAGER	2	2	2	1	技术部门负责人	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
3	开发工程师	DEVELOPER	2	3	3	1	系统开发人员	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
5	客服专员	CUSTOMER_SERVICE	3	3	2	1	客户服务人员	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
6	财务经理	FINANCE_MANAGER	4	2	1	1	财务部门负责人	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
7	会计	ACCOUNTANT	4	3	2	1	财务会计人员	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
8	市场经理	MARKETING_MANAGER	5	2	1	1	市场部门负责人	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
1	系统管理员	SYS_ADMIN	1	1	1	1	系统最高管理权限	2025-09-01 13:52:52.094097	2025-09-02 22:52:05.138
4	运营经理	OP_MANAGER	9	2	1	1	运营部门负责人	2025-09-01 13:52:52.094097	2025-09-02 22:52:11.874
\.


--
-- TOC entry 4331 (class 0 OID 35018)
-- Dependencies: 228
-- Data for Name: price_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_configs (id, mode_type, name, description, config, is_active, created_by, created_at, updated_at) FROM stdin;
1	energy_flash	能量闪租配置	单笔能量闪租价格配置	{"currency": "TRX", "max_amount": 13, "expiry_hours": 0.1, "single_price": 2.8, "payment_address": "TBD", "max_transactions": 5, "double_energy_for_no_usdt": false}	t	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	2025-08-29 19:39:04.172854	2025-08-29 21:46:24.33667
8	trx_exchange	TRX闪兑服务	USDT自动兑换TRX服务，转U自动回TRX，1U起换	{"notes": ["🔸回其他地址联系客服", "🚫请不要使用交易所转账，丢失自负"], "min_amount": 1, "exchange_address": "TM263fmPZfpjjnN2ec9uVEoNgg23456789", "is_auto_exchange": true, "trx_to_usdt_rate": 29.9, "usdt_to_trx_rate": 2.65, "rate_update_interval": 5}	\N	\N	2025-08-29 22:04:36.247821	2025-09-01 21:47:16.825652
6	trx_exchange	TRX闪兑服务	USDT自动兑换TRX服务，支持实时汇率和自动兑换地址	{"notes": ["🔸回其他地址联系客服", "🚫请不要使用交易所转账，丢失自负"], "min_amount": 1, "exchange_address": "TM263fmPZfpjjnN2ec9uVEoNgg23456789", "is_auto_exchange": true, "trx_to_usdt_rate": 29.9, "usdt_to_trx_rate": 2.65, "rate_update_interval": 5}	\N	\N	2025-08-29 21:59:03.041447	2025-09-01 21:47:16.825652
5	transaction_package	笔数套餐配置	无时间限制的长期套餐	{"packages": [{"name": "基础套餐", "price": 25, "transaction_count": 11}, {"name": "标准套餐", "price": 120, "transaction_count": 50}, {"name": "新套餐", "price": 250, "currency": "TRX", "transaction_count": 100}], "daily_fee": 1, "transferable": true, "proxy_purchase": true}	t	550e8400-e29b-41d4-a716-446655440000	2025-08-29 20:13:28.65604	2025-09-01 23:19:30.165051
2	vip_package	VIP套餐配置	VIP会员套餐价格配置	{"packages": [{"name": "月度VIP", "price": 99, "benefits": {"no_daily_fee": true, "priority_support": true, "unlimited_transactions": true}, "duration_days": 31}, {"name": "季度VIP", "price": 249, "benefits": {"no_daily_fee": true, "priority_support": true, "unlimited_transactions": true}, "duration_days": 91}, {"name": "年度VIP", "price": 899, "benefits": {"no_daily_fee": true, "priority_support": true, "unlimited_transactions": true}, "duration_days": 364}]}	f	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	2025-08-29 19:39:04.175121	2025-08-29 21:41:13.184626
\.


--
-- TOC entry 4343 (class 0 OID 35140)
-- Dependencies: 240
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (id, role_id, menu_id, created_at) FROM stdin;
51	1	1	2025-09-02 01:09:01.211655
52	1	2	2025-09-02 01:09:01.212559
53	1	3	2025-09-02 01:09:01.21294
54	1	4	2025-09-02 01:09:01.21331
55	1	5	2025-09-02 01:09:01.213721
56	1	6	2025-09-02 01:09:01.214161
57	1	7	2025-09-02 01:09:01.214744
58	1	8	2025-09-02 01:09:01.215154
59	1	9	2025-09-02 01:09:01.215531
60	1	10	2025-09-02 01:09:01.215976
61	1	11	2025-09-02 01:09:01.216446
62	1	12	2025-09-02 01:09:01.216798
63	1	13	2025-09-02 01:09:01.21709
64	1	14	2025-09-02 01:09:01.217428
65	1	15	2025-09-02 01:09:01.217833
66	1	16	2025-09-02 01:09:01.21814
67	1	17	2025-09-02 01:09:01.218457
68	1	18	2025-09-02 01:09:01.218766
69	1	19	2025-09-02 01:09:01.219089
70	1	20	2025-09-02 01:09:01.219413
71	1	21	2025-09-02 01:09:01.21977
72	1	22	2025-09-02 01:09:01.220144
73	1	23	2025-09-02 01:09:01.220429
74	1	24	2025-09-02 01:09:01.220688
75	1	25	2025-09-02 01:09:01.220955
83	2	1	2025-09-02 22:52:19.814778
84	2	2	2025-09-02 22:52:19.814778
85	2	3	2025-09-02 22:52:19.814778
86	2	4	2025-09-02 22:52:19.814778
87	2	5	2025-09-02 22:52:19.814778
\.


--
-- TOC entry 4337 (class 0 OID 35088)
-- Dependencies: 234
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, code, type, data_scope, sort_order, status, description, created_at, updated_at) FROM stdin;
1	超级管理员	super_admin	system	1	1	1	系统超级管理员，拥有所有权限	2025-09-01 13:52:52.096348	2025-09-01 13:52:52.096348
2	系统管理员	system_admin	system	1	2	1	系统管理员，负责系统配置	2025-09-01 13:52:52.096348	2025-09-01 13:52:52.096348
3	部门管理员	dept_admin	custom	2	3	1	部门管理员，管理本部门及下级部门	2025-09-01 13:52:52.096348	2025-09-01 13:52:52.096348
4	普通管理员	admin	custom	3	4	1	普通管理员，仅管理本部门	2025-09-01 13:52:52.096348	2025-09-01 13:52:52.096348
5	操作员	operator	custom	4	5	1	普通操作员，仅能查看和操作自己的数据	2025-09-01 13:52:52.096348	2025-09-01 13:52:52.096348
\.


--
-- TOC entry 4348 (class 0 OID 35258)
-- Dependencies: 245
-- Data for Name: scheduled_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scheduled_tasks (id, name, cron_expression, command, description, is_active, created_at, updated_at, next_run, last_run) FROM stdin;
0abec6e6-a523-4ff0-b062-3fbf33aae6df	payment-timeouts	*/10 * * * *	payment-timeouts	每10分钟检查并处理支付超时订单	t	2025-09-02 16:36:11.161875+08	2025-09-02 16:36:11.161875+08	\N	2025-09-02 17:05:56.045+08
cc9dd9cd-8dad-4d2c-a4ba-a26ba5895398	cleanup-expired	0 2 * * *	cleanup-expired	每天凌晨2点清理过期数据	t	2025-09-02 16:36:11.161875+08	2025-09-02 16:36:11.161875+08	\N	2025-09-02 16:55:12.005+08
953cd750-84c9-415f-95e8-b778d0c3d81f	expired-delegations	*/5 * * * *	expired-delegations	每5分钟检查并处理到期的能量委托	t	2025-09-02 16:36:11.161875+08	2025-09-02 16:36:11.161875+08	\N	2025-09-02 16:55:08.56+08
5110a034-7772-4d73-b0d3-b06f319babbf	refresh-pools	0 * * * *	refresh-pools	每小时刷新能量池状态	t	2025-09-02 16:36:11.161875+08	2025-09-02 16:36:11.161875+08	\N	2025-09-02 17:00:34.597+08
\.


--
-- TOC entry 4315 (class 0 OID 28230)
-- Dependencies: 211
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schema_migrations (id, filename, executed_at) FROM stdin;
1	001_create_tables.sql	2025-08-27 09:17:35.261284+08
2	002_insert_initial_data.sql	2025-08-27 09:21:08.199366+08
\.


--
-- TOC entry 4325 (class 0 OID 34312)
-- Dependencies: 221
-- Data for Name: system_config_history; Type: TABLE DATA; Schema: public; Owner: -
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
-- TOC entry 4324 (class 0 OID 34285)
-- Dependencies: 220
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: -
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
-- TOC entry 4351 (class 0 OID 35311)
-- Dependencies: 248
-- Data for Name: system_monitoring_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_monitoring_logs (id, admin_id, action_type, action_data, created_at) FROM stdin;
c32381bd-b904-4299-aa1f-1fd54c96deb2	980ff3a6-161d-49d6-9373-454d1e3cf4c4	force_logout	{"targetUserId": "980ff3a6-161d-49d6-9373-454d1e3cf4c4", "affectedSessions": 1}	2025-09-02 01:43:30.703648+08
ae157098-c3af-4499-ac0a-7e676a763c6f	980ff3a6-161d-49d6-9373-454d1e3cf4c4	force_logout	{"targetUserId": "980ff3a6-161d-49d6-9373-454d1e3cf4c4", "affectedSessions": 3}	2025-09-02 02:10:57.46365+08
a9ad1bae-d51e-4aed-b473-5be53b809a60	980ff3a6-161d-49d6-9373-454d1e3cf4c4	force_logout	{"targetUserId": "980ff3a6-161d-49d6-9373-454d1e3cf4c4", "affectedSessions": 5}	2025-09-02 02:20:23.937644+08
f0dea0f0-6613-4743-94ed-bdca164e2935	980ff3a6-161d-49d6-9373-454d1e3cf4c4	force_logout	{"targetUserId": "980ff3a6-161d-49d6-9373-454d1e3cf4c4", "affectedSessions": 30}	2025-09-02 17:02:12.306477+08
2836201b-61ac-4275-8e34-d89df1a2cd18	980ff3a6-161d-49d6-9373-454d1e3cf4c4	force_logout	{"targetUserId": "980ff3a6-161d-49d6-9373-454d1e3cf4c4", "affectedSessions": 10}	2025-09-02 17:14:50.912065+08
\.


--
-- TOC entry 4349 (class 0 OID 35271)
-- Dependencies: 246
-- Data for Name: task_execution_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_execution_logs (id, task_id, started_at, finished_at, status, output, error_message, created_at) FROM stdin;
2bd6144d-4762-43f4-a04e-8e37b81d542e	0abec6e6-a523-4ff0-b062-3fbf33aae6df	2025-09-02 16:40:50.261429+08	2025-09-02 16:40:50.283+08	failed		/bin/sh: processPaymentTimeouts: command not found\n	2025-09-02 16:40:50.261429+08
ce2b06ef-70e2-4a22-b021-91c821638924	953cd750-84c9-415f-95e8-b778d0c3d81f	2025-09-02 16:40:54.265398+08	2025-09-02 16:40:54.275+08	failed		/bin/sh: processExpiredDelegations: command not found\n	2025-09-02 16:40:54.265398+08
9ad073ee-9b75-4c8d-a387-b5c04033f4d7	cc9dd9cd-8dad-4d2c-a4ba-a26ba5895398	2025-09-02 16:40:57.292307+08	2025-09-02 16:40:57.303+08	failed		/bin/sh: cleanupExpiredData: command not found\n	2025-09-02 16:40:57.292307+08
518fe4f2-d252-4a5d-b7c0-c2b070699e37	cc9dd9cd-8dad-4d2c-a4ba-a26ba5895398	2025-09-02 16:47:39.397924+08	2025-09-02 16:47:39.409+08	success	任务 cleanup-expired 执行成功	\N	2025-09-02 16:47:39.397924+08
e7c474b1-3a71-4f15-8e67-27b42d594c31	cc9dd9cd-8dad-4d2c-a4ba-a26ba5895398	2025-09-02 16:50:39.568908+08	2025-09-02 16:50:39.573+08	success	任务 cleanup-expired 执行成功	\N	2025-09-02 16:50:39.568908+08
ad159a53-e2ae-4c0a-8587-9fdb70c8a192	0abec6e6-a523-4ff0-b062-3fbf33aae6df	2025-09-02 16:54:43.686088+08	2025-09-02 16:54:43.694+08	success	任务 payment-timeouts 执行成功	\N	2025-09-02 16:54:43.686088+08
8fce6af1-7491-43ec-a5f8-0db33946a74a	953cd750-84c9-415f-95e8-b778d0c3d81f	2025-09-02 16:55:08.547449+08	2025-09-02 16:55:08.56+08	success	任务 expired-delegations 执行成功	\N	2025-09-02 16:55:08.547449+08
e7b23303-edfe-4554-a6d8-0801c59214c2	cc9dd9cd-8dad-4d2c-a4ba-a26ba5895398	2025-09-02 16:55:11.980835+08	2025-09-02 16:55:12.005+08	success	任务 cleanup-expired 执行成功	\N	2025-09-02 16:55:11.980835+08
12f96b99-0e23-482c-88e9-dd313106f251	5110a034-7772-4d73-b0d3-b06f319babbf	2025-09-02 17:00:34.585848+08	2025-09-02 17:00:34.597+08	success	任务 refresh-pools 执行成功	\N	2025-09-02 17:00:34.585848+08
5eb20275-d8ce-4200-ba71-35d2da5171c6	0abec6e6-a523-4ff0-b062-3fbf33aae6df	2025-09-02 17:05:56.039497+08	2025-09-02 17:05:56.045+08	success	任务 payment-timeouts 执行成功	\N	2025-09-02 17:05:56.039497+08
\.


--
-- TOC entry 4329 (class 0 OID 34953)
-- Dependencies: 226
-- Data for Name: telegram_bots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.telegram_bots (id, bot_token, bot_name, bot_username, webhook_url, is_active, created_by, created_at, updated_at) FROM stdin;
cadc6941-fa3a-4c2c-9ace-6723c9ae9b83	1234567890:AAEhBOweik9yloUvGooFW0oXgmMEzpSeOg0	TronEnergyBot	tron_energy_bot	https://api.telegram.org/bot1234567890:AAEhBOweik9yloUvGooFW0oXgmMEzpSeOg0/setWebhook	t	550e8400-e29b-41d4-a716-446655440000	2025-08-29 21:09:07.522892+08	2025-08-29 21:09:07.522892+08
de5971b3-eebd-4405-b0c6-20aa1b5c2012	9876543210:BBFhCPxfjl0zmqVwHppGX1pYhnNFAqtTfh1	TronRentalBot	tron_rental_bot	https://api.telegram.org/bot9876543210:BBFhCPxfjl0zmqVwHppGX1pYhnNFAqtTfh1/setWebhook	t	550e8400-e29b-41d4-a716-446655440000	2025-08-29 21:09:07.522892+08	2025-08-29 21:09:07.522892+08
3e98f9cf-e588-4097-8fe0-b41b130df29a	5555555555:CCGiDQyglm1anrWxIqqHY2qZioOGBruUgi2	TestBot	test_bot	\N	f	550e8400-e29b-41d4-a716-446655440000	2025-08-29 21:09:07.522892+08	2025-08-29 21:09:07.522892+08
\.


--
-- TOC entry 4328 (class 0 OID 34500)
-- Dependencies: 225
-- Data for Name: user_level_changes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_level_changes (id, user_id, old_level, new_level, change_reason, changed_by, change_type, effective_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4316 (class 0 OID 28273)
-- Dependencies: 212
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, telegram_id, username, first_name, last_name, email, phone, status, tron_address, balance, total_orders, total_energy_used, referral_code, referred_by, created_at, updated_at, password_hash, login_type, last_login_at, password_reset_token, password_reset_expires, usdt_balance, trx_balance, agent_id, user_type) FROM stdin;
550e8400-e29b-41d4-a716-446655440000	123456789	admin	System Admin	\N	admin@tronrental.com	\N	active	\N	0.000000	0	0	ADMIN001	\N	2025-08-27 09:18:42.092445+08	2025-08-29 21:29:38.511375+08	$2a$10$czslCVI4UmXf1.j0zub2mesltXB66uCNJRJYj.1YSRJMSYSOrQeuG	both	2025-08-28 14:19:18.101117	\N	\N	0.00000000	0.00000000	\N	normal
c380caa5-b04c-4f1a-a4e8-3cc7cc301021	987654321	testuser	Updated Test	User	\N	\N	banned	\N	0.000000	0	0	TEST001	\N	2025-08-28 15:00:07.511842+08	2025-08-29 22:08:58.993063+08	\N	telegram	\N	\N	\N	0.00000000	0.00000000	\N	vip
7aed0f04-a936-4702-9ff8-beae6ec8f655	\N	testuser6	\N	\N	test6@example.com	13800138005	active	\N	0.000000	0	0	\N	\N	2025-08-29 21:42:29.608822+08	2025-08-29 22:29:27.627825+08	$2b$10$LAnKEwoGjhM3O2CBcx8n0uj6m6rWrZnDRVCG72D836B91iY8frRz.	admin	\N	\N	\N	0.00000000	0.00000000	\N	agent
e2c6f1de-8d9a-454b-a292-9f83c618dda9	999888777	testuser2	\N	\N	testuser2@example.com	\N	active	\N	0.000000	0	0	\N	\N	2025-08-29 18:48:23.697122+08	2025-08-29 22:29:39.232277+08	\N	telegram	\N	\N	\N	0.00000000	0.00000000	\N	agent
09ad451f-3bd8-4ebd-a6e0-fc037db7e703	\N	123123	\N	\N	test@example.com		banned	\N	0.000000	0	0	\N	\N	2025-08-27 09:33:04.348682+08	2025-09-01 21:51:42.869912+08	$2a$10$E3QMocOmgGsRzKuV2db.j.OBVfdQ9hfnIkGfOOsNZo6HdAo2wPq6y	admin	\N	\N	\N	0.00000000	0.00000000	\N	premium
\.


--
-- TOC entry 4679 (class 0 OID 0)
-- Dependencies: 237
-- Name: admin_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_roles_id_seq', 22, true);


--
-- TOC entry 4680 (class 0 OID 0)
-- Dependencies: 229
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.departments_id_seq', 13, true);


--
-- TOC entry 4681 (class 0 OID 0)
-- Dependencies: 241
-- Name: login_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.login_logs_id_seq', 413, true);


--
-- TOC entry 4682 (class 0 OID 0)
-- Dependencies: 235
-- Name: menus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menus_id_seq', 25, true);


--
-- TOC entry 4683 (class 0 OID 0)
-- Dependencies: 243
-- Name: operation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operation_logs_id_seq', 54, true);


--
-- TOC entry 4684 (class 0 OID 0)
-- Dependencies: 231
-- Name: positions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.positions_id_seq', 10, true);


--
-- TOC entry 4685 (class 0 OID 0)
-- Dependencies: 227
-- Name: price_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_configs_id_seq', 8, true);


--
-- TOC entry 4686 (class 0 OID 0)
-- Dependencies: 239
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 87, true);


--
-- TOC entry 4687 (class 0 OID 0)
-- Dependencies: 233
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 6, true);


--
-- TOC entry 4688 (class 0 OID 0)
-- Dependencies: 210
-- Name: schema_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schema_migrations_id_seq', 2, true);


--
-- TOC entry 4080 (class 2606 OID 35229)
-- Name: admin_roles admin_roles_admin_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_admin_id_role_id_key UNIQUE (admin_id, role_id);


--
-- TOC entry 4083 (class 2606 OID 35131)
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4115 (class 2606 OID 35299)
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4117 (class 2606 OID 35331)
-- Name: admin_sessions admin_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_session_token_key UNIQUE (session_token);


--
-- TOC entry 4025 (class 2606 OID 34438)
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- TOC entry 4027 (class 2606 OID 35340)
-- Name: admins admins_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_phone_unique UNIQUE (phone);


--
-- TOC entry 4029 (class 2606 OID 34434)
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- TOC entry 4031 (class 2606 OID 34436)
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- TOC entry 3978 (class 2606 OID 28395)
-- Name: agent_applications agent_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_pkey PRIMARY KEY (id);


--
-- TOC entry 3980 (class 2606 OID 28415)
-- Name: agent_earnings agent_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_pkey PRIMARY KEY (id);


--
-- TOC entry 3971 (class 2606 OID 28373)
-- Name: agents agents_agent_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_agent_code_key UNIQUE (agent_code);


--
-- TOC entry 3973 (class 2606 OID 28371)
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- TOC entry 3985 (class 2606 OID 28445)
-- Name: bot_users bot_users_bot_id_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_bot_id_telegram_chat_id_key UNIQUE (bot_id, telegram_chat_id);


--
-- TOC entry 3987 (class 2606 OID 28443)
-- Name: bot_users bot_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_pkey PRIMARY KEY (id);


--
-- TOC entry 4059 (class 2606 OID 35060)
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- TOC entry 4061 (class 2606 OID 35058)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 4020 (class 2606 OID 34362)
-- Name: energy_consumption_logs energy_consumption_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_consumption_logs
    ADD CONSTRAINT energy_consumption_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3992 (class 2606 OID 28471)
-- Name: energy_pools energy_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_pools
    ADD CONSTRAINT energy_pools_pkey PRIMARY KEY (id);


--
-- TOC entry 3994 (class 2606 OID 28473)
-- Name: energy_pools energy_pools_tron_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_pools
    ADD CONSTRAINT energy_pools_tron_address_key UNIQUE (tron_address);


--
-- TOC entry 4000 (class 2606 OID 28485)
-- Name: energy_transactions energy_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4002 (class 2606 OID 28487)
-- Name: energy_transactions energy_transactions_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_tx_hash_key UNIQUE (tx_hash);


--
-- TOC entry 4095 (class 2606 OID 35169)
-- Name: login_logs login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4078 (class 2606 OID 35118)
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- TOC entry 4100 (class 2606 OID 35180)
-- Name: operation_logs operation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT operation_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3967 (class 2606 OID 28342)
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 3969 (class 2606 OID 28340)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4067 (class 2606 OID 35081)
-- Name: positions positions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_code_key UNIQUE (code);


--
-- TOC entry 4069 (class 2606 OID 35079)
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- TOC entry 4057 (class 2606 OID 35029)
-- Name: price_configs price_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_configs
    ADD CONSTRAINT price_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 4089 (class 2606 OID 35146)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 4091 (class 2606 OID 35148)
-- Name: role_permissions role_permissions_role_id_menu_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_menu_id_key UNIQUE (role_id, menu_id);


--
-- TOC entry 4072 (class 2606 OID 35103)
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- TOC entry 4074 (class 2606 OID 35101)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4106 (class 2606 OID 35268)
-- Name: scheduled_tasks scheduled_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_tasks
    ADD CONSTRAINT scheduled_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 3940 (class 2606 OID 28238)
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- TOC entry 3942 (class 2606 OID 28236)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4018 (class 2606 OID 34320)
-- Name: system_config_history system_config_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4012 (class 2606 OID 34301)
-- Name: system_configs system_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_config_key_key UNIQUE (config_key);


--
-- TOC entry 4014 (class 2606 OID 34299)
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 4127 (class 2606 OID 35319)
-- Name: system_monitoring_logs system_monitoring_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_monitoring_logs
    ADD CONSTRAINT system_monitoring_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4113 (class 2606 OID 35280)
-- Name: task_execution_logs task_execution_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_execution_logs
    ADD CONSTRAINT task_execution_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4050 (class 2606 OID 34965)
-- Name: telegram_bots telegram_bots_bot_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_bot_token_key UNIQUE (bot_token);


--
-- TOC entry 4052 (class 2606 OID 34963)
-- Name: telegram_bots telegram_bots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_pkey PRIMARY KEY (id);


--
-- TOC entry 4108 (class 2606 OID 35336)
-- Name: scheduled_tasks unique_task_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_tasks
    ADD CONSTRAINT unique_task_name UNIQUE (name);


--
-- TOC entry 4045 (class 2606 OID 34510)
-- Name: user_level_changes user_level_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_pkey PRIMARY KEY (id);


--
-- TOC entry 3953 (class 2606 OID 28293)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3955 (class 2606 OID 28289)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3957 (class 2606 OID 28295)
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- TOC entry 3959 (class 2606 OID 28291)
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- TOC entry 4081 (class 1259 OID 35337)
-- Name: admin_roles_one_role_per_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admin_roles_one_role_per_admin ON public.admin_roles USING btree (admin_id);


--
-- TOC entry 4084 (class 1259 OID 35227)
-- Name: idx_admin_roles_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_roles_admin_id ON public.admin_roles USING btree (admin_id);


--
-- TOC entry 4085 (class 1259 OID 35189)
-- Name: idx_admin_roles_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_roles_role_id ON public.admin_roles USING btree (role_id);


--
-- TOC entry 4118 (class 1259 OID 35308)
-- Name: idx_admin_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_active ON public.admin_sessions USING btree (is_active);


--
-- TOC entry 4119 (class 1259 OID 35307)
-- Name: idx_admin_sessions_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions USING btree (admin_id);


--
-- TOC entry 4120 (class 1259 OID 35310)
-- Name: idx_admin_sessions_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_last_activity ON public.admin_sessions USING btree (last_activity DESC);


--
-- TOC entry 4121 (class 1259 OID 35332)
-- Name: idx_admin_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_token ON public.admin_sessions USING btree (session_token);


--
-- TOC entry 4032 (class 1259 OID 35208)
-- Name: idx_admins_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_department_id ON public.admins USING btree (department_id);


--
-- TOC entry 4033 (class 1259 OID 34440)
-- Name: idx_admins_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_email ON public.admins USING btree (email);


--
-- TOC entry 4034 (class 1259 OID 35210)
-- Name: idx_admins_last_login_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_last_login_at ON public.admins USING btree (last_login_at);


--
-- TOC entry 4035 (class 1259 OID 35338)
-- Name: idx_admins_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_phone ON public.admins USING btree (phone);


--
-- TOC entry 4036 (class 1259 OID 35209)
-- Name: idx_admins_position_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_position_id ON public.admins USING btree (position_id);


--
-- TOC entry 4037 (class 1259 OID 34441)
-- Name: idx_admins_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_status ON public.admins USING btree (status);


--
-- TOC entry 4038 (class 1259 OID 34439)
-- Name: idx_admins_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_username ON public.admins USING btree (username);


--
-- TOC entry 3981 (class 1259 OID 28567)
-- Name: idx_agent_earnings_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_agent_id ON public.agent_earnings USING btree (agent_id);


--
-- TOC entry 3982 (class 1259 OID 28568)
-- Name: idx_agent_earnings_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_order_id ON public.agent_earnings USING btree (order_id);


--
-- TOC entry 3983 (class 1259 OID 28569)
-- Name: idx_agent_earnings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_status ON public.agent_earnings USING btree (status);


--
-- TOC entry 3974 (class 1259 OID 28565)
-- Name: idx_agents_agent_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_agent_code ON public.agents USING btree (agent_code);


--
-- TOC entry 3975 (class 1259 OID 28566)
-- Name: idx_agents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_status ON public.agents USING btree (status);


--
-- TOC entry 3976 (class 1259 OID 28564)
-- Name: idx_agents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_user_id ON public.agents USING btree (user_id);


--
-- TOC entry 3988 (class 1259 OID 28572)
-- Name: idx_bot_users_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_bot_id ON public.bot_users USING btree (bot_id);


--
-- TOC entry 3989 (class 1259 OID 28574)
-- Name: idx_bot_users_telegram_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_telegram_chat_id ON public.bot_users USING btree (telegram_chat_id);


--
-- TOC entry 3990 (class 1259 OID 28573)
-- Name: idx_bot_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_user_id ON public.bot_users USING btree (user_id);


--
-- TOC entry 4062 (class 1259 OID 35181)
-- Name: idx_departments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_parent_id ON public.departments USING btree (parent_id);


--
-- TOC entry 4063 (class 1259 OID 35182)
-- Name: idx_departments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_status ON public.departments USING btree (status);


--
-- TOC entry 4021 (class 1259 OID 34371)
-- Name: idx_energy_consumption_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_consumption_logs_created_at ON public.energy_consumption_logs USING btree (created_at);


--
-- TOC entry 4022 (class 1259 OID 34372)
-- Name: idx_energy_consumption_logs_pool_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_consumption_logs_pool_account_id ON public.energy_consumption_logs USING btree (pool_account_id);


--
-- TOC entry 4023 (class 1259 OID 34373)
-- Name: idx_energy_consumption_logs_transaction_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_consumption_logs_transaction_type ON public.energy_consumption_logs USING btree (transaction_type);


--
-- TOC entry 3995 (class 1259 OID 34368)
-- Name: idx_energy_pools_account_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_account_type ON public.energy_pools USING btree (account_type);


--
-- TOC entry 3996 (class 1259 OID 34369)
-- Name: idx_energy_pools_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_priority ON public.energy_pools USING btree (priority DESC);


--
-- TOC entry 3997 (class 1259 OID 28576)
-- Name: idx_energy_pools_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_status ON public.energy_pools USING btree (status);


--
-- TOC entry 3998 (class 1259 OID 28575)
-- Name: idx_energy_pools_tron_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_tron_address ON public.energy_pools USING btree (tron_address);


--
-- TOC entry 4003 (class 1259 OID 28577)
-- Name: idx_energy_transactions_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_order_id ON public.energy_transactions USING btree (order_id);


--
-- TOC entry 4004 (class 1259 OID 28578)
-- Name: idx_energy_transactions_pool_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_pool_id ON public.energy_transactions USING btree (pool_id);


--
-- TOC entry 4005 (class 1259 OID 28580)
-- Name: idx_energy_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_status ON public.energy_transactions USING btree (status);


--
-- TOC entry 4006 (class 1259 OID 28579)
-- Name: idx_energy_transactions_tx_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_tx_hash ON public.energy_transactions USING btree (tx_hash);


--
-- TOC entry 4092 (class 1259 OID 35193)
-- Name: idx_login_logs_login_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_logs_login_time ON public.login_logs USING btree (login_time);


--
-- TOC entry 4093 (class 1259 OID 35212)
-- Name: idx_login_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_logs_user_id ON public.login_logs USING btree (user_id);


--
-- TOC entry 4075 (class 1259 OID 35186)
-- Name: idx_menus_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menus_parent_id ON public.menus USING btree (parent_id);


--
-- TOC entry 4076 (class 1259 OID 35187)
-- Name: idx_menus_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menus_status ON public.menus USING btree (status);


--
-- TOC entry 4096 (class 1259 OID 35195)
-- Name: idx_operation_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_created_at ON public.operation_logs USING btree (created_at);


--
-- TOC entry 4097 (class 1259 OID 35196)
-- Name: idx_operation_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_module ON public.operation_logs USING btree (module);


--
-- TOC entry 4098 (class 1259 OID 35248)
-- Name: idx_operation_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_user_id ON public.operation_logs USING btree (admin_id);


--
-- TOC entry 3960 (class 1259 OID 28559)
-- Name: idx_orders_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_bot_id ON public.orders USING btree (bot_id);


--
-- TOC entry 3961 (class 1259 OID 28562)
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- TOC entry 3962 (class 1259 OID 28563)
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- TOC entry 3963 (class 1259 OID 28561)
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- TOC entry 3964 (class 1259 OID 28560)
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- TOC entry 3965 (class 1259 OID 28558)
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- TOC entry 4064 (class 1259 OID 35183)
-- Name: idx_positions_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_department_id ON public.positions USING btree (department_id);


--
-- TOC entry 4065 (class 1259 OID 35184)
-- Name: idx_positions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_status ON public.positions USING btree (status);


--
-- TOC entry 4053 (class 1259 OID 35036)
-- Name: idx_price_configs_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_configs_is_active ON public.price_configs USING btree (is_active);


--
-- TOC entry 4054 (class 1259 OID 35037)
-- Name: idx_price_configs_mode_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_configs_mode_active ON public.price_configs USING btree (mode_type, is_active);


--
-- TOC entry 4055 (class 1259 OID 35035)
-- Name: idx_price_configs_mode_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_configs_mode_type ON public.price_configs USING btree (mode_type);


--
-- TOC entry 4086 (class 1259 OID 35191)
-- Name: idx_role_permissions_menu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_menu_id ON public.role_permissions USING btree (menu_id);


--
-- TOC entry 4087 (class 1259 OID 35190)
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- TOC entry 4070 (class 1259 OID 35185)
-- Name: idx_roles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_status ON public.roles USING btree (status);


--
-- TOC entry 4101 (class 1259 OID 35269)
-- Name: idx_scheduled_tasks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_tasks_active ON public.scheduled_tasks USING btree (is_active);


--
-- TOC entry 4102 (class 1259 OID 35334)
-- Name: idx_scheduled_tasks_last_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_tasks_last_run ON public.scheduled_tasks USING btree (last_run);


--
-- TOC entry 4103 (class 1259 OID 35270)
-- Name: idx_scheduled_tasks_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_tasks_name ON public.scheduled_tasks USING btree (name);


--
-- TOC entry 4104 (class 1259 OID 35333)
-- Name: idx_scheduled_tasks_next_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_tasks_next_run ON public.scheduled_tasks USING btree (next_run);


--
-- TOC entry 4015 (class 1259 OID 34335)
-- Name: idx_system_config_history_config_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_history_config_id ON public.system_config_history USING btree (config_id);


--
-- TOC entry 4016 (class 1259 OID 34336)
-- Name: idx_system_config_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_history_created_at ON public.system_config_history USING btree (created_at);


--
-- TOC entry 4007 (class 1259 OID 34332)
-- Name: idx_system_configs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_category ON public.system_configs USING btree (category);


--
-- TOC entry 4008 (class 1259 OID 34333)
-- Name: idx_system_configs_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_is_public ON public.system_configs USING btree (is_public);


--
-- TOC entry 4009 (class 1259 OID 34331)
-- Name: idx_system_configs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_key ON public.system_configs USING btree (config_key);


--
-- TOC entry 4010 (class 1259 OID 34334)
-- Name: idx_system_configs_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_updated_at ON public.system_configs USING btree (updated_at);


--
-- TOC entry 4122 (class 1259 OID 35328)
-- Name: idx_system_monitoring_logs_action_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_monitoring_logs_action_data ON public.system_monitoring_logs USING gin (action_data);


--
-- TOC entry 4123 (class 1259 OID 35326)
-- Name: idx_system_monitoring_logs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_monitoring_logs_action_type ON public.system_monitoring_logs USING btree (action_type);


--
-- TOC entry 4124 (class 1259 OID 35325)
-- Name: idx_system_monitoring_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_monitoring_logs_admin_id ON public.system_monitoring_logs USING btree (admin_id);


--
-- TOC entry 4125 (class 1259 OID 35327)
-- Name: idx_system_monitoring_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_monitoring_logs_created_at ON public.system_monitoring_logs USING btree (created_at DESC);


--
-- TOC entry 4109 (class 1259 OID 35288)
-- Name: idx_task_execution_logs_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_execution_logs_started_at ON public.task_execution_logs USING btree (started_at DESC);


--
-- TOC entry 4110 (class 1259 OID 35287)
-- Name: idx_task_execution_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_execution_logs_status ON public.task_execution_logs USING btree (status);


--
-- TOC entry 4111 (class 1259 OID 35286)
-- Name: idx_task_execution_logs_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_execution_logs_task_id ON public.task_execution_logs USING btree (task_id);


--
-- TOC entry 4046 (class 1259 OID 34971)
-- Name: idx_telegram_bots_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bots_active ON public.telegram_bots USING btree (is_active);


--
-- TOC entry 4047 (class 1259 OID 34973)
-- Name: idx_telegram_bots_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bots_created_by ON public.telegram_bots USING btree (created_by);


--
-- TOC entry 4048 (class 1259 OID 34972)
-- Name: idx_telegram_bots_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bots_username ON public.telegram_bots USING btree (bot_username);


--
-- TOC entry 3943 (class 1259 OID 34529)
-- Name: idx_telegram_users_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_users_user_type ON public.users USING btree (user_type);


--
-- TOC entry 4039 (class 1259 OID 34523)
-- Name: idx_user_level_changes_change_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_change_type ON public.user_level_changes USING btree (change_type);


--
-- TOC entry 4040 (class 1259 OID 34522)
-- Name: idx_user_level_changes_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_changed_by ON public.user_level_changes USING btree (changed_by);


--
-- TOC entry 4041 (class 1259 OID 34525)
-- Name: idx_user_level_changes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_created_at ON public.user_level_changes USING btree (created_at);


--
-- TOC entry 4042 (class 1259 OID 34524)
-- Name: idx_user_level_changes_effective_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_effective_date ON public.user_level_changes USING btree (effective_date);


--
-- TOC entry 4043 (class 1259 OID 34521)
-- Name: idx_user_level_changes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_user_id ON public.user_level_changes USING btree (user_id);


--
-- TOC entry 3944 (class 1259 OID 28554)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 3945 (class 1259 OID 28609)
-- Name: idx_users_login_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_login_type ON public.users USING btree (login_type);


--
-- TOC entry 3946 (class 1259 OID 28608)
-- Name: idx_users_password_reset_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_password_reset_token ON public.users USING btree (password_reset_token) WHERE (password_reset_token IS NOT NULL);


--
-- TOC entry 3947 (class 1259 OID 28557)
-- Name: idx_users_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_referral_code ON public.users USING btree (referral_code);


--
-- TOC entry 3948 (class 1259 OID 28556)
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- TOC entry 3949 (class 1259 OID 28553)
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);


--
-- TOC entry 3950 (class 1259 OID 34341)
-- Name: idx_users_trx_balance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_trx_balance ON public.users USING btree (trx_balance);


--
-- TOC entry 3951 (class 1259 OID 34340)
-- Name: idx_users_usdt_balance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_usdt_balance ON public.users USING btree (usdt_balance);


--
-- TOC entry 4170 (class 2620 OID 34499)
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4162 (class 2620 OID 28598)
-- Name: agent_applications update_agent_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_applications_updated_at BEFORE UPDATE ON public.agent_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4163 (class 2620 OID 28599)
-- Name: agent_earnings update_agent_earnings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_earnings_updated_at BEFORE UPDATE ON public.agent_earnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4161 (class 2620 OID 34497)
-- Name: agents update_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4164 (class 2620 OID 28601)
-- Name: bot_users update_bot_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bot_users_updated_at BEFORE UPDATE ON public.bot_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4169 (class 2620 OID 34378)
-- Name: energy_consumption_logs update_energy_consumption_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_consumption_logs_updated_at BEFORE UPDATE ON public.energy_consumption_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4165 (class 2620 OID 28602)
-- Name: energy_pools update_energy_pools_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_pools_updated_at BEFORE UPDATE ON public.energy_pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4166 (class 2620 OID 28603)
-- Name: energy_transactions update_energy_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_transactions_updated_at BEFORE UPDATE ON public.energy_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4160 (class 2620 OID 28596)
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4173 (class 2620 OID 35038)
-- Name: price_configs update_price_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_price_configs_updated_at BEFORE UPDATE ON public.price_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4172 (class 2620 OID 34974)
-- Name: telegram_bots update_telegram_bots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telegram_bots_updated_at BEFORE UPDATE ON public.telegram_bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4171 (class 2620 OID 34526)
-- Name: user_level_changes update_user_level_changes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_level_changes_updated_at BEFORE UPDATE ON public.user_level_changes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4159 (class 2620 OID 28594)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4168 (class 2620 OID 34534)
-- Name: system_config_history validate_system_config_history_user_reference; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_system_config_history_user_reference BEFORE INSERT OR UPDATE ON public.system_config_history FOR EACH ROW EXECUTE FUNCTION public.validate_history_user_reference();


--
-- TOC entry 4689 (class 0 OID 0)
-- Dependencies: 4168
-- Name: TRIGGER validate_system_config_history_user_reference ON system_config_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER validate_system_config_history_user_reference ON public.system_config_history IS '在插入或更新时验证用户引用';


--
-- TOC entry 4167 (class 2620 OID 34532)
-- Name: system_configs validate_system_configs_user_reference; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_system_configs_user_reference BEFORE INSERT OR UPDATE ON public.system_configs FOR EACH ROW EXECUTE FUNCTION public.validate_user_reference();


--
-- TOC entry 4690 (class 0 OID 0)
-- Dependencies: 4167
-- Name: TRIGGER validate_system_configs_user_reference ON system_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER validate_system_configs_user_reference ON public.system_configs IS '在插入或更新时验证用户引用';


--
-- TOC entry 4153 (class 2606 OID 35230)
-- Name: admin_roles admin_roles_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- TOC entry 4152 (class 2606 OID 35134)
-- Name: admin_roles admin_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 4157 (class 2606 OID 35302)
-- Name: admin_sessions admin_sessions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- TOC entry 4143 (class 2606 OID 35198)
-- Name: admins admins_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- TOC entry 4144 (class 2606 OID 35203)
-- Name: admins admins_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE SET NULL;


--
-- TOC entry 4134 (class 2606 OID 28401)
-- Name: agent_applications agent_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- TOC entry 4133 (class 2606 OID 28396)
-- Name: agent_applications agent_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4135 (class 2606 OID 28416)
-- Name: agent_earnings agent_earnings_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- TOC entry 4136 (class 2606 OID 28421)
-- Name: agent_earnings agent_earnings_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 4137 (class 2606 OID 28426)
-- Name: agent_earnings agent_earnings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4132 (class 2606 OID 28379)
-- Name: agents agents_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 4131 (class 2606 OID 28374)
-- Name: agents agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4138 (class 2606 OID 28451)
-- Name: bot_users bot_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4149 (class 2606 OID 35061)
-- Name: departments departments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- TOC entry 4142 (class 2606 OID 34363)
-- Name: energy_consumption_logs energy_consumption_logs_pool_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_consumption_logs
    ADD CONSTRAINT energy_consumption_logs_pool_account_id_fkey FOREIGN KEY (pool_account_id) REFERENCES public.energy_pools(id) ON DELETE CASCADE;


--
-- TOC entry 4139 (class 2606 OID 28488)
-- Name: energy_transactions energy_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 4140 (class 2606 OID 28493)
-- Name: energy_transactions energy_transactions_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.energy_pools(id);


--
-- TOC entry 4128 (class 2606 OID 28587)
-- Name: users fk_users_referred_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by) REFERENCES public.users(id);


--
-- TOC entry 4151 (class 2606 OID 35119)
-- Name: menus menus_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.menus(id) ON DELETE CASCADE;


--
-- TOC entry 4130 (class 2606 OID 28343)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4150 (class 2606 OID 35082)
-- Name: positions positions_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- TOC entry 4148 (class 2606 OID 35030)
-- Name: price_configs price_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_configs
    ADD CONSTRAINT price_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4155 (class 2606 OID 35154)
-- Name: role_permissions role_permissions_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.menus(id) ON DELETE CASCADE;


--
-- TOC entry 4154 (class 2606 OID 35149)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 4141 (class 2606 OID 34321)
-- Name: system_config_history system_config_history_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.system_configs(id);


--
-- TOC entry 4158 (class 2606 OID 35320)
-- Name: system_monitoring_logs system_monitoring_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_monitoring_logs
    ADD CONSTRAINT system_monitoring_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE SET NULL;


--
-- TOC entry 4156 (class 2606 OID 35281)
-- Name: task_execution_logs task_execution_logs_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_execution_logs
    ADD CONSTRAINT task_execution_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.scheduled_tasks(id) ON DELETE CASCADE;


--
-- TOC entry 4147 (class 2606 OID 34966)
-- Name: telegram_bots telegram_bots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4129 (class 2606 OID 34492)
-- Name: users telegram_users_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT telegram_users_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- TOC entry 4146 (class 2606 OID 34516)
-- Name: user_level_changes user_level_changes_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.admins(id);


--
-- TOC entry 4145 (class 2606 OID 34511)
-- Name: user_level_changes user_level_changes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2025-09-03 00:17:51 CST

--
-- PostgreSQL database dump complete
--

