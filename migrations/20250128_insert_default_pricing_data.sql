-- 插入价格配置系统的默认数据
-- Migration: 20250128_insert_default_pricing_data.sql
-- Created: 2025-01-28
-- Description: 插入系统默认的定价模板、策略和配置数据

-- 1. 插入默认的Telegram机器人（示例数据）
INSERT INTO telegram_bots (id, bot_name, bot_token, bot_username, description, is_active) VALUES
(
    gen_random_uuid(),
    'TronEnergy主机器人',
    'placeholder_token_main_bot',
    'tron_energy_main_bot',
    '主要的Tron能量租赁机器人，提供能量闪租和笔数套餐服务',
    true
),
(
    gen_random_uuid(),
    'TronEnergy代理机器人',
    'placeholder_token_agent_bot',
    'tron_energy_agent_bot',
    '代理商专用机器人，提供优惠价格和批量服务',
    true
),
(
    gen_random_uuid(),
    'TronEnergy测试机器人',
    'placeholder_token_test_bot',
    'tron_energy_test_bot',
    '测试环境机器人，用于功能测试和开发',
    false
)
ON CONFLICT (bot_username) DO NOTHING;

-- 2. 插入默认价格策略（基于模板）
-- 获取模板ID并创建对应的策略
DO $$
DECLARE
    template_energy_flash_id UUID;
    template_transaction_package_id UUID;
    template_agent_discount_id UUID;
    template_vip_package_id UUID;
    main_bot_id UUID;
    agent_bot_id UUID;
    strategy_id UUID;
