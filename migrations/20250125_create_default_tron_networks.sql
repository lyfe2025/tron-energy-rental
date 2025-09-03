-- 创建默认TRON网络配置
-- 创建时间: 2025-01-25
-- 描述: 为系统创建默认的TRON网络配置，包括主网、Shasta测试网和Nile测试网

-- 开始事务
BEGIN;

-- 清理现有的默认网络配置（如果存在）
DELETE FROM tron_networks WHERE name IN ('TRON主网', 'TRON测试网(Shasta)', 'TRON测试网(Nile)');

-- 插入TRON主网配置
INSERT INTO tron_networks (
    name,
    network_type,
    rpc_url,
    chain_id,
    block_explorer_url,
    is_active,
    is_default,
    priority,
    timeout_ms,
    retry_count,
    rate_limit_per_second,
    config,
    health_check_url,
    description
) VALUES (
    'TRON主网',
    'mainnet',
    'https://api.trongrid.io',
    1,
    'https://tronscan.org',
    true,
    false, -- 默认不设为主要网络，由用户配置决定
    100,
    30000,
    3,
    10,
    '{
        "fullNode": "https://api.trongrid.io",
        "solidityNode": "https://api.trongrid.io",
        "eventServer": "https://api.trongrid.io",
        "features": ["energy_delegation", "bandwidth_delegation", "smart_contracts", "trc20_tokens"],
        "contracts": {
            "usdt": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
            "usdc": "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
            "energy_market": ""
        },
        "gas_settings": {
            "fee_limit": 100000000,
            "gas_price": "auto",
            "gas_limit": 1000000
        },
        "api_limits": {
            "requests_per_second": 10,
            "burst_limit": 20,
            "daily_limit": 100000
        }
    }',
    'https://api.trongrid.io/wallet/getnowblock',
    'TRON主网配置，用于生产环境的能量租赁服务'
);

-- 插入TRON Shasta测试网配置
INSERT INTO tron_networks (
    name,
    network_type,
    rpc_url,
    chain_id,
    block_explorer_url,
    is_active,
    is_default,
    priority,
    timeout_ms,
    retry_count,
    rate_limit_per_second,
    config,
    health_check_url,
    description
) VALUES (
    'TRON测试网(Shasta)',
    'testnet',
    'https://api.shasta.trongrid.io',
    2,
    'https://shasta.tronscan.org',
    true,
    true, -- 设为默认测试网络
    90,
    30000,
    3,
    15,
    '{
        "fullNode": "https://api.shasta.trongrid.io",
        "solidityNode": "https://api.shasta.trongrid.io",
        "eventServer": "https://api.shasta.trongrid.io",
        "features": ["energy_delegation", "bandwidth_delegation", "smart_contracts", "trc20_tokens", "testing"],
        "contracts": {
            "usdt": "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs",
            "usdc": "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
            "energy_market": ""
        },
        "gas_settings": {
            "fee_limit": 100000000,
            "gas_price": "auto",
            "gas_limit": 1000000
        },
        "api_limits": {
            "requests_per_second": 15,
            "burst_limit": 30,
            "daily_limit": 1000000
        },
        "test_features": {
            "faucet_enabled": true,
            "free_energy": true,
            "debug_mode": true
        }
    }',
    'https://api.shasta.trongrid.io/wallet/getnowblock',
    'TRON Shasta测试网配置，用于开发和测试环境'
);

-- 插入TRON Nile测试网配置
INSERT INTO tron_networks (
    name,
    network_type,
    rpc_url,
    chain_id,
    block_explorer_url,
    is_active,
    is_default,
    priority,
    timeout_ms,
    retry_count,
    rate_limit_per_second,
    config,
    health_check_url,
    description
) VALUES (
    'TRON测试网(Nile)',
    'testnet',
    'https://nile.trongrid.io',
    3,
    'https://nile.tronscan.org',
    true,
    false,
    80,
    30000,
    3,
    12,
    '{
        "fullNode": "https://nile.trongrid.io",
        "solidityNode": "https://nile.trongrid.io",
        "eventServer": "https://nile.trongrid.io",
        "features": ["energy_delegation", "bandwidth_delegation", "smart_contracts", "trc20_tokens", "testing"],
        "contracts": {
            "usdt": "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
            "usdc": "",
            "energy_market": ""
        },
        "gas_settings": {
            "fee_limit": 100000000,
            "gas_price": "auto",
            "gas_limit": 1000000
        },
        "api_limits": {
            "requests_per_second": 12,
            "burst_limit": 25,
            "daily_limit": 500000
        },
        "test_features": {
            "faucet_enabled": true,
            "free_energy": true,
            "debug_mode": true,
            "experimental_features": true
        }
    }',
    'https://nile.trongrid.io/wallet/getnowblock',
    'TRON Nile测试网配置，用于实验性功能测试'
);

