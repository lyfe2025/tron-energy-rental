/**
 * 监控服务主入口
 * 整合各个监控模块，提供统一的监控服务接口
 */
import { logger } from '../../utils/logger.js';
import { CacheMonitor } from './CacheMonitor.js';
import { DatabaseMonitor } from './DatabaseMonitor.js';
import { ScheduledTaskMonitor } from './ScheduledTaskMonitor.js';
import { SystemMonitor } from './SystemMonitor.js';
import type {
    MonitoringOverview,
    OnlineUsersResponse,
    ServiceStatus
} from './types/monitoring.types.js';
import { UserSessionMonitor } from './UserSessionMonitor.js';

export class MonitoringService {
  private systemMonitor: SystemMonitor;
  private userSessionMonitor: UserSessionMonitor;
  private scheduledTaskMonitor: ScheduledTaskMonitor;
  private databaseMonitor: DatabaseMonitor;
  private cacheMonitor: CacheMonitor;

  constructor() {
    this.systemMonitor = new SystemMonitor();
    this.userSessionMonitor = new UserSessionMonitor();
    this.scheduledTaskMonitor = new ScheduledTaskMonitor();
    this.databaseMonitor = new DatabaseMonitor();
    this.cacheMonitor = new CacheMonitor();
  }

  /**
   * 获取监控概览数据
   */
  async getOverview(): Promise<MonitoringOverview> {
    try {
      // 并行获取各个模块的数据
      const [
        systemInfo,
        performance,
        onlineUsers,
        taskStats,
        systemLoad
      ] = await Promise.all([
        this.systemMonitor.getSystemInfo(),
        this.systemMonitor.getPerformanceData(),
        this.userSessionMonitor.getOnlineUserCount(),
        this.scheduledTaskMonitor.getTaskStats(),
        this.systemMonitor.getSystemLoad()
      ]);

      return {
        systemInfo,
        performance,
        onlineUsers,
        runningTasks: parseInt(taskStats.active),
        systemLoad
      };
    } catch (error) {
      logger.error('获取监控概览失败:', error);
      throw error;
    }
  }

  /**
   * 获取在线管理员列表
   */
  async getOnlineUsers(page: number = 1, limit: number = 10): Promise<OnlineUsersResponse> {
    return this.userSessionMonitor.getOnlineUsers(page, limit);
  }

  /**
   * 强制下线用户（通过会话ID）
   */
  async forceLogoutUser(sessionId: string) {
    return this.userSessionMonitor.forceLogoutUser(sessionId);
  }

  /**
   * 强制下线用户（通过用户ID）
   */
  async forceLogoutUserById(userId: string) {
    return this.userSessionMonitor.forceLogoutUserById(userId);
  }

  /**
   * 获取定时任务列表
   */
  async getScheduledTasks(page = 1, limit = 20) {
    return this.scheduledTaskMonitor.getScheduledTasks(page, limit);
  }

  /**
   * 获取任务执行日志
   */
  async getTaskExecutionLogs(taskId?: string, page = 1, limit = 20) {
    return this.scheduledTaskMonitor.getTaskExecutionLogs(taskId, page, limit);
  }

