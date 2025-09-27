import { Router } from 'express';
import { param } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { schedulerService } from '../services/scheduler';
import { taskRegistry } from '../services/scheduler/TaskRegistry';
import { logger } from '../utils/logger';

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
      .custom((value) => {
        const registeredTaskNames = taskRegistry.getTaskNames();
        if (!registeredTaskNames.includes(value)) {
          throw new Error(`Invalid task name. Available tasks: ${registeredTaskNames.join(', ')}`);
        }
        return true;
      })
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
          message: `任务 ${taskName} 触发成功`
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Task execution failed',
          message: `任务 ${taskName} 触发失败`
        });
      }
    } catch (error) {
      logger.error('手动触发任务失败:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '触发任务时发生内部错误'
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
 * 自动取消逾期未支付订单
 * POST /api/scheduler/cancel-expired-orders
 */
router.post('/cancel-expired-orders',
  authenticateToken,
  async (req, res) => {
    try {
      const success = await schedulerService.triggerTask('expired-unpaid-orders');
      
      res.json({
        success,
        message: success ? 'Expired unpaid orders cancelled successfully' : 'Failed to cancel expired unpaid orders'
      });
    } catch (error) {
      console.error('Cancel expired orders error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to cancel expired orders'
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
      const healthStatus = schedulerService.getHealthStatus();
      
      res.status(healthStatus.healthy ? 200 : 503).json({
        success: healthStatus.healthy,
        data: healthStatus,
        message: healthStatus.healthy ? '调度器运行正常' : '调度器存在问题'
      });
    } catch (error) {
      logger.error('健康检查失败:', error);
      res.status(503).json({
        success: false,
        data: {
          healthy: false,
          error: '健康检查失败'
        },
        message: '无法检查调度器健康状态'
      });
    }
  }
);

/**
 * 获取已注册的任务处理器列表
 * GET /api/scheduler/handlers
 */
router.get('/handlers',
  authenticateToken,
  async (req, res) => {
    try {
      const handlers = schedulerService.getRegisteredHandlers();
      
      res.json({
        success: true,
        data: handlers.map(handler => ({
          name: handler.name,
          description: handler.description,
          defaultCronExpression: handler.defaultCronExpression,
          critical: handler.critical
        })),
        message: '获取任务处理器列表成功'
      });
    } catch (error) {
      logger.error('获取任务处理器列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '获取任务处理器列表失败'
      });
    }
  }
);

/**
 * 获取任务配置列表
 * GET /api/scheduler/tasks
 */
router.get('/tasks',
  authenticateToken,
  async (req, res) => {
    try {
      const tasks = schedulerService.getAllTaskConfigs();
      const taskStatus = schedulerService.getTaskStatus();
      
      const enrichedTasks = tasks.map(task => {
        const status = taskStatus.find(s => s.name === task.name);
        return {
          ...task,
          running: status ? status.running : false
        };
      });
      
      res.json({
        success: true,
        data: enrichedTasks,
        message: '获取任务配置列表成功'
      });
    } catch (error) {
      logger.error('获取任务配置列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '获取任务配置列表失败'
      });
    }
  }
);

/**
 * 启动任务
 * POST /api/scheduler/tasks/:taskName/start
 */
router.post('/tasks/:taskName/start',
  authenticateToken,
  [
    param('taskName')
      .custom((value) => {
        const registeredTaskNames = taskRegistry.getTaskNames();
        if (!registeredTaskNames.includes(value)) {
          throw new Error(`Invalid task name. Available tasks: ${registeredTaskNames.join(', ')}`);
        }
        return true;
      })
      .withMessage('Invalid task name')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { taskName } = req.params;
      
      const success = await schedulerService.startTask(taskName);
      
      res.json({
        success,
        message: success ? `任务 ${taskName} 启动成功` : `任务 ${taskName} 启动失败`
      });
    } catch (error) {
      logger.error('启动任务失败:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '启动任务时发生内部错误'
      });
    }
  }
);

/**
 * 停止任务
 * POST /api/scheduler/tasks/:taskName/stop
 */
router.post('/tasks/:taskName/stop',
  authenticateToken,
  [
    param('taskName')
      .custom((value) => {
        const registeredTaskNames = taskRegistry.getTaskNames();
        if (!registeredTaskNames.includes(value)) {
          throw new Error(`Invalid task name. Available tasks: ${registeredTaskNames.join(', ')}`);
        }
        return true;
      })
      .withMessage('Invalid task name')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { taskName } = req.params;
      
      const success = await schedulerService.stopTask(taskName);
      
      res.json({
        success,
        message: success ? `任务 ${taskName} 停止成功` : `任务 ${taskName} 停止失败`
      });
    } catch (error) {
      logger.error('停止任务失败:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '停止任务时发生内部错误'
      });
    }
  }
);

/**
 * 重启任务
 * POST /api/scheduler/tasks/:taskName/restart
 */
router.post('/tasks/:taskName/restart',
  authenticateToken,
  [
    param('taskName')
      .custom((value) => {
        const registeredTaskNames = taskRegistry.getTaskNames();
        if (!registeredTaskNames.includes(value)) {
          throw new Error(`Invalid task name. Available tasks: ${registeredTaskNames.join(', ')}`);
        }
        return true;
      })
      .withMessage('Invalid task name')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { taskName } = req.params;
      
      const success = await schedulerService.restartTask(taskName);
      
      res.json({
        success,
        message: success ? `任务 ${taskName} 重启成功` : `任务 ${taskName} 重启失败`
      });
    } catch (error) {
      logger.error('重启任务失败:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '重启任务时发生内部错误'
      });
    }
  }
);

/**
 * 重新加载任务配置
 * POST /api/scheduler/reload
 */
router.post('/reload',
  authenticateToken,
  async (req, res) => {
    try {
      await schedulerService.reloadTaskConfigs();
      
      res.json({
        success: true,
        message: '任务配置重新加载成功'
      });
    } catch (error) {
      logger.error('重新加载任务配置失败:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '重新加载任务配置失败'
      });
    }
  }
);

export default router;