/**
 * 机器人集成服务类型定义
 */

export interface BotConfig {
  // 基本信息
  token: string;
  botId: string;
  name: string;
  username: string;
  description?: string;
  
  // 工作模式
  workMode?: 'polling' | 'webhook';
  polling: boolean;
  webhook: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  
  // 网络配置
  networkId?: number;
  networkConfig?: {
    id: number;
    name: string;
    apiUrl: string;
    apiKey: string;
    isTestnet: boolean;
    isActive: boolean;
  };
  
  // 状态
  isActive: boolean;
  
  // 配置数据
  keyboardConfig?: any;
  priceConfig?: any;
  settings?: any;
  
  // 连接配置
  maxConnections?: number;
  
  // 消息配置
  welcomeMessage?: string;
  helpMessage?: string;
  
  // 时间戳
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ModuleConfig {
  name: string;
  enabled: boolean;
  config?: any;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  details?: any;
}

export interface ServiceStats {
  uptime: number;
  messageCount: number;
  errorCount: number;
  lastActivity: Date;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  metadata?: any;
}
