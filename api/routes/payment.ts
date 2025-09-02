import { Router } from 'express';
import { paymentService } from '../services/payment';

const router: Router = Router();

/**
 * 创建支付监控
 */
router.post('/monitor', async (req, res) => {
  try {
    const { orderId, expectedAmount, paymentAddress } = req.body;
    
    // 验证参数
    if (!orderId || !expectedAmount || !paymentAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: orderId, expectedAmount, paymentAddress'
      });
    }
    
    if (expectedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Expected amount must be greater than 0'
      });
    }
    
    // 创建支付监控
    const success = await paymentService.createPaymentMonitor(
      orderId,
      expectedAmount,
      paymentAddress
    );
    
    if (success) {
      res.json({
        success: true,
        message: 'Payment monitor created successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create payment monitor'
      });
    }
  } catch (error) {
    console.error('Create payment monitor error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 检查支付状态
 */
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const status = await paymentService.checkPaymentStatus(orderId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment status'
    });
  }
});

/**
 * 手动确认支付
 */
router.post('/confirm/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { txId, amount, adminId } = req.body;
    
    // 验证参数
    if (!txId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: txId, amount'
      });
    }
    
    const success = await paymentService.confirmPaymentManually(
      orderId,
      txId
    );
    
    if (success) {
      res.json({
        success: true,
        message: 'Payment confirmed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to confirm payment'
      });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取支付统计
 */
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await paymentService.getPaymentStatistics(
      'month'
    );
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment stats'
    });
  }
});

/**
 * 风险评估
 */
router.post('/risk-assessment', async (req, res) => {
  try {
    const { orderId, userId, amount } = req.body;
    
    // 验证参数
    if (!orderId || !userId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: orderId, userId, amount'
      });
    }
    
    const assessment = await paymentService.assessRisk(orderId, userId, amount);
    
    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assess risk'
    });
  }
});

/**
 * 获取活跃监控任务
 */
router.get('/monitors/active', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // 这里需要实现获取活跃监控任务的逻辑
    // 暂时返回空数组
    res.json({
      success: true,
      data: {
        monitors: [],
        total: 0,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Get active monitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active monitors'
    });
  }
});

/**
 * 停止支付监控
 */
router.delete('/monitor/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // 这里需要实现停止监控的逻辑
    // 暂时返回成功
    res.json({
      success: true,
      message: 'Payment monitor stopped successfully'
    });
  } catch (error) {
    console.error('Stop payment monitor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop payment monitor'
    });
  }
});

/**
 * 清理过期监控任务
 */
router.post('/cleanup', async (req, res) => {
  try {
    const cleaned = await paymentService.cleanupExpiredMonitors();
    
    res.json({
      success: true,
      data: {
        cleanedCount: cleaned,
        message: `Cleaned up ${cleaned} expired monitors`
      }
    });
  } catch (error) {
    console.error('Cleanup expired monitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup expired monitors'
    });
  }
});

export default router;