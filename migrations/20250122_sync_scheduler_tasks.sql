-- =====================================================
-- 同步调度器任务到数据库
-- 创建时间: 2025-01-22
-- 说明: 将后端硬编码的定时任务同步到数据库，确保管理后台显示一致
-- =====================================================

-- 删除现有的初始任务（如果存在）
DELETE FROM scheduled_tasks WHERE name IN (
    '数据库备份',
    '清理过期日志', 
    '系统状态检查'
);

-- 先添加唯一约束（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_task_name' 
        AND conrelid = 'scheduled_tasks'::regclass
    ) THEN
        ALTER TABLE scheduled_tasks ADD CONSTRAINT unique_task_name UNIQUE (name);
    END IF;
END $$;

-- 插入后端实际运行的定时任务
INSERT INTO scheduled_tasks (name, cron_expression, command, description, is_active) VALUES
('expired-delegations', '*/5 * * * *', 'processExpiredDelegations', '每5分钟检查并处理到期的能量委托', true),
('payment-timeouts', '*/10 * * * *', 'processPaymentTimeouts', '每10分钟检查并处理支付超时订单', true),
('refresh-pools', '0 * * * *', 'refreshEnergyPools', '每小时刷新能量池状态', true),
('cleanup-expired', '0 2 * * *', 'cleanupExpiredData', '每天凌晨2点清理过期数据', true)
ON CONFLICT (name) DO UPDATE SET
    cron_expression = EXCLUDED.cron_expression,
    command = EXCLUDED.command,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 更新任务状态，确保所有任务都是活跃的
UPDATE scheduled_tasks SET is_active = true WHERE name IN (
    'expired-delegations',
    'payment-timeouts', 
    'refresh-pools',
    'cleanup-expired'
);

-- 添加注释
COMMENT ON TABLE scheduled_tasks IS '定时任务表，存储系统定时任务的配置信息';
COMMENT ON COLUMN scheduled_tasks.name IS '任务名称，对应scheduler.ts中的任务标识';
COMMENT ON COLUMN scheduled_tasks.cron_expression IS 'Cron表达式，定义任务执行时间';
COMMENT ON COLUMN scheduled_tasks.command IS '执行命令或函数名';
COMMENT ON COLUMN scheduled_tasks.description IS '任务描述';
COMMENT ON COLUMN scheduled_tasks.is_active IS '是否启用该任务';
