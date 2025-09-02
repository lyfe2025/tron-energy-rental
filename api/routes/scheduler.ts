import { Router } from 'express';
import { param } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { schedulerService } from '../services/scheduler';

const router: Router = Router();

/**
 * 获取调度器状态
 * GET /api/scheduler/status
 */
router.get('/status',
  authenticateToken,
  async (req, res) => {
    try {
      const tasks = schedulerService.getTaskStatus();
      
      res.json({
        success: true,
        data: {
          tasks,
          totalTasks: tasks.length,
          runningTasks: tasks.filter(t => t.running).length
        },
        message: 'Scheduler status retrieved successfully'
      });
    } catch (error) {
      console.error('Get scheduler status error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get scheduler status'
      });
    }
  }
);

/**
 * 手动触发任务
 * POST /api/scheduler/trigger/:taskName
 */
router.post('/trigger/:taskName',
  authenticateToken,
  [
    param('taskName')
      .isIn(['expired-delegations', 'payment-timeouts', 'refresh-pools', 'cleanup-expired'])
      .withMessage('Invalid task name')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { taskName } = req.params;
      
      const success = await schedulerService.triggerTask(taskName);
      
      if (success) {
        res.json({
          success: true,
          message: `Task ${taskName} triggered successfully`
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Task execution failed',
          message: `Failed to trigger task ${taskName}`
        });
      }
    } catch (error) {
      console.error('Trigger task error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to trigger task'
      });
    }
  }
);

/**
 * 批量处理到期委托
 * POST /api/scheduler/process-expired-delegations
 */
router.post('/process-expired-delegations',
  authenticateToken,
  async (req, res) => {
    try {
      const success = await schedulerService.triggerTask('expired-delegations');
      
      res.json({
        success,
        message: success ? 'Expired delegations processed successfully' : 'Failed to process expired delegations'
      });
    } catch (error) {
      console.error('Process expired delegations error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process expired delegations'
      });
    }
  }
);

/**
 * 批量处理支付超时
 * POST /api/scheduler/process-payment-timeouts
 */
router.post('/process-payment-timeouts',
  authenticateToken,
  async (req, res) => {
    try {
      const success = await schedulerService.triggerTask('payment-timeouts');
      
      res.json({
        success,
        message: success ? 'Payment timeouts processed successfully' : 'Failed to process payment timeouts'
      });
    } catch (error) {
      console.error('Process payment timeouts error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process payment timeouts'
      });
    }
  }
);

/**
 * 刷新能量池状态
 * POST /api/scheduler/refresh-pools
 */
router.post('/refresh-pools',
  authenticateToken,
  async (req, res) => {
    try {
      const success = await schedulerService.triggerTask('refresh-pools');
      
      res.json({
        success,
        message: success ? 'Energy pools refreshed successfully' : 'Failed to refresh energy pools'
      });
    } catch (error) {
      console.error('Refresh pools error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to refresh energy pools'
      });
    }
  }
);

/**
 * 清理过期数据
 * POST /api/scheduler/cleanup-expired
 */
router.post('/cleanup-expired',
  authenticateToken,
  async (req, res) => {
    try {
      const success = await schedulerService.triggerTask('cleanup-expired');
      
      res.json({
        success,
        message: success ? 'Expired data cleaned up successfully' : 'Failed to cleanup expired data'
      });
    } catch (error) {
      console.error('Cleanup expired error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to cleanup expired data'
      });
    }
  }
);

/**
 * 获取系统健康状态
 * GET /api/scheduler/health
 */
router.get('/health',
  async (req, res) => {
    try {
      const tasks = schedulerService.getTaskStatus();
      const runningTasks = tasks.filter(t => t.running).length;
      const totalTasks = tasks.length;
      
      // 检查关键任务是否运行
      const criticalTasks = ['expired-delegations', 'payment-timeouts'];
      const criticalTasksRunning = tasks
        .filter(t => criticalTasks.includes(t.name) && t.running)
        .length;
      
      const isHealthy = criticalTasksRunning === criticalTasks.length;
      
      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: {
          healthy: isHealthy,
          scheduler: {
            totalTasks,
            runningTasks,
            criticalTasksRunning,
            criticalTasksTotal: criticalTasks.length
          },
          tasks: tasks.map(t => ({
            name: t.name,
            running: t.running,
            critical: criticalTasks.includes(t.name)
          }))
        },
        message: isHealthy ? 'Scheduler is healthy' : 'Scheduler has issues'
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        data: {
          healthy: false,
          error: 'Health check failed'
        },
        message: 'Failed to check scheduler health'
      });
    }
  }
);

export default router;