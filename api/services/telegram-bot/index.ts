/**
 * Telegram Bot Service - 统一导出
 * 提供模块化架构的统一入口
 */

// 主服务
export { default as TelegramBotService } from './TelegramBotService.js';

// 核心模块
export { BotConfigManager } from './core/BotConfigManager.js';
export { BotInitializer } from './core/BotInitializer.js';
export { BotLifecycleManager } from './core/BotLifecycleManager.js';

// 通信模块
export { MessageSender } from './communication/MessageSender.js';

// Webhook 模块
export { WebhookManager } from './webhook/WebhookManager.js';

// 同步模块
export { TelegramSyncService } from './sync/TelegramSyncService.js';

// 监控模块
export { BotHealthChecker } from './monitoring/BotHealthChecker.js';

// 集成组件（保持现有架构）
export { ConfigAdapter } from './integrated/adapters/ConfigAdapter.js';
export { DatabaseAdapter } from './integrated/adapters/DatabaseAdapter.js';
export { BotOrchestrator } from './integrated/components/BotOrchestrator.js';
export { ModuleManager } from './integrated/components/ModuleManager.js';

// 类型定义
export type { MessageOptions, MessageResult } from './communication/MessageSender.js';
export type { ConfigChange } from './core/BotConfigManager.js';
export type { InitializationResult } from './core/BotInitializer.js';
export type { BotStatus, LifecycleState } from './core/BotLifecycleManager.js';
export type { BotConfig } from './integrated/types/bot.types.js';
export type { HealthCheckResult, OverallHealthStatus } from './monitoring/BotHealthChecker.js';
export type { SyncData, SyncResult } from './sync/TelegramSyncService.js';
export type { WebhookInfo, WebhookResult, WebhookSetupOptions } from './webhook/WebhookManager.js';

