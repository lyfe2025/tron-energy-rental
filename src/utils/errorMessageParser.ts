/**
 * 错误信息解析器
 * 将后端API错误信息转换为用户友好的中文提示
 */

export interface ParsedError {
  type: 'token' | 'network' | 'rate_limit' | 'permission' | 'validation' | 'unknown'
  title: string
  description: string
  suggestion?: string
  retryable: boolean
  retryDelay?: number // 重试延迟（秒）
}

export class ErrorMessageParser {
  /**
   * 解析错误信息
   */
  static parseError(errorMessage: string): ParsedError {
    if (!errorMessage || typeof errorMessage !== 'string') {
      return this.createUnknownError()
    }

    const message = errorMessage.toLowerCase()

    // Telegram API Token错误
    if (this.isTokenError(message)) {
      return this.createTokenError()
    }

    // API限流错误
    if (this.isRateLimitError(message)) {
      return this.createRateLimitError(errorMessage)
    }

    // 网络连接错误
    if (this.isNetworkError(message)) {
      return this.createNetworkError()
    }

    // 权限错误
    if (this.isPermissionError(message)) {
      return this.createPermissionError()
    }

    // 验证错误
    if (this.isValidationError(message)) {
      return this.createValidationError(errorMessage)
    }

    // 服务器错误
    if (this.isServerError(message)) {
      return this.createServerError()
    }

    // 默认未知错误
    return this.createUnknownError(errorMessage)
  }

  /**
   * 批量解析错误信息
   */
  static parseErrors(errors: string[]): ParsedError[] {
    if (!Array.isArray(errors) || errors.length === 0) {
      return []
    }

    return errors.map(error => this.parseError(error))
  }

  /**
   * 获取错误的主要类别和优先级
   */
  static analyzeErrorSeverity(errors: ParsedError[]): {
    severity: 'critical' | 'high' | 'medium' | 'low'
    primaryError: ParsedError | null
    retryable: boolean
    suggestedAction: string
  } {
    if (errors.length === 0) {
      return {
        severity: 'low',
        primaryError: null,
        retryable: true,
        suggestedAction: '无错误'
      }
    }

    // 按严重程度排序
    const severityOrder = {
      'token': 4,        // 最严重 - Token问题
      'permission': 3,   // 权限问题
      'validation': 2,   // 验证错误
      'rate_limit': 1,   // 限流 - 可重试
      'network': 1,      // 网络问题 - 可重试
      'unknown': 0       // 未知错误
    }

    const sortedErrors = errors.sort((a, b) => 
      severityOrder[b.type] - severityOrder[a.type]
    )

    const primaryError = sortedErrors[0]
    const hasRetryableErrors = errors.some(e => e.retryable)

    // 确定整体严重程度
    let severity: 'critical' | 'high' | 'medium' | 'low' = 'low'
    if (primaryError.type === 'token') {
      severity = 'critical'
    } else if (primaryError.type === 'permission') {
      severity = 'high'
    } else if (primaryError.type === 'validation') {
      severity = 'medium'
    } else {
      severity = 'low'
    }

    // 生成建议操作
    let suggestedAction = primaryError.suggestion || '请稍后重试'
    
    return {
      severity,
      primaryError,
      retryable: hasRetryableErrors,
      suggestedAction
    }
  }

  // ===== 错误类型检测方法 =====

  private static isTokenError(message: string): boolean {
    const tokenErrorPatterns = [
      'unauthorized',
      'forbidden',
      'invalid token',
      'token',
      '401',
      '403',
      'not authorized'
    ]
    return tokenErrorPatterns.some(pattern => message.includes(pattern))
  }

  private static isRateLimitError(message: string): boolean {
    const rateLimitPatterns = [
      'too many requests',
      'retry after',
      'rate limit',
      '429'
    ]
    return rateLimitPatterns.some(pattern => message.includes(pattern))
  }

  private static isNetworkError(message: string): boolean {
    const networkErrorPatterns = [
      'network error',
      'fetch failed',
      'timeout',
      'econnreset',
      'econnrefused',
      'enotfound',
      'etimedout',
      'connection refused',
      'connection reset',
      'aborted',
      'network timeout'
    ]
    return networkErrorPatterns.some(pattern => message.includes(pattern))
  }

