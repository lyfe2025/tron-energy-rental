-- 补充缺失的中文注释迁移文件
-- Migration: 008_supplement_missing_chinese_comments.sql
-- Created: 2025-01-28
-- Description: 为所有缺失中文注释的数据库表字段添加完整的中文注释

-- ========================================
-- 代理商表 (agents) 字段注释补充
-- ========================================
COMMENT ON TABLE agents IS '代理商信息表：管理系统代理商的基本信息和佣金配置';
COMMENT ON COLUMN agents.id IS '代理商唯一标识符（UUID）';
COMMENT ON COLUMN agents.name IS '代理商名称或公司名称';
COMMENT ON COLUMN agents.email IS '代理商联系邮箱地址';
COMMENT ON COLUMN agents.telegram_id IS '代理商Telegram用户ID';
COMMENT ON COLUMN agents.commission_rate IS '代理商佣金比例（0-1之间的小数）';
COMMENT ON COLUMN agents.status IS '代理商状态：active=活跃，inactive=非活跃，pending=待审核';
COMMENT ON COLUMN agents.created_at IS '代理商记录创建时间';
COMMENT ON COLUMN agents.updated_at IS '代理商信息最后更新时间';

-- ========================================
-- 代理商定价表 (agent_pricing) 字段注释
-- ========================================
COMMENT ON TABLE agent_pricing IS '代理商定价配置表：管理不同代理商的能量定价策略';
COMMENT ON COLUMN agent_pricing.id IS '定价配置唯一标识符（UUID）';
COMMENT ON COLUMN agent_pricing.agent_id IS '关联的代理商ID';
COMMENT ON COLUMN agent_pricing.energy_type IS '能量类型：energy_flash=能量闪租，transaction_package=笔数套餐';
COMMENT ON COLUMN agent_pricing.purchase_price IS '代理商采购价格（TRX/单位）';
COMMENT ON COLUMN agent_pricing.selling_price IS '代理商销售价格（TRX/单位）';
COMMENT ON COLUMN agent_pricing.created_at IS '定价配置创建时间';
COMMENT ON COLUMN agent_pricing.updated_at IS '定价配置最后更新时间';

-- ========================================
-- 管理员角色表 (admin_roles) 字段注释
-- ========================================
COMMENT ON TABLE admin_roles IS '管理员角色定义表：定义不同级别的管理员权限';
COMMENT ON COLUMN admin_roles.id IS '角色唯一标识符（UUID）';
COMMENT ON COLUMN admin_roles.name IS '角色名称：super_admin=超级管理员，admin=普通管理员，operator=运营管理员，customer_service=客服管理员';
COMMENT ON COLUMN admin_roles.description IS '角色功能描述';
COMMENT ON COLUMN admin_roles.permissions IS '角色权限列表（JSON格式）';
COMMENT ON COLUMN admin_roles.created_at IS '角色创建时间';

-- ========================================
-- 管理员表 (admins) 字段注释
-- ========================================
COMMENT ON TABLE admins IS '管理员账户表：管理系统管理员账户和认证信息';
COMMENT ON COLUMN admins.id IS '管理员唯一标识符（UUID）';
COMMENT ON COLUMN admins.username IS '管理员登录用户名';
COMMENT ON COLUMN admins.email IS '管理员联系邮箱地址';
COMMENT ON COLUMN admins.password_hash IS '管理员密码哈希值（加密存储）';
COMMENT ON COLUMN admins.role IS '管理员角色类型';
COMMENT ON COLUMN admins.status IS '账户状态：active=活跃，inactive=非活跃';
COMMENT ON COLUMN admins.last_login IS '最后登录时间';
COMMENT ON COLUMN admins.created_at IS '管理员账户创建时间';
COMMENT ON COLUMN admins.updated_at IS '管理员信息最后更新时间';

-- ========================================
-- 管理员权限表 (admin_permissions) 字段注释
-- ========================================
COMMENT ON TABLE admin_permissions IS '管理员权限分配表：记录管理员与角色的关联关系';
COMMENT ON COLUMN admin_permissions.id IS '权限分配唯一标识符（UUID）';
COMMENT ON COLUMN admin_permissions.admin_id IS '管理员ID';
COMMENT ON COLUMN admin_permissions.role_id IS '角色ID';
COMMENT ON COLUMN admin_permissions.granted_at IS '权限授予时间';

