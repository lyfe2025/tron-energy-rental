/**
 * 状态管理器
 * 负责管理机器人的运行状态、配置状态和用户会话状态
 */
import type { TelegramBotConfig, TronNetworkConfig } from '../../config/ConfigService.ts';

export interface BotState {
  isInitialized: boolean;
  isRunning: boolean;
  currentConfig: TelegramBotConfig | null;
  networks: TronNetworkConfig[];
  startTime: Date;
  lastConfigUpdate: Date | null;
  errorCount: number;
  lastError: Error | null;
}

export interface UserSession {
  userId: number;
  chatId: number;
  currentState: string;
  lastActivity: Date;
  contextData: Record<string, any>;
}

export class StateManager {
  private botState: BotState;
  private userSessions: Map<number, UserSession>;
  private logger: {
    logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, metadata?: any) => Promise<void>;
  };

  constructor(logger: {
    logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, metadata?: any) => Promise<void>;
  }) {
    this.logger = logger;
    this.botState = {
      isInitialized: false,
      isRunning: false,
      currentConfig: null,
      networks: [],
      startTime: new Date(),
      lastConfigUpdate: null,
      errorCount: 0,
      lastError: null
    };
    this.userSessions = new Map();
  }

  /**
   * 获取机器人状态
   */
  getBotState(): BotState {
    return { ...this.botState };
  }

  /**
   * 更新机器人初始化状态
   */
  setInitialized(initialized: boolean): void {
    this.botState.isInitialized = initialized;
    if (initialized) {
      console.log('✅ 机器人状态: 已初始化');
    }
  }

  /**
   * 更新机器人运行状态
   */
  setRunning(running: boolean): void {
    this.botState.isRunning = running;
    if (running) {
      console.log('✅ 机器人状态: 正在运行');
    } else {
      console.log('⏹️ 机器人状态: 已停止');
    }
  }

  /**
   * 更新机器人配置
   */
  updateConfig(config: TelegramBotConfig | null): void {
    this.botState.currentConfig = config;
    this.botState.lastConfigUpdate = new Date();
    
    if (config) {
      console.log(`🔧 机器人配置已更新: ${config.botName}`);
    }
  }

  /**
   * 更新网络配置
   */
  updateNetworks(networks: TronNetworkConfig[]): void {
    this.botState.networks = networks;
    console.log(`🌐 网络配置已更新: ${networks.length} 个网络`);
  }

  /**
   * 记录错误
   */
  recordError(error: Error): void {
    this.botState.errorCount++;
    this.botState.lastError = error;
    console.error(`❌ 机器人错误 #${this.botState.errorCount}:`, error.message);
  }

  /**
   * 重置错误计数
   */
  resetErrorCount(): void {
    this.botState.errorCount = 0;
    this.botState.lastError = null;
    console.log('✅ 错误计数已重置');
  }

  /**
   * 获取用户会话
   */
  getUserSession(userId: number): UserSession | null {
    return this.userSessions.get(userId) || null;
  }

  /**
   * 创建或更新用户会话
   */
  updateUserSession(userId: number, chatId: number, state?: string, contextData?: Record<string, any>): void {
    const existingSession = this.userSessions.get(userId);
    
    const session: UserSession = {
      userId,
      chatId,
      currentState: state || existingSession?.currentState || 'idle',
      lastActivity: new Date(),
      contextData: contextData || existingSession?.contextData || {}
    };

    this.userSessions.set(userId, session);
  }

  /**
   * 更新用户状态
   */
  setUserState(userId: number, state: string, contextData?: Record<string, any>): void {
    const session = this.userSessions.get(userId);
    if (session) {
      session.currentState = state;
      session.lastActivity = new Date();
      if (contextData) {
        session.contextData = { ...session.contextData, ...contextData };
      }
    }
  }

  /**
   * 清除用户会话
   */
  clearUserSession(userId: number): void {
    this.userSessions.delete(userId);
  }

  /**
   * 清理过期的用户会话
   */
  cleanupExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    const expiredUsers: number[] = [];

    for (const [userId, session] of this.userSessions.entries()) {
      const sessionAge = now.getTime() - session.lastActivity.getTime();
      if (sessionAge > maxAge) {
        expiredUsers.push(userId);
      }
    }

    for (const userId of expiredUsers) {
      this.userSessions.delete(userId);
    }

    if (expiredUsers.length > 0) {
      console.log(`🧹 已清理 ${expiredUsers.length} 个过期用户会话`);
    }
  }

  /**
   * 获取活跃用户统计
   */
  getActiveUsersStats(): {
    total: number;
    byState: Record<string, number>;
    recentActive: number; // 最近1小时活跃
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const byState: Record<string, number> = {};
    let recentActive = 0;

    for (const session of this.userSessions.values()) {
      // 统计各状态用户数
      byState[session.currentState] = (byState[session.currentState] || 0) + 1;
      
      // 统计最近活跃用户
      if (session.lastActivity > oneHourAgo) {
        recentActive++;
      }
    }

    return {
      total: this.userSessions.size,
      byState,
      recentActive
    };
  }

  /**
   * 获取系统健康状态
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    uptime: number;
    errorRate: number;
  } {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 检查初始化状态
    if (!this.botState.isInitialized) {
      issues.push('机器人未初始化');
      status = 'critical';
    }

    // 检查运行状态
    if (!this.botState.isRunning) {
      issues.push('机器人未运行');
      if (status !== 'critical') status = 'warning';
    }

    // 检查错误率
    const uptime = Date.now() - this.botState.startTime.getTime();
    const errorRate = this.botState.errorCount / (uptime / (1000 * 60 * 60)); // 每小时错误数

    if (errorRate > 10) {
      issues.push('错误率过高');
      status = 'critical';
    } else if (errorRate > 5) {
      issues.push('错误率较高');
      if (status !== 'critical') status = 'warning';
    }

    // 检查配置状态
    if (!this.botState.currentConfig) {
      issues.push('机器人配置缺失');
      if (status !== 'critical') status = 'warning';
    }

    // 检查网络配置
    if (this.botState.networks.length === 0) {
      issues.push('网络配置缺失');
      if (status !== 'critical') status = 'warning';
    }

    return {
      status,
      issues,
      uptime: uptime / 1000, // 秒
      errorRate
    };
  }

  /**
   * 导出状态报告
   */
  generateStateReport(): {
    botState: BotState;
    userStats: ReturnType<StateManager['getActiveUsersStats']>;
    healthStatus: ReturnType<StateManager['getHealthStatus']>;
    timestamp: Date;
  } {
    return {
      botState: this.getBotState(),
      userStats: this.getActiveUsersStats(),
      healthStatus: this.getHealthStatus(),
      timestamp: new Date()
    };
  }
}
