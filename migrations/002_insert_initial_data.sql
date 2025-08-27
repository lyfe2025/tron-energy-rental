-- 插入TRON能量租赁系统初始数据
-- 创建时间: 2024-01-01
-- 版本: 1.0.0

-- 插入默认管理员用户
INSERT INTO users (id, email, username, first_name, role, status, referral_code) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'admin@tronrental.com', 'admin', 'System Admin', 'admin', 'active', 'ADMIN001')
ON CONFLICT (id) DO NOTHING;

-- 插入默认能量包
INSERT INTO energy_packages (id, name, description, energy_amount, price, duration_hours, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '基础能量包', '适合小额交易的基础能量包', 10000, 1.00, 24, true),
('550e8400-e29b-41d4-a716-446655440002', '标准能量包', '适合日常使用的标准能量包', 50000, 4.50, 24, true),
('550e8400-e29b-41d4-a716-446655440003', '高级能量包', '适合大额交易的高级能量包', 100000, 8.00, 24, true),
('550e8400-e29b-41d4-a716-446655440004', '企业能量包', '适合企业用户的大容量能量包', 500000, 35.00, 24, true),
('550e8400-e29b-41d4-a716-446655440005', '超级能量包', '适合超大额交易的超级能量包', 1000000, 65.00, 24, true)
ON CONFLICT (id) DO NOTHING;

-- 插入默认Telegram机器人
INSERT INTO bots (id, name, username, token, description, status, settings) VALUES 
('550e8400-e29b-41d4-a716-446655440010', 'TRON能量租赁机器人', 'tron_energy_bot', 'YOUR_BOT_TOKEN_HERE', '官方TRON能量租赁服务机器人', 'active', 
 '{
   "welcome_message": "欢迎使用TRON能量租赁服务！\n\n🔋 我们提供快速、安全的TRON能量租赁服务\n💰 支持多种套餐选择\n⚡ 即时到账，24小时有效\n\n请选择您需要的服务：",
   "language": "zh-CN",
   "timezone": "Asia/Shanghai",
   "auto_reply": true,
   "max_daily_orders": 100
 }'),
('550e8400-e29b-41d4-a716-446655440011', 'TRON能量代理机器人', 'tron_agent_bot', 'YOUR_AGENT_BOT_TOKEN_HERE', '代理专用TRON能量租赁机器人', 'active',
 '{
   "welcome_message": "欢迎使用代理专用TRON能量租赁服务！\n\n🎯 专为代理用户设计\n💎 享受更优惠的价格\n📊 实时查看收益统计\n\n请选择您需要的服务：",
   "language": "zh-CN",
   "timezone": "Asia/Shanghai",
   "auto_reply": true,
   "max_daily_orders": 500,
   "agent_only": true
 }')
ON CONFLICT (id) DO NOTHING;

-- 插入默认能量池
INSERT INTO energy_pools (id, name, tron_address, private_key_encrypted, total_energy, available_energy, status) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '主能量池1', 'TYour1MainPoolAddressHere123456789', 'encrypted_private_key_here_1', 10000000, 10000000, 'active'),
('550e8400-e29b-41d4-a716-446655440021', '主能量池2', 'TYour2MainPoolAddressHere123456789', 'encrypted_private_key_here_2', 10000000, 10000000, 'active'),
('550e8400-e29b-41d4-a716-446655440022', '备用能量池1', 'TYourBackupPoolAddressHere123456789', 'encrypted_private_key_here_3', 5000000, 5000000, 'active')
ON CONFLICT (id) DO NOTHING;

-- 插入默认价格配置
INSERT INTO price_configs (id, bot_id, config_name, config_type, base_price, price_per_unit, min_amount, max_amount, duration_hours, is_active, created_by) VALUES 
-- 官方机器人的能量闪租价格
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440010', '基础能量闪租', 'energy_flash', 0.50, 0.0001, 1000, 100000, 24, true, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440010', '高级能量闪租', 'energy_flash', 1.00, 0.00008, 50000, 1000000, 24, true, '550e8400-e29b-41d4-a716-446655440000'),

