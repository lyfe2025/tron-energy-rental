-- 创建价格配置系统的触发器和函数
-- Migration: 20250128_create_pricing_triggers_functions.sql
-- Created: 2025-01-28
-- Description: 创建价格配置系统相关的触发器和函数，包括自动更新时间、价格计算等

-- 1. 确保update_updated_at_column函数存在（如果不存在则创建）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 2. 创建价格计算函数：能量闪租价格计算
CREATE OR REPLACE FUNCTION calculate_energy_flash_price(
    p_strategy_config JSONB,
    p_quantity INTEGER,
    p_has_usdt BOOLEAN DEFAULT true
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    unit_price DECIMAL(10,2);
    max_quantity INTEGER;
    double_energy_for_no_usdt BOOLEAN;
    total_price DECIMAL(10,2);
BEGIN
    -- 从配置中提取参数
    unit_price := (p_strategy_config->>'unit_price')::DECIMAL(10,2);
    max_quantity := (p_strategy_config->>'max_quantity')::INTEGER;
    double_energy_for_no_usdt := COALESCE((p_strategy_config->>'double_energy_for_no_usdt')::BOOLEAN, false);
    
    -- 验证购买数量
    IF p_quantity <= 0 OR p_quantity > max_quantity THEN
        RAISE EXCEPTION '购买数量无效：必须在1到%之间', max_quantity;
    END IF;
    
    -- 计算基础价格
    total_price := unit_price * p_quantity;
    
    -- 如果向无USDT地址转账且需要双倍能量，价格翻倍
    IF NOT p_has_usdt AND double_energy_for_no_usdt THEN
        total_price := total_price * 2;
    END IF;
    
    RETURN total_price;
END;
$$;

-- 3. 创建价格计算函数：笔数套餐价格计算
CREATE OR REPLACE FUNCTION calculate_transaction_package_price(
    p_strategy_config JSONB,
    p_transactions INTEGER
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    packages JSONB;
    package_item JSONB;
    package_transactions INTEGER;
    package_price DECIMAL(10,2);
BEGIN
    -- 从配置中提取套餐列表
    packages := p_strategy_config->'packages';
    
    -- 遍历套餐，找到匹配的笔数
    FOR package_item IN SELECT * FROM jsonb_array_elements(packages)
    LOOP
        package_transactions := (package_item->>'transactions')::INTEGER;
        package_price := (package_item->>'price')::DECIMAL(10,2);
        
        IF package_transactions = p_transactions THEN
            RETURN package_price;
        END IF;
    END LOOP;
    
    -- 如果没有找到匹配的套餐
    RAISE EXCEPTION '未找到%笔的套餐配置', p_transactions;
END;
$$;

-- 4. 创建通用价格计算函数
CREATE OR REPLACE FUNCTION calculate_pricing(
    p_bot_id UUID,
    p_mode_type VARCHAR(50),
    p_quantity INTEGER DEFAULT 1,
    p_has_usdt BOOLEAN DEFAULT true
)
RETURNS TABLE (
    strategy_id UUID,
    strategy_name VARCHAR(255),
    calculated_price DECIMAL(10,2),
    config JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    active_config RECORD;
BEGIN
    -- 获取机器人当前有效的定价配置
    SELECT * INTO active_config
    FROM get_bot_active_pricing_config(p_bot_id, p_mode_type);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '未找到机器人ID % 的 % 模式定价配置', p_bot_id, p_mode_type;
    END IF;
    
    -- 根据模式类型计算价格
    IF p_mode_type = 'energy_flash' THEN
        RETURN QUERY
        SELECT 
            active_config.strategy_id,
            active_config.strategy_name,
            calculate_energy_flash_price(active_config.strategy_config, p_quantity, p_has_usdt),
            active_config.strategy_config;
    ELSIF p_mode_type = 'transaction_package' THEN
        RETURN QUERY
        SELECT 
            active_config.strategy_id,
            active_config.strategy_name,
            calculate_transaction_package_price(active_config.strategy_config, p_quantity),
            active_config.strategy_config;
    ELSE
        RAISE EXCEPTION '不支持的定价模式：%', p_mode_type;
    END IF;
END;
$$;

-- 5. 创建配置验证函数：验证能量闪租配置
CREATE OR REPLACE FUNCTION validate_energy_flash_config(
    p_config JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    unit_price DECIMAL(10,2);
    max_quantity INTEGER;
    expiry_hours INTEGER;
BEGIN
    -- 检查必需字段
    IF NOT (p_config ? 'unit_price' AND p_config ? 'max_quantity' AND p_config ? 'expiry_hours') THEN
        RAISE EXCEPTION '能量闪租配置缺少必需字段：unit_price, max_quantity, expiry_hours';
    END IF;
    
    -- 验证数值范围
    unit_price := (p_config->>'unit_price')::DECIMAL(10,2);
    max_quantity := (p_config->>'max_quantity')::INTEGER;
    expiry_hours := (p_config->>'expiry_hours')::INTEGER;
    
    IF unit_price < 0.1 OR unit_price > 10 THEN
        RAISE EXCEPTION '单笔价格必须在0.1到10 TRX之间';
    END IF;
    
    IF max_quantity < 1 OR max_quantity > 10 THEN
        RAISE EXCEPTION '最大购买笔数必须在1到10之间';
    END IF;
    
    IF expiry_hours < 1 OR expiry_hours > 24 THEN
        RAISE EXCEPTION '过期时间必须在1到24小时之间';
    END IF;
    
    RETURN TRUE;
END;
$$;

-- 6. 创建配置验证函数：验证笔数套餐配置
CREATE OR REPLACE FUNCTION validate_transaction_package_config(
    p_config JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    packages JSONB;
    package_item JSONB;
    occupation_fee_hours INTEGER;
    occupation_fee_amount INTEGER;
BEGIN
    -- 检查必需字段
    IF NOT (p_config ? 'packages' AND p_config ? 'occupation_fee_hours' AND p_config ? 'occupation_fee_amount') THEN
        RAISE EXCEPTION '笔数套餐配置缺少必需字段：packages, occupation_fee_hours, occupation_fee_amount';
    END IF;
    
    -- 验证套餐列表
    packages := p_config->'packages';
    IF jsonb_array_length(packages) = 0 THEN
        RAISE EXCEPTION '套餐列表不能为空';
    END IF;
    
    -- 验证每个套餐项
    FOR package_item IN SELECT * FROM jsonb_array_elements(packages)
    LOOP
        IF NOT (package_item ? 'transactions' AND package_item ? 'price') THEN
            RAISE EXCEPTION '套餐项缺少必需字段：transactions, price';
        END IF;
        
        IF (package_item->>'transactions')::INTEGER < 1 THEN
            RAISE EXCEPTION '套餐笔数必须大于0';
        END IF;
        
        IF (package_item->>'price')::DECIMAL(10,2) < 0.1 THEN
            RAISE EXCEPTION '套餐价格必须大于0.1 TRX';
        END IF;
    END LOOP;
    
    -- 验证占用费配置
    occupation_fee_hours := (p_config->>'occupation_fee_hours')::INTEGER;
    occupation_fee_amount := (p_config->>'occupation_fee_amount')::INTEGER;
    
    IF occupation_fee_hours < 1 OR occupation_fee_hours > 168 THEN
        RAISE EXCEPTION '占用费扣除间隔必须在1到168小时之间';
    END IF;
    
    IF occupation_fee_amount < 1 OR occupation_fee_amount > 10 THEN
        RAISE EXCEPTION '占用费扣除笔数必须在1到10之间';
    END IF;
    
    RETURN TRUE;
END;
$$;

-- 7. 创建触发器函数：验证价格策略配置
CREATE OR REPLACE FUNCTION validate_pricing_strategy_config()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 根据策略类型验证配置
    IF NEW.type = 'energy_flash' THEN
        PERFORM validate_energy_flash_config(NEW.config);
    ELSIF NEW.type = 'transaction_package' THEN
        PERFORM validate_transaction_package_config(NEW.config);
    ELSE
        RAISE EXCEPTION '不支持的策略类型：%', NEW.type;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 8. 创建触发器：验证价格策略配置
CREATE TRIGGER validate_pricing_strategy_config_trigger
    BEFORE INSERT OR UPDATE ON pricing_strategies
    FOR EACH ROW
    EXECUTE FUNCTION validate_pricing_strategy_config();

-- 9. 创建函数：获取机器人定价摘要
CREATE OR REPLACE FUNCTION get_bot_pricing_summary(
    p_bot_id UUID
)
RETURNS TABLE (
    mode_type VARCHAR(50),
    strategy_name VARCHAR(255),
    is_active BOOLEAN,
    config_summary TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bpc.mode_type,
        ps.name as strategy_name,
        bpc.is_active,
        CASE 
            WHEN bpc.mode_type = 'energy_flash' THEN
                format('单价: %s TRX/笔, 最大: %s笔, 过期: %s小时',
                    ps.config->>'unit_price',
                    ps.config->>'max_quantity',
                    ps.config->>'expiry_hours'
                )
            WHEN bpc.mode_type = 'transaction_package' THEN
                format('套餐数量: %s, 占用费: %s小时/%s笔',
                    jsonb_array_length(ps.config->'packages'),
                    ps.config->>'occupation_fee_hours',
                    ps.config->>'occupation_fee_amount'
                )
            ELSE 'Unknown'
        END as config_summary
    FROM bot_pricing_configs bpc
    JOIN pricing_strategies ps ON bpc.strategy_id = ps.id
    WHERE bpc.bot_id = p_bot_id
    ORDER BY bpc.mode_type, bpc.priority DESC;
END;
$$;

-- 10. 为所有函数添加注释
COMMENT ON FUNCTION calculate_energy_flash_price(JSONB, INTEGER, BOOLEAN) IS '计算能量闪租价格';
COMMENT ON FUNCTION calculate_transaction_package_price(JSONB, INTEGER) IS '计算笔数套餐价格';
COMMENT ON FUNCTION calculate_pricing(UUID, VARCHAR, INTEGER, BOOLEAN) IS '通用价格计算函数';
COMMENT ON FUNCTION validate_energy_flash_config(JSONB) IS '验证能量闪租配置';
COMMENT ON FUNCTION validate_transaction_package_config(JSONB) IS '验证笔数套餐配置';
COMMENT ON FUNCTION validate_pricing_strategy_config() IS '价格策略配置验证触发器函数';
COMMENT ON FUNCTION get_bot_pricing_summary(UUID) IS '获取机器人定价配置摘要';

-- 11. 为函数授权
GRANT EXECUTE ON FUNCTION calculate_energy_flash_price(JSONB, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_transaction_package_price(JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_pricing(UUID, VARCHAR, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bot_pricing_summary(UUID) TO authenticated;

-- 为anon角色授予价格计算函数的执行权限
GRANT EXECUTE ON FUNCTION calculate_energy_flash_price(JSONB, INTEGER, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION calculate_transaction_package_price(JSONB, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION calculate_pricing(UUID, VARCHAR, INTEGER, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION get_bot_pricing_summary(UUID) TO anon;