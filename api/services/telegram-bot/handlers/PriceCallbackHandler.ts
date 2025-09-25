/**
 * 价格配置回调处理器
 * 处理价格配置相关的回调操作
 */
import { query } from '../../../config/database.ts';
import type { CallbackContext } from '../core/CallbackDispatcher.ts';
import { BaseCallbackHandler } from './BaseCallbackHandler.ts';

export class PriceCallbackHandler extends BaseCallbackHandler {

  /**
   * 显示能量闪租价格配置
   */
  async showEnergyFlash(context: CallbackContext): Promise<void> {
    await this.sendPriceConfigMessage(context, 'energy_flash');
  }

  /**
   * 显示笔数套餐价格配置
   */
  async showTransactionPackage(context: CallbackContext): Promise<void> {
    await this.sendPriceConfigMessage(context, 'transaction_package');
  }

  /**
   * 显示TRX闪兑价格配置
   */
  async showTrxExchange(context: CallbackContext): Promise<void> {
    await this.sendPriceConfigMessage(context, 'trx_exchange');
  }

  /**
   * 处理USDT转换为TRX的兑换请求
   */
  async handleTrxExchangeUsdtToTrx(context: CallbackContext, params?: string): Promise<void> {
    try {
      // 获取TRX兑换配置
      const configResult = await query(
        'SELECT config, name FROM price_configs WHERE mode_type = $1 AND is_active = true LIMIT 1',
        ['trx_exchange']
      );

      if (configResult.rows.length === 0) {
        await this.bot.sendMessage(context.chatId, '❌ TRX兑换服务暂不可用，请稍后再试。');
        return;
      }

      const config = configResult.rows[0].config;
      const serviceName = configResult.rows[0].name;

      // 使用数据库中的 main_message_template，如果有的话
      let message = '';
      if (config.main_message_template && config.main_message_template.trim() !== '') {
        message = this.formatMainMessageTemplate(config.main_message_template, {
          usdtToTrxRate: config.usdt_to_trx_rate || 0,
          trxToUsdtRate: config.trx_to_usdt_rate || 0,
          minAmount: config.min_amount || 0,
          maxAmount: config.max_amount || 0,
          paymentAddress: config.payment_address || config.exchange_address || ''
        });
      } else {
        // 降级到硬编码格式
        message = `💱 *${serviceName} - USDT转TRX*\n\n`;
        
        if (config.usdt_to_trx_rate) {
          message += `📊 当前汇率：1 USDT = ${config.usdt_to_trx_rate} TRX\n`;
        }
        
        if (config.min_amount) {
          message += `💰 最小兑换：${config.min_amount} USDT\n`;
        }
        
        if (config.exchange_address || config.payment_address) {
          const address = config.payment_address || config.exchange_address;
          message += `📍 兑换地址：\`${address}\`\n\n`;
        }
        
        message += `📝 *操作说明*：\n`;
        message += `1. 发送USDT到上述兑换地址\n`;
        message += `2. 系统将自动按汇率兑换为TRX\n`;
        message += `3. TRX将在确认后发送到您的账户\n\n`;
        
        // 添加注意事项
        if (config.notes && config.notes.length > 0) {
          message += `⚠️ *注意事项*：\n`;
          config.notes.forEach((note: string) => {
            message += `• ${note}\n`;
          });
        }
      }

      await this.bot.sendMessage(context.chatId, message, {
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('处理USDT→TRX兑换失败:', error);
      await this.bot.sendMessage(context.chatId, '❌ 处理兑换请求失败，请稍后再试。');
    }
  }

  /**
   * 处理TRX转换为USDT的兑换请求
   */
  async handleTrxExchangeTrxToUsdt(context: CallbackContext, params?: string): Promise<void> {
    try {
      // 获取TRX兑换配置
      const configResult = await query(
        'SELECT config, name FROM price_configs WHERE mode_type = $1 AND is_active = true LIMIT 1',
        ['trx_exchange']
      );

      if (configResult.rows.length === 0) {
        await this.bot.sendMessage(context.chatId, '❌ TRX兑换服务暂不可用，请稍后再试。');
        return;
      }

      const config = configResult.rows[0].config;
      const serviceName = configResult.rows[0].name;

      // 使用数据库中的 main_message_template，如果有的话
      let message = '';
      if (config.main_message_template && config.main_message_template.trim() !== '') {
        message = this.formatMainMessageTemplate(config.main_message_template, {
          usdtToTrxRate: config.usdt_to_trx_rate || 0,
          trxToUsdtRate: config.trx_to_usdt_rate || 0,
          minAmount: config.min_amount || 0,
          maxAmount: config.max_amount || 0,
          paymentAddress: config.payment_address || config.exchange_address || ''
        });
      } else {
        // 降级到硬编码格式
        message = `💱 *${serviceName} - TRX转USDT*\n\n`;
        
        if (config.trx_to_usdt_rate) {
          message += `📊 当前汇率：1 TRX = ${config.trx_to_usdt_rate} USDT\n`;
        }
        
        if (config.min_trx_amount || config.min_amount) {
          const minAmount = config.min_trx_amount || (config.min_amount * (config.usdt_to_trx_rate || 1));
          message += `💰 最小兑换：${minAmount} TRX\n`;
        }
        
        if (config.exchange_address || config.payment_address) {
          const address = config.payment_address || config.exchange_address;
          message += `📍 兑换地址：\`${address}\`\n\n`;
        }
        
        message += `📝 *操作说明*：\n`;
        message += `1. 发送TRX到上述兑换地址\n`;
        message += `2. 系统将自动按汇率兑换为USDT\n`;
        message += `3. USDT将在确认后发送到您的账户\n\n`;
        
        // 添加注意事项
        if (config.notes && config.notes.length > 0) {
          message += `⚠️ *注意事项*：\n`;
          config.notes.forEach((note: string) => {
            message += `• ${note}\n`;
          });
        }
      }

      await this.bot.sendMessage(context.chatId, message, {
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('处理TRX→USDT兑换失败:', error);
      await this.bot.sendMessage(context.chatId, '❌ 处理兑换请求失败，请稍后再试。');
    }
  }

  /**
   * 通用方法：根据价格配置发送消息
   */
  private async sendPriceConfigMessage(context: CallbackContext, modeType: string): Promise<void> {
    try {
      // 从价格配置表获取配置
      const priceConfigResult = await query(
        'SELECT name, description, config, image_url, image_alt, enable_image, inline_keyboard_config FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
        [modeType]
      );

      if (priceConfigResult.rows.length === 0) {
        await this.bot.sendMessage(context.chatId, '❌ 该服务暂不可用，请稍后再试。');
        return;
      }

      const priceConfig = priceConfigResult.rows[0];
      const config = priceConfig.config;
      const enableImage = priceConfig.enable_image;
      const imageUrl = priceConfig.image_url;
      const inlineKeyboardConfig = priceConfig.inline_keyboard_config;

      // 构建消息内容
      let message = '';
      switch (modeType) {
        case 'energy_flash':
          message = this.formatEnergyFlashMessage(priceConfig.name, config, inlineKeyboardConfig);
          break;
        case 'transaction_package':
          message = this.formatTransactionPackageMessage(priceConfig.name, config, inlineKeyboardConfig);
          break;
        case 'trx_exchange':
          message = this.formatTrxExchangeMessage(priceConfig.name, config, inlineKeyboardConfig);
          break;
        default:
          message = `${priceConfig.name}\n\n${priceConfig.description}`;
          break;
      }

      // 构建内嵌键盘
      let replyMarkup = undefined;
      if (inlineKeyboardConfig && inlineKeyboardConfig.enabled && inlineKeyboardConfig.buttons) {
        replyMarkup = {
          inline_keyboard: inlineKeyboardConfig.buttons
        };
      }

      // 发送消息
      if (enableImage && imageUrl) {
        // 构建完整的图片URL
        let fullImageUrl = imageUrl;
        if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('/assets/')) {
          const baseUrl = await this.getWebhookBaseUrl();
          fullImageUrl = `${baseUrl}${imageUrl}`;
        }

        await this.bot.sendPhoto(context.chatId, fullImageUrl, {
          caption: message,
          reply_markup: replyMarkup,
          parse_mode: 'Markdown'
        });
      } else {
        await this.bot.sendMessage(context.chatId, message, {
          reply_markup: replyMarkup,
          parse_mode: 'Markdown'
        });
      }

    } catch (error) {
      console.error(`发送 ${modeType} 价格配置消息失败:`, error);
      await this.bot.sendMessage(context.chatId, '❌ 获取配置信息失败，请稍后再试。');
    }
  }

  /**
   * 格式化能量闪租消息（1:1复现前端预览）
   */
  private formatEnergyFlashMessage(name: string, config: any, keyboardConfig: any): string {
    const displayTexts = config.display_texts || {};
    const title = displayTexts.title || keyboardConfig?.title || name || '⚡闪租能量（需要时）';
    
    let message = `*${title}*\n`;
    
    // 处理副标题模板 - 支持数组和计算表达式
    const subtitleFormatted = this.formatSubtitleTemplates(displayTexts.subtitle_template, config.single_price || 0, config.max_transactions || 0);
    if (subtitleFormatted) {
      message += `${subtitleFormatted}\n\n`;
    }
    
    // 租期时效
    const durationLabel = this.formatTemplateText(displayTexts.duration_label || '⏱ 租期时效：{duration}小时', { duration: config.expiry_hours || 0 });
    message += `${durationLabel}\n`;
    
    // 单笔价格
    const priceLabel = this.formatTemplateText(displayTexts.price_label || '💰 单笔价格：{price}TRX', { price: config.single_price || 0 });
    message += `${priceLabel}\n`;
    
    // 最大购买
    const maxLabel = this.formatTemplateText(displayTexts.max_label || '🔢 最大购买：{max}笔', { max: config.max_transactions || 0 });
    message += `${maxLabel}\n\n`;
    
    // 下单地址（支持点击复制）
    if (config.payment_address) {
      const addressLabel = displayTexts.address_label || '💰 下单地址：（点击地址可自动复制到剪贴板）';
      message += `${addressLabel}\n`;
      // 使用 Telegram 的 monospace 格式让地址可以点击复制
      message += `\`${config.payment_address}\`\n\n`;
    }
    
    // 双倍能量警告
    if (config.double_energy_for_no_usdt) {
      const doubleEnergyWarning = displayTexts.double_energy_warning || '⚠️ 注意：账户无USDT将消耗双倍能量';
      message += `${doubleEnergyWarning}\n\n`;
    }
    
    // 注意事项
    if (config.notes && config.notes.length > 0) {
      config.notes.forEach((note: string) => {
        message += `🔺 ${note}\n`;
      });
    }

    return message;
  }

  /**
   * 格式化主消息模板，支持占位符替换和计算表达式
   */
  private formatMainMessageTemplate(template: string, variables: { [key: string]: any }): string {
    let result = template;
    
    // 先处理计算表达式（price*2, price*3等）
    result = result.replace(/\{price\*(\d+)\}/g, (match, multiplier) => {
      const price = variables.price || 0;
      const result = price * parseInt(multiplier);
      return Number(result.toFixed(8)).toString();
    });
    
    result = result.replace(/\{price\/(\d+)\}/g, (match, divisor) => {
      const price = variables.price || 0;
      const div = parseInt(divisor);
      const result = div > 0 ? price / div : price;
      return Number(result.toFixed(8)).toString();
    });
    
    result = result.replace(/\{price\+(\d+)\}/g, (match, addend) => {
      const price = variables.price || 0;
      return (price + parseInt(addend)).toString();
    });
    
    result = result.replace(/\{price\-(\d+)\}/g, (match, subtrahend) => {
      const price = variables.price || 0;
      return (price - parseInt(subtrahend)).toString();
    });
    
    // 处理其他变量的计算表达式
    result = result.replace(/\{maxTransactions\*(\d+)\}/g, (match, multiplier) => {
      const maxTransactions = variables.maxTransactions || 0;
      return (maxTransactions * parseInt(multiplier)).toString();
    });
    
    // 最后处理基础变量替换
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      let replacementValue = value?.toString() || '0';
      
      // 特殊处理支付地址 - 在Telegram中使用monospace格式让用户可以点击复制
      if (key === 'paymentAddress' && replacementValue && replacementValue !== '0') {
        replacementValue = `\`${replacementValue}\``;
      }
      
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacementValue);
    }
    
    return result;
  }

  /**
   * 格式化副标题模板 - 支持数组和计算表达式
   */
  private formatSubtitleTemplates(subtitleTemplate: string | string[] | undefined, price: number, max: number): string {
    if (!subtitleTemplate) {
      // 默认模板
      return `（${price}TRX/笔，最多买${max}笔）`;
    }

    let templates: string[] = [];
    
    // 兼容旧版本：如果是字符串，转换为数组
    if (typeof subtitleTemplate === 'string') {
      templates = subtitleTemplate ? [subtitleTemplate] : [];
    } else if (Array.isArray(subtitleTemplate)) {
      templates = subtitleTemplate;
    }

    if (templates.length === 0) {
      return `（${price}TRX/笔，最多买${max}笔）`;
    }

    // 格式化所有模板并用换行符连接
    const formattedTemplates = templates
      .filter(t => t.trim() !== '')
      .map(template => this.formatTemplateWithCalculations(template, price, max));
    
    return formattedTemplates.join('\n');
  }

  /**
   * 格式化模板，支持动态计算和多种变量
   */
  private formatTemplateWithCalculations(template: string, price: number, max: number): string {
    let result = template;
    
    // 先处理所有计算表达式（必须在基础变量之前处理）
    
    // price计算表达式
    result = result.replace(/\{price\*(\d+)\}/g, (match, multiplier) => {
      return (price * parseInt(multiplier)).toString();
    });
    
    result = result.replace(/\{price\/(\d+)\}/g, (match, divisor) => {
      const div = parseInt(divisor);
      return div > 0 ? (price / div).toString() : price.toString();
    });
    
    result = result.replace(/\{price\+(\d+)\}/g, (match, addend) => {
      return (price + parseInt(addend)).toString();
    });
    
    result = result.replace(/\{price\-(\d+)\}/g, (match, subtrahend) => {
      return (price - parseInt(subtrahend)).toString();
    });
    
    // max计算表达式
    result = result.replace(/\{max\*(\d+)\}/g, (match, multiplier) => {
      return (max * parseInt(multiplier)).toString();
    });
    
    result = result.replace(/\{max\/(\d+)\}/g, (match, divisor) => {
      const div = parseInt(divisor);
      return div > 0 ? (max / div).toString() : max.toString();
    });
    
    result = result.replace(/\{max\+(\d+)\}/g, (match, addend) => {
      return (max + parseInt(addend)).toString();
    });
    
    result = result.replace(/\{max\-(\d+)\}/g, (match, subtrahend) => {
      return (max - parseInt(subtrahend)).toString();
    });
    
    // 最后处理基础变量
    result = result.replace(/\{price\}/g, price.toString());
    result = result.replace(/\{max\}/g, max.toString());
    
    return result;
  }

  /**
   * 格式化模板文本，替换单个占位符
   */
  private formatTemplateText(template: string, values: { [key: string]: any }): string {
    let result = template;
    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value?.toString() || '0');
    }
    return result;
  }

  /**
   * 格式化笔数套餐消息（使用数据库中的main_message_template）
   */
  private formatTransactionPackageMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return this.formatMainMessageTemplate(config.main_message_template, {
        dailyFee: config.daily_fee || 0
      });
    }

    // 默认消息（如果没有模板）
    const title = keyboardConfig?.title || name;
    const description = keyboardConfig?.description || '无时间限制的长期套餐';
    
    let message = `${title}\n\n`;
    message += `📝 **服务说明**：\n${description}\n\n`;

    if (config.packages && config.packages.length > 0) {
      message += `📦 **可选套餐**：\n`;
      config.packages.forEach((pkg: any) => {
        message += `• **${pkg.name}**: ${pkg.transaction_count}笔 - ${pkg.price} ${pkg.currency || 'TRX'}\n`;
      });
      message += `\n`;
    }

    if (config.transferable !== undefined) {
      message += `🔄 **可转让**: ${config.transferable ? '是' : '否'}\n`;
    }
    
    if (config.proxy_purchase !== undefined) {
      message += `🛒 **代购服务**: ${config.proxy_purchase ? '支持' : '不支持'}\n`;
    }

    if (config.daily_fee) {
      message += `💰 **日费用**: ${config.daily_fee} TRX\n`;
    }

    return message;
  }

  /**
   * 格式化TRX闪兑消息（使用数据库中的main_message_template）
   */
  private formatTrxExchangeMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return this.formatMainMessageTemplate(config.main_message_template, {
        usdtToTrxRate: config.usdt_to_trx_rate || 0,
        trxToUsdtRate: config.trx_to_usdt_rate || 0,
        minAmount: config.min_amount || 0,
        maxAmount: config.max_amount || 0,
        paymentAddress: config.payment_address || config.exchange_address || ''
      });
    }

    // 默认消息（如果没有模板）
    const title = keyboardConfig?.title || name;
    const description = keyboardConfig?.description || 'USDT自动兑换TRX服务';
    
    let message = `🔄 **${title}**\n\n`;
    message += `📝 **服务说明**：\n${description}\n\n`;

    if (config.usdt_to_trx_rate) {
      message += `💱 **USDT→TRX汇率**: 1 USDT = ${config.usdt_to_trx_rate} TRX\n`;
    }
    
    if (config.trx_to_usdt_rate) {
      message += `💱 **TRX→USDT汇率**: 1 TRX = ${config.trx_to_usdt_rate} USDT\n`;
    }

    if (config.min_amount) {
      message += `💰 **最小兑换**: ${config.min_amount} USDT起\n`;
    }

    if (config.exchange_address || config.payment_address) {
      const address = config.payment_address || config.exchange_address;
      message += `📍 **兑换地址**: \`${address}\`\n`;
    }

    if (config.is_auto_exchange) {
      message += `⚡ **自动兑换**: ${config.is_auto_exchange ? '支持' : '不支持'}\n`;
    }

    if (config.rate_update_interval) {
      message += `🔄 **汇率更新**: 每${config.rate_update_interval}分钟\n`;
    }

    if (config.notes && config.notes.length > 0) {
      message += `\n📌 **注意事项**：\n`;
      config.notes.forEach((note: string) => {
        message += `${note}\n`;
      });
    }

    return message;
  }
}
