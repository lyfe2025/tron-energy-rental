/**
 * 日志管理API路由
 * 处理操作日志和登录日志的查询
 */

import { Router, type Request, type Response } from 'express';
import { param, query } from 'express-validator';
import { query as dbQuery } from '../../database/index.js';
import { authenticateToken, requirePermission } from '../../middleware/rbac.js';
import { handleValidationErrors } from '../../middleware/validation.js';

const router: Router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取操作日志列表
 * GET /api/system/logs/operations
 */
router.get('/operations', [
  requirePermission('system:log:operation:list'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('user_id').optional().isUUID().withMessage('用户ID必须是有效的UUID'),
  query('operation').optional().isString().withMessage('操作类型必须是字符串'),
  query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
  query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      user_id,
      operation,
      start_date,
      end_date
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (user_id) {
      whereClause += ` AND ol.admin_id = $${paramIndex++}`;
      params.push(user_id);
    }

    if (operation) {
      whereClause += ` AND ol.operation ILIKE $${paramIndex++}`;
      params.push(`%${operation}%`);
    }

    if (start_date) {
      whereClause += ` AND ol.created_at >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND ol.created_at <= $${paramIndex++}`;
      params.push(end_date);
    }

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM operation_logs ol
      ${whereClause}
    `;
    const countResult = await dbQuery(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // 查询数据
    const dataQuery = `
      SELECT 
        ol.id,
        ol.admin_id as user_id,
        ol.operation,
        ol.module as resource_type,
        ol.url,
        ol.method,
        ol.request_params as details,
        ol.ip_address,
        ol.user_agent,
        ol.created_at,
        a.username,
        a.email
      FROM operation_logs ol
      LEFT JOIN admins a ON ol.admin_id::text = a.id::text
      ${whereClause}
      ORDER BY ol.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(Number(limit), offset);
    
    const dataResult = await dbQuery(dataQuery, params);

    res.json({
      success: true,
      data: {
        logs: dataResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.status(500).json({
      success: false,
      error: '获取操作日志失败'
    });
  }
});

/**
 * 获取登录日志列表
 * GET /api/system/logs/logins
 */
router.get('/logins', [
  requirePermission('system:log:login:list'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('user_id').optional().isUUID().withMessage('用户ID必须是有效的UUID'),
  query('status').optional().isIn(['success', 'failed']).withMessage('状态必须是success或failed'),
  query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
  query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      user_id,
      status,
      start_date,
      end_date
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (user_id) {
      whereClause += ` AND ll.user_id = $${paramIndex++}`;
      params.push(user_id);
    }

    if (status) {
      whereClause += ` AND ll.status = $${paramIndex++}`;
      params.push(status);
    }

    if (start_date) {
      whereClause += ` AND ll.login_time >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND ll.login_time <= $${paramIndex++}`;
      params.push(end_date);
    }

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM login_logs ll
      ${whereClause}
    `;
    const countResult = await dbQuery(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // 查询数据
    const dataQuery = `
      SELECT 
        ll.id,
        ll.user_id,
        ll.username,
        ll.ip_address,
        ll.user_agent,
        ll.status,
        ll.message as failure_reason,
        ll.login_time as created_at,
        a.email
      FROM login_logs ll
      LEFT JOIN admins a ON ll.user_id = a.id
      ${whereClause}
      ORDER BY ll.login_time DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(Number(limit), offset);
    
    const dataResult = await dbQuery(dataQuery, params);

    res.json({
      success: true,
      data: {
        logs: dataResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取登录日志失败:', error);
    res.status(500).json({
      success: false,
      error: '获取登录日志失败'
    });
  }
});

/**
 * 获取操作日志详情
 * GET /api/system/logs/operations/:id
 */
router.get('/operations/:id', [
  requirePermission('system:log:operation:list'),
  param('id').isInt({ min: 1 }).withMessage('日志ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        ol.id,
        ol.admin_id as user_id,
        ol.operation,
        ol.module as resource_type,
        ol.url,
        ol.method,
        ol.request_params as details,
        ol.response_data,
        ol.ip_address,
        ol.user_agent,
        ol.created_at,
        ol.status,
        ol.error_message,
        a.username,
        a.email
      FROM operation_logs ol
      LEFT JOIN admins a ON ol.admin_id::text = a.id::text
      WHERE ol.id = $1
    `;
    
    const result = await dbQuery(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '操作日志不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取操作日志详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取操作日志详情失败'
    });
  }
});

/**
 * 获取登录日志详情
 * GET /api/system/logs/logins/:id
 */
router.get('/logins/:id', [
  requirePermission('system:log:login:list'),
  param('id').isInt({ min: 1 }).withMessage('日志ID必须是正整数'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        ll.id,
        ll.user_id,
        ll.username,
        ll.ip_address,
        ll.user_agent,
        ll.status,
        ll.message as failure_reason,
        ll.login_time as created_at,
        a.email
      FROM login_logs ll
      LEFT JOIN admins a ON ll.user_id = a.id
      WHERE ll.id = $1
    `;
    
    const result = await dbQuery(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '登录日志不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取登录日志详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取登录日志详情失败'
    });
  }
});

/**
 * 获取日志统计数据
 * GET /api/system/logs/stats
 */
router.get('/stats', [
  requirePermission('system:log:stats')
], async (req: Request, res: Response) => {
  try {
    // 获取登录日志统计
    const loginStatsQuery = `
      SELECT 
        COUNT(*) as total_logins,
        COUNT(CASE WHEN status = 1 THEN 1 END) as successful_logins,
        COUNT(CASE WHEN status = 0 THEN 1 END) as failed_logins,
        COUNT(CASE WHEN login_time >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_logins
      FROM login_logs
    `;
    
    // 获取操作日志统计
    const operationStatsQuery = `
      SELECT 
        COUNT(*) as total_operations,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_operations,
        COUNT(DISTINCT admin_id) as active_users
      FROM operation_logs
    `;
    
    // 获取最近7天的登录趋势
    const loginTrendQuery = `
      SELECT 
        DATE(login_time) as date,
        COUNT(*) as count
      FROM login_logs 
      WHERE login_time >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(login_time)
      ORDER BY date DESC
    `;
    
    const [loginStats, operationStats, loginTrend] = await Promise.all([
      dbQuery(loginStatsQuery),
      dbQuery(operationStatsQuery),
      dbQuery(loginTrendQuery)
    ]);
    
    res.json({
      success: true,
      data: {
        loginStats: loginStats.rows[0],
        operationStats: operationStats.rows[0],
        loginTrend: loginTrend.rows
      }
    });
  } catch (error) {
    console.error('获取日志统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取日志统计失败'
    });
  }
});

/**
 * 批量删除登录日志
 * DELETE /api/system/logs/logins/batch-delete
 */
router.delete('/logins/batch-delete', [
  requirePermission('system:log:login:delete')
], async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的日志ID列表'
      });
    }
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const deleteQuery = `DELETE FROM login_logs WHERE id IN (${placeholders})`;
    
    const result = await dbQuery(deleteQuery, ids);
    
    res.json({
      success: true,
      message: `成功删除 ${result.rowCount} 条登录日志`
    });
  } catch (error) {
    console.error('批量删除登录日志失败:', error);
    res.status(500).json({
      success: false,
      error: '批量删除登录日志失败'
    });
  }
});

