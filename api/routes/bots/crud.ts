/**
 * 机器人CRUD操作路由 - 重构后的集成入口
 * 包含：列表查询、详情获取、创建、更新、删除操作
 * 
 * 重构说明：
 * - 将原来的单一大文件分离为多个专门的处理器文件
 * - 保持完全相同的API接口和路由结构
 * - 确保功能完整性和向后兼容性
 */
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';

// 导入分离后的处理器
import { getBotsList, getBotDetails, getBotsSelector } from './handlers/botListHandler.js';
import { createBot, verifyBotToken } from './handlers/botCreateHandler.js';
import { updateBot, deleteBot } from './handlers/botUpdateHandler.js';
import { 
  switchBotMode, 
  getBotWebhookStatus, 
  applyWebhookSettings, 
  syncBotFromTelegram 
} from './handlers/botModeHandler.js';

const router: Router = Router();

// 注册路由 - 保持与原来完全相同的路由结构
router.post('/verify-token', verifyBotToken);  // Token验证端点（无需认证，用于创建机器人时验证）
router.get('/selector', authenticateToken, getBotsSelector);  // 选择器端点，只需认证
router.post('/:id/switch-mode', authenticateToken, requireAdmin, switchBotMode);  // 模式切换端点
router.get('/:id/webhook-status', authenticateToken, requireAdmin, getBotWebhookStatus);  // Webhook状态端点
router.post('/:id/apply-webhook', authenticateToken, requireAdmin, applyWebhookSettings);  // 应用Webhook设置端点
router.post('/:id/sync-from-telegram', authenticateToken, requireAdmin, syncBotFromTelegram);  // 从Telegram同步信息端点
router.get('/', authenticateToken, requireAdmin, getBotsList);
router.get('/:id', authenticateToken, requireAdmin, getBotDetails);
router.post('/', authenticateToken, requireAdmin, createBot);
router.put('/:id', authenticateToken, requireAdmin, updateBot);
router.delete('/:id', authenticateToken, requireAdmin, deleteBot);

export default router;
