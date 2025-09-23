/**
 * Telegram机器人工具方法
 * 包含错误处理、消息格式化等通用功能
 */
import TelegramBot from 'node-telegram-bot-api';
import type { BotError } from '../types/bot.types.ts';

export class BotUtils {
  private bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  /**
   * 发送错误消息
   */
  async sendErrorMessage(chatId: number, error?: BotError): Promise<void> {
    const errorMessage = error?.message || '❌ 系统暂时繁忙，请稍后再试。';
    
    try {
      await this.bot.sendMessage(chatId, errorMessage);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }

  /**
   * 发送成功消息
   */
  async sendSuccessMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, `✅ ${message}`);
    } catch (error) {
      console.error('Failed to send success message:', error);
    }
  }

  /**
   * 发送警告消息
   */
  async sendWarningMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, `⚠️ ${message}`);
    } catch (error) {
      console.error('Failed to send warning message:', error);
    }
  }

  /**
   * 发送信息消息
   */
  async sendInfoMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, `ℹ️ ${message}`);
    } catch (error) {
      console.error('Failed to send info message:', error);
    }
  }

  /**
   * 格式化金额显示
   */
  formatAmount(amount: number, currency: string = 'TRX'): string {
    return `${amount.toLocaleString()} ${currency}`;
  }

  /**
   * 格式化能量数量显示
   */
  formatEnergy(energy: number): string {
    return `${energy.toLocaleString()} Energy`;
  }

  /**
   * 格式化时间显示
   */
  formatDateTime(dateTime: string | Date): string {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * 格式化持续时间显示
   */
  formatDuration(hours: number): string {
    if (hours < 24) {
      return `${hours}小时`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`;
    }
  }

  /**
   * 验证TRON地址格式
   */
  isValidTronAddress(address: string): boolean {
    // TRON地址以T开头，长度为34位
    const tronAddressRegex = /^T[A-Za-z1-9]{33}$/;
    return tronAddressRegex.test(address);
  }

  /**
   * 截断长文本
   */
  truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * 转义Markdown特殊字符
   */
  escapeMarkdown(text: string): string {
    const escapeChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    let escapedText = text;
    
    for (const char of escapeChars) {
      const regex = new RegExp('\\' + char, 'g');
      escapedText = escapedText.replace(regex, '\\' + char);
    }
    
    return escapedText;
  }

  /**
   * 构建代码块
   */
  buildCodeBlock(code: string, language: string = ''): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }

  /**
   * 构建内联代码
   */
  buildInlineCode(code: string): string {
    return `\`${code}\``;
  }

  /**
   * 构建粗体文本
   */
  buildBoldText(text: string): string {
    return `*${text}*`;
  }

  /**
   * 构建斜体文本
   */
  buildItalicText(text: string): string {
    return `_${text}_`;
  }

  /**
   * 获取订单状态对应的表情符号
   */
  getOrderStatusEmoji(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return '⏳';
      case 'paid':
        return '💳';
      case 'processing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '🚫';
      case 'expired':
        return '⏰';
      default:
        return '❓';
    }
  }

  /**
   * 获取订单状态描述
   */
  getOrderStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return '待支付';
      case 'paid':
        return '已支付';
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'cancelled':
        return '已取消';
      case 'expired':
        return '已过期';
      default:
        return '未知状态';
    }
  }

  /**
   * 生成随机订单号
   */
  generateOrderId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${random}`.toUpperCase();
  }

  /**
   * 验证订单ID格式
   */
  isValidOrderId(orderId: string): boolean {
    // 简单的订单ID验证，可以根据实际需求调整
    return /^[A-Z0-9]{10,20}$/.test(orderId);
  }

  /**
   * 构建进度条
   */
  buildProgressBar(current: number, total: number, length: number = 10): string {
    const percentage = Math.min(current / total, 1);
    const filled = Math.floor(percentage * length);
    const empty = length - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    const percentText = Math.floor(percentage * 100);
    
    return `${filledBar}${emptyBar} ${percentText}%`;
  }

  /**
   * 延迟执行
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 安全的JSON解析
   */
  safeJSONParse(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return null;
    }
  }

  /**
   * 安全的数字解析
   */
  safeParseNumber(value: any, defaultValue: number = 0): number {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 检查用户是否有权限执行操作
   */
  async checkUserPermission(userId: number, operation: string): Promise<boolean> {
    // 这里可以实现具体的权限检查逻辑
    // 现在简单返回true
    return true;
  }

  /**
   * 记录用户操作日志
   */
  async logUserAction(userId: number, action: string, details?: any): Promise<void> {
    try {
      // 这里可以实现操作日志记录
      console.log(`User ${userId} performed action: ${action}`, details);
    } catch (error) {
      console.error('Failed to log user action:', error);
    }
  }
}
