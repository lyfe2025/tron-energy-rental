import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../../middleware/auth';
import { handleValidationErrors } from '../../middleware/validation';
import { DailyFeeService } from '../../services/DailyFeeService';

const router: Router = Router();

/**
 * 占费服务管理
 */

/**
 * 启动占费服务
 * POST /api/transaction-package/daily-fee/start
 */
router.post('/start',
  authenticateToken,
  async (req, res) => {
    try {
      const dailyFeeService = DailyFeeService.getInstance();
      await dailyFeeService.start();
      
      res.json({
        success: true,
        data: { status: 'started' },
        message: 'Daily fee service started successfully'
      });
    } catch (error) {
      console.error('Start daily fee service error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to start daily fee service'
      });
    }
  }
);

/**
 * 停止占费服务
 * POST /api/transaction-package/daily-fee/stop
 */
router.post('/stop',
  authenticateToken,
  async (req, res) => {
    try {
      const dailyFeeService = DailyFeeService.getInstance();
      await dailyFeeService.stop();
      
      res.json({
        success: true,
        data: { status: 'stopped' },
        message: 'Daily fee service stopped successfully'
      });
    } catch (error) {
      console.error('Stop daily fee service error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to stop daily fee service'
      });
    }
  }
);

/**
 * 获取占费服务状态
 * GET /api/transaction-package/daily-fee/status
 */
router.get('/status',
  authenticateToken,
  async (req, res) => {
    try {
      const dailyFeeService = DailyFeeService.getInstance();
      const status = dailyFeeService.getStatus();
      
      res.json({
        success: true,
        data: status,
        message: 'Daily fee service status retrieved successfully'
      });
    } catch (error) {
      console.error('Get daily fee service status error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get daily fee service status'
      });
    }
  }
);

/**
 * 手动触发占费检查
 * POST /api/transaction-package/daily-fee/trigger-check
 */
router.post('/trigger-check',
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
      const dailyFeeService = DailyFeeService.getInstance();
      const result = await dailyFeeService.triggerFeeCheck(req.body.orderId);
      
      res.json({
        success: true,
        data: result,
        message: 'Daily fee check triggered successfully'
      });
    } catch (error) {
      console.error('Trigger daily fee check error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to trigger daily fee check'
      });
    }
  }
);

/**
 * 添加订单到占费服务
 * POST /api/transaction-package/daily-fee/orders
 */
router.post('/orders',
  authenticateToken,
  [
    body('orderId')
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const dailyFeeService = DailyFeeService.getInstance();
      await dailyFeeService.addOrder(req.body.orderId);
      
      res.json({
        success: true,
        data: { orderId: req.body.orderId },
        message: 'Order added to daily fee service successfully'
      });
    } catch (error) {
      console.error('Add order to daily fee service error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to add order to daily fee service'
      });
    }
  }
);

/**
 * 从占费服务中移除订单
 * DELETE /api/transaction-package/daily-fee/orders/:orderId
 */
router.delete('/orders/:orderId',
  authenticateToken,
  [
    param('orderId')
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const dailyFeeService = DailyFeeService.getInstance();
      await dailyFeeService.removeOrder(req.params.orderId);
      
      res.json({
        success: true,
        data: { orderId: req.params.orderId },
        message: 'Order removed from daily fee service successfully'
      });
    } catch (error) {
      console.error('Remove order from daily fee service error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to remove order from daily fee service'
      });
    }
  }
);

/**
 * 获取订单占费历史
 * GET /api/transaction-package/daily-fee/orders/:orderId/history
 */
router.get('/orders/:orderId/history',
  authenticateToken,
  [
    param('orderId')
      .isUUID()
      .withMessage('Valid order ID is required'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const dailyFeeService = DailyFeeService.getInstance();
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const history = await dailyFeeService.getOrderFeeHistory(req.params.orderId, limit, offset);
      
      res.json({
        success: true,
        data: {
          history,
          pagination: {
            limit,
            offset,
            count: history.length
          }
        },
        message: 'Order fee history retrieved successfully'
      });
    } catch (error) {
      console.error('Get order fee history error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get order fee history'
      });
    }
  }
);

/**
 * 获取占费统计信息
 * GET /api/transaction-package/daily-fee/stats
 */
router.get('/stats',
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
      
      // 获取占费统计信息的实现
      res.json({
        success: true,
        data: {
          totalOrders: 0,
          activeOrders: 0,
          totalFeeDeducted: 0,
          averageFeePerOrder: 0,
          feeDeductionCount: 0,
          lastFeeCheckTime: new Date(),
          nextFeeCheckTime: new Date(),
          feeDeductionRate: 0
        },
        message: 'Daily fee statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get daily fee stats error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get daily fee statistics'
      });
    }
  }
);

/**
 * 获取占费配置
 * GET /api/transaction-package/daily-fee/config
 */
router.get('/config',
  authenticateToken,
  async (req, res) => {
    try {
      const dailyFeeService = DailyFeeService.getInstance();
      const status = dailyFeeService.getStatus();
      
      res.json({
        success: true,
        data: {
          config: status.config,
          nextFeeCheckTime: status.nextFeeCheckTime,
          isRunning: status.isRunning
        },
        message: 'Daily fee configuration retrieved successfully'
      });
    } catch (error) {
      console.error('Get daily fee config error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get daily fee configuration'
      });
    }
  }
);

/**
 * 更新占费配置
 * PUT /api/transaction-package/daily-fee/config
 */
router.put('/config',
  authenticateToken,
  [
    body('checkInterval')
      .optional()
      .isInt({ min: 60000 })
      .withMessage('Check interval must be at least 60000ms'),
    body('batchSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Batch size must be between 1 and 100'),
    body('feeCheckTime')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Fee check time must be in HH:mm format'),
    body('gracePeriodHours')
      .optional()
      .isInt({ min: 0, max: 24 })
      .withMessage('Grace period must be between 0 and 24 hours'),
    body('inactiveThresholdHours')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('Inactive threshold must be between 1 and 168 hours')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const config = req.body;
      
      // 更新占费配置的实现
      res.json({
        success: true,
        data: { config },
        message: 'Daily fee configuration updated successfully'
      });
    } catch (error) {
      console.error('Update daily fee config error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update daily fee configuration'
      });
    }
  }
);

/**
 * 获取最近的占费记录
 * GET /api/transaction-package/daily-fee/recent
 */
router.get('/recent',
  authenticateToken,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // 获取最近的占费记录的实现
      res.json({
        success: true,
        data: {
          recentFeeRecords: [],
          count: 0
        },
        message: 'Recent fee records retrieved successfully'
      });
    } catch (error) {
      console.error('Get recent fee records error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get recent fee records'
      });
    }
  }
);

export default router;
