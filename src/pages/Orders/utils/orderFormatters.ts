/**
 * 订单格式化工具函数
 * 处理订单数据的显示格式化
 */

/**
 * 格式化日期时间
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 格式化地址显示
 */
export const formatAddress = (address: string): string => {
  if (!address) return '-'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * 格式化数字显示
 */
export const formatNumber = (num: number): string => {
  if (!num) return '0'
  return num.toLocaleString()
}

/**
 * 获取订单金额
 */
interface OrderForAmount {
  price_trx?: number
  price?: number
  payment_trx_amount?: string | number
  payment_amount?: number
}

export const getOrderAmount = (order: OrderForAmount): string => {
  // 按优先级顺序获取价格：payment_trx_amount > price_trx > payment_amount > price
  if (order.payment_trx_amount) {
    const amount = typeof order.payment_trx_amount === 'string' 
      ? parseFloat(order.payment_trx_amount) 
      : order.payment_trx_amount
    return amount.toFixed(2)
  }
  
  if (order.price_trx) {
    return order.price_trx.toFixed(2)
  }
  
  if (order.payment_amount) {
    return order.payment_amount.toFixed(2)
  }
  
  if (order.price) {
    return parseFloat(order.price.toString()).toFixed(2)
  }
  
  return '0.00'
}

/**
 * 计算订单笔数（根据能量闪租配置）
 */
interface OrderForCount {
  price_trx?: number
  price?: number
  payment_trx_amount?: string | number
}

export const calculateOrderCount = (order: OrderForCount): number => {
  // 首先尝试从payment_trx_amount获取价格
  let price = 0
  if (order.payment_trx_amount) {
    price = typeof order.payment_trx_amount === 'string' 
      ? parseFloat(order.payment_trx_amount) 
      : order.payment_trx_amount
  } else {
    price = order.price_trx || order.price || 0
  }
  
  // 如果没有价格信息，默认为1笔
  if (!price) return 1
  
  // 根据能量闪租配置计算笔数
  // single_price通常为2-3 TRX每笔
  // 常见配置: 2 TRX = 1笔, 4 TRX = 2笔, 6 TRX = 3笔...
  const estimatedSinglePrice = 2 // 默认单笔价格2 TRX
  const calculatedCount = Math.round(price / estimatedSinglePrice)
  
  // 确保至少为1笔，最多不超过20笔（合理范围）
  return Math.max(1, Math.min(20, calculatedCount))
}

/**
 * 网络信息接口
 */
interface NetworkInfo {
  id: number
  name: string
  type?: string
  explorer_url?: string
  is_active: boolean
}

/**
 * 根据网络信息获取交易浏览器URL
 */
export const getTransactionUrl = (txHash: string, network?: NetworkInfo): string => {
  if (!txHash) return ''
  
  // 如果有网络的explorer_url，使用它
  if (network?.explorer_url) {
    // 处理不同格式的explorer_url
    const baseUrl = network.explorer_url.replace(/\/$/, '') // 移除末尾的斜杠
    
    // 根据不同的浏览器格式构建URL
    if (baseUrl.includes('tronscan.org')) {
      return `${baseUrl}/#/transaction/${txHash}`
    } else if (baseUrl.includes('trongrid.io')) {
      return `${baseUrl}/transaction/${txHash}`
    } else if (baseUrl.includes('shasta.tronscan.org')) {
      return `${baseUrl}/#/transaction/${txHash}`
    } else if (baseUrl.includes('nile.tronscan.org')) {
      return `${baseUrl}/#/transaction/${txHash}`
    } else {
      // 通用格式，假设是标准的浏览器格式
      return `${baseUrl}/transaction/${txHash}`
    }
  }
  
  // 如果没有网络信息，根据网络类型使用默认浏览器
  if (network?.type) {
    switch (network.type.toLowerCase()) {
      case 'mainnet':
      case 'tron_mainnet':
        return `https://tronscan.org/#/transaction/${txHash}`
      case 'testnet':
      case 'shasta':
      case 'tron_shasta':
        return `https://shasta.tronscan.org/#/transaction/${txHash}`
      case 'nile':
      case 'tron_nile':
        return `https://nile.tronscan.org/#/transaction/${txHash}`
      default:
        return `https://tronscan.org/#/transaction/${txHash}`
    }
  }
  
  // 默认使用主网浏览器
  return `https://tronscan.org/#/transaction/${txHash}`
}

/**
 * 打开交易链接
 */
export const viewTransaction = (txHash: string, network?: NetworkInfo): void => {
  if (!txHash) return
  const url = getTransactionUrl(txHash, network)
  if (url) {
    window.open(url, '_blank')
  }
}
