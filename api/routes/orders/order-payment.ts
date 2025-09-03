import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticateToken } from '../../middleware/auth';
import { handleValidationErrors } from '../../middleware/validation';
import { orderService } from '../../services/order';

const router: Router = Router();

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

export default router;
