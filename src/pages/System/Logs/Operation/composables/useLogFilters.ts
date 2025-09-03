export function useLogFilters() {
  // 获取操作类型颜色
  const getOperationColor = (operation: string): string => {
    const colorMap: Record<string, string> = {
      'create': 'bg-green-100 text-green-800',
      'update': 'bg-blue-100 text-blue-800',
      'delete': 'bg-red-100 text-red-800',
      'query': 'bg-gray-100 text-gray-800'
    }
    return colorMap[operation] || 'bg-gray-100 text-gray-800'
  }

  // 获取操作类型文本
  const getOperationText = (operation: string): string => {
    const textMap: Record<string, string> = {
      'create': '新增',
      'update': '修改',
      'delete': '删除',
      'query': '查询'
    }
    return textMap[operation] || operation
  }

  // 格式化日期
  const formatDate = (dateString: string): string => {
    if (!dateString) return '-'
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

  return {
    getOperationColor,
    getOperationText,
    formatDate
  }
}
