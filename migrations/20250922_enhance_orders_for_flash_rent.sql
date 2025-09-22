-- 增强订单表以更好支持能量闪租业务
-- 创建时间: 2025-09-22
-- 说明: 为订单表添加闪租业务必需的字段，提升业务追踪和错误处理能力

BEGIN;

-- 添加闪租业务专用字段
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS source_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS flash_rent_duration INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS energy_pool_account_used VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS processing_details JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delegation_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 添加字段注释
COMMENT ON COLUMN orders.source_address IS '支付来源地址（闪租场景下的付款地址）';
COMMENT ON COLUMN orders.flash_rent_duration IS '闪租持续时间（小时）';
COMMENT ON COLUMN orders.energy_pool_account_used IS '使用的能量池账户地址';
COMMENT ON COLUMN orders.error_message IS '详细错误信息';
COMMENT ON COLUMN orders.processing_details IS '处理过程详细信息（JSON格式）';
COMMENT ON COLUMN orders.retry_count IS '重试次数';
COMMENT ON COLUMN orders.processing_started_at IS '处理开始时间';
COMMENT ON COLUMN orders.delegation_started_at IS '代理开始时间';

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_orders_source_address ON orders(source_address);
CREATE INDEX IF NOT EXISTS idx_orders_flash_rent_duration ON orders(flash_rent_duration);
CREATE INDEX IF NOT EXISTS idx_orders_energy_pool_account_used ON orders(energy_pool_account_used);
CREATE INDEX IF NOT EXISTS idx_orders_retry_count ON orders(retry_count);
CREATE INDEX IF NOT EXISTS idx_orders_processing_started_at ON orders(processing_started_at);
CREATE INDEX IF NOT EXISTS idx_orders_delegation_started_at ON orders(delegation_started_at);

-- 为error_message创建部分索引（只索引有错误的记录）
CREATE INDEX IF NOT EXISTS idx_orders_error_message_exists ON orders(error_message) 
WHERE error_message IS NOT NULL;

-- 为processing_details创建GIN索引以支持JSON查询
CREATE INDEX IF NOT EXISTS idx_orders_processing_details_gin ON orders 
USING gin(processing_details) WHERE processing_details IS NOT NULL;

-- 添加约束以确保数据完整性
ALTER TABLE orders 
ADD CONSTRAINT chk_flash_rent_duration_positive 
CHECK (flash_rent_duration IS NULL OR flash_rent_duration > 0);

ALTER TABLE orders 
ADD CONSTRAINT chk_retry_count_non_negative 
CHECK (retry_count >= 0);

-- 创建复合索引以优化闪租订单查询
CREATE INDEX IF NOT EXISTS idx_orders_flash_rent_lookup 
ON orders(order_type, status, source_address, created_at) 
WHERE order_type = 'FLASH_RENT';

-- 为闪租订单的时间范围查询创建索引
CREATE INDEX IF NOT EXISTS idx_orders_flash_rent_timeline 
ON orders(order_type, processing_started_at, delegation_started_at, completed_at) 
WHERE order_type = 'FLASH_RENT';

COMMIT;

-- 验证新字段是否添加成功
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'orders' 
-- AND column_name IN ('source_address', 'flash_rent_duration', 'energy_pool_account_used', 
--                     'error_message', 'processing_details', 'retry_count', 
--                     'processing_started_at', 'delegation_started_at');
