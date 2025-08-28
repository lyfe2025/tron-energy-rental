-- 修复 system_configs 表的外键约束问题
-- 让 updated_by 字段可以引用 admins 表

-- 1. 删除现有的外键约束
ALTER TABLE system_configs DROP CONSTRAINT IF EXISTS system_configs_updated_by_fkey;
ALTER TABLE system_configs DROP CONSTRAINT IF EXISTS system_configs_created_by_fkey;

-- 2. 创建新的外键约束，支持引用 admins 表
-- 注意：PostgreSQL 不支持一个字段引用多个表，所以我们需要创建一个函数来验证

-- 创建验证函数
CREATE OR REPLACE FUNCTION validate_user_reference()
RETURNS TRIGGER AS $$
BEGIN
  -- 检查 updated_by 是否存在于 telegram_users 或 admins 表中
  IF NEW.updated_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM telegram_users WHERE id = NEW.updated_by
      UNION
      SELECT 1 FROM admins WHERE id = NEW.updated_by
    ) THEN
      RAISE EXCEPTION 'updated_by 必须引用有效的用户ID (telegram_users 或 admins)';
    END IF;
  END IF;
  
  -- 检查 created_by 是否存在于 telegram_users 或 admins 表中
  IF NEW.created_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM telegram_users WHERE id = NEW.created_by
      UNION
      SELECT 1 FROM admins WHERE id = NEW.created_by
    ) THEN
      RAISE EXCEPTION 'created_by 必须引用有效的用户ID (telegram_users 或 admins)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建触发器来执行验证
DROP TRIGGER IF EXISTS validate_system_configs_user_reference ON system_configs;
CREATE TRIGGER validate_system_configs_user_reference
  BEFORE INSERT OR UPDATE ON system_configs
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_reference();

-- 4. 添加注释说明
COMMENT ON FUNCTION validate_user_reference() IS '验证 system_configs 表的用户引用，支持 telegram_users 和 admins 表';
COMMENT ON TRIGGER validate_system_configs_user_reference ON system_configs IS '在插入或更新时验证用户引用';
