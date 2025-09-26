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
export const formatNumber = (num: number | string): string => {
  if (!num) return '0'
  const numValue = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(numValue)) return '0'
  return numValue.toLocaleString()
}

/**
 * 格式化订单价格显示
 */
interface OrderForPrice {
  payment_trx_amount?: string | number
  price_trx?: number
  price?: number | string
  payment_currency?: 'USDT' | 'TRX'
}

/**
 * 智能确定小数位数
 * @param value 数值
 * @param currency 货币类型
 * @returns 合适的小数位数
 */
const getOptimalDecimalPlaces = (value: number, currency?: string): number => {
  // 对于USDT，支持更高精度显示
  if (currency === 'USDT') {
    // 如果是整数，显示2位小数
    if (value % 1 === 0) return 2
    
    // 如果有小数部分，自动选择合适的精度
    const str = value.toString()
    const decimalPart = str.split('.')[1]
    if (!decimalPart) return 2
    
    // 移除末尾的0，获取有效小数位数
    const trimmed = decimalPart.replace(/0+$/, '')
    return Math.min(Math.max(trimmed.length, 2), 6) // 最少2位，最多6位
  }
  
  // 对于TRX和其他货币，支持更灵活的精度显示
  // 如果数值有3位或更多有效小数位，则显示3位小数
  if (value % 1 !== 0) {
    const str = value.toString()
    const decimalPart = str.split('.')[1]
    if (decimalPart && decimalPart.length >= 3) {
      const trimmed = decimalPart.replace(/0+$/, '')
      if (trimmed.length >= 3) {
        return Math.min(trimmed.length, 6) // 最多6位小数
      }
    }
  }
  
  // 默认2位小数
  return 2
}

export const formatPrice = (order: OrderForPrice): string => {
  const currency = order.payment_currency || 'TRX'
  
  // 优先使用实际支付金额
  if (order.payment_trx_amount) {
    const amount = typeof order.payment_trx_amount === 'string' 
      ? parseFloat(order.payment_trx_amount) 
      : order.payment_trx_amount
    if (!isNaN(amount) && amount > 0) {
      const decimals = getOptimalDecimalPlaces(amount, currency)
      return amount.toFixed(decimals)
    }
  }
  
  // 其次使用price_trx
  if (order.price_trx && order.price_trx > 0) {
    const decimals = getOptimalDecimalPlaces(order.price_trx, currency)
    return order.price_trx.toFixed(decimals)
  }
  
  // 最后使用price
  if (order.price) {
    const price = typeof order.price === 'string' ? parseFloat(order.price) : order.price
    if (!isNaN(price) && price > 0) {
      const decimals = getOptimalDecimalPlaces(price, currency)
      return price.toFixed(decimals)
    }
  }
  
  return '0.00'
}

/**
 * 闪租配置接口
 */
interface FlashRentConfig {
  single_price: number
  energy_per_unit: number
  max_amount: number
}

/**
 * 格式化能量数量显示
 */
interface OrderForEnergy {
  energy_amount?: number | string
  delegated_energy_amount?: number | string
  payment_trx_amount?: string | number
  calculated_units?: number  // 数据库存储的实际笔数
}

export const formatEnergy = (order: OrderForEnergy, config?: FlashRentConfig): string => {
  // 优先使用已委托的能量数量
  if (order.delegated_energy_amount) {
    const amount = typeof order.delegated_energy_amount === 'string'
      ? parseFloat(order.delegated_energy_amount)
      : order.delegated_energy_amount
    if (!isNaN(amount) && amount > 0) {
      return formatNumber(amount)
    }
  }

  // 其次使用数据库存储的能量数量
  if (order.energy_amount) {
    const amount = typeof order.energy_amount === 'string'
      ? parseFloat(order.energy_amount)
      : order.energy_amount
    if (!isNaN(amount) && amount > 0) {
      return formatNumber(amount)
    }
  }

  // 根据数据库存储的笔数和配置计算能量
  if (order.calculated_units && config) {
    const totalEnergy = order.calculated_units * config.energy_per_unit
    if (totalEnergy > 0) {
      return formatNumber(totalEnergy) + ' (基于笔数)'
    }
  }

  // 根据支付金额和配置精确计算
  if (order.payment_trx_amount && config) {
    const paymentAmount = typeof order.payment_trx_amount === 'string'
      ? parseFloat(order.payment_trx_amount)
      : order.payment_trx_amount
      
    if (!isNaN(paymentAmount) && paymentAmount > 0 && config.single_price > 0) {
      // 根据真实配置计算笔数和能量
      const calculatedUnits = Math.floor(paymentAmount / config.single_price)
      const totalEnergy = calculatedUnits * config.energy_per_unit
      
      if (totalEnergy > 0) {
        return formatNumber(totalEnergy) + ' (配置计算)'
      }
    }
  }

  // 如果没有配置，使用粗略估算
  if (order.payment_trx_amount) {
    const paymentAmount = typeof order.payment_trx_amount === 'string'
      ? parseFloat(order.payment_trx_amount)
      : order.payment_trx_amount
    if (!isNaN(paymentAmount) && paymentAmount > 0) {
      // 默认估算：1 TRX ≈ 65,000 能量（此处为静态估算，实际应从系统配置获取）
      const estimatedEnergy = Math.round(paymentAmount * 65000)
      return formatNumber(estimatedEnergy) + ' (估算)'
    }
  }

  return '0'
}

