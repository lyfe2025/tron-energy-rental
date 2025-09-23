/**
 * 机器人更新处理器
 * 重构后的入口文件，使用模块化结构
 */
import type { RouteHandler } from '../types.ts';
import { BotUpdateHandler } from './update/index.ts';

/**
 * 更新机器人信息
 * PUT /api/bots/:id
 * 权限：管理员
 */
export const updateBot: RouteHandler = BotUpdateHandler.updateBot;

/**
 * 删除机器人
 * DELETE /api/bots/:id
 * 权限：管理员
 */
export const deleteBot: RouteHandler = BotUpdateHandler.deleteBot;

/**
 * 批量删除机器人
 * POST /api/bots/batch-delete
 * 权限：管理员
 */
export const batchDeleteBots: RouteHandler = BotUpdateHandler.batchDeleteBots;

/**
 * 恢复软删除的机器人
 * POST /api/bots/:id/restore
 * 权限：管理员
 */
export const restoreBot: RouteHandler = BotUpdateHandler.restoreBot;

/**
 * 同步机器人到Telegram API
 * POST /api/bots/:id/sync
 * 权限：管理员
 */
export const syncBotToTelegram: RouteHandler = BotUpdateHandler.syncBotToTelegram;

/**
 * 获取更新历史
 * GET /api/bots/:id/history
 * 权限：管理员
 */
export const getUpdateHistory: RouteHandler = BotUpdateHandler.getUpdateHistory;

/**
 * 获取删除历史
 * GET /api/bots/delete-history
 * 权限：管理员
 */
export const getDeleteHistory: RouteHandler = BotUpdateHandler.getDeleteHistory;

/**
 * 清理过期的软删除机器人
 * POST /api/bots/cleanup-expired
 * 权限：管理员
 */
export const cleanupExpiredDeletes: RouteHandler = BotUpdateHandler.cleanupExpiredDeletes;

/**
 * 检查Telegram API连接性
 * GET /api/bots/telegram-api-connectivity
 * 权限：认证用户
 */
export const checkTelegramApiConnectivity: RouteHandler = BotUpdateHandler.checkTelegramApiConnectivity;

/**
 * 健康检查
 * GET /api/bots/update-health
 * 权限：公开
 */
export const healthCheck: RouteHandler = BotUpdateHandler.healthCheck;
