--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

-- Started on 2025-08-28 06:05:40 CST

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
-- TOC entry 4100 (class 1262 OID 28228)
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
-- TOC entry 4101 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 237 (class 1255 OID 28593)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 28384)
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
-- TOC entry 4102 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE agent_applications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_applications IS '代理申请表 - 记录用户申请成为代理的详细信息';


--
-- TOC entry 4103 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.id IS '申请记录唯一标识符（UUID）';


--
-- TOC entry 4104 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.user_id IS '申请用户ID';


--
-- TOC entry 4105 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.application_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.application_reason IS '申请成为代理的原因';


--
-- TOC entry 4106 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.contact_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.contact_info IS '联系信息（JSON格式）';


--
-- TOC entry 4107 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.experience_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.experience_description IS '相关经验描述';


--
-- TOC entry 4108 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.status IS '申请状态：pending=待审核，approved=已通过，rejected=已拒绝';


--
-- TOC entry 4109 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.reviewed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.reviewed_by IS '审核人用户ID';


--
-- TOC entry 4110 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.reviewed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.reviewed_at IS '审核时间';


--
-- TOC entry 4111 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.review_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.review_notes IS '审核备注';


--
-- TOC entry 4112 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.created_at IS '申请创建时间';


--
-- TOC entry 4113 (class 0 OID 0)
-- Dependencies: 217
-- Name: COLUMN agent_applications.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_applications.updated_at IS '申请最后更新时间';


--
-- TOC entry 218 (class 1259 OID 28406)
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
-- TOC entry 4114 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE agent_earnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_earnings IS '代理收益记录表 - 记录代理从订单中获得的佣金明细';


--
-- TOC entry 4115 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.id IS '收益记录唯一标识符（UUID）';


--
-- TOC entry 4116 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.agent_id IS '代理用户ID';


--
-- TOC entry 4117 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.order_id IS '关联订单ID';


--
-- TOC entry 4118 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.user_id IS '下单用户ID';


--
-- TOC entry 4119 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.commission_rate IS '佣金比例（0-1之间的小数）';


--
-- TOC entry 4120 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.commission_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.commission_amount IS '佣金金额（TRX）';


--
-- TOC entry 4121 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.order_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.order_amount IS '订单金额（TRX）';


--
-- TOC entry 4122 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.status IS '收益状态：pending=待结算，paid=已结算，cancelled=已取消';


--
-- TOC entry 4123 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.paid_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.paid_at IS '结算时间';


--
-- TOC entry 4124 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.created_at IS '收益记录创建时间';


--
-- TOC entry 4125 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN agent_earnings.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_earnings.updated_at IS '收益记录最后更新时间';


--
-- TOC entry 216 (class 1259 OID 28358)
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
-- TOC entry 4126 (class 0 OID 0)
-- Dependencies: 216
-- Name: TABLE agents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agents IS '代理用户表 - 管理系统的代理用户信息和收益统计';


--
-- TOC entry 4127 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.id IS '代理记录唯一标识符（UUID）';


--
-- TOC entry 4128 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.user_id IS '代理用户ID';


--
-- TOC entry 4129 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.agent_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.agent_code IS '代理代码，用于标识代理身份';


--
-- TOC entry 4130 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.commission_rate IS '代理佣金比例（0-1之间的小数）';


--
-- TOC entry 4131 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.status IS '代理状态：pending=待审核，active=活跃，inactive=非活跃，suspended=已暂停';


--
-- TOC entry 4132 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.total_earnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_earnings IS '代理累计收益（TRX）';


--
-- TOC entry 4133 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.total_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_orders IS '代理累计订单数量';


--
-- TOC entry 4134 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.total_customers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.total_customers IS '代理累计客户数量';


--
-- TOC entry 4135 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.approved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.approved_at IS '代理审核通过时间';


--
-- TOC entry 4136 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.approved_by IS '审核人用户ID';


--
-- TOC entry 4137 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.created_at IS '代理申请创建时间';


--
-- TOC entry 4138 (class 0 OID 0)
-- Dependencies: 216
-- Name: COLUMN agents.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agents.updated_at IS '代理信息最后更新时间';


--
-- TOC entry 219 (class 1259 OID 28431)
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
-- TOC entry 4139 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE bot_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bot_users IS '机器人用户关联表 - 管理用户与机器人的交互关系和个性化设置';


--
-- TOC entry 4140 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN bot_users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.id IS '关联记录唯一标识符（UUID）';


--
-- TOC entry 4141 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN bot_users.bot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.bot_id IS '机器人ID';


--
-- TOC entry 4142 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN bot_users.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.user_id IS '用户ID';


--
-- TOC entry 4143 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN bot_users.telegram_chat_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.telegram_chat_id IS 'Telegram聊天ID';


--
-- TOC entry 4144 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN bot_users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.status IS '用户状态：active=活跃，blocked=已屏蔽，inactive=非活跃';


--
-- TOC entry 4145 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN bot_users.last_interaction_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.last_interaction_at IS '最后交互时间';


--
-- TOC entry 4146 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN bot_users.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.settings IS '用户个性化设置（JSON格式）';


--
-- TOC entry 4147 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN bot_users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.created_at IS '关联记录创建时间';


--
-- TOC entry 4148 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN bot_users.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bot_users.updated_at IS '关联记录最后更新时间';


--
-- TOC entry 214 (class 1259 OID 28308)
-- Name: bots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    token character varying(500) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    webhook_url character varying(500),
    settings jsonb DEFAULT '{}'::jsonb,
    total_users integer DEFAULT 0,
    total_orders integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bots_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'maintenance'::character varying])::text[])))
);


--
-- TOC entry 4149 (class 0 OID 0)
-- Dependencies: 214
-- Name: TABLE bots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bots IS 'Telegram机器人配置表 - 管理系统的机器人实例和配置';


--
-- TOC entry 4150 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.id IS '机器人唯一标识符（UUID）';


--
-- TOC entry 4151 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.name IS '机器人显示名称';


--
-- TOC entry 4152 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.username IS '机器人用户名（@username）';


--
-- TOC entry 4153 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.token IS '机器人API令牌，用于Telegram Bot API';


--
-- TOC entry 4154 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.description IS '机器人功能描述';


--
-- TOC entry 4155 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.status IS '机器人状态：active=活跃，inactive=非活跃，maintenance=维护中';


--
-- TOC entry 4156 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.webhook_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.webhook_url IS '机器人Webhook回调地址';


