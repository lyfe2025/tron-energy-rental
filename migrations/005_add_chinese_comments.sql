-- 为所有数据库表字段添加中文注释
-- Migration: 005_add_chinese_comments.sql
-- Created: 2024-01-16
-- Description: 为所有表的字段添加中文注释，提升数据库可读性

-- ========================================
-- 用户表 (users) 字段注释
-- ========================================
COMMENT ON TABLE users IS '用户信息表，存储系统所有用户的基本信息';
COMMENT ON COLUMN users.id IS '用户唯一标识符（UUID）';
COMMENT ON COLUMN users.telegram_id IS 'Telegram用户ID，用于Telegram登录';
COMMENT ON COLUMN users.username IS '用户名，用于显示和登录';
COMMENT ON COLUMN users.first_name IS '用户名字';
COMMENT ON COLUMN users.last_name IS '用户姓氏';
COMMENT ON COLUMN users.email IS '用户邮箱地址，用于管理后台登录';
COMMENT ON COLUMN users.phone IS '用户手机号码';
COMMENT ON COLUMN users.role IS '用户角色：user=普通用户，agent=代理用户，admin=管理员';
COMMENT ON COLUMN users.status IS '用户状态：active=活跃，inactive=非活跃，banned=已封禁';
COMMENT ON COLUMN users.tron_address IS '用户TRON钱包地址';
COMMENT ON COLUMN users.balance IS '用户账户余额（TRX）';
COMMENT ON COLUMN users.total_orders IS '用户总订单数量';
COMMENT ON COLUMN users.total_energy_used IS '用户累计使用的能量数量';
COMMENT ON COLUMN users.referral_code IS '用户推荐码，用于推荐系统';
COMMENT ON COLUMN users.referred_by IS '推荐人用户ID';
COMMENT ON COLUMN users.password_hash IS '用户密码哈希值，用于管理后台登录';
COMMENT ON COLUMN users.login_type IS '登录类型：telegram=仅Telegram登录，admin=仅管理后台登录，both=两种方式都支持';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN users.password_reset_token IS '密码重置令牌';
COMMENT ON COLUMN users.password_reset_expires IS '密码重置令牌过期时间';
COMMENT ON COLUMN users.created_at IS '用户创建时间';
COMMENT ON COLUMN users.updated_at IS '用户信息最后更新时间';

-- ========================================
-- 能量包表 (energy_packages) 字段注释
-- ========================================
COMMENT ON TABLE energy_packages IS '能量包配置表，定义可购买的能量套餐';
COMMENT ON COLUMN energy_packages.id IS '能量包唯一标识符（UUID）';
COMMENT ON COLUMN energy_packages.name IS '能量包名称';
COMMENT ON COLUMN energy_packages.description IS '能量包详细描述';
COMMENT ON COLUMN energy_packages.energy_amount IS '能量包包含的能量数量';
COMMENT ON COLUMN energy_packages.price IS '能量包价格（TRX）';
COMMENT ON COLUMN energy_packages.duration_hours IS '能量包有效期（小时）';
COMMENT ON COLUMN energy_packages.is_active IS '能量包是否激活可用';
COMMENT ON COLUMN energy_packages.created_at IS '能量包创建时间';
COMMENT ON COLUMN energy_packages.updated_at IS '能量包最后更新时间';

-- ========================================
-- Telegram机器人表 (bots) 字段注释
-- ========================================
COMMENT ON TABLE bots IS 'Telegram机器人配置表，管理系统的机器人实例';
COMMENT ON COLUMN bots.id IS '机器人唯一标识符（UUID）';
COMMENT ON COLUMN bots.name IS '机器人显示名称';
COMMENT ON COLUMN bots.username IS '机器人用户名（@username）';
COMMENT ON COLUMN bots.token IS '机器人API令牌，用于Telegram Bot API';
COMMENT ON COLUMN bots.description IS '机器人功能描述';
COMMENT ON COLUMN bots.status IS '机器人状态：active=活跃，inactive=非活跃，maintenance=维护中';
COMMENT ON COLUMN bots.webhook_url IS '机器人Webhook回调地址';
COMMENT ON COLUMN bots.settings IS '机器人配置设置（JSON格式）';
COMMENT ON COLUMN bots.total_users IS '机器人总用户数量';
COMMENT ON COLUMN bots.total_orders IS '机器人总订单数量';
COMMENT ON COLUMN bots.created_at IS '机器人创建时间';
COMMENT ON COLUMN bots.updated_at IS '机器人配置最后更新时间';

