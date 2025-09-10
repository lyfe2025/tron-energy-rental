/**
 * 价格配置回调处理器
 * 处理价格配置相关的回调操作
 */
import { query } from '../../../config/database.js';
import type { CallbackContext } from '../core/CallbackDispatcher.js';
import { BaseCallbackHandler } from './BaseCallbackHandler.js';

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
        if (imageUrl.startsWith('/uploads/')) {
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
   * 格式化能量闪租消息
   */
  private formatEnergyFlashMessage(name: string, config: any, keyboardConfig: any): string {
    const displayTexts = config.display_texts || {};
    const title = displayTexts.title || keyboardConfig?.title || name;
    
    let message = `${title}\n`;
    
    // 添加副标题模板（价格和最大笔数信息）
    if (displayTexts.subtitle_template && config.single_price && config.max_transactions) {
      const subtitle = displayTexts.subtitle_template
        .replace('{price}', config.single_price)
        .replace('{max}', config.max_transactions);
      message += `${subtitle}\n\n`;
    }
    
    // 租用时效
    if (config.expiry_hours && displayTexts.duration_label) {
      message += `${displayTexts.duration_label}${config.expiry_hours}小时\n`;
    }
    
    // 单笔价格
    if (config.single_price && displayTexts.price_label) {
      message += `${displayTexts.price_label}${config.single_price} ${config.currency || 'TRX'}\n`;
    }
    
    // 最大租用
    if (config.max_transactions && displayTexts.max_label) {
      message += `${displayTexts.max_label}${config.max_transactions}笔\n\n`;
    }
    
    // 收款地址
    if (config.payment_address && displayTexts.address_label) {
      message += `${displayTexts.address_label}\n`;
      message += `${config.payment_address} (点击地址自动复制)\n\n`;
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
   * 格式化笔数套餐消息
   */
  private formatTransactionPackageMessage(name: string, config: any, keyboardConfig: any): string {
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
   * 格式化TRX闪兑消息
   */
  private formatTrxExchangeMessage(name: string, config: any, keyboardConfig: any): string {
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

    if (config.exchange_address) {
      message += `📍 **兑换地址**: \`${config.exchange_address}\`\n`;
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