/**
 * 获取订单金额
 */
interface OrderForAmount {
  price_trx?: number
  price?: number
  payment_trx_amount?: string | number
  payment_amount?: number
  payment_currency?: 'USDT' | 'TRX'
}

export const getOrderAmount = (order: OrderForAmount): string => {
  const currency = order.payment_currency || 'TRX'
  
  // 按优先级顺序获取价格：payment_trx_amount > price_trx > payment_amount > price
  if (order.payment_trx_amount) {
    const amount = typeof order.payment_trx_amount === 'string' 
      ? parseFloat(order.payment_trx_amount) 
      : order.payment_trx_amount
    const decimals = getOptimalDecimalPlaces(amount, currency)
    return amount.toFixed(decimals)
  }
  
  if (order.price_trx) {
    const decimals = getOptimalDecimalPlaces(order.price_trx, currency)
    return order.price_trx.toFixed(decimals)
  }
  
  if (order.payment_amount) {
    const decimals = getOptimalDecimalPlaces(order.payment_amount, currency)
    return order.payment_amount.toFixed(decimals)
  }
  
  if (order.price) {
    const price = parseFloat(order.price.toString())
    const decimals = getOptimalDecimalPlaces(price, currency)
    return price.toFixed(decimals)
  }
  
  return '0.00'
}

/**
 * 计算订单笔数（优先使用数据库存储的笔数）
 */
interface OrderForCount {
  price_trx?: number
  price?: number
  payment_trx_amount?: string | number
  calculated_units?: number  // 数据库存储的实际笔数
}

export const calculateOrderCount = (order: OrderForCount, config?: FlashRentConfig): number => {
  // 优先使用数据库中存储的实际笔数
  if (order.calculated_units && order.calculated_units > 0) {
    return order.calculated_units;
  }
  
  // 如果没有存储的笔数，则根据支付金额计算
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
  
  // 根据配置计算笔数
  let singlePrice = 3 // 默认单笔价格3 TRX（与后端默认值保持一致）
  if (config && config.single_price > 0) {
    singlePrice = config.single_price
  }
  
  const calculatedCount = Math.floor(price / singlePrice) // 使用floor确保不超过实际可购买笔数
  
  // 确保至少为1笔，最多不超过配置的最大笔数
  const maxUnits = config?.max_amount || 20
  return Math.max(1, Math.min(maxUnits, calculatedCount))
}

/**
 * 网络信息接口
 */
interface NetworkInfo {
  id: string
  name?: string
  network_type?: string
  block_explorer_url?: string
  is_active: boolean
}

/**
 * 根据网络信息获取交易浏览器URL
 */
export const getTransactionUrl = (txHash: string, network?: NetworkInfo): string => {
  if (!txHash) return ''
  
  // 如果有网络的block_explorer_url，使用它
  if (network?.block_explorer_url) {
    // 处理不同格式的block_explorer_url
    const baseUrl = network.block_explorer_url.replace(/\/$/, '') // 移除末尾的斜杠
    
    // 根据不同的浏览器格式构建URL
    // 注意：需要先检查具体的子域名，再检查通用的域名，避免逻辑冲突
    if (baseUrl.includes('nile.tronscan.org')) {
      return `${baseUrl}/#/transaction/${txHash}`
    } else if (baseUrl.includes('shasta.tronscan.org')) {
      return `${baseUrl}/#/transaction/${txHash}`
    } else if (baseUrl.includes('tronscan.org')) {
      return `${baseUrl}/#/transaction/${txHash}`
    } else if (baseUrl.includes('trongrid.io')) {
      return `${baseUrl}/transaction/${txHash}`
    } else {
      // 通用格式，假设是标准的浏览器格式
      return `${baseUrl}/transaction/${txHash}`
    }
  }
  
  // 如果没有网络信息，根据网络类型使用默认浏览器
  if (network?.network_type) {
    // 对于 testnet 类型，需要根据网络名称进一步判断
    if (network.network_type.toLowerCase() === 'testnet') {
      if (network.name?.toLowerCase().includes('nile')) {
        return `https://nile.tronscan.org/#/transaction/${txHash}`
      } else {
        // 默认 testnet 使用 Shasta
        return `https://shasta.tronscan.org/#/transaction/${txHash}`
      }
    }
    
    switch (network.network_type.toLowerCase()) {
      case 'mainnet':
      case 'tron_mainnet':
        return `https://tronscan.org/#/transaction/${txHash}`
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