--
-- TOC entry 4157 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.settings IS '机器人配置设置（JSON格式）';


--
-- TOC entry 4158 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.total_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.total_users IS '机器人总用户数量';


--
-- TOC entry 4159 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.total_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.total_orders IS '机器人总订单数量';


--
-- TOC entry 4160 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.created_at IS '机器人创建时间';


--
-- TOC entry 4161 (class 0 OID 0)
-- Dependencies: 214
-- Name: COLUMN bots.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bots.updated_at IS '机器人配置最后更新时间';


--
-- TOC entry 213 (class 1259 OID 28296)
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
-- TOC entry 4162 (class 0 OID 0)
-- Dependencies: 213
-- Name: TABLE energy_packages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_packages IS '能量包配置表 - 定义可购买的能量套餐规格和价格';


--
-- TOC entry 4163 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN energy_packages.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.id IS '能量包唯一标识符（UUID）';


--
-- TOC entry 4164 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN energy_packages.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.name IS '能量包名称';


--
-- TOC entry 4165 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN energy_packages.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.description IS '能量包详细描述';


--
-- TOC entry 4166 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN energy_packages.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.energy_amount IS '能量包包含的能量数量';


--
-- TOC entry 4167 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN energy_packages.price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.price IS '能量包价格（TRX）';


--
-- TOC entry 4168 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN energy_packages.duration_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.duration_hours IS '能量包有效期（小时）';


--
-- TOC entry 4169 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN energy_packages.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.is_active IS '能量包是否激活可用';


--
-- TOC entry 4170 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN energy_packages.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.created_at IS '能量包创建时间';


--
-- TOC entry 4171 (class 0 OID 0)
-- Dependencies: 213
-- Name: COLUMN energy_packages.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_packages.updated_at IS '能量包最后更新时间';


--
-- TOC entry 220 (class 1259 OID 28456)
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
    CONSTRAINT energy_pools_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'maintenance'::character varying])::text[])))
);


--
-- TOC entry 4172 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE energy_pools; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_pools IS '能量池管理表 - 管理系统的能量资源分配和状态';


--
-- TOC entry 4173 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.id IS '能量池唯一标识符（UUID）';


--
-- TOC entry 4174 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.name IS '能量池名称';


--
-- TOC entry 4175 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.tron_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.tron_address IS '能量池TRON地址';


--
-- TOC entry 4176 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.private_key_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.private_key_encrypted IS '加密的私钥（用于能量委托）';


--
-- TOC entry 4177 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.total_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.total_energy IS '能量池总能量数量';


--
-- TOC entry 4178 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.available_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.available_energy IS '可用能量数量';


--
-- TOC entry 4179 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.reserved_energy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.reserved_energy IS '预留能量数量';


--
-- TOC entry 4180 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.status IS '能量池状态：active=活跃，inactive=非活跃，maintenance=维护中';


--
-- TOC entry 4181 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.last_updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.last_updated_at IS '最后更新时间';


--
-- TOC entry 4182 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.created_at IS '能量池创建时间';


--
-- TOC entry 4183 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN energy_pools.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_pools.updated_at IS '能量池最后更新时间';


--
-- TOC entry 221 (class 1259 OID 28474)
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
-- TOC entry 4184 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE energy_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.energy_transactions IS '能量交易记录表 - 记录所有能量委托交易的区块链信息';


--
-- TOC entry 4185 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.id IS '交易记录唯一标识符（UUID）';


--
-- TOC entry 4186 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.order_id IS '关联订单ID';


--
-- TOC entry 4187 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.pool_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.pool_id IS '能量池ID';


--
-- TOC entry 4188 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.from_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.from_address IS '发送方地址（能量池地址）';


--
-- TOC entry 4189 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.to_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.to_address IS '接收方地址（用户地址）';


--
-- TOC entry 4190 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.energy_amount IS '交易能量数量';


--
-- TOC entry 4191 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.tx_hash IS '交易哈希';


--
-- TOC entry 4192 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.status IS '交易状态：pending=待确认，confirmed=已确认，failed=失败';


--
-- TOC entry 4193 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.block_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.block_number IS '交易所在区块号';


--
-- TOC entry 4194 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.gas_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.gas_used IS '交易消耗的gas';


--
-- TOC entry 4195 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.created_at IS '交易记录创建时间';


--
-- TOC entry 4196 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN energy_transactions.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.energy_transactions.updated_at IS '交易记录最后更新时间';


--
-- TOC entry 215 (class 1259 OID 28325)
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
-- TOC entry 4197 (class 0 OID 0)
-- Dependencies: 215
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orders IS '订单信息表 - 记录所有能量租赁订单的完整生命周期';


--
-- TOC entry 4198 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.id IS '订单唯一标识符（UUID）';


--
-- TOC entry 4199 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.order_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.order_number IS '订单编号，用于用户查询和系统追踪';


--
-- TOC entry 4200 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.user_id IS '下单用户ID';


--
-- TOC entry 4201 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.bot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.bot_id IS '处理订单的机器人ID';


--
-- TOC entry 4202 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.package_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.package_id IS '购买的能量包ID';


--
-- TOC entry 4203 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.energy_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.energy_amount IS '订单能量数量';


--
-- TOC entry 4204 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.price IS '订单价格（TRX）';


--
-- TOC entry 4205 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.commission_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.commission_rate IS '佣金比例（0-1之间的小数）';


--
-- TOC entry 4206 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.commission_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.commission_amount IS '佣金金额（TRX）';


--
-- TOC entry 4207 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.status IS '订单状态：pending=待处理，processing=处理中，completed=已完成，failed=失败，cancelled=已取消，refunded=已退款';


--
-- TOC entry 4208 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.payment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.payment_status IS '支付状态：unpaid=未支付，paid=已支付，refunded=已退款';


--
-- TOC entry 4209 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.tron_tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.tron_tx_hash IS '用户支付TRX的交易哈希';


--
-- TOC entry 4210 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.delegate_tx_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.delegate_tx_hash IS '能量委托交易哈希';


--
-- TOC entry 4211 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.target_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.target_address IS '目标TRON地址，能量将被委托到此地址';


--
-- TOC entry 4212 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.expires_at IS '订单过期时间';


--
-- TOC entry 4213 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.completed_at IS '订单完成时间';


--
-- TOC entry 4214 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.created_at IS '订单创建时间';


