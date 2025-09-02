export function useStakeFormatters() {
  // 格式化TRX数量
  const formatTrx = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M TRX`
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K TRX`
    }
    return `${amount.toFixed(2)} TRX`
  }

  // 格式化能量数量
  const formatEnergy = (energy: number): string => {
    if (energy >= 1000000) {
      return `${(energy / 1000000).toFixed(2)}M`
    } else if (energy >= 1000) {
      return `${(energy / 1000).toFixed(2)}K`
    }
    return energy.toString()
  }

  // 格式化地址
  const formatAddress = (address: string): string => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 获取状态样式类
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'available':
        return 'text-blue-600 bg-blue-100'
      case 'withdrawn':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  // 获取状态文本
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'success':
        return '成功'
      case 'pending':
        return '处理中'
      case 'failed':
        return '失败'
      case 'available':
        return '可提取'
      case 'withdrawn':
        return '已提取'
      default:
        return '未知'
    }
  }

  // 获取资源类型文本
  const getResourceTypeText = (type: string): string => {
    return type === 'ENERGY' ? '能量' : '带宽'
  }

  // 获取操作类型文本
  const getOperationTypeText = (type: string): string => {
    switch (type) {
      case 'freeze':
        return '质押'
      case 'unfreeze':
        return '解质押'
      case 'delegate':
        return '委托'
      case 'undelegate':
        return '取消委托'
      default:
        return type
    }
  }

  return {
    formatTrx,
    formatEnergy,
    formatAddress,
    formatDate,
    getStatusClass,
    getStatusText,
    getResourceTypeText,
    getOperationTypeText
  }
}
