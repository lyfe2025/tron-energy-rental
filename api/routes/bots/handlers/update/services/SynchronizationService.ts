/**
 * 同步服务 - 适配器文件
 * 保持向后兼容性，重新导出新的模块化同步服务
 * 
 * 注意：此文件已重构为模块化架构，原始实现已移至 sync/ 目录
 */
export { SynchronizationService } from './sync/SynchronizationService';

// 为了完全向后兼容，也导出各个子模块（如果有代码直接使用的话）
export {
    BotInfoSyncer,
    CommandSyncer, SyncDataValidator, TelegramApiClient, TokenValidator, WebhookSyncer
} from './sync';

