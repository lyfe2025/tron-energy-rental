import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../../middleware/auth';
import { handleValidationErrors } from '../../middleware/validation';
import { orderService } from '../../services/order';

interface CreateOrderRequest {
  userId: number;
  priceConfigId: number;  // 替换packageId为priceConfigId，关联price_configs表
  energyAmount: number;
  durationHours: number;
  priceTrx: number;
  recipientAddress: string;
}

const router: Router = Router();

/**
 * 创建新订单
 * POST /api/orders
 */
router.post('/',
  authenticateToken,
  [
    body('userId')
      .isUUID()
      .withMessage('Valid user ID is required'),
    body('packageId')
      .isUUID()
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
        priceConfigId: req.body.priceConfigId || req.body.packageId, // 兼容旧的packageId字段
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
      .isUUID()
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['pending', 'paid', 'processing', 'active', 'completed', 'manually_completed', 'failed', 'cancelled', 'expired'])
      .withMessage('Invalid status value'),
    query('search')
      .optional()
      .isString()
      .withMessage('Search must be a string'),
    query('network_id')
      .optional()
      .isString()
      .withMessage('Network ID must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const networkId = req.query.network_id as string;
      
      // 高级搜索参数
      const orderType = req.query.order_type as string;
      const paymentStatus = req.query.payment_status as string;
      const minAmount = req.query.min_amount ? parseFloat(req.query.min_amount as string) : undefined;
      const maxAmount = req.query.max_amount ? parseFloat(req.query.max_amount as string) : undefined;

      // 构建搜索查询
      const searchQuery: any = {};
      if (status) searchQuery.status = status;
      if (networkId) searchQuery.networkId = networkId;
      if (orderType) searchQuery.orderType = orderType;
      if (paymentStatus) searchQuery.paymentStatus = paymentStatus;
      if (minAmount !== undefined) searchQuery.minAmount = minAmount;
      if (maxAmount !== undefined) searchQuery.maxAmount = maxAmount;
      
      // 使用新的通用搜索功能，支持模糊搜索多个字段
      if (search) {
        // 优先使用智能判断逻辑，如果无法精确匹配则使用通用搜索
        let searchTerm = search.trim();
        
        // 处理订单号搜索（移除#前缀）
        if (searchTerm.startsWith('#')) {
          searchTerm = searchTerm.substring(1);
        }
        
        if (searchTerm.startsWith('T') && searchTerm.length === 34) {
          // TRON地址格式 - 精确搜索
          searchQuery.recipientAddress = searchTerm;
        } else if (searchTerm.length === 64 && /^[a-fA-F0-9]+$/.test(searchTerm)) {
          // 交易哈希格式 - 精确搜索
          searchQuery.txHash = searchTerm;
        } else if (/^\d+$/.test(searchTerm)) {
          // 纯数字 - 可能是用户ID或订单ID
          searchQuery.userId = parseInt(searchTerm);
        } else {
          // 其他情况使用通用模糊搜索
          searchQuery.generalSearch = searchTerm;
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
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const orderId = req.params.id;
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
      .isUUID()
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

export default router;
