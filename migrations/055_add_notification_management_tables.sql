-- 添加通知管理相关数据库表
-- 创建时间: 2025-01-28
-- 目的: 为Telegram机器人添加完整的通知管理功能

-- 1. 机器人通知配置表
CREATE TABLE IF NOT EXISTS telegram_bot_notification_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    -- 总体配置
    enabled BOOLEAN DEFAULT true,
    default_language VARCHAR(10) DEFAULT 'zh',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    
    -- 分类通知配置 (JSON格式存储详细配置)
    business_notifications JSONB DEFAULT '{}' CHECK (jsonb_typeof(business_notifications) = 'object'),
    agent_notifications JSONB DEFAULT '{}' CHECK (jsonb_typeof(agent_notifications) = 'object'),
    price_notifications JSONB DEFAULT '{}' CHECK (jsonb_typeof(price_notifications) = 'object'),
    system_notifications JSONB DEFAULT '{}' CHECK (jsonb_typeof(system_notifications) = 'object'),
    marketing_notifications JSONB DEFAULT '{}' CHECK (jsonb_typeof(marketing_notifications) = 'object'),
    
    -- 发送策略配置
    rate_limiting JSONB DEFAULT '{
        "enabled": true,
        "max_per_hour": 10,
        "max_per_day": 50,
        "user_limits": {
            "transaction": 5,
            "order_status": 3,
            "price_change": 2,
            "marketing": 1,
            "system": 3
        }
    }' CHECK (jsonb_typeof(rate_limiting) = 'object'),
    
    retry_strategy JSONB DEFAULT '{
        "enabled": true,
        "max_attempts": 3,
        "delay_seconds": [30, 300, 1800],
        "exponential_backoff": true
    }' CHECK (jsonb_typeof(retry_strategy) = 'object'),
    
    quiet_hours JSONB DEFAULT '{
        "enabled": false,
        "start_time": "23:00",
        "end_time": "07:00",
        "timezone": "Asia/Shanghai"
    }' CHECK (jsonb_typeof(quiet_hours) = 'object'),
    
    -- 统计和监控开关
    analytics_enabled BOOLEAN DEFAULT true,
    performance_monitoring BOOLEAN DEFAULT true,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    UNIQUE(bot_id)
);

-- 2. 消息模板表
CREATE TABLE IF NOT EXISTS telegram_message_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    -- 模板基本信息
    name VARCHAR(200) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 通知类型: order_created, payment_success, etc.
    category VARCHAR(50) NOT NULL DEFAULT 'business', -- business, agent, price, system, marketing
    language VARCHAR(10) DEFAULT 'zh',
    
    -- 模板内容
    content TEXT NOT NULL,
    parse_mode VARCHAR(20) DEFAULT 'Markdown' CHECK (parse_mode IN ('Markdown', 'HTML', 'text')),
    
    -- 按钮配置 (JSON数组)
    buttons JSONB DEFAULT '[]' CHECK (jsonb_typeof(buttons) = 'array'),
    
    -- 变量定义
    variables JSONB DEFAULT '[]' CHECK (jsonb_typeof(variables) = 'array'),
    
    -- 模板元数据
    description TEXT,
    tags VARCHAR(500), -- 逗号分隔的标签
    
    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- 状态控制
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- 是否为该类型的默认模板
    version INTEGER DEFAULT 1,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- 约束
    UNIQUE(bot_id, type, language, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- 3. 通知发送记录表
CREATE TABLE IF NOT EXISTS telegram_notification_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    -- 通知基本信息
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    category VARCHAR(50) NOT NULL DEFAULT 'business',
    
    -- 发送目标
    target_type VARCHAR(50) NOT NULL DEFAULT 'user', -- 'all', 'user', 'group', 'agents', 'custom'
    target_count INTEGER DEFAULT 0,
    target_criteria JSONB DEFAULT '{}', -- 目标用户筛选条件
    
    -- 发送结果
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sending', 'completed', 'failed', 'cancelled'
    
    -- 发送内容
    message_content TEXT,
    template_id UUID REFERENCES telegram_message_templates(id),
    template_variables JSONB DEFAULT '{}', -- 模板变量的具体值
    
    -- 发送配置
    send_immediately BOOLEAN DEFAULT true,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=最高优先级, 10=最低
    
    -- 发送选项
    options JSONB DEFAULT '{
        "disable_notification": false,
        "protect_content": false,
        "allow_sending_without_reply": true
    }',
    
    -- 元数据和错误信息
    metadata JSONB DEFAULT '{}',
    error_details TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id)
);