  /**
   * 获取数据库监控信息
   */
  async getDatabaseStats(page: number = 1, limit: number = 20) {
    return this.databaseMonitor.getDatabaseStats(page, limit);
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus(): Promise<ServiceStatus[]> {
    try {
      const services = [
        { name: 'database', checker: () => this.checkService('database') },
        { name: 'cache', checker: () => this.checkService('cache') },
        { name: 'api', checker: () => this.checkService('api') }
      ];

      const results = await Promise.allSettled(
        services.map(async (service) => {
          try {
            const result = await service.checker();
            return {
              name: service.name,
              status: 'healthy' as const,
              lastCheck: new Date(),
              responseTime: result.responseTime,
              details: result.details
            };
          } catch (error) {
            return {
              name: service.name,
              status: 'down' as const,
              lastCheck: new Date(),
              details: { error: error.message }
            };
          }
        })
      );

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            name: services[index].name,
            status: 'down' as const,
            lastCheck: new Date(),
            details: { error: result.reason?.message || 'Unknown error' }
          };
        }
      });
    } catch (error) {
      logger.error('获取服务状态失败:', error);
      throw error;
    }
  }

  /**
   * 记录系统操作
   */
  async logSystemAction(adminId: string, actionType: string, actionData: any) {
    try {
      return await this.scheduledTaskMonitor.logSystemAction(adminId, actionType, actionData);
    } catch (error) {
      logger.error('MonitoringService.logSystemAction failed:', error);
      throw error;
    }
  }

  /**
   * 暂停任务
   */
  async pauseTask(taskId: string | number) {
    return this.scheduledTaskMonitor.pauseTask(taskId);
  }

  /**
   * 恢复任务
   */
  async resumeTask(taskId: string | number) {
    return this.scheduledTaskMonitor.resumeTask(taskId);
  }

  /**
   * 立即执行任务
   */
  async executeTask(taskId: string | number) {
    return this.scheduledTaskMonitor.executeTask(taskId);
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string | number) {
    return this.scheduledTaskMonitor.deleteTask(taskId);
  }

  /**
   * 检查具体服务
   */
  async checkService(serviceName: string) {
    const startTime = Date.now();
    
    try {
      switch (serviceName) {
        case 'database':
          await this.databaseMonitor.getConnectionStats();
          return {
            responseTime: Date.now() - startTime,
            details: { status: 'connected' }
          };
          
        case 'cache':
          const cacheInfo = await this.cacheMonitor.testCacheConnection();
          return {
            responseTime: Date.now() - startTime,
            details: cacheInfo
          };
          
        case 'api':
          // API服务检查 - 简单检查进程状态
          return {
            responseTime: Date.now() - startTime,
            details: { 
              status: 'running',
              uptime: process.uptime(),
              memoryUsage: process.memoryUsage()
            }
          };
          
        case 'web':
          // Web服务检查 - 默认为健康状态
          return {
            responseTime: 0, // Web服务响应时间设为0
            details: { 
              status: 'running',
              port: 5173,
              version: 'Vite 4.x'
            }
          };
          
        default:
          throw new Error(`未知服务: ${serviceName}`);
      }
    } catch (error) {
      logger.error(`检查服务 ${serviceName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 测试缓存连接
   */
  async testCacheConnection() {
    return this.cacheMonitor.testCacheConnection();
  }

  /**
   * 清理缓存
   */
  async clearCache() {
    return this.cacheMonitor.clearCache();
  }

  /**
   * 删除缓存键
   */
  async deleteCacheKey(key: string) {
    return this.cacheMonitor.deleteCacheKey(key);
  }

  /**
   * 分析表性能
   */
  async analyzeTable(tableName: string) {
    return this.databaseMonitor.analyzeTable(tableName);
  }

  /**
   * 获取系统详细信息
   */
  async getSystemDetails() {
    try {
      const [
        cpuInfo,
        memoryInfo,
        diskInfo,
        networkInfo
      ] = await Promise.all([
        this.systemMonitor.getCpuInfo(),
        this.systemMonitor.getMemoryInfo(),
        this.systemMonitor.getDiskInfo(),
        this.systemMonitor.getNetworkInfo()
      ]);

      return {
        cpu: cpuInfo,
        memory: memoryInfo,
        disk: diskInfo,
        network: networkInfo
      };
    } catch (error) {
      logger.error('获取系统详细信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户会话详情
   */
  async getUserSessions(userId: string) {
    return this.userSessionMonitor.getUserSessions(userId);
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(hoursAgo: number = 24) {
    return this.userSessionMonitor.cleanupExpiredSessions(hoursAgo);
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats() {
    return this.userSessionMonitor.getSessionStats();
  }

  /**
   * 创建新的定时任务
   */
  async createTask(taskData: {
    name: string;
    description?: string;
    cron_expression: string;
    command: string;
    is_active?: boolean;
  }) {
    return this.scheduledTaskMonitor.createTask(taskData);
  }

  /**
   * 更新定时任务
   */
  async updateTask(taskId: string | number, updateData: any) {
    return this.scheduledTaskMonitor.updateTask(taskId, updateData);
  }

  /**
   * 获取数据库连接统计
   */
  async getConnectionStats() {
    return this.databaseMonitor.getConnectionStats();
  }

  /**
   * 获取慢查询日志
   */
  async getSlowQueries(limit: number = 10) {
    return this.databaseMonitor.getSlowQueries(limit);
  }

  /**
   * 获取数据库性能指标
   */
  async getPerformanceMetrics() {
    return this.databaseMonitor.getPerformanceMetrics();
  }

  /**
   * 检查数据库健康状态
   */
  async checkDatabaseHealth() {
    return this.databaseMonitor.checkDatabaseHealth();
  }

  /**
   * 执行VACUUM分析
   */
  async performVacuumAnalyze(tableName?: string) {
    return this.databaseMonitor.performVacuumAnalyze(tableName);
  }

  /**
   * 获取缓存键列表
   */
  async getCacheKeys(pattern: string = '*', limit: number = 100) {
    return this.cacheMonitor.getCacheKeys(pattern, limit);
  }

  /**
   * 获取缓存性能统计
   */
  async getCacheStats() {
    return this.cacheMonitor.getCacheStats();
  }

  /**
   * 获取缓存键详细信息
   */
  async getCacheKeyInfo(key: string) {
    return this.cacheMonitor.getCacheKeyInfo(key);
  }

  /**
   * 设置缓存键过期时间
   */
  async setCacheExpiry(key: string, seconds: number) {
    return this.cacheMonitor.setCacheExpiry(key, seconds);
  }
}
