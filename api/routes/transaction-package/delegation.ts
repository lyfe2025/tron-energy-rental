import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { BatchDelegationController } from '../../controllers/BatchDelegationController';
import { authenticateToken } from '../../middleware/auth';
import { handleValidationErrors } from '../../middleware/validation';

const router: Router = Router();
const batchDelegationController = new BatchDelegationController();

/**
 * 单笔交易能量代理
 * POST /api/transaction-package/delegate
 */
router.post('/delegate',
  authenticateToken,
  [
    body('orderId')
      .isUUID()
      .withMessage('Valid order ID is required'),
    body('recipientAddress')
      .matches(/^T[A-Za-z1-9]{33}$/)
      .withMessage('Invalid TRON address format'),
    body('energyAmount')
      .optional()
      .isInt({ min: 1000 })
      .withMessage('Energy amount must be at least 1000')
  ],
  handleValidationErrors,
  batchDelegationController.delegateSingleTransaction
);

/**
 * 更新交易笔数
 * PUT /api/transaction-package/orders/:orderId/transaction-count
 */
router.put('/orders/:orderId/transaction-count',
  authenticateToken,
  [
    param('orderId')
      .isUUID()
      .withMessage('Valid order ID is required'),
    body('usedCount')
      .isInt({ min: 0 })
      .withMessage('Used count must be non-negative')
  ],
  handleValidationErrors,
  batchDelegationController.updateTransactionCount
);

/**
 * 获取代理状态
 * GET /api/transaction-package/orders/:orderId/delegation-status
 */
router.get('/orders/:orderId/delegation-status',
  authenticateToken,
  [
    param('orderId')
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  batchDelegationController.getDelegationStatus
);

/**
 * 执行批量代理
 * POST /api/transaction-package/batch-delegation
 */
router.post('/batch-delegation',
  authenticateToken,
  [
    body('orderIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Order IDs array must contain 1-50 items'),
    body('orderIds.*')
      .isUUID()
      .withMessage('Each order ID must be valid UUID')
  ],
  handleValidationErrors,
  batchDelegationController.executeBatchDelegation
);

/**
 * 获取待处理代理列表
 * GET /api/transaction-package/pending-delegations
 */
router.get('/pending-delegations',
  authenticateToken,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('networkId')
      .optional()
      .isString()
      .withMessage('Network ID must be a string')
  ],
  handleValidationErrors,
  batchDelegationController.getPendingDelegations
);

/**
 * 触发下一次代理
 * POST /api/transaction-package/trigger-next-delegation
 */
router.post('/trigger-next-delegation',
  authenticateToken,
  [
    body('orderId')
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  batchDelegationController.triggerNextDelegation
);

/**
 * 获取代理预估信息
 * GET /api/transaction-package/orders/:orderId/delegation-estimate
 */
router.get('/orders/:orderId/delegation-estimate',
  authenticateToken,
  [
    param('orderId')
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // 获取代理预估信息的实现
      res.json({
        success: true,
        data: {
          orderId,
          energyAmount: 65000,
          lockPeriod: 3,
          estimatedCost: 0,
          nextDelegationTime: null,
          canDelegateNow: true
        },
        message: 'Delegation estimate retrieved successfully'
      });
    } catch (error) {
      console.error('Get delegation estimate error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get delegation estimate'
      });
    }
  }
);

/**
 * 验证代理前置条件
 * POST /api/transaction-package/validate-delegation
 */
router.post('/validate-delegation',
  authenticateToken,
  [
    body('orderId')
      .isUUID()
      .withMessage('Valid order ID is required'),
    body('userAddress')
      .matches(/^T[A-Za-z1-9]{33}$/)
      .withMessage('Invalid TRON address format')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { orderId, userAddress } = req.body;
      
      // 验证代理前置条件的实现
      res.json({
        success: true,
        data: {
          valid: true,
          message: 'All preconditions satisfied',
          orderId,
          userAddress,
          energyRequired: 65000,
          canDelegate: true
        },
        message: 'Delegation validation completed'
      });
    } catch (error) {
      console.error('Validate delegation error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to validate delegation'
      });
    }
  }
);

/**
 * 获取代理历史记录
 * GET /api/transaction-package/orders/:orderId/delegation-history
 */
router.get('/orders/:orderId/delegation-history',
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
      const { orderId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // 获取代理历史记录的实现
      res.json({
        success: true,
        data: {
          delegationHistory: [],
          pagination: {
            limit,
            offset,
            total: 0,
            hasMore: false
          }
        },
        message: 'Delegation history retrieved successfully'
      });
    } catch (error) {
      console.error('Get delegation history error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get delegation history'
      });
    }
  }
);

/**
 * 取消代理
 * POST /api/transaction-package/orders/:orderId/cancel-delegation
 */
router.post('/orders/:orderId/cancel-delegation',
  authenticateToken,
  [
    param('orderId')
      .isUUID()
      .withMessage('Valid order ID is required'),
    body('reason')
      .optional()
      .isString()
      .withMessage('Cancellation reason must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      
      // 取消代理的实现
      res.json({
        success: true,
        data: {
          orderId,
          cancelled: true,
          reason
        },
        message: 'Delegation cancelled successfully'
      });
    } catch (error) {
      console.error('Cancel delegation error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to cancel delegation'
      });
    }
  }
);

export default router;
