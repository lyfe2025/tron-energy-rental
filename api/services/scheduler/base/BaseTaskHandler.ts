import { logger } from '../../../utils/logger';
import type { ITaskHandler, TaskExecutionResult } from '../interfaces/ITaskHandler';

/**
 * 定时任务处理器基类
 * 提供任务执行的通用逻辑和错误处理
 */
export abstract class BaseTaskHandler implements ITaskHandler {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly defaultCronExpression: string;
  abstract readonly critical: boolean;

  /**
   * 执行超时时间（毫秒）
   */
  protected timeout: number = 5 * 60 * 1000; // 5分钟

  /**
   * 最大重试次数
   */
  protected maxRetries: number = 3;

  /**
   * 重试延迟时间（毫秒）
   */
  protected retryDelay: number = 1000;

  /**
   * 任务执行的模板方法
   */
  async execute(): Promise<TaskExecutionResult> {
    const startTime = new Date();
    let result: TaskExecutionResult;

    try {
      logger.info(`开始执行定时任务: ${this.name}`);

      // 执行前验证
      if (!(await this.canExecute())) {
        throw new Error('任务执行前验证失败');
      }

      // 执行前准备
      await this.prepare();

      // 核心业务逻辑执行
      const output = await this.executeWithRetry();

      result = {
        success: true,
        output,
        startTime,
        endTime: new Date(),
        metadata: {
          handlerClass: this.constructor.name,
          timeout: this.timeout,
          maxRetries: this.maxRetries
        }
      };

      logger.info(`定时任务执行成功: ${this.name} - ${output}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      result = {
        success: false,
        output: `任务执行失败: ${errorMessage}`,
        error: errorMessage,
        startTime,
        endTime: new Date(),
        metadata: {
          handlerClass: this.constructor.name,
          timeout: this.timeout,
          maxRetries: this.maxRetries
        }
      };

      logger.error(`定时任务执行失败: ${this.name}`, error);
    } finally {
      // 执行后清理
      try {
        await this.cleanup();
      } catch (cleanupError) {
        logger.error(`任务清理失败: ${this.name}`, cleanupError);
      }
    }

    return result;
  }

  /**
   * 带重试机制的执行
   */
  private async executeWithRetry(): Promise<string> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.executeWithTimeout();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('执行失败');
        
        if (attempt < this.maxRetries) {
          logger.warn(`任务执行失败，准备重试 (${attempt}/${this.maxRetries}): ${this.name}`, error);
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 带超时控制的执行
   */
  private async executeWithTimeout(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`任务执行超时 (${this.timeout}ms)`));
      }, this.timeout);

      this.doExecute()
        .then((output) => {
          clearTimeout(timeoutId);
          resolve(output);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * 子类需要实现的具体执行逻辑
   */
  protected abstract doExecute(): Promise<string>;

  /**
   * 任务执行前的验证（子类可重写）
   */
  async canExecute(): Promise<boolean> {
    return true;
  }

  /**
   * 任务执行前的准备工作（子类可重写）
   */
  async prepare(): Promise<void> {
    // 默认无需准备工作
  }

  /**
   * 任务执行后的清理工作（子类可重写）
   */
  async cleanup(): Promise<void> {
    // 默认无需清理工作
  }

  /**
   * 延迟工具方法
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 格式化执行结果
   */
  protected formatResult(processed: number, failed: number, type: string): string {
    return `${type}处理完成: ${processed} 个成功, ${failed} 个失败`;
  }

  /**
   * 安全执行数据库查询
   */
  protected async safeQuery<T = any>(queryFn: () => Promise<T>, errorMessage: string): Promise<T> {
    try {
      return await queryFn();
    } catch (error) {
      logger.error(errorMessage, error);
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}
