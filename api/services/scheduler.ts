import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import { taskRegistry } from './scheduler/TaskRegistry';
import { getAllTaskHandlers } from './scheduler/handlers';
import type { ITaskHandler, TaskConfig } from './scheduler/interfaces/ITaskHandler';

/**
 * 定时任务调度服务
 * 负责动态管理和执行各种定时任务
 */
export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private taskConfigs: Map<string, TaskConfig> = new Map();
  
  /**
   * 启动调度服务
   */
  async start(): Promise<void> {
    logger.info('🚀 启动定时任务调度服务...');
    
    try {
      // 1. 注册所有内置任务处理器
      await this.registerBuiltinHandlers();
      
      // 2. 从数据库加载任务配置
      await this.loadTaskConfigs();
      
      // 3. 启动所有活跃任务
      await this.startActiveTasks();
      
      logger.info('✅ 定时任务调度服务启动成功');
    } catch (error) {
      logger.error('❌ 定时任务调度服务启动失败:', error);
      throw error;
    }
  }
  
  /**
   * 停止所有定时任务
   */
  stop(): void {
    logger.info('🛑 停止定时任务调度服务...');
    
    for (const [name, task] of this.tasks) {
      try {
        task.stop();
        logger.info(`✅ 已停止任务: ${name}`);
      } catch (error) {
        logger.error(`❌ 停止任务失败 ${name}:`, error);
      }
    }
    
    this.tasks.clear();
    this.taskConfigs.clear();
    logger.info('🔚 定时任务调度服务已停止');
  }
  
  /**
   * 注册所有内置任务处理器
   */
  private async registerBuiltinHandlers(): Promise<void> {
    try {
      logger.info('📋 注册内置任务处理器...');
      
      const handlers = getAllTaskHandlers();
      taskRegistry.registerBatch(handlers);
      
      logger.info(`✅ 成功注册 ${handlers.length} 个内置任务处理器`);
    } catch (error) {
      logger.error('❌ 注册内置任务处理器失败:', error);
      throw error;
    }
  }

  /**
   * 从数据库加载任务配置
   */
  private async loadTaskConfigs(): Promise<void> {
    try {
      logger.info('📊 从数据库加载任务配置...');
      
      const { query } = await import('../database/index');
      const result = await query(`
        SELECT 
          id,
          name,
          cron_expression,
          command,
          description,
          is_active,
          created_at,
          updated_at,
          next_run,
          last_run
        FROM scheduled_tasks
        ORDER BY name
      `);

      this.taskConfigs.clear();
      
      for (const row of result.rows) {
        const config: TaskConfig = {
          id: row.id,
          name: row.name,
          cron_expression: row.cron_expression,
          command: row.command,
          description: row.description,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          next_run: row.next_run,
          last_run: row.last_run
        };
        
        this.taskConfigs.set(config.name, config);
      }

      logger.info(`✅ 加载了 ${result.rows.length} 个任务配置`);
    } catch (error) {
      logger.error('❌ 加载任务配置失败:', error);
      throw error;
    }
  }

  /**
   * 启动所有活跃任务
   */
  private async startActiveTasks(): Promise<void> {
    try {
      logger.info('⚡ 启动活跃任务...');
      
      let startedCount = 0;
      let skippedCount = 0;

      for (const [taskName, config] of this.taskConfigs) {
        if (!config.is_active) {
          logger.debug(`⏭️  跳过非活跃任务: ${taskName}`);
          skippedCount++;
          continue;
        }

        const handler = taskRegistry.get(taskName);
        if (!handler) {
          logger.warn(`⚠️  找不到任务处理器: ${taskName}`);
          skippedCount++;
          continue;
        }

        await this.scheduleTask(taskName, config.cron_expression, handler);
        startedCount++;
      }

      logger.info(`✅ 启动完成: ${startedCount} 个任务已启动, ${skippedCount} 个任务被跳过`);
    } catch (error) {
      logger.error('❌ 启动活跃任务失败:', error);
      throw error;
    }
  }

  /**
   * 调度单个任务
   */
  private async scheduleTask(taskName: string, cronExpression: string, handler: ITaskHandler): Promise<void> {
    try {
      // 验证cron表达式
      if (!cron.validate(cronExpression)) {
        throw new Error(`无效的cron表达式: ${cronExpression}`);
      }

      const task = cron.schedule(cronExpression, async () => {
        await this.executeTask(taskName, handler);
      }, {
        timezone: 'Asia/Shanghai'
      });
      
      this.tasks.set(taskName, task);
      
      // 启动任务
      task.start();
      
      logger.info(`📅 任务已调度: ${taskName} (${cronExpression})`);
    } catch (error) {
      logger.error(`❌ 调度任务失败 ${taskName}:`, error);
      throw error;
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask(taskName: string, handler: ITaskHandler): Promise<void> {
    const startTime = new Date();
    
    try {
      logger.info(`🚀 开始执行任务: ${taskName}`);
      
      // 记录任务开始执行
      const logId = await this.logTaskStart(taskName);
      
      // 执行任务
      const result = await handler.execute();
      
      // 记录任务执行结果
      await this.logTaskComplete(logId, result);
      
      // 更新任务最后执行时间
      await this.updateTaskLastRun(taskName);
      
      if (result.success) {
        logger.info(`✅ 任务执行成功: ${taskName} - ${result.output}`);
      } else {
        logger.error(`❌ 任务执行失败: ${taskName} - ${result.error}`);
      }
      
    } catch (error) {
      logger.error(`💥 任务执行异常: ${taskName}`, error);
      
      // 记录异常
      try {
        const logId = await this.logTaskStart(taskName);
        await this.logTaskError(logId, error);
      } catch (logError) {
        logger.error('记录任务执行异常失败:', logError);
      }
    }
  }

  /**
   * 记录任务开始执行
   */
  private async logTaskStart(taskName: string): Promise<string> {
    try {
      const { query } = await import('../database/index');
      const config = this.taskConfigs.get(taskName);
      
      if (!config) {
        throw new Error(`找不到任务配置: ${taskName}`);
      }

      const result = await query(`
        INSERT INTO task_execution_logs (task_id, status, started_at, created_at)
        VALUES ($1, 'running', NOW(), NOW())
        RETURNING id
      `, [config.id]);

      return result.rows[0].id;
    } catch (error) {
      logger.error(`记录任务开始执行失败 ${taskName}:`, error);
      throw error;
    }
  }

  /**
   * 记录任务执行完成
   */
  private async logTaskComplete(logId: string, result: any): Promise<void> {
    try {
      const { query } = await import('../database/index');
      
      await query(`
        UPDATE task_execution_logs
        SET 
          status = $1,
          finished_at = NOW(),
          output = $2,
          error_message = $3
        WHERE id = $4
      `, [
        result.success ? 'success' : 'failed',
        result.output,
        result.error || null,
        logId
      ]);
    } catch (error) {
      logger.error(`记录任务执行完成失败 ${logId}:`, error);
    }
  }

  /**
   * 记录任务执行错误
   */
  private async logTaskError(logId: string, error: any): Promise<void> {
    try {
      const { query } = await import('../database/index');
      
      await query(`
        UPDATE task_execution_logs
        SET 
          status = 'failed',
          finished_at = NOW(),
          error_message = $1
        WHERE id = $2
      `, [
        error instanceof Error ? error.message : '未知错误',
        logId
      ]);
    } catch (logError) {
      logger.error(`记录任务执行错误失败 ${logId}:`, logError);
    }
  }

  /**
   * 更新任务最后执行时间
   */
  private async updateTaskLastRun(taskName: string): Promise<void> {
    try {
      const { query } = await import('../database/index');
      const config = this.taskConfigs.get(taskName);
      
      if (!config) {
        return;
      }

      await query(`
        UPDATE scheduled_tasks
        SET last_run = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [config.id]);
    } catch (error) {
      logger.error(`更新任务最后执行时间失败 ${taskName}:`, error);
    }
  }

  /**
   * 手动触发任务
   */
  async triggerTask(taskName: string): Promise<boolean> {
    try {
      logger.info(`🔧 手动触发任务: ${taskName}`);
      
      // 检查任务是否存在于注册器中
      const handler = taskRegistry.get(taskName);
      if (!handler) {
        logger.error(`❌ 找不到任务处理器: ${taskName}`);
        return false;
      }

      // 执行任务
      await this.executeTask(taskName, handler);
      
      logger.info(`✅ 任务手动执行完成: ${taskName}`);
      return true;
    } catch (error) {
      logger.error(`❌ 手动触发任务失败 ${taskName}:`, error);
      return false;
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(): { name: string; running: boolean }[] {
    return Array.from(this.tasks.entries()).map(([name, task]) => {
      // 检查任务是否仍然存在于调度器中且未被销毁
      try {
        // 如果任务能正常访问其状态，说明还在运行
        const status = (task as any).getStatus ? (task as any).getStatus() : 'active';
        return {
          name,
          running: true // 如果任务在tasks Map中，说明它正在运行
        };
      } catch (error) {
        return {
          name,
          running: false
        };
      }
    });
  }

  /**
   * 获取已注册的任务处理器列表
   */
  getRegisteredHandlers(): ITaskHandler[] {
    return taskRegistry.getAllHandlers();
  }

  /**
   * 获取任务配置
   */
  getTaskConfig(taskName: string): TaskConfig | undefined {
    return this.taskConfigs.get(taskName);
  }

  /**
   * 获取所有任务配置
   */
  getAllTaskConfigs(): TaskConfig[] {
    return Array.from(this.taskConfigs.values());
  }

  /**
   * 重新加载任务配置（从数据库）
   */
  async reloadTaskConfigs(): Promise<void> {
    logger.info('🔄 重新加载任务配置...');
    await this.loadTaskConfigs();
    logger.info('✅ 任务配置重新加载完成');
  }

  /**
   * 启动单个任务
   */
  async startTask(taskName: string): Promise<boolean> {
    try {
      const config = this.taskConfigs.get(taskName);
      if (!config) {
        logger.error(`❌ 找不到任务配置: ${taskName}`);
        return false;
      }

      const handler = taskRegistry.get(taskName);
      if (!handler) {
        logger.error(`❌ 找不到任务处理器: ${taskName}`);
        return false;
      }

      if (this.tasks.has(taskName)) {
        logger.warn(`⚠️  任务已在运行: ${taskName}`);
        return true;
      }

      await this.scheduleTask(taskName, config.cron_expression, handler);
      logger.info(`✅ 启动任务成功: ${taskName}`);
      return true;
    } catch (error) {
      logger.error(`❌ 启动任务失败 ${taskName}:`, error);
      return false;
    }
  }

  /**
   * 停止单个任务
   */
  async stopTask(taskName: string): Promise<boolean> {
    try {
      const task = this.tasks.get(taskName);
      if (!task) {
        logger.warn(`⚠️  任务未在运行: ${taskName}`);
        return true;
      }

      task.stop();
      this.tasks.delete(taskName);
      logger.info(`✅ 停止任务成功: ${taskName}`);
      return true;
    } catch (error) {
      logger.error(`❌ 停止任务失败 ${taskName}:`, error);
      return false;
    }
  }

  /**
   * 重启单个任务
   */
  async restartTask(taskName: string): Promise<boolean> {
    try {
      logger.info(`🔄 重启任务: ${taskName}`);
      
      await this.stopTask(taskName);
      await this.startTask(taskName);
      
      logger.info(`✅ 重启任务成功: ${taskName}`);
      return true;
    } catch (error) {
      logger.error(`❌ 重启任务失败 ${taskName}:`, error);
      return false;
    }
  }

  /**
   * 检查系统健康状态
   */
  getHealthStatus(): {
    healthy: boolean;
    totalTasks: number;
    runningTasks: number;
    criticalTasks: number;
    criticalTasksRunning: number;
    issues: string[];
  } {
    const allTasks = this.getTaskStatus();
    const criticalHandlers = taskRegistry.getCriticalTasks();
    const criticalTaskNames = criticalHandlers.map(h => h.name);
    
    const totalTasks = allTasks.length;
    const runningTasks = allTasks.filter(t => t.running).length;
    const criticalTasks = criticalTaskNames.length;
    const criticalTasksRunning = allTasks
      .filter(t => criticalTaskNames.includes(t.name) && t.running)
      .length;

    const issues: string[] = [];
    
    // 检查关键任务是否都在运行
    for (const taskName of criticalTaskNames) {
      const taskStatus = allTasks.find(t => t.name === taskName);
      if (!taskStatus || !taskStatus.running) {
        issues.push(`关键任务未运行: ${taskName}`);
      }
    }

    // 检查任务注册器状态
    const registryStats = taskRegistry.getStats();
    if (registryStats.total === 0) {
      issues.push('没有注册任何任务处理器');
    }

    const healthy = issues.length === 0 && criticalTasksRunning === criticalTasks;

    return {
      healthy,
      totalTasks,
      runningTasks,
      criticalTasks,
      criticalTasksRunning,
      issues
    };
  }
}

// 创建默认实例
export const schedulerService = new SchedulerService();

// 在应用启动时自动启动调度器
if (process.env.NODE_ENV !== 'test') {
  // 异步启动调度器
  schedulerService.start().catch(error => {
    logger.error('❌ 定时任务调度器启动失败:', error);
    process.exit(1);
  });
  
  // 优雅关闭
  process.on('SIGINT', () => {
    logger.info('📡 收到 SIGINT 信号，正在停止调度器...');
    schedulerService.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('📡 收到 SIGTERM 信号，正在停止调度器...');
    schedulerService.stop();
    process.exit(0);
  });
}