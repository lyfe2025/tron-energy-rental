/**
 * 机器人创建处理器
 * 重构后的入口文件，使用模块化结构
 */
import type { RouteHandler } from '../types.ts';
import { BotCreateHandler } from './create/index.ts';

/**
 * 创建新机器人
 * POST /api/bots
 * 权限：管理员
 */
export const createBot: RouteHandler = BotCreateHandler.createBot;

/**
 * 验证机器人Token
 * POST /api/bots/verify-token
 * 权限：管理员
 */
export const verifyBotToken: RouteHandler = BotCreateHandler.verifyBotToken;

/**
 * 检查名称和用户名可用性
 * GET /api/bots/check-availability
 * 权限：管理员
 */
export const checkAvailability: RouteHandler = BotCreateHandler.checkAvailability;

/**
 * 获取默认配置模板
 * GET /api/bots/default-configs
 * 权限：管理员
 */
export const getDefaultConfigs: RouteHandler = BotCreateHandler.getDefaultConfigs;

/**
 * 预览机器人配置
 * POST /api/bots/preview-config
 * 权限：管理员
 */
export const previewBotConfig: RouteHandler = BotCreateHandler.previewBotConfig;

/**
 * 健康检查
 * GET /api/bots/health
 * 权限：公开
 */
export const healthCheck: RouteHandler = BotCreateHandler.healthCheck;
