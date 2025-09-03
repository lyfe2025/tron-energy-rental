// 格式化工具函数
export function useDatabaseStats() {
  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化数字
  const formatNumber = (num: number): string => {
    return num.toLocaleString('zh-CN')
  }

  // 格式化日期时间
  const formatDateTime = (dateString: string): string => {
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

  // 格式化日期
  const formatDate = (dateString: string): string => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  }

  return {
    formatSize,
    formatNumber,
    formatDateTime,
    formatDate
  }
}
