/**
 * 价格配置消息处理器
 * 处理价格配置相关的回复键盘按钮和文本消息
 */
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { query } from '../../../config/database.ts';
import { WebhookURLService } from '../utils/WebhookURLService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PriceConfigMessageHandler {
  private bot: TelegramBot;
  private botId: string;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
  }

  /**
   * 处理文本消息，检查是否为价格配置回复键盘按钮
   */
  async handleMessage(message: any): Promise<boolean> {
    if (!message.text) {
      return false;
    }

    const text = message.text.trim();
    const chatId = message.chat.id;

    // 检查是否为价格配置相关的按钮
    const buttonMappings: { [key: string]: string } = {
      '⚡ 能量闪租': 'energy_flash',
      '🔥 笔数套餐': 'transaction_package',
      '🔄 TRX闪兑': 'trx_exchange'
    };

    const configType = buttonMappings[text];
    if (!configType) {
      return false; // 不是价格配置按钮
    }

    console.log(`💰 处理价格配置按钮: ${text} -> ${configType} (机器人: ${this.botId})`);

    try {
      await this.sendPriceConfigMessage(chatId, configType);
      return true;
    } catch (error) {
      console.error(`❌ 处理价格配置按钮失败 (${configType}):`, error);
      await this.bot.sendMessage(chatId, '❌ 获取服务信息失败，请稍后重试。');
      return true; // 即使失败也返回true，表示消息已被处理
    }
  }

  /**
   * 发送价格配置消息
   */
  private async sendPriceConfigMessage(chatId: number, modeType: string): Promise<void> {
    // 从数据库获取价格配置
    const priceConfigResult = await query(
      'SELECT name, description, config, inline_keyboard_config, image_url, image_alt, enable_image FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
      [modeType]
    );

    if (priceConfigResult.rows.length === 0) {
      await this.bot.sendMessage(chatId, '❌ 该服务暂不可用，请稍后再试。');
      return;
    }

    const priceConfig = priceConfigResult.rows[0];
    const config = priceConfig.config;
    const keyboardConfig = priceConfig.inline_keyboard_config;
    const enableImage = priceConfig.enable_image;
    const imageUrl = priceConfig.image_url;

    // 构建消息内容
    let message = '';
    switch (modeType) {
      case 'energy_flash':
        message = this.formatEnergyFlashMessage(priceConfig.name, config, keyboardConfig);
        break;
      case 'transaction_package':
        message = this.formatTransactionPackageMessage(priceConfig.name, config, keyboardConfig);
        break;
      case 'trx_exchange':
        message = this.formatTrxExchangeMessage(priceConfig.name, config, keyboardConfig);
        break;
      default:
        message = `${priceConfig.name}\n\n${priceConfig.description}`;
        break;
    }

    // 构建内嵌键盘
    let replyMarkup = undefined;
    if (keyboardConfig && keyboardConfig.enabled && keyboardConfig.buttons) {
      // 确保 inline_keyboard 是数组的数组格式 (rows)
      let inlineKeyboard;
      if (Array.isArray(keyboardConfig.buttons)) {
        // 如果 buttons 是数组，检查第一个元素是否也是数组
        if (keyboardConfig.buttons.length > 0 && Array.isArray(keyboardConfig.buttons[0])) {
          // 已经是正确的格式 (数组的数组)
          inlineKeyboard = keyboardConfig.buttons;
        } else {
          // 是按钮对象的数组，需要根据 buttons_per_row 配置分组
          inlineKeyboard = this.groupButtonsIntoRows(keyboardConfig.buttons, keyboardConfig.buttons_per_row || 2);
        }
      } else {
        // 不是数组，跳过
        inlineKeyboard = [];
      }
      
      replyMarkup = {
        inline_keyboard: inlineKeyboard
      };
    }

    // 发送消息 - 根据是否启用图片决定发送方式
    if (enableImage && imageUrl) {
      // 构建本地文件路径或使用远程URL
      let photoSource = imageUrl;
      
      if (WebhookURLService.needsFullUrl(imageUrl)) {
        // 如果是相对路径，使用本地文件
        const projectRoot = path.resolve(__dirname, '../../../../');
        const localPath = path.join(projectRoot, 'public', imageUrl.replace(/^\//, ''));
        
        if (fs.existsSync(localPath)) {
          photoSource = localPath;
        } else {
          // 如果本地文件不存在，构建完整URL（备用方案）
          photoSource = await WebhookURLService.buildResourceUrl(this.botId, imageUrl);
        }
      }

      // 发送带图片的消息
      await this.bot.sendPhoto(chatId, photoSource, {
        caption: message,
        reply_markup: replyMarkup,
        parse_mode: 'Markdown'
      });
    } else {
      // 发送纯文本消息
      await this.bot.sendMessage(chatId, message, {
        reply_markup: replyMarkup,
        parse_mode: 'Markdown'
      });
    }
  }

  /**
   * 格式化能量闪租消息（使用数据库中的main_message_template）
   */
  private formatEnergyFlashMessage(name: string, config: any, keyboardConfig: any): string {
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
      
      // 特殊处理支付地址 - 在Telegram中使用monospace格式让用户可以长按复制
      if (key === 'paymentAddress' && replacementValue && replacementValue !== '0') {
        replacementValue = `\`${replacementValue}\``;
      }
      
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacementValue);
    }
    
    return result;
  }

  /**
   * 生成指定数量的换行符
   */
  private generateLineBreaks(count: number): string {
    return count > 0 ? '\n'.repeat(count) : '';
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
   * 将按钮数组按照每行按钮数分组，并处理特殊按钮（全宽）
   */
  private groupButtonsIntoRows(buttons: any[], buttonsPerRow: number = 2): any[][] {
    const rows: any[][] = [];
    
    // 识别特殊按钮（标记为isSpecial或者是最后一个按钮）
    let regularButtons = [];
    let specialButtons = [];
    
    buttons.forEach((button, index) => {
      if (button.isSpecial || (index === buttons.length - 1 && buttons.length > 4)) {
        // 特殊按钮：明确标记的或者是最后一个按钮且总数大于4个
        specialButtons.push({
          text: button.text,
          callback_data: button.callback_data
        });
      } else {
        regularButtons.push({
          text: button.text,
          callback_data: button.callback_data
        });
      }
    });
    
    // 先处理常规按钮，按照每行指定数量分组
    for (let i = 0; i < regularButtons.length; i += buttonsPerRow) {
      const row = regularButtons.slice(i, i + buttonsPerRow);
      rows.push(row);
    }
    
    // 然后处理特殊按钮，每个单独一行
    specialButtons.forEach(button => {
      rows.push([button]);
    });
    
    return rows;
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