-- 4. 用户通知偏好表
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    -- 通知开关配置
    enabled_types JSONB DEFAULT '[]' CHECK (jsonb_typeof(enabled_types) = 'array'),
    disabled_types JSONB DEFAULT '[]' CHECK (jsonb_typeof(disabled_types) = 'array'),
    global_enabled BOOLEAN DEFAULT true,
    
    -- 时间设置
    quiet_hours JSONB DEFAULT '{
        "enabled": false,
        "start_time": "23:00",
        "end_time": "07:00"
    }',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    
    -- 接收偏好
    prefer_images BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'zh',
    max_notifications_per_hour INTEGER DEFAULT 10 CHECK (max_notifications_per_hour > 0),
    
    -- 特殊设置
    marketing_enabled BOOLEAN DEFAULT true,
    price_alerts_enabled BOOLEAN DEFAULT true,
    agent_notifications_enabled BOOLEAN DEFAULT true,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    UNIQUE(user_id, bot_id)
);

-- 5. 通知统计表
CREATE TABLE IF NOT EXISTS telegram_notification_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    -- 统计维度
    date DATE NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'business',
    
    -- 发送统计
    total_sent INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_scheduled INTEGER DEFAULT 0,
    
    -- 用户交互统计
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    callback_count INTEGER DEFAULT 0,
    
    -- 性能统计
    avg_send_time_ms INTEGER DEFAULT 0,
    max_send_time_ms INTEGER DEFAULT 0,
    min_send_time_ms INTEGER DEFAULT 0,
    
    -- 错误统计
    error_rate DECIMAL(5,4) DEFAULT 0.0000 CHECK (error_rate >= 0 AND error_rate <= 1),
    retry_count INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    UNIQUE(bot_id, date, notification_type, category)
);

-- 6. 通知队列表 (用于异步处理)
CREATE TABLE IF NOT EXISTS telegram_notification_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    -- 队列信息
    queue_type VARCHAR(50) NOT NULL DEFAULT 'notification', -- 'notification', 'bulk', 'scheduled'
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- 处理状态
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'retrying'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- 通知内容
    notification_data JSONB NOT NULL,
    target_user_id UUID,
    target_chat_id BIGINT,
    
    -- 时间控制
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 结果信息
    result JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- 索引优化
    INDEX idx_notification_queue_status_priority ON telegram_notification_queue(status, priority, scheduled_at),
    INDEX idx_notification_queue_bot_status ON telegram_notification_queue(bot_id, status),
    INDEX idx_notification_queue_next_attempt ON telegram_notification_queue(next_attempt_at) WHERE status IN ('pending', 'retrying')
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notification_configs_bot_id ON telegram_bot_notification_configs(bot_id);
CREATE INDEX IF NOT EXISTS idx_notification_configs_enabled ON telegram_bot_notification_configs(enabled);

