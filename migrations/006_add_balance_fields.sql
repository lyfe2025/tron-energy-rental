-- 添加USDT和TRX余额字段到users表
-- 创建时间: 2025-01-28
-- 描述: 为用户表添加分离的USDT和TRX余额字段，保持向后兼容性

-- 添加新的余额字段
ALTER TABLE users 
ADD COLUMN usdt_balance DECIMAL(20, 8) DEFAULT 0.00000000 NOT NULL,
ADD COLUMN trx_balance DECIMAL(20, 8) DEFAULT 0.00000000 NOT NULL;

-- 将现有的balance字段数据迁移到trx_balance
-- 假设现有的balance主要是TRX余额
UPDATE users SET trx_balance = balance WHERE balance > 0;

-- 添加字段注释
COMMENT ON COLUMN users.usdt_balance IS 'USDT余额，精确到8位小数';
COMMENT ON COLUMN users.trx_balance IS 'TRX余额，精确到8位小数';

-- 添加索引以提高查询性能
CREATE INDEX idx_users_usdt_balance ON users(usdt_balance);
CREATE INDEX idx_users_trx_balance ON users(trx_balance);

-- 添加约束确保余额不为负数
ALTER TABLE users ADD CONSTRAINT check_usdt_balance_non_negative CHECK (usdt_balance >= 0);
ALTER TABLE users ADD CONSTRAINT check_trx_balance_non_negative CHECK (trx_balance >= 0);