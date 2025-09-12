/**
 * 机器人模式管理模块统一导出
 * 提供重构后的模块化架构和向后兼容接口
 */

// 导入所有模块
import { ModeDispatcher } from './controllers/ModeDispatcher.js';
import { ModeSwitchController } from './controllers/ModeSwitchController.js';
import { PollingController } from './controllers/PollingController.js';
import { WebhookController } from './controllers/WebhookController.js';
import { PollingKeyboardHandler } from './controllers/polling/PollingKeyboardHandler.js';
import { BasicSyncService } from './controllers/shared/BasicSyncService.js';
import { ConfigValidationService } from './controllers/shared/ConfigValidationService.js';
import { KeyboardSyncService } from './controllers/shared/KeyboardSyncService.js';
import { WebhookKeyboardHandler } from './controllers/webhook/WebhookKeyboardHandler.js';
import { WebhookManagementService } from './controllers/webhook/WebhookManagementService.js';
import { BotRestartService } from './services/BotRestartService.js';
import { ModeValidationService } from './services/ModeValidationService.js';
import { WebhookSetupService } from './services/WebhookSetupService.js';
import { ModeDataValidator } from './validators/ModeDataValidator.js';
import { WebhookValidator } from './validators/WebhookValidator.js';

// 控制器导出
export { ModeDispatcher } from './controllers/ModeDispatcher.js';
export { ModeSwitchController } from './controllers/ModeSwitchController.js';
export { PollingController } from './controllers/PollingController.js';
export { WebhookController } from './controllers/WebhookController.js';

// 共享服务导出
export { BasicSyncService } from './controllers/shared/BasicSyncService.js';
export { ConfigValidationService } from './controllers/shared/ConfigValidationService.js';
export { KeyboardSyncService } from './controllers/shared/KeyboardSyncService.js';

// 专用处理器导出
export { PollingKeyboardHandler } from './controllers/polling/PollingKeyboardHandler.js';
export { WebhookKeyboardHandler } from './controllers/webhook/WebhookKeyboardHandler.js';
export { WebhookManagementService } from './controllers/webhook/WebhookManagementService.js';

// 服务层导出
export { BotRestartService } from './services/BotRestartService.js';
export { ModeValidationService } from './services/ModeValidationService.js';
export { WebhookSetupService } from './services/WebhookSetupService.js';

// 验证器导出
export { ModeDataValidator } from './validators/ModeDataValidator.js';
export { WebhookValidator } from './validators/WebhookValidator.js';

// 向后兼容接口 - 保持原有的函数签名

export const switchBotMode = ModeSwitchController.switchBotMode;
export const getBotWebhookStatus = WebhookController.getBotWebhookStatus;
export const applyWebhookSettings = WebhookController.applyWebhookSettings;
export const manualSyncToTelegram = ModeDispatcher.manualSyncToTelegram;

// 类型定义重导出
export type {
  ValidationResult
} from './validators/ModeDataValidator.js';

export type {
  WebhookValidationResult
} from './validators/WebhookValidator.js';

export type {
  BotValidationResult
} from './services/ModeValidationService.js';

export type {
  WebhookInfo,
  WebhookSetupResult
} from './services/WebhookSetupService.js';

export type {
  RestartResult
} from './services/BotRestartService.js';

/**
 * 模块信息
 */
export const moduleInfo = {
  name: 'BotModeManager',
  version: '2.0.0',
  description: '机器人模式管理模块 - 重构版',
  author: 'TRON Energy Rental Team',
  refactoredFrom: 'botModeHandler.ts',
  refactorDate: '2025-09-11',
  architecture: {
    controllers: [
      'ModeSwitchController - 模式切换控制器',
      'WebhookController - Webhook控制器', 
      'PollingController - 轮询和同步控制器'
    ],
    services: [
      'ModeValidationService - 模式验证服务',
      'WebhookSetupService - Webhook设置服务',
      'BotRestartService - 机器人重启服务'
    ],
    validators: [
      'ModeDataValidator - 模式数据验证器',
      'WebhookValidator - Webhook验证器'
    ]
  },
  features: [
    '模块化架构',
    '清晰的职责分离',
    '向后兼容性',
    '完整的类型定义',
    '错误处理和日志记录',
    '批量操作支持',
    '异步验证能力'
  ]
};

/**
 * 快速访问常用功能的便捷方法
 */
