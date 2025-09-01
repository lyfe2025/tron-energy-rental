-- =====================================================
-- 添加定时任务执行时间字段
-- 创建时间: 2025-09-02
-- 说明: 为scheduled_tasks表添加next_run和last_run字段
-- =====================================================

-- 添加下次执行时间字段
ALTER TABLE scheduled_tasks 
ADD COLUMN IF NOT EXISTS next_run TIMESTAMP WITH TIME ZONE;

-- 添加最后执行时间字段
ALTER TABLE scheduled_tasks 
ADD COLUMN IF NOT EXISTS last_run TIMESTAMP WITH TIME ZONE;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_last_run ON scheduled_tasks(last_run);

-- 更新现有任务的下次执行时间（基于cron表达式计算）
-- 注意：这里只是示例，实际应该使用cron解析库来计算
UPDATE scheduled_tasks 
SET next_run = CASE 
  WHEN cron_expression = '0 2 * * *' THEN 
    CASE 
      WHEN EXTRACT(hour FROM NOW()) < 2 THEN 
        DATE_TRUNC('day', NOW()) + INTERVAL '2 hours'
      ELSE 
        DATE_TRUNC('day', NOW()) + INTERVAL '1 day 2 hours'
    END
  WHEN cron_expression = '0 3 * * 0' THEN 
    -- 每周日凌晨3点
    DATE_TRUNC('week', NOW()) + INTERVAL '1 week 3 hours'
  WHEN cron_expression = '*/5 * * * *' THEN 
    -- 每5分钟
    DATE_TRUNC('minute', NOW()) + INTERVAL '5 minutes'
  ELSE 
    -- 默认设置为1小时后
    NOW() + INTERVAL '1 hour'
END
WHERE next_run IS NULL;

-- 更新现有任务的最后执行时间（从执行日志中获取）
UPDATE scheduled_tasks 
SET last_run = (
  SELECT MAX(finished_at) 
  FROM task_execution_logs 
  WHERE task_execution_logs.task_id = scheduled_tasks.id 
    AND status = 'success'
)
WHERE last_run IS NULL;

-- 添加注释
COMMENT ON COLUMN scheduled_tasks.next_run IS '下次执行时间';
COMMENT ON COLUMN scheduled_tasks.last_run IS '最后执行时间';
