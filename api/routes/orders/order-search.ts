import { Router } from 'express';
import { query } from 'express-validator';
import { authenticateToken } from '../../middleware/auth';
import { handleValidationErrors } from '../../middleware/validation';
import { orderService } from '../../services/order';

const router: Router = Router();

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
      .isIn(['pending', 'paid', 'processing', 'active', 'completed', 'manually_completed', 'failed', 'cancelled', 'expired'])
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
      .withMessage('Offset must be non-negative'),
    query('networkId')
      .optional()
      .isString()
      .withMessage('Network ID must be a string'),
    query('generalSearch')
      .optional()
      .isString()
      .withMessage('General search must be a string')
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
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        networkId: req.query.networkId as string,
        generalSearch: req.query.generalSearch as string
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

export default router;
