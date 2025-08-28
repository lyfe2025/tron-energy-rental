/**
 * 环境配置工具类
 * 基于 VITE_ENV 环境变量提供不同环境的配置和功能
 */

// 环境类型定义
export type Environment = 'development' | 'staging' | 'production'

// 获取当前环境
export const getCurrentEnv = (): Environment => {
  return (import.meta.env.VITE_ENV as Environment) || 'development'
}

// 环境检查函数
export const isDevelopment = (): boolean => getCurrentEnv() === 'development'
export const isStaging = (): boolean => getCurrentEnv() === 'staging'
export const isProduction = (): boolean => getCurrentEnv() === 'production'

// 基于环境的配置
export const envConfig = {
  // 是否显示调试信息
  showDebugInfo: isDevelopment() || isStaging(),
  
  // 是否启用控制台日志
  enableConsoleLog: !isProduction(),
  
  // 是否显示开发工具
  showDevTools: isDevelopment(),
  
  // API 请求超时时间
  apiTimeout: isDevelopment() ? 30000 : 10000,
  
  // 是否启用错误边界详细信息
  enableErrorDetails: !isProduction(),
  
  // 应用标题后缀
  titleSuffix: {
    development: ' - 开发环境',
    staging: ' - 预发布',
    production: ''
  }[getCurrentEnv()]
}

// 环境特定的日志函数
export const envLog = {
  debug: (...args: unknown[]) => {
    if (envConfig.showDebugInfo) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args)
    }
  },
  
  info: (...args: unknown[]) => {
    if (envConfig.enableConsoleLog) {
      // eslint-disable-next-line no-console
      console.info('[INFO]', ...args)
    }
  },
  
  warn: (...args: unknown[]) => {
    if (envConfig.enableConsoleLog) {
      // eslint-disable-next-line no-console
      console.warn('[WARN]', ...args)
    }
  },
  
  error: (...args: unknown[]) => {
    // 错误日志在所有环境下都显示
    // eslint-disable-next-line no-console
    console.error('[ERROR]', ...args)
  }
}

// 环境信息
export const getEnvInfo = () => ({
  env: getCurrentEnv(),
  nodeEnv: import.meta.env.NODE_ENV,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  apiUrl: import.meta.env.VITE_API_URL,
  devtools: import.meta.env.VITE_VUE_DEVTOOLS,
  build: {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
})

// 开发环境下在控制台显示环境信息
if (isDevelopment()) {
  // eslint-disable-next-line no-console
  console.group('🚀 环境信息')
  // eslint-disable-next-line no-console
  console.table(getEnvInfo())
  // eslint-disable-next-line no-console
  console.groupEnd()
}
