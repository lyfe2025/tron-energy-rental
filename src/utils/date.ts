/**
 * 日期格式化工具函数
 */

/**
 * 格式化日期时间
 * @param date 日期字符串或Date对象
 * @param format 格式化模板，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串
 */
export const formatDateTime = (date: string | Date | null | undefined, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  if (!date) return '-'
  
  const d = new Date(date)
  
  // 检查日期是否有效
  if (isNaN(d.getTime())) return '-'
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化日期（不包含时间）
 * @param date 日期字符串或Date对象
 * @returns 格式化后的日期字符串 YYYY-MM-DD
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  return formatDateTime(date, 'YYYY-MM-DD')
}

/**
 * 格式化时间（不包含日期）
 * @param date 日期字符串或Date对象
 * @returns 格式化后的时间字符串 HH:mm:ss
 */
export const formatTime = (date: string | Date | null | undefined): string => {
  return formatDateTime(date, 'HH:mm:ss')
}

/**
 * 获取相对时间描述
 * @param date 日期字符串或Date对象
 * @returns 相对时间描述，如"刚刚"、"5分钟前"等
 */
export const getRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 60) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return formatDateTime(date, 'YYYY-MM-DD')
  }
}

/**
 * 检查日期是否为今天
 * @param date 日期字符串或Date对象
 * @returns 是否为今天
 */
export const isToday = (date: string | Date | null | undefined): boolean => {
  if (!date) return false
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return false
  
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

/**
 * 获取日期范围描述
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 日期范围描述
 */
export const getDateRange = (startDate: string | Date | null | undefined, endDate: string | Date | null | undefined): string => {
  const start = startDate ? formatDate(startDate) : ''
  const end = endDate ? formatDate(endDate) : ''
  
  if (start && end) {
    return `${start} 至 ${end}`
  } else if (start) {
    return `${start} 起`
  } else if (end) {
    return `至 ${end}`
  } else {
    return '全部时间'
  }
}