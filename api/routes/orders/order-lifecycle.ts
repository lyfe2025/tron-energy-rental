import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../../middleware/auth';
import { handleValidationErrors } from '../../middleware/validation';
import { orderService } from '../../services/order';
import { orderLifecycleService } from '../../services/order/OrderLifecycleService';

const router: Router = Router();

/**
 * 更新订单状态
 * PUT /api/orders/:id/status
 */
router.put('/:id/status',
  authenticateToken,
  [
    param('id')
      .isUUID()
      .withMessage('Valid order ID is required'),
    body('status')
      .isIn(['pending', 'paid', 'processing', 'active', 'completed', 'manually_completed', 'failed', 'cancelled', 'expired'])
      .withMessage('Invalid status value')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const { status, ...additionalData } = req.body;

      const order = await orderLifecycleService.updateOrderStatusManually(orderId, status, additionalData);

      res.json({
        success: true,
        data: order,
        message: 'Order status updated successfully'
      });
    } catch (error: any) {
      console.error('Update order status error:', error);
      
      // 处理友好的业务错误
      if (error.name === 'DuplicateFlashRentOrderError') {
        return res.status(409).json({
          success: false,
          error: error.message,
          message: '订单更新失败',
          code: 'DUPLICATE_FLASH_RENT_ORDER'
        });
      }

      // 处理其他业务错误
      if (error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          error: '订单不存在',
          message: '未找到指定的订单',
          code: 'ORDER_NOT_FOUND'
        });
      }

      // 通用错误处理
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        message: '订单状态更新失败'
      });
    }
  }
);

/**
 * 取消订单
 * POST /api/orders/:id/cancel
 */
router.post('/:id/cancel',
  authenticateToken,
  [
    param('id')
      .isUUID()
      .withMessage('Valid order ID is required'),
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Reason must be a string with max 500 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const { reason } = req.body;

      const order = await orderService.cancelOrder(orderId, reason);

      res.json({
        success: true,
        data: order,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to cancel order'
      });
    }
  }
);

/**
 * 处理能量委托
 * POST /api/orders/:id/process-delegation
 */
router.post('/:id/process-delegation',
  authenticateToken,
  [
    param('id')
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const orderId = req.params.id;

      await orderService.processEnergyDelegation(orderId);

      res.json({
        success: true,
        message: 'Energy delegation processed successfully'
      });
    } catch (error) {
      console.error('Process delegation error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process energy delegation'
      });
    }
  }
);

/**
 * 获取活跃订单
 * GET /api/orders/active
 */
router.get('/active',
  authenticateToken,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Limit must be between 1 and 500')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const orders = await orderService.getActiveOrders(limit);

      res.json({
        success: true,
        data: {
          orders,
          count: orders.length
        },
        message: 'Active orders retrieved successfully'
      });
    } catch (error) {
      console.error('Get active orders error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve active orders'
      });
    }
  }
);

/**
 * 批量处理过期订单
 * POST /api/orders/process-expired
 */
router.post('/process-expired',
  authenticateToken,
  async (req, res) => {
    try {
      const processedCount = await orderService.processExpiredOrders();

      res.json({
        success: true,
        data: {
          processedCount
        },
        message: `Processed ${processedCount} expired orders`
      });
    } catch (error) {
      console.error('Process expired orders error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process expired orders'
      });
    }
  }
);

export default router;
