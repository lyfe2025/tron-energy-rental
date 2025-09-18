/**
 * Webhook验证逻辑composable
 * 负责URL格式验证、技术要求检查等
 */

export function useWebhookValidation() {
  // 验证URL格式是否符合Telegram要求
  const validateWebhookUrl = (url: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!url) {
      errors.push('Webhook URL不能为空')
      return { isValid: false, errors }
    }

    // 检查HTTPS协议
    if (!url.startsWith('https://')) {
      errors.push('Webhook URL必须使用HTTPS协议')
    }

    // 检查是否包含基础API路径
    if (!url.includes('/api/telegram/webhook')) {
      errors.push('URL必须包含标准路径：/api/telegram/webhook')
    }

    // 检查端口（如果指定了端口）
    const urlObj = new URL(url)
    const port = urlObj.port
    if (port && !['443', '80', '88', '8443'].includes(port)) {
      errors.push('端口必须是 443、80、88、8443 之一')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 验证Secret Token
  const validateSecretToken = (secret: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (secret && secret.length > 256) {
      errors.push('Secret Token不能超过256个字符')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 验证最大连接数
  const validateMaxConnections = (connections: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (connections < 1 || connections > 100) {
      errors.push('最大连接数必须在1-100之间')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 获取连接数配置建议
  const getConnectionsRecommendation = (connections: number): string => {
    if (connections <= 10) return '适合测试环境'
    if (connections <= 20) return '适合小型应用'
    if (connections <= 40) return '推荐配置'
    if (connections <= 60) return '适合活跃机器人'
    if (connections <= 80) return '适合大型应用'
    return '最大性能配置'
  }

  // 检查URL是否需要同步
  const needsSyncWithTelegram = (localUrl: string, telegramUrl: string): boolean => {
    return localUrl !== telegramUrl
  }

  return {
    validateWebhookUrl,
    validateSecretToken,
    validateMaxConnections,
    getConnectionsRecommendation,
    needsSyncWithTelegram
  }
}