--
-- TOC entry 4215 (class 0 OID 0)
-- Dependencies: 215
-- Name: COLUMN orders.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.updated_at IS '订单最后更新时间';


--
-- TOC entry 222 (class 1259 OID 28498)
-- Name: price_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    bot_id uuid NOT NULL,
    config_name character varying(255) NOT NULL,
    config_type character varying(50) NOT NULL,
    base_price numeric(10,2) NOT NULL,
    price_per_unit numeric(10,6),
    min_amount bigint,
    max_amount bigint,
    duration_hours integer DEFAULT 24,
    is_active boolean DEFAULT true,
    effective_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    effective_until timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT price_configs_config_type_check CHECK (((config_type)::text = ANY ((ARRAY['energy_flash'::character varying, 'transaction_package'::character varying])::text[])))
);


--
-- TOC entry 4216 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE price_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.price_configs IS '价格配置表 - 管理不同机器人的灵活定价策略';


--
-- TOC entry 4217 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.id IS '价格配置唯一标识符（UUID）';


--
-- TOC entry 4218 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.bot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.bot_id IS '机器人ID';


--
-- TOC entry 4219 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.config_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.config_name IS '配置名称';


--
-- TOC entry 4220 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.config_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.config_type IS '配置类型：energy_flash=能量闪租，transaction_package=笔数套餐';


--
-- TOC entry 4221 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.base_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.base_price IS '基础价格（TRX）';


--
-- TOC entry 4222 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.price_per_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.price_per_unit IS '单位价格（TRX/单位）';


--
-- TOC entry 4223 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.min_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.min_amount IS '最小数量限制';


--
-- TOC entry 4224 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.max_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.max_amount IS '最大数量限制';


--
-- TOC entry 4225 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.duration_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.duration_hours IS '有效期（小时）';


--
-- TOC entry 4226 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.is_active IS '配置是否激活';


--
-- TOC entry 4227 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.effective_from; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.effective_from IS '生效开始时间';


--
-- TOC entry 4228 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.effective_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.effective_until IS '生效结束时间';


--
-- TOC entry 4229 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.created_by IS '创建人用户ID';


--
-- TOC entry 4230 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.created_at IS '配置创建时间';


--
-- TOC entry 4231 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN price_configs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_configs.updated_at IS '配置最后更新时间';


--
-- TOC entry 224 (class 1259 OID 28536)
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    config_id uuid NOT NULL,
    old_price numeric(10,2),
    new_price numeric(10,2),
    change_reason character varying(255),
    changed_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4232 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE price_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.price_history IS '价格变更历史表 - 追踪价格配置的变更历史和原因';


--
-- TOC entry 4233 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN price_history.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_history.id IS '历史记录唯一标识符（UUID）';


--
-- TOC entry 4234 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN price_history.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_history.config_id IS '价格配置ID';


--
-- TOC entry 4235 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN price_history.old_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_history.old_price IS '变更前价格';


--
-- TOC entry 4236 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN price_history.new_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_history.new_price IS '变更后价格';


--
-- TOC entry 4237 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN price_history.change_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_history.change_reason IS '变更原因';


--
-- TOC entry 4238 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN price_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_history.changed_by IS '变更人用户ID';


--
-- TOC entry 4239 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN price_history.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_history.created_at IS '变更记录创建时间';


--
-- TOC entry 223 (class 1259 OID 28520)
-- Name: price_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    template_name character varying(255) NOT NULL,
    description text,
    config_data jsonb NOT NULL,
    is_default boolean DEFAULT false,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 4240 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE price_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.price_templates IS '价格模板表 - 提供可复用的标准化定价策略模板';


--
-- TOC entry 4241 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN price_templates.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_templates.id IS '模板唯一标识符（UUID）';


--
-- TOC entry 4242 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN price_templates.template_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_templates.template_name IS '模板名称';


--
-- TOC entry 4243 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN price_templates.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_templates.description IS '模板描述';


--
-- TOC entry 4244 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN price_templates.config_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_templates.config_data IS '模板配置数据（JSON格式）';


--
-- TOC entry 4245 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN price_templates.is_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_templates.is_default IS '是否为默认模板';


--
-- TOC entry 4246 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN price_templates.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_templates.created_by IS '创建人用户ID';


--
-- TOC entry 4247 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN price_templates.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_templates.created_at IS '模板创建时间';


--
-- TOC entry 4248 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN price_templates.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_templates.updated_at IS '模板最后更新时间';


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
-- TOC entry 4249 (class 0 OID 0)
-- Dependencies: 211
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.schema_migrations IS '数据库迁移记录表 - 记录所有已执行的数据库迁移脚本';


--
-- TOC entry 4250 (class 0 OID 0)
-- Dependencies: 211
-- Name: COLUMN schema_migrations.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.id IS '迁移记录唯一标识符';


--
-- TOC entry 4251 (class 0 OID 0)
-- Dependencies: 211
-- Name: COLUMN schema_migrations.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schema_migrations.filename IS '迁移文件名';


--
-- TOC entry 4252 (class 0 OID 0)
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
-- TOC entry 4253 (class 0 OID 0)
-- Dependencies: 210
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- TOC entry 226 (class 1259 OID 34312)
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
-- TOC entry 4254 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE system_config_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_config_history IS '系统配置变更历史表 - 记录配置变更的审计轨迹';


--
-- TOC entry 4255 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN system_config_history.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.id IS '历史记录唯一标识符（UUID）';


--
-- TOC entry 4256 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN system_config_history.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.config_id IS '配置项ID';


--
-- TOC entry 4257 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN system_config_history.old_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.old_value IS '变更前值';


--
-- TOC entry 4258 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN system_config_history.new_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.new_value IS '变更后值';


--
-- TOC entry 4259 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN system_config_history.change_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.change_reason IS '变更原因';


--
-- TOC entry 4260 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN system_config_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.changed_by IS '变更人用户ID';


--
-- TOC entry 4261 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN system_config_history.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_config_history.created_at IS '变更记录创建时间';


--
-- TOC entry 225 (class 1259 OID 34285)
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
-- TOC entry 4262 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE system_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_configs IS '系统配置表 - 集中管理系统参数、功能开关和业务规则';


--
-- TOC entry 4263 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.id IS '配置项唯一标识符（UUID）';


--
-- TOC entry 4264 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.config_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_key IS '配置键名';


--
-- TOC entry 4265 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.config_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_value IS '配置值';


