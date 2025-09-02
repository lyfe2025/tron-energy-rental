-- 添加name和phone字段到admins表
-- 创建时间: 2025-01-02
-- 描述: 为管理员表添加真实姓名和手机号字段，支持新增管理员功能

BEGIN;

-- 添加name字段（真实姓名）
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS name VARCHAR(50);

-- 添加phone字段（手机号）
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 为phone字段添加索引，方便查询
CREATE INDEX IF NOT EXISTS idx_admins_phone ON admins(phone);

-- 添加phone字段的唯一约束（允许NULL）
ALTER TABLE admins 
ADD CONSTRAINT admins_phone_unique UNIQUE (phone);

COMMIT;

-- 验证字段是否添加成功
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'admins' AND column_name IN ('name', 'phone');