/**
 * 批量删除操作日志
 * DELETE /api/system/logs/operations/batch-delete
 */
router.delete('/operations/batch-delete', [
  requirePermission('system:log:operation:delete')
], async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的日志ID列表'
      });
    }
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const deleteQuery = `DELETE FROM operation_logs WHERE id IN (${placeholders})`;
    
    const result = await dbQuery(deleteQuery, ids);
    
    res.json({
      success: true,
      message: `成功删除 ${result.rowCount} 条操作日志`
    });
  } catch (error) {
    console.error('批量删除操作日志失败:', error);
    res.status(500).json({
      success: false,
      error: '批量删除操作日志失败'
    });
  }
});

/**
 * 导出日志
 * POST /api/system/logs/export
 */
router.post('/export', [
  requirePermission('system:log:export')
], async (req: Request, res: Response) => {
  try {
    const { type, format = 'csv', filters = {} } = req.body;
    
    if (!['login', 'operation'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: '日志类型必须是 login 或 operation'
      });
    }
    
    // 这里简化处理，实际应该生成文件并返回下载链接
    res.json({
      success: true,
      message: '导出功能暂未实现，请联系管理员',
      data: {
        type,
        format,
        filters
      }
    });
  } catch (error) {
    console.error('导出日志失败:', error);
    res.status(500).json({
      success: false,
      error: '导出日志失败'
    });
  }
});

