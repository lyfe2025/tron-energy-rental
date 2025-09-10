-- 创建键盘按钮配置表
-- 支持动态配置回复键盘和内联键盘按钮

CREATE TABLE IF NOT EXISTS keyboard_button_configs (
    id SERIAL PRIMARY KEY,
    text VARCHAR(100) NOT NULL UNIQUE COMMENT '按钮显示文本',
    callback_data VARCHAR(200) NOT NULL COMMENT '回调数据，支持新格式如 action:method:params',
    action_type VARCHAR(50) NOT NULL COMMENT '动作类型，如 menu, order, price 等',
    is_enabled BOOLEAN DEFAULT true COMMENT '是否启用此按钮',
    button_type VARCHAR(20) DEFAULT 'reply' CHECK (button_type IN ('reply', 'inline')) COMMENT '按钮类型：reply（回复键盘）或 inline（内联键盘）',
    description TEXT COMMENT '按钮功能描述',
    params JSONB COMMENT '额外参数，以JSON格式存储',
    order_index INTEGER DEFAULT 0 COMMENT '显示顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_keyboard_button_configs_enabled 
ON keyboard_button_configs(is_enabled, button_type);

CREATE INDEX IF NOT EXISTS idx_keyboard_button_configs_text 
ON keyboard_button_configs(text);

CREATE INDEX IF NOT EXISTS idx_keyboard_button_configs_action_type 
ON keyboard_button_configs(action_type);

-- 创建更新时间的触发器
CREATE OR REPLACE FUNCTION update_keyboard_button_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_keyboard_button_configs_updated_at
    BEFORE UPDATE ON keyboard_button_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_keyboard_button_configs_updated_at();

-- 插入默认按钮配置
INSERT INTO keyboard_button_configs (text, callback_data, action_type, description, order_index) VALUES
('⚡ 能量闪租', 'price:showEnergyFlash', 'price', '显示能量闪租价格配置', 1),
('🔥 笔数套餐', 'price:showTransactionPackage', 'price', '显示笔数套餐价格配置', 2),
('🔄 TRX闪兑', 'price:showTrxExchange', 'price', '显示TRX闪兑价格配置', 3),
('📋 我的订单', 'order:showUserOrders', 'order', '显示用户订单', 4),
('💰 账户余额', 'user:showBalance', 'user', '显示账户余额', 5),
('❓ 帮助支持', 'help:showHelp', 'help', '显示帮助信息', 6),
('🔄 刷新菜单', 'menu:showMainMenu', 'menu', '刷新主菜单', 7)
ON CONFLICT (text) DO NOTHING;

-- 创建按钮配置管理视图（可选）
CREATE OR REPLACE VIEW v_keyboard_button_configs AS
SELECT 
    id,
    text,
    callback_data,
    action_type,
    is_enabled,
    button_type,
    description,
    params,
    order_index,
    created_at,
    updated_at,
    CASE 
        WHEN is_enabled THEN '启用'
        ELSE '禁用'
    END as status_text,
    CASE 
        WHEN button_type = 'reply' THEN '回复键盘'
        WHEN button_type = 'inline' THEN '内联键盘'
        ELSE '未知类型'
    END as button_type_text
FROM keyboard_button_configs
ORDER BY button_type, order_index, id;

-- 插入一些内联键盘按钮示例
INSERT INTO keyboard_button_configs (text, callback_data, action_type, button_type, description, order_index) VALUES
('✅ 确认订单', 'order:confirmOrder', 'order', 'inline', '确认订单操作', 1),
('❌ 取消订单', 'order:cancelOrder', 'order', 'inline', '取消订单操作', 2),
('📦 选择套餐', 'package:selectPackage', 'package', 'inline', '选择能量套餐', 3),
('🔙 返回主菜单', 'menu:showMainMenu', 'menu', 'inline', '返回主菜单', 4),
('🔄 刷新状态', 'delegation:refreshStatus', 'delegation', 'inline', '刷新委托状态', 5)
ON CONFLICT (text) DO NOTHING;

-- 添加注释
COMMENT ON TABLE keyboard_button_configs IS '键盘按钮配置表，支持动态配置 Telegram 机器人的回复键盘和内联键盘按钮';
COMMENT ON COLUMN keyboard_button_configs.callback_data IS '回调数据，支持新格式：action:method 或 action:method:params';
COMMENT ON COLUMN keyboard_button_configs.action_type IS '动作类型，用于分组和路由到对应的处理器';
COMMENT ON COLUMN keyboard_button_configs.params IS '额外参数，支持复杂的配置需求';

-- 创建函数：获取启用的按钮配置
CREATE OR REPLACE FUNCTION get_enabled_button_configs(p_button_type VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id INTEGER,
    text VARCHAR,
    callback_data VARCHAR,
    action_type VARCHAR,
    button_type VARCHAR,
    description TEXT,
    params JSONB,
    order_index INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kbc.id,
        kbc.text,
        kbc.callback_data,
        kbc.action_type,
        kbc.button_type,
        kbc.description,
        kbc.params,
        kbc.order_index
    FROM keyboard_button_configs kbc
    WHERE kbc.is_enabled = true
      AND (p_button_type IS NULL OR kbc.button_type = p_button_type)
    ORDER BY kbc.button_type, kbc.order_index, kbc.id;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：根据文本获取回调数据
CREATE OR REPLACE FUNCTION get_callback_data_by_text(p_text VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_callback_data VARCHAR;
BEGIN
    SELECT callback_data INTO v_callback_data
    FROM keyboard_button_configs
    WHERE text = p_text AND is_enabled = true
    LIMIT 1;
    
    RETURN v_callback_data;
END;
$$ LANGUAGE plpgsql;

-- 测试查询示例
/*
-- 获取所有启用的回复键盘按钮
SELECT * FROM get_enabled_button_configs('reply');

-- 获取所有启用的内联键盘按钮
SELECT * FROM get_enabled_button_configs('inline');

-- 根据按钮文本获取回调数据
SELECT get_callback_data_by_text('⚡ 能量闪租');

-- 查看按钮配置统计
SELECT 
    button_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_enabled = true) as enabled_count,
    COUNT(*) FILTER (WHERE is_enabled = false) as disabled_count
FROM keyboard_button_configs
GROUP BY button_type;
*/