--
-- TOC entry 4266 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.config_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_type IS '配置类型：string=字符串，number=数字，boolean=布尔值，json=JSON对象，array=数组';


--
-- TOC entry 4267 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.category IS '配置分类';


--
-- TOC entry 4268 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.description IS '配置项描述';


--
-- TOC entry 4269 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.is_public; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.is_public IS '是否为公开配置';


--
-- TOC entry 4270 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.is_editable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.is_editable IS '是否可编辑';


--
-- TOC entry 4271 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.validation_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.validation_rules IS '验证规则（JSON格式）';


--
-- TOC entry 4272 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.default_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.default_value IS '默认值';


--
-- TOC entry 4273 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.created_by IS '创建人用户ID';


--
-- TOC entry 4274 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.updated_by IS '最后更新人用户ID';


--
-- TOC entry 4275 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.created_at IS '配置创建时间';


--
-- TOC entry 4276 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN system_configs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.updated_at IS '配置最后更新时间';


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
    role character varying(50) DEFAULT 'user'::character varying NOT NULL,
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
    CONSTRAINT check_admin_password CHECK (((((login_type)::text = 'telegram'::text) AND (password_hash IS NULL)) OR (((login_type)::text = 'admin'::text) AND (password_hash IS NOT NULL)) OR (((login_type)::text = 'both'::text) AND (password_hash IS NOT NULL)))),
    CONSTRAINT check_telegram_id CHECK (((((login_type)::text = 'admin'::text) AND (telegram_id IS NULL)) OR (((login_type)::text = ANY ((ARRAY['telegram'::character varying, 'both'::character varying])::text[])) AND (telegram_id IS NOT NULL)))),
    CONSTRAINT users_login_type_check CHECK (((login_type)::text = ANY ((ARRAY['telegram'::character varying, 'admin'::character varying, 'both'::character varying])::text[]))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'agent'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'banned'::character varying])::text[])))
);


--
-- TOC entry 4277 (class 0 OID 0)
-- Dependencies: 212
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS '用户信息表 - 存储系统所有用户的基本信息、认证信息和业务数据';


--
-- TOC entry 4278 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.id IS '用户唯一标识符（UUID）';


--
-- TOC entry 4279 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.telegram_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.telegram_id IS 'Telegram用户ID，用于Telegram登录';


--
-- TOC entry 4280 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.username IS '用户名，用于显示和登录';


--
-- TOC entry 4281 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.first_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.first_name IS '用户名字';


--
-- TOC entry 4282 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.last_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_name IS '用户姓氏';


--
-- TOC entry 4283 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email IS '用户邮箱地址，用于管理后台登录';


--
-- TOC entry 4284 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.phone IS '用户手机号码';


--
-- TOC entry 4285 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.role IS '用户角色：user=普通用户，agent=代理用户，admin=管理员';


--
-- TOC entry 4286 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.status IS '用户状态：active=活跃，inactive=非活跃，banned=已封禁';


--
-- TOC entry 4287 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.tron_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.tron_address IS '用户TRON钱包地址';


--
-- TOC entry 4288 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.balance IS '用户账户余额（TRX）';


--
-- TOC entry 4289 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.total_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.total_orders IS '用户总订单数量';


--
-- TOC entry 4290 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.total_energy_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.total_energy_used IS '用户累计使用的能量数量';


--
-- TOC entry 4291 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.referral_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.referral_code IS '用户推荐码，用于推荐系统';


--
-- TOC entry 4292 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.referred_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.referred_by IS '推荐人用户ID';


--
-- TOC entry 4293 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.created_at IS '用户创建时间';


--
-- TOC entry 4294 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.updated_at IS '用户信息最后更新时间';


--
-- TOC entry 4295 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS '用户密码哈希值，用于管理后台登录';


--
-- TOC entry 4296 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.login_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.login_type IS '登录类型：telegram=仅Telegram登录，admin=仅管理后台登录，both=两种方式都支持';


--
-- TOC entry 4297 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_login_at IS '最后登录时间';


--
-- TOC entry 4298 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.password_reset_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_reset_token IS '密码重置令牌';


--
-- TOC entry 4299 (class 0 OID 0)
-- Dependencies: 212
-- Name: COLUMN users.password_reset_expires; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_reset_expires IS '密码重置令牌过期时间';


