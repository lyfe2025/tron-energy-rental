-- 修复 system_config_history 表的外键约束问题
-- 让 changed_by 字段可以引用 admins 表

-- 1. 删除现有的外键约束
ALTER TABLE system_config_history DROP CONSTRAINT IF EXISTS system_config_history_changed_by_fkey;

-- 2. 创建验证函数（如果不存在）
CREATE OR REPLACE FUNCTION validate_history_user_reference()
RETURNS TRIGGER AS $$
BEGIN
  -- 检查 changed_by 是否存在于 telegram_users 或 admins 表中
  IF NEW.changed_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM telegram_users WHERE id = NEW.changed_by
      UNION
      SELECT 1 FROM admins WHERE id = NEW.changed_by
    ) THEN
      RAISE EXCEPTION 'changed_by 必须引用有效的用户ID (telegram_users 或 admins)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建触发器来执行验证
DROP TRIGGER IF EXISTS validate_system_config_history_user_reference ON system_config_history;
CREATE TRIGGER validate_system_config_history_user_reference
  BEFORE INSERT OR UPDATE ON system_config_history
  FOR EACH ROW
  EXECUTE FUNCTION validate_history_user_reference();

-- 4. 添加注释说明
COMMENT ON FUNCTION validate_history_user_reference() IS '验证 system_config_history 表的用户引用，支持 telegram_users 和 admins 表';
COMMENT ON TRIGGER validate_system_config_history_user_reference ON system_config_history IS '在插入或更新时验证用户引用';