CREATE INDEX IF NOT EXISTS idx_message_templates_bot_type ON telegram_message_templates(bot_id, type);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON telegram_message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON telegram_message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_message_templates_default ON telegram_message_templates(bot_id, type, is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_notification_logs_bot_type ON telegram_notification_logs(bot_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON telegram_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON telegram_notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_scheduled ON telegram_notification_logs(scheduled_at) WHERE scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_bot ON user_notification_preferences(user_id, bot_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_enabled ON user_notification_preferences(global_enabled);

CREATE INDEX IF NOT EXISTS idx_notification_analytics_date ON telegram_notification_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_bot_date ON telegram_notification_analytics(bot_id, date);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_type ON telegram_notification_analytics(notification_type);

-- 创建触发器用于自动更新时间戳
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_configs_updated_at
    BEFORE UPDATE ON telegram_bot_notification_configs
    FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER trigger_message_templates_updated_at
    BEFORE UPDATE ON telegram_message_templates
    FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

-- 插入默认通知配置数据
INSERT INTO telegram_bot_notification_configs (
    bot_id, 
    enabled, 
    business_notifications,
    agent_notifications,
    price_notifications,
    system_notifications,
    marketing_notifications
)
SELECT 
    id as bot_id,
    true as enabled,
    '{
        "enabled": true,
        "order_created": {"enabled": true, "delay_seconds": 5},
        "payment_success": {"enabled": true, "include_image": true},
        "payment_failed": {"enabled": true, "retry_notification": true},
        "energy_delegation_complete": {"enabled": true, "show_tx_link": true},
        "energy_delegation_failed": {"enabled": true, "include_support_contact": true},
        "order_status_update": {"enabled": true, "edit_existing_message": true}
    }' as business_notifications,
    '{
        "enabled": true,
        "application_submitted": {"enabled": true},
        "application_approved": {"enabled": true, "include_welcome_guide": true},
        "application_rejected": {"enabled": true, "include_feedback": true},
        "commission_earned": {"enabled": true, "min_amount": 1},
        "level_upgrade": {"enabled": true, "include_benefits": true},
        "withdrawal_completed": {"enabled": true},
        "monthly_summary": {"enabled": true, "send_on_day": 1}
    }' as agent_notifications,
    '{
        "enabled": true,
        "price_increase": {"enabled": true, "threshold_percent": 5},
        "price_decrease": {"enabled": true, "threshold_percent": 5},
        "new_package": {"enabled": true, "target_all_users": true},
        "limited_offer": {"enabled": true, "urgency_indicators": true},
        "stock_warning": {"enabled": false, "admin_only": true}
    }' as price_notifications,
    '{
        "enabled": true,
        "maintenance_notice": {"enabled": true, "advance_hours": 24},
        "maintenance_start": {"enabled": true},
        "maintenance_complete": {"enabled": true},
        "system_alert": {"enabled": true, "admin_only": true},
        "security_warning": {"enabled": true},
        "daily_report": {"enabled": false, "admin_only": true}
    }' as system_notifications,
    '{
        "enabled": true,
        "new_feature": {"enabled": true, "target_active_users": true},
        "user_reactivation": {"enabled": true, "inactive_days": 30},
        "satisfaction_survey": {"enabled": true, "frequency_days": 90},
        "birthday_greeting": {"enabled": false},
        "vip_exclusive": {"enabled": true, "vip_only": true}
    }' as marketing_notifications
FROM telegram_bots
WHERE NOT EXISTS (
    SELECT 1 FROM telegram_bot_notification_configs 
    WHERE telegram_bot_notification_configs.bot_id = telegram_bots.id
);

-- 插入默认消息模板
INSERT INTO telegram_message_templates (
    bot_id, name, type, category, content, variables, buttons, created_by
)
SELECT 
    tb.id as bot_id,
    '订单创建成功' as name,
    'order_created' as type,
    'business' as category,
    '📋 **订单创建成功！**

🎯 订单信息：
• 订单号：`{{orderId}}`
• 套餐名称：{{packageName}}
• 能量数量：{{energy}} Energy
• 支付金额：{{amount}} TRX
• 目标地址：`{{targetAddress}}`

💳 **请扫描下方二维码完成支付**
⏰ 订单有效期：15分钟

支付完成后，系统将自动为您委托能量，请耐心等待。' as content,
    '[
        {"name": "orderId", "type": "string", "description": "订单号"},
        {"name": "packageName", "type": "string", "description": "套餐名称"},
        {"name": "energy", "type": "number", "description": "能量数量"},
        {"name": "amount", "type": "number", "description": "支付金额"},
        {"name": "targetAddress", "type": "string", "description": "目标地址"}
    ]' as variables,
    '[
        [
            {"text": "💰 立即支付", "type": "callback_data", "value": "pay:{{orderId}}"},
            {"text": "❌ 取消订单", "type": "callback_data", "value": "cancel:{{orderId}}"}
        ],
        [
            {"text": "📞 联系客服", "type": "callback_data", "value": "contact_support"}
        ]
    ]' as buttons,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1) as created_by
