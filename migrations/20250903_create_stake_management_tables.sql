-- 创建质押管理相关表
-- 创建时间: 2025-09-03
-- 功能: 支持TRON质押2.0功能，包括质押、委托、解质押等操作

-- 1. 创建质押记录表 (stake_records)
CREATE TABLE IF NOT EXISTS stake_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_account_id UUID NOT NULL REFERENCES energy_pools(id) ON DELETE CASCADE,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('freeze', 'unfreeze')),
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('ENERGY', 'BANDWIDTH')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    tx_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    block_number BIGINT,
    gas_used BIGINT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建质押记录表索引
CREATE INDEX IF NOT EXISTS idx_stake_records_pool_account_id ON stake_records(pool_account_id);
CREATE INDEX IF NOT EXISTS idx_stake_records_created_at ON stake_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stake_records_tx_hash ON stake_records(tx_hash);
CREATE INDEX IF NOT EXISTS idx_stake_records_status ON stake_records(status);
CREATE INDEX IF NOT EXISTS idx_stake_records_operation_type ON stake_records(operation_type);

-- 添加质押记录表注释
COMMENT ON TABLE stake_records IS '质押操作记录表，记录所有质押和解质押操作';
COMMENT ON COLUMN stake_records.id IS '记录唯一标识';
COMMENT ON COLUMN stake_records.pool_account_id IS '关联的能量池账户ID';
COMMENT ON COLUMN stake_records.operation_type IS '操作类型：freeze(质押)、unfreeze(解质押)';
COMMENT ON COLUMN stake_records.resource_type IS '资源类型：ENERGY(能量)、BANDWIDTH(带宽)';
COMMENT ON COLUMN stake_records.amount IS '操作金额，单位为sun';
COMMENT ON COLUMN stake_records.tx_hash IS '交易哈希';
COMMENT ON COLUMN stake_records.status IS '交易状态：pending(待确认)、confirmed(已确认)、failed(失败)';
COMMENT ON COLUMN stake_records.block_number IS '区块号';
COMMENT ON COLUMN stake_records.gas_used IS '消耗的Gas';
COMMENT ON COLUMN stake_records.error_message IS '错误信息';

-- 2. 创建委托记录表 (delegate_records)
CREATE TABLE IF NOT EXISTS delegate_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_account_id UUID NOT NULL REFERENCES energy_pools(id) ON DELETE CASCADE,
    receiver_address VARCHAR(34) NOT NULL,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('delegate', 'undelegate')),
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('ENERGY', 'BANDWIDTH')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    is_locked BOOLEAN DEFAULT false,
    lock_period INTEGER DEFAULT 0,
    tx_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    block_number BIGINT,
    gas_used BIGINT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 创建委托记录表索引
CREATE INDEX IF NOT EXISTS idx_delegate_records_pool_account_id ON delegate_records(pool_account_id);
CREATE INDEX IF NOT EXISTS idx_delegate_records_receiver_address ON delegate_records(receiver_address);
CREATE INDEX IF NOT EXISTS idx_delegate_records_created_at ON delegate_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delegate_records_status ON delegate_records(status);
CREATE INDEX IF NOT EXISTS idx_delegate_records_operation_type ON delegate_records(operation_type);
CREATE INDEX IF NOT EXISTS idx_delegate_records_expires_at ON delegate_records(expires_at);

-- 添加委托记录表注释
COMMENT ON TABLE delegate_records IS '资源委托记录表，记录所有委托和取消委托操作';
COMMENT ON COLUMN delegate_records.id IS '记录唯一标识';
COMMENT ON COLUMN delegate_records.pool_account_id IS '关联的能量池账户ID';
COMMENT ON COLUMN delegate_records.receiver_address IS '接收委托资源的TRON地址';
COMMENT ON COLUMN delegate_records.operation_type IS '操作类型：delegate(委托)、undelegate(取消委托)';
COMMENT ON COLUMN delegate_records.resource_type IS '资源类型：ENERGY(能量)、BANDWIDTH(带宽)';
COMMENT ON COLUMN delegate_records.amount IS '委托数量，单位为sun';
COMMENT ON COLUMN delegate_records.is_locked IS '是否锁定委托';
COMMENT ON COLUMN delegate_records.lock_period IS '锁定期，单位为天';
COMMENT ON COLUMN delegate_records.tx_hash IS '交易哈希';
COMMENT ON COLUMN delegate_records.status IS '交易状态：pending(待确认)、confirmed(已确认)、failed(失败)';
COMMENT ON COLUMN delegate_records.expires_at IS '委托到期时间';

