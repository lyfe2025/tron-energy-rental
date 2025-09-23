/**
 * 机器人生命周期管理器
 * 负责机器人的启动、停止、重启等生命周期操作
 */
import { DatabaseAdapter } from '../integrated/adapters/DatabaseAdapter.ts';
import { BotOrchestrator } from '../integrated/components/BotOrchestrator.ts';
import { ModuleManager } from '../integrated/components/ModuleManager.ts';
import type { BotConfig } from '../integrated/types/bot.types.ts';

export type BotStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error' | 'restarting';

export interface LifecycleState {
  status: BotStatus;
  isInitialized: boolean;
  isRunning: boolean;
  startTime?: Date;
  stopTime?: Date;
  restartCount: number;
  lastError?: string;
}

export class BotLifecycleManager {
  private databaseAdapter: DatabaseAdapter;
  private state: LifecycleState;
  private botId: string | null = null;
  private config: BotConfig | null = null;

  constructor() {
    this.databaseAdapter = DatabaseAdapter.getInstance();
    this.state = {
      status: 'stopped',
      isInitialized: false,
      isRunning: false,
      restartCount: 0
    };
  }

  /**
   * 设置机器人 ID 和配置
   */
  setBotContext(botId: string, config: BotConfig): void {
    this.botId = botId;
    this.config = config;
    this.state.isInitialized = true;
  }

  /**
   * 启动机器人
   */
  async start(orchestrator: BotOrchestrator): Promise<void> {
    if (!this.botId || !this.config) {
      throw new Error('机器人上下文未设置');
    }

    if (this.state.status === 'running') {
      throw new Error('机器人已在运行中');
    }

    try {
      this.updateStatus('starting');
      console.log(`🚀 启动机器人: ${this.config.name}`);

      // 启动协调器
      await orchestrator.start();

      // 更新状态
      this.updateStatus('running');
      this.state.startTime = new Date();
      this.state.isRunning = true;

      // 更新数据库状态
      await this.databaseAdapter.updateBotStatus(this.botId, 'running');
      await this.databaseAdapter.logBotActivity(this.botId, 'start', '机器人启动');

      console.log(`✅ 机器人启动成功: ${this.config.name}`);

    } catch (error) {
      console.error('❌ 机器人启动失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.updateStatus('error', errorMessage);
      
      // 更新数据库状态
      await this.databaseAdapter.updateBotStatus(this.botId, 'error', {
        error: errorMessage
      });
      
      throw error;
    }
  }

  /**
   * 停止机器人
   */
  async stop(orchestrator: BotOrchestrator, moduleManager: ModuleManager): Promise<void> {
    if (!this.botId || !this.config) {
      throw new Error('机器人上下文未设置');
    }

    if (this.state.status === 'stopped') {
      return; // 已经停止
    }

    try {
      this.updateStatus('stopping');
      console.log(`🛑 停止机器人: ${this.config.name}`);

      // 停止协调器
      if (orchestrator) {
        await orchestrator.stop();
      }

      // 关闭模块
      if (moduleManager) {
        await moduleManager.shutdownModules();
      }

      // 更新状态
      this.updateStatus('stopped');
      this.state.stopTime = new Date();
      this.state.isRunning = false;

      // 更新数据库状态
      await this.databaseAdapter.updateBotStatus(this.botId, 'stopped');
      await this.databaseAdapter.logBotActivity(this.botId, 'stop', '机器人停止');

      console.log(`✅ 机器人停止成功: ${this.config.name}`);

    } catch (error) {
      console.error('❌ 机器人停止失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.updateStatus('error', errorMessage);
      
      throw error;
    }
  }

  /**
   * 重启机器人
   */
  async restart(
    orchestrator: BotOrchestrator, 
    moduleManager: ModuleManager,
    restartDelay: number = 2000
  ): Promise<void> {
    if (!this.botId || !this.config) {
      throw new Error('机器人上下文未设置');
    }

    try {
      this.updateStatus('restarting');
      console.log(`🔄 重启机器人: ${this.config.name}`);
      
      // 停止机器人
      await this.stop(orchestrator, moduleManager);
      
      // 等待指定时间
      await new Promise(resolve => setTimeout(resolve, restartDelay));
      
      // 启动机器人
      await this.start(orchestrator);
      
      // 增加重启计数
      this.state.restartCount++;

      // 记录重启活动
      await this.databaseAdapter.logBotActivity(
        this.botId, 
        'restart', 
        `机器人重启 (第${this.state.restartCount}次)`
      );

      console.log(`✅ 机器人重启成功: ${this.config.name} (第${this.state.restartCount}次重启)`);

    } catch (error) {
      console.error('❌ 机器人重启失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.updateStatus('error', errorMessage);
      
      throw error;
    }
  }

  /**
   * 强制停止机器人（紧急情况）
   */
  async forceStop(): Promise<void> {
    if (!this.botId) {
      return;
    }

    try {
      console.log('🚨 强制停止机器人...');
      
      this.updateStatus('stopped');
      this.state.stopTime = new Date();
      this.state.isRunning = false;

      // 更新数据库状态
      await this.databaseAdapter.updateBotStatus(this.botId, 'stopped');
      await this.databaseAdapter.logBotActivity(this.botId, 'force_stop', '机器人强制停止');

      console.log('✅ 机器人强制停止完成');

    } catch (error) {
      console.error('❌ 强制停止失败:', error);
    }
  }

  /**
   * 优雅关闭（给予足够时间完成当前操作）
   */
  async gracefulShutdown(
    orchestrator: BotOrchestrator, 
    moduleManager: ModuleManager,
    timeout: number = 10000
  ): Promise<void> {
    console.log('🔄 开始优雅关闭...');

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.log('⚠️ 优雅关闭超时，执行强制停止');
        this.forceStop().then(resolve).catch(reject);
      }, timeout);

      this.stop(orchestrator, moduleManager)
        .then(() => {
          clearTimeout(timeoutId);
          console.log('✅ 优雅关闭完成');
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.error('❌ 优雅关闭失败，执行强制停止');
          this.forceStop().then(resolve).catch(reject);
        });
    });
  }

  /**
   * 获取当前状态
   */
  getState(): LifecycleState {
    return { ...this.state };
  }

  /**
   * 获取运行时间
   */
  getUptime(): number {
    if (!this.state.startTime || !this.state.isRunning) {
      return 0;
    }
    return Date.now() - this.state.startTime.getTime();
  }

  /**
   * 获取状态信息
   */
  getStatusInfo(): any {
    const uptime = this.getUptime();
    
    return {
      status: this.state.status,
      isInitialized: this.state.isInitialized,
      isRunning: this.state.isRunning,
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      startTime: this.state.startTime?.toISOString(),
      stopTime: this.state.stopTime?.toISOString(),
      restartCount: this.state.restartCount,
      lastError: this.state.lastError,
      botId: this.botId,
      botName: this.config?.name
    };
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.state.isRunning && this.state.status === 'running';
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  /**
   * 等待状态变更
   */
  async waitForStatus(targetStatus: BotStatus, timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.state.status === targetStatus) {
        resolve(true);
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.state.status === targetStatus) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

  /**
   * 更新状态
   */
  private updateStatus(status: BotStatus, error?: string): void {
    this.state.status = status;
    if (error) {
      this.state.lastError = error;
    } else if (status !== 'error') {
      this.state.lastError = undefined;
    }
  }

  /**
   * 格式化运行时间
   */
  private formatUptime(uptime: number): string {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天 ${hours % 24}小时 ${minutes % 60}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}