BEGIN
    -- 获取模板ID
    SELECT id INTO template_energy_flash_id FROM pricing_templates WHERE name = '标准能量闪租模板';
    SELECT id INTO template_transaction_package_id FROM pricing_templates WHERE name = '标准笔数套餐模板';
    SELECT id INTO template_agent_discount_id FROM pricing_templates WHERE name = '代理商优惠模板';
    SELECT id INTO template_vip_package_id FROM pricing_templates WHERE name = 'VIP笔数套餐模板';
    
    -- 获取机器人ID
    SELECT id INTO main_bot_id FROM telegram_bots WHERE bot_username = 'tron_energy_main_bot';
    SELECT id INTO agent_bot_id FROM telegram_bots WHERE bot_username = 'tron_energy_agent_bot';
    
    -- 创建主机器人的能量闪租策略
    INSERT INTO pricing_strategies (id, name, type, config, template_id, is_active, created_by)
    VALUES (
        gen_random_uuid(),
        '主机器人标准能量闪租',
        'energy_flash',
        '{
            "unit_price": 1.5,
            "max_quantity": 5,
            "expiry_hours": 1,
            "double_energy_for_no_usdt": true,
            "min_purchase_amount": 1,
            "discount_rules": [
                {"min_quantity": 3, "discount_percent": 5},
                {"min_quantity": 5, "discount_percent": 10}
            ]
        }'::jsonb,
        template_energy_flash_id,
        true,
        'system'
    ) RETURNING id INTO strategy_id;
    
    -- 关联主机器人与能量闪租策略
    INSERT INTO bot_pricing_configs (bot_id, strategy_id, mode_type, is_active, priority, effective_from)
    VALUES (main_bot_id, strategy_id, 'energy_flash', true, 1, CURRENT_TIMESTAMP);
    
    -- 创建主机器人的笔数套餐策略
    INSERT INTO pricing_strategies (id, name, type, config, template_id, is_active, created_by)
    VALUES (
        gen_random_uuid(),
        '主机器人标准笔数套餐',
        'transaction_package',
        '{
            "packages": [
                {"transactions": 10, "price": 8.0, "description": "10笔套餐"},
                {"transactions": 20, "price": 15.0, "description": "20笔套餐"},
                {"transactions": 50, "price": 35.0, "description": "50笔套餐"},
                {"transactions": 100, "price": 65.0, "description": "100笔套餐"}
            ],
            "occupation_fee_hours": 24,
            "occupation_fee_amount": 1,
            "auto_renewal": false,
            "max_concurrent_packages": 3
        }'::jsonb,
        template_transaction_package_id,
        true,
        'system'
    ) RETURNING id INTO strategy_id;
    
    -- 关联主机器人与笔数套餐策略
    INSERT INTO bot_pricing_configs (bot_id, strategy_id, mode_type, is_active, priority, effective_from)
    VALUES (main_bot_id, strategy_id, 'transaction_package', true, 1, CURRENT_TIMESTAMP);
    
    -- 创建代理机器人的优惠能量闪租策略
    INSERT INTO pricing_strategies (id, name, type, config, template_id, is_active, created_by)
    VALUES (
        gen_random_uuid(),
        '代理机器人优惠能量闪租',
        'energy_flash',
        '{
            "unit_price": 1.2,
            "max_quantity": 10,
            "expiry_hours": 2,
            "double_energy_for_no_usdt": true,
            "min_purchase_amount": 1,
            "discount_rules": [
                {"min_quantity": 2, "discount_percent": 8},
                {"min_quantity": 5, "discount_percent": 15},
                {"min_quantity": 10, "discount_percent": 20}
            ]
        }'::jsonb,
        template_agent_discount_id,
        true,
        'system'
    ) RETURNING id INTO strategy_id;
    
    -- 关联代理机器人与优惠能量闪租策略
    INSERT INTO bot_pricing_configs (bot_id, strategy_id, mode_type, is_active, priority, effective_from)
    VALUES (agent_bot_id, strategy_id, 'energy_flash', true, 1, CURRENT_TIMESTAMP);
    
    -- 创建代理机器人的VIP笔数套餐策略
    INSERT INTO pricing_strategies (id, name, type, config, template_id, is_active, created_by)
    VALUES (
        gen_random_uuid(),
        '代理机器人VIP笔数套餐',
        'transaction_package',
        '{
            "packages": [
                {"transactions": 10, "price": 6.5, "description": "VIP 10笔套餐"},
                {"transactions": 20, "price": 12.0, "description": "VIP 20笔套餐"},
                {"transactions": 50, "price": 28.0, "description": "VIP 50笔套餐"},
                {"transactions": 100, "price": 50.0, "description": "VIP 100笔套餐"},
                {"transactions": 200, "price": 95.0, "description": "VIP 200笔套餐"}
            ],
            "occupation_fee_hours": 48,
            "occupation_fee_amount": 1,
            "auto_renewal": true,
            "max_concurrent_packages": 5,
            "vip_benefits": {
                "priority_support": true,
                "extended_validity": true,
                "bulk_discount": true
            }
        }'::jsonb,
        template_vip_package_id,
        true,
        'system'
    ) RETURNING id INTO strategy_id;
    
    -- 关联代理机器人与VIP笔数套餐策略
    INSERT INTO bot_pricing_configs (bot_id, strategy_id, mode_type, is_active, priority, effective_from)
    VALUES (agent_bot_id, strategy_id, 'transaction_package', true, 1, CURRENT_TIMESTAMP);
    
END $$;

-- 3. 插入示例代理商用户和机器人分配
-- 注意：这里使用示例数据，实际部署时需要根据真实用户数据调整
INSERT INTO agent_bot_assignments (agent_user_id, bot_id, assigned_by, is_active)
SELECT 
    'agent_user_001' as agent_user_id,
    tb.id as bot_id,
    'system' as assigned_by,
    true as is_active
FROM telegram_bots tb
WHERE tb.bot_username = 'tron_energy_agent_bot'
ON CONFLICT (agent_user_id, bot_id) DO NOTHING;

INSERT INTO agent_bot_assignments (agent_user_id, bot_id, assigned_by, is_active)
SELECT 
    'agent_user_002' as agent_user_id,
    tb.id as bot_id,
    'system' as assigned_by,
    true as is_active
