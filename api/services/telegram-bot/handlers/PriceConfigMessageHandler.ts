/**
 * 价格配置消息处理器
 * 处理价格配置相关的回复键盘按钮和文本消息
 */
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../../../config/database.js';
import { WebhookURLService } from '../utils/WebhookURLService.js';

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
   * 格式化能量闪租消息（1:1复现前端预览，支持换行配置）
   */
  private formatEnergyFlashMessage(name: string, config: any, keyboardConfig: any): string {
    const displayTexts = config.display_texts || {};
    const lineBreaks = displayTexts.line_breaks || {
      after_title: 0,
      after_subtitle: 0,
      after_details: 0,
      before_warning: 0,
      before_notes: 0
    };
    
    const title = displayTexts.title || keyboardConfig?.title || name || '⚡闪租能量（需要时）';
    
    let message = `*${title}*\n`;
    
    // 标题后换行
    if (lineBreaks.after_title > 0) {
      message += this.generateLineBreaks(lineBreaks.after_title);
    }
    
    // 处理副标题模板 - 支持数组和计算表达式
    const subtitleFormatted = this.formatSubtitleTemplates(displayTexts.subtitle_template, config.single_price || 0, config.max_transactions || 0);
    if (subtitleFormatted) {
      message += `${subtitleFormatted}\n`;
      // 副标题后换行
      if (lineBreaks.after_subtitle > 0) {
        message += this.generateLineBreaks(lineBreaks.after_subtitle);
      }
    }
    
    // 租期时效
    const durationLabel = this.formatTemplateText(displayTexts.duration_label || '⏱ 租期时效：{duration}小时', { duration: config.expiry_hours || 0 });
    message += `${durationLabel}\n`;
    
    // 单笔价格
    const priceLabel = this.formatTemplateText(displayTexts.price_label || '💰 单笔价格：{price}TRX', { price: config.single_price || 0 });
    message += `${priceLabel}\n`;
    
    // 最大购买
    const maxLabel = this.formatTemplateText(displayTexts.max_label || '🔢 最大购买：{max}笔', { max: config.max_transactions || 0 });
    message += `${maxLabel}\n`;
    
    // 下单地址（支持点击复制）
    if (config.payment_address) {
      const addressLabel = displayTexts.address_label;
      // 只有当 address_label 不是空字符串时才显示标签
      if (addressLabel && addressLabel.trim() !== '') {
        message += `${addressLabel}\n`;
      } else if (addressLabel === undefined || addressLabel === null) {
        // 如果没有配置 address_label，使用默认标签
        message += '💰 下单地址：（点击地址自动复制）\n';
      }
      // 使用 Telegram 的 monospace 格式让地址可以长按复制
      message += `\`${config.payment_address}\`\n`;
    }
    
    // 详细信息后换行（智能换行：如果地址标签为空，则使用after_details，否则使用before_warning）
    const shouldShowAddressLabel = displayTexts.address_label && displayTexts.address_label.trim() !== '';
    const totalLineBreaks = Math.max(lineBreaks.after_details || 0, lineBreaks.before_warning || 0);
    
    if (config.double_energy_for_no_usdt && totalLineBreaks > 0) {
      message += this.generateLineBreaks(totalLineBreaks);
    } else if (!config.double_energy_for_no_usdt && lineBreaks.after_details > 0) {
      message += this.generateLineBreaks(lineBreaks.after_details);
    }
    
    // 双倍能量警告
    if (config.double_energy_for_no_usdt) {
      const doubleEnergyWarning = displayTexts.double_energy_warning || '⚠️ 注意：账户无USDT将消耗双倍能量';
      message += `${doubleEnergyWarning}\n`;
    }
    
    // 注意事项前换行
    if (config.notes && config.notes.length > 0 && lineBreaks.before_notes > 0) {
      message += this.generateLineBreaks(lineBreaks.before_notes);
    }
    
    // 注意事项
    if (config.notes && config.notes.length > 0) {
      message += `注意事项：\n`;
      config.notes.forEach((note: string) => {
        message += `${note}\n`;
      });
    }

    return message;
  }

  /**
   * 生成指定数量的换行符
   */
  private generateLineBreaks(count: number): string {
    return count > 0 ? '\n'.repeat(count) : '';
  }

  /**
   * 格式化副标题，替换dailyFee占位符
   */
  private formatSubtitleWithDailyFee(template: string, dailyFee: number): string {
    return template.replace(/\{dailyFee\}/g, dailyFee.toString());
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
   * 格式化笔数套餐消息（支持换行配置）
   */
  private formatTransactionPackageMessage(name: string, config: any, keyboardConfig: any): string {
    const displayTexts = config.display_texts || {};
    const lineBreaks = displayTexts.line_breaks || {
      after_title: 0,
      after_subtitle: 0,
      after_packages: 0,
      before_usage_rules: 0,
      before_notes: 0
    };
    
    const title = displayTexts.title || keyboardConfig?.title || name;
    const subtitle = this.formatSubtitleWithDailyFee(displayTexts.subtitle_template || '（24小时不使用，则扣{dailyFee}笔占费）', config.daily_fee || 12);
    
    let message = `*${title}*\n`;
    
    // 标题后换行
    if (lineBreaks.after_title > 0) {
      message += this.generateLineBreaks(lineBreaks.after_title);
    }
    
    if (subtitle) {
      message += `${subtitle}\n`;
      // 副标题后换行
      if (lineBreaks.after_subtitle > 0) {
        message += this.generateLineBreaks(lineBreaks.after_subtitle);
      }
    }

    if (config.packages && config.packages.length > 0) {
      message += `📦 **可选套餐**：\n`;
      config.packages.forEach((pkg: any) => {
        message += `• **${pkg.name}**: ${pkg.transaction_count}笔 - ${pkg.price} ${pkg.currency || 'TRX'}\n`;
      });
      
      // 套餐列表后换行
      if (lineBreaks.after_packages > 0) {
        message += this.generateLineBreaks(lineBreaks.after_packages);
      }
    }

    // 使用规则前换行
    if (config.usage_rules && config.usage_rules.length > 0 && lineBreaks.before_usage_rules > 0) {
      message += this.generateLineBreaks(lineBreaks.before_usage_rules);
    }

    if (config.usage_rules && config.usage_rules.length > 0) {
      message += `💡 **使用规则**：\n`;
      config.usage_rules.forEach((rule: string) => {
        message += `${rule}\n`;
      });
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

    // 注意事项前换行
    if (config.notes && config.notes.length > 0 && lineBreaks.before_notes > 0) {
      message += this.generateLineBreaks(lineBreaks.before_notes);
    }

    if (config.notes && config.notes.length > 0) {
      message += `📌 **注意事项**：\n`;
      config.notes.forEach((note: string) => {
        message += `${note}\n`;
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
   * 格式化TRX闪兑消息（支持换行配置）
   */
  private formatTrxExchangeMessage(name: string, config: any, keyboardConfig: any): string {
    const displayTexts = config.display_texts || {};
    const lineBreaks = displayTexts.line_breaks || {
      after_title: 0,
      after_subtitle: 0,
      after_rates: 0,
      after_address: 0,
      before_notes: 0
    };
    
    const title = displayTexts.title || keyboardConfig?.title || name;
    const subtitle = this.formatTemplateText(displayTexts.subtitle_template || '（转U自动回TRX，{min_amount}U起换）', { min_amount: config.min_amount || 1.1 });
    
    let message = `*${title}*\n`;
    
    // 标题后换行
    if (lineBreaks.after_title > 0) {
      message += this.generateLineBreaks(lineBreaks.after_title);
    }
    
    if (subtitle) {
      message += `${subtitle}\n`;
      // 副标题后换行
      if (lineBreaks.after_subtitle > 0) {
        message += this.generateLineBreaks(lineBreaks.after_subtitle);
      }
    }

    // 汇率信息
    const rateTitle = displayTexts.rate_title || '📊 当前汇率';
    if (rateTitle) {
      message += `${rateTitle}\n`;
    }

    if (config.usdt_to_trx_rate) {
      message += `💱 **USDT→TRX汇率**: 1 USDT = ${config.usdt_to_trx_rate} TRX\n`;
    }
    
    if (config.trx_to_usdt_rate) {
      message += `💱 **TRX→USDT汇率**: 1 TRX = ${config.trx_to_usdt_rate} USDT\n`;
    }

    if (displayTexts.rate_description) {
      message += `${displayTexts.rate_description}\n`;
    }

    // 汇率信息后换行
    if (lineBreaks.after_rates > 0) {
      message += this.generateLineBreaks(lineBreaks.after_rates);
    }

    // 地址信息
    if (config.exchange_address) {
      const addressLabel = displayTexts.address_label || '📍 兑换地址';
      message += `${addressLabel}\n`;
      message += `\`${config.exchange_address}\`\n`;
    }

    // 地址信息后换行
    if (lineBreaks.after_address > 0) {
      message += this.generateLineBreaks(lineBreaks.after_address);
    }

    if (config.is_auto_exchange) {
      message += `⚡ **自动兑换**: ${config.is_auto_exchange ? '支持' : '不支持'}\n`;
    }

    if (config.rate_update_interval) {
      message += `🔄 **汇率更新**: 每${config.rate_update_interval}分钟\n`;
    }

    // 注意事项前换行
    if (config.notes && config.notes.length > 0 && lineBreaks.before_notes > 0) {
      message += this.generateLineBreaks(lineBreaks.before_notes);
    }

    if (config.notes && config.notes.length > 0) {
      message += `📌 **注意事项**：\n`;
      config.notes.forEach((note: string) => {
        message += `${note}\n`;
      });
    }

    return message;
  }

}
