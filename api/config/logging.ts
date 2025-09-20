/**
 * 日志配置管理
 * 提供动态日志级别调整和配置管理功能
 */

export interface LoggingConfig {
  // 全局日志级别
  globalLevel: 'error' | 'warn' | 'info' | 'debug';
  
  // 模块特定日志级别
  modulelevels: {
    api?: 'error' | 'warn' | 'info' | 'debug';
    bot?: 'error' | 'warn' | 'info' | 'debug';
    tron?: 'error' | 'warn' | 'info' | 'debug';
    database?: 'error' | 'warn' | 'info' | 'debug';
    system?: 'error' | 'warn' | 'info' | 'debug';
  };
  
  // 输出配置
  outputs: {
    console: boolean;
    file: boolean;
    database: boolean;
  };
  
  // 文件配置
  fileConfig: {
    maxSize: string;
    maxFiles: string;
    compress: boolean;
  };
  
  // 性能监控配置
  performance: {
    enabled: boolean;
    slowRequestThreshold: number; // 毫秒
    slowDatabaseThreshold: number; // 毫秒
  };
  
  // 日志清理配置
  cleanup: {
    enabled: boolean;
    retentionDays: {
      app: number;
      bot: number;
      error: number;
    };
    scheduleHour: number; // 0-23，每天清理的小时
  };
  
  // 防重复日志配置
  deduplication: {
    enabled: boolean;
    windowMinutes: number; // 重复窗口期（分钟）
  };
}

// 默认配置
export const defaultLoggingConfig: LoggingConfig = {
  globalLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  modulelevels: {
    api: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    bot: 'info',
    tron: 'info',
    database: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    system: 'info'
  },
  
  outputs: {
    console: process.env.NODE_ENV === 'development',
    file: true,
    database: false // 暂时禁用数据库日志存储
  },
  
  fileConfig: {
    maxSize: '20m',
    maxFiles: '14d',
    compress: true
  },
  
  performance: {
    enabled: true,
    slowRequestThreshold: 3000, // 3秒
    slowDatabaseThreshold: 1000  // 1秒
  },
  
  cleanup: {
    enabled: true,
    retentionDays: {
      app: 14,   // 应用日志保留14天
      bot: 7,    // 机器人日志保留7天
      error: 30  // 错误日志保留30天
    },
    scheduleHour: 2 // 凌晨2点执行清理
  },
  
  deduplication: {
    enabled: true,
    windowMinutes: 5 // 5分钟内相同的日志只记录一次
  }
};

// 日志配置管理器
class LoggingConfigManager {
  private static instance: LoggingConfigManager;
  private config: LoggingConfig;
  
  private constructor() {
    this.config = { ...defaultLoggingConfig };
    this.loadFromEnvironment();
  }
  
  static getInstance(): LoggingConfigManager {
    if (!LoggingConfigManager.instance) {
      LoggingConfigManager.instance = new LoggingConfigManager();
    }
    return LoggingConfigManager.instance;
  }
  
  // 从环境变量加载配置
  private loadFromEnvironment(): void {
    // 全局日志级别
    if (process.env.LOG_LEVEL) {
      this.config.globalLevel = process.env.LOG_LEVEL as any;
    }
    
    // 性能监控配置
    if (process.env.LOG_SLOW_REQUEST_THRESHOLD) {
      this.config.performance.slowRequestThreshold = parseInt(process.env.LOG_SLOW_REQUEST_THRESHOLD);
    }
    
    if (process.env.LOG_SLOW_DATABASE_THRESHOLD) {
      this.config.performance.slowDatabaseThreshold = parseInt(process.env.LOG_SLOW_DATABASE_THRESHOLD);
    }
    
    // 清理配置
    if (process.env.LOG_RETENTION_DAYS) {
      const days = parseInt(process.env.LOG_RETENTION_DAYS);
      this.config.cleanup.retentionDays.app = days;
      this.config.cleanup.retentionDays.bot = Math.max(days - 7, 3);
    }
    
    // 控制台输出（可通过环境变量强制开启/关闭）
    if (process.env.LOG_CONSOLE !== undefined) {
      this.config.outputs.console = process.env.LOG_CONSOLE === 'true';
    }
    
    // 防重复日志窗口期
    if (process.env.LOG_DEDUP_WINDOW_MINUTES) {
      this.config.deduplication.windowMinutes = parseInt(process.env.LOG_DEDUP_WINDOW_MINUTES);
    }
  }
  
  // 获取当前配置
  getConfig(): LoggingConfig {
    return { ...this.config };
  }
  
  // 更新配置
  updateConfig(updates: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  // 获取模块的有效日志级别
  getEffectiveLevel(module: keyof LoggingConfig['modulelevels']): string {
    return this.config.modulelevels[module] || this.config.globalLevel;
  }
  
  // 检查是否应该记录特定级别的日志
  shouldLog(level: string, module?: keyof LoggingConfig['modulelevels']): boolean {
    const levelOrder = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = module ? this.getEffectiveLevel(module) : this.config.globalLevel;
    
    return levelOrder[level] <= levelOrder[currentLevel];
  }
  
  // 检查是否启用性能监控
  isPerformanceMonitoringEnabled(): boolean {
    return this.config.performance.enabled;
  }
  
  // 获取慢请求阈值
  getSlowRequestThreshold(): number {
    return this.config.performance.slowRequestThreshold;
  }
  
  // 获取慢数据库查询阈值
  getSlowDatabaseThreshold(): number {
    return this.config.performance.slowDatabaseThreshold;
  }
  
  // 检查是否启用防重复日志
  isDeduplicationEnabled(): boolean {
    return this.config.deduplication.enabled;
  }
  
  // 获取防重复窗口期（毫秒）
  getDeduplicationWindow(): number {
    return this.config.deduplication.windowMinutes * 60 * 1000;
  }
  
  // 检查是否启用日志清理
  isCleanupEnabled(): boolean {
    return this.config.cleanup.enabled;
  }
  
  // 获取保留天数
  getRetentionDays(type: 'app' | 'bot' | 'error'): number {
    return this.config.cleanup.retentionDays[type];
  }
  
  // 获取清理调度时间
  getCleanupScheduleHour(): number {
    return this.config.cleanup.scheduleHour;
  }
  
  // 导出配置为JSON
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }
  
  // 从JSON导入配置
  fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      this.updateConfig(parsed);
    } catch (error) {
      throw new Error('无效的配置JSON格式');
    }
  }
}

// 导出配置管理器单例
export const loggingConfig = LoggingConfigManager.getInstance();

// 环境变量配置示例
export const ENV_CONFIG_EXAMPLE = `
# 日志配置环境变量示例
LOG_LEVEL=info                           # 全局日志级别: error, warn, info, debug
LOG_CONSOLE=true                         # 是否输出到控制台
LOG_SLOW_REQUEST_THRESHOLD=3000          # 慢请求阈值（毫秒）
LOG_SLOW_DATABASE_THRESHOLD=1000         # 慢数据库查询阈值（毫秒）
LOG_RETENTION_DAYS=14                    # 日志保留天数
LOG_DEDUP_WINDOW_MINUTES=5               # 防重复日志窗口期（分钟）

# 前端代理日志详细模式（开发时使用）
VITE_PROXY_VERBOSE=false                 # 是否显示详细的代理请求日志
`;

export default loggingConfig;
