/**
 * 消息格式化工具
 * 负责各种订单确认消息的格式化
 */

export class MessageFormatter {
  /**
   * 格式化USDT确认信息
   */
  static formatUsdtConfirmation(config: any, orderInfo: any, template: string, userAddress: string = ''): string {
    const transactionCount = parseInt(orderInfo.transactionCount);
    const selectedPackage = config.packages?.find((pkg: any) => pkg.transaction_count === transactionCount);
    
    if (!selectedPackage) {
      return '❌ 套餐配置错误';
    }

    let result = template;
    
    // 替换占位符
    result = result.replace(/{transactionCount}/g, orderInfo.transactionCount);
    result = result.replace(/{unitPrice}/g, selectedPackage.unit_price?.toString() || '0');
    // 添加monospace格式让金额可以在Telegram中点击复制
    result = result.replace(/{totalAmount}/g, `\`${selectedPackage.price?.toString() || '0'}\``);
    result = result.replace(/{userAddress}/g, userAddress);
    
    // USDT支付地址
    const paymentAddress = config.order_config?.payment_address;
    if (paymentAddress) {
      result = result.replace(/{paymentAddress}/g, `\`${paymentAddress}\``);
    }

    // 过期时间
    const expireMinutes = config.order_config?.expire_minutes || 30;
    const expireTime = new Date(Date.now() + expireMinutes * 60 * 1000);
    const expireTimeString = expireTime.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    result = result.replace(/{expireTime}/g, expireTimeString);

    return result;
  }

  /**
   * 格式化TRX确认信息（使用TRX专用模板）
   */
  static formatTrxConfirmation(config: any, orderInfo: any, template: string, userAddress: string = ''): string {
    const transactionCount = parseInt(orderInfo.transactionCount);
    const selectedPackage = config.packages?.find((pkg: any) => pkg.transaction_count === transactionCount);
    
    if (!selectedPackage) {
      return '❌ 套餐配置错误';
    }

    // 使用预配置的TRX价格，如果没有则回退到汇率计算
    let trxUnitPrice: string;
    let trxTotalAmount: string;
    
    if (selectedPackage.trx_unit_price && selectedPackage.trx_price) {
      // 使用预配置的TRX价格
      trxUnitPrice = selectedPackage.trx_unit_price.toFixed(4);
      trxTotalAmount = selectedPackage.trx_price.toFixed(2);
    } else {
      // 回退到汇率计算（兼容性）
      const rate = 6.5; // 默认汇率
      trxUnitPrice = (selectedPackage.unit_price * rate).toFixed(4);
      trxTotalAmount = (selectedPackage.price * rate).toFixed(2);
    }
    
    // 直接使用TRX模板，无需转换文本
    let result = template;
    
    // 替换价格占位符（使用TRX价格）
    result = result.replace(/{transactionCount}/g, orderInfo.transactionCount);
    result = result.replace(/{unitPrice}/g, trxUnitPrice);
    // 添加monospace格式让金额可以在Telegram中点击复制
    result = result.replace(/{totalAmount}/g, `\`${trxTotalAmount}\``);
    result = result.replace(/{userAddress}/g, userAddress);
    
    // 使用相同的支付地址（不区分USDT/TRX）
    const paymentAddress = config.order_config?.payment_address;
    if (paymentAddress) {
      result = result.replace(/{paymentAddress}/g, `\`${paymentAddress}\``);
    }

    // 过期时间
    const expireMinutes = config.order_config?.expire_minutes || 30;
    const expireTime = new Date(Date.now() + expireMinutes * 60 * 1000);
    const expireTimeString = expireTime.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    result = result.replace(/{expireTime}/g, expireTimeString);

    return result;
  }

