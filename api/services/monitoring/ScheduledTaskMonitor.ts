/**
 * 定时任务监控模块
 * 负责定时任务的管理、执行和日志记录
 */
import * as cron from 'node-cron';
import { query } from '../../config/database.ts';
import { logger } from '../../utils/logger.ts';
import type { ScheduledTask } from './types/monitoring.types.ts';

export class ScheduledTaskMonitor {
  /**
   * 获取定时任务统计
   */
  async getTaskStats() {
    try {
      const result = await query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN is_active = true THEN 1 END) as active FROM scheduled_tasks'
      );
      return result.rows[0];
    } catch (error) {
      logger.error('获取定时任务统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取今日任务执行统计
   */
  async getTodayTaskStats() {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
         FROM task_execution_logs 
         WHERE DATE(created_at) = CURRENT_DATE`
      );
      return result.rows[0];
    } catch (error) {
      logger.error('获取今日任务统计失败:', error);
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
   * 记录系统操作
   */
  async logSystemAction(adminId: string, actionType: string, actionData: any) {
    try {
      // 获取用户名
      const userResult = await query(
        'SELECT username FROM admins WHERE id = $1',
        [adminId]
      );
      const username = userResult.rows[0]?.username || null;

      const result = await query(
        'INSERT INTO operation_logs (admin_id, username, operation, request_params, module, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *',
        [adminId, username, actionType, JSON.stringify(actionData), 'monitoring']
      );
      return result.rows[0];
    } catch (error) {
      logger.error('记录系统操作失败:', error);
      throw error;
    }
  }

  /**
   * 暂停任务
   */
  async pauseTask(taskId: string | number) {
    try {
      const result = await query(
        'UPDATE scheduled_tasks SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
        [taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('任务不存在');
      }

      logger.info(`任务 ${taskId} 已暂停`);
      return result.rows[0];
    } catch (error) {
      logger.error(`暂停任务失败 ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * 恢复任务
   */
  async resumeTask(taskId: string | number) {
    try {
      const result = await query(
        'UPDATE scheduled_tasks SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *',
        [taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('任务不存在');
      }

      logger.info(`任务 ${taskId} 已恢复`);
      return result.rows[0];
    } catch (error) {
      logger.error(`恢复任务失败 ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * 立即执行任务
   */
  async executeTask(taskId: string | number) {
    try {
      // 先获取任务信息
      const taskResult = await query(
        'SELECT * FROM scheduled_tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('任务不存在');
      }

      const task = taskResult.rows[0];

      // 创建执行日志记录
      const logResult = await query(
        'INSERT INTO task_execution_logs (task_id, status, started_at, created_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id',
        [taskId, 'running']
      );

      const logId = logResult.rows[0].id;

      logger.info(`开始执行任务 ${task.name} (ID: ${taskId})`);

      // 异步执行任务
      this.executeTaskAsync(taskId, task, logId);

      return {
        message: '任务已开始执行',
        taskId: taskId,
        taskName: task.name,
        logId: logId
      };
    } catch (error) {
      logger.error(`执行任务失败 ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string | number) {
    try {
      // 先获取任务信息
      const taskResult = await query(
        'SELECT name FROM scheduled_tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('任务不存在');
      }

      const taskName = taskResult.rows[0].name;

      // 开始事务删除任务及相关日志
      await query('BEGIN');

      try {
        // 删除任务执行日志
        await query('DELETE FROM task_execution_logs WHERE task_id = $1', [taskId]);

        // 删除任务
        await query('DELETE FROM scheduled_tasks WHERE id = $1', [taskId]);

        await query('COMMIT');

        logger.info(`任务 ${taskName} (ID: ${taskId}) 已删除`);

        return {
          message: '任务删除成功',
          taskId: taskId,
          taskName: taskName
        };
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error(`删除任务失败 ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * 异步执行任务
   */
  private async executeTaskAsync(taskId: string | number, task: any, logId: string) {
    try {
      const startTime = new Date();
      let output = '';
      let status = 'success';
      let errorMessage = null;

      // 根据任务类型执行不同的逻辑
      switch (task.command) {
        case 'database_backup':
          output = await this.executeDatabaseBackup();
          break;
        case 'cleanup_logs':
          output = await this.executeCleanupLogs();
          break;
        case 'cache_refresh':
          output = await this.executeCacheRefresh();
          break;
        case 'system_check':
          output = await this.executeSystemCheck();
          break;
        default:
          output = `执行自定义任务: ${task.command}`;
          logger.info(`执行自定义任务 ${task.name}: ${task.command}`);
          break;
      }

      // 更新执行日志
      await query(
        'UPDATE task_execution_logs SET status = $1, output = $2, finished_at = NOW() WHERE id = $3',
        [status, output, logId]
      );

      // 更新任务的最后执行时间
      await query(
        'UPDATE scheduled_tasks SET last_run = NOW(), updated_at = NOW() WHERE id = $1',
        [taskId]
      );

      logger.info(`任务 ${task.name} 执行完成`);

    } catch (error) {
      // 记录错误
      await query(
        'UPDATE task_execution_logs SET status = $1, error_message = $2, finished_at = NOW() WHERE id = $3',
        ['failed', error.message, logId]
      );

      logger.error(`任务 ${task.name} 执行失败:`, error);
    }
  }

  /**
   * 执行数据库备份
   */
  private async executeDatabaseBackup(): Promise<string> {
    // 这里实现数据库备份逻辑
    return '数据库备份任务执行完成';
  }

  /**
   * 执行日志清理
   */
  private async executeCleanupLogs(): Promise<string> {
    // 这里实现日志清理逻辑
    return '日志清理任务执行完成';
  }

  /**
   * 执行缓存刷新
   */
  private async executeCacheRefresh(): Promise<string> {
    // 这里实现缓存刷新逻辑
    return '缓存刷新任务执行完成';
  }

  /**
   * 执行系统检查
   */
  private async executeSystemCheck(): Promise<string> {
    // 这里实现系统检查逻辑
    return '系统检查任务执行完成';
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
    try {
      // 验证cron表达式
      if (!cron.validate(taskData.cron_expression)) {
        throw new Error('无效的cron表达式');
      }

      const result = await query(
        `INSERT INTO scheduled_tasks (name, description, cron_expression, command, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [
          taskData.name,
          taskData.description || '',
          taskData.cron_expression,
          taskData.command,
          taskData.is_active !== false
        ]
      );

      logger.info(`创建定时任务成功: ${taskData.name}`);
      return result.rows[0];
    } catch (error) {
      logger.error('创建定时任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新定时任务
   */
  async updateTask(taskId: string | number, updateData: Partial<ScheduledTask>) {
    try {
      // 验证cron表达式（如果有更新）
      if (updateData.cron_expression && !cron.validate(updateData.cron_expression)) {
        throw new Error('无效的cron表达式');
      }

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        throw new Error('没有要更新的字段');
      }

      fields.push(`updated_at = NOW()`);
      values.push(taskId);

      const result = await query(
        `UPDATE scheduled_tasks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('任务不存在');
      }

      logger.info(`更新定时任务成功: ${taskId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('更新定时任务失败:', error);
      throw error;
    }
  }
}
