import { useToast } from '@/composables/useToast'
import { computed, ref } from 'vue'

// 类型定义
interface SystemMetrics {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_latency: number
}

interface Service {
  name: string
  description: string
  status: 'running' | 'stopped' | 'warning'
  uptime: string
  last_check: string
  checking?: boolean
  starting?: boolean
  restarting?: boolean
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info' | 'debug'
  service: string
  message: string
}

/**
 * 系统监控 composable
 */
export function useSystemMonitoring() {
  const { success, error, info } = useToast()
  
  // 响应式数据
  const refreshing = ref(false)
  const checkingServices = ref(false)
  const systemStatus = ref<'healthy' | 'unhealthy'>('healthy')
  const logLevel = ref('all')
  const autoRefreshLogs = ref(false)
  const autoRefreshInterval = ref<NodeJS.Timeout | null>(null)

  // 系统指标
  const systemMetrics = ref<SystemMetrics>({
    cpu_usage: 45,
    memory_usage: 68,
    disk_usage: 32,
    network_latency: 25
  })

  // 服务状态
  const services = ref<Service[]>([
    {
      name: 'API服务',
      description: 'TRON能量租赁API服务',
      status: 'running',
      uptime: '2天 14小时',
      last_check: '2024-01-15 16:30:00'
    },
    {
      name: '数据库',
      description: 'PostgreSQL数据库服务',
      status: 'running',
      uptime: '7天 3小时',
      last_check: '2024-01-15 16:30:00'
    },
    {
      name: 'Redis缓存',
      description: 'Redis缓存服务',
      status: 'running',
      uptime: '5天 12小时',
      last_check: '2024-01-15 16:30:00'
    },
    {
      name: 'Telegram机器人',
      description: 'Telegram机器人服务',
      status: 'warning',
      uptime: '1天 8小时',
      last_check: '2024-01-15 16:25:00'
    },
    {
      name: '监控服务',
      description: '系统监控和告警服务',
      status: 'running',
      uptime: '3天 6小时',
      last_check: '2024-01-15 16:30:00'
    },
    {
      name: '定时任务',
      description: '定时任务调度服务',
      status: 'stopped',
      uptime: '0分钟',
      last_check: '2024-01-15 16:20:00'
    }
  ])

  // 日志数据
  const logs = ref<LogEntry[]>([
    {
      id: '1',
      timestamp: '2024-01-15 16:30:15',
      level: 'info',
      service: 'API',
      message: '用户登录成功: user_123'
    },
    {
      id: '2',
      timestamp: '2024-01-15 16:29:45',
      level: 'warning',
      service: 'TelegramBot',
      message: 'Telegram API响应延迟较高: 2.5s'
    },
    {
      id: '3',
      timestamp: '2024-01-15 16:29:30',
      level: 'error',
      service: 'Scheduler',
      message: '定时任务执行失败: energy_sync_task'
    },
    {
      id: '4',
      timestamp: '2024-01-15 16:29:00',
      level: 'info',
      service: 'Database',
      message: '数据库连接池状态正常: 8/20 连接使用中'
    },
    {
      id: '5',
      timestamp: '2024-01-15 16:28:30',
      level: 'debug',
      service: 'API',
      message: 'Cache hit rate: 85.2%'
    }
  ])

  // 计算属性
  const filteredLogs = computed(() => {
    if (logLevel.value === 'all') {
      return logs.value
    }
    return logs.value.filter(log => log.level === logLevel.value)
  })

  // 方法
  const refreshData = async () => {
    refreshing.value = true
    try {
      // 模拟刷新系统指标
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 随机更新指标数据
      systemMetrics.value = {
        cpu_usage: Math.floor(Math.random() * 100),
        memory_usage: Math.floor(Math.random() * 100),
        disk_usage: Math.floor(Math.random() * 100),
        network_latency: Math.floor(Math.random() * 100)
      }
      
      // 更新系统状态
      const hasHighUsage = systemMetrics.value.cpu_usage > 90 || 
                          systemMetrics.value.memory_usage > 90 ||
                          systemMetrics.value.network_latency > 100
      systemStatus.value = hasHighUsage ? 'unhealthy' : 'healthy'
      
      success('数据刷新成功')
    } catch (error) {
      error('数据刷新失败')
    } finally {
      refreshing.value = false
    }
  }

  const checkAllServices = async () => {
    checkingServices.value = true
    try {
      // 模拟检查所有服务
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 更新服务状态
      services.value.forEach(service => {
        service.last_check = new Date().toLocaleString('zh-CN')
      })
      
      success('所有服务检查完成')
    } catch (error) {
      error('服务检查失败')
    } finally {
      checkingServices.value = false
    }
  }

  const checkService = async (service: Service) => {
    service.checking = true
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      service.last_check = new Date().toLocaleString('zh-CN')
      success(`${service.name} 检查完成`)
    } catch (error) {
      error(`${service.name} 检查失败`)
    } finally {
      service.checking = false
    }
  }

  const startService = async (service: Service) => {
    service.starting = true
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      service.status = 'running'
      service.uptime = '刚刚启动'
      service.last_check = new Date().toLocaleString('zh-CN')
      success(`${service.name} 启动成功`)
    } catch (error) {
      error(`${service.name} 启动失败`)
    } finally {
      service.starting = false
    }
  }

  const restartService = async (service: Service) => {
    service.restarting = true
    try {
      await new Promise(resolve => setTimeout(resolve, 3000))
      service.uptime = '刚刚重启'
      service.last_check = new Date().toLocaleString('zh-CN')
      success(`${service.name} 重启成功`)
    } catch (error) {
      error(`${service.name} 重启失败`)
    } finally {
      service.restarting = false
    }
  }

  const clearLogs = () => {
    logs.value = []
    success('日志已清空')
  }

  const toggleAutoRefresh = () => {
    autoRefreshLogs.value = !autoRefreshLogs.value
    
    if (autoRefreshLogs.value) {
      autoRefreshInterval.value = setInterval(() => {
        // 模拟新日志
        const newLog: LogEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('zh-CN'),
          level: ['info', 'warning', 'error', 'debug'][Math.floor(Math.random() * 4)] as any,
          service: ['API', 'Database', 'TelegramBot', 'Scheduler'][Math.floor(Math.random() * 4)],
          message: `自动生成的日志消息 ${Date.now()}`
        }
        logs.value.unshift(newLog)
        
        // 限制日志数量
        if (logs.value.length > 50) {
          logs.value = logs.value.slice(0, 50)
        }
      }, 3000)
      
      success('已开启日志自动刷新')
    } else {
      if (autoRefreshInterval.value) {
        clearInterval(autoRefreshInterval.value)
        autoRefreshInterval.value = null
      }
      info('已停止日志自动刷新')
    }
  }

  const handleLogLevelChange = (level: string) => {
    logLevel.value = level
  }

  // 清理函数
  const cleanup = () => {
    if (autoRefreshInterval.value) {
      clearInterval(autoRefreshInterval.value)
      autoRefreshInterval.value = null
    }
  }

  return {
    // 状态
    refreshing,
    checkingServices,
    systemStatus,
    logLevel,
    autoRefreshLogs,
    systemMetrics,
    services,
    logs,
    
    // 计算属性
    filteredLogs,
    
    // 方法
    refreshData,
    checkAllServices,
    checkService,
    startService,
    restartService,
    clearLogs,
    toggleAutoRefresh,
    handleLogLevelChange,
    cleanup
  }
}