-- ========================================
-- 审计日志表 (audit_logs) 字段注释
-- ========================================
COMMENT ON TABLE audit_logs IS '系统审计日志表：记录所有管理操作的详细日志';
COMMENT ON COLUMN audit_logs.id IS '日志记录唯一标识符（UUID）';
COMMENT ON COLUMN audit_logs.admin_id IS '执行操作的管理员ID';
COMMENT ON COLUMN audit_logs.action IS '执行的操作类型：如CREATE、UPDATE、DELETE等';
COMMENT ON COLUMN audit_logs.resource IS '操作的目标资源：如users、orders、configs等';
COMMENT ON COLUMN audit_logs.details IS '操作详细信息（JSON格式）';
COMMENT ON COLUMN audit_logs.ip_address IS '操作者IP地址';
COMMENT ON COLUMN audit_logs.created_at IS '日志记录创建时间';

-- ========================================
-- 能量消耗记录表 (energy_consumption_logs) 字段注释
-- ========================================
COMMENT ON TABLE energy_consumption_logs IS '能量消耗记录表：追踪能量池的能量使用情况和成本统计';
COMMENT ON COLUMN energy_consumption_logs.id IS '消耗记录唯一标识符（UUID）';
COMMENT ON COLUMN energy_consumption_logs.pool_account_id IS '关联的能量池账户ID';
COMMENT ON COLUMN energy_consumption_logs.energy_amount IS '消耗的能量数量';
COMMENT ON COLUMN energy_consumption_logs.cost_amount IS '消耗能量的成本金额（TRX）';
COMMENT ON COLUMN energy_consumption_logs.transaction_type IS '交易类型：reserve=预留，confirm=确认，release=释放';
COMMENT ON COLUMN energy_consumption_logs.order_id IS '关联的订单ID（如果有）';
COMMENT ON COLUMN energy_consumption_logs.telegram_user_id IS 'Telegram用户ID';
COMMENT ON COLUMN energy_consumption_logs.created_at IS '消耗记录创建时间';
COMMENT ON COLUMN energy_consumption_logs.updated_at IS '消耗记录最后更新时间';

-- ========================================
-- 系统定价配置表 (system_pricing_config) 字段注释
-- ========================================
COMMENT ON TABLE system_pricing_config IS '系统定价配置表：管理全局定价策略和系统参数配置';
COMMENT ON COLUMN system_pricing_config.id IS '配置项唯一标识符（UUID）';
COMMENT ON COLUMN system_pricing_config.config_key IS '配置键名：如global_pricing_limits、pricing_calculation_rules等';
COMMENT ON COLUMN system_pricing_config.config_value IS '配置值（JSON格式）';
COMMENT ON COLUMN system_pricing_config.description IS '配置项功能描述';
COMMENT ON COLUMN system_pricing_config.is_active IS '配置是否激活生效';
COMMENT ON COLUMN system_pricing_config.created_at IS '配置创建时间';
COMMENT ON COLUMN system_pricing_config.updated_at IS '配置最后更新时间';

-- ========================================
-- 代理商机器人分配表 (agent_bot_assignments) 字段注释
-- ========================================
COMMENT ON TABLE agent_bot_assignments IS '代理商机器人分配表：管理代理商与Telegram机器人的关联关系';
COMMENT ON COLUMN agent_bot_assignments.id IS '分配记录唯一标识符（UUID）';
COMMENT ON COLUMN agent_bot_assignments.agent_user_id IS '代理商用户ID';
COMMENT ON COLUMN agent_bot_assignments.bot_id IS '关联的Telegram机器人ID';
COMMENT ON COLUMN agent_bot_assignments.assigned_at IS '分配时间';
COMMENT ON COLUMN agent_bot_assignments.assigned_by IS '执行分配操作的用户ID';
COMMENT ON COLUMN agent_bot_assignments.is_active IS '分配关系是否激活';