export const quickAccess = {
  // 模式切换
  switchMode: ModeSwitchController.switchBotMode,
  getModeStatus: ModeSwitchController.getBotModeStatus,
  batchSwitchMode: ModeSwitchController.batchSwitchMode,
  reapplyMode: ModeSwitchController.reapplyModeSettings,
  
  // Webhook管理
  getWebhookStatus: WebhookController.getBotWebhookStatus,
  applyWebhook: WebhookController.applyWebhookSettings,
  validateWebhook: WebhookController.validateWebhookConnection,
  setCustomWebhook: WebhookController.setCustomWebhook,
  deleteWebhook: WebhookController.deleteWebhook,
  getWebhookSuggestions: WebhookController.getWebhookSuggestions,
  batchWebhookOperation: WebhookController.batchWebhookOperation,
  
  // 同步功能
  manualSync: ModeDispatcher.manualSyncToTelegram,
  
  // 基础同步服务
  syncBotName: BasicSyncService.syncBotName,
  syncBotDescription: BasicSyncService.syncBotDescription,
  syncBotShortDescription: BasicSyncService.syncBotShortDescription,
  syncBotCommands: BasicSyncService.syncBotCommands,
  syncMenuButton: BasicSyncService.syncMenuButton,
  
  // 键盘服务
  buildReplyKeyboard: KeyboardSyncService.buildReplyKeyboard,
  buildInlineKeyboard: KeyboardSyncService.buildInlineKeyboard,
  validateKeyboardConfig: KeyboardSyncService.validateKeyboardConfig,
  getChatIdFromUpdates: KeyboardSyncService.getChatIdFromUpdates,
  
  // 配置验证
  validateKeyboardType: ConfigValidationService.validateKeyboardType,
  validatePriceConfig: ConfigValidationService.validatePriceConfig,
  
  // 验证功能
  validateBot: ModeValidationService.validateBotExists,
  validateToken: ModeValidationService.validateBotToken,
  validateModeSwitch: ModeValidationService.validateModeSwitch,
  validateWebhookUrl: WebhookValidator.validateWebhookUrl,
  validateWebhookConfig: WebhookValidator.validateWebhookConfig,
  
  // 服务功能
  updateWorkMode: BotRestartService.updateBotWorkMode,
  checkBotStatus: BotRestartService.checkBotRunningStatus,
  triggerRestart: BotRestartService.triggerSoftRestart,
  setWebhook: WebhookSetupService.setWebhook,
  removeWebhook: WebhookSetupService.deleteWebhook
};

/**
 * 使用示例和最佳实践
 */
export const usageExamples = {
  // 基本模式切换
  basicModeSwitch: `
    import { switchBotMode } from './mode/index.js';
    
    // 在路由中使用
    router.post('/bots/:id/switch-mode', switchBotMode);
  `,
  
  // 使用新架构
  newArchitecture: `
    import { ModeSwitchController, ModeValidationService } from './mode/index.js';
    
    // 验证然后切换
    const validation = await ModeValidationService.validateBotExists(botId);
    if (validation.isValid) {
      await ModeSwitchController.switchBotMode(req, res);
    }
  `,
  
  // 批量操作
  batchOperation: `
    import { quickAccess } from './mode/index.js';
    
    // 批量切换模式
    router.post('/bots/batch-switch', quickAccess.batchSwitchMode);
    
    // 批量Webhook操作
    router.post('/bots/batch-webhook', quickAccess.batchWebhookOperation);
  `
};

// 默认导出（用于 CommonJS 兼容性）
export default {
  // 控制器
  ModeSwitchController,
  WebhookController,
  PollingController,
  ModeDispatcher,
  
  // 共享服务
  BasicSyncService,
  KeyboardSyncService,
  ConfigValidationService,
  
  // 专用处理器
  PollingKeyboardHandler,
  WebhookKeyboardHandler,
  WebhookManagementService,
  
  // 服务
  ModeValidationService,
  WebhookSetupService,
  BotRestartService,
  
  // 验证器
  ModeDataValidator,
  WebhookValidator,
  
  // 向后兼容函数
  switchBotMode,
  getBotWebhookStatus,
  applyWebhookSettings,
  manualSyncToTelegram,
  
  // 便捷访问
  quickAccess,
  
  // 模块信息
  moduleInfo,
  usageExamples
};
