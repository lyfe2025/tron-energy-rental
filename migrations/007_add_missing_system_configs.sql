-- 添加系统设置页面所需的配置项
-- 创建时间: 2024-01-01
-- 版本: 1.0.1
-- 为前端设置页面添加缺失的配置项

-- 添加基础设置配置项
INSERT INTO system_configs (config_key, config_value, config_type, category, description, is_public, is_editable, default_value) VALUES
-- 基础设置
('system.description', '专业的TRON网络能量和带宽租赁服务平台', 'string', 'system', '系统描述', true, true, '专业的TRON网络能量和带宽租赁服务平台'),
('system.contact_email', 'support@tron-energy.com', 'string', 'system', '联系邮箱', true, true, 'support@tron-energy.com'),
('system.support_phone', '+86-400-123-4567', 'string', 'system', '支持电话', true, true, '+86-400-123-4567'),
('system.timezone', 'Asia/Shanghai', 'string', 'system', '系统时区', true, true, 'Asia/Shanghai'),
('system.language', 'zh-CN', 'string', 'system', '系统语言', true, true, 'zh-CN'),
('system.currency', 'CNY', 'string', 'system', '系统货币', true, true, 'CNY'),
('system.date_format', 'YYYY-MM-DD', 'string', 'system', '日期格式', true, true, 'YYYY-MM-DD'),

-- 安全设置
('security.enable_two_factor', 'true', 'boolean', 'security', '启用双因子认证', false, true, 'true'),
('security.session_timeout', '30', 'number', 'security', '会话超时时间(分钟)', false, true, '30'),
('security.password_expire_days', '90', 'number', 'security', '密码过期天数', false, true, '90'),
('security.enable_ip_whitelist', 'false', 'boolean', 'security', '启用IP白名单', false, true, 'false'),
('security.ip_whitelist', '[]', 'array', 'security', 'IP白名单列表', false, true, '[]'),
('security.enable_api_rate_limit', 'true', 'boolean', 'security', '启用API速率限制', false, true, 'true'),
('security.api_rate_limit', '1000', 'number', 'security', 'API速率限制(每小时)', false, true, '1000'),

-- 通知设置
('notification.system_alerts', 'true', 'boolean', 'notification', '系统警报通知', false, true, 'true'),
('notification.order_updates', 'true', 'boolean', 'notification', '订单更新通知', false, true, 'true'),
('notification.low_balance_alert', 'true', 'boolean', 'notification', '余额不足警报', false, true, 'true'),
('notification.maintenance_notifications', 'true', 'boolean', 'notification', '维护通知', false, true, 'true'),
('notification.weekly_report', 'true', 'boolean', 'notification', '周报通知', false, true, 'true'),
('notification.monthly_report', 'true', 'boolean', 'notification', '月报通知', false, true, 'true'),

-- 高级设置
('system.debug_mode', 'false', 'boolean', 'system', '调试模式', false, true, 'false'),
('system.log_level', 'info', 'string', 'system', '日志级别', false, true, 'info'),
('system.auto_backup', 'true', 'boolean', 'system', '自动备份', false, true, 'true'),
('system.backup_retention_days', '30', 'number', 'system', '备份保留天数', false, true, '30'),
('system.cache_optimization', 'true', 'boolean', 'system', '缓存优化', false, true, 'true'),
('system.cache_expire_time', '3600', 'number', 'system', '缓存过期时间(秒)', false, true, '3600'),

-- 定价设置
('pricing.energy_base_price', '0.1', 'number', 'pricing', '能量基础价格', false, true, '0.1'),
('pricing.bandwidth_base_price', '0.05', 'number', 'pricing', '带宽基础价格', false, true, '0.05'),
('pricing.emergency_fee_multiplier', '1.5', 'number', 'pricing', '紧急费用倍数', false, true, '1.5'),
('pricing.minimum_order_amount', '10', 'number', 'pricing', '最小订单金额', false, true, '10'),
('pricing.maximum_order_amount', '10000', 'number', 'pricing', '最大订单金额', false, true, '10000')

ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  is_editable = EXCLUDED.is_editable,
  default_value = EXCLUDED.default_value,
  updated_at = CURRENT_TIMESTAMP;

-- 添加中文注释
COMMENT ON TABLE system_configs IS '系统配置表 - 存储系统参数配置';
COMMENT ON COLUMN system_configs.config_key IS '配置键名 - 唯一标识';
COMMENT ON COLUMN system_configs.config_value IS '配置值 - 以字符串形式存储';
COMMENT ON COLUMN system_configs.config_type IS '配置类型 - string/number/boolean/json/array';
COMMENT ON COLUMN system_configs.category IS '配置分类 - system/security/notification等';
COMMENT ON COLUMN system_configs.description IS '配置描述 - 说明配置的用途';
COMMENT ON COLUMN system_configs.is_public IS '是否公开 - 普通用户是否可见';
COMMENT ON COLUMN system_configs.is_editable IS '是否可编辑 - 是否允许修改';
COMMENT ON COLUMN system_configs.validation_rules IS '验证规则 - JSON格式的验证规则';
COMMENT ON COLUMN system_configs.default_value IS '默认值 - 重置时使用的默认值';

COMMENT ON TABLE system_config_history IS '系统配置历史表 - 记录配置变更历史';
COMMENT ON COLUMN system_config_history.config_id IS '配置ID - 关联system_configs表';
COMMENT ON COLUMN system_config_history.old_value IS '旧值 - 修改前的值';
COMMENT ON COLUMN system_config_history.new_value IS '新值 - 修改后的值';
COMMENT ON COLUMN system_config_history.change_reason IS '变更原因 - 说明为什么修改';
COMMENT ON COLUMN system_config_history.changed_by IS '变更人 - 执行修改的用户ID';
