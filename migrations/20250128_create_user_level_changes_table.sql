-- 创建用户等级变更记录表
-- Migration: 20250128_create_user_level_changes_table.sql
-- Created: 2025-01-28
-- Description: 创建用户等级变更历史记录表，用于追踪用户等级的变化

-- 创建用户等级变更表 (user_level_changes)
CREATE TABLE IF NOT EXISTS user_level_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES telegram_users(id) ON DELETE CASCADE,
    old_level VARCHAR(50),
    new_level VARCHAR(50) NOT NULL,
    change_reason VARCHAR(255),
    changed_by UUID REFERENCES admins(id),
    change_type VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (change_type IN ('manual', 'automatic', 'system')),
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_level_changes_user_id ON user_level_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_level_changes_changed_by ON user_level_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_user_level_changes_change_type ON user_level_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_user_level_changes_effective_date ON user_level_changes(effective_date);
CREATE INDEX IF NOT EXISTS idx_user_level_changes_created_at ON user_level_changes(created_at);

-- 添加表注释
COMMENT ON TABLE user_level_changes IS '用户等级变更记录表 - 记录用户等级的变更历史';
COMMENT ON COLUMN user_level_changes.id IS '主键ID';
COMMENT ON COLUMN user_level_changes.user_id IS '用户ID，关联telegram_users表';
COMMENT ON COLUMN user_level_changes.old_level IS '变更前等级';
COMMENT ON COLUMN user_level_changes.new_level IS '变更后等级';
COMMENT ON COLUMN user_level_changes.change_reason IS '变更原因';
COMMENT ON COLUMN user_level_changes.changed_by IS '操作人ID，关联admins表';
COMMENT ON COLUMN user_level_changes.change_type IS '变更类型：manual-手动，automatic-自动，system-系统';
COMMENT ON COLUMN user_level_changes.effective_date IS '生效时间';
COMMENT ON COLUMN user_level_changes.created_at IS '创建时间';
COMMENT ON COLUMN user_level_changes.updated_at IS '更新时间';

-- 创建更新时间触发器
CREATE TRIGGER update_user_level_changes_updated_at
    BEFORE UPDATE ON user_level_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 授予权限
GRANT SELECT ON user_level_changes TO anon;
GRANT ALL PRIVILEGES ON user_level_changes TO authenticated;