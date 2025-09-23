/**
 * 日志管理控制器 - 导出、清理等功能
 * 
 * 注意：此文件已经过模块化重构，原始内容已备份到 LogsManagementController.ts.backup
 * 实际的业务逻辑现在分布在 management/ 目录下的不同控制器中：
 * - management/LogsExportController.ts - 日志导出功能
 * - management/LogsConfigController.ts - 清理配置管理
 * - management/LogsCleanupController.ts - 日志清理和预览
 */

// 直接导入并重新导出分离后的模块化控制器
export { LogsManagementController } from './management/index.ts';
