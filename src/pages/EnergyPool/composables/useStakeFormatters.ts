export function useStakeFormatters() {
  // 格式化TRX数量 - 直观显示，无K/M后缀
  const formatTrx = (amount: number): string => {
    // 检查amount是否为有效数字
    if (amount == null || isNaN(amount) || typeof amount !== 'number') {
      return '0 TRX'
    }
    
    // 直接显示完整数字，不使用K/M后缀
    // 对于整数不显示小数点，对于小数保留必要位数
    if (amount === Math.floor(amount)) {
      return `${amount.toLocaleString('zh-CN')} TRX`
    } else if (amount >= 1) {
      return `${amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} TRX`
    } else {
      return `${amount.toFixed(6)} TRX`
    }
  }

  // 格式化能量数量 - 直观显示，无小数点
  const formatEnergy = (energy: number): string => {
    // 检查energy是否为有效数字
    if (energy == null || isNaN(energy) || typeof energy !== 'number') {
      return '0'
    }
    
    // 直接显示完整数字，不使用K/M后缀，不显示小数点
    return Math.floor(energy).toLocaleString('zh-CN')
  }

  // 格式化带宽数量 - 直观显示，无小数点
  const formatBandwidth = (bandwidth: number): string => {
    // 检查bandwidth是否为有效数字
    if (bandwidth == null || isNaN(bandwidth) || typeof bandwidth !== 'number') {
      return '0'
    }
    
    // 直接显示完整数字，不使用K/M后缀，不显示小数点
    return Math.floor(bandwidth).toLocaleString('zh-CN')
  }

  // 格式化地址
  const formatAddress = (address: string): string => {
    if (!address || typeof address !== 'string') return ''
    if (address.length < 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // 格式化日期
  const formatDate = (dateString: string): string => {
    if (!dateString || typeof dateString !== 'string') return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleString('zh-CN')
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
    console.log(`[useStakeFormatters] 🎯 状态转换: "${status}" (${typeof status})`);
    
    switch (status) {
      case 'success':
        return '成功'
      case 'confirmed':
        return '已确认'
      case 'pending':
        return '处理中'
      case 'failed':
        return '失败'
      case 'available':
        return '可提取'
      case 'withdrawn':
        return '已提取'
      case 'withdrawable':
        return '可提取'
      case 'unfreezing':
        return '解质押中'
      default:
        console.warn(`[useStakeFormatters] ⚠️ 未识别的状态: "${status}"`);
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
        return '代理'
      case 'undelegate':
        return '取消代理'
      default:
        return type
    }
  }

  return {
    formatTrx,
    formatEnergy,
    formatBandwidth,
    formatAddress,
    formatDate,
    getStatusClass,
    getStatusText,
    getResourceTypeText,
    getOperationTypeText
  }
}