-- ========================================
-- 订单表 (orders) 字段注释
-- ========================================
COMMENT ON TABLE orders IS '订单信息表，记录所有能量租赁订单';
COMMENT ON COLUMN orders.id IS '订单唯一标识符（UUID）';
COMMENT ON COLUMN orders.order_number IS '订单编号，用于用户查询和系统追踪';
COMMENT ON COLUMN orders.user_id IS '下单用户ID';
COMMENT ON COLUMN orders.bot_id IS '处理订单的机器人ID';
COMMENT ON COLUMN orders.package_id IS '购买的能量包ID';
COMMENT ON COLUMN orders.energy_amount IS '订单能量数量';
COMMENT ON COLUMN orders.price IS '订单价格（TRX）';
COMMENT ON COLUMN orders.commission_rate IS '佣金比例（0-1之间的小数）';
COMMENT ON COLUMN orders.commission_amount IS '佣金金额（TRX）';
COMMENT ON COLUMN orders.status IS '订单状态：pending=待处理，processing=处理中，completed=已完成，failed=失败，cancelled=已取消，refunded=已退款';
COMMENT ON COLUMN orders.payment_status IS '支付状态：unpaid=未支付，paid=已支付，refunded=已退款';
COMMENT ON COLUMN orders.tron_tx_hash IS '用户支付TRX的交易哈希';
COMMENT ON COLUMN orders.delegate_tx_hash IS '能量委托交易哈希';
COMMENT ON COLUMN orders.target_address IS '目标TRON地址，能量将被委托到此地址';
COMMENT ON COLUMN orders.expires_at IS '订单过期时间';
COMMENT ON COLUMN orders.completed_at IS '订单完成时间';
COMMENT ON COLUMN orders.created_at IS '订单创建时间';
COMMENT ON COLUMN orders.updated_at IS '订单最后更新时间';

-- ========================================
-- 代理表 (agents) 字段注释
-- ========================================
COMMENT ON TABLE agents IS '代理用户表，管理系统的代理用户信息';
COMMENT ON COLUMN agents.id IS '代理记录唯一标识符（UUID）';
COMMENT ON COLUMN agents.user_id IS '代理用户ID';
COMMENT ON COLUMN agents.agent_code IS '代理代码，用于标识代理身份';
COMMENT ON COLUMN agents.commission_rate IS '代理佣金比例（0-1之间的小数）';
COMMENT ON COLUMN agents.status IS '代理状态：pending=待审核，active=活跃，inactive=非活跃，suspended=已暂停';
COMMENT ON COLUMN agents.total_earnings IS '代理累计收益（TRX）';
COMMENT ON COLUMN agents.total_orders IS '代理累计订单数量';
COMMENT ON COLUMN agents.total_customers IS '代理累计客户数量';
COMMENT ON COLUMN agents.approved_at IS '代理审核通过时间';
COMMENT ON COLUMN agents.approved_by IS '审核人用户ID';
COMMENT ON COLUMN agents.created_at IS '代理申请创建时间';
COMMENT ON COLUMN agents.updated_at IS '代理信息最后更新时间';

-- ========================================
-- 代理申请表 (agent_applications) 字段注释
-- ========================================
COMMENT ON TABLE agent_applications IS '代理申请表，记录用户申请成为代理的信息';
COMMENT ON COLUMN agent_applications.id IS '申请记录唯一标识符（UUID）';
COMMENT ON COLUMN agent_applications.user_id IS '申请用户ID';
COMMENT ON COLUMN agent_applications.application_reason IS '申请成为代理的原因';
COMMENT ON COLUMN agent_applications.contact_info IS '联系信息（JSON格式）';
COMMENT ON COLUMN agent_applications.experience_description IS '相关经验描述';
COMMENT ON COLUMN agent_applications.status IS '申请状态：pending=待审核，approved=已通过，rejected=已拒绝';
COMMENT ON COLUMN agent_applications.reviewed_by IS '审核人用户ID';
COMMENT ON COLUMN agent_applications.reviewed_at IS '审核时间';
COMMENT ON COLUMN agent_applications.review_notes IS '审核备注';
COMMENT ON COLUMN agent_applications.created_at IS '申请创建时间';
COMMENT ON COLUMN agent_applications.updated_at IS '申请最后更新时间';