FROM telegram_bots tb
WHERE NOT EXISTS (
    SELECT 1 FROM telegram_message_templates 
    WHERE bot_id = tb.id AND type = 'order_created'
);

-- 添加更多默认模板
INSERT INTO telegram_message_templates (
    bot_id, name, type, category, content, variables, buttons, created_by
)
SELECT 
    tb.id as bot_id,
    '支付成功通知' as name,
    'payment_success' as type,
    'business' as category,
    '✅ **支付成功！**

🎉 恭喜！您的订单已支付成功

📋 **订单详情：**
• 订单号：`{{orderId}}`
• 支付金额：{{amount}} TRX
• 交易哈希：`{{txHash}}`
• 支付时间：{{timestamp}}

🔄 **处理状态：**
系统正在为您处理能量委托，预计3-5分钟内完成。委托完成后会立即通知您！

⚡ 感谢您选择我们的服务！' as content,
    '[
        {"name": "orderId", "type": "string", "description": "订单号"},
        {"name": "amount", "type": "number", "description": "支付金额"},
        {"name": "txHash", "type": "string", "description": "交易哈希"},
        {"name": "timestamp", "type": "string", "description": "支付时间"}
    ]' as variables,
    '[
        [
            {"text": "🔍 查看交易详情", "type": "url", "value": "https://tronscan.org/#/transaction/{{txHash}}"}
        ],
        [
            {"text": "📋 我的订单", "type": "callback_data", "value": "my_orders"},
            {"text": "🔋 继续购买", "type": "callback_data", "value": "energy_packages"}
        ]
    ]' as buttons,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1) as created_by
FROM telegram_bots tb
WHERE NOT EXISTS (
    SELECT 1 FROM telegram_message_templates 
    WHERE bot_id = tb.id AND type = 'payment_success'
);

-- 系统维护通知模板
INSERT INTO telegram_message_templates (
    bot_id, name, type, category, content, variables, buttons, created_by
)
SELECT 
    tb.id as bot_id,
    '系统维护通知' as name,
    'maintenance_notice' as type,
    'system' as category,
    '🔧 **系统维护通知**

📅 **维护时间：** {{maintenanceTime}}
⏱️ **预计时长：** {{duration}}
🎯 **维护内容：** {{description}}

⚠️ **影响功能：**
{{affectedFeatures}}

💡 **温馨提示：**
为确保您的使用体验，建议您在维护开始前完成重要操作。维护期间给您带来的不便，我们深表歉意！

维护完成后，我们会第一时间通知您。' as content,
    '[
        {"name": "maintenanceTime", "type": "string", "description": "维护时间"},
        {"name": "duration", "type": "string", "description": "维护时长"},
        {"name": "description", "type": "string", "description": "维护内容"},
        {"name": "affectedFeatures", "type": "string", "description": "影响功能列表"}
    ]' as variables,
    '[
        [
            {"text": "📞 联系客服", "type": "callback_data", "value": "contact_support"},
            {"text": "📋 了解详情", "type": "callback_data", "value": "maintenance_details"}
        ]
    ]' as buttons,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1) as created_by
FROM telegram_bots tb
WHERE NOT EXISTS (
    SELECT 1 FROM telegram_message_templates 
    WHERE bot_id = tb.id AND type = 'maintenance_notice'
);

-- 添加注释
COMMENT ON TABLE telegram_bot_notification_configs IS 'Telegram机器人通知配置表';
COMMENT ON TABLE telegram_message_templates IS 'Telegram消息模板表';
COMMENT ON TABLE telegram_notification_logs IS 'Telegram通知发送记录表';
COMMENT ON TABLE user_notification_preferences IS '用户通知偏好设置表';
COMMENT ON TABLE telegram_notification_analytics IS 'Telegram通知统计分析表';
COMMENT ON TABLE telegram_notification_queue IS 'Telegram通知队列表';

-- 完成迁移
SELECT 'Telegram通知管理表创建完成' as message;
