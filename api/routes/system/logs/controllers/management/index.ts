/**
 * 日志管理控制器模块化导出
 * 重新整合原始的 LogsManagementController 功能
 */

// 导入拆分后的控制器
import { LogsCleanupController } from './LogsCleanupController.ts';
import { LogsConfigController } from './LogsConfigController.ts';
import { LogsExportController } from './LogsExportController.ts';

/**
 * 日志管理控制器 - 模块化版本
 * 保持与原始 LogsManagementController 相同的接口
 */
export class LogsManagementController {
  // 导出功能
  static exportLogs = LogsExportController.exportLogs;

  // 配置管理功能
  static getCleanupConfig = LogsConfigController.getCleanupConfig;
  static updateCleanupConfig = LogsConfigController.updateCleanupConfig;

  // 清理功能
  static cleanupLogs = LogsCleanupController.cleanupLogs;
  static getCleanupPreview = LogsCleanupController.getCleanupPreview;
}

// 同时导出单独的控制器，供其他模块使用
export { LogsCleanupController, LogsConfigController, LogsExportController };