-- ========================================
-- 定价模式表 (pricing_modes) 字段注释补充
-- ========================================
COMMENT ON TABLE pricing_modes IS '定价模式表：定义能量闪租和笔数套餐的标准化配置模式';
COMMENT ON COLUMN pricing_modes.id IS '模式唯一标识符（UUID）';
COMMENT ON COLUMN pricing_modes.mode_type IS '模式类型：energy_flash=能量闪租，transaction_package=笔数套餐';
COMMENT ON COLUMN pricing_modes.config_schema IS '配置参数的JSON Schema定义，用于验证配置有效性';
COMMENT ON COLUMN pricing_modes.default_config IS '默认配置参数（JSON格式），提供标准化的初始配置';
COMMENT ON COLUMN pricing_modes.is_enabled IS '是否启用该定价模式';
COMMENT ON COLUMN pricing_modes.created_at IS '模式创建时间';
COMMENT ON COLUMN pricing_modes.updated_at IS '模式最后更新时间';

-- ========================================
-- 价格策略表 (pricing_strategies) 字段注释补充
-- ========================================
COMMENT ON TABLE pricing_strategies IS '价格策略表：统一管理能量闪租和笔数套餐的定价策略';
COMMENT ON COLUMN pricing_strategies.id IS '策略唯一标识符（UUID）';
COMMENT ON COLUMN pricing_strategies.name IS '策略名称，用于标识不同的定价策略';
COMMENT ON COLUMN pricing_strategies.type IS '策略类型：energy_flash=能量闪租，transaction_package=笔数套餐';
COMMENT ON COLUMN pricing_strategies.config IS '策略配置参数（JSON格式），包含具体的定价规则';
COMMENT ON COLUMN pricing_strategies.template_id IS '基于的定价模板ID，用于继承模板配置';
COMMENT ON COLUMN pricing_strategies.is_active IS '策略是否激活可用';
COMMENT ON COLUMN pricing_strategies.created_by IS '创建者用户ID';
COMMENT ON COLUMN pricing_strategies.created_at IS '策略创建时间';
COMMENT ON COLUMN pricing_strategies.updated_at IS '策略最后更新时间';

-- ========================================
-- 定价模板表 (pricing_templates) 字段注释补充
-- ========================================
COMMENT ON TABLE pricing_templates IS '定价模板表：提供可复用的标准化定价策略模板';
COMMENT ON COLUMN pricing_templates.id IS '模板唯一标识符（UUID）';
COMMENT ON COLUMN pricing_templates.name IS '模板名称，用于描述模板的用途和特点';
COMMENT ON COLUMN pricing_templates.type IS '模板类型：energy_flash=能量闪租，transaction_package=笔数套餐';
COMMENT ON COLUMN pricing_templates.default_config IS '默认配置参数（JSON格式），定义模板的标准配置';
COMMENT ON COLUMN pricing_templates.description IS '模板详细描述，说明适用场景和配置特点';
COMMENT ON COLUMN pricing_templates.is_system IS '是否为系统内置模板，系统模板不可删除';
COMMENT ON COLUMN pricing_templates.created_at IS '模板创建时间';

-- ========================================
-- 机器人定价配置表 (bot_pricing_configs) 字段注释补充
-- ========================================
COMMENT ON TABLE bot_pricing_configs IS '机器人定价配置表：关联Telegram机器人与价格策略，实现灵活的定价管理';
COMMENT ON COLUMN bot_pricing_configs.id IS '配置唯一标识符（UUID）';
COMMENT ON COLUMN bot_pricing_configs.bot_id IS '关联的Telegram机器人ID';
COMMENT ON COLUMN bot_pricing_configs.strategy_id IS '关联的价格策略ID';
COMMENT ON COLUMN bot_pricing_configs.mode_type IS '定价模式类型：energy_flash=能量闪租，transaction_package=笔数套餐';
COMMENT ON COLUMN bot_pricing_configs.is_active IS '是否激活该配置，只有激活的配置才会生效';
COMMENT ON COLUMN bot_pricing_configs.priority IS '优先级（数字越大优先级越高），用于处理多个配置的冲突';
COMMENT ON COLUMN bot_pricing_configs.effective_from IS '生效开始时间，配置在此时间后开始生效';
COMMENT ON COLUMN bot_pricing_configs.effective_until IS '生效结束时间（NULL表示永久有效）';
COMMENT ON COLUMN bot_pricing_configs.created_by IS '创建者用户ID';
COMMENT ON COLUMN bot_pricing_configs.created_at IS '配置创建时间';
COMMENT ON COLUMN bot_pricing_configs.updated_at IS '配置最后更新时间';

