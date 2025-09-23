/**
 * 订单状态处理工具函数
 * 处理订单状态、支付状态、委托状态的显示和颜色
 */

// 订单状态相关
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'paid': 'bg-blue-100 text-blue-800',
    'processing': 'bg-indigo-100 text-indigo-800',
    'active': 'bg-green-100 text-green-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800',
    'expired': 'bg-orange-100 text-orange-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    'pending': '待处理',
    'paid': '已支付',
    'processing': '处理中',
    'active': '进行中',
    'completed': '已完成',
    'failed': '失败',
    'cancelled': '已取消',
    'expired': '已过期'
  }
  return texts[status] || status
}

// 支付状态相关
export const getPaymentStatusColor = (paymentStatus: string): string => {
  const colors: Record<string, string> = {
    'unpaid': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    'paid': 'bg-green-50 text-green-700 border border-green-200',
    'refunded': 'bg-gray-50 text-gray-700 border border-gray-200'
  }
  return colors[paymentStatus] || 'bg-gray-50 text-gray-700'
}

export const getPaymentStatusText = (paymentStatus: string): string => {
  const texts: Record<string, string> = {
    'unpaid': '未付款',
    'paid': '已付款',
    'refunded': '已退款'
  }
  return texts[paymentStatus] || paymentStatus
}

// 订单类型相关
export const getOrderTypeText = (orderType: string): string => {
  if (!orderType) return '常规订单'
  const texts: Record<string, string> = {
    // 新的具体类型
    'energy_flash': '能量闪租',
    'transaction_package': '笔数套餐',
    'trx_exchange': 'TRX闪兑',
    // 保留旧的类型兼容
    'REGULAR': '常规订单',
    'FLASH_RENT': '闪租订单',
    'BULK': '批量订单',
    'PREMIUM': '高级订单'
  }
  return texts[orderType] || orderType
}

// 委托状态相关
interface DelegationStatusOrder {
  delegation_tx_hash?: string
  delegate_tx_hash?: string
  status: string
  error_message?: string
}

export const getDelegationStatusColor = (order: DelegationStatusOrder): string => {
  const hasDelegation = order.delegation_tx_hash || order.delegate_tx_hash
  const isCompleted = order.status === 'completed'
  const isActive = order.status === 'active'
  const hasError = order.error_message
  
  if (hasError) return 'bg-red-100 text-red-700 border border-red-200'
  if (isCompleted) return 'bg-green-100 text-green-700 border border-green-200'
  if (isActive && hasDelegation) return 'bg-blue-100 text-blue-700 border border-blue-200'
  if (hasDelegation) return 'bg-indigo-100 text-indigo-700 border border-indigo-200'
  if (order.status === 'processing') return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
  
  return 'bg-gray-100 text-gray-700 border border-gray-200'
}

export const getDelegationStatusText = (order: DelegationStatusOrder): string => {
  const hasDelegation = order.delegation_tx_hash || order.delegate_tx_hash
  const isCompleted = order.status === 'completed'
  const isActive = order.status === 'active'
  const hasError = order.error_message
  
  if (hasError) return '委托失败'
  if (isCompleted) return '已完成'
  if (isActive && hasDelegation) return '委托中'
  if (hasDelegation) return '已委托'
  if (order.status === 'processing') return '准备中'
  if (order.status === 'paid') return '待委托'
  
  return '待处理'
}

// 状态操作相关
export const canUpdateStatus = (status: string): boolean => {
  return ['pending', 'paid', 'processing'].includes(status)
}
