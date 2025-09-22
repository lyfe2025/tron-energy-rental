-- ================================================================
-- Orders表完整字段注释文档
-- 创建时间: 2025-09-22
-- 用途: 完整记录orders表所有字段的业务含义和使用说明
-- 维护: 当字段发生变更时，请同步更新此文档
-- ================================================================

-- Orders表基本信息
COMMENT ON TABLE orders IS '订单表，存储用户的能量租赁订单信息';

-- ================================================================
-- 基础标识字段
-- ================================================================
COMMENT ON COLUMN orders.id IS '订单唯一标识符';
COMMENT ON COLUMN orders.order_number IS '订单编号，用于用户查询和系统追踪';

-- ================================================================
-- 关联关系字段
-- ================================================================
COMMENT ON COLUMN orders.user_id IS '用户ID，关联users表';
COMMENT ON COLUMN orders.bot_id IS '处理订单的机器人ID';
COMMENT ON COLUMN orders.network_id IS 'TRON网络ID，关联tron_networks表，标识订单使用的区块链网络';
COMMENT ON COLUMN orders.price_config_id IS '关联的价格配置ID，指向price_configs表';

-- ================================================================
-- 订单基本信息
-- ================================================================
COMMENT ON COLUMN orders.order_type IS '订单类型：energy_flash-能量闪租，transaction_package-笔数套餐，trx_exchange-TRX闪兑';
COMMENT ON COLUMN orders.energy_amount IS '能量数量';
COMMENT ON COLUMN orders.price IS '订单价格（TRX）';
COMMENT ON COLUMN orders.target_address IS '目标TRON地址，能量将被委托到此地址';

-- ================================================================
-- 支付相关字段
-- ================================================================
COMMENT ON COLUMN orders.payment_status IS '支付状态：unpaid-未支付，paid-已支付，refunded-已退款';
COMMENT ON COLUMN orders.payment_trx_amount IS '用户实际支付的TRX数量（精确到6位小数）';
COMMENT ON COLUMN orders.tron_tx_hash IS '用户支付TRX的交易哈希';
COMMENT ON COLUMN orders.source_address IS '支付来源地址（闪租场景下的付款地址）';

-- ================================================================
-- 佣金相关字段
-- ================================================================
COMMENT ON COLUMN orders.commission_rate IS '佣金比例（0-1之间的小数）';
COMMENT ON COLUMN orders.commission_amount IS '佣金金额（TRX）';

-- ================================================================
-- 订单状态字段
-- ================================================================
COMMENT ON COLUMN orders.status IS '订单状态：pending-待处理，processing-处理中，completed-已完成，failed-失败，cancelled-已取消，refunded-已退款，pending_delegation-待委托';

-- ================================================================
-- 能量委托相关字段
-- ================================================================
COMMENT ON COLUMN orders.delegate_tx_hash IS '能量委托交易哈希';
COMMENT ON COLUMN orders.delegated_energy_amount IS '实际委托给用户的能量数量（单位：sun）';
COMMENT ON COLUMN orders.delegation_tx_id IS '能量委托交易的唯一标识符';
COMMENT ON COLUMN orders.energy_pool_account_used IS '使用的能量池账户地址';

-- ================================================================
-- 时间相关字段
-- ================================================================
COMMENT ON COLUMN orders.created_at IS '创建时间';
COMMENT ON COLUMN orders.updated_at IS '更新时间';
COMMENT ON COLUMN orders.expires_at IS '订单过期时间';
COMMENT ON COLUMN orders.completed_at IS '订单完成时间';
COMMENT ON COLUMN orders.processing_started_at IS '订单处理开始时间';
COMMENT ON COLUMN orders.delegation_started_at IS '委托开始时间';

-- ================================================================
-- 闪租专用字段
-- ================================================================
COMMENT ON COLUMN orders.flash_rent_duration IS '闪租持续时间（小时）';

-- ================================================================
-- 系统处理字段
-- ================================================================
COMMENT ON COLUMN orders.calculated_units IS '计算得出的处理单位数量，用于定价和资源分配';
COMMENT ON COLUMN orders.error_message IS '详细错误信息';
COMMENT ON COLUMN orders.processing_details IS '处理过程详细信息（JSON格式）';
COMMENT ON COLUMN orders.retry_count IS '重试次数';

-- ================================================================
-- 字段约束说明
-- ================================================================
/*
主要约束：
1. orders_status_check: status字段只能是指定的7种状态值
2. orders_payment_status_check: payment_status字段只能是指定的3种状态值  
3. orders_order_type_check: order_type字段只能是energy_flash、transaction_package或trx_exchange

外键约束：
1. fk_orders_price_config: price_config_id → price_configs.id
2. orders_user_id_fkey: user_id → users.id
3. orders_bot_id_fkey: bot_id → telegram_bots.id
4. orders_network_id_fkey: network_id → tron_networks.id

索引：
1. idx_orders_price_config_id: 优化价格配置查询
2. idx_orders_order_type_network_id: 优化订单类型和网络查询
3. idx_orders_status_created_at: 优化状态和时间筛选
*/

-- ================================================================
-- 业务流程说明
-- ================================================================
/*
订单生命周期：
1. 创建 (created_at) → 待处理 (status: pending)
2. 开始处理 (processing_started_at) → 处理中 (status: processing)  
3. 支付确认 (tron_tx_hash) → 已支付 (payment_status: paid)
4. 开始委托 (delegation_started_at) → 待委托 (status: pending_delegation)
5. 委托完成 (delegate_tx_hash) → 已完成 (status: completed, completed_at)

时间字段关系：
created_at < processing_started_at < delegation_started_at < completed_at

不同订单类型特点：

能量闪租订单 (energy_flash)：
- order_type = 'energy_flash'
- 有source_address（付款地址）
- 有flash_rent_duration（持续时间）
- payment_status创建时就是'paid'

笔数套餐订单 (transaction_package)：
- order_type = 'transaction_package'
- 标准的订单处理流程
- 通过price_config_id关联对应的套餐配置

TRX闪兑订单 (trx_exchange)：
- order_type = 'trx_exchange'
- 快速TRX兑换服务
- 通过price_config_id关联对应的闪兑配置
*/
