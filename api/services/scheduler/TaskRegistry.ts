import { logger } from '../../utils/logger';
import type { ITaskHandler } from './interfaces/ITaskHandler';

/**
 * 任务注册器
 * 负责管理所有任务处理器的注册和获取
 */
export class TaskRegistry {
  private static instance: TaskRegistry;
  private handlers: Map<string, ITaskHandler> = new Map();

  private constructor() {}

  /**
   * 获取任务注册器实例（单例模式）
   */
  static getInstance(): TaskRegistry {
    if (!TaskRegistry.instance) {
      TaskRegistry.instance = new TaskRegistry();
    }
    return TaskRegistry.instance;
  }

  /**
   * 注册任务处理器
   */
  register(handler: ITaskHandler): void {
    if (this.handlers.has(handler.name)) {
      throw new Error(`任务处理器已存在: ${handler.name}`);
    }

    this.handlers.set(handler.name, handler);
    logger.info(`注册任务处理器: ${handler.name} - ${handler.description}`);
  }

  /**
   * 批量注册任务处理器
   */
  registerBatch(handlers: ITaskHandler[]): void {
    for (const handler of handlers) {
      try {
        this.register(handler);
      } catch (error) {
        logger.error(`注册任务处理器失败: ${handler.name}`, error);
      }
    }
  }

  /**
   * 获取任务处理器
   */
  get(taskName: string): ITaskHandler | undefined {
    return this.handlers.get(taskName);
  }

  /**
   * 检查任务处理器是否存在
   */
  has(taskName: string): boolean {
    return this.handlers.has(taskName);
  }

  /**
   * 获取所有已注册的任务名称
   */
  getTaskNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 获取所有已注册的任务处理器
   */
  getAllHandlers(): ITaskHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * 获取关键任务列表
   */
  getCriticalTasks(): ITaskHandler[] {
    return this.getAllHandlers().filter(handler => handler.critical);
  }

  /**
   * 移除任务处理器
   */
  unregister(taskName: string): boolean {
    const removed = this.handlers.delete(taskName);
    if (removed) {
      logger.info(`移除任务处理器: ${taskName}`);
    }
    return removed;
  }

  /**
   * 清空所有任务处理器
   */
  clear(): void {
    const count = this.handlers.size;
    this.handlers.clear();
    logger.info(`清空所有任务处理器，共移除 ${count} 个`);
  }

  /**
   * 获取任务处理器统计信息
   */
  getStats(): {
    total: number;
    critical: number;
    registered: string[];
  } {
    const handlers = this.getAllHandlers();
    return {
      total: handlers.length,
      critical: handlers.filter(h => h.critical).length,
      registered: handlers.map(h => h.name)
    };
  }

  /**
   * 验证所有任务处理器的有效性
   */
  async validateAll(): Promise<{
    valid: ITaskHandler[];
    invalid: { handler: ITaskHandler; error: string }[];
  }> {
    const valid: ITaskHandler[] = [];
    const invalid: { handler: ITaskHandler; error: string }[] = [];

    for (const handler of this.getAllHandlers()) {
      try {
        // 验证基本属性
        if (!handler.name || !handler.description || !handler.defaultCronExpression) {
          throw new Error('缺少必需的属性');
        }

        // 验证是否可以执行
        if (handler.canExecute) {
          await handler.canExecute();
        }

        valid.push(handler);
      } catch (error) {
        invalid.push({
          handler,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { valid, invalid };
  }
}

// 导出单例实例
export const taskRegistry = TaskRegistry.getInstance();
