/**
 * Telegram Bot Service - 统一导出
 * 提供模块化架构的统一入口
 */

// 主服务
export { default as TelegramBotService } from './TelegramBotService.ts';

// 核心模块
export { BotConfigManager } from './core/BotConfigManager.ts';
export { BotInitializer } from './core/BotInitializer.ts';
export { BotLifecycleManager } from './core/BotLifecycleManager.ts';

// 通信模块
export { MessageSender } from './communication/MessageSender.ts';

// Webhook 模块
export { WebhookManager } from './webhook/WebhookManager.ts';

// 同步模块
export { TelegramSyncService } from './sync/TelegramSyncService.ts';

// 监控模块
export { BotHealthChecker } from './monitoring/BotHealthChecker.ts';

// 集成组件（保持现有架构）
export { ConfigAdapter } from './integrated/adapters/ConfigAdapter.ts';
export { DatabaseAdapter } from './integrated/adapters/DatabaseAdapter.ts';
export { BotOrchestrator } from './integrated/components/BotOrchestrator.ts';
export { ModuleManager } from './integrated/components/ModuleManager.ts';

// 类型定义
export type { MessageOptions, MessageResult } from './communication/MessageSender.ts';
export type { ConfigChange } from './core/BotConfigManager.ts';
export type { InitializationResult } from './core/BotInitializer.ts';
export type { BotStatus, LifecycleState } from './core/BotLifecycleManager.ts';
export type { BotConfig } from './integrated/types/bot.types.ts';
export type { HealthCheckResult, OverallHealthStatus } from './monitoring/BotHealthChecker.ts';
export type { SyncData, SyncResult } from './sync/TelegramSyncService.ts';
export type { WebhookInfo, WebhookResult, WebhookSetupOptions } from './webhook/WebhookManager.ts';

