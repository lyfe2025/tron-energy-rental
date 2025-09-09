/**
 * 日志管理路由 - 模块化整合入口
 * 重新导出拆分后的路由模块
 */
import { Router } from 'express';
import { param, query } from 'express-validator';
import { authenticateToken, requirePermission } from '../../../middleware/rbac.js';
import { handleValidationErrors } from '../../../middleware/validation.js';

// 导入控制器
import { LoginLogsController } from './controllers/LoginLogsController.js';
import { LogsManagementController } from './controllers/LogsManagementController.js';
import { LogsStatsController } from './controllers/LogsStatsController.js';
import { OperationLogsController } from './controllers/OperationLogsController.js';
import { SystemMonitoringLogsController } from './controllers/SystemMonitoringLogsController.js';

// 导入日志轮转管理路由
import logRotationRouter from './management.js';

const router: Router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// ========================
// 操作日志相关路由
// ========================

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
], OperationLogsController.getList);

/**
 * 获取操作日志详情
 * GET /api/system/logs/operations/:id
 */
router.get('/operations/:id', [
  requirePermission('system:log:operation:list'),
  param('id').isInt({ min: 1 }).withMessage('日志ID必须是正整数'),
  handleValidationErrors
], OperationLogsController.getDetail);

/**
 * 批量删除操作日志
 * DELETE /api/system/logs/operations/batch-delete
 */
router.delete('/operations/batch-delete', [
  requirePermission('system:log:operation:delete')
], OperationLogsController.batchDelete);

/**
 * 获取特定用户的操作日志
 * GET /api/system/logs/user/:userId/operations
 */
router.get('/user/:userId/operations', [
  requirePermission('system:log:operation:list'),
  param('userId').isInt({ min: 1 }).withMessage('用户ID必须是正整数')
], OperationLogsController.getUserOperationLogs);

/**
 * 获取操作统计数据
 * GET /api/system/logs/operations/stats
 */
router.get('/operations/stats', [
  requirePermission('system:log:operation:list')
], OperationLogsController.getOperationStats);

// ========================
// 登录日志相关路由
// ========================

/**
 * 获取登录日志列表
 * GET /api/system/logs/logins
 */
router.get('/logins', [
  requirePermission('system:log:login:list'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('user_id').optional().isUUID().withMessage('用户ID必须是有效的UUID'),
  query('login_status').optional().isIn(['success', 'failed']).withMessage('状态必须是success或failed'),
  query('ip_address').optional().isString().withMessage('IP地址必须是字符串'),
  query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
  query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
  handleValidationErrors
], LoginLogsController.getList);

/**
 * 获取登录日志详情
 * GET /api/system/logs/logins/:id
 */
router.get('/logins/:id', [
  requirePermission('system:log:login:list'),
  param('id').isInt({ min: 1 }).withMessage('日志ID必须是正整数'),
  handleValidationErrors
], LoginLogsController.getDetail);

/**
 * 批量删除登录日志
 * DELETE /api/system/logs/logins/batch-delete
 */
router.delete('/logins/batch-delete', [
  requirePermission('system:log:login:delete')
], LoginLogsController.batchDelete);

/**
 * 获取登录统计数据
 * GET /api/system/logs/logins/stats
 */
router.get('/logins/stats', [
  requirePermission('system:log:login:list')
], LoginLogsController.getLoginStats);

/**
 * 获取安全警报
 * GET /api/system/logs/logins/security-alerts
 */
router.get('/logins/security-alerts', [
  requirePermission('system:log:login:list')
], LoginLogsController.getSecurityAlerts);

// ========================
// 统计分析相关路由
// ========================

/**
 * 获取综合日志统计
 * GET /api/system/logs/stats
 */
router.get('/stats', [
  requirePermission('system:log:stats')
], LogsStatsController.getStats);

/**
 * 获取登录趋势数据
 * GET /api/system/logs/stats/login-trend
 */
router.get('/stats/login-trend', [
  requirePermission('system:log:stats'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('天数必须在1-365之间'),
  handleValidationErrors
], LogsStatsController.getLoginTrend);

/**
 * 获取操作趋势数据
 * GET /api/system/logs/stats/operation-trend
 */
router.get('/stats/operation-trend', [
  requirePermission('system:log:stats'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('天数必须在1-365之间'),
  handleValidationErrors
], LogsStatsController.getOperationTrend);

/**
 * 获取用户活跃度统计
 * GET /api/system/logs/stats/user-activity
 */
router.get('/stats/user-activity', [
  requirePermission('system:log:stats'),
  query('period').optional().isInt({ min: 1, max: 365 }).withMessage('统计周期必须在1-365天之间'),
  handleValidationErrors
], LogsStatsController.getUserActivity);

/**
 * 获取系统使用峰值统计
 * GET /api/system/logs/stats/peak-usage
 */
router.get('/stats/peak-usage', [
  requirePermission('system:log:stats')
], LogsStatsController.getPeakUsage);

// ========================
// 系统监控日志相关路由
// ========================

/**
 * 获取系统监控日志列表
 * GET /api/system/logs/system
 */
router.get('/system', [
  requirePermission('system:log:system:list'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('level').optional().isString().withMessage('日志级别必须是字符串'),
  query('module').optional().isString().withMessage('模块名称必须是字符串'),
  query('message').optional().isString().withMessage('消息内容必须是字符串'),
  query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
  query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
  query('user_id').optional().isUUID().withMessage('用户ID必须是有效的UUID'),
  handleValidationErrors
], SystemMonitoringLogsController.getList);

/**
 * 获取系统监控日志详情
 * GET /api/system/logs/system/:id
 */
router.get('/system/:id', [
  requirePermission('system:log:system:list'),
  param('id').isUUID().withMessage('日志ID必须是有效的UUID'),
  handleValidationErrors
], SystemMonitoringLogsController.getDetail);

/**
 * 获取系统监控日志统计
 * GET /api/system/logs/system/stats
 */
router.get('/system/stats', [
  requirePermission('system:log:system:list')
], SystemMonitoringLogsController.getStats);

// ========================
// 日志管理相关路由
// ========================

/**
 * 导出日志
 * POST /api/system/logs/export
 */
router.post('/export', [
  requirePermission('system:log:export')
], LogsManagementController.exportLogs);

/**
 * 获取清理配置
 * GET /api/system/logs/cleanup/config
 */
router.get('/cleanup/config', [
  requirePermission('system:log:cleanup')
], LogsManagementController.getCleanupConfig);

/**
 * 更新清理配置
 * PUT /api/system/logs/cleanup/config
 */
router.put('/cleanup/config', [
  requirePermission('system:log:cleanup')
], LogsManagementController.updateCleanupConfig);

/**
 * 获取清理预览
 * GET /api/system/logs/cleanup/preview
 */
router.get('/cleanup/preview', [
  requirePermission('system:log:cleanup'),
  query('type').isIn(['operations', 'logins', 'both']).withMessage('清理类型必须是operations、logins或both'),
  query('retention_days').isInt({ min: 7, max: 3650 }).withMessage('保留天数必须在7-3650之间'),
  handleValidationErrors
], LogsManagementController.getCleanupPreview);

/**
 * 执行日志清理
 * POST /api/system/logs/cleanup
 */
router.post('/cleanup', [
  requirePermission('system:log:cleanup')
], LogsManagementController.cleanupLogs);

// ========================
// 日志轮转管理相关路由
// ========================

/**
 * 日志轮转管理路由
 * /api/system/logs/rotation/*
 */
router.use('/rotation', logRotationRouter);

export default router;