--
-- TOC entry 3707 (class 2604 OID 28233)
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- TOC entry 4085 (class 0 OID 28384)
-- Dependencies: 217
-- Data for Name: agent_applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_applications (id, user_id, application_reason, contact_info, experience_description, status, reviewed_by, reviewed_at, review_notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4086 (class 0 OID 28406)
-- Dependencies: 218
-- Data for Name: agent_earnings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_earnings (id, agent_id, order_id, user_id, commission_rate, commission_amount, order_amount, status, paid_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4084 (class 0 OID 28358)
-- Dependencies: 216
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agents (id, user_id, agent_code, commission_rate, status, total_earnings, total_orders, total_customers, approved_at, approved_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4087 (class 0 OID 28431)
-- Dependencies: 219
-- Data for Name: bot_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bot_users (id, bot_id, user_id, telegram_chat_id, status, last_interaction_at, settings, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4082 (class 0 OID 28308)
-- Dependencies: 214
-- Data for Name: bots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bots (id, name, username, token, description, status, webhook_url, settings, total_users, total_orders, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440010	TRON能量租赁机器人	tron_energy_bot	YOUR_BOT_TOKEN_HERE	官方TRON能量租赁服务机器人	active	\N	{"language": "zh-CN", "timezone": "Asia/Shanghai", "auto_reply": true, "welcome_message": "欢迎使用TRON能量租赁服务！\\n\\n🔋 我们提供快速、安全的TRON能量租赁服务\\n💰 支持多种套餐选择\\n⚡ 即时到账，24小时有效\\n\\n请选择您需要的服务：", "max_daily_orders": 100}	0	0	2025-08-27 09:18:42.097711+08	2025-08-27 09:18:42.097711+08
550e8400-e29b-41d4-a716-446655440011	TRON能量代理机器人	tron_agent_bot	YOUR_AGENT_BOT_TOKEN_HERE	代理专用TRON能量租赁机器人	active	\N	{"language": "zh-CN", "timezone": "Asia/Shanghai", "agent_only": true, "auto_reply": true, "welcome_message": "欢迎使用代理专用TRON能量租赁服务！\\n\\n🎯 专为代理用户设计\\n💎 享受更优惠的价格\\n📊 实时查看收益统计\\n\\n请选择您需要的服务：", "max_daily_orders": 500}	0	0	2025-08-27 09:18:42.097711+08	2025-08-27 09:18:42.097711+08
\.


--
-- TOC entry 4081 (class 0 OID 28296)
-- Dependencies: 213
-- Data for Name: energy_packages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.energy_packages (id, name, description, energy_amount, price, duration_hours, is_active, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440001	基础能量包	适合小额交易的基础能量包	10000	1.00	24	t	2025-08-27 09:18:42.096529+08	2025-08-27 09:18:42.096529+08
550e8400-e29b-41d4-a716-446655440002	标准能量包	适合日常使用的标准能量包	50000	4.50	24	t	2025-08-27 09:18:42.096529+08	2025-08-27 09:18:42.096529+08
550e8400-e29b-41d4-a716-446655440003	高级能量包	适合大额交易的高级能量包	100000	8.00	24	t	2025-08-27 09:18:42.096529+08	2025-08-27 09:18:42.096529+08
550e8400-e29b-41d4-a716-446655440004	企业能量包	适合企业用户的大容量能量包	500000	35.00	24	t	2025-08-27 09:18:42.096529+08	2025-08-27 09:18:42.096529+08
550e8400-e29b-41d4-a716-446655440005	超级能量包	适合超大额交易的超级能量包	1000000	65.00	24	t	2025-08-27 09:18:42.096529+08	2025-08-27 09:18:42.096529+08
\.


--
-- TOC entry 4088 (class 0 OID 28456)
-- Dependencies: 220
-- Data for Name: energy_pools; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.energy_pools (id, name, tron_address, private_key_encrypted, total_energy, available_energy, reserved_energy, status, last_updated_at, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440020	主能量池1	TYour1MainPoolAddressHere123456789	encrypted_private_key_here_1	10000000	10000000	0	active	2025-08-27 09:18:42.099478+08	2025-08-27 09:18:42.099478+08	2025-08-27 09:18:42.099478+08
550e8400-e29b-41d4-a716-446655440021	主能量池2	TYour2MainPoolAddressHere123456789	encrypted_private_key_here_2	10000000	10000000	0	active	2025-08-27 09:18:42.099478+08	2025-08-27 09:18:42.099478+08	2025-08-27 09:18:42.099478+08
550e8400-e29b-41d4-a716-446655440022	备用能量池1	TYourBackupPoolAddressHere123456789	encrypted_private_key_here_3	5000000	5000000	0	active	2025-08-27 09:18:42.099478+08	2025-08-27 09:18:42.099478+08	2025-08-27 09:18:42.099478+08
\.


--
-- TOC entry 4089 (class 0 OID 28474)
-- Dependencies: 221
-- Data for Name: energy_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.energy_transactions (id, order_id, pool_id, from_address, to_address, energy_amount, tx_hash, status, block_number, gas_used, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4083 (class 0 OID 28325)
-- Dependencies: 215
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, user_id, bot_id, package_id, energy_amount, price, commission_rate, commission_amount, status, payment_status, tron_tx_hash, delegate_tx_hash, target_address, expires_at, completed_at, created_at, updated_at) FROM stdin;
11427be5-8dbf-4f54-ba89-bbab14112c8b	ORD1756259427864GJFH	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	550e8400-e29b-41d4-a716-446655440010	550e8400-e29b-41d4-a716-446655440001	10000	1.00	0.0000	0.00	cancelled	unpaid	\N	\N	TRX123456789	2025-08-28 09:50:27.864+08	\N	2025-08-27 09:50:27.865697+08	2025-08-27 09:52:21.608322+08
0ea0c560-be19-4558-b96f-c7b85c46a051	ORD1756259608458BOTV	550e8400-e29b-41d4-a716-446655440000	550e8400-e29b-41d4-a716-446655440011	550e8400-e29b-41d4-a716-446655440002	50000	4.50	0.0000	0.00	pending	unpaid	\N	\N	TRX987654321	2025-08-28 09:53:28.458+08	\N	2025-08-27 09:53:28.45902+08	2025-08-27 09:53:28.45902+08
b1f0537c-ea72-4705-8b07-f52d210c430e	ORD1756259622011V9RK	09ad451f-3bd8-4ebd-a6e0-fc037db7e703	550e8400-e29b-41d4-a716-446655440010	550e8400-e29b-41d4-a716-446655440003	100000	8.00	0.0000	0.00	pending	unpaid	\N	\N	TRX111222333	2025-08-28 09:53:42.011+08	\N	2025-08-27 09:53:42.011661+08	2025-08-27 09:53:42.011661+08
\.


--
-- TOC entry 4090 (class 0 OID 28498)
-- Dependencies: 222
-- Data for Name: price_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_configs (id, bot_id, config_name, config_type, base_price, price_per_unit, min_amount, max_amount, duration_hours, is_active, effective_from, effective_until, created_by, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440030	550e8400-e29b-41d4-a716-446655440010	基础能量闪租	energy_flash	0.50	0.000100	1000	100000	24	t	2025-08-27 09:18:42.100884+08	\N	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.100884+08	2025-08-27 09:18:42.100884+08
550e8400-e29b-41d4-a716-446655440031	550e8400-e29b-41d4-a716-446655440010	高级能量闪租	energy_flash	1.00	0.000080	50000	1000000	24	t	2025-08-27 09:18:42.100884+08	\N	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.100884+08	2025-08-27 09:18:42.100884+08
550e8400-e29b-41d4-a716-446655440032	550e8400-e29b-41d4-a716-446655440010	10笔交易套餐	transaction_package	5.00	\N	10	10	24	t	2025-08-27 09:18:42.100884+08	\N	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.100884+08	2025-08-27 09:18:42.100884+08
550e8400-e29b-41d4-a716-446655440033	550e8400-e29b-41d4-a716-446655440010	50笔交易套餐	transaction_package	20.00	\N	50	50	24	t	2025-08-27 09:18:42.100884+08	\N	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.100884+08	2025-08-27 09:18:42.100884+08
550e8400-e29b-41d4-a716-446655440034	550e8400-e29b-41d4-a716-446655440010	100笔交易套餐	transaction_package	35.00	\N	100	100	24	t	2025-08-27 09:18:42.100884+08	\N	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.100884+08	2025-08-27 09:18:42.100884+08
550e8400-e29b-41d4-a716-446655440035	550e8400-e29b-41d4-a716-446655440011	代理能量闪租	energy_flash	0.40	0.000080	1000	1000000	24	t	2025-08-27 09:18:42.100884+08	\N	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.100884+08	2025-08-27 09:18:42.100884+08
550e8400-e29b-41d4-a716-446655440036	550e8400-e29b-41d4-a716-446655440011	代理10笔套餐	transaction_package	4.00	\N	10	10	24	t	2025-08-27 09:18:42.100884+08	\N	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.100884+08	2025-08-27 09:18:42.100884+08
550e8400-e29b-41d4-a716-446655440037	550e8400-e29b-41d4-a716-446655440011	代理50笔套餐	transaction_package	16.00	\N	50	50	24	t	2025-08-27 09:18:42.100884+08	\N	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.100884+08	2025-08-27 09:18:42.100884+08
550e8400-e29b-41d4-a716-446655440038	550e8400-e29b-41d4-a716-446655440011	代理100笔套餐	transaction_package	28.00	\N	100	100	24	t	2025-08-27 09:18:42.100884+08	\N	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.100884+08	2025-08-27 09:18:42.100884+08
\.


--
-- TOC entry 4092 (class 0 OID 28536)
-- Dependencies: 224
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_history (id, config_id, old_price, new_price, change_reason, changed_by, created_at) FROM stdin;
\.


--
-- TOC entry 4091 (class 0 OID 28520)
-- Dependencies: 223
-- Data for Name: price_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_templates (id, template_name, description, config_data, is_default, created_by, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440040	标准定价模板	适用于大多数机器人的标准定价策略	{"energy_flash": {"base_price": 0.50, "max_amount": 100000, "min_amount": 1000, "duration_hours": 24, "price_per_unit": 0.0001}, "transaction_package": [{"price": 5.00, "transactions": 10}, {"price": 20.00, "transactions": 50}, {"price": 35.00, "transactions": 100}]}	t	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.104084+08	2025-08-27 09:18:42.104084+08
550e8400-e29b-41d4-a716-446655440041	代理优惠模板	专为代理用户设计的优惠定价策略	{"energy_flash": {"base_price": 0.40, "max_amount": 1000000, "min_amount": 1000, "duration_hours": 24, "price_per_unit": 0.00008}, "transaction_package": [{"price": 4.00, "transactions": 10}, {"price": 16.00, "transactions": 50}, {"price": 28.00, "transactions": 100}]}	f	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.104084+08	2025-08-27 09:18:42.104084+08
550e8400-e29b-41d4-a716-446655440042	高端定价模板	适用于高端用户的定价策略	{"energy_flash": {"base_price": 0.60, "max_amount": 500000, "min_amount": 5000, "duration_hours": 24, "price_per_unit": 0.00012}, "transaction_package": [{"price": 6.00, "transactions": 10}, {"price": 25.00, "transactions": 50}, {"price": 45.00, "transactions": 100}]}	f	550e8400-e29b-41d4-a716-446655440000	2025-08-27 09:18:42.104084+08	2025-08-27 09:18:42.104084+08
\.


--
-- TOC entry 4079 (class 0 OID 28230)
-- Dependencies: 211
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schema_migrations (id, filename, executed_at) FROM stdin;
1	001_create_tables.sql	2025-08-27 09:17:35.261284+08
2	002_insert_initial_data.sql	2025-08-27 09:21:08.199366+08
\.


--
-- TOC entry 4094 (class 0 OID 34312)
-- Dependencies: 226
-- Data for Name: system_config_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_config_history (id, config_id, old_value, new_value, change_reason, changed_by, created_at) FROM stdin;
\.


--
-- TOC entry 4093 (class 0 OID 34285)
-- Dependencies: 225
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_configs (id, config_key, config_value, config_type, category, description, is_public, is_editable, validation_rules, default_value, created_by, updated_by, created_at, updated_at) FROM stdin;
857927cc-a67f-4fe2-b691-6c6e16f62b84	system.name	TRON能量租赁系统	string	system	系统名称	t	t	\N	TRON能量租赁系统	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
2dad6564-d212-4131-a199-1cacc7353e91	system.version	1.0.0	string	system	系统版本	t	f	\N	1.0.0	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
365b1611-f634-4f4c-a819-a124615b1d21	system.maintenance_mode	false	boolean	system	维护模式开关	f	t	\N	false	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
5ffed6ce-c94c-4b73-b0a4-b0f34433eda8	system.maintenance_message	系统正在维护中，请稍后再试	string	system	维护模式提示信息	t	t	\N	系统正在维护中，请稍后再试	\N	\N	2025-08-27 10:45:18.241664+08	2025-08-27 10:45:18.241664+08
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
\.


--
-- TOC entry 4080 (class 0 OID 28273)
-- Dependencies: 212
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, telegram_id, username, first_name, last_name, email, phone, role, status, tron_address, balance, total_orders, total_energy_used, referral_code, referred_by, created_at, updated_at, password_hash, login_type, last_login_at, password_reset_token, password_reset_expires) FROM stdin;
09ad451f-3bd8-4ebd-a6e0-fc037db7e703	\N	\N	\N	\N	test@example.com	\N	agent	active	\N	0.000000	0	0	\N	\N	2025-08-27 09:33:04.348682+08	2025-08-27 09:33:04.348682+08	$2a$10$E3QMocOmgGsRzKuV2db.j.OBVfdQ9hfnIkGfOOsNZo6HdAo2wPq6y	admin	\N	\N	\N
550e8400-e29b-41d4-a716-446655440000	\N	admin	System Admin	\N	admin@tronrental.com	\N	admin	active	\N	0.000000	0	0	ADMIN001	\N	2025-08-27 09:18:42.092445+08	2025-08-27 13:32:12.655496+08	$2a$10$eBmRprDb6eabhP.l2nsCjOKWQ7/d.XPau5gwWFTBPNMPL6LnlyzVa	admin	2025-08-27 13:32:12.655496	\N	\N
\.


--
-- TOC entry 4300 (class 0 OID 0)
-- Dependencies: 210
-- Name: schema_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schema_migrations_id_seq', 2, true);


--
-- TOC entry 3852 (class 2606 OID 28395)
-- Name: agent_applications agent_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_pkey PRIMARY KEY (id);


--
-- TOC entry 3854 (class 2606 OID 28415)
-- Name: agent_earnings agent_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_pkey PRIMARY KEY (id);


--
-- TOC entry 3845 (class 2606 OID 28373)
-- Name: agents agents_agent_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_agent_code_key UNIQUE (agent_code);


--
-- TOC entry 3847 (class 2606 OID 28371)
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- TOC entry 3859 (class 2606 OID 28445)
-- Name: bot_users bot_users_bot_id_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_bot_id_telegram_chat_id_key UNIQUE (bot_id, telegram_chat_id);


--
-- TOC entry 3861 (class 2606 OID 28443)
-- Name: bot_users bot_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_pkey PRIMARY KEY (id);


--
-- TOC entry 3829 (class 2606 OID 28322)
-- Name: bots bots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bots
    ADD CONSTRAINT bots_pkey PRIMARY KEY (id);


--
-- TOC entry 3831 (class 2606 OID 28324)
-- Name: bots bots_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bots
    ADD CONSTRAINT bots_username_key UNIQUE (username);


--
-- TOC entry 3827 (class 2606 OID 28307)
-- Name: energy_packages energy_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_packages
    ADD CONSTRAINT energy_packages_pkey PRIMARY KEY (id);


--
-- TOC entry 3866 (class 2606 OID 28471)
-- Name: energy_pools energy_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_pools
    ADD CONSTRAINT energy_pools_pkey PRIMARY KEY (id);


--
-- TOC entry 3868 (class 2606 OID 28473)
-- Name: energy_pools energy_pools_tron_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_pools
    ADD CONSTRAINT energy_pools_tron_address_key UNIQUE (tron_address);


--
-- TOC entry 3872 (class 2606 OID 28485)
-- Name: energy_transactions energy_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 3874 (class 2606 OID 28487)
-- Name: energy_transactions energy_transactions_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_tx_hash_key UNIQUE (tx_hash);


--
-- TOC entry 3841 (class 2606 OID 28342)
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 3843 (class 2606 OID 28340)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 3884 (class 2606 OID 28509)
-- Name: price_configs price_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_configs
    ADD CONSTRAINT price_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 3890 (class 2606 OID 28542)
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3886 (class 2606 OID 28530)
-- Name: price_templates price_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_templates
    ADD CONSTRAINT price_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 3808 (class 2606 OID 28238)
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- TOC entry 3810 (class 2606 OID 28236)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3902 (class 2606 OID 34320)
-- Name: system_config_history system_config_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3896 (class 2606 OID 34301)
-- Name: system_configs system_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_config_key_key UNIQUE (config_key);


--
-- TOC entry 3898 (class 2606 OID 34299)
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 3819 (class 2606 OID 28293)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3821 (class 2606 OID 28289)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3823 (class 2606 OID 28295)
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- TOC entry 3825 (class 2606 OID 28291)
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- TOC entry 3855 (class 1259 OID 28567)
-- Name: idx_agent_earnings_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_agent_id ON public.agent_earnings USING btree (agent_id);


--
-- TOC entry 3856 (class 1259 OID 28568)
-- Name: idx_agent_earnings_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_order_id ON public.agent_earnings USING btree (order_id);


--
-- TOC entry 3857 (class 1259 OID 28569)
-- Name: idx_agent_earnings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_earnings_status ON public.agent_earnings USING btree (status);


--
-- TOC entry 3848 (class 1259 OID 28565)
-- Name: idx_agents_agent_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_agent_code ON public.agents USING btree (agent_code);


--
-- TOC entry 3849 (class 1259 OID 28566)
-- Name: idx_agents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_status ON public.agents USING btree (status);


--
-- TOC entry 3850 (class 1259 OID 28564)
-- Name: idx_agents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agents_user_id ON public.agents USING btree (user_id);


--
-- TOC entry 3862 (class 1259 OID 28572)
-- Name: idx_bot_users_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_bot_id ON public.bot_users USING btree (bot_id);


--
-- TOC entry 3863 (class 1259 OID 28574)
-- Name: idx_bot_users_telegram_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_telegram_chat_id ON public.bot_users USING btree (telegram_chat_id);


--
-- TOC entry 3864 (class 1259 OID 28573)
-- Name: idx_bot_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_users_user_id ON public.bot_users USING btree (user_id);


--
-- TOC entry 3832 (class 1259 OID 28571)
-- Name: idx_bots_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bots_status ON public.bots USING btree (status);


--
-- TOC entry 3833 (class 1259 OID 28570)
-- Name: idx_bots_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bots_username ON public.bots USING btree (username);


--
-- TOC entry 3869 (class 1259 OID 28576)
-- Name: idx_energy_pools_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_status ON public.energy_pools USING btree (status);


--
-- TOC entry 3870 (class 1259 OID 28575)
-- Name: idx_energy_pools_tron_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_pools_tron_address ON public.energy_pools USING btree (tron_address);


--
-- TOC entry 3875 (class 1259 OID 28577)
-- Name: idx_energy_transactions_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_order_id ON public.energy_transactions USING btree (order_id);


--
-- TOC entry 3876 (class 1259 OID 28578)
-- Name: idx_energy_transactions_pool_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_pool_id ON public.energy_transactions USING btree (pool_id);


--
-- TOC entry 3877 (class 1259 OID 28580)
-- Name: idx_energy_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_status ON public.energy_transactions USING btree (status);


--
-- TOC entry 3878 (class 1259 OID 28579)
-- Name: idx_energy_transactions_tx_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_energy_transactions_tx_hash ON public.energy_transactions USING btree (tx_hash);


--
-- TOC entry 3834 (class 1259 OID 28559)
-- Name: idx_orders_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_bot_id ON public.orders USING btree (bot_id);


--
-- TOC entry 3835 (class 1259 OID 28562)
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- TOC entry 3836 (class 1259 OID 28563)
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- TOC entry 3837 (class 1259 OID 28561)
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- TOC entry 3838 (class 1259 OID 28560)
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- TOC entry 3839 (class 1259 OID 28558)
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- TOC entry 3879 (class 1259 OID 28581)
-- Name: idx_price_configs_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_configs_bot_id ON public.price_configs USING btree (bot_id);


--
-- TOC entry 3880 (class 1259 OID 28582)
-- Name: idx_price_configs_config_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_configs_config_type ON public.price_configs USING btree (config_type);


--
-- TOC entry 3881 (class 1259 OID 28584)
-- Name: idx_price_configs_effective_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_configs_effective_from ON public.price_configs USING btree (effective_from);


--
-- TOC entry 3882 (class 1259 OID 28583)
-- Name: idx_price_configs_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_configs_is_active ON public.price_configs USING btree (is_active);


--
-- TOC entry 3887 (class 1259 OID 28585)
-- Name: idx_price_history_config_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_history_config_id ON public.price_history USING btree (config_id);


--
-- TOC entry 3888 (class 1259 OID 28586)
-- Name: idx_price_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_history_created_at ON public.price_history USING btree (created_at);


--
-- TOC entry 3899 (class 1259 OID 34335)
-- Name: idx_system_config_history_config_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_history_config_id ON public.system_config_history USING btree (config_id);


--
-- TOC entry 3900 (class 1259 OID 34336)
-- Name: idx_system_config_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_config_history_created_at ON public.system_config_history USING btree (created_at);


--
-- TOC entry 3891 (class 1259 OID 34332)
-- Name: idx_system_configs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_category ON public.system_configs USING btree (category);


--
-- TOC entry 3892 (class 1259 OID 34333)
-- Name: idx_system_configs_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_is_public ON public.system_configs USING btree (is_public);


--
-- TOC entry 3893 (class 1259 OID 34331)
-- Name: idx_system_configs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_key ON public.system_configs USING btree (config_key);


--
-- TOC entry 3894 (class 1259 OID 34334)
-- Name: idx_system_configs_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_updated_at ON public.system_configs USING btree (updated_at);


--
-- TOC entry 3811 (class 1259 OID 28554)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 3812 (class 1259 OID 28609)
-- Name: idx_users_login_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_login_type ON public.users USING btree (login_type);


--
-- TOC entry 3813 (class 1259 OID 28608)
-- Name: idx_users_password_reset_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_password_reset_token ON public.users USING btree (password_reset_token) WHERE (password_reset_token IS NOT NULL);


--
-- TOC entry 3814 (class 1259 OID 28557)
-- Name: idx_users_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_referral_code ON public.users USING btree (referral_code);


--
-- TOC entry 3815 (class 1259 OID 28555)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 3816 (class 1259 OID 28556)
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- TOC entry 3817 (class 1259 OID 28553)
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);


--
-- TOC entry 3932 (class 2620 OID 28598)
-- Name: agent_applications update_agent_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_applications_updated_at BEFORE UPDATE ON public.agent_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3933 (class 2620 OID 28599)
-- Name: agent_earnings update_agent_earnings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_earnings_updated_at BEFORE UPDATE ON public.agent_earnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3931 (class 2620 OID 28597)
-- Name: agents update_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3934 (class 2620 OID 28601)
-- Name: bot_users update_bot_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bot_users_updated_at BEFORE UPDATE ON public.bot_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3929 (class 2620 OID 28600)
-- Name: bots update_bots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON public.bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3928 (class 2620 OID 28595)
-- Name: energy_packages update_energy_packages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_packages_updated_at BEFORE UPDATE ON public.energy_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3935 (class 2620 OID 28602)
-- Name: energy_pools update_energy_pools_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_pools_updated_at BEFORE UPDATE ON public.energy_pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3936 (class 2620 OID 28603)
-- Name: energy_transactions update_energy_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_energy_transactions_updated_at BEFORE UPDATE ON public.energy_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3930 (class 2620 OID 28596)
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3937 (class 2620 OID 28604)
-- Name: price_configs update_price_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_price_configs_updated_at BEFORE UPDATE ON public.price_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3938 (class 2620 OID 28605)
-- Name: price_templates update_price_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_price_templates_updated_at BEFORE UPDATE ON public.price_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3927 (class 2620 OID 28594)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3910 (class 2606 OID 28401)
-- Name: agent_applications agent_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- TOC entry 3909 (class 2606 OID 28396)
-- Name: agent_applications agent_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3911 (class 2606 OID 28416)
-- Name: agent_earnings agent_earnings_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- TOC entry 3912 (class 2606 OID 28421)
-- Name: agent_earnings agent_earnings_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 3913 (class 2606 OID 28426)
-- Name: agent_earnings agent_earnings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_earnings
    ADD CONSTRAINT agent_earnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3908 (class 2606 OID 28379)
-- Name: agents agents_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 3907 (class 2606 OID 28374)
-- Name: agents agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3914 (class 2606 OID 28446)
-- Name: bot_users bot_users_bot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id);


--
-- TOC entry 3915 (class 2606 OID 28451)
-- Name: bot_users bot_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_users
    ADD CONSTRAINT bot_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3916 (class 2606 OID 28488)
-- Name: energy_transactions energy_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 3917 (class 2606 OID 28493)
-- Name: energy_transactions energy_transactions_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.energy_transactions
    ADD CONSTRAINT energy_transactions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.energy_pools(id);


--
-- TOC entry 3903 (class 2606 OID 28587)
-- Name: users fk_users_referred_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by) REFERENCES public.users(id);


--
-- TOC entry 3905 (class 2606 OID 28348)
-- Name: orders orders_bot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id);


--
-- TOC entry 3906 (class 2606 OID 28353)
-- Name: orders orders_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.energy_packages(id);


--
-- TOC entry 3904 (class 2606 OID 28343)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3918 (class 2606 OID 28510)
-- Name: price_configs price_configs_bot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_configs
    ADD CONSTRAINT price_configs_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id);


--
-- TOC entry 3919 (class 2606 OID 28515)
-- Name: price_configs price_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_configs
    ADD CONSTRAINT price_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3922 (class 2606 OID 28548)
-- Name: price_history price_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- TOC entry 3921 (class 2606 OID 28543)
-- Name: price_history price_history_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.price_configs(id);


--
-- TOC entry 3920 (class 2606 OID 28531)
-- Name: price_templates price_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_templates
    ADD CONSTRAINT price_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3925 (class 2606 OID 34326)
-- Name: system_config_history system_config_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- TOC entry 3926 (class 2606 OID 34321)
-- Name: system_config_history system_config_history_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config_history
    ADD CONSTRAINT system_config_history_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.system_configs(id);


--
-- TOC entry 3923 (class 2606 OID 34302)
-- Name: system_configs system_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3924 (class 2606 OID 34307)
-- Name: system_configs system_configs_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


-- Completed on 2025-08-28 06:05:41 CST

--
-- PostgreSQL database dump complete
--

