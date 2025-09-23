/**
 * 监控中心服务 - 兼容性入口
 * 重新导出拆分后的监控服务，保持向后兼容
 */
import { MonitoringService } from './monitoring/MonitoringService.ts';

// 创建监控服务实例
const monitoringService = new MonitoringService();

// 导出监控服务类和实例
export { MonitoringService } from './monitoring/MonitoringService.ts';
export default monitoringService;

// 为了向后兼容，也导出实例的方法
export const getOverview = monitoringService.getOverview.bind(monitoringService);
export const getOnlineUsers = monitoringService.getOnlineUsers.bind(monitoringService);
export const forceLogoutUser = monitoringService.forceLogoutUser.bind(monitoringService);
export const forceLogoutUserById = monitoringService.forceLogoutUserById.bind(monitoringService);
export const getScheduledTasks = monitoringService.getScheduledTasks.bind(monitoringService);
export const getTaskExecutionLogs = monitoringService.getTaskExecutionLogs.bind(monitoringService);
export const getDatabaseStats = monitoringService.getDatabaseStats.bind(monitoringService);
export const getServiceStatus = monitoringService.getServiceStatus.bind(monitoringService);
export const logSystemAction = monitoringService.logSystemAction.bind(monitoringService);
export const pauseTask = monitoringService.pauseTask.bind(monitoringService);
export const resumeTask = monitoringService.resumeTask.bind(monitoringService);
export const executeTask = monitoringService.executeTask.bind(monitoringService);
export const deleteTask = monitoringService.deleteTask.bind(monitoringService);
export const checkService = monitoringService.checkService.bind(monitoringService);
export const testCacheConnection = monitoringService.testCacheConnection.bind(monitoringService);
export const clearCache = monitoringService.clearCache.bind(monitoringService);
export const deleteCacheKey = monitoringService.deleteCacheKey.bind(monitoringService);
export const analyzeTable = monitoringService.analyzeTable.bind(monitoringService);
export const getSystemDetails = monitoringService.getSystemDetails.bind(monitoringService);
export const getUserSessions = monitoringService.getUserSessions.bind(monitoringService);
export const cleanupExpiredSessions = monitoringService.cleanupExpiredSessions.bind(monitoringService);
export const getSessionStats = monitoringService.getSessionStats.bind(monitoringService);
export const createTask = monitoringService.createTask.bind(monitoringService);
export const updateTask = monitoringService.updateTask.bind(monitoringService);
export const getConnectionStats = monitoringService.getConnectionStats.bind(monitoringService);
export const getSlowQueries = monitoringService.getSlowQueries.bind(monitoringService);
export const getPerformanceMetrics = monitoringService.getPerformanceMetrics.bind(monitoringService);
export const checkDatabaseHealth = monitoringService.checkDatabaseHealth.bind(monitoringService);
export const performVacuumAnalyze = monitoringService.performVacuumAnalyze.bind(monitoringService);
export const getCacheKeys = monitoringService.getCacheKeys.bind(monitoringService);
export const getCacheStats = monitoringService.getCacheStats.bind(monitoringService);
export const getCacheKeyInfo = monitoringService.getCacheKeyInfo.bind(monitoringService);
export const setCacheExpiry = monitoringService.setCacheExpiry.bind(monitoringService);

// 导出类型定义
export type * from './monitoring/types/monitoring.types.ts';
