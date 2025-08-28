import { Router } from 'express';
import { orderService } from '../services/order';
import { authenticateToken } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

interface CreateOrderRequest {
  userId: number;
  packageId: number;
  energyAmount: number;
  durationHours: number;
  priceTrx: number;
  recipientAddress: string;
}
import { body, param, query } from 'express-validator';

const router = Router();

/**
 * 创建新订单
 * POST /api/orders
 */
router.post('/',
  authenticateToken,
  [
    body('userId')
      .isInt({ min: 1 })
      .withMessage('Valid user ID is required'),
    body('packageId')
      .isInt({ min: 1 })
      .withMessage('Valid package ID is required'),
    body('energyAmount')
      .isInt({ min: 1000 })
      .withMessage('Energy amount must be at least 1000'),
    body('durationHours')
      .isInt({ min: 1, max: 168 })
      .withMessage('Duration must be between 1 and 168 hours'),
    body('priceTrx')
      .isFloat({ min: 0.1 })
      .withMessage('Price must be at least 0.1 TRX'),
    body('recipientAddress')
      .matches(/^T[A-Za-z1-9]{33}$/)
      .withMessage('Invalid TRON address format')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const orderRequest: CreateOrderRequest = {
        userId: req.body.userId,
        packageId: req.body.packageId,
        energyAmount: req.body.energyAmount,
        durationHours: req.body.durationHours,
        priceTrx: req.body.priceTrx,
        recipientAddress: req.body.recipientAddress
      };

      const order = await orderService.createOrder(orderRequest);

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully'
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to create order'
      });
    }
  }
);

/**
 * 获取所有订单列表
 * GET /api/orders
 */
router.get('/',
  authenticateToken,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['pending', 'paid', 'processing', 'active', 'completed', 'failed', 'cancelled', 'expired'])
      .withMessage('Invalid status value'),
    query('search')
      .optional()
      .isString()
      .withMessage('Search must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;
      const search = req.query.search as string;

      // 构建搜索查询
      const searchQuery: any = {};
      if (status) searchQuery.status = status;
      if (search) {
        // 根据搜索内容判断是地址还是交易哈希
        if (search.startsWith('T') && search.length === 34) {
          // TRON地址格式
          searchQuery.recipientAddress = search;
        } else if (search.length === 64) {
          // 交易哈希格式
          searchQuery.txHash = search;
        } else if (/^\d+$/.test(search)) {
          // 数字，可能是用户ID
          searchQuery.userId = parseInt(search);
        }
      }

      const result = await orderService.searchOrders(searchQuery, limit, offset);

      res.json({
        success: true,
        data: {
          orders: result.orders,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          }
        },
        message: 'Orders retrieved successfully'
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve orders'
      });
    }
  }
);

/**
 * 获取订单详情
 * GET /api/orders/:id
 */
router.get('/:id',
  authenticateToken,
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await orderService.getOrderById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
          message: 'The requested order does not exist'
        });
      }

      res.json({
        success: true,
        data: order,
        message: 'Order retrieved successfully'
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve order'
      });
    }
  }
);

/**
 * 获取用户订单列表
 * GET /api/orders/user/:userId
 */
router.get('/user/:userId',
  authenticateToken,
  [
    param('userId')
      .isInt({ min: 1 })
      .withMessage('Valid user ID is required'),
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
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const orders = await orderService.getUserOrders(userId, limit, offset);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            limit,
            offset,
            count: orders.length
          }
        },
        message: 'User orders retrieved successfully'
      });
    } catch (error) {
      console.error('Get user orders error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve user orders'
      });
    }
  }
);

/**
 * 更新订单状态
 * PUT /api/orders/:id/status
 */
router.put('/:id/status',
  authenticateToken,
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Valid order ID is required'),
    body('status')
      .isIn(['pending', 'paid', 'processing', 'active', 'completed', 'failed', 'cancelled', 'expired'])
      .withMessage('Invalid status value')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status, ...additionalData } = req.body;

      const order = await orderService.updateOrderStatus(orderId, status, additionalData);

      res.json({
        success: true,
        data: order,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update order status'
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
      .isInt({ min: 1 })
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
      const orderId = parseInt(req.params.id);
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
 * 处理支付确认
 * POST /api/orders/:id/payment-confirmed
 */
router.post('/:id/payment-confirmed',
  authenticateToken,
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Valid order ID is required'),
    body('txHash')
      .isString()
      .isLength({ min: 64, max: 64 })
      .withMessage('Valid transaction hash is required'),
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Valid amount is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { txHash, amount } = req.body;

      await orderService.handlePaymentConfirmed(orderId, txHash, amount);

      res.json({
        success: true,
        message: 'Payment confirmed and order processing started'
      });
    } catch (error) {
      console.error('Handle payment confirmed error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process payment confirmation'
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
      .isInt({ min: 1 })
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);

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
 * 获取订单统计
 * GET /api/orders/stats
 */
router.get('/stats',
  authenticateToken,
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await orderService.getOrderStats(days);

      res.json({
        success: true,
        data: {
          ...stats,
          period: `${days} days`
        },
        message: 'Order statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get order stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve order statistics'
      });
    }
  }
);

/**
 * 搜索订单
 * GET /api/orders/search
 */
router.get('/search',
  authenticateToken,
  [
    query('userId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('User ID must be a positive integer'),
    query('status')
      .optional()
      .isIn(['pending', 'paid', 'processing', 'active', 'completed', 'failed', 'cancelled', 'expired'])
      .withMessage('Invalid status value'),
    query('recipientAddress')
      .optional()
      .matches(/^T[A-Za-z1-9]{33}$/)
      .withMessage('Invalid TRON address format'),
    query('txHash')
      .optional()
      .isString()
      .isLength({ min: 64, max: 64 })
      .withMessage('Invalid transaction hash format'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for dateFrom'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format for dateTo'),
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
      const searchQuery = {
        userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
        status: req.query.status as any,
        recipientAddress: req.query.recipientAddress as string,
        txHash: req.query.txHash as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await orderService.searchOrders(searchQuery, limit, offset);

      res.json({
        success: true,
        data: {
          ...result,
          pagination: {
            limit,
            offset,
            total: result.total
          }
        },
        message: 'Orders search completed successfully'
      });
    } catch (error) {
      console.error('Search orders error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to search orders'
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