
/**
 * 数字输入验证和格式化的可复用组合函数
 */
export function useNumberInput() {
  
  /**
   * 验证并格式化数字输入
   * @param event - 输入事件
   * @param callback - 可选的回调函数，用于更新外部状态
   */
  const validateNumberInput = (event: Event, callback?: (value: string) => void) => {
    const target = event.target as HTMLInputElement
    const value = target.value
    
    // 只允许数字和小数点
    const validValue = value.replace(/[^0-9.]/g, '')
    
    // 确保只有一个小数点
    const parts = validValue.split('.')
    let formattedValue = validValue
    
    if (parts.length > 2) {
      formattedValue = parts[0] + '.' + parts.slice(1).join('')
    }
    
    // 更新输入框的值
    target.value = formattedValue
    
    // 调用回调函数更新外部状态
    if (callback) {
      callback(formattedValue)
    }
    
    return formattedValue
  }

  /**
   * 验证数字字符串是否有效
   * @param value - 要验证的字符串
   * @returns 是否为有效数字
   */
  const isValidNumber = (value: string): boolean => {
    if (!value || value === '') return false
    const num = parseFloat(value)
    return !isNaN(num) && isFinite(num) && num >= 0
  }

  /**
   * 格式化数字显示（添加千分位分隔符等）
   * @param value - 数字值
   * @param decimals - 小数位数，默认6位
   * @returns 格式化后的字符串
   */
  const formatNumber = (value: number, decimals: number = 6): string => {
    if (isNaN(value) || !isFinite(value)) return '0'
    
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    })
  }

  return {
    validateNumberInput,
    isValidNumber,
    formatNumber
  }
}