-- 官方机器人的笔数套餐价格
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440010', '10笔交易套餐', 'transaction_package', 5.00, NULL, 10, 10, 24, true, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440010', '50笔交易套餐', 'transaction_package', 20.00, NULL, 50, 50, 24, true, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440010', '100笔交易套餐', 'transaction_package', 35.00, NULL, 100, 100, 24, true, '550e8400-e29b-41d4-a716-446655440000'),

-- 代理机器人的能量闪租价格（更优惠）
('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440011', '代理能量闪租', 'energy_flash', 0.40, 0.00008, 1000, 1000000, 24, true, '550e8400-e29b-41d4-a716-446655440000'),

-- 代理机器人的笔数套餐价格（更优惠）
('550e8400-e29b-41d4-a716-446655440036', '550e8400-e29b-41d4-a716-446655440011', '代理10笔套餐', 'transaction_package', 4.00, NULL, 10, 10, 24, true, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440037', '550e8400-e29b-41d4-a716-446655440011', '代理50笔套餐', 'transaction_package', 16.00, NULL, 50, 50, 24, true, '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440038', '550e8400-e29b-41d4-a716-446655440011', '代理100笔套餐', 'transaction_package', 28.00, NULL, 100, 100, 24, true, '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

-- 插入默认价格模板
INSERT INTO price_templates (id, template_name, description, config_data, is_default, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440040', '标准定价模板', '适用于大多数机器人的标准定价策略', 
 '{
   "energy_flash": {
     "base_price": 0.50,
     "price_per_unit": 0.0001,
     "min_amount": 1000,
     "max_amount": 100000,
     "duration_hours": 24
   },
   "transaction_package": [
     {"transactions": 10, "price": 5.00},
     {"transactions": 50, "price": 20.00},
     {"transactions": 100, "price": 35.00}
   ]
 }', true, '550e8400-e29b-41d4-a716-446655440000'),

('550e8400-e29b-41d4-a716-446655440041', '代理优惠模板', '专为代理用户设计的优惠定价策略', 
 '{
   "energy_flash": {
     "base_price": 0.40,
     "price_per_unit": 0.00008,
     "min_amount": 1000,
     "max_amount": 1000000,
     "duration_hours": 24
   },
   "transaction_package": [
     {"transactions": 10, "price": 4.00},
     {"transactions": 50, "price": 16.00},
     {"transactions": 100, "price": 28.00}
   ]
 }', false, '550e8400-e29b-41d4-a716-446655440000'),

('550e8400-e29b-41d4-a716-446655440042', '高端定价模板', '适用于高端用户的定价策略', 
 '{
   "energy_flash": {
     "base_price": 0.60,
     "price_per_unit": 0.00012,
     "min_amount": 5000,
     "max_amount": 500000,
     "duration_hours": 24
   },
   "transaction_package": [
     {"transactions": 10, "price": 6.00},
     {"transactions": 50, "price": 25.00},
     {"transactions": 100, "price": 45.00}
   ]
 }', false, '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

-- 更新序列（如果使用序列的话）
-- 这里我们使用UUID，所以不需要更新序列

-- 创建触发器函数用于自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表创建更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_energy_packages_updated_at BEFORE UPDATE ON energy_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_applications_updated_at BEFORE UPDATE ON agent_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_earnings_updated_at BEFORE UPDATE ON agent_earnings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bot_users_updated_at BEFORE UPDATE ON bot_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_energy_pools_updated_at BEFORE UPDATE ON energy_pools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_energy_transactions_updated_at BEFORE UPDATE ON energy_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_configs_updated_at BEFORE UPDATE ON price_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_templates_updated_at BEFORE UPDATE ON price_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();