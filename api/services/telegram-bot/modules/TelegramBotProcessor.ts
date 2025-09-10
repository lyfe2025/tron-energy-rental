/**
 * Telegram机器人消息处理模块
 * 负责处理消息和回调查询
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../config/database.js';
import { CallbackHandler } from '../callbacks/CallbackHandler.js';
import { CommandHandler } from '../commands/CommandHandler.js';
import { KeyboardBuilder } from '../keyboards/KeyboardBuilder.js';

export class TelegramBotProcessor {
  constructor(
    private commandHandler: CommandHandler,
    private callbackHandler: CallbackHandler,
    private keyboardBuilder: KeyboardBuilder,
    private api: {
      sendMessage: (chatId: number, message: string, options?: TelegramBot.SendMessageOptions) => Promise<TelegramBot.Message>;
      answerCallbackQuery: (callbackQueryId: string, options?: TelegramBot.AnswerCallbackQueryOptions) => Promise<boolean>;
    },
    private logger: {
      logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
    },
    private bot?: TelegramBot
  ) {}

  /**
   * 更新处理器实例
   */
  updateHandlers(
    commandHandler: CommandHandler,
    callbackHandler: CallbackHandler,
    keyboardBuilder: KeyboardBuilder
  ): void {
    this.commandHandler = commandHandler;
    this.callbackHandler = callbackHandler;
    this.keyboardBuilder = keyboardBuilder;
  }

  /**
   * 处理消息（支持webhook和polling两种模式）
   */
  async processMessage(message: any): Promise<void> {
    try {
      const isCommand = message.text && message.text.startsWith('/');
      
      console.log('📨 处理消息:', {
        chatId: message.chat.id,
        text: message.text?.substring(0, 50),
        isCommand,
        from: message.from?.username
      });

      // 记录用户消息
      await this.logger.logBotActivity('info', 'user_message_received', `用户消息: ${message.text?.substring(0, 100)}`, {
        chatId: message.chat.id,
        userId: message.from?.id,
        username: message.from?.username,
        messageType: isCommand ? 'command' : 'text',
        messageLength: message.text?.length || 0
      });

      if (isCommand) {
        // 处理命令
        const command = message.text.split(' ')[0].substring(1);
        await this.handleCommand(command, message);
      } else if (message.text) {
        // 处理普通文本消息
        await this.handleTextMessage(message);
      }

    } catch (error) {
      console.error('❌ 处理消息失败:', error);
      await this.logger.logBotActivity('error', 'message_processing_failed', `消息处理失败: ${error.message}`, {
        error: error.stack,
        message
      });
    }
  }

  /**
   * 处理回调查询（支持webhook和polling两种模式）
   */
  async processCallbackQuery(callbackQuery: any): Promise<void> {
    try {
      const data = callbackQuery.data;
      const chatId = callbackQuery.message?.chat.id;

      console.log('🔘 处理回调查询:', {
        data,
        chatId,
        from: callbackQuery.from?.username
      });

      // 记录用户回调查询
      await this.logger.logBotActivity('info', 'user_callback_received', `用户回调: ${data}`, {
        chatId,
        userId: callbackQuery.from?.id,
        username: callbackQuery.from?.username,
        callbackData: data
      });

      // 先回应回调查询
      await this.api.answerCallbackQuery(callbackQuery.id);

      // 委托给回调处理器的路由方法
      if (this.callbackHandler && (this.callbackHandler as any).routeCallback) {
        await (this.callbackHandler as any).routeCallback(chatId, data, callbackQuery);
      } else {
        console.warn(`回调处理器未正确初始化或缺少routeCallback方法`);
      }

    } catch (error) {
      console.error('❌ 处理回调查询失败:', error);
      
      // 尝试回应回调查询，避免用户界面卡住
      try {
        if (this.bot) {
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: '操作失败，请稍后重试',
            show_alert: true
          });
        }
      } catch (answerError) {
        console.error('回应回调查询失败:', answerError);
      }

      await this.logger.logBotActivity('error', 'callback_processing_failed', `回调查询处理失败: ${error.message}`, {
        error: error.stack,
        callbackQuery
      });
    }
  }

  /**
   * 处理具体的命令
   */
  async handleCommand(command: string, message: any): Promise<void> {
    try {
      console.log(`🎯 处理命令: /${command}`);

      switch (command) {
        case 'start':
          await this.commandHandler.handleStartCommand(message);
          // 显示主菜单键盘
          await this.keyboardBuilder.showMainMenu(message.chat.id);
          break;
        case 'menu':
          await this.keyboardBuilder.showMainMenu(message.chat.id);
          break;
        case 'help':
          await this.commandHandler.handleHelpCommand(message);
          break;
        case 'balance':
          await this.commandHandler.handleBalanceCommand(message);
          break;
        case 'orders':
          await this.commandHandler.handleOrdersCommand(message);
          break;
        default:
          // 处理未知命令
          await this.api.sendMessage(
            message.chat.id,
            `未知命令: /${command}\n\n发送 /help 查看可用命令`
          );
          break;
      }

      await this.logger.logBotActivity('info', 'command_handled', `命令处理成功: /${command}`, {
        command,
        chatId: message.chat.id,
        userId: message.from?.id
      });

    } catch (error) {
      console.error(`❌ 命令处理失败: /${command}`, error);
      
      try {
        await this.api.sendMessage(
          message.chat.id,
          '抱歉，命令处理时出现错误，请稍后重试。'
        );
      } catch (sendError) {
        console.error('发送错误提示失败:', sendError);
      }

      await this.logger.logBotActivity('error', 'command_handling_failed', `命令处理失败: /${command} - ${error.message}`, {
        command,
        chatId: message.chat.id,
        userId: message.from?.id,
        error: error.stack
      });
    }
  }

  /**
   * 处理普通文本消息
   */
  async handleTextMessage(message: any): Promise<void> {
    try {
      const originalText = message.text.trim();
      const text = originalText.toLowerCase();
      
      console.log('💬 处理文本消息:', originalText.substring(0, 100));

      let responseAction = 'text_response';
      let responseDescription = '默认响应';

      // 处理回复键盘按钮文本
      if (await this.handleReplyKeyboardButtons(message, originalText)) {
        return; // 如果成功处理了键盘按钮，直接返回
      }

      // 简单的关键词响应
      if (text.includes('帮助') || text.includes('help')) {
        await this.commandHandler.handleHelpCommand(message);
        responseAction = 'help_response';
        responseDescription = '帮助响应';
      } else if (text.includes('菜单') || text.includes('menu')) {
        await this.keyboardBuilder.showMainMenu(message.chat.id);
        responseAction = 'menu_response';
        responseDescription = '菜单响应';
      } else if (text.includes('余额') || text.includes('balance')) {
        await this.commandHandler.handleBalanceCommand(message);
        responseAction = 'balance_response';
        responseDescription = '余额查询响应';
      } else {
        // 默认响应
        await this.api.sendMessage(
          message.chat.id,
          '您好！我是TRON能量租赁机器人。\n\n' +
          '发送 /menu 查看主菜单\n' +
          '发送 /help 获取帮助\n' +
          '发送 /start 重新开始'
        );
      }

      // 记录机器人响应
      await this.logger.logBotActivity('info', responseAction, `机器人响应: ${responseDescription}`, {
        chatId: message.chat.id,
        userId: message.from?.id,
        userMessage: message.text.substring(0, 100),
        responseType: responseAction
      });

    } catch (error) {
      console.error('❌ 文本消息处理失败:', error);
      await this.logger.logBotActivity('error', 'text_message_failed', `文本消息处理失败: ${error.message}`, {
        error: error.stack,
        message
      });
    }
  }

  /**
   * 处理回复键盘按钮文本
   */
  private async handleReplyKeyboardButtons(message: any, text: string): Promise<boolean> {
    try {
      // 定义回复键盘按钮文本映射
      const buttonMappings = {
        '⚡ 能量闪租': 'energy_flash',
        '🔥 笔数套餐': 'transaction_package', 
        '🔄 TRX闪兑': 'trx_exchange',
        '📋 我的订单': 'my_orders',
        '💰 账户余额': 'check_balance',
        '❓ 帮助支持': 'help_support',
        '🔄 刷新菜单': 'refresh_menu'
      };

      const actionType = buttonMappings[text];
      if (!actionType) {
        return false; // 不是回复键盘按钮
      }

      console.log(`🎯 识别到回复键盘按钮: "${text}" -> ${actionType}`);

      // 处理不同类型的按钮
      if (actionType === 'my_orders') {
        await this.commandHandler.handleOrdersCommand(message);
        await this.logger.logBotActivity('info', 'reply_keyboard_orders', '回复键盘 - 我的订单', { 
          chatId: message.chat.id, 
          buttonText: text 
        });
        return true;

      } else if (actionType === 'check_balance') {
        await this.commandHandler.handleBalanceCommand(message);
        await this.logger.logBotActivity('info', 'reply_keyboard_balance', '回复键盘 - 账户余额', { 
          chatId: message.chat.id, 
          buttonText: text 
        });
        return true;

      } else if (actionType === 'help_support') {
        await this.commandHandler.handleHelpCommand(message);
        await this.logger.logBotActivity('info', 'reply_keyboard_help', '回复键盘 - 帮助支持', { 
          chatId: message.chat.id, 
          buttonText: text 
        });
        return true;

      } else if (actionType === 'refresh_menu') {
        await this.keyboardBuilder.showMainMenu(message.chat.id);
        await this.logger.logBotActivity('info', 'reply_keyboard_menu', '回复键盘 - 刷新菜单', { 
          chatId: message.chat.id, 
          buttonText: text 
        });
        return true;

      } else if (['energy_flash', 'transaction_package', 'trx_exchange'].includes(actionType)) {
        // 处理价格配置相关的按钮
        await this.handlePriceConfigButton(message, actionType, text);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ 处理回复键盘按钮失败:', error);
      await this.logger.logBotActivity('error', 'reply_keyboard_failed', `回复键盘按钮处理失败: ${error.message}`, {
        error: error.stack,
        buttonText: text,
        chatId: message.chat.id
      });
      return false;
    }
  }

  /**
   * 处理价格配置相关按钮
   */
  private async handlePriceConfigButton(message: any, configType: string, buttonText: string): Promise<void> {
    try {
      console.log(`💰 处理价格配置按钮: ${configType}`);

      // 从数据库获取价格配置
      const priceConfigResult = await query(
        'SELECT name, description, config, inline_keyboard_config FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
        [configType]
      );

      if (priceConfigResult.rows.length === 0) {
        throw new Error(`未找到 ${configType} 的价格配置`);
      }

      const priceConfig = priceConfigResult.rows[0];
      const config = priceConfig.config;
      const keyboardConfig = priceConfig.inline_keyboard_config;

      // 使用配置中的真实数据生成响应消息
      let responseMessage = '';

      if (configType === 'energy_flash') {
        responseMessage = this.formatEnergyFlashMessage(priceConfig.name, config, keyboardConfig);
      } else if (configType === 'transaction_package') {
        responseMessage = this.formatTransactionPackageMessage(priceConfig.name, config, keyboardConfig);
      } else if (configType === 'trx_exchange') {
        responseMessage = this.formatTrxExchangeMessage(priceConfig.name, config, keyboardConfig);
      } else {
        responseMessage = `${priceConfig.name}\n\n${priceConfig.description}`;
      }

      await this.api.sendMessage(message.chat.id, responseMessage, {
        parse_mode: 'Markdown'
      });

      await this.logger.logBotActivity('info', `price_config_${configType}`, `价格配置响应: ${buttonText}`, {
        configType,
        buttonText,
        chatId: message.chat.id,
        userId: message.from?.id,
        configData: config
      });

    } catch (error) {
      console.error(`❌ 处理价格配置按钮失败 (${configType}):`, error);
      
      // 发送错误消息
      await this.api.sendMessage(
        message.chat.id,
        '抱歉，获取服务信息时出现错误，请稍后重试或联系客服。'
      );
      
      await this.logger.logBotActivity('error', 'price_config_failed', `价格配置响应失败: ${error.message}`, {
        error: error.stack,
        configType,
        buttonText,
        chatId: message.chat.id
      });
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
    
    // 最大租用（使用max_transactions而不是max_amount）
    if (config.max_transactions && displayTexts.max_label) {
      message += `${displayTexts.max_label}${config.max_transactions}笔\n\n`;
    }
    
    // 收款地址
    if (config.payment_address && displayTexts.address_label) {
      message += `${displayTexts.address_label}\n`;
      message += `${config.payment_address} (点击地址自动复制)\n\n`;
    }

    // 注意事项（使用🔺前缀）
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
