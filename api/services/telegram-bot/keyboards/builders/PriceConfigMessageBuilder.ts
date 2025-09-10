/**
 * 价格配置消息构建器
 * 负责构建和发送价格配置相关消息
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../config/database.js';

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
        if (imageUrl.startsWith('/uploads/')) {
          // 如果是相对路径，从当前机器人的webhook URL获取域名
          const baseUrl = await this.getWebhookBaseUrl();
          fullImageUrl = `${baseUrl}${imageUrl}`;
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
   * 构建能量闪租消息内容
   */
  private buildEnergyFlashMessage(config: any): string {
    const displayTexts = config.display_texts || {};
    const title = displayTexts.title || '⚡ 能量闪租 ⚡ 立即到账';
    const subtitleTemplate = displayTexts.subtitle_template || '（{price} TRX/笔，最高{max}笔）';
    const subtitle = subtitleTemplate
      .replace('{price}', config.single_price?.toString() || '0')
      .replace('{max}', config.max_transactions?.toString() || '0');

    const durationLabel = displayTexts.duration_label || '⏰ 租用时效：';
    const priceLabel = displayTexts.price_label || '💰 单笔价格：';
    const maxLabel = displayTexts.max_label || '📊 最大租用：';
    const addressLabel = displayTexts.address_label || '💳 收款地址：';
    const doubleEnergyWarning = displayTexts.double_energy_warning || '🔺 向无U地址转账需双倍能量';

    let message = `${title}\n${subtitle}\n\n`;
    message += `${durationLabel}${config.expiry_hours}小时\n`;
    message += `${priceLabel}${config.single_price} TRX\n`;
    message += `${maxLabel}${config.max_transactions}笔\n\n`;
    message += `${addressLabel}\n${config.payment_address}\n\n`;

    if (config.double_energy_for_no_usdt) {
      message += `${doubleEnergyWarning}\n`;
    }

    // 添加注意事项
    if (config.notes && config.notes.length > 0) {
      config.notes.forEach((note: string) => {
        message += `🔺 ${note}\n`;
      });
    }

    return message;
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

  /**
   * 从当前机器人的webhook URL获取基础域名
   */
  private async getWebhookBaseUrl(): Promise<string> {
    try {
      // 从数据库获取当前机器人的webhook URL
      const result = await query(
        'SELECT webhook_url FROM telegram_bots WHERE id = $1 AND is_active = true',
        [this.botId]
      );

      if (result.rows.length === 0 || !result.rows[0].webhook_url) {
        // 如果没有webhook URL，回退到环境变量或默认值
        console.warn(`机器人 ${this.botId} 没有配置webhook URL，使用默认域名`);
        return process.env.APP_BASE_URL || 'http://localhost:3001';
      }

      const webhookUrl = result.rows[0].webhook_url;
      
      // 从webhook URL中提取域名和协议
      // 例如：https://ed1cfac836d2.ngrok-free.app/api/telegram/webhook/bot-id
      // 提取：https://ed1cfac836d2.ngrok-free.app
      try {
        const url = new URL(webhookUrl);
        return `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
      } catch (urlError) {
        console.error('解析webhook URL失败:', urlError);
        // 回退到环境变量或默认值
        return process.env.APP_BASE_URL || 'http://localhost:3001';
      }
    } catch (error) {
      console.error('获取webhook基础URL失败:', error);
      // 回退到环境变量或默认值
      return process.env.APP_BASE_URL || 'http://localhost:3001';
    }
  }
}
