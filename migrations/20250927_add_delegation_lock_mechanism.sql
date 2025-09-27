-- 添加代理锁机制防止重复代理
-- 创建时间: 2025-09-27
-- 说明: 在数据库层面防止订单的重复代理，确保首次只代理一笔

BEGIN;

-- 1. 为orders表添加代理锁字段
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delegation_lock_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delegation_lock_by VARCHAR(100);

-- 添加字段注释
COMMENT ON COLUMN orders.delegation_lock_time IS '代理锁定时间，防止并发重复代理';
COMMENT ON COLUMN orders.delegation_lock_by IS '代理锁定者标识（IP或进程ID）';

-- 2. 创建代理锁定函数
CREATE OR REPLACE FUNCTION acquire_delegation_lock(
    p_order_id UUID,
    p_lock_by VARCHAR(100) DEFAULT 'system',
    p_lock_timeout_seconds INTEGER DEFAULT 30
) RETURNS BOOLEAN AS $$
DECLARE
    v_lock_acquired BOOLEAN := FALSE;
BEGIN
    -- 尝试获取代理锁（原子性操作）
    UPDATE orders 
    SET 
        delegation_lock_time = NOW(),
        delegation_lock_by = p_lock_by,
        updated_at = NOW()
    WHERE id = p_order_id
      AND order_type = 'transaction_package'
      AND (
        delegation_lock_time IS NULL 
        OR delegation_lock_time < NOW() - INTERVAL '1 second' * p_lock_timeout_seconds
      )
      AND remaining_transactions > 0;
    
    -- 检查是否成功获取锁
    IF FOUND THEN
        v_lock_acquired := TRUE;
    END IF;
    
    RETURN v_lock_acquired;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建释放代理锁函数
CREATE OR REPLACE FUNCTION release_delegation_lock(
    p_order_id UUID,
    p_lock_by VARCHAR(100) DEFAULT 'system'
) RETURNS BOOLEAN AS $$
DECLARE
    v_lock_released BOOLEAN := FALSE;
BEGIN
    -- 释放代理锁
    UPDATE orders 
    SET 
        delegation_lock_time = NULL,
        delegation_lock_by = NULL,
        updated_at = NOW()
    WHERE id = p_order_id
      AND order_type = 'transaction_package'
      AND delegation_lock_by = p_lock_by;
    
    -- 检查是否成功释放锁
    IF FOUND THEN
        v_lock_released := TRUE;
    END IF;
    
    RETURN v_lock_released;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建自动清理过期锁的函数
CREATE OR REPLACE FUNCTION cleanup_expired_delegation_locks(
    p_timeout_seconds INTEGER DEFAULT 60
) RETURNS INTEGER AS $$
DECLARE
    v_cleaned_count INTEGER := 0;
BEGIN
    -- 清理过期的代理锁
    UPDATE orders 
    SET 
        delegation_lock_time = NULL,
        delegation_lock_by = NULL,
        updated_at = NOW()
    WHERE order_type = 'transaction_package'
      AND delegation_lock_time IS NOT NULL
      AND delegation_lock_time < NOW() - INTERVAL '1 second' * p_timeout_seconds;
    
    GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
    
    RETURN v_cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建索引优化锁查询性能
CREATE INDEX IF NOT EXISTS idx_orders_delegation_lock 
ON orders(order_type, delegation_lock_time) 
WHERE order_type = 'transaction_package';

-- 6. 添加函数注释
COMMENT ON FUNCTION acquire_delegation_lock(UUID, VARCHAR(100), INTEGER) 
IS '获取订单代理锁，防止并发重复代理';

COMMENT ON FUNCTION release_delegation_lock(UUID, VARCHAR(100)) 
IS '释放订单代理锁';

COMMENT ON FUNCTION cleanup_expired_delegation_locks(INTEGER) 
IS '清理过期的代理锁';

COMMIT;
