import { logger } from '../../../utils/logger';
import { BaseTaskHandler } from '../base/BaseTaskHandler';

/**
 * 自定义任务处理器示例
 * 这是一个示例，展示如何创建新的定时任务处理器
 * 
 * 使用方法：
 * 1. 继承 BaseTaskHandler 类
 * 2. 实现必需的属性和 doExecute 方法
 * 3. 可选择性地重写其他方法来自定义行为
 * 4. 在数据库的 scheduled_tasks 表中添加对应的任务配置
 * 5. 重启应用或调用重新加载API
 */
export class ExampleCustomHandler extends BaseTaskHandler {
  // 任务名称（必须与数据库中的 name 字段匹配）
  readonly name = 'example-custom-task';
  
  // 任务描述
  readonly description = '示例自定义任务 - 演示如何添加新的定时任务';
  
  // 默认的Cron表达式（每30分钟执行一次）
  readonly defaultCronExpression = '*/30 * * * *';
  
  // 是否为关键任务
  readonly critical = false;

  constructor() {
    super();
    // 自定义配置
    this.timeout = 5 * 60 * 1000; // 5分钟超时
    this.maxRetries = 2; // 最多重试2次
    this.retryDelay = 2000; // 重试延迟2秒
  }

  /**
   * 具体的任务执行逻辑
   * 子类必须实现此方法
   */
  protected async doExecute(): Promise<string> {
    logger.info('🎯 开始执行示例自定义任务...');

    // 模拟一些业务逻辑
    await this.simulateWork();

    // 模拟处理一些数据
    const processedCount = await this.processData();

    // 模拟调用外部API
    const apiResult = await this.callExternalAPI();

    return `示例任务执行完成: 处理了 ${processedCount} 条数据，API调用结果: ${apiResult}`;
  }

  /**
   * 任务执行前的验证（可选重写）
   */
  async canExecute(): Promise<boolean> {
    try {
      // 检查系统资源
      const memUsage = process.memoryUsage();
      const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (memUsageMB > 500) { // 如果内存使用超过500MB
        logger.warn(`内存使用过高 (${memUsageMB}MB)，跳过任务执行`);
        return false;
      }

      // 检查当前时间是否适合执行
      const hour = new Date().getHours();
      if (hour >= 2 && hour <= 5) { // 凌晨2-5点不执行非关键任务
        logger.debug('凌晨时段，跳过非关键任务');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('任务执行条件检查失败:', error);
      return false;
    }
  }

  /**
   * 任务执行前的准备工作（可选重写）
   */
  async prepare(): Promise<void> {
    logger.debug('🔧 准备执行示例自定义任务...');
    
    // 可以在这里做一些准备工作：
    // - 初始化连接
    // - 预热缓存
    // - 检查依赖服务状态
    // - 创建临时数据结构等
    
    await this.delay(100); // 模拟准备时间
  }

  /**
   * 任务执行后的清理工作（可选重写）
   */
  async cleanup(): Promise<void> {
    logger.debug('🧹 清理示例自定义任务资源...');
    
    // 可以在这里做一些清理工作：
    // - 关闭连接
    // - 清理临时数据
    // - 释放资源
    // - 发送完成通知等
    
    await this.delay(50); // 模拟清理时间
  }

  // ============ 私有辅助方法 ============

  /**
   * 模拟工作负载
   */
  private async simulateWork(): Promise<void> {
    logger.debug('模拟执行一些工作...');
    
    // 模拟CPU密集型工作
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.random();
    }
    
    // 模拟异步工作
    await this.delay(1000);
    
    logger.debug(`工作完成，计算结果: ${sum.toFixed(2)}`);
  }

  /**
   * 模拟数据处理
   */
  private async processData(): Promise<number> {
    logger.debug('模拟处理数据...');
    
    // 模拟从数据库或API获取数据
    const mockData = Array.from({ length: Math.floor(Math.random() * 100) + 1 }, (_, i) => ({
      id: i + 1,
      value: Math.random() * 1000,
      timestamp: new Date()
    }));
    
    // 模拟数据处理
    let processedCount = 0;
    for (const item of mockData) {
      // 模拟处理逻辑
      if (item.value > 500) {
        processedCount++;
      }
      
      // 模拟处理时间
      await this.delay(10);
    }
    
    logger.debug(`数据处理完成: ${processedCount}/${mockData.length}`);
    return processedCount;
  }

  /**
   * 模拟外部API调用
   */
  private async callExternalAPI(): Promise<string> {
    logger.debug('模拟外部API调用...');
    
    try {
      // 模拟网络延迟
      await this.delay(500);
      
      // 模拟API调用结果
      const success = Math.random() > 0.1; // 90%成功率
      
      if (success) {
        return '成功';
      } else {
        throw new Error('API调用失败');
      }
    } catch (error) {
      logger.warn('外部API调用失败:', error);
      return '失败';
    }
  }
}

// 使用说明：
// 
// 1. 将这个处理器注册到系统中：
//    import { ExampleCustomHandler } from './ExampleCustomHandler';
//    import { taskRegistry } from '../TaskRegistry';
//    
//    taskRegistry.register(new ExampleCustomHandler());
//
// 2. 在数据库中添加任务配置：
//    INSERT INTO scheduled_tasks (
//      id, name, cron_expression, command, description, is_active
//    ) VALUES (
//      gen_random_uuid(), 
//      'example-custom-task', 
//      '*/30 * * * *', 
//      'example-custom-task', 
//      '示例自定义任务 - 演示如何添加新的定时任务', 
//      true
//    );
//
// 3. 重启应用或调用重新加载API：
//    POST /api/scheduler/reload
