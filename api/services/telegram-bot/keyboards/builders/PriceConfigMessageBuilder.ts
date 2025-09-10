/**
 * 价格配置消息构建器
 * 负责构建和发送价格配置相关消息
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../config/database.js';
import { WebhookURLService } from '../../utils/WebhookURLService.js';

export class PriceConfigMessageBuilder {
  private bot: TelegramBot;
  private botId: string;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
  }

  /**
   * 通用方法：根据价格配置发送消息（支持图片和内嵌键盘）
   */
  async sendPriceConfigMessage(chatId: number, modeType: string): Promise<void> {
    try {
      // 从价格配置表获取配置
      const priceConfigResult = await query(
        'SELECT config, image_url, image_alt, enable_image, inline_keyboard_config FROM price_configs WHERE mode_type = $1 AND is_active = true',
        [modeType]
      );

      if (priceConfigResult.rows.length === 0) {
        await this.bot.sendMessage(chatId, '❌ 该服务暂不可用，请稍后再试。');
        return;
      }

      const priceConfig = priceConfigResult.rows[0];
      const config = priceConfig.config;
      const enableImage = priceConfig.enable_image;
      const imageUrl = priceConfig.image_url;
      const imageAlt = priceConfig.image_alt;
      const inlineKeyboardConfig = priceConfig.inline_keyboard_config;

      // 构建消息内容（根据不同模式生成不同内容）
      let message = '';
      switch (modeType) {
        case 'energy_flash':
          message = this.buildEnergyFlashMessage(config);
          break;
        case 'transaction_package':
          message = this.buildTransactionPackageMessage(config);
          break;
        case 'trx_exchange':
          message = this.buildTrxExchangeMessage(config);
          break;
        default:
          message = '配置信息';
          break;
      }

      // 构建内嵌键盘（如果有配置）
      let replyMarkup = undefined;
      if (inlineKeyboardConfig && inlineKeyboardConfig.enabled && inlineKeyboardConfig.buttons) {
        replyMarkup = {
          inline_keyboard: inlineKeyboardConfig.buttons
        };
      }

      // 发送消息 - 根据是否启用图片决定发送方式
      if (enableImage && imageUrl) {
        // 构建完整的图片URL
        let fullImageUrl = imageUrl;
        if (WebhookURLService.needsFullUrl(imageUrl)) {
          fullImageUrl = await WebhookURLService.buildResourceUrl(this.botId, imageUrl);
        }

        // 发送带图片的消息
        await this.bot.sendPhoto(chatId, fullImageUrl, {
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
    } catch (error) {
      console.error(`Failed to send ${modeType} price config message:`, error);
      await this.bot.sendMessage(chatId, '❌ 获取配置信息失败，请稍后再试。');
    }
  }

  /**
   * 显示能量套餐（使用通用价格配置消息方法）
   */
  async showEnergyPackages(chatId: number): Promise<void> {
    await this.sendPriceConfigMessage(chatId, 'energy_flash');
  }

  /**
   * 显示笔数套餐（使用通用价格配置消息方法）
   */
  async showTransactionPackages(chatId: number): Promise<void> {
    await this.sendPriceConfigMessage(chatId, 'transaction_package');
  }

  /**
   * 显示TRX闪兑（使用通用价格配置消息方法）
   */
  async showTrxExchange(chatId: number): Promise<void> {
    await this.sendPriceConfigMessage(chatId, 'trx_exchange');
  }

  /**
   * 构建能量闪租消息内容（1:1复现前端预览）
   */
  private buildEnergyFlashMessage(config: any): string {
    const displayTexts = config.display_texts || {};
    const title = displayTexts.title || '⚡闪租能量（需要时）';
    
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
      const addressLabel = displayTexts.address_label || '💰 下单地址：（点击地址自动复制）';
      message += `${addressLabel}\n`;
      // 使用 Telegram 的 monospace 格式让地址可以长按复制
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
   * 构建笔数套餐消息内容
   */
  private buildTransactionPackageMessage(config: any): string {
    const displayTexts = config.display_texts || {};
    const title = displayTexts.title || '📦 笔数套餐';
    const subtitle = displayTexts.subtitle || '选择适合您的套餐';

    let message = `${title}\n${subtitle}\n\n`;

    if (config.packages && config.packages.length > 0) {
      config.packages.forEach((pkg: any, index: number) => {
        message += `${index + 1}. ${pkg.name}\n`;
        message += `   交易次数: ${pkg.transaction_count}笔\n`;
        message += `   价格: ${pkg.price} ${pkg.currency || 'TRX'}\n\n`;
      });
    }

    message += `每日费用: ${config.daily_fee || 0} TRX\n`;
    message += `可转让: ${config.transferable ? '是' : '否'}\n`;
    message += `代购: ${config.proxy_purchase ? '是' : '否'}\n\n`;

    // 添加注意事项
    if (config.notes && config.notes.length > 0) {
      config.notes.forEach((note: string) => {
        message += `🔺 ${note}\n`;
      });
    }

    return message;
  }

  /**
   * 构建TRX闪兑消息内容
   */
  private buildTrxExchangeMessage(config: any): string {
    const displayTexts = config.display_texts || {};
    const title = displayTexts.title || '🔄 TRX闪兑';
    const subtitleTemplate = displayTexts.subtitle_template || '最低兑换金额: {min_amount} USDT';
    const subtitle = subtitleTemplate
      .replace('{min_amount}', config.min_amount?.toString() || '0');

    let message = `${title}\n${subtitle}\n\n`;
    message += `USDT→TRX 汇率: ${config.usdt_to_trx_rate || 0}\n`;
    message += `TRX→USDT 汇率: ${config.trx_to_usdt_rate || 0}\n`;
    message += `自动兑换: ${config.is_auto_exchange ? '开启' : '关闭'}\n`;
    message += `兑换地址: ${config.exchange_address}\n\n`;

    // 添加注意事项
    if (config.notes && config.notes.length > 0) {
      config.notes.forEach((note: string) => {
        message += `🔺 ${note}\n`;
      });
    }

    return message;
  }

}