-- 3. 创建解质押记录表 (unfreeze_records)
CREATE TABLE IF NOT EXISTS unfreeze_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_account_id UUID NOT NULL REFERENCES energy_pools(id) ON DELETE CASCADE,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('ENERGY', 'BANDWIDTH')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    unfreeze_tx_hash VARCHAR(64) NOT NULL,
    withdraw_tx_hash VARCHAR(64),
    unfreeze_time TIMESTAMP WITH TIME ZONE NOT NULL,
    available_time TIMESTAMP WITH TIME ZONE NOT NULL,
    withdrawn_amount BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unfrozen' CHECK (status IN ('unfrozen', 'withdrawn', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建解质押记录表索引
CREATE INDEX IF NOT EXISTS idx_unfreeze_records_pool_account_id ON unfreeze_records(pool_account_id);
CREATE INDEX IF NOT EXISTS idx_unfreeze_records_available_time ON unfreeze_records(available_time);
CREATE INDEX IF NOT EXISTS idx_unfreeze_records_status ON unfreeze_records(status);
CREATE INDEX IF NOT EXISTS idx_unfreeze_records_unfreeze_tx_hash ON unfreeze_records(unfreeze_tx_hash);
CREATE INDEX IF NOT EXISTS idx_unfreeze_records_withdraw_tx_hash ON unfreeze_records(withdraw_tx_hash);

-- 添加解质押记录表注释
COMMENT ON TABLE unfreeze_records IS '解质押记录表，记录解质押和提款操作';
COMMENT ON COLUMN unfreeze_records.id IS '记录唯一标识';
COMMENT ON COLUMN unfreeze_records.pool_account_id IS '关联的能量池账户ID';
COMMENT ON COLUMN unfreeze_records.resource_type IS '资源类型：ENERGY(能量)、BANDWIDTH(带宽)';
COMMENT ON COLUMN unfreeze_records.amount IS '解质押金额，单位为sun';
COMMENT ON COLUMN unfreeze_records.unfreeze_tx_hash IS '解质押交易哈希';
COMMENT ON COLUMN unfreeze_records.withdraw_tx_hash IS '提款交易哈希';
COMMENT ON COLUMN unfreeze_records.unfreeze_time IS '解质押时间';
COMMENT ON COLUMN unfreeze_records.available_time IS '可提款时间（解质押后14天）';
COMMENT ON COLUMN unfreeze_records.withdrawn_amount IS '已提款金额，单位为sun';
COMMENT ON COLUMN unfreeze_records.status IS '状态：unfrozen(已解质押)、withdrawn(已提款)、failed(失败)';
COMMENT ON COLUMN unfreeze_records.error_message IS '错误信息';