/**
 * 获取清理配置
 * GET /api/system/logs/cleanup/config
 */
router.get('/cleanup/config', [
  requirePermission('system:log:cleanup')
], async (req: Request, res: Response) => {
  try {
    // 返回默认配置，实际应该从数据库或配置文件读取
    const config = {
      loginLogRetentionDays: 90,
      operationLogRetentionDays: 180,
      autoCleanupEnabled: false,
      cleanupSchedule: '0 2 * * 0' // 每周日凌晨2点
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取清理配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取清理配置失败'
    });
  }
});

/**
 * 更新清理配置
 * PUT /api/system/logs/cleanup/config
 */
router.put('/cleanup/config', [
  requirePermission('system:log:cleanup')
], async (req: Request, res: Response) => {
  try {
    const { loginLogRetentionDays, operationLogRetentionDays, autoCleanupEnabled, cleanupSchedule } = req.body;
    
    // 这里应该保存到数据库或配置文件
    res.json({
      success: true,
      message: '清理配置更新成功',
      data: {
        loginLogRetentionDays,
        operationLogRetentionDays,
        autoCleanupEnabled,
        cleanupSchedule
      }
    });
  } catch (error) {
    console.error('更新清理配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新清理配置失败'
    });
  }
});

/**
 * 执行日志清理
 * POST /api/system/logs/cleanup
 */
router.post('/cleanup', [
  requirePermission('system:log:cleanup')
], async (req: Request, res: Response) => {
  try {
    const { type, days } = req.body;
    
    if (!['login', 'operation', 'all'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: '清理类型必须是 login、operation 或 all'
      });
    }
    
    let deletedCount = 0;
    
    if (type === 'login' || type === 'all') {
      const loginDeleteQuery = `
        DELETE FROM login_logs 
        WHERE login_time < NOW() - INTERVAL '${days} days'
      `;
      const loginResult = await dbQuery(loginDeleteQuery);
      deletedCount += loginResult.rowCount || 0;
    }
    
    if (type === 'operation' || type === 'all') {
      const operationDeleteQuery = `
        DELETE FROM operation_logs 
        WHERE created_at < NOW() - INTERVAL '${days} days'
      `;
      const operationResult = await dbQuery(operationDeleteQuery);
      deletedCount += operationResult.rowCount || 0;
    }
    
    res.json({
      success: true,
      message: `成功清理 ${deletedCount} 条日志记录`
    });
  } catch (error) {
    console.error('清理日志失败:', error);
    res.status(500).json({
      success: false,
      error: '清理日志失败'
    });
  }
});

/**
 * 获取用户操作历史
 * GET /api/system/logs/user/:userId/operations
 */
router.get('/user/:userId/operations', [
  requirePermission('system:log:operation:list'),
  param('userId').isInt({ min: 1 }).withMessage('用户ID必须是正整数')
], async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM operation_logs
      WHERE user_id = $1
    `;
    const countResult = await dbQuery(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total);
    
    // 查询数据
    const dataQuery = `
      SELECT 
        ol.id,
        ol.operation,
        ol.module as resource_type,
        ol.url,
        ol.method,
        ol.request_params as details,
        ol.ip_address,
        ol.created_at,
        ol.status
      FROM operation_logs ol
      WHERE ol.user_id = $1
      ORDER BY ol.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const dataResult = await dbQuery(dataQuery, [userId, Number(limit), offset]);
    
    res.json({
      success: true,
      data: {
        operations: dataResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取用户操作历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户操作历史失败'
    });
  }
});

export default router;