-- ========================================
-- 价格历史表 (pricing_history) 字段注释补充
-- ========================================
COMMENT ON TABLE pricing_history IS '价格历史表：记录价格策略的变更历史和审计日志，支持完整的变更追踪';
COMMENT ON COLUMN pricing_history.id IS '历史记录唯一标识符（UUID）';
COMMENT ON COLUMN pricing_history.strategy_id IS '关联的价格策略ID';
COMMENT ON COLUMN pricing_history.action_type IS '操作类型：CREATE=创建，UPDATE=更新，DELETE=删除，ACTIVATE=激活，DEACTIVATE=停用，CONFIG_CHANGE=配置变更，BOT_ASSIGN=机器人分配，BOT_UNASSIGN=机器人取消分配';
COMMENT ON COLUMN pricing_history.old_config IS '变更前的配置（JSON格式），记录变更前的完整状态';
COMMENT ON COLUMN pricing_history.new_config IS '变更后的配置（JSON格式），记录变更后的完整状态';
COMMENT ON COLUMN pricing_history.change_reason IS '变更原因说明，记录变更的目的和背景';
COMMENT ON COLUMN pricing_history.changed_fields IS '变更的字段列表，标识具体哪些字段发生了变化';
COMMENT ON COLUMN pricing_history.bot_id IS '关联的机器人ID（如果变更与特定机器人相关）';
COMMENT ON COLUMN pricing_history.effective_from IS '变更生效开始时间';
COMMENT ON COLUMN pricing_history.effective_until IS '变更生效结束时间';
COMMENT ON COLUMN pricing_history.created_by IS '操作者用户ID，记录谁执行了变更操作';
COMMENT ON COLUMN pricing_history.created_at IS '记录创建时间';

-- ========================================
-- 用户等级变更记录表 (user_level_changes) 字段注释补充
-- ========================================
COMMENT ON TABLE user_level_changes IS '用户等级变更记录表：追踪用户等级的变更历史，支持等级管理的审计需求';
COMMENT ON COLUMN user_level_changes.id IS '变更记录唯一标识符（UUID）';
COMMENT ON COLUMN user_level_changes.user_id IS '用户ID，关联telegram_users表';
COMMENT ON COLUMN user_level_changes.old_level IS '变更前等级，记录用户之前的等级状态';
COMMENT ON COLUMN user_level_changes.new_level IS '变更后等级，记录用户变更后的等级状态';
COMMENT ON COLUMN user_level_changes.change_reason IS '变更原因，说明等级变更的具体原因';
COMMENT ON COLUMN user_level_changes.changed_by IS '操作人ID，关联admins表，记录执行等级变更的管理员';
COMMENT ON COLUMN user_level_changes.change_type IS '变更类型：manual=手动变更，automatic=自动变更，system=系统变更';
COMMENT ON COLUMN user_level_changes.effective_date IS '生效时间，等级变更开始生效的时间点';
COMMENT ON COLUMN user_level_changes.created_at IS '记录创建时间';
COMMENT ON COLUMN user_level_changes.updated_at IS '记录最后更新时间';

