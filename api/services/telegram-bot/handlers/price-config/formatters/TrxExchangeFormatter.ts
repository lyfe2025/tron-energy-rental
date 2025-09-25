/**
 * TRX闪兑消息格式化器
 * 从PriceConfigMessageHandler中分离出的TRX闪兑格式化逻辑
 */
import { MessageTemplateFormatter } from './MessageTemplateFormatter.ts';

export class TrxExchangeFormatter {
  /**
   * 格式化TRX闪兑消息（使用数据库中的main_message_template）
   */
  static formatTrxExchangeMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return MessageTemplateFormatter.formatMainMessageTemplate(config.main_message_template, {
        usdtToTrxRate: config.usdt_to_trx_rate || 0,
        trxToUsdtRate: config.trx_to_usdt_rate || 0,
        minAmount: config.min_amount || 0,
        maxAmount: config.max_amount || 0,
        paymentAddress: config.payment_address || ''
      });
    }

    // 默认消息（如果没有模板）
    let message = `🔄 ${name}\n\n`;
    
    if (config.usdt_to_trx_rate) {
      message += `💱 USDT→TRX汇率: 1 USDT = ${config.usdt_to_trx_rate} TRX\n`;
    }
    
    if (config.trx_to_usdt_rate) {
      message += `💱 TRX→USDT汇率: 1 TRX = ${config.trx_to_usdt_rate} USDT\n`;
    }

    if (config.min_amount) {
      message += `💰 最小兑换: ${config.min_amount} USDT起\n`;
    }

    if (config.payment_address) {
      message += `📍 兑换地址: ${config.payment_address}\n`;
    }

    return message;
  }
}