-- 4. 扩展能量池表，添加质押相关字段
ALTER TABLE energy_pools ADD COLUMN IF NOT EXISTS staked_trx_energy BIGINT DEFAULT 0;
ALTER TABLE energy_pools ADD COLUMN IF NOT EXISTS staked_trx_bandwidth BIGINT DEFAULT 0;
ALTER TABLE energy_pools ADD COLUMN IF NOT EXISTS delegated_energy BIGINT DEFAULT 0;
ALTER TABLE energy_pools ADD COLUMN IF NOT EXISTS delegated_bandwidth BIGINT DEFAULT 0;
ALTER TABLE energy_pools ADD COLUMN IF NOT EXISTS pending_unfreeze_energy BIGINT DEFAULT 0;
ALTER TABLE energy_pools ADD COLUMN IF NOT EXISTS pending_unfreeze_bandwidth BIGINT DEFAULT 0;
ALTER TABLE energy_pools ADD COLUMN IF NOT EXISTS last_stake_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 添加能量池表新字段注释
COMMENT ON COLUMN energy_pools.staked_trx_energy IS '质押用于获取能量的TRX数量，单位为sun';
COMMENT ON COLUMN energy_pools.staked_trx_bandwidth IS '质押用于获取带宽的TRX数量，单位为sun';
COMMENT ON COLUMN energy_pools.delegated_energy IS '已委托出去的能量数量';
COMMENT ON COLUMN energy_pools.delegated_bandwidth IS '已委托出去的带宽数量';
COMMENT ON COLUMN energy_pools.pending_unfreeze_energy IS '待提款的能量质押TRX数量，单位为sun';
COMMENT ON COLUMN energy_pools.pending_unfreeze_bandwidth IS '待提款的带宽质押TRX数量，单位为sun';
COMMENT ON COLUMN energy_pools.last_stake_update IS '最后一次质押状态更新时间';

-- 5. 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. 为相关表添加更新时间触发器
DROP TRIGGER IF EXISTS update_stake_records_updated_at ON stake_records;
CREATE TRIGGER update_stake_records_updated_at
    BEFORE UPDATE ON stake_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_delegate_records_updated_at ON delegate_records;
CREATE TRIGGER update_delegate_records_updated_at
    BEFORE UPDATE ON delegate_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_unfreeze_records_updated_at ON unfreeze_records;
CREATE TRIGGER update_unfreeze_records_updated_at
    BEFORE UPDATE ON unfreeze_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 创建质押统计视图
CREATE OR REPLACE VIEW stake_statistics AS
SELECT 
    ep.id as pool_account_id,
    ep.name as account_name,
    ep.tron_address,
    ep.staked_trx_energy,
    ep.staked_trx_bandwidth,
    ep.delegated_energy,
    ep.delegated_bandwidth,
    ep.pending_unfreeze_energy,
    ep.pending_unfreeze_bandwidth,
    COALESCE(stake_summary.total_staked, 0) as total_staked_amount,
    COALESCE(stake_summary.total_unfrozen, 0) as total_unfrozen_amount,
    COALESCE(delegate_summary.total_delegated, 0) as total_delegated_amount,
    COALESCE(delegate_summary.total_undelegated, 0) as total_undelegated_amount,
    ep.last_stake_update
FROM energy_pools ep
LEFT JOIN (
    SELECT 
        pool_account_id,
        SUM(CASE WHEN operation_type = 'freeze' AND status = 'confirmed' THEN amount ELSE 0 END) as total_staked,
        SUM(CASE WHEN operation_type = 'unfreeze' AND status = 'confirmed' THEN amount ELSE 0 END) as total_unfrozen
    FROM stake_records
    GROUP BY pool_account_id
) stake_summary ON ep.id = stake_summary.pool_account_id
LEFT JOIN (
    SELECT 
        pool_account_id,
        SUM(CASE WHEN operation_type = 'delegate' AND status = 'confirmed' THEN amount ELSE 0 END) as total_delegated,
        SUM(CASE WHEN operation_type = 'undelegate' AND status = 'confirmed' THEN amount ELSE 0 END) as total_undelegated
    FROM delegate_records
    GROUP BY pool_account_id
) delegate_summary ON ep.id = delegate_summary.pool_account_id;

COMMENT ON VIEW stake_statistics IS '质押统计视图，提供各账户的质押、委托等统计信息';

-- 8. 插入初始化数据（如果需要）
-- 这里可以添加一些初始化的配置数据

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '质押管理表创建完成！';
    RAISE NOTICE '已创建表：stake_records, delegate_records, unfreeze_records';
    RAISE NOTICE '已扩展表：energy_pools（添加质押相关字段）';
    RAISE NOTICE '已创建视图：stake_statistics';
    RAISE NOTICE '已创建触发器：自动更新updated_at字段';
END $$;