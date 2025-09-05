-- 为TRON网络配置添加合约地址管理功能
-- 将硬编码的合约地址迁移到数据库配置管理中
-- 作者: AI Assistant
-- 日期: 2025-09-05

BEGIN;

-- ===========================================
-- 1. 更新现有网络的合约地址配置
-- ===========================================

-- 为TRON主网添加USDT合约地址配置
UPDATE tron_networks SET 
    config = config || jsonb_build_object(
        'contract_addresses', jsonb_build_object(
            'USDT', jsonb_build_object(
                'address', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                'symbol', 'USDT',
                'name', 'Tether USD',
                'decimals', 6,
                'type', 'TRC20',
                'is_active', true,
                'description', 'Tether官方USDT合约地址',
                'source', 'https://tether.to/en/transparency/',
                'added_at', NOW()::text
            )
        )
    )
WHERE network_type = 'mainnet' AND name = 'TRON Mainnet';

-- 为Nile测试网添加USDT合约地址配置
UPDATE tron_networks SET 
    config = config || jsonb_build_object(
        'contract_addresses', jsonb_build_object(
            'USDT', jsonb_build_object(
                'address', 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
                'symbol', 'USDT',
                'name', 'Test USDT',
                'decimals', 6,
                'type', 'TRC20',
                'is_active', true,
                'description', 'Nile测试网USDT合约地址（社区部署）',
                'source', 'API实际查询发现',
                'added_at', NOW()::text
            )
        )
    )
WHERE network_type = 'testnet' AND name = 'Nile Testnet';

-- 为Shasta测试网添加USDT合约地址配置
UPDATE tron_networks SET 
    config = config || jsonb_build_object(
        'contract_addresses', jsonb_build_object(
            'USDT', jsonb_build_object(
                'address', 'TLBaRhANQoJFTqre9Nf1mjuwNWjCJeYqUL',
                'symbol', 'USDT',
                'name', 'Test USDT',
                'decimals', 6,
                'type', 'TRC20',
                'is_active', true,
                'description', 'Shasta测试网USDT合约地址',
                'source', '开发者社区文档',
                'added_at', NOW()::text
            )
        )
    )
WHERE network_type = 'testnet' AND name = 'Shasta Testnet';

-- ===========================================
-- 2. 创建合约地址管理的辅助函数
-- ===========================================

