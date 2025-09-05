/**
 * 配置历史相关的工具函数
 */

/**
 * 获取操作类型文本
 */
export const getActionTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    enable: '启用',
    disable: '禁用',
    activate: '启用',
    deactivate: '禁用'
  }
  return typeMap[type] || type
}

/**
 * 获取操作类型颜色
 */
export const getActionTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
    enable: 'success',
    disable: 'warning',
    activate: 'success',
    deactivate: 'warning'
  }
  return colorMap[type] || 'info'
}

/**
 * 获取配置类型文本
 */
export const getConfigTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    bot: '机器人配置',
    telegram_bot: '机器人配置', 
    network: '网络配置',
    tron_network: '网络配置',
    energy_pool: '能量池配置',
    system: '系统配置',
    system_config: '系统配置',
    bot_network_config: '机器人网络配置'
  }
  return typeMap[type] || type
}

/**
 * 安全的时间格式化
 */
export const formatTime = (time: string): string => {
  try {
    if (!time) return '未知时间'
    return new Date(time).toLocaleString('zh-CN')
  } catch (error) {
    console.warn('Time formatting error:', error)
    return time || '未知时间'
  }
}

/**
 * 安全的JSON字符串化函数
 */
export const safeStringify = (obj: any): string => {
  try {
    if (obj === null || obj === undefined) return 'null'
    return JSON.stringify(obj, null, 2)
  } catch (error) {
    console.warn('JSON stringify error:', error)
    return String(obj) || 'null'
  }
}

/**
 * 生成配置历史记录标题
 */
export const generateConfigTitle = (entityType: string, operationType: string): string => {
  const entityTypeText = getConfigTypeText(entityType).replace('配置', '')
  const operationTypeText = getActionTypeText(operationType)
  return `${operationTypeText}${entityTypeText}配置`
}

/**
 * 判断配置是否可以回滚
 */
export const canRollback = (operationType: string, isRollback?: boolean): boolean => {
  // 只有更新操作才能回滚，创建和删除操作通常不能回滚
  return operationType === 'update' && !isRollback
}
