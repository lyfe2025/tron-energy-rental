import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { energyDelegationService } from '../services/energy-delegation';
// import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router: Router = Router();

/**
 * 执行能量委托
 * POST /api/energy-delegation/delegate
 */
router.post('/delegate',
  authenticateToken,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('recipientAddress').notEmpty().withMessage('Recipient address is required'),
    body('energyAmount').isInt({ min: 1 }).withMessage('Energy amount must be a positive integer'),
    body('durationHours').isInt({ min: 1, max: 72 }).withMessage('Duration must be between 1 and 72 hours'),
    body('poolAllocation').optional().isArray().withMessage('Pool allocation must be an array')
  ],
  // validateRequest,
  async (req, res) => {
    try {
      const { orderId, recipientAddress, energyAmount, durationHours, poolAllocation } = req.body;
      
      const result = await energyDelegationService.executeDelegation({
        orderId,
        recipientAddress,
        energyAmount,
        durationHours,
        poolAllocation
      });
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            delegationId: result.delegationId,
            txId: result.txId
          },
          message: 'Energy delegation executed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          message: 'Energy delegation failed'
        });
      }
    } catch (error) {
      console.error('Energy delegation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to execute energy delegation'
      });
    }
  }
);

/**
 * 获取委托状态
 * GET /api/energy-delegation/:delegationId/status
 */
router.get('/:delegationId/status',
  authenticateToken,
  [
    param('delegationId').notEmpty().withMessage('Delegation ID is required')
  ],
  // validateRequest,
  async (req, res) => {
    try {
      const { delegationId } = req.params;
      
      const delegation = await energyDelegationService.getDelegationStatus(delegationId);
      
      if (delegation) {
        res.json({
          success: true,
          data: delegation,
          message: 'Delegation status retrieved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Delegation not found',
          message: 'The specified delegation does not exist'
        });
      }
    } catch (error) {
      console.error('Get delegation status error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get delegation status'
      });
    }
  }
);

/**
 * 处理委托到期
 * POST /api/energy-delegation/:delegationId/expire
 */
router.post('/:delegationId/expire',
  authenticateToken,
  [
    param('delegationId').notEmpty().withMessage('Delegation ID is required')
  ],
  // validateRequest,
  async (req, res) => {
    try {
      const { delegationId } = req.params;
      
      await energyDelegationService.handleDelegationExpiry(delegationId);
      
      res.json({
        success: true,
        message: 'Delegation expiry processed successfully'
      });
    } catch (error) {
      console.error('Handle delegation expiry error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process delegation expiry'
      });
    }
  }
);

/**
 * 获取用户委托历史
 * GET /api/energy-delegation/user/:userId/history
 */
router.get('/user/:userId/history',
  authenticateToken,
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  // validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const delegations = await energyDelegationService.getUserDelegations(userId, limit, offset);
      
      res.json({
        success: true,
        data: {
          delegations,
          pagination: {
            limit,
            offset,
            total: delegations.length
          }
        },
        message: 'User delegation history retrieved successfully'
      });
    } catch (error) {
      console.error('Get user delegations error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get user delegation history'
      });
    }
  }
);

/**
 * 批量处理到期委托
 * POST /api/energy-delegation/batch/expire
 */
router.post('/batch/expire',
  authenticateToken,
  async (req, res) => {
    try {
      // 获取所有到期的委托
      const { query } = await import('../database/index');
      const result = await query(
        `SELECT id FROM delegate_records 
         WHERE status = $1 AND expires_at < $2`,
        ['active', new Date()]
      );
      const expiredDelegations = result.rows;
      
      if (!expiredDelegations || expiredDelegations.length === 0) {
        return res.json({
          success: true,
          data: { processed: 0 },
          message: 'No expired delegations found'
        });
      }
      
      // 批量处理到期委托
      let processed = 0;
      for (const delegation of expiredDelegations) {
        try {
          await energyDelegationService.handleDelegationExpiry(delegation.id);
          processed++;
        } catch (error) {
          console.error(`Failed to process delegation ${delegation.id}:`, error);
        }
      }
      
      res.json({
        success: true,
        data: {
          total: expiredDelegations.length,
          processed,
          failed: expiredDelegations.length - processed
        },
        message: `Processed ${processed} expired delegations`
      });
    } catch (error) {
      console.error('Batch expire delegations error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process expired delegations'
      });
    }
  }
);

/**
 * 获取委托统计信息
 * GET /api/energy-delegation/stats
 */
router.get('/stats',
  authenticateToken,
  async (req, res) => {
    try {
      const { query } = await import('../database/index');
      
      // 获取委托统计
      const [activeResult, totalResult, todayResult] = await Promise.all([
        query(
          `SELECT COUNT(*) as count, COALESCE(SUM(energy_amount), 0) as total_energy 
           FROM delegate_records WHERE status = $1`,
          ['active']
        ),
        query(
          `SELECT COUNT(*) as count, COALESCE(SUM(energy_amount), 0) as total_energy 
           FROM delegate_records`
        ),
        query(
          `SELECT COUNT(*) as count, COALESCE(SUM(energy_amount), 0) as total_energy 
           FROM delegate_records WHERE created_at >= $1`,
          [new Date(new Date().setHours(0, 0, 0, 0))]
        )
      ]);
      
      // 计算总能量
      const activeTotalEnergy = parseInt(activeResult.rows[0].total_energy) || 0;
      const totalEnergy = parseInt(totalResult.rows[0].total_energy) || 0;
      const todayTotalEnergy = parseInt(todayResult.rows[0].total_energy) || 0;
      
      res.json({
        success: true,
        data: {
          active: {
            count: parseInt(activeResult.rows[0].count) || 0,
            totalEnergy: activeTotalEnergy
          },
          total: {
            count: parseInt(totalResult.rows[0].count) || 0,
            totalEnergy: totalEnergy
          },
          today: {
            count: parseInt(todayResult.rows[0].count) || 0,
            totalEnergy: todayTotalEnergy
          }
        },
        message: 'Delegation statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get delegation stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get delegation statistics'
      });
    }
  }
);

export default router;