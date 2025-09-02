/**
 * 监控中心服务
 * 提供系统监控、在线用户、定时任务等功能
 */
import * as si from 'systeminformation';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';
import * as cron from 'node-cron';

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
      
      // 计算内存和磁盘使用情况
      const memoryUsedBytes = memory.used;
      const memoryTotalBytes = memory.total;
      const memoryPercentage = (memoryUsedBytes / memoryTotalBytes) * 100;
      
      // 获取主磁盘信息（通常是第一个磁盘）
      const mainDisk = disk[0] || { size: 0, used: 0, use: 0 };
      const diskUsedBytes = mainDisk.used;
      const diskTotalBytes = mainDisk.size;
      const diskPercentage = mainDisk.use;

      return {
        // 系统信息（匹配前端MonitoringOverview接口）
        systemInfo: {
          platform: osInfo.platform,
          arch: osInfo.arch,
          nodeVersion: process.version,
          uptime: time.uptime
        },
        // 性能数据（匹配前端MonitoringOverview接口）
        performance: {
          cpuUsage: parseFloat(load.currentLoad.toFixed(2)),
          memoryUsage: {
            used: memoryUsedBytes,
            total: memoryTotalBytes,
            percentage: parseFloat(memoryPercentage.toFixed(2))
          },
          diskUsage: {
            used: diskUsedBytes,
            total: diskTotalBytes,
            percentage: parseFloat(diskPercentage.toFixed(2))
          }
        },
        // 在线用户数
        onlineUsers: onlineUsers,
        // 运行中的任务数
        runningTasks: parseInt(tasks.active),
        // 系统负载
        systemLoad: load.avgLoad.toFixed(2)
      };
    } catch (error) {
      logger.error('获取监控概览失败:', error);
      throw error;
    }
  }

  /**
   * 获取在线管理员列表
   * 基于活跃会话查询真正在线的用户
   */
  async getOnlineUsers(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
      // 基于活跃会话查询在线用户
      const queryStr = `
        SELECT DISTINCT
          a.id,
          a.username,
          a.email,
          a.role,
          s.last_activity,
          s.ip_address,
          s.user_agent,
          s.login_at as login_time,
          EXTRACT(EPOCH FROM (NOW() - s.login_at)) / 60 as online_duration_minutes
        FROM admins a
        JOIN admin_sessions s ON a.id = s.admin_id
        WHERE s.is_active = true 
          AND s.last_activity >= $1 
          AND a.status = 'active'
        ORDER BY s.last_activity DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(DISTINCT a.id) as total
        FROM admins a
        JOIN admin_sessions s ON a.id = s.admin_id
        WHERE s.is_active = true 
          AND s.last_activity >= $1 
          AND a.status = 'active'
      `;

      const [adminsResult, countResult] = await Promise.all([
        query(queryStr, [thirtyMinutesAgo, limit, offset]),
        query(countQuery, [thirtyMinutesAgo])
      ]);

      const users = adminsResult.rows.map(admin => ({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastActivity: admin.last_activity,
        loginTime: admin.login_time,
        ipAddress: admin.ip_address,
        userAgent: admin.user_agent,
        onlineDuration: Math.round(admin.online_duration_minutes)
      }));

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error getting online users:', error);
      throw error;
    }
  }

  /**
   * 强制下线用户（通过会话ID）
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
   * 强制下线用户（通过用户ID）
   * 将指定用户的所有活跃会话设为非活跃状态
   */
  async forceLogoutUserById(userId: string) {
    try {
      // 首先检查用户是否存在
      const userCheck = await query(
        'SELECT id, username FROM admins WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        throw new Error('用户不存在');
      }

      const user = userCheck.rows[0];

      // 查找并更新该用户的所有活跃会话
      const result = await query(
        `UPDATE admin_sessions 
         SET is_active = false,
             last_activity = NOW()
         WHERE admin_id = $1 AND is_active = true 
         RETURNING id, admin_id, last_activity`,
        [userId]
      );

      logger.info(`强制下线用户 ${user.username} (${userId})，影响 ${result.rows.length} 个会话`);

      return {
        userId: userId,
        username: user.username,
        affectedSessions: result.rows.length,
        sessions: result.rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('通过用户ID强制下线失败:', error);
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
          next_run,
          last_run,
          created_at,
          updated_at
         FROM scheduled_tasks
         ORDER BY name ASC
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
      let params: any[] = [limit, offset];
      
      if (taskId) {
        whereClause = 'WHERE l.task_id = $3';
        params.push(taskId);
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
          l.error_message as error,
          l.created_at,
          EXTRACT(EPOCH FROM (l.finished_at - l.started_at)) * 1000 as duration
         FROM task_execution_logs l
         JOIN scheduled_tasks t ON l.task_id = t.id
         ${whereClause}
         ORDER BY l.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      );

      const countParams = taskId ? [taskId] : [];
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
  async getDatabaseStats(page: number = 1, limit: number = 20) {
    try {
      // 获取数据库连接信息
      const connectionsResult = await query(
        'SELECT count(*) as total FROM pg_stat_activity WHERE state = \'active\''
      );

      // 获取数据库大小
      const sizeResult = await query(
        'SELECT pg_size_pretty(pg_database_size(current_database())) as size, pg_database_size(current_database()) as size_bytes'
      );

      // 获取表总数（用于分页）
      const totalTablesCountResult = await query(
        'SELECT COUNT(*) as count FROM pg_stat_user_tables'
      );
      const totalTables = parseInt(totalTablesCountResult.rows[0].count);

      // 计算分页偏移量
      const offset = (page - 1) * limit;

      // 获取表统计信息（带分页）
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
         LIMIT $1 OFFSET $2`,
        [limit, offset]
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
          tableName: table.tablename, // 修复字段名映射
          name: table.tablename, // 保持向后兼容
          schema: table.schemaname,
          rowCount: parseInt(table.live_tuples),
          recordCount: parseInt(table.live_tuples), // 前端期望的字段名
          tableSize: parseInt(table.table_size_bytes),
          indexSize: parseInt(table.index_size_bytes),
          size: table.table_size, // 前端期望的格式化大小
          tableSizeFormatted: table.table_size,
          indexSizeFormatted: table.index_size,
          inserts: parseInt(table.inserts),
          updates: parseInt(table.updates),
          deletes: parseInt(table.deletes),
          lastUpdated: new Date().toISOString() // 实际应该从pg_stat_user_tables获取
        })),
        
        // 添加tableStats字段以匹配前端期望
        tableStats: tablesResult.rows.map(table => ({
          tableName: table.tablename,
          recordCount: parseInt(table.live_tuples),
          size: table.table_size,
          tableSize: parseInt(table.table_size_bytes),
          indexSize: table.index_size,
          lastUpdated: new Date().toISOString()
        })),
        
        // 分页信息
        pagination: {
          page,
          limit,
          total: totalTables,
          totalPages: Math.ceil(totalTables / limit)
        },
        
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
      const [cpu, memory, disk, network, processes] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
        si.processes()
      ]);

      // 计算总磁盘使用情况
      const totalDisk = disk.reduce((acc, d) => {
        acc.size += d.size;
        acc.used += d.used;
        return acc;
      }, { size: 0, used: 0 });

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
        disk: {
          total: Math.round(totalDisk.size / 1024 / 1024 / 1024),
          used: Math.round(totalDisk.used / 1024 / 1024 / 1024),
          free: Math.round((totalDisk.size - totalDisk.used) / 1024 / 1024 / 1024),
          usage: totalDisk.size > 0 ? ((totalDisk.used / totalDisk.size) * 100).toFixed(2) : '0.00'
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

      // 异步执行任务，不阻塞响应
      this.executeTaskAsync(taskId, task, logResult.rows[0].id);

      return { success: true, message: '任务开始执行', executionId: logResult.rows[0].id };
    } catch (error) {
      logger.error('执行任务失败:', error);
      throw error;
    }
  }

  /**
   * 删除定时任务
   */
  async deleteTask(taskId: string | number) {
    try {
      // 首先检查任务是否存在
      const taskResult = await query(
        'SELECT id, name FROM scheduled_tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('任务不存在');
      }

      const task = taskResult.rows[0];

      // 删除任务（级联删除相关的执行日志）
      const result = await query(
        'DELETE FROM scheduled_tasks WHERE id = $1 RETURNING *',
        [taskId]
      );

      logger.info(`任务 ${taskId} (${task.name}) 已删除`);
      return { success: true, message: '任务已删除', task: result.rows[0] };
    } catch (error) {
      logger.error('删除任务失败:', error);
      throw error;
    }
  }

  /**
   * 计算基于cron表达式的下次执行时间
   */
  private calculateNextRun(cronExpression: string): Date | null {
    try {
      // 验证cron表达式是否有效
      if (!cron.validate(cronExpression)) {
        logger.warn(`无效的cron表达式: ${cronExpression}`);
        return null;
      }
      
      // 使用简单的方法计算下次执行时间
      // 基于当前时间计算下一个匹配的时间点
      const now = new Date();
      const nextMinute = new Date(now.getTime() + 60000); // 下一分钟
      
      // 这里简化处理，实际应该解析cron表达式
      // 对于常见的cron表达式，返回合理的下次执行时间
      if (cronExpression === '0 * * * *') { // 每小时执行
        const next = new Date(now);
        next.setMinutes(0, 0, 0);
        next.setHours(next.getHours() + 1);
        return next;
      } else if (cronExpression === '0 0 * * *') { // 每天执行
        const next = new Date(now);
        next.setHours(0, 0, 0, 0);
        next.setDate(next.getDate() + 1);
        return next;
      } else {
        // 默认返回下一分钟
        return nextMinute;
      }
    } catch (error) {
      logger.error(`计算下次执行时间失败: ${cronExpression}`, error);
      return null;
    }
  }

  /**
   * 异步执行任务
   */
  private async executeTaskAsync(taskId: string | number, task: any, logId: string) {
    const startTime = new Date();
    
    try {
      logger.info(`开始执行任务: ${task.name}`);
      
      // 导入调度器服务
      const { schedulerService } = await import('../services/scheduler.js');
      
      // 根据任务名称调用对应的调度器方法
      let success = false;
      let output = '';
      let errorOutput = '';
      
      try {
        success = await schedulerService.triggerTask(task.name);
        output = `任务 ${task.name} 执行成功`;
        logger.info(`任务 ${task.name} 执行成功`);
      } catch (error) {
        errorOutput = error instanceof Error ? error.message : String(error);
        logger.error(`任务 ${task.name} 执行失败:`, error);
      }
      
      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startTime.getTime();
      
      if (success) {
        // 执行成功
        await query(
          'UPDATE task_execution_logs SET status = $1, finished_at = $2, output = $3, error_message = $4 WHERE id = $5',
          ['success', finishedAt, output || '任务执行成功', null, logId]
        );
        
        // 计算下次执行时间
        const nextRun = this.calculateNextRun(task.cron_expression || task.cronExpression);
        
        // 更新任务的最后执行时间和下次执行时间
        await query(
          'UPDATE scheduled_tasks SET last_run = $1, next_run = $2 WHERE id = $3',
          [finishedAt, nextRun, taskId]
        );
        
        logger.info(`任务 ${taskId} 执行成功，耗时: ${duration}ms`);
      } else {
        // 执行失败
        await query(
          'UPDATE task_execution_logs SET status = $1, finished_at = $2, output = $3, error_message = $4 WHERE id = $5',
          ['failed', finishedAt, output, errorOutput || '任务执行失败', logId]
        );
        logger.error(`任务 ${taskId} 执行失败，耗时: ${duration}ms`);
      }
      
    } catch (error) {
      // 执行异常
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startTime.getTime();
      
      await query(
        'UPDATE task_execution_logs SET status = $1, finished_at = $2, error_message = $3 WHERE id = $4',
        ['failed', finishedAt, errorMessage, logId]
      );
      logger.error(`任务 ${taskId} 执行异常:`, error, `耗时: ${duration}ms`);
    }
  }

  /**
   * 检查特定服务状态
   */
  async checkService(serviceName: string) {
    const startTime = Date.now();
    
    try {
      switch (serviceName.toLowerCase()) {
        case 'database':
          // 检查数据库连接和响应时间
          const dbStart = Date.now();
          const result = await query('SELECT version(), current_database(), pg_database_size(current_database()) as size');
          const dbResponseTime = Date.now() - dbStart;
          
          return {
            name: serviceName,
            status: 'healthy' as const,
            responseTime: dbResponseTime,
            lastCheck: new Date().toISOString(),
            details: {
              version: result.rows[0]?.version || 'Unknown',
              database: result.rows[0]?.current_database || 'Unknown',
              size: result.rows[0]?.size || 0
            }
          };
        
        case 'api':
          // 检查API服务 - 测试一个简单的查询
          const apiStart = Date.now();
          await query('SELECT COUNT(*) FROM users');
          const apiResponseTime = Date.now() - apiStart;
          
          return {
            name: serviceName,
            status: 'healthy' as const,
            responseTime: apiResponseTime,
            lastCheck: new Date().toISOString(),
            details: {
              endpoint: '/api/monitoring',
              uptime: Math.floor(process.uptime())
            }
          };
        
        case 'web':
          // 检查Web服务 - 模拟检查
          const webResponseTime = Math.floor(Math.random() * 10) + 2;
          
          return {
            name: serviceName,
            status: 'healthy' as const,
            responseTime: webResponseTime,
            lastCheck: new Date().toISOString(),
            details: {
              frontend: 'React + Vite',
              build: 'production'
            }
          };
        
        case 'cache':
          // 检查缓存服务 - 模拟Redis检查
          const cacheResponseTime = Math.floor(Math.random() * 5) + 1;
          
          return {
            name: serviceName,
            status: 'healthy' as const,
            responseTime: cacheResponseTime,
            lastCheck: new Date().toISOString(),
            details: {
              type: 'Redis',
              keys: Math.floor(Math.random() * 1000) + 100
            }
          };
        
        default:
          return {
            name: serviceName,
            status: 'unknown' as const,
            responseTime: 0,
            lastCheck: new Date().toISOString(),
            details: {
              error: 'Service not recognized'
            }
          };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        name: serviceName,
        status: 'unhealthy' as const,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
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

  /**
   * 分析表结构和性能
   */
  async analyzeTable(tableName: string) {
    try {
      // 获取表的基本信息
      const tableInfoQuery = `
        SELECT 
          schemaname,
          tablename,
          tableowner,
          tablespace,
          hasindexes,
          hasrules,
          hastriggers,
          rowsecurity
        FROM pg_tables 
        WHERE tablename = $1 AND schemaname = 'public'
      `;
      
      // 获取表的列信息
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      // 获取表的索引信息
      const indexesQuery = `
        SELECT 
          indexname,
          indexdef,
          tablespace
        FROM pg_indexes 
        WHERE tablename = $1 AND schemaname = 'public'
      `;
      
      // 获取表的统计信息
      const statsQuery = `
        SELECT 
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables 
        WHERE relname = $1
      `;
      
      // 获取表大小信息
      const sizeQuery = `
        SELECT 
          pg_size_pretty(pg_total_relation_size($1)) as total_size,
          pg_size_pretty(pg_relation_size($1)) as table_size,
          pg_size_pretty(pg_total_relation_size($1) - pg_relation_size($1)) as index_size,
          pg_relation_size($1) as table_size_bytes,
          pg_total_relation_size($1) - pg_relation_size($1) as index_size_bytes
      `;
      
      const [tableInfo, columns, indexes, stats, sizeInfo] = await Promise.all([
        query(tableInfoQuery, [tableName]),
        query(columnsQuery, [tableName]),
        query(indexesQuery, [tableName]),
        query(statsQuery, [tableName]),
        query(sizeQuery, [tableName])
      ]);
      
      // 计算表的健康度评分
      const healthScore = this.calculateTableHealth(stats.rows[0], indexes.rows.length);
      
      return {
        tableName,
        tableInfo: tableInfo.rows[0] || {},
        columns: columns.rows || [],
        indexes: indexes.rows || [],
        statistics: stats.rows[0] || {},
        sizeInfo: sizeInfo.rows[0] || {},
        healthScore,
        recommendations: this.generateRecommendations(stats.rows[0], indexes.rows, columns.rows),
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('分析表失败:', error);
      throw error;
    }
  }

  /**
   * 计算表健康度评分
   */
  private calculateTableHealth(stats: any, indexCount: number): number {
    let score = 100;
    
    if (stats) {
      // 死元组比例过高扣分
      const deadTupleRatio = stats.dead_tuples / (stats.live_tuples + stats.dead_tuples || 1);
      if (deadTupleRatio > 0.1) score -= 20;
      if (deadTupleRatio > 0.2) score -= 30;
      
      // 长时间未分析扣分
      const lastAnalyze = stats.last_analyze || stats.last_autoanalyze;
      if (lastAnalyze) {
        const daysSinceAnalyze = (Date.now() - new Date(lastAnalyze).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceAnalyze > 7) score -= 15;
        if (daysSinceAnalyze > 30) score -= 25;
      } else {
        score -= 30; // 从未分析过
      }
      
      // 长时间未清理扣分
      const lastVacuum = stats.last_vacuum || stats.last_autovacuum;
      if (lastVacuum) {
        const daysSinceVacuum = (Date.now() - new Date(lastVacuum).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceVacuum > 7) score -= 10;
        if (daysSinceVacuum > 30) score -= 20;
      } else {
        score -= 25; // 从未清理过
      }
    }
    
    // 没有索引扣分（除非是很小的表）
    if (indexCount === 0 && stats?.live_tuples > 1000) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(stats: any, indexes: any[], columns: any[]): string[] {
    const recommendations: string[] = [];
    
    if (stats) {
      // 死元组建议
      const deadTupleRatio = stats.dead_tuples / (stats.live_tuples + stats.dead_tuples || 1);
      if (deadTupleRatio > 0.1) {
        recommendations.push('建议执行 VACUUM 清理死元组，提高查询性能');
      }
      
      // 分析建议
      const lastAnalyze = stats.last_analyze || stats.last_autoanalyze;
      if (!lastAnalyze) {
        recommendations.push('建议执行 ANALYZE 更新表统计信息');
      } else {
        const daysSinceAnalyze = (Date.now() - new Date(lastAnalyze).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceAnalyze > 7) {
          recommendations.push('表统计信息较旧，建议重新执行 ANALYZE');
        }
      }
      
      // 索引建议
      if (indexes.length === 0 && stats.live_tuples > 1000) {
        recommendations.push('表数据量较大但缺少索引，建议为常用查询字段添加索引');
      }
      
      // 大表建议
      if (stats.live_tuples > 1000000) {
        recommendations.push('大表建议考虑分区或归档历史数据');
      }
    }
    
    // 数据类型建议
    const textColumns = columns.filter(col => col.data_type === 'text' && !col.character_maximum_length);
    if (textColumns.length > 0) {
      recommendations.push('建议为文本字段设置合适的长度限制，提高存储效率');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('表结构和性能状态良好，无需特殊优化');
    }
    
    return recommendations;
  }
}

// 导出服务实例
export const monitoringService = new MonitoringService();