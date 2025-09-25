/**
 * 笔数套餐消息格式化器
 * 从PriceConfigMessageHandler中分离出的笔数套餐格式化逻辑
 */
import { MessageTemplateFormatter } from './MessageTemplateFormatter.ts';

export class TransactionPackageFormatter {
  /**
   * 格式化笔数套餐消息（使用数据库中的main_message_template）
   */
  static formatTransactionPackageMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return MessageTemplateFormatter.formatMainMessageTemplate(config.main_message_template, {
        dailyFee: config.daily_fee || 0
      });
    }

    // 默认消息（如果没有模板）
    let message = `🔥 ${name}\n\n`;
    
    if (config.daily_fee) {
      message += `（24小时不使用，则扣${config.daily_fee}笔占用费）\n\n`;
    }

    if (config.packages && config.packages.length > 0) {
      message += `📦 可选套餐：\n`;
      config.packages.forEach((pkg: any) => {
        message += `• ${pkg.name}: ${pkg.transaction_count}笔 - ${pkg.price} ${pkg.currency || 'TRX'}\n`;
      });
    }

    return message;
  }

  /**
   * 格式化笔数套餐确认信息
   */
  static formatTransactionPackageConfirmation(config: any, contextData: any, address: string, confirmationTemplate?: string): string {
    // 直接使用传入的确认模板
    if (!confirmationTemplate) {
      console.error('❌ 数据库中未配置订单确认模板');
      return '❌ 订单确认信息配置缺失，请联系管理员。';
    }

    // 从套餐配置中找到对应的套餐信息
    const transactionCount = parseInt(contextData.transactionCount);
    const selectedPackage = config.packages?.find((pkg: any) => pkg.transaction_count === transactionCount);
    
    if (!selectedPackage) {
      console.error('❌ 未找到对应的套餐配置:', transactionCount);
      return '❌ 套餐配置错误，请重新选择。';
    }

    console.log('📦 找到的套餐信息:', {
      name: selectedPackage.name,
      price: selectedPackage.price,
      unitPrice: selectedPackage.unit_price,
      transactionCount: selectedPackage.transaction_count
    });

    let template = confirmationTemplate;

    // 替换基础占位符
    template = template.replace(/{transactionCount}/g, contextData.transactionCount || '');
    template = template.replace(/{address}/g, address || '');
    template = template.replace(/{userAddress}/g, address || '');
    
    // 替换价格相关占位符
    template = template.replace(/{unitPrice}/g, selectedPackage.unit_price?.toString() || '0');
    template = template.replace(/{price}/g, selectedPackage.price?.toString() || '0');
    // 添加monospace格式让金额可以在Telegram中点击复制
    template = template.replace(/{totalAmount}/g, `\`${selectedPackage.price?.toString() || '0'}\``);

    // 替换支付地址（添加monospace格式）
    const paymentAddress = config.order_config?.payment_address;
    if (paymentAddress) {
      template = template.replace(/{paymentAddress}/g, `\`${paymentAddress}\``);
    }

    // 计算过期时间
    const expireMinutes = config.order_config?.expire_minutes || 30;
    const expireTime = new Date(Date.now() + expireMinutes * 60 * 1000);
    const expireTimeString = expireTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    template = template.replace(/{expireTime}/g, expireTimeString);

    return template;
  }
}
