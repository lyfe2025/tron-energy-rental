-- 修正能量池管理功能的数据库迁移
-- 注意：energy_pools表已存在并包含所需字段，daily_energy_consumption已是视图

-- 检查并创建账户类型枚举（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
        CREATE TYPE account_type AS ENUM ('own_energy', 'agent_energy', 'third_party');
    END IF;
END $$;

-- 确保energy_pools表有正确的字段（大部分已存在）
-- 检查并添加缺失的字段
DO $$
BEGIN
    -- 检查account_type字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'energy_pools' AND column_name = 'account_type') THEN
        ALTER TABLE energy_pools ADD COLUMN account_type account_type DEFAULT 'own_energy';
    END IF;
    
    -- 检查priority字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'energy_pools' AND column_name = 'priority') THEN
        ALTER TABLE energy_pools ADD COLUMN priority INTEGER DEFAULT 1;
    END IF;
    
    -- 检查is_enabled字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'energy_pools' AND column_name = 'is_enabled') THEN
        ALTER TABLE energy_pools ADD COLUMN is_enabled BOOLEAN DEFAULT true;
    END IF;
    
    -- 检查description字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'energy_pools' AND column_name = 'description') THEN
        ALTER TABLE energy_pools ADD COLUMN description TEXT;
    END IF;
    
    -- 检查contact_info字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'energy_pools' AND column_name = 'contact_info') THEN
        ALTER TABLE energy_pools ADD COLUMN contact_info JSONB;
    END IF;
    
    -- 检查daily_limit字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'energy_pools' AND column_name = 'daily_limit') THEN
        ALTER TABLE energy_pools ADD COLUMN daily_limit BIGINT;
    END IF;
    
    -- 检查monthly_limit字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'energy_pools' AND column_name = 'monthly_limit') THEN
        ALTER TABLE energy_pools ADD COLUMN monthly_limit BIGINT;
    END IF;
END $$;

-- 添加约束（如果不存在）
DO $$
BEGIN
    -- 优先级约束
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'chk_priority_positive') THEN
        ALTER TABLE energy_pools ADD CONSTRAINT chk_priority_positive CHECK (priority > 0);
    END IF;
    
    -- 日限制约束
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'chk_daily_limit_positive') THEN
        ALTER TABLE energy_pools ADD CONSTRAINT chk_daily_limit_positive CHECK (daily_limit IS NULL OR daily_limit > 0);
    END IF;
    
    -- 月限制约束
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'chk_monthly_limit_positive') THEN
        ALTER TABLE energy_pools ADD CONSTRAINT chk_monthly_limit_positive CHECK (monthly_limit IS NULL OR monthly_limit > 0);
    END IF;
END $$;

-- 创建索引（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_energy_pools_account_type') THEN
        CREATE INDEX idx_energy_pools_account_type ON energy_pools(account_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_energy_pools_priority') THEN
        CREATE INDEX idx_energy_pools_priority ON energy_pools(priority DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_energy_pools_is_enabled') THEN
        CREATE INDEX idx_energy_pools_is_enabled ON energy_pools(is_enabled);
    END IF;
END $$;

-- 更新现有记录的默认值（如果字段为空）
UPDATE energy_pools 
SET 
    account_type = COALESCE(account_type, 'own_energy'),
    priority = COALESCE(priority, 1),
    is_enabled = COALESCE(is_enabled, true)
WHERE account_type IS NULL OR priority IS NULL OR is_enabled IS NULL;

-- 注释：daily_energy_consumption已经是一个视图，不需要重新创建
-- 该视图提供了我们需要的今日消耗统计功能

COMMIT;