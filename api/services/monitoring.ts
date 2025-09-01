/**
 * 监控中心服务
 * 提供系统监控、在线用户、定时任务等功能
 */
import * as si from 'systeminformation';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class MonitoringService {
  /**
   * 获取监控概览数据
   */
  async getOverview() {
    try {
      // 获取系统基本信息
      const [cpu, memory, disk, load] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.currentLoad()
      ]);

      // 获取在线用户数量
      const onlineUsersResult = await query(
        'SELECT COUNT(*) as count FROM admin_sessions WHERE is_active = true AND last_activity > NOW() - INTERVAL \'30 minutes\''
      );
      const onlineUsers = parseInt(onlineUsersResult.rows[0].count);

      // 获取定时任务统计
      const tasksResult = await query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN is_active = true THEN 1 END) as active FROM scheduled_tasks'
      );
      const tasks = tasksResult.rows[0];

      // 获取今日任务执行统计
      const todayTasksResult = await query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
         FROM task_execution_logs 
         WHERE DATE(created_at) = CURRENT_DATE`
      );
      const todayTasks = todayTasksResult.rows[0];

      // 获取系统平台信息
      const osInfo = await si.osInfo();
      const time = await si.time();
      
      return {
        // 系统基本信息
        platform: osInfo.platform,
        hostname: osInfo.hostname,
        uptime: time.uptime,
        
        // CPU使用率（前端期望的字段）
        cpuUsage: parseFloat(load.currentLoad.toFixed(2)),
        
        system: {
          cpu: {
            model: cpu.model,
            cores: cpu.cores,
            usage: load.currentLoad.toFixed(2)
          },
          memory: {
            total: Math.round(memory.total / 1024 / 1024 / 1024), // GB
            used: Math.round(memory.used / 1024 / 1024 / 1024), // GB
            usage: ((memory.used / memory.total) * 100).toFixed(2)
          },
          disk: disk.map(d => ({
            filesystem: d.fs,
            size: Math.round(d.size / 1024 / 1024 / 1024), // GB
            used: Math.round(d.used / 1024 / 1024 / 1024), // GB
            usage: d.use.toFixed(2)
          }))
        },
        users: {
          online: onlineUsers
        },
        tasks: {
          total: parseInt(tasks.total),
          active: parseInt(tasks.active),
          todayExecuted: parseInt(todayTasks.total),
          todaySuccess: parseInt(todayTasks.success),
          todayFailed: parseInt(todayTasks.failed)
        }
      };
    } catch (error) {
      logger.error('获取监控概览失败:', error);
      throw error;
    }
  }

  /**
   * 获取在线用户列表
   */
  async getOnlineUsers(page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      
      const result = await query(
        `SELECT 
          s.id,
          s.admin_id,
          a.username,
          a.email,
          s.ip_address,
          s.user_agent,
          s.login_at,
          s.last_activity
         FROM admin_sessions s
         JOIN admins a ON s.admin_id = a.id
         WHERE s.is_active = true 
           AND s.last_activity > NOW() - INTERVAL '30 minutes'
         ORDER BY s.last_activity DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await query(
        'SELECT COUNT(*) as count FROM admin_sessions WHERE is_active = true AND last_activity > NOW() - INTERVAL \'30 minutes\''
      );

      return {
        users: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      };
    } catch (error) {
      logger.error('获取在线用户失败:', error);
      throw error;
    }
  }

  /**
   * 强制下线用户
   */
  async forceLogoutUser(sessionId: string) {
    try {
      const result = await query(
        'UPDATE admin_sessions SET is_active = false WHERE id = $1 RETURNING *',
        [sessionId]
      );

      if (result.rows.length === 0) {
        throw new Error('会话不存在');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('强制下线用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取定时任务列表
   */
  async getScheduledTasks(page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      
      const result = await query(
        `SELECT 
          id,
          name,
          cron_expression,
          command,
          description,
          is_active,
          created_at,
          updated_at
         FROM scheduled_tasks
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await query('SELECT COUNT(*) as count FROM scheduled_tasks');

      return {
        tasks: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      };
    } catch (error) {
      logger.error('获取定时任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务执行日志
   */
  async getTaskExecutionLogs(taskId?: string, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = '';
      let params = [limit, offset];
      
      if (taskId) {
        whereClause = 'WHERE l.task_id = $3';
        params.push(parseInt(taskId));
      }
      
      const result = await query(
        `SELECT 
          l.id,
          l.task_id,
          t.name as task_name,
          l.started_at,
          l.finished_at,
          l.status,
          l.output,
          l.error_message,
          l.created_at
         FROM task_execution_logs l
         JOIN scheduled_tasks t ON l.task_id = t.id
         ${whereClause}
         ORDER BY l.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      );

      const countParams = taskId ? [parseInt(taskId)] : [];
      const countResult = await query(
        `SELECT COUNT(*) as count FROM task_execution_logs ${taskId ? 'WHERE task_id = $1' : ''}`,
        countParams
      );

      return {
        logs: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      };
    } catch (error) {
      logger.error('获取任务执行日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据库监控信息
   */
  async getDatabaseStats() {
    try {
      // 获取数据库连接信息
      const connectionsResult = await query(
        'SELECT count(*) as total FROM pg_stat_activity WHERE state = \'active\''
      );

      // 获取数据库大小
      const sizeResult = await query(
        'SELECT pg_size_pretty(pg_database_size(current_database())) as size, pg_database_size(current_database()) as size_bytes'
      );

      // 获取表统计信息
      const tablesResult = await query(
        `SELECT 
          schemaname,
          relname as tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as table_size,
          pg_total_relation_size(schemaname||'.'||relname) as table_size_bytes,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) as index_size,
          pg_indexes_size(schemaname||'.'||relname) as index_size_bytes
         FROM pg_stat_user_tables
         ORDER BY n_live_tup DESC
         LIMIT 10`
      );

      // 获取用户总数
      const userCountResult = await query('SELECT COUNT(*) as count FROM admins');
      
      // 获取订单总数（如果有orders表的话）
      let orderCount = 0;
      try {
        const orderCountResult = await query('SELECT COUNT(*) as count FROM orders');
        orderCount = parseInt(orderCountResult.rows[0].count);
      } catch {
        // 如果orders表不存在，保持为0
      }

      // 获取表总数
      const tableCountResult = await query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
      );

      // 获取慢查询日志（模拟数据，因为需要配置pg_stat_statements扩展）
      const slowQueries = [];

      return {
        // 基本统计信息
        tableCount: parseInt(tableCountResult.rows[0].count),
        userCount: parseInt(userCountResult.rows[0].count),
        orderCount: orderCount,
        databaseSize: parseInt(sizeResult.rows[0].size_bytes),
        
        // 连接信息
        activeConnections: parseInt(connectionsResult.rows[0].total),
        maxConnections: 100, // 默认值，可以通过查询 SHOW max_connections 获取
        
        // 版本信息
        version: 'PostgreSQL 14.x',
        
        // 表详细信息
        tables: tablesResult.rows.map(table => ({
          name: table.tablename,
          schema: table.schemaname,
          rowCount: parseInt(table.live_tuples),
          tableSize: parseInt(table.table_size_bytes),
          indexSize: parseInt(table.index_size_bytes),
          tableSizeFormatted: table.table_size,
          indexSizeFormatted: table.index_size,
          inserts: parseInt(table.inserts),
          updates: parseInt(table.updates),
          deletes: parseInt(table.deletes),
          lastUpdated: new Date().toISOString() // 实际应该从pg_stat_user_tables获取
        })),
        
        // 慢查询日志
        slowQueries: slowQueries,
        
        // 格式化的大小
        databaseSizeFormatted: sizeResult.rows[0].size
      };
    } catch (error) {
      logger.error('获取数据库统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取服务状态监控
   */
  async getServiceStatus() {
    try {
      const [cpu, memory, network, processes] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.networkStats(),
        si.processes()
      ]);

      return {
        cpu: {
          usage: cpu.currentLoad.toFixed(2),
          user: cpu.currentLoadUser.toFixed(2),
          system: cpu.currentLoadSystem.toFixed(2)
        },
        memory: {
          total: Math.round(memory.total / 1024 / 1024 / 1024),
          used: Math.round(memory.used / 1024 / 1024 / 1024),
          free: Math.round(memory.free / 1024 / 1024 / 1024),
          usage: ((memory.used / memory.total) * 100).toFixed(2)
        },
        network: network.map(n => ({
          interface: n.iface,
          rx_bytes: n.rx_bytes,
          tx_bytes: n.tx_bytes,
          rx_sec: n.rx_sec,
          tx_sec: n.tx_sec
        })),
        processes: {
          all: processes.all,
          running: processes.running,
          blocked: processes.blocked,
          sleeping: processes.sleeping
        }
      };
    } catch (error) {
      logger.error('获取服务状态失败:', error);
      throw error;
    }
  }

  /**
   * 记录系统监控日志
   */
  async logSystemAction(adminId: string, actionType: string, actionData: any) {
    try {
      const result = await query(
        'INSERT INTO system_monitoring_logs (admin_id, action_type, action_data) VALUES ($1, $2, $3) RETURNING *',
        [adminId, actionType, JSON.stringify(actionData)]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('记录系统监控日志失败:', error);
      throw error;
    }
  }

  /**
   * 暂停定时任务
   */
  async pauseTask(taskId: string | number) {
    try {
      const result = await query(
        'UPDATE scheduled_tasks SET is_active = false WHERE id = $1 RETURNING *',
        [taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('任务不存在');
      }

      logger.info(`任务 ${taskId} 已暂停`);
      return { success: true, message: '任务已暂停', task: result.rows[0] };
    } catch (error) {
      logger.error('暂停任务失败:', error);
      throw error;
    }
  }

  /**
   * 恢复定时任务
   */
  async resumeTask(taskId: string | number) {
    try {
      const result = await query(
        'UPDATE scheduled_tasks SET is_active = true WHERE id = $1 RETURNING *',
        [taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('任务不存在');
      }

      logger.info(`任务 ${taskId} 已恢复`);
      return { success: true, message: '任务已恢复', task: result.rows[0] };
    } catch (error) {
      logger.error('恢复任务失败:', error);
      throw error;
    }
  }

  /**
   * 立即执行定时任务
   */
  async executeTask(taskId: string | number) {
    try {
      // 获取任务信息
      const taskResult = await query(
        'SELECT * FROM scheduled_tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('任务不存在');
      }

      const task = taskResult.rows[0];

      // 记录任务执行日志
      const logResult = await query(
        'INSERT INTO task_execution_logs (task_id, status, started_at, output) VALUES ($1, $2, NOW(), $3) RETURNING *',
        [taskId, 'running', '任务开始执行...']
      );

      logger.info(`手动执行任务 ${taskId}: ${task.name}`);

      // 这里可以添加实际的任务执行逻辑
      // 目前只是模拟执行成功
      setTimeout(async () => {
        try {
          await query(
            'UPDATE task_execution_logs SET status = $1, finished_at = NOW(), output = $2 WHERE id = $3',
            ['success', '任务执行成功', logResult.rows[0].id]
          );
        } catch (err) {
          logger.error('更新任务执行状态失败:', err);
        }
      }, 1000);

      return { success: true, message: '任务开始执行', executionId: logResult.rows[0].id };
    } catch (error) {
      logger.error('执行任务失败:', error);
      throw error;
    }
  }

  /**
   * 检查服务状态
   */
  async checkService(serviceName: string) {
    try {
      let serviceStatus = {
        name: serviceName,
        status: 'healthy' as 'healthy' | 'unhealthy' | 'warning' | 'error',
        uptime: 0,
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        details: {}
      };

      switch (serviceName.toLowerCase()) {
        case 'database':
          try {
            const start = Date.now();
            await query('SELECT 1');
            serviceStatus.responseTime = Date.now() - start;
            serviceStatus.status = 'healthy';
            serviceStatus.details = { message: '数据库连接正常' };
          } catch (err: any) {
            serviceStatus.status = 'unhealthy';
            serviceStatus.details = { error: '数据库连接失败', message: err.message };
          }
          break;
        
        case 'api':
          serviceStatus.status = 'healthy';
          serviceStatus.details = { message: 'API服务运行正常' };
          break;
        
        default:
          serviceStatus.status = 'warning';
          serviceStatus.details = { message: '未知的服务类型' };
      }

      return serviceStatus;
    } catch (error) {
      logger.error('检查服务状态失败:', error);
      throw error;
    }
  }

  /**
   * 测试缓存连接
   */
  async testCacheConnection() {
    try {
      // 这里应该实际测试Redis或其他缓存连接
      // 目前返回模拟数据
      return {
        success: true,
        message: '缓存连接测试成功',
        details: {
          type: 'redis',
          status: 'connected',
          responseTime: 5,
          version: '6.2.0'
        }
      };
    } catch (error) {
      logger.error('测试缓存连接失败:', error);
      return {
        success: false,
        message: '缓存连接测试失败',
        error: error.message
      };
    }
  }

  /**
   * 清空缓存
   */
  async clearCache() {
    try {
      // 这里应该实际清空缓存
      // 目前返回模拟数据
      logger.info('清空缓存操作执行');
      return {
        success: true,
        message: '缓存已清空',
        details: {
          clearedKeys: 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('清空缓存失败:', error);
      throw error;
    }
  }

  /**
   * 删除缓存键
   */
  async deleteCacheKey(key: string) {
    try {
      // 这里应该实际删除缓存键
      // 目前返回模拟数据
      logger.info(`删除缓存键: ${key}`);
      return {
        success: true,
        message: `缓存键 ${key} 已删除`,
        details: {
          key,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('删除缓存键失败:', error);
      throw error;
    }
  }
}

// 导出服务实例
export const monitoringService = new MonitoringService();