  /**
   * 从USDT模板智能转换为TRX确认信息（兼容性方法）
   */
  static formatTrxConfirmationFromUsdt(config: any, orderInfo: any, template: string, userAddress: string = ''): string {
    const transactionCount = parseInt(orderInfo.transactionCount);
    const selectedPackage = config.packages?.find((pkg: any) => pkg.transaction_count === transactionCount);
    
    if (!selectedPackage) {
      return '❌ 套餐配置错误';
    }

    // 使用预配置的TRX价格，如果没有则回退到汇率计算
    let trxUnitPrice: string;
    let trxTotalAmount: string;
    
    if (selectedPackage.trx_unit_price && selectedPackage.trx_price) {
      // 使用预配置的TRX价格
      trxUnitPrice = selectedPackage.trx_unit_price.toFixed(4);
      trxTotalAmount = selectedPackage.trx_price.toFixed(2);
    } else {
      // 回退到汇率计算（兼容性）
      const rate = 6.5; // 默认汇率
      trxUnitPrice = (selectedPackage.unit_price * rate).toFixed(4);
      trxTotalAmount = (selectedPackage.price * rate).toFixed(2);
    }
    
    // 智能转换模板：将USDT相关文本替换为TRX
    let result = template
      .replace(/USDT/g, 'TRX')  // 直接替换货币单位
      .replace(/usdt/g, 'trx')  // 小写版本
      .replace(/Usdt/g, 'Trx'); // 首字母大写版本
    
    // 替换价格占位符（使用TRX价格）
    result = result.replace(/{transactionCount}/g, orderInfo.transactionCount);
    result = result.replace(/{unitPrice}/g, trxUnitPrice);
    // 添加monospace格式让金额可以在Telegram中点击复制
    result = result.replace(/{totalAmount}/g, `\`${trxTotalAmount}\``);
    result = result.replace(/{userAddress}/g, userAddress);
    
    // 使用相同的支付地址（不区分USDT/TRX）
    const paymentAddress = config.order_config?.payment_address;
    if (paymentAddress) {
      result = result.replace(/{paymentAddress}/g, `\`${paymentAddress}\``);
    }

    // 过期时间
    const expireMinutes = config.order_config?.expire_minutes || 30;
    const expireTime = new Date(Date.now() + expireMinutes * 60 * 1000);
    const expireTimeString = expireTime.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    result = result.replace(/{expireTime}/g, expireTimeString);

    return result;
  }

  /**
   * 验证模板是否有效
   */
  static validateTemplate(template: string): { isValid: boolean; missingPlaceholders: string[] } {
    const requiredPlaceholders = [
      '{userAddress}',
      '{unitPrice}',
      '{totalAmount}',
      '{transactionCount}',
      '{paymentAddress}',
      '{expireTime}'
    ];

    const missingPlaceholders = requiredPlaceholders.filter(placeholder => 
      !template.includes(placeholder)
    );

    return {
      isValid: missingPlaceholders.length === 0,
      missingPlaceholders
    };
  }

  /**
   * 预览模板效果（用于测试）
   */
  static previewTemplate(template: string, sampleData = {
    userAddress: 'TL5afFHPzESaGrvG8JKAwrNx6drbDZf9it',
    unitPrice: '1.1500',
    totalAmount: '23.00',
    transactionCount: '20',
    paymentAddress: 'TWdcgk9NEsV1nt5yPrNfSYktbA12345678',
    expireTime: '2024-01-01 12:00:00'
  }): string {
    let result = template;
    
    for (const [key, value] of Object.entries(sampleData)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }

  /**
   * 计算消息长度和统计信息
   */
  static getMessageStats(message: string): {
    length: number;
    lines: number;
    words: number;
    placeholders: string[];
  } {
    const lines = message.split('\n').length;
    const words = message.split(/\s+/).filter(word => word.length > 0).length;
    const placeholderRegex = /{[^}]+}/g;
    const placeholders = message.match(placeholderRegex) || [];

    return {
      length: message.length,
      lines,
      words,
      placeholders: [...new Set(placeholders)] // 去重
    };
  }

  /**
   * 清理和标准化消息格式
   */
  static sanitizeMessage(message: string): string {
    return message
      .replace(/\r\n/g, '\n') // 统一换行符
      .replace(/\n{3,}/g, '\n\n') // 限制连续换行
      .trim(); // 去除首尾空白
  }
}
