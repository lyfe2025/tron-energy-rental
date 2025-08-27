-- TRON能量租赁系统数据库表结构
-- 创建时间: 2024-01-01
-- 版本: 1.0.0
-- 创建TRON能量租赁系统数据库表结构

-- 用户表启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'agent', 'admin')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    tron_address VARCHAR(255),
    balance DECIMAL(20, 6) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_energy_used BIGINT DEFAULT 0,
    referral_code VARCHAR(50) UNIQUE,
    referred_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 能量包表
CREATE TABLE energy_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    energy_amount BIGINT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_hours INTEGER NOT NULL DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Telegram机器人表
CREATE TABLE bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    token VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    webhook_url VARCHAR(500),
    settings JSONB DEFAULT '{}',
    total_users INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    bot_id UUID REFERENCES bots(id),
    package_id UUID REFERENCES energy_packages(id),
    energy_amount BIGINT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 4) DEFAULT 0,
    commission_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    tron_tx_hash VARCHAR(255),
    delegate_tx_hash VARCHAR(255),
    target_address VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 代理表
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    agent_code VARCHAR(50) UNIQUE NOT NULL,
    commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    total_earnings DECIMAL(20, 6) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 代理申请表
CREATE TABLE agent_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    application_reason TEXT,
    contact_info JSONB,
    experience_description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 代理收益表
CREATE TABLE agent_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES users(id),
    commission_rate DECIMAL(5, 4) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    order_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 机器人用户表
CREATE TABLE bot_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id),
    user_id UUID NOT NULL REFERENCES users(id),
    telegram_chat_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'inactive')),
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bot_id, telegram_chat_id)
);

-- 能量池表
CREATE TABLE energy_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tron_address VARCHAR(255) NOT NULL UNIQUE,
    private_key_encrypted TEXT NOT NULL,
    total_energy BIGINT NOT NULL DEFAULT 0,
    available_energy BIGINT NOT NULL DEFAULT 0,
    reserved_energy BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 能量交易表
CREATE TABLE energy_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    pool_id UUID NOT NULL REFERENCES energy_pools(id),
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    energy_amount BIGINT NOT NULL,
    tx_hash VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    block_number BIGINT,
    gas_used BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 价格配置表
CREATE TABLE price_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id),
    config_name VARCHAR(255) NOT NULL,
    config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('energy_flash', 'transaction_package')),
    base_price DECIMAL(10, 2) NOT NULL,
    price_per_unit DECIMAL(10, 6),
    min_amount BIGINT,
    max_amount BIGINT,
    duration_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 价格模板表
CREATE TABLE price_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    config_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 价格历史表
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES price_configs(id),
    old_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2),
    change_reason VARCHAR(255),
    changed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_referral_code ON users(referral_code);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_bot_id ON orders(bot_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);

CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_agent_code ON agents(agent_code);
CREATE INDEX idx_agents_status ON agents(status);

CREATE INDEX idx_agent_earnings_agent_id ON agent_earnings(agent_id);
CREATE INDEX idx_agent_earnings_order_id ON agent_earnings(order_id);
CREATE INDEX idx_agent_earnings_status ON agent_earnings(status);

CREATE INDEX idx_bots_username ON bots(username);
CREATE INDEX idx_bots_status ON bots(status);

CREATE INDEX idx_bot_users_bot_id ON bot_users(bot_id);
CREATE INDEX idx_bot_users_user_id ON bot_users(user_id);
CREATE INDEX idx_bot_users_telegram_chat_id ON bot_users(telegram_chat_id);

CREATE INDEX idx_energy_pools_tron_address ON energy_pools(tron_address);
CREATE INDEX idx_energy_pools_status ON energy_pools(status);

CREATE INDEX idx_energy_transactions_order_id ON energy_transactions(order_id);
CREATE INDEX idx_energy_transactions_pool_id ON energy_transactions(pool_id);
CREATE INDEX idx_energy_transactions_tx_hash ON energy_transactions(tx_hash);
CREATE INDEX idx_energy_transactions_status ON energy_transactions(status);

CREATE INDEX idx_price_configs_bot_id ON price_configs(bot_id);
CREATE INDEX idx_price_configs_config_type ON price_configs(config_type);
CREATE INDEX idx_price_configs_is_active ON price_configs(is_active);
CREATE INDEX idx_price_configs_effective_from ON price_configs(effective_from);

CREATE INDEX idx_price_history_config_id ON price_history(config_id);
CREATE INDEX idx_price_history_created_at ON price_history(created_at);

-- 添加外键约束（在所有表创建完成后）
ALTER TABLE users ADD CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by) REFERENCES users(id);