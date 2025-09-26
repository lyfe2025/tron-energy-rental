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
    // 🎯 优先使用TRX模板，如果没有配置则使用默认模板
    const trxTemplate = config?.order_config?.confirmation_template_trx;
    const defaultTemplate = confirmationTemplate;
    
    // 选择使用TRX模板或默认模板
    const selectedTemplate = trxTemplate || defaultTemplate;
    
    if (!selectedTemplate) {
      console.error('❌ 数据库中未配置订单确认模板');
      return '❌ 订单确认信息配置缺失，请联系管理员。';
    }
    
    console.log('📋 使用的模板类型:', {
      hasTrxTemplate: !!trxTemplate,
      hasDefaultTemplate: !!defaultTemplate,
      usingTrxTemplate: !!trxTemplate
    });

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

    let template = selectedTemplate;

    // 替换基础占位符
    template = template.replace(/{transactionCount}/g, contextData.transactionCount || '');
    template = template.replace(/{address}/g, address || '');
    template = template.replace(/{userAddress}/g, address || '');
    
    // 🎯 根据使用的模板类型选择价格数据
    let unitPrice: string;
    let totalPrice: string;
    
    if (trxTemplate) {
      // 使用TRX模板时，优先使用TRX价格
      if (selectedPackage.trx_unit_price && selectedPackage.trx_price) {
        unitPrice = selectedPackage.trx_unit_price.toFixed(4);
        totalPrice = selectedPackage.trx_price.toFixed(2);
      } else {
        // 回退到汇率计算
        const rate = 6.5; // 默认汇率
        unitPrice = (selectedPackage.unit_price * rate).toFixed(4);
        totalPrice = (selectedPackage.price * rate).toFixed(2);
      }
      console.log('📋 使用TRX价格:', { unitPrice, totalPrice });
    } else {
      // 使用默认模板时，使用USDT价格
      unitPrice = selectedPackage.unit_price?.toString() || '0';
      totalPrice = selectedPackage.price?.toString() || '0';
      console.log('📋 使用USDT价格:', { unitPrice, totalPrice });
    }
    
    // 替换价格相关占位符
    template = template.replace(/{unitPrice}/g, unitPrice);
    template = template.replace(/{price}/g, totalPrice);
    // 添加monospace格式让金额可以在Telegram中点击复制
    template = template.replace(/{totalAmount}/g, `\`${totalPrice}\``);

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
