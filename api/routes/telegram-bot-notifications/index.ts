/**
 * Telegram机器人通知管理API路由
 * 提供通知配置、模板管理、手动发送等功能的REST接口
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';

// 导入控制器
import {
    getNotificationConfig,
    updateNotificationConfig
} from './controllers/ConfigController.ts';

import {
    createTemplate,
    deleteTemplate,
    getTemplates,
    updateTemplate
} from './controllers/TemplateController.ts';

import {
    getNotificationStatus,
    sendManualNotification
} from './controllers/ManualNotificationController.ts';

import {
    getNotificationAnalytics
} from './controllers/AnalyticsController.ts';

import {
    getNotificationLogs
} from './controllers/LogsController.ts';

// 导入中间件
import {
    validateConfigRequest,
    validateManualNotificationRequest,
    validateTemplateRequest
} from './middleware/notificationValidation.ts';

import {
    rateLimitApiCalls,
    rateLimitManualNotifications,
    rateLimitTemplateOperations
} from './middleware/rateLimiting.ts';

const router: Router = Router();

// 应用全局中间件
router.use(authenticateToken);
router.use(rateLimitApiCalls);

// 通知配置路由
router.get('/:botId/config', getNotificationConfig);
router.put('/:botId/config', validateConfigRequest, updateNotificationConfig);

// 消息模板路由
router.get('/:botId/templates', getTemplates);
router.post('/:botId/templates', rateLimitTemplateOperations, validateTemplateRequest, createTemplate);
router.put('/templates/:templateId', rateLimitTemplateOperations, validateTemplateRequest, updateTemplate);
router.delete('/templates/:templateId', rateLimitTemplateOperations, deleteTemplate);

// 手动通知路由
router.post('/:botId/send', rateLimitManualNotifications, validateManualNotificationRequest, sendManualNotification);

// 通知状态查询路由
router.get('/status/:notificationId', getNotificationStatus);

// 通知记录查询路由
router.get('/:botId/logs', getNotificationLogs);

// 统计分析路由
router.get('/:botId/analytics', getNotificationAnalytics);

export default router;