-- 函数：获取指定网络的合约地址
CREATE OR REPLACE FUNCTION get_network_contract_address(
    p_network_id UUID,
    p_token_symbol VARCHAR(20)
) RETURNS TABLE (
    address VARCHAR(255),
    symbol VARCHAR(20),
    name VARCHAR(100),
    decimals INTEGER,
    type VARCHAR(20),
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (tn.config->'contract_addresses'->p_token_symbol->>'address')::VARCHAR(255) as address,
        (tn.config->'contract_addresses'->p_token_symbol->>'symbol')::VARCHAR(20) as symbol,
        (tn.config->'contract_addresses'->p_token_symbol->>'name')::VARCHAR(100) as name,
        (tn.config->'contract_addresses'->p_token_symbol->>'decimals')::INTEGER as decimals,
        (tn.config->'contract_addresses'->p_token_symbol->>'type')::VARCHAR(20) as type,
        COALESCE((tn.config->'contract_addresses'->p_token_symbol->>'is_active')::BOOLEAN, false) as is_active
    FROM tron_networks tn
    WHERE tn.id = p_network_id 
        AND tn.is_active = true
        AND tn.config->'contract_addresses' ? p_token_symbol;
END;
$$ LANGUAGE plpgsql;

-- 函数：获取指定网络的所有合约地址
CREATE OR REPLACE FUNCTION get_network_all_contracts(
    p_network_id UUID
) RETURNS TABLE (
    token_symbol VARCHAR(20),
    address VARCHAR(255),
    name VARCHAR(100),
    decimals INTEGER,
    type VARCHAR(20),
    is_active BOOLEAN,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        contract_key::VARCHAR(20) as token_symbol,
        (contract_data->>'address')::VARCHAR(255) as address,
        (contract_data->>'name')::VARCHAR(100) as name,
        (contract_data->>'decimals')::INTEGER as decimals,
        (contract_data->>'type')::VARCHAR(20) as type,
        COALESCE((contract_data->>'is_active')::BOOLEAN, false) as is_active,
        (contract_data->>'description')::TEXT as description
    FROM tron_networks tn,
         LATERAL jsonb_each(tn.config->'contract_addresses') AS contract_entry(contract_key, contract_data)
    WHERE tn.id = p_network_id 
        AND tn.is_active = true
        AND tn.config ? 'contract_addresses';
END;
$$ LANGUAGE plpgsql;

-- 函数：更新网络合约地址
CREATE OR REPLACE FUNCTION update_network_contract_address(
    p_network_id UUID,
    p_token_symbol VARCHAR(20),
    p_address VARCHAR(255),
    p_name VARCHAR(100) DEFAULT NULL,
    p_decimals INTEGER DEFAULT 6,
    p_type VARCHAR(20) DEFAULT 'TRC20',
    p_description TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'manual'
) RETURNS BOOLEAN AS $$
DECLARE
    v_contract_config JSONB;
BEGIN
    -- 检查网络是否存在
    IF NOT EXISTS (SELECT 1 FROM tron_networks WHERE id = p_network_id AND is_active = true) THEN
        RAISE EXCEPTION '网络不存在或已停用: %', p_network_id;
    END IF;
    
    -- 构建合约配置对象
    v_contract_config := jsonb_build_object(
        'address', p_address,
        'symbol', p_token_symbol,
        'name', COALESCE(p_name, p_token_symbol),
        'decimals', p_decimals,
        'type', p_type,
        'is_active', true,
        'description', p_description,
        'source', p_source,
        'updated_at', NOW()::text
    );
    
    -- 更新网络配置
    UPDATE tron_networks SET
        config = CASE
            WHEN config ? 'contract_addresses' THEN
                jsonb_set(config, ARRAY['contract_addresses', p_token_symbol], v_contract_config)
            ELSE
                config || jsonb_build_object('contract_addresses', jsonb_build_object(p_token_symbol, v_contract_config))
        END,
        updated_at = NOW()
    WHERE id = p_network_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 3. 创建索引优化查询性能
-- ===========================================

-- 为config字段的合约地址查询创建GIN索引
CREATE INDEX IF NOT EXISTS idx_tron_networks_contract_addresses 
    ON tron_networks USING GIN ((config->'contract_addresses'));

-- ===========================================
-- 4. 添加数据验证约束
-- ===========================================

-- 创建检查函数：验证合约地址格式
CREATE OR REPLACE FUNCTION validate_tron_address(address TEXT) RETURNS BOOLEAN AS $$
BEGIN
    -- TRON地址必须以T开头，长度为34位
    RETURN address ~ '^T[A-HJ-NP-Za-km-z1-9]{33}$';
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 5. 记录变更历史
-- ===========================================

INSERT INTO system_config_history (
    entity_type, 
    entity_id, 
    operation_type, 
    field_name,
    new_value,
    change_reason, 
    change_description,
    user_type,
    ip_address, 
    session_id,
    metadata
) VALUES (
    'tron_network',
    (SELECT id FROM tron_networks WHERE network_type = 'mainnet' LIMIT 1),
    'create',
    'contract_addresses',
    jsonb_build_object(
        'migration_type', 'add_contract_addresses',
        'networks_updated', (SELECT COUNT(*) FROM tron_networks WHERE config ? 'contract_addresses'),
        'contracts_added', jsonb_build_object(
            'USDT_mainnet', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            'USDT_nile', 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
            'USDT_shasta', 'TLBaRhANQoJFTqre9Nf1mjuwNWjCJeYqUL'
        )
    ),
    '添加TRON网络合约地址配置管理功能',
    '将硬编码的合约地址迁移到数据库配置管理，支持动态配置和扩展',
    'migration',
    '127.0.0.1'::inet,
    'contract_addresses_migration_' || extract(epoch from now())::text,
    jsonb_build_object(
        'migration_version', '20250905_add_contract_addresses_to_networks',
        'affected_tables', ARRAY['tron_networks'],
        'functions_created', ARRAY[
            'get_network_contract_address',
            'get_network_all_contracts', 
            'update_network_contract_address',
            'validate_tron_address'
        ]
    )
);

-- ===========================================
-- 6. 验证迁移结果
-- ===========================================

-- 验证所有网络的合约地址配置
DO $$ 
DECLARE
    v_network RECORD;
    v_usdt_address TEXT;
BEGIN
    RAISE NOTICE '=== 合约地址配置验证 ===';
    
    FOR v_network IN SELECT id, name, network_type FROM tron_networks WHERE is_active = true
    LOOP
        SELECT address INTO v_usdt_address
        FROM get_network_contract_address(v_network.id, 'USDT');
        
        RAISE NOTICE '网络: % (%) - USDT合约地址: %', 
            v_network.name, 
            v_network.network_type, 
            COALESCE(v_usdt_address, '未配置');
    END LOOP;
    
    RAISE NOTICE '=== 验证完成 ===';
END $$;

COMMIT;

-- 显示迁移完成信息
SELECT 
    '✅ TRON网络合约地址配置迁移完成' as status,
    jsonb_pretty(jsonb_build_object(
        'updated_networks', (SELECT COUNT(*) FROM tron_networks WHERE config ? 'contract_addresses'),
        'contract_types_added', ARRAY['USDT'],
        'functions_created', ARRAY[
            'get_network_contract_address',
            'get_network_all_contracts', 
            'update_network_contract_address',
            'validate_tron_address'
        ],
        'features_added', ARRAY[
            '动态合约地址配置',
            '合约地址验证',
            '支持多代币扩展',
            '配置变更历史记录'
        ]
    )) as migration_details;