-- ========================================
-- 代理收益表 (agent_earnings) 字段注释
-- ========================================
COMMENT ON TABLE agent_earnings IS '代理收益记录表，记录代理从订单中获得的佣金';
COMMENT ON COLUMN agent_earnings.id IS '收益记录唯一标识符（UUID）';
COMMENT ON COLUMN agent_earnings.agent_id IS '代理用户ID';
COMMENT ON COLUMN agent_earnings.order_id IS '关联订单ID';
COMMENT ON COLUMN agent_earnings.user_id IS '下单用户ID';
COMMENT ON COLUMN agent_earnings.commission_rate IS '佣金比例（0-1之间的小数）';
COMMENT ON COLUMN agent_earnings.commission_amount IS '佣金金额（TRX）';
COMMENT ON COLUMN agent_earnings.order_amount IS '订单金额（TRX）';
COMMENT ON COLUMN agent_earnings.status IS '收益状态：pending=待结算，paid=已结算，cancelled=已取消';
COMMENT ON COLUMN agent_earnings.paid_at IS '结算时间';
COMMENT ON COLUMN agent_earnings.created_at IS '收益记录创建时间';
COMMENT ON COLUMN agent_earnings.updated_at IS '收益记录最后更新时间';

-- ========================================
-- 机器人用户表 (bot_users) 字段注释
-- ========================================
COMMENT ON TABLE bot_users IS '机器人用户关联表，记录用户与机器人的交互关系';
COMMENT ON COLUMN bot_users.id IS '关联记录唯一标识符（UUID）';
COMMENT ON COLUMN bot_users.bot_id IS '机器人ID';
COMMENT ON COLUMN bot_users.user_id IS '用户ID';
COMMENT ON COLUMN bot_users.telegram_chat_id IS 'Telegram聊天ID';
COMMENT ON COLUMN bot_users.status IS '用户状态：active=活跃，blocked=已屏蔽，inactive=非活跃';
COMMENT ON COLUMN bot_users.last_interaction_at IS '最后交互时间';
COMMENT ON COLUMN bot_users.settings IS '用户个性化设置（JSON格式）';
COMMENT ON COLUMN bot_users.created_at IS '关联记录创建时间';
COMMENT ON COLUMN bot_users.updated_at IS '关联记录最后更新时间';

-- ========================================
-- 能量池表 (energy_pools) 字段注释
-- ========================================
COMMENT ON TABLE energy_pools IS '能量池管理表，管理系统的能量资源';
COMMENT ON COLUMN energy_pools.id IS '能量池唯一标识符（UUID）';
COMMENT ON COLUMN energy_pools.name IS '能量池名称';
COMMENT ON COLUMN energy_pools.tron_address IS '能量池TRON地址';
COMMENT ON COLUMN energy_pools.private_key_encrypted IS '加密的私钥（用于能量委托）';
COMMENT ON COLUMN energy_pools.total_energy IS '能量池总能量数量';
COMMENT ON COLUMN energy_pools.available_energy IS '可用能量数量';
COMMENT ON COLUMN energy_pools.reserved_energy IS '预留能量数量';
COMMENT ON COLUMN energy_pools.status IS '能量池状态：active=活跃，inactive=非活跃，maintenance=维护中';
COMMENT ON COLUMN energy_pools.last_updated_at IS '最后更新时间';
COMMENT ON COLUMN energy_pools.created_at IS '能量池创建时间';
COMMENT ON COLUMN energy_pools.updated_at IS '能量池最后更新时间';