FROM telegram_bots tb
WHERE tb.bot_username IN ('tron_energy_main_bot', 'tron_energy_agent_bot')
ON CONFLICT (agent_user_id, bot_id) DO NOTHING;

-- 4. 插入系统配置参数
-- 创建系统配置表（如果不存在）
CREATE TABLE IF NOT EXISTS system_pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 为系统配置表创建更新时间触发器
CREATE TRIGGER update_system_pricing_config_updated_at
    BEFORE UPDATE ON system_pricing_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入系统配置
INSERT INTO system_pricing_config (config_key, config_value, description) VALUES
(
    'global_pricing_limits',
    '{
        "max_energy_flash_price": 10.0,
        "min_energy_flash_price": 0.1,
        "max_transaction_package_price": 1000.0,
        "min_transaction_package_price": 1.0,
        "max_quantity_per_order": 100,
        "min_quantity_per_order": 1
    }'::jsonb,
    '全局定价限制配置'
),
(
    'pricing_calculation_rules',
    '{
        "enable_bulk_discount": true,
        "enable_vip_pricing": true,
        "enable_agent_discount": true,
        "discount_calculation_method": "percentage",
        "price_rounding_precision": 2
    }'::jsonb,
    '价格计算规则配置'
),
(
    'system_maintenance',
    '{
        "maintenance_mode": false,
        "maintenance_message": "系统维护中，请稍后再试",
        "allowed_operations": ["view", "query"],
        "maintenance_start_time": null,
        "maintenance_end_time": null
    }'::jsonb,
    '系统维护模式配置'
),
(
    'notification_settings',
    '{
        "price_change_notification": true,
        "strategy_activation_notification": true,
        "bot_assignment_notification": true,
        "notification_channels": ["telegram", "email"],
        "admin_notification_threshold": 0.1
    }'::jsonb,
    '通知设置配置'
)
ON CONFLICT (config_key) DO NOTHING;

-- 为系统配置表设置权限
ALTER TABLE system_pricing_config ENABLE ROW LEVEL SECURITY;

-- 管理员可以查看和修改所有配置
CREATE POLICY "admin_full_access_system_pricing_config" ON system_pricing_config
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM telegram_users tu 
            WHERE tu.user_id = auth.uid()::text 
            AND tu.user_type = 'admin'
        )
    );

-- 认证用户可以查看激活的配置
CREATE POLICY "authenticated_view_active_system_pricing_config" ON system_pricing_config
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- 匿名用户可以查看公开的配置
CREATE POLICY "anon_view_public_system_pricing_config" ON system_pricing_config
    FOR SELECT
    TO anon
    USING (is_active = true AND config_key NOT LIKE '%_internal%');

-- 为系统配置表授权
GRANT SELECT, INSERT, UPDATE, DELETE ON system_pricing_config TO authenticated;
GRANT SELECT ON system_pricing_config TO anon;

-- 为系统配置表添加注释
COMMENT ON TABLE system_pricing_config IS '系统定价配置表';
COMMENT ON COLUMN system_pricing_config.id IS '配置ID';
COMMENT ON COLUMN system_pricing_config.config_key IS '配置键';
COMMENT ON COLUMN system_pricing_config.config_value IS '配置值（JSON格式）';
COMMENT ON COLUMN system_pricing_config.description IS '配置描述';
COMMENT ON COLUMN system_pricing_config.is_active IS '是否激活';
COMMENT ON COLUMN system_pricing_config.created_at IS '创建时间';
COMMENT ON COLUMN system_pricing_config.updated_at IS '更新时间';

-- 5. 创建数据统计视图
CREATE OR REPLACE VIEW pricing_system_stats AS
SELECT 
    'pricing_strategies' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    COUNT(*) FILTER (WHERE type = 'energy_flash') as energy_flash_count,
    COUNT(*) FILTER (WHERE type = 'transaction_package') as transaction_package_count
