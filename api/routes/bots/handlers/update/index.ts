/**
 * 机器人更新处理器主入口
 * 统一管理机器人更新、删除、同步和历史查询等功能
 * 重构后的模块化架构，保持原有API接口不变
 */
import { BotUpdateController } from './controllers/BotUpdateController.ts';
import { DeleteController } from './controllers/DeleteController.ts';
import { HistoryController } from './controllers/HistoryController.ts';
import { SyncController } from './controllers/SyncController.ts';

/**
 * 主要的机器人更新处理器类
 * 保持原有API接口，内部委托给各个专门的控制器
 */
export class BotUpdateHandler {
  // 更新相关方法 - 委托给BotUpdateController
  static updateBot = BotUpdateController.updateBot;
  static healthCheck = BotUpdateController.healthCheck;

  // 删除相关方法 - 委托给DeleteController
  static deleteBot = DeleteController.deleteBot;
  static batchDeleteBots = DeleteController.batchDeleteBots;
  static restoreBot = DeleteController.restoreBot;
  static cleanupExpiredDeletes = DeleteController.cleanupExpiredDeletes;

  // 同步相关方法 - 委托给SyncController
  static syncBotToTelegram = SyncController.syncBotToTelegram;
  static checkTelegramApiConnectivity = SyncController.checkTelegramApiConnectivity;

  // 历史查询方法 - 委托给HistoryController
  static getUpdateHistory = HistoryController.getUpdateHistory;
  static getDeleteHistory = HistoryController.getDeleteHistory;
}

// 兼容性导出，支持原始函数调用方式
export const updateBot = BotUpdateHandler.updateBot;
export const deleteBot = BotUpdateHandler.deleteBot;
export const checkTelegramApiConnectivity = BotUpdateHandler.checkTelegramApiConnectivity;

// 导出所有控制器，支持直接使用
export {
  BotUpdateController,
  DeleteController, HistoryController, SyncController
};

