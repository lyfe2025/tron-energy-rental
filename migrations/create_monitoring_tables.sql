-- =====================================================
-- 监控中心数据库表结构
-- 创建时间: 2025-01-22
-- 说明: 创建监控中心所需的所有数据库表
-- 包含: scheduled_tasks, task_execution_logs, admin_sessions, system_monitoring_logs
-- =====================================================

-- 创建定时任务表
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL, -- 任务名称
    cron_expression VARCHAR(100) NOT NULL, -- Cron表达式
    command TEXT NOT NULL, -- 执行命令
    description TEXT, -- 任务描述
    is_active BOOLEAN DEFAULT true, -- 是否启用
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 创建时间
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- 更新时间
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_active ON scheduled_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_name ON scheduled_tasks(name);

-- 创建任务执行日志表
CREATE TABLE IF NOT EXISTS task_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE, -- 任务ID
    started_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 开始时间
    finished_at TIMESTAMP WITH TIME ZONE, -- 结束时间
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')), -- 执行状态
    output TEXT, -- 执行输出
    error_message TEXT, -- 错误信息
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- 创建时间
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_execution_logs_task_id ON task_execution_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_execution_logs_status ON task_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_task_execution_logs_started_at ON task_execution_logs(started_at DESC);

-- 创建管理员会话表
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE, -- 管理员ID
    session_token VARCHAR(255) NOT NULL UNIQUE, -- 会话令牌
    ip_address INET NOT NULL, -- IP地址
    user_agent TEXT, -- 用户代理
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 登录时间
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 最后活动时间
    is_active BOOLEAN DEFAULT true -- 是否活跃
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_last_activity ON admin_sessions(last_activity DESC);

-- 创建系统监控日志表
CREATE TABLE IF NOT EXISTS system_monitoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL, -- 操作管理员ID
    action_type VARCHAR(50) NOT NULL, -- 操作类型
    action_data JSONB, -- 操作数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- 创建时间
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_monitoring_logs_admin_id ON system_monitoring_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_system_monitoring_logs_action_type ON system_monitoring_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_system_monitoring_logs_created_at ON system_monitoring_logs(created_at DESC);

-- 创建GIN索引用于JSONB查询
CREATE INDEX IF NOT EXISTS idx_system_monitoring_logs_action_data ON system_monitoring_logs USING GIN (action_data);

-- 插入初始定时任务数据
INSERT INTO scheduled_tasks (name, cron_expression, command, description) VALUES
('数据库备份', '0 2 * * *', 'npm run backup:database', '每日凌晨2点执行数据库备份'),
('清理过期日志', '0 3 * * 0', 'npm run cleanup:logs', '每周日凌晨3点清理过期日志文件'),
('系统状态检查', '*/5 * * * *', 'npm run health:check', '每5分钟检查系统健康状态')
ON CONFLICT DO NOTHING;

-- 数据库表创建完成
-- 注意：此项目使用本地PostgreSQL，无需特殊权限设置