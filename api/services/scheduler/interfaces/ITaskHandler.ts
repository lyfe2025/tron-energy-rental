/**
 * 定时任务处理器接口
 * 所有定时任务处理器都必须实现此接口
 */
export interface ITaskHandler {
  /**
   * 任务名称（唯一标识）
   */
  readonly name: string;
  
  /**
   * 任务描述
   */
  readonly description: string;
  
  /**
   * 默认的Cron表达式
   */
  readonly defaultCronExpression: string;
  
  /**
   * 是否为关键任务（影响系统健康检查）
   */
  readonly critical: boolean;
  
  /**
   * 执行任务的主要方法
   * @returns Promise<TaskExecutionResult> 任务执行结果
   */
  execute(): Promise<TaskExecutionResult>;
  
  /**
   * 任务执行前的验证
   * @returns boolean 是否可以执行
   */
  canExecute?(): Promise<boolean>;
  
  /**
   * 任务执行前的准备工作
   */
  prepare?(): Promise<void>;
  
  /**
   * 任务执行后的清理工作
   */
  cleanup?(): Promise<void>;
}

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
  /**
   * 执行是否成功
   */
  success: boolean;
  
  /**
   * 执行输出信息
   */
  output: string;
  
  /**
   * 错误信息（如果有）
   */
  error?: string;
  
  /**
   * 执行开始时间
   */
  startTime: Date;
  
  /**
   * 执行结束时间
   */
  endTime: Date;
  
  /**
   * 额外的执行数据
   */
  metadata?: Record<string, any>;
}

/**
 * 任务执行状态
 */
export enum TaskExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

/**
 * 任务配置信息
 */
export interface TaskConfig {
  id: string;
  name: string;
  cron_expression: string;
  command: string;
  description: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  next_run?: Date;
  last_run?: Date;
}
