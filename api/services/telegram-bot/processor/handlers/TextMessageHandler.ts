/**
 * 文本消息处理器
 * 负责处理普通文本消息、回复键盘按钮和价格配置
 */
import { query } from '../../../../config/database.js';
import { WebhookURLService } from '../../utils/WebhookURLService.js';
import type {
  TextMessageHandler as ITextMessageHandler,
  MessageProcessResult,
  PriceConfig,
  ProcessorDependencies,
  TemplateVariables
} from '../types.js';

export class TextMessageHandler implements ITextMessageHandler {
  private dependencies: ProcessorDependencies;

  // 已废弃：不再使用硬编码的按钮文本映射，改为动态查找callback_data
  // private readonly buttonMappings: ReplyKeyboardMapping = {...}

  constructor(dependencies: ProcessorDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * 根据按钮文本动态查找对应的callback_data
   */
  private async findCallbackDataByText(chatId: number, buttonText: string): Promise<string | null> {
    try {
      // 首先获取机器人ID
      if (!this.dependencies.botId) {
        console.error('❌ 缺少botId，无法查找按钮配置');
        return null;
      }

      // 从数据库查找机器人的键盘配置
      const result = await query(
        'SELECT keyboard_config FROM telegram_bots WHERE id = $1',
        [this.dependencies.botId]
      );

      if (result.rows.length === 0) {
        console.error('❌ 未找到机器人配置');
        return null;
      }

      const keyboardConfig = result.rows[0].keyboard_config;
      if (!keyboardConfig || !keyboardConfig.main_menu || !keyboardConfig.main_menu.rows) {
        console.error('❌ 机器人键盘配置无效');
        return null;
      }

      // 遍历所有按钮查找匹配的文本
      for (const row of keyboardConfig.main_menu.rows) {
        if (row.buttons) {
          for (const button of row.buttons) {
            if (button.text === buttonText) {
              console.log(`✅ 找到按钮映射: "${buttonText}" -> "${button.callback_data}"`);
              return button.callback_data;
            }
          }
        }
      }

      console.log(`❌ 未找到按钮文本 "${buttonText}" 的callback_data映射`);
      return null;
    } catch (error) {
      console.error('❌ 查找callback_data失败:', error);
      return null;
    }
  }

  /**
   * 更新依赖
   */
  updateDependencies(dependencies: Partial<ProcessorDependencies>): void {
    this.dependencies = { ...this.dependencies, ...dependencies };
  }

  /**
   * 处理普通文本消息
   */
  async handleTextMessage(message: any): Promise<MessageProcessResult> {
    try {
      const originalText = message.text.trim();
      const text = originalText.toLowerCase();
      
      console.log('💬 处理文本消息:', originalText.substring(0, 100));

      let responseAction = 'text_response';
      let responseDescription = '默认响应';

      // 处理回复键盘按钮文本
      if (await this.handleReplyKeyboardButtons(message, originalText)) {
        return { 
          success: true, 
          action: 'reply_keyboard_response',
          description: '回复键盘按钮已处理'
        };
      }

      // 简单的关键词响应
      if (text.includes('帮助') || text.includes('help')) {
        await this.dependencies.commandHandler.handleHelpCommand(message);
        responseAction = 'help_response';
        responseDescription = '帮助响应';
      } else if (text.includes('菜单') || text.includes('menu')) {
        await this.dependencies.keyboardBuilder.showMainMenu(message.chat.id);
        responseAction = 'menu_response';
        responseDescription = '菜单响应';
      } else if (text.includes('余额') || text.includes('balance')) {
        await this.dependencies.commandHandler.handleBalanceCommand(message);
        responseAction = 'balance_response';
        responseDescription = '余额查询响应';
      } else {
        // 默认响应
        await this.dependencies.api.sendMessage(
          message.chat.id,
          '您好！我是TRON能量租赁机器人。\n\n' +
          '发送 /menu 查看主菜单\n' +
          '发送 /help 获取帮助\n' +
          '发送 /start 重新开始'
        );
      }

      // 记录机器人响应
      await this.dependencies.logger.logBotActivity(
        'info', 
        responseAction, 
        `机器人响应: ${responseDescription}`, 
        {
          chatId: message.chat.id,
          userId: message.from?.id,
          userMessage: message.text.substring(0, 100),
          responseType: responseAction
        }
      );

      return { 
        success: true, 
        action: responseAction,
        description: responseDescription
      };

    } catch (error) {
      console.error('❌ 文本消息处理失败:', error);
      
      await this.dependencies.logger.logBotActivity(
        'error', 
        'text_message_failed', 
        `文本消息处理失败: ${error.message}`, 
        {
          error: error.stack,
          message
        }
      );

      return { 
        success: false, 
        error: error as Error,
        action: 'text_message_error',
        description: '文本消息处理失败'
      };
    }
  }

  /**
   * 处理回复键盘按钮文本
   */
  async handleReplyKeyboardButtons(message: any, text: string): Promise<boolean> {
    try {
      console.log(`🔍 处理回复键盘按钮: "${text}"`);
      
      // 动态查找按钮对应的callback_data
      const actionType = await this.findCallbackDataByText(message.chat.id, text);
      if (!actionType) {
        return false; // 不是回复键盘按钮
      }

      console.log(`🎯 识别到回复键盘按钮: "${text}" -> ${actionType}`);

      // 处理不同类型的按钮
      if (actionType === 'my_orders') {
        await this.dependencies.commandHandler.handleOrdersCommand(message);
        await this.dependencies.logger.logBotActivity(
          'info', 
          'reply_keyboard_orders', 
          '回复键盘 - 我的订单', 
          { 
            chatId: message.chat.id, 
            buttonText: text 
          }
        );
        return true;

      } else if (actionType === 'check_balance') {
        await this.dependencies.commandHandler.handleBalanceCommand(message);
        await this.dependencies.logger.logBotActivity(
          'info', 
          'reply_keyboard_balance', 
          '回复键盘 - 账户余额', 
          { 
            chatId: message.chat.id, 
            buttonText: text 
          }
        );
        return true;

      } else if (actionType === 'help_support') {
        await this.dependencies.commandHandler.handleHelpCommand(message);
        await this.dependencies.logger.logBotActivity(
          'info', 
          'reply_keyboard_help', 
          '回复键盘 - 帮助支持', 
          { 
            chatId: message.chat.id, 
            buttonText: text 
          }
        );
        return true;

      } else if (actionType === 'refresh_menu') {
        await this.dependencies.keyboardBuilder.showMainMenu(message.chat.id);
        await this.dependencies.logger.logBotActivity(
          'info', 
          'reply_keyboard_menu', 
          '回复键盘 - 刷新菜单', 
          { 
            chatId: message.chat.id, 
            buttonText: text 
          }
        );
        return true;

      } else if (['energy_flash', 'transaction_package', 'trx_exchange'].includes(actionType)) {
        // 处理价格配置相关的按钮
        console.log(`🎯 检测到价格配置按钮: ${actionType}, 文本: ${text}`);
        await this.handlePriceConfigButton(message, actionType, text);
        console.log(`✅ 价格配置按钮处理完成: ${actionType}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ 处理回复键盘按钮失败:', error);
      await this.dependencies.logger.logBotActivity(
        'error', 
        'reply_keyboard_failed', 
        `回复键盘按钮处理失败: ${error.message}`, 
        {
          error: error.stack,
          buttonText: text,
          chatId: message.chat.id
        }
      );
      return false;
    }
  }

  /**
   * 处理价格配置相关按钮
   */
  private async handlePriceConfigButton(message: any, configType: string, buttonText: string): Promise<void> {
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
  private formatTemplateText(template: string, values: TemplateVariables): string {
    let result = template;
    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value?.toString() || '0');
    }
    return result;
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
