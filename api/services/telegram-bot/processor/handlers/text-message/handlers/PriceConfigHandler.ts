/**
 * 价格配置处理器
 * 负责处理价格配置相关按钮和消息格式化
 */
import { query } from '../../../../../../config/database.ts';
import { WebhookURLService } from '../../../../utils/WebhookURLService.ts';
import type {
    PriceConfig,
    ProcessorDependencies
} from '../types/index.ts';

export class PriceConfigHandler {
  private dependencies: ProcessorDependencies;

  constructor(dependencies: ProcessorDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * 更新依赖
   */
  updateDependencies(dependencies: Partial<ProcessorDependencies>): void {
    this.dependencies = { ...this.dependencies, ...dependencies };
  }

  /**
   * 处理价格配置相关按钮
   */
  async handlePriceConfigButton(message: any, configType: string, buttonText: string): Promise<void> {
    try {
      console.log(`💰 处理价格配置按钮: ${configType} -> ${buttonText}`);

      // 从数据库获取价格配置
      const priceConfigResult = await query(
        'SELECT name, description, config, inline_keyboard_config, image_url, image_alt, enable_image FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
        [configType]
      );

      if (priceConfigResult.rows.length === 0) {
        throw new Error(`未找到 ${configType} 的价格配置`);
      }

      const priceConfig: PriceConfig = priceConfigResult.rows[0];
      const config = priceConfig.config;
      const keyboardConfig = priceConfig.inline_keyboard_config;
      const enableImage = priceConfig.enable_image;
      const imageUrl = priceConfig.image_url;

      // 使用配置中的真实数据生成响应消息
      let responseMessage = '';

      if (configType === 'energy_flash') {
        responseMessage = this.formatEnergyFlashMessage(priceConfig.name, config, keyboardConfig);
      } else if (configType === 'transaction_package') {
        responseMessage = this.formatTransactionPackageMessage(priceConfig.name, config, keyboardConfig);
      } else if (configType === 'trx_exchange') {
        console.log(`🔄 格式化TRX闪兑消息`, { name: priceConfig.name, config, keyboardConfig });
        responseMessage = this.formatTrxExchangeMessage(priceConfig.name, config, keyboardConfig);
        console.log(`📝 TRX闪兑消息内容:`, responseMessage.substring(0, 200));
      } else {
        responseMessage = `${priceConfig.name}\n\n${priceConfig.description}`;
      }

      // 构建内嵌键盘
      let replyMarkup = undefined;
      if (keyboardConfig && keyboardConfig.enabled && keyboardConfig.buttons) {
        replyMarkup = {
          inline_keyboard: keyboardConfig.buttons
        };
      }

      // 发送消息 - 根据是否启用图片决定发送方式
      console.log(`📤 准备发送${configType}消息到 chatId: ${message.chat.id}`);
      
      if (enableImage && imageUrl && this.dependencies.bot) {
        // 构建完整的图片URL
        let fullImageUrl = imageUrl;
        if (this.dependencies.botId && WebhookURLService.needsFullUrl(imageUrl)) {
          fullImageUrl = await WebhookURLService.buildResourceUrl(this.dependencies.botId, imageUrl);
        }

        console.log(`🖼️ 发送带图片的${configType}消息`, { fullImageUrl, hasReplyMarkup: !!replyMarkup });
        // 发送带图片的消息
        await this.dependencies.bot.sendPhoto(message.chat.id, fullImageUrl, {
          caption: responseMessage,
          reply_markup: replyMarkup,
          parse_mode: 'Markdown'
        });
      } else {
        console.log(`📝 发送纯文本${configType}消息`, { messageLength: responseMessage.length, hasReplyMarkup: !!replyMarkup });
        // 发送纯文本消息
        await this.dependencies.api.sendMessage(message.chat.id, responseMessage, {
          reply_markup: replyMarkup,
          parse_mode: 'Markdown'
        });
      }
      
      console.log(`✅ ${configType}消息发送成功`);

      await this.dependencies.logger.logBotActivity(
        'info', 
        `price_config_${configType}`, 
        `价格配置响应: ${buttonText}`, 
        {
          configType,
          buttonText,
          chatId: message.chat.id,
          userId: message.from?.id,
          configData: config
        }
      );

    } catch (error) {
      console.error(`❌ 处理价格配置按钮失败 (${configType}):`, error);
      
      // 发送错误消息
      await this.dependencies.api.sendMessage(
        message.chat.id,
        '抱歉，获取服务信息时出现错误，请稍后重试或联系客服。'
      );
      
      await this.dependencies.logger.logBotActivity(
        'error', 
        'price_config_failed', 
        `价格配置响应失败: ${error.message}`, 
        {
          error: error.stack,
          configType,
          buttonText,
          chatId: message.chat.id
        }
      );
    }
  }

  /**
   * 格式化能量闪租消息（使用数据库中的main_message_template）
   */
  formatEnergyFlashMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return this.formatMainMessageTemplate(config.main_message_template, {
        price: config.single_price || 0,
        hours: config.expiry_hours || 0,
        maxTransactions: config.max_transactions || 0,
        paymentAddress: config.payment_address || ''
      });
    }

    // 默认消息（如果没有模板）
    return `⚡ ${name}\n\n价格：${config.single_price || 0} TRX/笔\n有效期：${config.expiry_hours || 0} 小时\n最大：${config.max_transactions || 0} 笔`;
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
   * 格式化笔数套餐消息（使用数据库中的main_message_template）
   */
  formatTransactionPackageMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return this.formatMainMessageTemplate(config.main_message_template, {
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
   * 格式化TRX闪兑消息（使用数据库中的main_message_template）
   */
  formatTrxExchangeMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return this.formatMainMessageTemplate(config.main_message_template, {
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