-- ========================================
-- 能量交易表 (energy_transactions) 字段注释
-- ========================================
COMMENT ON TABLE energy_transactions IS '能量交易记录表，记录所有能量委托交易';
COMMENT ON COLUMN energy_transactions.id IS '交易记录唯一标识符（UUID）';
COMMENT ON COLUMN energy_transactions.order_id IS '关联订单ID';
COMMENT ON COLUMN energy_transactions.pool_id IS '能量池ID';
COMMENT ON COLUMN energy_transactions.from_address IS '发送方地址（能量池地址）';
COMMENT ON COLUMN energy_transactions.to_address IS '接收方地址（用户地址）';
COMMENT ON COLUMN energy_transactions.energy_amount IS '交易能量数量';
COMMENT ON COLUMN energy_transactions.tx_hash IS '交易哈希';
COMMENT ON COLUMN energy_transactions.status IS '交易状态：pending=待确认，confirmed=已确认，failed=失败';
COMMENT ON COLUMN energy_transactions.block_number IS '交易所在区块号';
COMMENT ON COLUMN energy_transactions.gas_used IS '交易消耗的gas';
COMMENT ON COLUMN energy_transactions.created_at IS '交易记录创建时间';
COMMENT ON COLUMN energy_transactions.updated_at IS '交易记录最后更新时间';

-- ========================================
-- 价格配置表 (price_configs) 字段注释
-- ========================================
COMMENT ON TABLE price_configs IS '价格配置表，管理不同机器人的定价策略';
COMMENT ON COLUMN price_configs.id IS '价格配置唯一标识符（UUID）';
COMMENT ON COLUMN price_configs.bot_id IS '机器人ID';
COMMENT ON COLUMN price_configs.config_name IS '配置名称';
COMMENT ON COLUMN price_configs.config_type IS '配置类型：energy_flash=能量闪租，transaction_package=笔数套餐';
COMMENT ON COLUMN price_configs.base_price IS '基础价格（TRX）';
COMMENT ON COLUMN price_configs.price_per_unit IS '单位价格（TRX/单位）';
COMMENT ON COLUMN price_configs.min_amount IS '最小数量限制';
COMMENT ON COLUMN price_configs.max_amount IS '最大数量限制';
COMMENT ON COLUMN price_configs.duration_hours IS '有效期（小时）';
COMMENT ON COLUMN price_configs.is_active IS '配置是否激活';
COMMENT ON COLUMN price_configs.effective_from IS '生效开始时间';
COMMENT ON COLUMN price_configs.effective_until IS '生效结束时间';
COMMENT ON COLUMN price_configs.created_by IS '创建人用户ID';
COMMENT ON COLUMN price_configs.created_at IS '配置创建时间';
COMMENT ON COLUMN price_configs.updated_at IS '配置最后更新时间';

-- ========================================
-- 价格模板表 (price_templates) 字段注释
-- ========================================
COMMENT ON TABLE price_templates IS '价格模板表，提供可复用的定价策略模板';
COMMENT ON COLUMN price_templates.id IS '模板唯一标识符（UUID）';
COMMENT ON COLUMN price_templates.template_name IS '模板名称';
COMMENT ON COLUMN price_templates.description IS '模板描述';
COMMENT ON COLUMN price_templates.config_data IS '模板配置数据（JSON格式）';
COMMENT ON COLUMN price_templates.is_default IS '是否为默认模板';
COMMENT ON COLUMN price_templates.created_by IS '创建人用户ID';
COMMENT ON COLUMN price_templates.created_at IS '模板创建时间';
COMMENT ON COLUMN price_templates.updated_at IS '模板最后更新时间';

-- ========================================
-- 价格历史表 (price_history) 字段注释
-- ========================================
COMMENT ON TABLE price_history IS '价格变更历史表，记录价格配置的变更记录';
COMMENT ON COLUMN price_history.id IS '历史记录唯一标识符（UUID）';
COMMENT ON COLUMN price_history.config_id IS '价格配置ID';
COMMENT ON COLUMN price_history.old_price IS '变更前价格';
COMMENT ON COLUMN price_history.new_price IS '变更后价格';
COMMENT ON COLUMN price_history.change_reason IS '变更原因';
COMMENT ON COLUMN price_history.changed_by IS '变更人用户ID';
COMMENT ON COLUMN price_history.created_at IS '变更记录创建时间';

