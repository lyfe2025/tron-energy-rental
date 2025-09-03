import { Router } from 'express';
import { query } from 'express-validator';
import { authenticateToken } from '../../middleware/auth';
import { handleValidationErrors } from '../../middleware/validation';
import { orderService } from '../../services/order';

const router: Router = Router();

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

export default router;
