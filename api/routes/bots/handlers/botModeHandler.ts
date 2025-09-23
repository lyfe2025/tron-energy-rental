/**
 * 机器人模式管理处理器 - 向后兼容接口
 * 
 * 此文件已重构为模块化架构，原始代码已备份为 botModeHandler.ts.backup
 * 新架构位于 ./mode/ 目录下
 * 
 * 重构信息：
 * - 原始文件：639 行 -> 现在：模块化拆分
 * - 拆分为：3个控制器 + 3个服务 + 2个验证器
 * - 保持完全向后兼容性
 * 
 * @deprecated 建议使用 ./mode/index.js 中的新模块化接口
 */

// 从新的模块化架构中导入向后兼容的函数
export {
    applyWebhookSettings, getBotWebhookStatus, manualSyncToTelegram, switchBotMode
} from './mode/index.ts';

