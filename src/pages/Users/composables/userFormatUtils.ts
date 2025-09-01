/**
 * 用户管理格式化工具函数
 * 从 useUserManagement.ts 中安全分离的独立工具函数
 */

// 工具函数 - 格式化日期时间
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 工具函数 - 格式化日期
export const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 工具函数 - 格式化货币
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(amount)
}

// 工具函数 - 获取类型文本
export const getTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    telegram: 'Telegram端',
    h5: 'H5端'
  }
  return typeMap[type] || type
}

// 工具函数 - 获取类型颜色
export const getTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    telegram: 'bg-blue-100 text-blue-800',
    h5: 'bg-green-100 text-green-800'
  }
  return colorMap[type] || 'bg-gray-100 text-gray-800'
}

// 工具函数 - 获取用户类型文本
export const getUserTypeText = (userType: string): string => {
  const userTypeMap: Record<string, string> = {
    normal: '普通用户',
    vip: 'VIP用户',
    premium: '套餐用户'
  }
  return userTypeMap[userType] || userType
}

// 工具函数 - 获取用户类型颜色
export const getUserTypeColor = (userType: string): string => {
  const colorMap: Record<string, string> = {
    normal: 'bg-gray-100 text-gray-800',
    vip: 'bg-yellow-100 text-yellow-800',
    premium: 'bg-purple-100 text-purple-800',
    agent: 'bg-blue-100 text-blue-800',
    admin: 'bg-red-100 text-red-800'
  }
  return colorMap[userType] || 'bg-gray-100 text-gray-800'
}

// 工具函数 - 获取状态文本
export const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: '正常',
    banned: '封禁'
  }
  return statusMap[status] || status
}

// 工具函数 - 获取状态颜色
export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    banned: 'bg-red-100 text-red-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}