-- ========================================
-- 系统配置表 (system_configs) 字段注释
-- ========================================
COMMENT ON TABLE system_configs IS '系统配置表，存储系统参数配置、功能开关等';
COMMENT ON COLUMN system_configs.id IS '配置项唯一标识符（UUID）';
COMMENT ON COLUMN system_configs.config_key IS '配置键名';
COMMENT ON COLUMN system_configs.config_value IS '配置值';
COMMENT ON COLUMN system_configs.config_type IS '配置类型：string=字符串，number=数字，boolean=布尔值，json=JSON对象，array=数组';
COMMENT ON COLUMN system_configs.category IS '配置分类';
COMMENT ON COLUMN system_configs.description IS '配置项描述';
COMMENT ON COLUMN system_configs.is_public IS '是否为公开配置';
COMMENT ON COLUMN system_configs.is_editable IS '是否可编辑';
COMMENT ON COLUMN system_configs.validation_rules IS '验证规则（JSON格式）';
COMMENT ON COLUMN system_configs.default_value IS '默认值';
COMMENT ON COLUMN system_configs.created_by IS '创建人用户ID';
COMMENT ON COLUMN system_configs.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN system_configs.created_at IS '配置创建时间';
COMMENT ON COLUMN system_configs.updated_at IS '配置最后更新时间';

-- ========================================
-- 系统配置历史表 (system_config_history) 字段注释
-- ========================================
COMMENT ON TABLE system_config_history IS '系统配置变更历史表，记录配置的变更记录';
COMMENT ON COLUMN system_config_history.id IS '历史记录唯一标识符（UUID）';
COMMENT ON COLUMN system_config_history.config_id IS '配置项ID';
COMMENT ON COLUMN system_config_history.old_value IS '变更前值';
COMMENT ON COLUMN system_config_history.new_value IS '变更后值';
COMMENT ON COLUMN system_config_history.change_reason IS '变更原因';
COMMENT ON COLUMN system_config_history.changed_by IS '变更人用户ID';
COMMENT ON COLUMN system_config_history.created_at IS '变更记录创建时间';

-- ========================================
-- 表级别注释
-- ========================================
COMMENT ON TABLE users IS '用户信息表 - 存储系统所有用户的基本信息、认证信息和业务数据';
COMMENT ON TABLE energy_packages IS '能量包配置表 - 定义可购买的能量套餐规格和价格';
COMMENT ON TABLE bots IS 'Telegram机器人配置表 - 管理系统的机器人实例和配置';
COMMENT ON TABLE orders IS '订单信息表 - 记录所有能量租赁订单的完整生命周期';
COMMENT ON TABLE agents IS '代理用户表 - 管理系统的代理用户信息和收益统计';
COMMENT ON TABLE agent_applications IS '代理申请表 - 记录用户申请成为代理的详细信息';
COMMENT ON TABLE agent_earnings IS '代理收益记录表 - 记录代理从订单中获得的佣金明细';
COMMENT ON TABLE bot_users IS '机器人用户关联表 - 管理用户与机器人的交互关系和个性化设置';
COMMENT ON TABLE energy_pools IS '能量池管理表 - 管理系统的能量资源分配和状态';
COMMENT ON TABLE energy_transactions IS '能量交易记录表 - 记录所有能量委托交易的区块链信息';
COMMENT ON TABLE price_configs IS '价格配置表 - 管理不同机器人的灵活定价策略';
COMMENT ON TABLE price_templates IS '价格模板表 - 提供可复用的标准化定价策略模板';
COMMENT ON TABLE price_history IS '价格变更历史表 - 追踪价格配置的变更历史和原因';
COMMENT ON TABLE system_configs IS '系统配置表 - 集中管理系统参数、功能开关和业务规则';
COMMENT ON TABLE system_config_history IS '系统配置变更历史表 - 记录配置变更的审计轨迹';

-- 完成注释添加
SELECT '所有表字段中文注释已成功添加！' AS message;