FROM pricing_strategies
UNION ALL
SELECT 
    'pricing_templates' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_system = true) as active_count,
    COUNT(*) FILTER (WHERE type = 'energy_flash') as energy_flash_count,
    COUNT(*) FILTER (WHERE type = 'transaction_package') as transaction_package_count
FROM pricing_templates
UNION ALL
SELECT 
    'telegram_bots' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    0 as energy_flash_count,
    0 as transaction_package_count
FROM telegram_bots
UNION ALL
SELECT 
    'bot_pricing_configs' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    COUNT(*) FILTER (WHERE mode_type = 'energy_flash') as energy_flash_count,
    COUNT(*) FILTER (WHERE mode_type = 'transaction_package') as transaction_package_count
FROM bot_pricing_configs;

-- 为统计视图授权
GRANT SELECT ON pricing_system_stats TO authenticated;
GRANT SELECT ON pricing_system_stats TO anon;

-- 为统计视图添加注释
COMMENT ON VIEW pricing_system_stats IS '价格配置系统统计视图';

-- 6. 创建系统健康检查函数
CREATE OR REPLACE FUNCTION check_pricing_system_health()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    message TEXT,
    details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    active_bots_count INTEGER;
    active_strategies_count INTEGER;
    orphaned_configs_count INTEGER;
BEGIN
    -- 检查活跃机器人数量
    SELECT COUNT(*) INTO active_bots_count FROM telegram_bots WHERE is_active = true;
    
    RETURN QUERY SELECT 
        'active_bots'::TEXT,
        CASE WHEN active_bots_count > 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        format('Found %s active bots', active_bots_count)::TEXT,
        jsonb_build_object('count', active_bots_count);
    
    -- 检查活跃策略数量
    SELECT COUNT(*) INTO active_strategies_count FROM pricing_strategies WHERE is_active = true;
    
    RETURN QUERY SELECT 
        'active_strategies'::TEXT,
        CASE WHEN active_strategies_count > 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        format('Found %s active strategies', active_strategies_count)::TEXT,
        jsonb_build_object('count', active_strategies_count);
    
    -- 检查孤立的配置
    SELECT COUNT(*) INTO orphaned_configs_count 
    FROM bot_pricing_configs bpc
    LEFT JOIN telegram_bots tb ON bpc.bot_id = tb.id
    LEFT JOIN pricing_strategies ps ON bpc.strategy_id = ps.id
    WHERE tb.id IS NULL OR ps.id IS NULL;
    
    RETURN QUERY SELECT 
        'orphaned_configs'::TEXT,
        CASE WHEN orphaned_configs_count = 0 THEN 'OK' ELSE 'ERROR' END::TEXT,
        format('Found %s orphaned configurations', orphaned_configs_count)::TEXT,
        jsonb_build_object('count', orphaned_configs_count);
    
    -- 检查模板完整性
    RETURN QUERY SELECT 
        'template_integrity'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM pricing_templates WHERE type = 'energy_flash') 
             AND EXISTS(SELECT 1 FROM pricing_templates WHERE type = 'transaction_package')
             THEN 'OK' ELSE 'ERROR' END::TEXT,
        'Checking template availability for both pricing modes'::TEXT,
        jsonb_build_object(
            'energy_flash_templates', (SELECT COUNT(*) FROM pricing_templates WHERE type = 'energy_flash'),
            'transaction_package_templates', (SELECT COUNT(*) FROM pricing_templates WHERE type = 'transaction_package')
        );
END;
$$;

-- 为健康检查函数授权
GRANT EXECUTE ON FUNCTION check_pricing_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION check_pricing_system_health() TO anon;

-- 为健康检查函数添加注释
COMMENT ON FUNCTION check_pricing_system_health() IS '价格配置系统健康检查函数';

-- 完成默认数据插入
SELECT 'Default pricing system data has been inserted successfully.' as result;

-- 显示插入的数据统计
SELECT * FROM pricing_system_stats;

-- 运行健康检查
SELECT * FROM check_pricing_system_health();