/**
 * 服务状态监控相关类型定义
 * 从 ServiceStatus.vue 中分离的类型定义
 */

export interface ServiceStatus {
  name: string
  type: string
  status: 'healthy' | 'warning' | 'error'
  responseTime: number
  lastCheck: string
  uptime?: number
  version?: string
  error?: string
  healthChecks?: HealthCheck[]
}

export interface HealthCheck {
  name: string
  status: 'pass' | 'fail'
}

export interface SystemStats {
  cpu: {
    usage: number
    cores?: number
  }
  memory: {
    usage: number
    used: number
    total: number
  }
  disk: {
    usage: number
    used: number
    total: number
  }
}