-- 创建网络配置验证函数
CREATE OR REPLACE FUNCTION validate_network_config(network_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    network_record RECORD;
    config_valid BOOLEAN := true;
BEGIN
    -- 获取网络配置
    SELECT * INTO network_record FROM tron_networks WHERE id = network_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE '网络配置不存在: %', network_id;
        RETURN false;
    END IF;
    
    -- 验证必要字段
    IF network_record.rpc_url IS NULL OR network_record.rpc_url = '' THEN
        RAISE NOTICE '网络 % 缺少RPC URL', network_record.name;
        config_valid := false;
    END IF;
    
    IF network_record.chain_id IS NULL OR network_record.chain_id = '' THEN
        RAISE NOTICE '网络 % 缺少Chain ID', network_record.name;
        config_valid := false;
    END IF;
    
    -- 验证配置JSON格式
    BEGIN
        PERFORM network_record.config::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '网络 % 的配置JSON格式无效', network_record.name;
        config_valid := false;
    END;
    
    RETURN config_valid;
END;
$$ LANGUAGE plpgsql;

-- 创建获取默认网络的函数
CREATE OR REPLACE FUNCTION get_default_network(network_type_filter TEXT DEFAULT NULL)
RETURNS TABLE(
    id UUID,
    name TEXT,
    network_type TEXT,
    rpc_url TEXT,
    chain_id TEXT,
    is_active BOOLEAN,
    config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tn.id,
        tn.name,
        tn.network_type,
        tn.rpc_url,
        tn.chain_id,
        tn.is_active,
        tn.config
    FROM tron_networks tn
    WHERE tn.is_default = true
      AND tn.is_active = true
      AND (network_type_filter IS NULL OR tn.network_type = network_type_filter)
    ORDER BY tn.priority DESC, tn.created_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 创建获取可用网络列表的函数
CREATE OR REPLACE FUNCTION get_available_networks()
RETURNS TABLE(
    id UUID,
    name TEXT,
    network_type TEXT,
    rpc_url TEXT,
    chain_id TEXT,
    is_default BOOLEAN,
    priority INTEGER,
    health_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tn.id,
        tn.name,
        tn.network_type,
        tn.rpc_url,
        tn.chain_id,
        tn.is_default,
        tn.priority,
        tn.health_status
    FROM tron_networks tn
    WHERE tn.is_active = true
    ORDER BY tn.priority DESC, tn.network_type, tn.name;
END;
$$ LANGUAGE plpgsql;

-- 创建网络健康检查更新函数
CREATE OR REPLACE FUNCTION update_network_health_status(
    network_id UUID,
    new_status TEXT,
    check_result JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE tron_networks 
    SET 
        health_status = new_status,
        last_health_check = CURRENT_TIMESTAMP,
        config = CASE 
            WHEN check_result IS NOT NULL THEN 
                config || jsonb_build_object('last_health_check_result', check_result)
            ELSE config
        END
    WHERE id = network_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 验证所有网络配置
DO $$
DECLARE
    network_rec RECORD;
    validation_result BOOLEAN;
BEGIN
    RAISE NOTICE '开始验证网络配置...';
    
    FOR network_rec IN SELECT id, name FROM tron_networks LOOP
        validation_result := validate_network_config(network_rec.id);
        
        IF validation_result THEN
            RAISE NOTICE '网络配置验证通过: %', network_rec.name;
        ELSE
            RAISE NOTICE '网络配置验证失败: %', network_rec.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '网络配置验证完成';
END;
$$;

-- 显示创建的网络配置
SELECT 
    name,
    network_type,
    rpc_url,
    is_active,
    is_default,
    priority,
    health_status,
    created_at
FROM tron_networks 
ORDER BY priority DESC, network_type, name;

-- 提交事务
COMMIT;

-- 输出成功信息
\echo '默认TRON网络配置创建完成！'
\echo '- TRON主网: 生产环境使用'
\echo '- TRON测试网(Shasta): 默认测试网络'
\echo '- TRON测试网(Nile): 实验性功能测试'
\echo ''
\echo '请根据实际需要配置API密钥和调整网络优先级。'