-- 价格配置系统简化迁移脚本
-- 执行前请确保已备份数据库

-- ============================================
-- 第一步：创建新的统一价格配置表
-- ============================================

CREATE TABLE price_configs (
    id SERIAL PRIMARY KEY,
    mode_type VARCHAR(50) NOT NULL CHECK (mode_type IN ('energy_flash', 'transaction_package', 'vip_package')),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_price_configs_mode_type ON price_configs(mode_type);
CREATE INDEX idx_price_configs_is_active ON price_configs(is_active);
CREATE INDEX idx_price_configs_mode_active ON price_configs(mode_type, is_active);

-- 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_price_configs_updated_at
    BEFORE UPDATE ON price_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 第二步：迁移现有数据
-- ============================================

-- 2.1 从 energy_packages 表迁移数据到 transaction_package 模式
INSERT INTO price_configs (mode_type, name, description, config, is_active, created_by, created_at)
SELECT 
    'transaction_package' as mode_type,
    '笔数套餐配置' as name,
    '从能量包表迁移的配置' as description,
    jsonb_build_object(
        'packages', jsonb_agg(
            jsonb_build_object(
                'name', ep.name,
                'transaction_count', COALESCE(ep.energy_amount, 1),
                'price', ep.price,
                'currency', 'TRX',
                'duration_hours', COALESCE(ep.duration_hours, 0)
            )
        ),
        'daily_fee', 1,
        'daily_fee_currency', 'TRX',
        'transferable', true,
        'proxy_purchase', true
    ) as config,
    true as is_active,
    '09ad451f-3bd8-4ebd-a6e0-fc037db7e703'::uuid as created_by,
    MIN(ep.created_at) as created_at
FROM energy_packages ep
WHERE ep.is_active = true
GROUP BY 1, 2, 3, 5, 6;

-- 2.2 创建默认的能量闪租配置
INSERT INTO price_configs (mode_type, name, description, config, is_active, created_by)
VALUES (
    'energy_flash',
    '能量闪租配置',
    '单笔能量闪租价格配置',
    '{
        "single_price": 2.6,
        "currency": "TRX",
        "max_transactions": 5,
        "max_amount": 13,
        "expiry_hours": 1,
        "double_energy_for_no_usdt": true,
        "payment_address": "TBD"
    }'::jsonb,
    true,
    '09ad451f-3bd8-4ebd-a6e0-fc037db7e703'::uuid
);

-- 2.3 创建默认的VIP套餐配置
INSERT INTO price_configs (mode_type, name, description, config, is_active, created_by)
VALUES (
    'vip_package',
    'VIP套餐配置',
    'VIP会员套餐价格配置',
    '{
        "packages": [
            {
                "name": "VIP月卡",
                "duration_days": 30,
                "price": 500,
                "currency": "TRX",
                "benefits": {
                    "unlimited_transactions": true,
                    "priority_support": true,
                    "no_daily_fee": true
                }
            }
        ]
    }'::jsonb,
    false,
    '09ad451f-3bd8-4ebd-a6e0-fc037db7e703'::uuid
);

-- ============================================
-- 第三步：清理系统配置表中的价格相关配置
-- ============================================

-- 删除价格相关的系统配置
DELETE FROM system_configs 
WHERE category IN ('pricing', 'energy_pricing', 'package_pricing')
   OR config_key LIKE '%price%'
   OR config_key LIKE '%pricing%';

-- ============================================
-- 第四步：删除不需要的表（谨慎操作）
-- ============================================

-- 注意：删除表前请确认数据已正确迁移
-- 可以先注释掉这些删除语句，验证系统正常后再执行

-- 删除价格历史表
DROP TABLE IF EXISTS pricing_history CASCADE;

-- 删除价格策略表
DROP TABLE IF EXISTS pricing_strategies CASCADE;

-- 删除定价模式表
DROP TABLE IF EXISTS pricing_modes CASCADE;

-- 删除价格模板表
DROP TABLE IF EXISTS pricing_templates CASCADE;

-- 删除能量包表（注意：这会影响现有订单的外键关系）
-- 如果orders表中有对energy_packages的外键引用，需要先处理
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_energy_package_id_fkey;
DROP TABLE IF EXISTS energy_packages CASCADE;

-- ============================================
-- 第五步：更新相关表的外键约束
-- ============================================

-- 如果orders表需要关联新的价格配置，可以添加新的外键
-- ALTER TABLE orders ADD COLUMN price_config_id INTEGER REFERENCES price_configs(id);

-- ============================================
-- 验证迁移结果
-- ============================================

-- 查看新表的数据
-- SELECT mode_type, name, is_active, created_at FROM price_configs ORDER BY mode_type;

-- 查看配置详情
-- SELECT mode_type, name, config FROM price_configs WHERE is_active = true;

COMMIT;