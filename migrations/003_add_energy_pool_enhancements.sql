-- 为能量池管理添加增强功能
-- 添加账户类型、优先级、状态管理等字段

-- 1. 添加账户类型枚举
CREATE TYPE account_type AS ENUM ('own_energy', 'agent_energy', 'third_party');

-- 2. 为 energy_pools 表添加新字段
ALTER TABLE energy_pools 
ADD COLUMN account_type account_type DEFAULT 'own_energy',
ADD COLUMN priority INTEGER DEFAULT 1,
ADD COLUMN is_enabled BOOLEAN DEFAULT true,
ADD COLUMN cost_per_energy DECIMAL(10,6) DEFAULT 0.001,
ADD COLUMN description TEXT,
ADD COLUMN contact_info JSONB,
ADD COLUMN daily_limit BIGINT,
ADD COLUMN monthly_limit BIGINT;

-- 3. 创建能量消耗记录表
CREATE TABLE energy_consumption_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_account_id UUID NOT NULL REFERENCES energy_pools(id) ON DELETE CASCADE,
    energy_amount BIGINT NOT NULL,
    cost_amount DECIMAL(10,6) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'reserve', 'confirm', 'release'
    order_id UUID, -- 关联订单ID（如果有）
    telegram_user_id BIGINT, -- Telegram用户ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建今日消耗统计视图
CREATE OR REPLACE VIEW daily_energy_consumption AS
SELECT 
    DATE(ecl.created_at) as consumption_date,
    ecl.pool_account_id,
    ep.name as account_name,
    ep.account_type,
    SUM(CASE WHEN ecl.transaction_type = 'confirm' THEN ecl.energy_amount ELSE 0 END) as total_consumed_energy,
    SUM(CASE WHEN ecl.transaction_type = 'confirm' THEN ecl.cost_amount ELSE 0 END) as total_cost,
    COUNT(CASE WHEN ecl.transaction_type = 'confirm' THEN 1 END) as transaction_count
FROM energy_consumption_logs ecl
JOIN energy_pools ep ON ecl.pool_account_id = ep.id
GROUP BY DATE(ecl.created_at), ecl.pool_account_id, ep.name, ep.account_type;

-- 5. 添加索引优化查询性能
CREATE INDEX idx_energy_pools_account_type ON energy_pools(account_type);
CREATE INDEX idx_energy_pools_priority ON energy_pools(priority DESC);
CREATE INDEX idx_energy_pools_is_enabled ON energy_pools(is_enabled);
CREATE INDEX idx_energy_consumption_logs_created_at ON energy_consumption_logs(created_at);
CREATE INDEX idx_energy_consumption_logs_pool_account_id ON energy_consumption_logs(pool_account_id);
CREATE INDEX idx_energy_consumption_logs_transaction_type ON energy_consumption_logs(transaction_type);

-- 6. 更新现有数据的默认值
UPDATE energy_pools 
SET 
    account_type = 'own_energy',
    priority = 1,
    is_enabled = true,
    cost_per_energy = 0.001,
    description = '默认能量池账户'
WHERE account_type IS NULL;

-- 7. 添加约束
ALTER TABLE energy_pools 
ADD CONSTRAINT chk_priority_positive CHECK (priority > 0),
ADD CONSTRAINT chk_cost_per_energy_positive CHECK (cost_per_energy >= 0),
ADD CONSTRAINT chk_daily_limit_positive CHECK (daily_limit IS NULL OR daily_limit > 0),
ADD CONSTRAINT chk_monthly_limit_positive CHECK (monthly_limit IS NULL OR monthly_limit > 0);

-- 8. 创建触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_energy_consumption_logs_updated_at 
    BEFORE UPDATE ON energy_consumption_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. 添加注释
COMMENT ON COLUMN energy_pools.account_type IS '账户类型：own_energy(自有能量源), agent_energy(代理商能量源), third_party(第三方供应商)';
COMMENT ON COLUMN energy_pools.priority IS '优先级，数字越大优先级越高';
COMMENT ON COLUMN energy_pools.is_enabled IS '是否启用该账户';
COMMENT ON COLUMN energy_pools.cost_per_energy IS '每单位能量的成本';
COMMENT ON COLUMN energy_pools.description IS '账户描述信息';
COMMENT ON COLUMN energy_pools.contact_info IS '联系信息（JSON格式）';
COMMENT ON COLUMN energy_pools.daily_limit IS '日消耗限制';
COMMENT ON COLUMN energy_pools.monthly_limit IS '月消耗限制';
COMMENT ON TABLE energy_consumption_logs IS '能量消耗记录表';
-- 注释将在视图创建成功后添加