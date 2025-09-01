--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

-- Started on 2025-09-01 22:19:47 CST

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
-- TOC entry 4290 (class 1262 OID 28228)
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
-- TOC entry 4291 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 908 (class 1247 OID 34345)
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'own_energy',
    'agent_energy',
    'third_party'
);


--
-- TOC entry 259 (class 1255 OID 34775)
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
-- TOC entry 4292 (class 0 OID 0)
-- Dependencies: 259
-- Name: FUNCTION get_active_bots(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_active_bots() IS '获取所有激活的Telegram机器人列表';


--
-- TOC entry 275 (class 1255 OID 34661)
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
-- TOC entry 4293 (class 0 OID 0)
-- Dependencies: 275
-- Name: FUNCTION get_bot_active_pricing_config(p_bot_id uuid, p_mode_type character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_bot_active_pricing_config(p_bot_id uuid, p_mode_type character varying) IS '获取指定机器人和模式类型的当前有效定价配置';


--
-- TOC entry 260 (class 1255 OID 34776)
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
-- TOC entry 4294 (class 0 OID 0)
-- Dependencies: 260
-- Name: FUNCTION get_bot_by_token(p_bot_token character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_bot_by_token(p_bot_token character varying) IS '根据Bot Token获取机器人信息（安全函数）';


--
-- TOC entry 276 (class 1255 OID 34854)
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
-- TOC entry 4295 (class 0 OID 0)
-- Dependencies: 276
-- Name: FUNCTION get_pricing_change_stats(p_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_pricing_change_stats(p_days integer) IS '获取指定天数内的价格变更统计信息';


--
-- TOC entry 274 (class 1255 OID 34853)
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
-- TOC entry 4296 (class 0 OID 0)
-- Dependencies: 274
-- Name: FUNCTION get_strategy_history(p_strategy_id uuid, p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_strategy_history(p_strategy_id uuid, p_limit integer) IS '获取指定策略的变更历史记录';


--
-- TOC entry 258 (class 1255 OID 34851)
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
-- TOC entry 4297 (class 0 OID 0)
-- Dependencies: 258
-- Name: FUNCTION log_pricing_strategy_changes(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_pricing_strategy_changes() IS '自动记录价格策略变更的触发器函数';


--
-- TOC entry 257 (class 1255 OID 34774)
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
-- TOC entry 4298 (class 0 OID 0)
-- Dependencies: 257
-- Name: FUNCTION update_bot_activity(p_bot_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_bot_activity(p_bot_id uuid) IS '更新指定机器人的最后活动时间';


--
-- TOC entry 256 (class 1255 OID 34384)
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
-- TOC entry 255 (class 1255 OID 28593)
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
-- TOC entry 273 (class 1255 OID 34533)
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
-- TOC entry 4299 (class 0 OID 0)
-- Dependencies: 273
-- Name: FUNCTION validate_history_user_reference(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_history_user_reference() IS '验证 system_config_history 表的用户引用，支持 telegram_users 和 admins 表';


--
-- TOC entry 264 (class 1255 OID 34531)
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
-- TOC entry 4300 (class 0 OID 0)
-- Dependencies: 264
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
-- TOC entry 4301 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE admin_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_roles IS '管理员角色关联表，定义管理员与角色的多对多关系';


--
-- TOC entry 4302 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN admin_roles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.id IS '管理员角色关联唯一标识符';


--
-- TOC entry 4303 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN admin_roles.admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.admin_id IS '管理员ID，关联admins表';


--
-- TOC entry 4304 (class 0 OID 0)
-- Dependencies: 238
-- Name: COLUMN admin_roles.role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_roles.role_id IS '角色ID，关联roles表';


--
-- TOC entry 4305 (class 0 OID 0)
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
-- TOC entry 4306 (class 0 OID 0)
-- Dependencies: 237
-- Name: admin_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_roles_id_seq OWNED BY public.admin_roles.id;


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
    CONSTRAINT admins_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


--
-- TOC entry 4307 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE admins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admins IS '系统管理员表，存储后台管理系统的管理员账户信息';


--
-- TOC entry 4308 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.id IS '管理员唯一标识符（UUID）';


--
-- TOC entry 4309 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.username IS '管理员用户名，用于登录';


--
-- TOC entry 4310 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.email IS '管理员邮箱地址，用于登录和通知';


--
-- TOC entry 4311 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.password_hash IS '管理员密码哈希值，使用bcrypt加密';


--
-- TOC entry 4312 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.role IS '管理员角色类型';


--
-- TOC entry 4313 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.status IS '管理员状态：active-激活，inactive-禁用';


--
-- TOC entry 4314 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.last_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.last_login IS '最后登录时间';


--
-- TOC entry 4315 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.created_at IS '创建时间';


--
-- TOC entry 4316 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.updated_at IS '更新时间';


--
-- TOC entry 4317 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.department_id IS '所属部门ID';


--
-- TOC entry 4318 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN admins.position_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.position_id IS '岗位ID';


--
-- TOC entry 4319 (class 0 OID 0)
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
-- TOC entry 4320 (class 0 OID 0)
-- Dependencies: 215
-- Name: TABLE agent_applications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_applications IS '代理申请表，存储用户申请成为代理的申请记录';


--
-- TOC entry 4321 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.id IS '申请记录唯一标识符';


--
-- TOC entry 4322 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.user_id IS '申请用户ID，关联users表';


--
-- TOC entry 4323 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.application_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.application_reason IS '申请理由';


--
-- TOC entry 4324 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.contact_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.contact_info IS '联系信息（JSON格式）';


--
-- TOC entry 4325 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.experience_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.experience_description IS '相关经验描述';


--
-- TOC entry 4326 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.status IS '申请状态：pending-待审核，approved-已通过，rejected-已拒绝';


--
-- TOC entry 4327 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.reviewed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.reviewed_by IS '审核人ID，关联users表';


--
-- TOC entry 4328 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.reviewed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.reviewed_at IS '审核时间';


--
-- TOC entry 4329 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.review_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.review_notes IS '审核备注';


--
-- TOC entry 4330 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN agent_applications.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.created_at IS '申请创建时间';


--
-- TOC entry 4331 (class 0 OID 0)
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
-- TOC entry 4332 (class 0 OID 0)
-- Dependencies: 216
-- Name: TABLE agent_earnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_earnings IS '代理收益表，记录代理用户的收益明细';


--
-- TOC entry 4333 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.id IS '收益记录唯一标识符';


--
-- TOC entry 4334 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.agent_id IS '代理用户ID';


--
-- TOC entry 4335 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.order_id IS '关联订单ID，关联orders表';


--
-- TOC entry 4336 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.user_id IS '代理用户ID，关联users表';


--
-- TOC entry 4337 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.commission_rate IS '佣金比例（百分比）';


--
-- TOC entry 4338 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.commission_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.commission_amount IS '佣金金额（USDT）';


--
-- TOC entry 4339 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.order_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.order_amount IS '订单金额（TRX）';


--
-- TOC entry 4340 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.status IS '收益状态：pending-待结算，settled-已结算';


--
-- TOC entry 4341 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.paid_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.paid_at IS '结算时间';


--
-- TOC entry 4342 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agent_earnings.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.created_at IS '创建时间';


--
-- TOC entry 4343 (class 0 OID 0)
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
-- TOC entry 4344 (class 0 OID 0)
-- Dependencies: 214
-- Name: TABLE agents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agents IS '代理表，存储已审核通过的代理用户信息';


--
-- TOC entry 4345 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.id IS '代理记录唯一标识符';


--
-- TOC entry 4346 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.user_id IS '代理用户ID，关联users表';


--
-- TOC entry 4347 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.agent_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.agent_code IS '代理商代码，用于标识代理身份';


--
-- TOC entry 4348 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.commission_rate IS '代理佣金比例（百分比）';


--
-- TOC entry 4349 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.status IS '代理状态：active-激活，suspended-暂停';


--
-- TOC entry 4350 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.total_earnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_earnings IS '累计收益金额（USDT）';


--
-- TOC entry 4351 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.total_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_orders IS '代理商累计订单数量';


--
-- TOC entry 4352 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.total_customers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_customers IS '代理商累计客户数量';


--
-- TOC entry 4353 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.approved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.approved_at IS '审核通过时间';


--
-- TOC entry 4354 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.approved_by IS '审核通过人ID，关联users表';


--
-- TOC entry 4355 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN agents.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.created_at IS '创建时间';


--
-- TOC entry 4356 (class 0 OID 0)
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
-- TOC entry 4357 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE bot_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bot_users IS '机器人用户表，存储通过Telegram机器人注册的用户信息';


--
-- TOC entry 4358 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.id IS '机器人用户记录唯一标识符';


--
-- TOC entry 4359 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.bot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.bot_id IS '机器人ID';


--
-- TOC entry 4360 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.user_id IS '关联用户ID，关联users表';


--
-- TOC entry 4361 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.telegram_chat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.telegram_chat_id IS 'Telegram聊天ID';


--
-- TOC entry 4362 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.status IS '用户状态：active=活跃，blocked=已屏蔽，inactive=非活跃';


--
-- TOC entry 4363 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.last_interaction_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.last_interaction_at IS '最后交互时间';


--
-- TOC entry 4364 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.settings IS '用户个性化设置（JSON格式）';


--
-- TOC entry 4365 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN bot_users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.created_at IS '创建时间';


--
-- TOC entry 4366 (class 0 OID 0)
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
-- TOC entry 4367 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE energy_consumption_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_consumption_logs IS '能量消耗日志表，记录用户能量使用的详细日志';


--
-- TOC entry 4368 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.id IS '消耗日志唯一标识符';


--
-- TOC entry 4369 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.pool_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.pool_account_id IS '关联的能量池账户ID';


--
-- TOC entry 4370 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.energy_amount IS '消耗的能量数量';


--
-- TOC entry 4371 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.cost_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.cost_amount IS '消耗能量的成本金额（TRX）';


--
-- TOC entry 4372 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.transaction_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.transaction_type IS '交易类型：reserve=预留，confirm=确认，release=释放';


--
-- TOC entry 4373 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.order_id IS '关联订单ID，关联orders表';


--
-- TOC entry 4374 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.telegram_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.telegram_user_id IS 'Telegram用户ID';


--
-- TOC entry 4375 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN energy_consumption_logs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_consumption_logs.created_at IS '创建时间';


--
-- TOC entry 4376 (class 0 OID 0)
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
-- TOC entry 4377 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE energy_pools; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_pools IS '能量池表，存储系统中可用的能量资源池信息';


--
-- TOC entry 4378 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.id IS '能量池唯一标识符';


--
-- TOC entry 4379 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.name IS '能量池名称';


--
-- TOC entry 4380 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.tron_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.tron_address IS '能量池TRON地址';


--
-- TOC entry 4381 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.private_key_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.private_key_encrypted IS '加密的私钥（用于能量委托）';


--
-- TOC entry 4382 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.total_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.total_energy IS '总能量容量';


--
-- TOC entry 4383 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.available_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.available_energy IS '可用能量数量';


--
-- TOC entry 4384 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.reserved_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.reserved_energy IS '预留能量数量';


--
-- TOC entry 4385 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.status IS '能量池状态：active-激活，inactive-停用';


--
-- TOC entry 4386 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.last_updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.last_updated_at IS '最后更新时间';


--
-- TOC entry 4387 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.created_at IS '创建时间';


--
-- TOC entry 4388 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.updated_at IS '更新时间';


--
-- TOC entry 4389 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.account_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.account_type IS '账户类型：own_energy=自有能量源，agent_energy=代理商能量源，third_party=第三方供应商';


--
-- TOC entry 4390 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.priority IS '优先级，数字越大优先级越高，用于能量分配时的优先级排序';


--
-- TOC entry 4391 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.cost_per_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.cost_per_energy IS '每单位能量的成本（TRX），用于计算能量使用的成本';


--
-- TOC entry 4392 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.description IS '账户描述信息，说明账户的用途和特点';


--
-- TOC entry 4393 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.contact_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.contact_info IS '联系信息（JSON格式），包含账户管理员的联系方式';


--
-- TOC entry 4394 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN energy_pools.daily_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.daily_limit IS '日消耗限制，控制账户每日的最大能量消耗量';


--
-- TOC entry 4395 (class 0 OID 0)
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
-- TOC entry 4396 (class 0 OID 0)
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
-- TOC entry 4397 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE departments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.departments IS '部门表，存储组织架构中的部门信息';


--
-- TOC entry 4398 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.id IS '部门唯一标识符';


--
-- TOC entry 4399 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.name IS '部门名称';


--
-- TOC entry 4400 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.code IS '部门编码，用于系统内部标识';


--
-- TOC entry 4401 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.parent_id IS '上级部门ID，关联departments表，支持树形结构';


--
-- TOC entry 4402 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.level IS '部门层级，从1开始';


--
-- TOC entry 4403 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.sort_order IS '排序顺序';


--
-- TOC entry 4404 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.leader_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.leader_id IS '部门负责人ID，关联admins表';


--
-- TOC entry 4405 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.phone IS '部门联系电话';


--
-- TOC entry 4406 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.email IS '部门联系邮箱';


--
-- TOC entry 4407 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.status IS '部门状态：1-启用，0-禁用';


--
-- TOC entry 4408 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.description IS '部门描述';


--
-- TOC entry 4409 (class 0 OID 0)
-- Dependencies: 230
-- Name: COLUMN departments.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.created_at IS '创建时间';


--
-- TOC entry 4410 (class 0 OID 0)
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
-- TOC entry 4411 (class 0 OID 0)
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
-- TOC entry 4412 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE energy_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_transactions IS '能量交易表，记录所有能量买卖交易的详细信息';


--
-- TOC entry 4413 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.id IS '交易记录唯一标识符';


--
-- TOC entry 4414 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.order_id IS '关联订单ID，关联orders表';


--
-- TOC entry 4415 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.pool_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.pool_id IS '能量池ID';


--
-- TOC entry 4416 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.from_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.from_address IS '发送方地址（能量池地址）';


--
-- TOC entry 4417 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.to_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.to_address IS '接收方地址（用户地址）';


--
-- TOC entry 4418 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.energy_amount IS '交易能量数量';


--
-- TOC entry 4419 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.tx_hash IS '交易哈希';


--
-- TOC entry 4420 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.status IS '交易状态：pending-待处理，completed-已完成，failed-失败';


--
-- TOC entry 4421 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.block_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.block_number IS '交易所在区块号';


--
-- TOC entry 4422 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.gas_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.gas_used IS '交易消耗的gas';


--
-- TOC entry 4423 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN energy_transactions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.created_at IS '创建时间';


--
-- TOC entry 4424 (class 0 OID 0)
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
-- TOC entry 4425 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE login_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.login_logs IS '登录日志表，记录用户登录系统的历史记录';


--
-- TOC entry 4426 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.id IS '登录日志唯一标识符';


--
-- TOC entry 4427 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.user_id IS '用户ID，关联admins表';


--
-- TOC entry 4428 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.username IS '登录用户名';


--
-- TOC entry 4429 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.ip_address IS '登录IP地址';


--
-- TOC entry 4430 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.user_agent IS '用户代理字符串（浏览器信息）';


--
-- TOC entry 4431 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.login_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.login_time IS '登录时间';


--
-- TOC entry 4432 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.logout_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.logout_time IS '登出时间';


--
-- TOC entry 4433 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.status IS '登录状态：success-成功，failed-失败';


--
-- TOC entry 4434 (class 0 OID 0)
-- Dependencies: 242
-- Name: COLUMN login_logs.message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_logs.message IS '登录结果消息';


--
-- TOC entry 4435 (class 0 OID 0)
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
-- TOC entry 4436 (class 0 OID 0)
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
-- TOC entry 4437 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE menus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.menus IS '系统菜单表，存储后台管理系统的菜单结构和权限配置';


--
-- TOC entry 4438 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.id IS '菜单唯一标识符';


--
-- TOC entry 4439 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.name IS '菜单名称';


--
-- TOC entry 4440 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.parent_id IS '父菜单ID，关联menus表，支持树形结构';


--
-- TOC entry 4441 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.type IS '菜单类型：menu-菜单，button-按钮';


--
-- TOC entry 4442 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.path IS '菜单路径（前端路由）';


--
-- TOC entry 4443 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.component; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.component IS '菜单对应的前端组件';


--
-- TOC entry 4444 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.permission; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.permission IS '权限标识符，用于权限控制';


--
-- TOC entry 4445 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.icon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.icon IS '菜单图标';


--
-- TOC entry 4446 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.sort_order IS '排序顺序';


--
-- TOC entry 4447 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.visible; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.visible IS '是否可见：1-可见，0-隐藏';


--
-- TOC entry 4448 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.status IS '菜单状态：1-启用，0-禁用';


--
-- TOC entry 4449 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN menus.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.menus.created_at IS '创建时间';


--
-- TOC entry 4450 (class 0 OID 0)
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
-- TOC entry 4451 (class 0 OID 0)
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
-- TOC entry 4452 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE operation_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.operation_logs IS '操作日志表，记录用户在系统中的所有操作行为';


--
-- TOC entry 4453 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.id IS '操作日志唯一标识符';


--
-- TOC entry 4454 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.admin_id IS '操作用户ID，关联admins表';


--
-- TOC entry 4455 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.username IS '操作用户名';


--
-- TOC entry 4456 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.module; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.module IS '操作模块';


--
-- TOC entry 4457 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.operation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.operation IS '操作类型';


--
-- TOC entry 4458 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.method IS 'HTTP请求方法';


--
-- TOC entry 4459 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.url IS '请求URL';


--
-- TOC entry 4460 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.ip_address IS '操作IP地址';


--
-- TOC entry 4461 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.user_agent IS '用户代理字符串（浏览器信息）';


--
-- TOC entry 4462 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.request_params; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.request_params IS '请求参数（JSON格式）';


--
-- TOC entry 4463 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.response_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.response_data IS '响应数据（JSON格式）';


--
-- TOC entry 4464 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.status IS '操作状态：success-成功，failed-失败';


--
-- TOC entry 4465 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.error_message IS '错误信息';


--
-- TOC entry 4466 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN operation_logs.execution_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.execution_time IS '执行时间（毫秒）';


--
-- TOC entry 4467 (class 0 OID 0)
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
-- TOC entry 4468 (class 0 OID 0)
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
-- TOC entry 4469 (class 0 OID 0)
-- Dependencies: 213
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orders IS '订单表，存储用户的能量租赁订单信息';


--
-- TOC entry 4470 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.id IS '订单唯一标识符';


--
-- TOC entry 4471 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.order_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.order_number IS '订单编号，用于用户查询和系统追踪';


--
-- TOC entry 4472 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.user_id IS '用户ID，关联users表';


--
-- TOC entry 4473 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.bot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.bot_id IS '处理订单的机器人ID';


--
-- TOC entry 4474 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.package_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.package_id IS '购买的能量包ID';


--
-- TOC entry 4475 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.energy_amount IS '能量数量';


--
-- TOC entry 4476 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.price IS '订单价格（TRX）';


--
-- TOC entry 4477 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.commission_rate IS '佣金比例（0-1之间的小数）';


--
-- TOC entry 4478 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.commission_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.commission_amount IS '佣金金额（TRX）';


--
-- TOC entry 4479 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.status IS '订单状态：pending-待支付，paid-已支付，active-激活中，completed-已完成，cancelled-已取消';


--
-- TOC entry 4480 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.payment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.payment_status IS '支付状态：unpaid=未支付，paid=已支付，refunded=已退款';


--
-- TOC entry 4481 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.tron_tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.tron_tx_hash IS '用户支付TRX的交易哈希';


--
-- TOC entry 4482 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.delegate_tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.delegate_tx_hash IS '能量委托交易哈希';


--
-- TOC entry 4483 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.target_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.target_address IS '目标TRON地址，能量将被委托到此地址';


--
-- TOC entry 4484 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.expires_at IS '订单过期时间';


--
-- TOC entry 4485 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.completed_at IS '订单完成时间';


--
-- TOC entry 4486 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN orders.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.created_at IS '创建时间';


--
-- TOC entry 4487 (class 0 OID 0)
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
-- TOC entry 4488 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE positions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.positions IS '岗位表，存储组织架构中的岗位信息';


--
-- TOC entry 4489 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.id IS '岗位唯一标识符';


--
-- TOC entry 4490 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.name IS '岗位名称';


--
-- TOC entry 4491 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.code IS '岗位编码，唯一标识';


--
-- TOC entry 4492 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.department_id IS '所属部门ID，关联departments表';


--
-- TOC entry 4493 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.level IS '岗位级别：1-初级，2-中级，3-高级，4-专家级';


--
-- TOC entry 4494 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.sort_order IS '排序号，数字越小排序越靠前';


--
-- TOC entry 4495 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.status IS '状态：1-启用，0-禁用';


--
-- TOC entry 4496 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.description IS '岗位描述';


--
-- TOC entry 4497 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN positions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.created_at IS '创建时间';


--
-- TOC entry 4498 (class 0 OID 0)
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
-- TOC entry 4499 (class 0 OID 0)
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
-- TOC entry 4500 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE price_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.price_configs IS '价格配置表，存储系统中各种服务的价格配置信息';


--
-- TOC entry 4501 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.id IS '价格配置唯一标识符';


--
-- TOC entry 4502 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.mode_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.mode_type IS '价格模式类型：fixed-固定价格，dynamic-动态价格';


--
-- TOC entry 4503 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.name IS '价格配置名称';


--
-- TOC entry 4504 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.description IS '配置描述';


--
-- TOC entry 4505 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.config IS '价格配置详情，JSON格式存储';


--
-- TOC entry 4506 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.is_active IS '是否启用：true-启用，false-禁用';


--
-- TOC entry 4507 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.created_by IS '创建人ID，关联users表';


--
-- TOC entry 4508 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN price_configs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.created_at IS '创建时间';


--
-- TOC entry 4509 (class 0 OID 0)
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
-- TOC entry 4510 (class 0 OID 0)
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
-- TOC entry 4511 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE role_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.role_permissions IS '角色权限关联表，定义角色与菜单权限的多对多关系';


--
-- TOC entry 4512 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN role_permissions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.id IS '角色权限关联唯一标识符';


--
-- TOC entry 4513 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN role_permissions.role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.role_id IS '角色ID，关联roles表';


--
-- TOC entry 4514 (class 0 OID 0)
-- Dependencies: 240
-- Name: COLUMN role_permissions.menu_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permissions.menu_id IS '菜单ID，关联menus表';


--
-- TOC entry 4515 (class 0 OID 0)
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
-- TOC entry 4516 (class 0 OID 0)
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
-- TOC entry 4517 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS '角色表，存储系统中的用户角色定义';


--
-- TOC entry 4518 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.id IS '角色唯一标识符';


--
-- TOC entry 4519 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.name IS '角色名称';


--
-- TOC entry 4520 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.code IS '角色编码，用于系统内部标识';


--
-- TOC entry 4521 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.type IS '角色类型：system-系统角色，custom-自定义角色';


--
-- TOC entry 4522 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.data_scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.data_scope IS '数据权限范围：1-全部，2-本部门及下级，3-本部门，4-仅本人';


--
-- TOC entry 4523 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.sort_order IS '排序顺序';


--
-- TOC entry 4524 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.status IS '角色状态：1-启用，0-禁用';


--
-- TOC entry 4525 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.description IS '角色描述';


--
-- TOC entry 4526 (class 0 OID 0)
-- Dependencies: 234
-- Name: COLUMN roles.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.created_at IS '创建时间';


--
-- TOC entry 4527 (class 0 OID 0)
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
-- TOC entry 4528 (class 0 OID 0)
-- Dependencies: 233
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


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
-- TOC entry 4529 (class 0 OID 0)
-- Dependencies: 211
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.schema_migrations IS '数据库迁移记录表，跟踪数据库结构变更历史';


--
-- TOC entry 4530 (class 0 OID 0)
-- Dependencies: 211
-- Name: COLUMN schema_migrations.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.id IS '迁移记录唯一标识符';


--
-- TOC entry 4531 (class 0 OID 0)
-- Dependencies: 211
-- Name: COLUMN schema_migrations.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.filename IS '迁移文件名';


--
-- TOC entry 4532 (class 0 OID 0)
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
-- TOC entry 4533 (class 0 OID 0)
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
-- TOC entry 4534 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE system_config_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_config_history IS '系统配置历史表，记录系统配置的变更历史';


--
-- TOC entry 4535 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.id IS '配置历史记录唯一标识符';


--
-- TOC entry 4536 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.config_id IS '配置ID，关联system_configs表';


--
-- TOC entry 4537 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.old_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.old_value IS '修改前的配置值';


--
-- TOC entry 4538 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.new_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.new_value IS '修改后的配置值';


--
-- TOC entry 4539 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.change_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.change_reason IS '修改原因';


--
-- TOC entry 4540 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN system_config_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.changed_by IS '修改人ID，关联admins表';


--
-- TOC entry 4541 (class 0 OID 0)
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
-- TOC entry 4542 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE system_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_configs IS '系统配置表，存储系统运行所需的各种配置参数';


--
-- TOC entry 4543 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.id IS '系统配置唯一标识符';


--
-- TOC entry 4544 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.config_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_key IS '配置键名，用于系统内部标识';


--
-- TOC entry 4545 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.config_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_value IS '配置值';


--
-- TOC entry 4546 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.config_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_type IS '配置类型：string-字符串，number-数字，boolean-布尔值，json-JSON对象';


--
-- TOC entry 4547 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.category IS '配置分类 - system/security/notification等';


--
-- TOC entry 4548 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.description IS '配置描述';


--
-- TOC entry 4549 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.is_public; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.is_public IS '是否为公开配置（前端可访问）';


--
-- TOC entry 4550 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.is_editable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.is_editable IS '是否可编辑 - 是否允许修改';


--
-- TOC entry 4551 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.validation_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.validation_rules IS '验证规则 - JSON格式的验证规则';


--
-- TOC entry 4552 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.default_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.default_value IS '默认值 - 重置时使用的默认值';


--
-- TOC entry 4553 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.created_by IS '创建人用户ID';


--
-- TOC entry 4554 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.updated_by IS '最后更新人用户ID';


--
-- TOC entry 4555 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.created_at IS '创建时间';


--
-- TOC entry 4556 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN system_configs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.updated_at IS '更新时间';


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
-- TOC entry 4557 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE telegram_bots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.telegram_bots IS 'Telegram机器人配置表，存储系统中使用的机器人配置信息';


--
-- TOC entry 4558 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.id IS 'Telegram机器人配置唯一标识符';


--
-- TOC entry 4559 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.bot_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.bot_token IS '机器人Token（加密存储）';


--
-- TOC entry 4560 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.bot_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.bot_name IS '机器人名称';


--
-- TOC entry 4561 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.bot_username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.bot_username IS '机器人用户名';


--
-- TOC entry 4562 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.webhook_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.webhook_url IS 'Webhook回调URL';


--
-- TOC entry 4563 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.is_active IS '是否激活该机器人，只有激活的机器人才能接收和处理消息';


--
-- TOC entry 4564 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.created_by IS '创建人ID，关联users表';


--
-- TOC entry 4565 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN telegram_bots.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_bots.created_at IS '创建时间';


--
-- TOC entry 4566 (class 0 OID 0)
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
-- TOC entry 4567 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE user_level_changes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_level_changes IS '用户等级变更表，记录用户等级变化的历史记录';


--
-- TOC entry 4568 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.id IS '用户等级变更记录唯一标识符';


--
-- TOC entry 4569 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.user_id IS '用户ID，关联users表';


--
-- TOC entry 4570 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.old_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.old_level IS '变更前等级';


--
-- TOC entry 4571 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.new_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.new_level IS '变更后等级';


--
-- TOC entry 4572 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.change_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.change_reason IS '等级变更原因';


--
-- TOC entry 4573 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.changed_by IS '操作人ID，关联admins表';


--
-- TOC entry 4574 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.change_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.change_type IS '变更类型：manual=手动变更，automatic=自动变更，system=系统变更';


--
-- TOC entry 4575 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.effective_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.effective_date IS '生效时间，等级变更开始生效的时间点';


--
-- TOC entry 4576 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN user_level_changes.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_level_changes.created_at IS '创建时间';


--
-- TOC entry 4577 (class 0 OID 0)
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
-- TOC entry 4578 (class 0 OID 0)
-- Dependencies: 212
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS '用户表，存储系统中所有用户的基本信息';


--
-- TOC entry 4579 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.id IS '用户唯一标识符（UUID）';


--
-- TOC entry 4580 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.telegram_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.telegram_id IS 'Telegram用户ID，用于Telegram登录';


--
-- TOC entry 4581 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.username IS '用户名，用于显示和登录';


--
-- TOC entry 4582 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.first_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.first_name IS '用户名字';


--
-- TOC entry 4583 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.last_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_name IS '用户姓氏';


--
-- TOC entry 4584 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email IS '用户邮箱地址，用于管理后台登录';


--
-- TOC entry 4585 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.phone IS '用户手机号码';


--
-- TOC entry 4586 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.status IS '用户状态：active-激活，banned-封禁';


--
-- TOC entry 4587 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.tron_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.tron_address IS '用户TRON钱包地址';


--
-- TOC entry 4588 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.balance IS '用户账户余额（TRX）';


--
-- TOC entry 4589 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.total_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.total_orders IS '用户总订单数量';


--
-- TOC entry 4590 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.total_energy_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.total_energy_used IS '用户累计使用的能量数量';


--
-- TOC entry 4591 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.referral_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.referral_code IS '用户推荐码，用于推荐系统';


--
-- TOC entry 4592 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.referred_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.referred_by IS '推荐人用户ID，关联users表';


--
-- TOC entry 4593 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.created_at IS '创建时间';


--
-- TOC entry 4594 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.updated_at IS '更新时间';


--
-- TOC entry 4595 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS '用户密码哈希值，使用bcrypt加密';


--
-- TOC entry 4596 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.login_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.login_type IS '登录类型：telegram-Telegram登录，admin-管理后台登录，both-两种方式都支持';


--
-- TOC entry 4597 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_login_at IS '最后登录时间';


--
-- TOC entry 4598 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.password_reset_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_reset_token IS '密码重置令牌';


--
-- TOC entry 4599 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.password_reset_expires; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_reset_expires IS '密码重置令牌过期时间';


--
-- TOC entry 4600 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.usdt_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.usdt_balance IS 'USDT余额，精确到8位小数';


--
-- TOC entry 4601 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.trx_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.trx_balance IS 'TRX余额，精确到8位小数';


--
-- TOC entry 4602 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.agent_id IS '所属代理ID，关联agents表';


--
-- TOC entry 4603 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.user_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.user_type IS '用户类型：normal-普通用户，vip-VIP用户，premium-套餐用户';


--
-- TOC entry 3900 (class 2604 OID 35128)
-- Name: admin_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles ALTER COLUMN id SET DEFAULT nextval('public.admin_roles_id_seq'::regclass);


--
-- TOC entry 3874 (class 2604 OID 35049)
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- TOC entry 3904 (class 2604 OID 35163)
-- Name: login_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs ALTER COLUMN id SET DEFAULT nextval('public.login_logs_id_seq'::regclass);


--
-- TOC entry 3893 (class 2604 OID 35108)
-- Name: menus id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus ALTER COLUMN id SET DEFAULT nextval('public.menus_id_seq'::regclass);


--
-- TOC entry 3907 (class 2604 OID 35174)
-- Name: operation_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_logs ALTER COLUMN id SET DEFAULT nextval('public.operation_logs_id_seq'::regclass);


--
-- TOC entry 3880 (class 2604 OID 35070)
-- Name: positions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- TOC entry 3869 (class 2604 OID 35021)
-- Name: price_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_configs ALTER COLUMN id SET DEFAULT nextval('public.price_configs_id_seq'::regclass);


--
-- TOC entry 3902 (class 2604 OID 35143)
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- TOC entry 3886 (class 2604 OID 35091)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3766 (class 2604 OID 34337)
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- TOC entry 4278 (class 0 OID 35125)
-- Dependencies: 238
-- Data for Name: admin_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_roles (id, admin_id, role_id, created_at) FROM stdin;
1	980ff3a6-161d-49d6-9373-454d1e3cf4c4	1	2025-09-01 15:36:49.844553
\.


--
-- TOC entry 4264 (class 0 OID 34422)
-- Dependencies: 224
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admins (id, username, email, password_hash, role, status, last_login, created_at, updated_at, department_id, position_id, last_login_at) FROM stdin;
980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	admin@tronrental.com	$2a$12$JV0X/zw6AEtYHJ71HM29IO5Vr3jHcM6KED/1o6P.Dz9SerwfeIFIe	super_admin	active	2025-09-01 22:12:52.644369+08	2025-08-28 14:44:32.807375+08	2025-09-01 22:12:52.644369+08	\N	\N	2025-09-01 22:12:52.644369
fb9d5e25-7a11-439e-997e-80d9c49087a3	updatedadmin	updated@admin.com	$2a$12$9vPUF3UrFIthu94zAShaW.U6tUKPh6Bj6hdigc1p0NUlghCjnpOmC	admin	inactive	\N	2025-08-28 15:21:08.920763+08	2025-08-28 15:21:18.979508+08	\N	\N	\N
833cf35a-0114-4d5c-aead-886d500a1570	customerservice	cs@tronrental.com	$2a$12$s0V6Ouna32mcabwlCWqYx.asXkO9mfVGk99zzi8vF3Uv.Db4Nooem	customer_service	active	\N	2025-08-28 18:52:41.584155+08	2025-08-28 18:52:41.584155+08	\N	\N	\N
f46cbeb3-7d4f-41aa-ba82-b6f13a354ce6	testadmin	test@admin.com	$2a$12$MbbXXVdmRGLDVIDOgktH7.GXUft.PlyNoMgHB0SfkIjaZ.Z0B6Dra	admin	active	\N	2025-08-28 17:43:03.202006+08	2025-08-28 17:43:03.202006+08	\N	\N	\N
f8cecf0b-8dd5-4347-9dee-35254957f243	testloguser	testlog@example.com	$2b$10$7/WpEPdMUv/cKIMBjFRQ3u0f/LbF/sKc5tcTqzq9zXV3ZU4US1TaG	admin	active	\N	2025-09-01 21:59:13.280354+08	2025-09-01 21:59:13.280354+08	\N	\N	\N
3d97a67a-71d8-4891-9ef8-5fe25c557ac5	testloguser7	testlog7@example.com	$2b$10$8oLLeJlqjrhsF62pbukQG.ZhlsDReqMJBv8/tVsdp4EjGQ7sTUdKW	admin	active	\N	2025-09-01 22:03:32.860377+08	2025-09-01 22:03:32.860377+08	\N	\N	\N
\.


--
-- TOC entry 4256 (class 0 OID 28384)
-- Dependencies: 215
-- Data for Name: agent_applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_applications (id, user_id, application_reason, contact_info, experience_description, status, reviewed_by, reviewed_at, review_notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4257 (class 0 OID 28406)
-- Dependencies: 216
-- Data for Name: agent_earnings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_earnings (id, agent_id, order_id, user_id, commission_rate, commission_amount, order_amount, status, paid_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4255 (class 0 OID 28358)
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
-- TOC entry 4258 (class 0 OID 28431)
-- Dependencies: 217
-- Data for Name: bot_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bot_users (id, bot_id, user_id, telegram_chat_id, status, last_interaction_at, settings, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4270 (class 0 OID 35046)
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
\.


--
-- TOC entry 4263 (class 0 OID 34355)
-- Dependencies: 222
-- Data for Name: energy_consumption_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.energy_consumption_logs (id, pool_account_id, energy_amount, cost_amount, transaction_type, order_id, telegram_user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4259 (class 0 OID 28456)
-- Dependencies: 218
-- Data for Name: energy_pools; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.energy_pools (id, name, tron_address, private_key_encrypted, total_energy, available_energy, reserved_energy, status, last_updated_at, created_at, updated_at, account_type, priority, cost_per_energy, description, contact_info, daily_limit, monthly_limit) FROM stdin;
550e8400-e29b-41d4-a716-446655440021	主能量池2	TYour2MainPoolAddressHere123456789	encrypted_private_key_here_2	10000000	10000000	0	maintenance	2025-08-28 15:16:22.938697+08	2025-08-27 09:18:42.099478+08	2025-08-28 16:09:10.604225+08	own_energy	1	0.001000	\N	\N	\N	\N
0c0ea0b0-1c53-4881-aae2-19928f1b1a97	测试代理商账户	TTestAgentAddress123456789012345	encrypted_test_key_here	5000000	5000000	0	inactive	2025-08-28 16:52:09.88964+08	2025-08-28 12:38:47.834256+08	2025-08-28 16:52:09.88964+08	agent_energy	1	0.001000	\N	\N	\N	\N
550e8400-e29b-41d4-a716-446655440020	主能量池11111111111111	TYour1MainPoolAddressHere123456789	encrypted_private_key_here_1	10000000	10000000	0	active	2025-08-28 20:09:28.538167+08	2025-08-27 09:18:42.099478+08	2025-08-28 20:09:28.538167+08	own_energy	1	0.001000	\N	\N	\N	\N
\.


--
-- TOC entry 4260 (class 0 OID 28474)
-- Dependencies: 219
-- Data for Name: energy_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.energy_transactions (id, order_id, pool_id, from_address, to_address, energy_amount, tx_hash, status, block_number, gas_used, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4282 (class 0 OID 35160)
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
\.


--
-- TOC entry 4276 (class 0 OID 35105)
-- Dependencies: 236
-- Data for Name: menus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menus (id, name, parent_id, type, path, component, permission, icon, sort_order, visible, status, created_at, updated_at) FROM stdin;
11	部门管理	1	2	/system/departments	system/departments/index	system:dept:list	Building2	1	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
12	岗位管理	1	2	/system/positions	system/positions/index	system:position:list	UserCheck	2	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
13	角色管理	1	2	/system/roles	system/roles/index	system:role:list	Shield	3	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
14	菜单管理	1	2	/system/menus	system/menus/index	system:menu:list	Menu	4	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
15	用户管理	1	2	/system/users	system/users/index	system:user:list	Users	5	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
21	订单管理	2	2	/business/orders	business/orders/index	business:order:list	ShoppingCart	1	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
22	用户管理	2	2	/business/customers	business/customers/index	business:customer:list	User	2	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
23	代理管理	2	2	/business/agents	business/agents/index	business:agent:list	UserPlus	3	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
24	价格配置	2	2	/business/price-config	business/price-config/index	business:price:list	DollarSign	4	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
25	能量池管理	2	2	/business/energy-pool	business/energy-pool/index	business:energy:list	Zap	5	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
33	系统统计	3	2	/monitor/statistics	monitor/statistics/index	monitor:stats:list	BarChart3	3	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
111	部门新增	11	3	\N	\N	system:dept:add	\N	1	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
112	部门修改	11	3	\N	\N	system:dept:edit	\N	2	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
113	部门删除	11	3	\N	\N	system:dept:remove	\N	3	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
121	岗位新增	12	3	\N	\N	system:position:add	\N	1	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
122	岗位修改	12	3	\N	\N	system:position:edit	\N	2	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
123	岗位删除	12	3	\N	\N	system:position:remove	\N	3	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
131	角色新增	13	3	\N	\N	system:role:add	\N	1	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
132	角色修改	13	3	\N	\N	system:role:edit	\N	2	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
133	角色删除	13	3	\N	\N	system:role:remove	\N	3	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
134	分配权限	13	3	\N	\N	system:role:permission	\N	4	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
141	菜单新增	14	3	\N	\N	system:menu:add	\N	1	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
142	菜单修改	14	3	\N	\N	system:menu:edit	\N	2	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
143	菜单删除	14	3	\N	\N	system:menu:remove	\N	3	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
151	用户新增	15	3	\N	\N	system:user:add	\N	1	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
152	用户修改	15	3	\N	\N	system:user:edit	\N	2	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
153	用户删除	15	3	\N	\N	system:user:remove	\N	3	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
154	重置密码	15	3	\N	\N	system:user:resetpwd	\N	4	0	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
1	系统管理	\N	1	/system	\N	system	Settings	3	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
2	业务管理	\N	1	/business	\N	business	Briefcase	1	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
3	监控中心	\N	1	/monitor	\N	monitor	Monitor	2	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
155	系统设置	1	1	/system/settings	SystemSettings	system:settings:list	Cog	6	1	1	2025-09-01 16:15:30.795019	2025-09-01 16:15:30.795019
157	日志管理	1	1	/system/logs	SystemLogs	system:log:list	FileText	7	1	1	2025-09-01 18:55:01.82243	2025-09-01 18:55:01.82243
31	登录日志	157	2	/system/logs/login	SystemLogsLogin	system:log:login:list	LogIn	1	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
32	操作日志	157	2	/system/logs/operation	SystemLogsOperation	system:log:operation:list	FileText	2	1	1	2025-09-01 13:52:52.097831	2025-09-01 13:52:52.097831
\.


--
-- TOC entry 4284 (class 0 OID 35171)
-- Dependencies: 244
-- Data for Name: operation_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operation_logs (id, admin_id, username, module, operation, method, url, ip_address, user_agent, request_params, response_data, status, error_message, execution_time, created_at) FROM stdin;
3	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	创建管理员	创建管理员	POST	/api/admins	::1	curl/8.7.1	{"body":{"username":"testloguser7","email":"testlog7@example.com","password":"password123","role":"admin"},"query":{},"params":{}}	{"success":true,"data":{"id":"3d97a67a-71d8-4891-9ef8-5fe25c557ac5","username":"testloguser7","email":"testlog7@example.com","role":"admin","status":"active","department_id":null,"position_id":null,"created_at":"2025-09-01T14:03:32.860Z","updated_at":"2025-09-01T14:03:32.860Z"},"message":"管理员创建成功"}	201	\N	55	2025-09-01 22:03:32.862
4	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	创建部门	创建部门	POST	/api/system/departments	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"body":{"name":"12312","code":"123123","parent_id":9,"sort_order":0,"status":1},"query":{},"params":{}}	{"success":true,"data":{"id":11,"name":"12312","code":"123123","parent_id":9,"level":3,"sort_order":0,"status":1,"description":null,"created_at":"2025-09-01T14:13:33.769Z","updated_at":"2025-09-01T14:13:33.769Z"},"message":"部门创建成功"}	201	\N	7	2025-09-01 22:13:33.773
5	980ff3a6-161d-49d6-9373-454d1e3cf4c4	superadmin	更新部门	更新部门	PUT	/api/system/departments/11	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	{"body":{"name":"12312","code":"123123","parent_id":9,"sort_order":0,"status":0},"query":{},"params":{"id":"11"}}	{"success":true,"data":{"id":11,"name":"12312","code":"123123","parent_id":9,"level":3,"sort_order":0,"status":0,"description":null,"created_at":"2025-09-01T14:13:33.769Z","updated_at":"2025-09-01T14:13:37.920Z"},"message":"部门更新成功"}	200	\N	3	2025-09-01 22:13:37.922
\.


--
-- TOC entry 4254 (class 0 OID 28325)
-- Dependencies: 213
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, user_id, bot_id, package_id, energy_amount, price, commission_rate, commission_amount, status, payment_status, tron_tx_hash, delegate_tx_hash, target_address, expires_at, completed_at, created_at, updated_at) FROM stdin;
11427be5-8dbf-4f54-ba89-bbab14112c8b	ORD1756259427864GJFH	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	550e8400-e29b-41d4-a716-446655440010	550e8400-e29b-41d4-a716-446655440001	10000	1.00	0.0000	0.00	cancelled	unpaid	\N	\N	TRX123456789	2025-08-28 09:50:27.864+08	\N	2025-08-27 09:50:27.865697+08	2025-08-27 09:52:21.608322+08
0ea0c560-be19-4558-b96f-c7b85c46a051	ORD1756259608458BOTV	550e8400-e29b-41d4-a716-446655440000	550e8400-e29b-41d4-a716-446655440011	550e8400-e29b-41d4-a716-446655440002	50000	4.50	0.0000	0.00	pending	unpaid	\N	\N	TRX987654321	2025-08-28 09:53:28.458+08	\N	2025-08-27 09:53:28.45902+08	2025-08-27 09:53:28.45902+08
b1f0537c-ea72-4705-8b07-f52d210c430e	ORD1756259622011V9RK	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	550e8400-e29b-41d4-a716-446655440010	550e8400-e29b-41d4-a716-446655440003	100000	8.00	0.0000	0.00	pending	unpaid	\N	\N	TRX111222333	2025-08-28 09:53:42.011+08	\N	2025-08-27 09:53:42.011661+08	2025-08-27 09:53:42.011661+08
\.


--
-- TOC entry 4272 (class 0 OID 35067)
-- Dependencies: 232
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.positions (id, name, code, department_id, level, sort_order, status, description, created_at, updated_at) FROM stdin;
1	系统管理员	SYS_ADMIN	2	1	1	1	系统最高管理权限	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
2	技术经理	TECH_MANAGER	2	2	2	1	技术部门负责人	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
3	开发工程师	DEVELOPER	2	3	3	1	系统开发人员	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
5	客服专员	CUSTOMER_SERVICE	3	3	2	1	客户服务人员	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
6	财务经理	FINANCE_MANAGER	4	2	1	1	财务部门负责人	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
7	会计	ACCOUNTANT	4	3	2	1	财务会计人员	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
8	市场经理	MARKETING_MANAGER	5	2	1	1	市场部门负责人	2025-09-01 13:52:52.094097	2025-09-01 13:52:52.094097
4	运营经理	OP_MANAGER	1	2	1	1	运营部门负责人	2025-09-01 13:52:52.094097	2025-09-01 21:32:08.668
\.


--
-- TOC entry 4268 (class 0 OID 35018)
-- Dependencies: 228
-- Data for Name: price_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_configs (id, mode_type, name, description, config, is_active, created_by, created_at, updated_at) FROM stdin;
1	energy_flash	能量闪租配置	单笔能量闪租价格配置	{"currency": "TRX", "max_amount": 13, "expiry_hours": 0.1, "single_price": 2.8, "payment_address": "TBD", "max_transactions": 5, "double_energy_for_no_usdt": false}	t	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	2025-08-29 19:39:04.172854	2025-08-29 21:46:24.33667
5	transaction_package	笔数套餐配置	无时间限制的长期套餐	{"packages": [{"name": "基础套餐", "price": 25, "transaction_count": 11}, {"name": "标准套餐", "price": 120, "transaction_count": 50}], "daily_fee": 1, "transferable": true, "proxy_purchase": true}	t	550e8400-e29b-41d4-a716-446655440000	2025-08-29 20:13:28.65604	2025-08-29 20:57:28.818948
8	trx_exchange	TRX闪兑服务	USDT自动兑换TRX服务，转U自动回TRX，1U起换	{"notes": ["🔸回其他地址联系客服", "🚫请不要使用交易所转账，丢失自负"], "min_amount": 1, "exchange_address": "TM263fmPZfpjjnN2ec9uVEoNgg23456789", "is_auto_exchange": true, "trx_to_usdt_rate": 29.9, "usdt_to_trx_rate": 2.65, "rate_update_interval": 5}	\N	\N	2025-08-29 22:04:36.247821	2025-09-01 21:47:16.825652
6	trx_exchange	TRX闪兑服务	USDT自动兑换TRX服务，支持实时汇率和自动兑换地址	{"notes": ["🔸回其他地址联系客服", "🚫请不要使用交易所转账，丢失自负"], "min_amount": 1, "exchange_address": "TM263fmPZfpjjnN2ec9uVEoNgg23456789", "is_auto_exchange": true, "trx_to_usdt_rate": 29.9, "usdt_to_trx_rate": 2.65, "rate_update_interval": 5}	\N	\N	2025-08-29 21:59:03.041447	2025-09-01 21:47:16.825652
2	vip_package	VIP套餐配置	VIP会员套餐价格配置	{"packages": [{"name": "月度VIP", "price": 99, "benefits": {"no_daily_fee": true, "priority_support": true, "unlimited_transactions": true}, "duration_days": 31}, {"name": "季度VIP", "price": 249, "benefits": {"no_daily_fee": true, "priority_support": true, "unlimited_transactions": true}, "duration_days": 91}, {"name": "年度VIP", "price": 899, "benefits": {"no_daily_fee": true, "priority_support": true, "unlimited_transactions": true}, "duration_days": 364}]}	f	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	2025-08-29 19:39:04.175121	2025-08-29 21:41:13.184626
\.


--
-- TOC entry 4280 (class 0 OID 35140)
-- Dependencies: 240
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (id, role_id, menu_id, created_at) FROM stdin;
1	1	1	2025-09-01 13:52:52.100138
2	1	2	2025-09-01 13:52:52.100138
3	1	3	2025-09-01 13:52:52.100138
4	1	11	2025-09-01 13:52:52.100138
5	1	12	2025-09-01 13:52:52.100138
6	1	13	2025-09-01 13:52:52.100138
7	1	14	2025-09-01 13:52:52.100138
8	1	15	2025-09-01 13:52:52.100138
9	1	21	2025-09-01 13:52:52.100138
10	1	22	2025-09-01 13:52:52.100138
11	1	23	2025-09-01 13:52:52.100138
12	1	24	2025-09-01 13:52:52.100138
13	1	25	2025-09-01 13:52:52.100138
14	1	31	2025-09-01 13:52:52.100138
15	1	32	2025-09-01 13:52:52.100138
16	1	33	2025-09-01 13:52:52.100138
17	1	111	2025-09-01 13:52:52.100138
18	1	112	2025-09-01 13:52:52.100138
19	1	113	2025-09-01 13:52:52.100138
20	1	121	2025-09-01 13:52:52.100138
21	1	122	2025-09-01 13:52:52.100138
22	1	123	2025-09-01 13:52:52.100138
23	1	131	2025-09-01 13:52:52.100138
24	1	132	2025-09-01 13:52:52.100138
25	1	133	2025-09-01 13:52:52.100138
26	1	134	2025-09-01 13:52:52.100138
27	1	141	2025-09-01 13:52:52.100138
28	1	142	2025-09-01 13:52:52.100138
29	1	143	2025-09-01 13:52:52.100138
30	1	151	2025-09-01 13:52:52.100138
31	1	152	2025-09-01 13:52:52.100138
32	1	153	2025-09-01 13:52:52.100138
33	1	154	2025-09-01 13:52:52.100138
34	2	1	2025-09-01 13:52:52.103085
35	2	11	2025-09-01 13:52:52.103085
36	2	12	2025-09-01 13:52:52.103085
37	2	13	2025-09-01 13:52:52.103085
38	2	14	2025-09-01 13:52:52.103085
39	2	15	2025-09-01 13:52:52.103085
40	3	1	2025-09-01 13:52:52.103688
41	3	11	2025-09-01 13:52:52.103688
42	3	12	2025-09-01 13:52:52.103688
43	3	15	2025-09-01 13:52:52.103688
44	3	111	2025-09-01 13:52:52.103688
45	3	112	2025-09-01 13:52:52.103688
46	3	121	2025-09-01 13:52:52.103688
47	3	122	2025-09-01 13:52:52.103688
48	3	151	2025-09-01 13:52:52.103688
49	3	152	2025-09-01 13:52:52.103688
50	1	155	2025-09-01 16:22:58.855219
\.


--
-- TOC entry 4274 (class 0 OID 35088)
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
-- TOC entry 4252 (class 0 OID 28230)
-- Dependencies: 211
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schema_migrations (id, filename, executed_at) FROM stdin;
1	001_create_tables.sql	2025-08-27 09:17:35.261284+08
2	002_insert_initial_data.sql	2025-08-27 09:21:08.199366+08
\.


--
-- TOC entry 4262 (class 0 OID 34312)
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
-- TOC entry 4261 (class 0 OID 34285)
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
-- TOC entry 4266 (class 0 OID 34953)
-- Dependencies: 226
-- Data for Name: telegram_bots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.telegram_bots (id, bot_token, bot_name, bot_username, webhook_url, is_active, created_by, created_at, updated_at) FROM stdin;
cadc6941-fa3a-4c2c-9ace-6723c9ae9b83	1234567890:AAEhBOweik9yloUvGooFW0oXgmMEzpSeOg0	TronEnergyBot	tron_energy_bot	https://api.telegram.org/bot1234567890:AAEhBOweik9yloUvGooFW0oXgmMEzpSeOg0/setWebhook	t	550e8400-e29b-41d4-a716-446655440000	2025-08-29 21:09:07.522892+08	2025-08-29 21:09:07.522892+08
de5971b3-eebd-4405-b0c6-20aa1b5c2012	9876543210:BBFhCPxfjl0zmqVwHppGX1pYhnNFAqtTfh1	TronRentalBot	tron_rental_bot	https://api.telegram.org/bot9876543210:BBFhCPxfjl0zmqVwHppGX1pYhnNFAqtTfh1/setWebhook	t	550e8400-e29b-41d4-a716-446655440000	2025-08-29 21:09:07.522892+08	2025-08-29 21:09:07.522892+08
3e98f9cf-e588-4097-8fe0-b41b130df29a	5555555555:CCGiDQyglm1anrWxIqqHY2qZioOGBruUgi2	TestBot	test_bot	\N	f	550e8400-e29b-41d4-a716-446655440000	2025-08-29 21:09:07.522892+08	2025-08-29 21:09:07.522892+08
\.


--
-- TOC entry 4265 (class 0 OID 34500)
-- Dependencies: 225
-- Data for Name: user_level_changes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_level_changes (id, user_id, old_level, new_level, change_reason, changed_by, change_type, effective_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4253 (class 0 OID 28273)
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
-- TOC entry 4604 (class 0 OID 0)
-- Dependencies: 237
-- Name: admin_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_roles_id_seq', 1, true);


--
-- TOC entry 4605 (class 0 OID 0)
-- Dependencies: 229
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.departments_id_seq', 11, true);


--
-- TOC entry 4606 (class 0 OID 0)
-- Dependencies: 241
-- Name: login_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.login_logs_id_seq', 200, true);


--
-- TOC entry 4607 (class 0 OID 0)
-- Dependencies: 235
-- Name: menus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menus_id_seq', 157, true);


--
-- TOC entry 4608 (class 0 OID 0)
-- Dependencies: 243
-- Name: operation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operation_logs_id_seq', 5, true);


--
-- TOC entry 4609 (class 0 OID 0)
-- Dependencies: 231
-- Name: positions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.positions_id_seq', 10, true);


--
-- TOC entry 4610 (class 0 OID 0)
-- Dependencies: 227
-- Name: price_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_configs_id_seq', 8, true);


--
-- TOC entry 4611 (class 0 OID 0)
-- Dependencies: 239
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 50, true);


--
-- TOC entry 4612 (class 0 OID 0)
-- Dependencies: 233
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 6, true);


--
-- TOC entry 4613 (class 0 OID 0)
-- Dependencies: 210
-- Name: schema_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schema_migrations_id_seq', 2, true);


--
-- TOC entry 4048 (class 2606 OID 35229)
-- Name: admin_roles admin_roles_admin_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_admin_id_role_id_key UNIQUE (admin_id, role_id);


--
-- TOC entry 4050 (class 2606 OID 35131)
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3996 (class 2606 OID 34438)
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- TOC entry 3998 (class 2606 OID 34434)
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- TOC entry 4000 (class 2606 OID 34436)
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- TOC entry 3949 (class 2606 OID 28395)
-- Name: agent_applications agent_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_pkey PRIMARY KEY (id);


--
-- TOC entry 3951 (class 2606 OID 28415)
-- Name: agent_earnings agent_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_pkey PRIMARY KEY (id);


--
-- TOC entry 3942 (class 2606 OID 28373)
-- Name: agents agents_agent_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_agent_code_key UNIQUE (agent_code);


--
-- TOC entry 3944 (class 2606 OID 28371)
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- TOC entry 3956 (class 2606 OID 28445)
-- Name: bot_users bot_users_bot_id_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_bot_id_telegram_chat_id_key UNIQUE (bot_id, telegram_chat_id);


--
-- TOC entry 3958 (class 2606 OID 28443)
-- Name: bot_users bot_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_pkey PRIMARY KEY (id);


--
-- TOC entry 4027 (class 2606 OID 35060)
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- TOC entry 4029 (class 2606 OID 35058)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 3991 (class 2606 OID 34362)
-- Name: energy_consumption_logs energy_consumption_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_consumption_logs
    ADD CONSTRAINT energy_consumption_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3963 (class 2606 OID 28471)
-- Name: energy_pools energy_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_pools
    ADD CONSTRAINT energy_pools_pkey PRIMARY KEY (id);


--
-- TOC entry 3965 (class 2606 OID 28473)
-- Name: energy_pools energy_pools_tron_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_pools
    ADD CONSTRAINT energy_pools_tron_address_key UNIQUE (tron_address);


--
-- TOC entry 3971 (class 2606 OID 28485)
-- Name: energy_transactions energy_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 3973 (class 2606 OID 28487)
-- Name: energy_transactions energy_transactions_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_tx_hash_key UNIQUE (tx_hash);


--
-- TOC entry 4062 (class 2606 OID 35169)
-- Name: login_logs login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4046 (class 2606 OID 35118)
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- TOC entry 4067 (class 2606 OID 35180)
-- Name: operation_logs operation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT operation_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3938 (class 2606 OID 28342)
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 3940 (class 2606 OID 28340)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4035 (class 2606 OID 35081)
-- Name: positions positions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_code_key UNIQUE (code);


--
-- TOC entry 4037 (class 2606 OID 35079)
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- TOC entry 4025 (class 2606 OID 35029)
-- Name: price_configs price_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_configs
    ADD CONSTRAINT price_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 4056 (class 2606 OID 35146)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 4058 (class 2606 OID 35148)
-- Name: role_permissions role_permissions_role_id_menu_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_menu_id_key UNIQUE (role_id, menu_id);


--
-- TOC entry 4040 (class 2606 OID 35103)
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- TOC entry 4042 (class 2606 OID 35101)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3911 (class 2606 OID 28238)
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- TOC entry 3913 (class 2606 OID 28236)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3989 (class 2606 OID 34320)
-- Name: system_config_history system_config_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3983 (class 2606 OID 34301)
-- Name: system_configs system_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_config_key_key UNIQUE (config_key);


--
-- TOC entry 3985 (class 2606 OID 34299)
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 4018 (class 2606 OID 34965)
-- Name: telegram_bots telegram_bots_bot_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_bot_token_key UNIQUE (bot_token);


--
-- TOC entry 4020 (class 2606 OID 34963)
-- Name: telegram_bots telegram_bots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_pkey PRIMARY KEY (id);


--
-- TOC entry 4013 (class 2606 OID 34510)
-- Name: user_level_changes user_level_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_pkey PRIMARY KEY (id);


--
-- TOC entry 3924 (class 2606 OID 28293)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3926 (class 2606 OID 28289)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3928 (class 2606 OID 28295)
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- TOC entry 3930 (class 2606 OID 28291)
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- TOC entry 4051 (class 1259 OID 35227)
-- Name: idx_admin_roles_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_roles_admin_id ON public.admin_roles USING btree (admin_id);


--
-- TOC entry 4052 (class 1259 OID 35189)
-- Name: idx_admin_roles_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_roles_role_id ON public.admin_roles USING btree (role_id);


--
-- TOC entry 4001 (class 1259 OID 35208)
-- Name: idx_admins_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_department_id ON public.admins USING btree (department_id);


--
-- TOC entry 4002 (class 1259 OID 34440)
-- Name: idx_admins_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_email ON public.admins USING btree (email);


--
-- TOC entry 4003 (class 1259 OID 35210)
-- Name: idx_admins_last_login_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_last_login_at ON public.admins USING btree (last_login_at);


--
-- TOC entry 4004 (class 1259 OID 35209)
-- Name: idx_admins_position_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_position_id ON public.admins USING btree (position_id);


--
-- TOC entry 4005 (class 1259 OID 34441)
-- Name: idx_admins_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_status ON public.admins USING btree (status);


--
-- TOC entry 4006 (class 1259 OID 34439)
-- Name: idx_admins_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_username ON public.admins USING btree (username);


--
-- TOC entry 3952 (class 1259 OID 28567)
-- Name: idx_agent_earnings_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_agent_id ON public.agent_earnings USING btree (agent_id);


--
-- TOC entry 3953 (class 1259 OID 28568)
-- Name: idx_agent_earnings_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_order_id ON public.agent_earnings USING btree (order_id);


--
-- TOC entry 3954 (class 1259 OID 28569)
-- Name: idx_agent_earnings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_status ON public.agent_earnings USING btree (status);


--
-- TOC entry 3945 (class 1259 OID 28565)
-- Name: idx_agents_agent_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_agent_code ON public.agents USING btree (agent_code);


--
-- TOC entry 3946 (class 1259 OID 28566)
-- Name: idx_agents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_status ON public.agents USING btree (status);


--
-- TOC entry 3947 (class 1259 OID 28564)
-- Name: idx_agents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_user_id ON public.agents USING btree (user_id);


--
-- TOC entry 3959 (class 1259 OID 28572)
-- Name: idx_bot_users_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_bot_id ON public.bot_users USING btree (bot_id);


--
-- TOC entry 3960 (class 1259 OID 28574)
-- Name: idx_bot_users_telegram_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_telegram_chat_id ON public.bot_users USING btree (telegram_chat_id);


--
-- TOC entry 3961 (class 1259 OID 28573)
-- Name: idx_bot_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_user_id ON public.bot_users USING btree (user_id);


--
-- TOC entry 4030 (class 1259 OID 35181)
-- Name: idx_departments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_parent_id ON public.departments USING btree (parent_id);


--
-- TOC entry 4031 (class 1259 OID 35182)
-- Name: idx_departments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_status ON public.departments USING btree (status);


--
-- TOC entry 3992 (class 1259 OID 34371)
-- Name: idx_energy_consumption_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_consumption_logs_created_at ON public.energy_consumption_logs USING btree (created_at);


--
-- TOC entry 3993 (class 1259 OID 34372)
-- Name: idx_energy_consumption_logs_pool_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_consumption_logs_pool_account_id ON public.energy_consumption_logs USING btree (pool_account_id);


--
-- TOC entry 3994 (class 1259 OID 34373)
-- Name: idx_energy_consumption_logs_transaction_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_consumption_logs_transaction_type ON public.energy_consumption_logs USING btree (transaction_type);


--
-- TOC entry 3966 (class 1259 OID 34368)
-- Name: idx_energy_pools_account_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_account_type ON public.energy_pools USING btree (account_type);


--
-- TOC entry 3967 (class 1259 OID 34369)
-- Name: idx_energy_pools_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_priority ON public.energy_pools USING btree (priority DESC);


--
-- TOC entry 3968 (class 1259 OID 28576)
-- Name: idx_energy_pools_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_status ON public.energy_pools USING btree (status);


--
-- TOC entry 3969 (class 1259 OID 28575)
-- Name: idx_energy_pools_tron_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_tron_address ON public.energy_pools USING btree (tron_address);


--
-- TOC entry 3974 (class 1259 OID 28577)
-- Name: idx_energy_transactions_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_order_id ON public.energy_transactions USING btree (order_id);


--
-- TOC entry 3975 (class 1259 OID 28578)
-- Name: idx_energy_transactions_pool_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_pool_id ON public.energy_transactions USING btree (pool_id);


--
-- TOC entry 3976 (class 1259 OID 28580)
-- Name: idx_energy_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_status ON public.energy_transactions USING btree (status);


--
-- TOC entry 3977 (class 1259 OID 28579)
-- Name: idx_energy_transactions_tx_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_tx_hash ON public.energy_transactions USING btree (tx_hash);


--
-- TOC entry 4059 (class 1259 OID 35193)
-- Name: idx_login_logs_login_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_logs_login_time ON public.login_logs USING btree (login_time);


--
-- TOC entry 4060 (class 1259 OID 35212)
-- Name: idx_login_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_logs_user_id ON public.login_logs USING btree (user_id);


--
-- TOC entry 4043 (class 1259 OID 35186)
-- Name: idx_menus_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menus_parent_id ON public.menus USING btree (parent_id);


--
-- TOC entry 4044 (class 1259 OID 35187)
-- Name: idx_menus_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menus_status ON public.menus USING btree (status);


--
-- TOC entry 4063 (class 1259 OID 35195)
-- Name: idx_operation_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_created_at ON public.operation_logs USING btree (created_at);


--
-- TOC entry 4064 (class 1259 OID 35196)
-- Name: idx_operation_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_module ON public.operation_logs USING btree (module);


--
-- TOC entry 4065 (class 1259 OID 35248)
-- Name: idx_operation_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_user_id ON public.operation_logs USING btree (admin_id);


--
-- TOC entry 3931 (class 1259 OID 28559)
-- Name: idx_orders_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_bot_id ON public.orders USING btree (bot_id);


--
-- TOC entry 3932 (class 1259 OID 28562)
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- TOC entry 3933 (class 1259 OID 28563)
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- TOC entry 3934 (class 1259 OID 28561)
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- TOC entry 3935 (class 1259 OID 28560)
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- TOC entry 3936 (class 1259 OID 28558)
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- TOC entry 4032 (class 1259 OID 35183)
-- Name: idx_positions_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_department_id ON public.positions USING btree (department_id);


--
-- TOC entry 4033 (class 1259 OID 35184)
-- Name: idx_positions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_status ON public.positions USING btree (status);


--
-- TOC entry 4021 (class 1259 OID 35036)
-- Name: idx_price_configs_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_configs_is_active ON public.price_configs USING btree (is_active);


--
-- TOC entry 4022 (class 1259 OID 35037)
-- Name: idx_price_configs_mode_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_configs_mode_active ON public.price_configs USING btree (mode_type, is_active);


--
-- TOC entry 4023 (class 1259 OID 35035)
-- Name: idx_price_configs_mode_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_configs_mode_type ON public.price_configs USING btree (mode_type);


--
-- TOC entry 4053 (class 1259 OID 35191)
-- Name: idx_role_permissions_menu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_menu_id ON public.role_permissions USING btree (menu_id);


--
-- TOC entry 4054 (class 1259 OID 35190)
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- TOC entry 4038 (class 1259 OID 35185)
-- Name: idx_roles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_status ON public.roles USING btree (status);


--
-- TOC entry 3986 (class 1259 OID 34335)
-- Name: idx_system_config_history_config_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_history_config_id ON public.system_config_history USING btree (config_id);


--
-- TOC entry 3987 (class 1259 OID 34336)
-- Name: idx_system_config_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_history_created_at ON public.system_config_history USING btree (created_at);


--
-- TOC entry 3978 (class 1259 OID 34332)
-- Name: idx_system_configs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_category ON public.system_configs USING btree (category);


--
-- TOC entry 3979 (class 1259 OID 34333)
-- Name: idx_system_configs_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_is_public ON public.system_configs USING btree (is_public);


--
-- TOC entry 3980 (class 1259 OID 34331)
-- Name: idx_system_configs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_key ON public.system_configs USING btree (config_key);


--
-- TOC entry 3981 (class 1259 OID 34334)
-- Name: idx_system_configs_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_updated_at ON public.system_configs USING btree (updated_at);


--
-- TOC entry 4014 (class 1259 OID 34971)
-- Name: idx_telegram_bots_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bots_active ON public.telegram_bots USING btree (is_active);


--
-- TOC entry 4015 (class 1259 OID 34973)
-- Name: idx_telegram_bots_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bots_created_by ON public.telegram_bots USING btree (created_by);


--
-- TOC entry 4016 (class 1259 OID 34972)
-- Name: idx_telegram_bots_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bots_username ON public.telegram_bots USING btree (bot_username);


--
-- TOC entry 3914 (class 1259 OID 34529)
-- Name: idx_telegram_users_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_users_user_type ON public.users USING btree (user_type);


--
-- TOC entry 4007 (class 1259 OID 34523)
-- Name: idx_user_level_changes_change_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_change_type ON public.user_level_changes USING btree (change_type);


--
-- TOC entry 4008 (class 1259 OID 34522)
-- Name: idx_user_level_changes_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_changed_by ON public.user_level_changes USING btree (changed_by);


--
-- TOC entry 4009 (class 1259 OID 34525)
-- Name: idx_user_level_changes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_created_at ON public.user_level_changes USING btree (created_at);


--
-- TOC entry 4010 (class 1259 OID 34524)
-- Name: idx_user_level_changes_effective_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_effective_date ON public.user_level_changes USING btree (effective_date);


--
-- TOC entry 4011 (class 1259 OID 34521)
-- Name: idx_user_level_changes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_changes_user_id ON public.user_level_changes USING btree (user_id);


--
-- TOC entry 3915 (class 1259 OID 28554)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 3916 (class 1259 OID 28609)
-- Name: idx_users_login_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_login_type ON public.users USING btree (login_type);


--
-- TOC entry 3917 (class 1259 OID 28608)
-- Name: idx_users_password_reset_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_password_reset_token ON public.users USING btree (password_reset_token) WHERE (password_reset_token IS NOT NULL);


--
-- TOC entry 3918 (class 1259 OID 28557)
-- Name: idx_users_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_referral_code ON public.users USING btree (referral_code);


--
-- TOC entry 3919 (class 1259 OID 28556)
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- TOC entry 3920 (class 1259 OID 28553)
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);


--
-- TOC entry 3921 (class 1259 OID 34341)
-- Name: idx_users_trx_balance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_trx_balance ON public.users USING btree (trx_balance);


--
-- TOC entry 3922 (class 1259 OID 34340)
-- Name: idx_users_usdt_balance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_usdt_balance ON public.users USING btree (usdt_balance);


--
-- TOC entry 4107 (class 2620 OID 34499)
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4099 (class 2620 OID 28598)
-- Name: agent_applications update_agent_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_applications_updated_at BEFORE UPDATE ON public.agent_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4100 (class 2620 OID 28599)
-- Name: agent_earnings update_agent_earnings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_earnings_updated_at BEFORE UPDATE ON public.agent_earnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4098 (class 2620 OID 34497)
-- Name: agents update_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4101 (class 2620 OID 28601)
-- Name: bot_users update_bot_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bot_users_updated_at BEFORE UPDATE ON public.bot_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4106 (class 2620 OID 34378)
-- Name: energy_consumption_logs update_energy_consumption_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_consumption_logs_updated_at BEFORE UPDATE ON public.energy_consumption_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4102 (class 2620 OID 28602)
-- Name: energy_pools update_energy_pools_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_pools_updated_at BEFORE UPDATE ON public.energy_pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4103 (class 2620 OID 28603)
-- Name: energy_transactions update_energy_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_transactions_updated_at BEFORE UPDATE ON public.energy_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4097 (class 2620 OID 28596)
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4110 (class 2620 OID 35038)
-- Name: price_configs update_price_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_price_configs_updated_at BEFORE UPDATE ON public.price_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4109 (class 2620 OID 34974)
-- Name: telegram_bots update_telegram_bots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telegram_bots_updated_at BEFORE UPDATE ON public.telegram_bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4108 (class 2620 OID 34526)
-- Name: user_level_changes update_user_level_changes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_level_changes_updated_at BEFORE UPDATE ON public.user_level_changes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4096 (class 2620 OID 28594)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4105 (class 2620 OID 34534)
-- Name: system_config_history validate_system_config_history_user_reference; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_system_config_history_user_reference BEFORE INSERT OR UPDATE ON public.system_config_history FOR EACH ROW EXECUTE FUNCTION public.validate_history_user_reference();


--
-- TOC entry 4614 (class 0 OID 0)
-- Dependencies: 4105
-- Name: TRIGGER validate_system_config_history_user_reference ON system_config_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER validate_system_config_history_user_reference ON public.system_config_history IS '在插入或更新时验证用户引用';


--
-- TOC entry 4104 (class 2620 OID 34532)
-- Name: system_configs validate_system_configs_user_reference; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_system_configs_user_reference BEFORE INSERT OR UPDATE ON public.system_configs FOR EACH ROW EXECUTE FUNCTION public.validate_user_reference();


--
-- TOC entry 4615 (class 0 OID 0)
-- Dependencies: 4104
-- Name: TRIGGER validate_system_configs_user_reference ON system_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER validate_system_configs_user_reference ON public.system_configs IS '在插入或更新时验证用户引用';


--
-- TOC entry 4093 (class 2606 OID 35230)
-- Name: admin_roles admin_roles_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- TOC entry 4092 (class 2606 OID 35134)
-- Name: admin_roles admin_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 4083 (class 2606 OID 35198)
-- Name: admins admins_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- TOC entry 4084 (class 2606 OID 35203)
-- Name: admins admins_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE SET NULL;


--
-- TOC entry 4074 (class 2606 OID 28401)
-- Name: agent_applications agent_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- TOC entry 4073 (class 2606 OID 28396)
-- Name: agent_applications agent_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4075 (class 2606 OID 28416)
-- Name: agent_earnings agent_earnings_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- TOC entry 4076 (class 2606 OID 28421)
-- Name: agent_earnings agent_earnings_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 4077 (class 2606 OID 28426)
-- Name: agent_earnings agent_earnings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4072 (class 2606 OID 28379)
-- Name: agents agents_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 4071 (class 2606 OID 28374)
-- Name: agents agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4078 (class 2606 OID 28451)
-- Name: bot_users bot_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4089 (class 2606 OID 35061)
-- Name: departments departments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- TOC entry 4082 (class 2606 OID 34363)
-- Name: energy_consumption_logs energy_consumption_logs_pool_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_consumption_logs
    ADD CONSTRAINT energy_consumption_logs_pool_account_id_fkey FOREIGN KEY (pool_account_id) REFERENCES public.energy_pools(id) ON DELETE CASCADE;


--
-- TOC entry 4079 (class 2606 OID 28488)
-- Name: energy_transactions energy_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 4080 (class 2606 OID 28493)
-- Name: energy_transactions energy_transactions_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.energy_pools(id);


--
-- TOC entry 4068 (class 2606 OID 28587)
-- Name: users fk_users_referred_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by) REFERENCES public.users(id);


--
-- TOC entry 4091 (class 2606 OID 35119)
-- Name: menus menus_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.menus(id) ON DELETE CASCADE;


--
-- TOC entry 4070 (class 2606 OID 28343)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4090 (class 2606 OID 35082)
-- Name: positions positions_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- TOC entry 4088 (class 2606 OID 35030)
-- Name: price_configs price_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_configs
    ADD CONSTRAINT price_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4095 (class 2606 OID 35154)
-- Name: role_permissions role_permissions_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.menus(id) ON DELETE CASCADE;


--
-- TOC entry 4094 (class 2606 OID 35149)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 4081 (class 2606 OID 34321)
-- Name: system_config_history system_config_history_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.system_configs(id);


--
-- TOC entry 4087 (class 2606 OID 34966)
-- Name: telegram_bots telegram_bots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4069 (class 2606 OID 34492)
-- Name: users telegram_users_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT telegram_users_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- TOC entry 4086 (class 2606 OID 34516)
-- Name: user_level_changes user_level_changes_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.admins(id);


--
-- TOC entry 4085 (class 2606 OID 34511)
-- Name: user_level_changes user_level_changes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_changes
    ADD CONSTRAINT user_level_changes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2025-09-01 22:19:47 CST

--
-- PostgreSQL database dump complete
--

