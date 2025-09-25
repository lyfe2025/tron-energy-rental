/**
 * 能量闪租消息格式化器
 * 从PriceConfigMessageHandler中分离出的能量闪租格式化逻辑
 */
import { MessageTemplateFormatter } from './MessageTemplateFormatter.ts';

export class EnergyFlashFormatter {
  /**
   * 格式化能量闪租消息（使用数据库中的main_message_template）
   */
  static formatEnergyFlashMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return MessageTemplateFormatter.formatMainMessageTemplate(config.main_message_template, {
        price: config.single_price || 0,
        hours: config.expiry_hours || 0,
        maxTransactions: config.max_transactions || 0,
        paymentAddress: config.payment_address || ''
      });
    }

    // 默认消息（如果没有模板）
    return `⚡ ${name}\n\n价格：${config.single_price || 0} TRX/笔\n有效期：${config.expiry_hours || 0} 小时\n最大：${config.max_transactions || 0} 笔`;
  }
}