-- ========================================
-- Telegram机器人表 (telegram_bots) 字段注释补充
-- ========================================
COMMENT ON TABLE telegram_bots IS 'Telegram机器人表：管理多个Telegram机器人实例，支持多机器人部署和配置';
COMMENT ON COLUMN telegram_bots.id IS '机器人唯一标识符（UUID）';
COMMENT ON COLUMN telegram_bots.bot_name IS '机器人显示名称，用于在管理界面中标识机器人';
COMMENT ON COLUMN telegram_bots.bot_token IS 'Telegram Bot API Token，用于与Telegram Bot API通信';
COMMENT ON COLUMN telegram_bots.bot_username IS '机器人用户名（@username），用于用户搜索和识别';
COMMENT ON COLUMN telegram_bots.description IS '机器人功能描述，说明机器人的主要功能和服务';
COMMENT ON COLUMN telegram_bots.is_active IS '是否激活该机器人，只有激活的机器人才能接收和处理消息';
COMMENT ON COLUMN telegram_bots.webhook_url IS 'Webhook URL，用于接收Telegram的更新通知';
COMMENT ON COLUMN telegram_bots.webhook_secret IS 'Webhook密钥，用于验证Webhook请求的安全性';
COMMENT ON COLUMN telegram_bots.max_connections IS '最大并发连接数，控制机器人的并发处理能力';
COMMENT ON COLUMN telegram_bots.allowed_updates IS '允许的更新类型数组，指定机器人需要处理的更新类型';
COMMENT ON COLUMN telegram_bots.drop_pending_updates IS '是否丢弃待处理的更新，用于机器人重启后的状态清理';
COMMENT ON COLUMN telegram_bots.config IS '机器人配置（JSON格式），存储机器人的个性化配置参数';
COMMENT ON COLUMN telegram_bots.stats IS '机器人统计信息（JSON格式），记录机器人的使用统计和性能指标';
COMMENT ON COLUMN telegram_bots.last_activity_at IS '最后活动时间，记录机器人最后一次处理消息的时间';
COMMENT ON COLUMN telegram_bots.created_by IS '创建者用户ID，记录谁创建了这个机器人';
COMMENT ON COLUMN telegram_bots.created_at IS '机器人创建时间';
COMMENT ON COLUMN telegram_bots.updated_at IS '机器人配置最后更新时间';

-- ========================================
-- 为现有表补充缺失的字段注释
-- ========================================

-- 为energy_pools表补充新增字段的注释
COMMENT ON COLUMN energy_pools.account_type IS '账户类型：own_energy=自有能量源，agent_energy=代理商能量源，third_party=第三方供应商';
COMMENT ON COLUMN energy_pools.priority IS '优先级，数字越大优先级越高，用于能量分配时的优先级排序';
COMMENT ON COLUMN energy_pools.is_enabled IS '是否启用该账户，禁用的账户不会参与能量分配';
COMMENT ON COLUMN energy_pools.cost_per_energy IS '每单位能量的成本（TRX），用于计算能量使用的成本';
COMMENT ON COLUMN energy_pools.description IS '账户描述信息，说明账户的用途和特点';
COMMENT ON COLUMN energy_pools.contact_info IS '联系信息（JSON格式），包含账户管理员的联系方式';
COMMENT ON COLUMN energy_pools.daily_limit IS '日消耗限制，控制账户每日的最大能量消耗量';
COMMENT ON COLUMN energy_pools.monthly_limit IS '月消耗限制，控制账户每月的最大能量消耗量';

-- 为users表补充可能缺失的字段注释
COMMENT ON COLUMN users.password_hash IS '用户密码哈希值，用于管理后台登录验证';
COMMENT ON COLUMN users.login_type IS '登录类型：telegram=仅Telegram登录，admin=仅管理后台登录，both=两种方式都支持';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间，记录用户最后一次成功登录的时间';
COMMENT ON COLUMN users.password_reset_token IS '密码重置令牌，用于密码重置功能';
COMMENT ON COLUMN users.password_reset_expires IS '密码重置令牌过期时间，确保令牌的安全性';

-- ========================================
-- 为视图和函数添加注释
-- ========================================

-- 为能量消耗统计视图添加注释
COMMENT ON VIEW daily_energy_consumption IS '每日能量消耗统计视图：提供按日期分组的能量消耗统计信息，支持成本分析和资源规划';

-- 为价格变更摘要视图添加注释
COMMENT ON VIEW pricing_change_summary IS '价格策略变更摘要视图：显示每个策略的变更统计信息，支持变更趋势分析和审计需求';

-- ========================================
-- 完成注释补充
-- ========================================
SELECT '所有缺失的中文注释已成功补充！' AS message;

-- 显示已添加注释的表数量统计
SELECT 
    '数据库表字段中文注释统计' AS summary,
    COUNT(DISTINCT table_name) AS total_tables,
    COUNT(*) AS total_columns_with_comments
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE c.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND c.column_name NOT LIKE '%_id' 
    AND c.column_name NOT IN ('id', 'created_at', 'updated_at')
    AND c.column_comment IS NOT NULL;
