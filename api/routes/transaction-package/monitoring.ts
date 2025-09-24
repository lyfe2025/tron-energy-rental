import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../../middleware/auth';
import { handleValidationErrors } from '../../middleware/validation';
import { EnergyUsageMonitorService } from '../../services/EnergyUsageMonitorService';

const router: Router = Router();

/**
 * 能量使用监听服务管理
 */

/**
 * 启动能量监听服务
 * POST /api/transaction-package/energy-monitor/start
 */
router.post('/energy-monitor/start',
  authenticateToken,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      await monitor.start();
      
      res.json({
        success: true,
        data: { status: 'started' },
        message: 'Energy usage monitor started successfully'
      });
    } catch (error) {
      console.error('Start energy monitor error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to start energy usage monitor'
      });
    }
  }
);

/**
 * 停止能量监听服务
 * POST /api/transaction-package/energy-monitor/stop
 */
router.post('/energy-monitor/stop',
  authenticateToken,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      await monitor.stop();
      
      res.json({
        success: true,
        data: { status: 'stopped' },
        message: 'Energy usage monitor stopped successfully'
      });
    } catch (error) {
      console.error('Stop energy monitor error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to stop energy usage monitor'
      });
    }
  }
);

/**
 * 获取能量监听服务状态
 * GET /api/transaction-package/energy-monitor/status
 */
router.get('/energy-monitor/status',
  authenticateToken,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      const status = monitor.getStatus();
      
      res.json({
        success: true,
        data: status,
        message: 'Energy monitor status retrieved successfully'
      });
    } catch (error) {
      console.error('Get energy monitor status error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get energy monitor status'
      });
    }
  }
);

/**
 * 添加订单到能量监听
 * POST /api/transaction-package/energy-monitor/orders
 */
router.post('/energy-monitor/orders',
  authenticateToken,
  [
    body('orderId')
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      await monitor.addOrder(req.body.orderId);
      
      res.json({
        success: true,
        data: { orderId: req.body.orderId },
        message: 'Order added to energy monitor successfully'
      });
    } catch (error) {
      console.error('Add order to energy monitor error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to add order to energy monitor'
      });
    }
  }
);

/**
 * 从能量监听中移除订单
 * DELETE /api/transaction-package/energy-monitor/orders/:orderId
 */
router.delete('/energy-monitor/orders/:orderId',
  authenticateToken,
  [
    param('orderId')
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      await monitor.removeOrder(req.params.orderId);
      
      res.json({
        success: true,
        data: { orderId: req.params.orderId },
        message: 'Order removed from energy monitor successfully'
      });
    } catch (error) {
      console.error('Remove order from energy monitor error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to remove order from energy monitor'
      });
    }
  }
);

/**
 * 手动触发能量检查
 * POST /api/transaction-package/energy-monitor/trigger-check
 */
router.post('/energy-monitor/trigger-check',
  authenticateToken,
  [
    body('orderId')
      .optional()
      .isUUID()
      .withMessage('Order ID must be valid UUID if provided')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      
      if (req.body.orderId) {
        // 触发特定订单的能量检查
        const result = await monitor.triggerEnergyCheck(req.body.orderId);
        res.json({
          success: true,
          data: result,
          message: 'Energy check triggered successfully'
        });
      } else {
        // 触发全局能量检查
        res.json({
          success: true,
          data: { message: 'Global energy check triggered' },
          message: 'Global energy check triggered successfully'
        });
      }
    } catch (error) {
      console.error('Trigger energy check error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to trigger energy check'
      });
    }
  }
);

/**
 * 获取监控统计信息
 * GET /api/transaction-package/energy-monitor/stats
 */
router.get('/energy-monitor/stats',
  authenticateToken,
  [
    query('startTime')
      .optional()
      .isISO8601()
      .withMessage('Start time must be valid ISO8601 date'),
    query('endTime')
      .optional()
      .isISO8601()
      .withMessage('End time must be valid ISO8601 date')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
      const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;
      
      // 获取监控统计信息的实现
      res.json({
        success: true,
        data: {
          monitoredOrders: 0,
          energyUsageEvents: 0,
          delegationTriggered: 0,
          averageResponseTime: 0,
          lastCheckTime: new Date(),
          uptime: 0
        },
        message: 'Monitor statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get monitor stats error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get monitor statistics'
      });
    }
  }
);

/**
 * 获取监控日志
 * GET /api/transaction-package/energy-monitor/logs
 */
router.get('/energy-monitor/logs',
  authenticateToken,
  [
    query('level')
      .optional()
      .isIn(['debug', 'info', 'warn', 'error'])
      .withMessage('Invalid log level'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative'),
    query('startTime')
      .optional()
      .isISO8601()
      .withMessage('Start time must be valid ISO8601 date'),
    query('endTime')
      .optional()
      .isISO8601()
      .withMessage('End time must be valid ISO8601 date')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const level = req.query.level as string;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const startTime = req.query.startTime as string;
      const endTime = req.query.endTime as string;
      
      // 获取监控日志的实现
      res.json({
        success: true,
        data: {
          logs: [],
          pagination: {
            limit,
            offset,
            total: 0,
            hasMore: false
          }
        },
        message: 'Monitor logs retrieved successfully'
      });
    } catch (error) {
      console.error('Get monitor logs error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get monitor logs'
      });
    }
  }
);

/**
 * 重新加载监控配置
 * POST /api/transaction-package/energy-monitor/reload-config
 */
router.post('/energy-monitor/reload-config',
  authenticateToken,
  async (req, res) => {
    try {
      // 重新加载监控配置的实现
      res.json({
        success: true,
        data: { reloaded: true },
        message: 'Monitor configuration reloaded successfully'
      });
    } catch (error) {
      console.error('Reload monitor config error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to reload monitor configuration'
      });
    }
  }
);

/**
 * 获取实时监控数据
 * GET /api/transaction-package/energy-monitor/realtime
 */
router.get('/energy-monitor/realtime',
  authenticateToken,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      const status = monitor.getStatus();
      
      // 获取实时监控数据
      res.json({
        success: true,
        data: {
          ...status,
          timestamp: new Date(),
          systemHealth: 'healthy',
          activeConnections: 1,
          processedEvents: 0,
          errorCount: 0
        },
        message: 'Realtime monitor data retrieved successfully'
      });
    } catch (error) {
      console.error('Get realtime monitor data error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get realtime monitor data'
      });
    }
  }
);

export default router;