  private static isPermissionError(message: string): boolean {
    const permissionPatterns = [
      'bot was kicked',
      'bot was blocked',
      'chat not found',
      'not enough rights',
      'administrator rights required'
    ]
    return permissionPatterns.some(pattern => message.includes(pattern))
  }

  private static isValidationError(message: string): boolean {
    const validationPatterns = [
      'bad request',
      'invalid parameter',
      'parameter',
      'invalid',
      '400'
    ]
    return validationPatterns.some(pattern => message.includes(pattern))
  }

  private static isServerError(message: string): boolean {
    const serverErrorPatterns = [
      'internal server error',
      '500',
      '502',
      '503',
      '504'
    ]
    return serverErrorPatterns.some(pattern => message.includes(pattern))
  }

  // ===== 错误对象创建方法 =====

  private static createTokenError(): ParsedError {
    return {
      type: 'token',
      title: 'Token验证失败',
      description: 'Telegram Bot Token无效或已过期',
      suggestion: '请检查Token是否正确，并确认机器人未被删除',
      retryable: false
    }
  }

  private static createRateLimitError(originalMessage: string): ParsedError {
    // 尝试提取重试延迟时间
    const retryMatch = originalMessage.match(/retry after (\d+)/i)
    const retryDelay = retryMatch ? parseInt(retryMatch[1]) : 60

    return {
      type: 'rate_limit',
      title: 'API调用频率限制',
      description: `Telegram API请求过于频繁，需要等待 ${retryDelay} 秒后重试`,
      suggestion: '请稍等片刻再重新同步，或降低同步频率',
      retryable: true,
      retryDelay
    }
  }

  private static createNetworkError(): ParsedError {
    return {
      type: 'network',
      title: '网络连接失败',
      description: '无法连接到Telegram服务器',
      suggestion: '请检查网络连接或稍后重试',
      retryable: true
    }
  }

  private static createPermissionError(): ParsedError {
    return {
      type: 'permission',
      title: '权限不足',
      description: '机器人缺少执行此操作的权限',
      suggestion: '请检查机器人权限设置或联系管理员',
      retryable: false
    }
  }

  private static createValidationError(originalMessage: string): ParsedError {
    return {
      type: 'validation',
      title: '参数验证失败',
      description: '请求参数格式不正确',
      suggestion: '请检查配置参数是否有效',
      retryable: false
    }
  }

  private static createServerError(): ParsedError {
    return {
      type: 'network',
      title: 'Telegram服务器错误',
      description: 'Telegram服务器暂时不可用',
      suggestion: '这是临时问题，请稍后重试',
      retryable: true
    }
  }

  private static createUnknownError(originalMessage?: string): ParsedError {
    return {
      type: 'unknown',
      title: '未知错误',
      description: originalMessage || '发生了未知错误',
      suggestion: '请联系技术支持或稍后重试',
      retryable: true
    }
  }

  /**
   * 根据错误类型获取相应的图标
   */
  static getErrorIcon(errorType: ParsedError['type']): string {
    const iconMap = {
      'token': '🔑',
      'rate_limit': '⏱️',
      'network': '🌐',
      'permission': '🔒',
      'validation': '📝',
      'unknown': '❓'
    }
    return iconMap[errorType] || '❓'
  }

  /**
   * 根据错误严重程度获取颜色
   */
  static getErrorColor(severity: 'critical' | 'high' | 'medium' | 'low'): string {
    const colorMap = {
      'critical': '#f56c6c',  // 红色
      'high': '#e6a23c',      // 橙色  
      'medium': '#f39c12',    // 黄色
      'low': '#909399'        // 灰色
    }
    return colorMap[severity]
  }

  /**
   * 格式化错误显示文本
   */
  static formatErrorForDisplay(error: ParsedError): string {
    const icon = this.getErrorIcon(error.type)
    let text = `${icon} ${error.title}`
    
    if (error.retryDelay) {
      text += ` (${error.retryDelay}秒后可重试)`
    }
    
    return text
  }
}
