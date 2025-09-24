-- 扩展价格配置表以支持笔数套餐
-- 创建时间: 2025-01-25
-- 说明: 为price_configs表添加笔数套餐相关的配置字段

BEGIN;

-- 添加笔数套餐相关配置字段
ALTER TABLE price_configs 
ADD COLUMN IF NOT EXISTS daily_fee INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS single_transaction_energy INTEGER DEFAULT 32000,
ADD COLUMN IF NOT EXISTS energy_check_interval INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS daily_fee_check_time TIME DEFAULT '00:00:00';

-- 添加字段注释
COMMENT ON COLUMN price_configs.daily_fee IS '每日占费笔数，默认为1笔';
COMMENT ON COLUMN price_configs.single_transaction_energy IS '单笔交易消耗的能量值，默认32000能量';
COMMENT ON COLUMN price_configs.energy_check_interval IS '能量检查间隔时间（秒），默认300秒（5分钟）';
COMMENT ON COLUMN price_configs.daily_fee_check_time IS '每日占费检查时间，默认为00:00:00';

-- 添加约束以确保数据完整性
ALTER TABLE price_configs 
ADD CONSTRAINT IF NOT EXISTS chk_daily_fee_positive 
    CHECK (daily_fee > 0),
ADD CONSTRAINT IF NOT EXISTS chk_single_transaction_energy_positive 
    CHECK (single_transaction_energy > 0),
ADD CONSTRAINT IF NOT EXISTS chk_energy_check_interval_positive 
    CHECK (energy_check_interval > 0 AND energy_check_interval <= 3600),
ADD CONSTRAINT IF NOT EXISTS chk_daily_fee_check_time_valid 
    CHECK (daily_fee_check_time >= '00:00:00' AND daily_fee_check_time <= '23:59:59');

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_price_configs_mode_type_active 
    ON price_configs(mode_type, is_active) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_price_configs_transaction_package 
    ON price_configs(mode_type, daily_fee, single_transaction_energy) 
    WHERE mode_type = 'transaction_package' AND is_active = true;

-- 创建函数以获取笔数套餐的配置信息
CREATE OR REPLACE FUNCTION get_transaction_package_config(p_config_id INTEGER DEFAULT NULL)
RETURNS TABLE(
    config_id INTEGER,
    config_name VARCHAR(100),
    config_description TEXT,
    price_config JSONB,
    daily_fee INTEGER,
    single_transaction_energy INTEGER,
    energy_check_interval INTEGER,
    daily_fee_check_time TIME,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.name,
        pc.description,
        pc.config,
        pc.daily_fee,
        pc.single_transaction_energy,
        pc.energy_check_interval,
        pc.daily_fee_check_time,
        pc.is_active
    FROM price_configs pc
    WHERE pc.mode_type = 'transaction_package'
      AND (p_config_id IS NULL OR pc.id = p_config_id)
      AND pc.is_active = true
    ORDER BY pc.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_transaction_package_config(INTEGER) IS '获取笔数套餐的配置信息';

-- 创建函数以获取默认的笔数套餐配置
CREATE OR REPLACE FUNCTION get_default_transaction_package_config()
RETURNS TABLE(
    config_id INTEGER,
    config_name VARCHAR(100),
    daily_fee INTEGER,
    single_transaction_energy INTEGER,
    energy_check_interval INTEGER,
    daily_fee_check_time TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.name,
        pc.daily_fee,
        pc.single_transaction_energy,
        pc.energy_check_interval,
        pc.daily_fee_check_time
    FROM price_configs pc
    WHERE pc.mode_type = 'transaction_package'
      AND pc.is_active = true
    ORDER BY pc.id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_default_transaction_package_config() IS '获取默认的笔数套餐配置信息';

-- 创建视图以便于查询笔数套餐配置
CREATE OR REPLACE VIEW transaction_package_configs AS
SELECT 
    id,
    name,
    description,
    config,
    daily_fee,
    single_transaction_energy,
    energy_check_interval,
    daily_fee_check_time,
    is_active,
    created_at,
    updated_at,
    -- 从config JSON中提取常用字段
    (config->>'price')::DECIMAL as price,
    (config->>'currency')::VARCHAR as currency,
    (config->>'transaction_count')::INTEGER as transaction_count,
    -- 计算每笔交易的平均价格
    CASE 
        WHEN (config->>'transaction_count')::INTEGER > 0 THEN 
            (config->>'price')::DECIMAL / (config->>'transaction_count')::INTEGER
        ELSE NULL 
    END as price_per_transaction
FROM price_configs
WHERE mode_type = 'transaction_package';

COMMENT ON VIEW transaction_package_configs IS '笔数套餐配置视图，提供笔数套餐相关的配置信息';

-- 创建触发器函数以在更新时自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_price_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_price_configs_updated_at'
    ) THEN
        CREATE TRIGGER trigger_update_price_configs_updated_at
            BEFORE UPDATE ON price_configs
            FOR EACH ROW
            EXECUTE FUNCTION update_price_configs_updated_at();
    END IF;
END $$;

-- 插入默认的笔数套餐配置（如果不存在）
INSERT INTO price_configs (
    mode_type, 
    name, 
    description, 
    config, 
    daily_fee, 
    single_transaction_energy, 
    energy_check_interval, 
    daily_fee_check_time,
    is_active
) 
SELECT 
    'transaction_package',
    '默认笔数套餐配置',
    '系统默认的笔数套餐配置，包含基础的价格和能量参数',
    '{
        "price": 10,
        "currency": "TRX",
        "transaction_count": 100,
        "description": "100笔交易套餐",
        "energy_per_transaction": 32000,
        "max_daily_fee": 5
    }'::jsonb,
    1,
    32000,
    300,
    '00:00:00',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM price_configs 
    WHERE mode_type = 'transaction_package' 
    AND name = '默认笔数套餐配置'
);

COMMIT;

-- 验证扩展是否成功
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'price_configs' 
-- AND column_name IN ('daily_fee', 'single_transaction_energy', 'energy_check_interval', 'daily_fee_check_time')
-- ORDER BY column_name;