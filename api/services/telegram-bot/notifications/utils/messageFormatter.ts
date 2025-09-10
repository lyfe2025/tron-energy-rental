/**
 * 消息格式化工具
 * 负责不同类型消息的格式化处理
 */

/**
 * 格式化金额显示
 */
export function formatAmount(amount: number | string, currency: string = 'TRX'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0.00';
  }

  return `${numAmount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  })} ${currency}`;
}

/**
 * 格式化能量数量
 */
export function formatEnergyAmount(energy: number | string): string {
  const numEnergy = typeof energy === 'string' ? parseInt(energy) : energy;
  
  if (isNaN(numEnergy)) {
    return '0';
  }

  return numEnergy.toLocaleString('zh-CN');
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: string | Date, timezone: string = 'Asia/Shanghai'): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  return date.toLocaleString('zh-CN', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 格式化交易哈希（截短显示）
 */
export function formatTransactionHash(hash: string, showLength: number = 8): string {
  if (!hash || hash.length <= showLength * 2) {
    return hash || '';
  }
  
  return `${hash.substring(0, showLength)}...${hash.substring(hash.length - showLength)}`;
}

/**
 * 格式化订单状态
 */
export function formatOrderStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'failed': '失败',
    'cancelled': '已取消',
    'refunded': '已退款'
  };
  
  return statusMap[status] || status;
}

/**
 * 格式化用户等级
 */
export function formatUserLevel(level: string): string {
  const levelMap: { [key: string]: string } = {
    'normal': '普通用户',
    'vip': 'VIP用户',
    'agent': '代理商',
    'premium': '高级用户'
  };
  
  return levelMap[level] || level;
}

/**
 * 格式化百分比
 */
export function formatPercentage(value: number, decimalPlaces: number = 2): string {
  if (isNaN(value)) {
    return '0%';
  }
  
  return `${value.toFixed(decimalPlaces)}%`;
}

/**
 * 格式化持续时间
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分钟`;
  }
  
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}天${hours}小时` : `${days}天`;
}

/**
 * 创建进度条
 */
export function createProgressBar(progress: number, length: number = 10): string {
  const filled = Math.round((progress / 100) * length);
  const empty = length - filled;
  
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 生成状态图标
 */
export function getStatusIcon(status: string): string {
  const iconMap: { [key: string]: string } = {
    'success': '✅',
    'completed': '✅',
    'failed': '❌',
    'error': '❌',
    'pending': '⏳',
    'processing': '🔄',
    'warning': '⚠️',
    'info': 'ℹ️',
    'maintenance': '🔧',
    'security': '🔐',
    'money': '💰',
    'energy': '⚡',
    'order': '📋',
    'user': '👤',
    'system': '🖥️'
  };
  
  return iconMap[status] || '';
}

/**
 * 构建通知标题
 */
export function buildNotificationTitle(type: string, data: any = {}): string {
  const titleMap: { [key: string]: string } = {
    'order_created': `${getStatusIcon('order')} 新订单创建`,
    'payment_success': `${getStatusIcon('success')} 支付成功`,
    'payment_failed': `${getStatusIcon('failed')} 支付失败`,
    'energy_delegation_complete': `${getStatusIcon('energy')} 能量委托完成`,
    'energy_delegation_failed': `${getStatusIcon('failed')} 能量委托失败`,
    'maintenance_notice': `${getStatusIcon('maintenance')} 系统维护通知`,
    'security_alert': `${getStatusIcon('security')} 安全警报`,
    'commission_earned': `${getStatusIcon('money')} 佣金到账`,
    'level_upgrade': `${getStatusIcon('success')} 等级升级`
  };
  
  return titleMap[type] || '通知';
}
