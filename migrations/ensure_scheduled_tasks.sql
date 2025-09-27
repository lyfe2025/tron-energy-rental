-- 确保所有硬编码的定时任务在数据库中有对应的配置记录
-- 执行日期: 2025-01-XX
-- 说明: 定时任务系统重构后，需要确保数据库中有完整的任务配置

-- 插入或更新定时任务配置
INSERT INTO scheduled_tasks (
  id, 
  name, 
  cron_expression, 
  command, 
  description, 
  is_active, 
  created_at, 
  updated_at
) VALUES 
  -- 到期委托处理任务
  (
    COALESCE(
      (SELECT id FROM scheduled_tasks WHERE name = 'expired-delegations'), 
      gen_random_uuid()
    ),
    'expired-delegations', 
    '*/5 * * * *', 
    'expired-delegations', 
    '每5分钟检查并处理到期的能量委托', 
    true,
    COALESCE(
      (SELECT created_at FROM scheduled_tasks WHERE name = 'expired-delegations'), 
      NOW()
    ),
    NOW()
  ),
  -- 逾期未支付订单处理任务
  (
    COALESCE(
      (SELECT id FROM scheduled_tasks WHERE name = 'expired-unpaid-orders'), 
      gen_random_uuid()
    ),
    'expired-unpaid-orders', 
    '*/5 * * * *', 
    'expired-unpaid-orders', 
    '每5分钟检查并自动取消逾期未支付订单', 
    true,
    COALESCE(
      (SELECT created_at FROM scheduled_tasks WHERE name = 'expired-unpaid-orders'), 
      NOW()
    ),
    NOW()
  ),
  -- 能量池刷新任务
  (
    COALESCE(
      (SELECT id FROM scheduled_tasks WHERE name = 'refresh-pools'), 
      gen_random_uuid()
    ),
    'refresh-pools', 
    '0 * * * *', 
    'refresh-pools', 
    '每小时刷新能量池状态', 
    true,
    COALESCE(
      (SELECT created_at FROM scheduled_tasks WHERE name = 'refresh-pools'), 
      NOW()
    ),
    NOW()
  ),
  -- 过期数据清理任务
  (
    COALESCE(
      (SELECT id FROM scheduled_tasks WHERE name = 'cleanup-expired'), 
      gen_random_uuid()
    ),
    'cleanup-expired', 
    '0 2 * * *', 
    'cleanup-expired', 
    '每天凌晨2点清理过期数据', 
    true,
    COALESCE(
      (SELECT created_at FROM scheduled_tasks WHERE name = 'cleanup-expired'), 
      NOW()
    ),
    NOW()
  )
ON CONFLICT (name) DO UPDATE SET
  cron_expression = EXCLUDED.cron_expression,
  command = EXCLUDED.command,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 验证插入结果
SELECT 
  name, 
  cron_expression, 
  description, 
  is_active,
  created_at,
  updated_at
FROM scheduled_tasks 
WHERE name IN (
  'expired-delegations', 
  'expired-unpaid-orders', 
  'refresh-pools', 
  'cleanup-expired'
)
ORDER BY name;
