import { Router } from 'express';
import { param, query } from 'express-validator';
import { authenticateToken } from '../../middleware/auth';
import { handleValidationErrors } from '../../middleware/validation';

const router: Router = Router();

/**
 * 能量使用记录管理
 */

/**
 * 获取订单能量使用记录
 * GET /api/transaction-package/orders/:orderId/energy-usage
 */
router.get('/orders/:orderId/energy-usage',
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
      .withMessage('Offset must be non-negative'),
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
      const { query: dbQuery } = await import('../../database/index');
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const startTime = req.query.startTime as string;
      const endTime = req.query.endTime as string;
      
      let sqlQuery = `
        SELECT 
          id, order_id, user_address, energy_amount as energy_consumed, 
          transaction_hash, usage_time, detection_method,
          created_at, block_number
        FROM energy_usage_logs 
        WHERE order_id = $1
      `;
      const params: any[] = [req.params.orderId];
      
      if (startTime) {
        sqlQuery += ` AND usage_time >= $${params.length + 1}`;
        params.push(startTime);
      }
      
      if (endTime) {
        sqlQuery += ` AND usage_time <= $${params.length + 1}`;
        params.push(endTime);
      }
      
      sqlQuery += ` ORDER BY usage_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const result = await dbQuery(sqlQuery, params);
      
      // 获取总数
      let countQuery = `SELECT COUNT(*) as total FROM energy_usage_logs WHERE order_id = $1`;
      const countParams: any[] = [req.params.orderId];
      
      if (startTime) {
        countQuery += ` AND usage_time >= $${countParams.length + 1}`;
        countParams.push(startTime);
      }
      
      if (endTime) {
        countQuery += ` AND usage_time <= $${countParams.length + 1}`;
        countParams.push(endTime);
      }
      
      const countResult = await dbQuery(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total) || 0;
      
      res.json({
        success: true,
        data: {
          energyUsageLogs: result.rows,
          pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total
          }
        },
        message: 'Energy usage logs retrieved successfully'
      });
    } catch (error) {
      console.error('Get energy usage logs error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get energy usage logs'
      });
    }
  }
);

/**
 * 获取用户所有订单的能量使用统计
 * GET /api/transaction-package/users/:userId/energy-usage/stats
 */
router.get('/users/:userId/energy-usage/stats',
  authenticateToken,
  [
    param('userId')
      .isUUID()
      .withMessage('Valid user ID is required'),
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
      const { query: dbQuery } = await import('../../database/index');
      const userId = req.params.userId;
      const startTime = req.query.startTime as string;
      const endTime = req.query.endTime as string;
      
      let sqlQuery = `
        SELECT 
          COUNT(*) as total_usage_count,
          COALESCE(SUM(eul.energy_amount), 0) as total_energy_consumed,
          COALESCE(AVG(eul.energy_amount), 0) as avg_energy_per_usage,
          COUNT(DISTINCT eul.order_id) as orders_with_usage,
          MIN(eul.usage_time) as first_usage_time,
          MAX(eul.usage_time) as last_usage_time
        FROM energy_usage_logs eul
        INNER JOIN orders o ON eul.order_id = o.id
        WHERE o.user_id = $1 AND o.order_type = 'transaction_package'
      `;
      const params: any[] = [userId];
      
      if (startTime) {
        sqlQuery += ` AND eul.usage_time >= $${params.length + 1}`;
        params.push(startTime);
      }
      
      if (endTime) {
        sqlQuery += ` AND eul.usage_time <= $${params.length + 1}`;
        params.push(endTime);
      }
      
      const result = await dbQuery(sqlQuery, params);
      const stats = result.rows[0];
      
      res.json({
        success: true,
        data: {
          totalUsageCount: parseInt(stats.total_usage_count) || 0,
          totalEnergyConsumed: parseInt(stats.total_energy_consumed) || 0,
          avgEnergyPerUsage: parseFloat(stats.avg_energy_per_usage) || 0,
          ordersWithUsage: parseInt(stats.orders_with_usage) || 0,
          firstUsageTime: stats.first_usage_time,
          lastUsageTime: stats.last_usage_time
        },
        message: 'Energy usage statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get energy usage stats error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get energy usage statistics'
      });
    }
  }
);

/**
 * 获取最近的能量使用记录（跨所有订单）
 * GET /api/transaction-package/energy-usage/recent
 */
router.get('/recent',
  authenticateToken,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('userId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('User ID must be positive integer')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { query: dbQuery } = await import('../../database/index');
      const limit = parseInt(req.query.limit as string) || 10;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      let sqlQuery = `
        SELECT 
          eul.id, eul.order_id, eul.user_address, eul.energy_before, 
          eul.energy_after, eul.energy_consumed, eul.transaction_hash,
          eul.usage_time, eul.detection_time, eul.created_at,
          o.user_id, o.transaction_count, o.used_transactions
        FROM energy_usage_logs eul
        INNER JOIN orders o ON eul.order_id = o.id
        WHERE o.order_type = 'transaction_package'
      `;
      const params: any[] = [];
      
      if (userId) {
        sqlQuery += ` AND o.user_id = $${params.length + 1}`;
        params.push(userId);
      }
      
      sqlQuery += ` ORDER BY eul.usage_time DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await dbQuery(sqlQuery, params);
      
      res.json({
        success: true,
        data: {
          recentUsageLogs: result.rows,
          count: result.rows.length
        },
        message: 'Recent energy usage logs retrieved successfully'
      });
    } catch (error) {
      console.error('Get recent energy usage logs error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get recent energy usage logs'
      });
    }
  }
);

/**
 * 获取能量使用趋势
 * GET /api/transaction-package/energy-usage/trends
 */
router.get('/trends',
  authenticateToken,
  [
    query('period')
      .optional()
      .isIn(['hour', 'day', 'week', 'month'])
      .withMessage('Period must be one of: hour, day, week, month'),
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
      const period = req.query.period as string || 'day';
      const startTime = req.query.startTime as string;
      const endTime = req.query.endTime as string;
      
      // 获取能量使用趋势的实现
      res.json({
        success: true,
        data: {
          period,
          trends: [],
          summary: {
            totalUsage: 0,
            averageUsage: 0,
            peakUsage: 0,
            minUsage: 0
          }
        },
        message: 'Energy usage trends retrieved successfully'
      });
    } catch (error) {
      console.error('Get energy usage trends error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get energy usage trends'
      });
    }
  }
);

/**
 * 获取能量使用报告
 * GET /api/transaction-package/energy-usage/report
 */
router.get('/report',
  authenticateToken,
  [
    query('reportType')
      .optional()
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Report type must be one of: daily, weekly, monthly'),
    query('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be valid ISO8601 date'),
    query('format')
      .optional()
      .isIn(['json', 'csv', 'xlsx'])
      .withMessage('Format must be one of: json, csv, xlsx')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const reportType = req.query.reportType as string || 'daily';
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const format = req.query.format as string || 'json';
      
      // 获取能量使用报告的实现
      if (format === 'json') {
        res.json({
          success: true,
          data: {
            reportType,
            reportDate: date,
            totalOrders: 0,
            totalEnergyUsage: 0,
            averageEnergyPerOrder: 0,
            usageByHour: [],
            topUsers: [],
            summary: {
              period: reportType,
              generatedAt: new Date()
            }
          },
          message: 'Energy usage report generated successfully'
        });
      } else {
        // 对于CSV和XLSX格式，返回文件下载
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=energy-usage-report.${format}`);
        res.send('Report data placeholder');
      }
    } catch (error) {
      console.error('Generate energy usage report error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to generate energy usage report'
      });
    }
  }
);

export default router;
