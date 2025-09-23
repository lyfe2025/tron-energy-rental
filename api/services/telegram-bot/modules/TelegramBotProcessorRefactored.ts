/**
 * 重构后的Telegram机器人消息处理模块
 * 使用动态回调调度系统，支持灵活的按钮配置
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../config/database.ts';
import { orderService } from '../../order.ts';
import { UserService } from '../../user.ts';
import { MenuCallbackHandler } from '../callbacks/handlers/MenuCallbackHandler.ts';
import { PriceCallbackHandler } from '../callbacks/handlers/PriceCallbackHandler.ts';
import type { CallbackHandlerDependencies } from '../callbacks/types/callback.types.ts';
import { CommandHandler } from '../commands/CommandHandler.ts';
import { CallbackDispatcher } from '../core/CallbackDispatcher.ts';
import { DynamicButtonMapper } from '../core/DynamicButtonMapper.ts';
import { KeyboardBuilder } from '../keyboards/KeyboardBuilder.ts';

export class TelegramBotProcessorRefactored {
  private callbackDispatcher: CallbackDispatcher;
  private buttonMapper: DynamicButtonMapper;
  private commandHandler: CommandHandler;
  private keyboardBuilder: KeyboardBuilder;
  
  constructor(
    private bot: TelegramBot,
    private botId: string,
    commandHandler: CommandHandler,
    keyboardBuilder: KeyboardBuilder,
    private logger: {
      logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
    }
  ) {
    this.commandHandler = commandHandler;
    this.keyboardBuilder = keyboardBuilder;
    
    // 初始化调度系统
    this.callbackDispatcher = new CallbackDispatcher(bot, logger);
    this.buttonMapper = new DynamicButtonMapper();
    
    // 注册回调处理器
    this.registerCallbackHandlers();
  }

  /**
   * 注册回调处理器
   */
  private registerCallbackHandlers(): void {
    // 创建依赖对象
    const dependencies: CallbackHandlerDependencies = {
      bot: this.bot,
      userService: new UserService(),
      orderService: orderService
    };

    // 注册菜单处理器
    const menuHandler = new MenuCallbackHandler(dependencies);
    this.callbackDispatcher.registerHandler('menu', menuHandler);
    
    // 注册价格配置处理器
    const priceHandler = new PriceCallbackHandler(dependencies);
    this.callbackDispatcher.registerHandler('price', priceHandler);

    // TODO: 注册其他处理器
    // this.callbackDispatcher.registerHandler('order', orderHandler);
    // this.callbackDispatcher.registerHandler('user', userHandler);
    // this.callbackDispatcher.registerHandler('help', helpHandler);
    // this.callbackDispatcher.registerHandler('package', packageHandler);
    // this.callbackDispatcher.registerHandler('delegation', delegationHandler);

    console.log(`📋 已注册回调处理器: ${this.callbackDispatcher.getRegisteredHandlers().join(', ')}`);
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
   * 处理回调查询（使用新的调度系统）
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

      // 使用新的调度系统处理回调
      await this.callbackDispatcher.dispatch(callbackQuery);

    } catch (error) {
      console.error('❌ 处理回调查询失败:', error);
      
      // 尝试回应回调查询，避免用户界面卡住
      try {
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: '操作失败，请稍后重试',
          show_alert: true
        });
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
          await this.bot.sendMessage(
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
        await this.bot.sendMessage(
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
   * 处理普通文本消息（使用动态按钮映射）
   */
  async handleTextMessage(message: any): Promise<void> {
    try {
      const originalText = message.text.trim();
      const text = originalText.toLowerCase();
      
      console.log('💬 处理文本消息:', originalText.substring(0, 100));

      let responseAction = 'text_response';
      let responseDescription = '默认响应';

      // 使用动态按钮映射处理回复键盘按钮
      if (await this.handleReplyKeyboardButtonsDynamic(message, originalText)) {
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
        await this.bot.sendMessage(
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
   * 使用动态按钮映射处理回复键盘按钮文本
   */
  private async handleReplyKeyboardButtonsDynamic(message: any, text: string): Promise<boolean> {
    try {
      console.log(`🔍 开始处理回复键盘按钮: "${text}"`);
      
      // 直接从机器人配置查找按钮映射
      const callbackData = await this.findCallbackDataFromBotConfig(text);
      if (!callbackData) {
        console.log(`❌ 未找到按钮 "${text}" 的callback_data映射`);
        return false;
      }

      console.log(`🎯 识别到回复键盘按钮: "${text}" -> ${callbackData}`);

      // 构建回调查询对象，模拟内联键盘回调
      const mockCallbackQuery = {
        id: `mock_${Date.now()}`,
        from: message.from,
        message: message,
        chat_instance: `mock_${message.chat.id}`,
        data: callbackData
      };

      // 使用调度器处理
      await this.callbackDispatcher.dispatch(mockCallbackQuery);

      await this.logger.logBotActivity('info', 'reply_keyboard_handled', `回复键盘按钮处理: ${text}`, { 
        chatId: message.chat.id, 
        buttonText: text,
        callbackData: callbackData,
        actionType: callbackData
      });

      return true;
    } catch (error) {
      console.error('❌ 处理动态回复键盘按钮失败:', error);
      await this.logger.logBotActivity('error', 'reply_keyboard_failed', `回复键盘按钮处理失败: ${error.message}`, {
        error: error.stack,
        buttonText: text,
        chatId: message.chat.id
      });
      return false;
    }
  }

  /**
   * 从机器人配置直接查找callback_data
   */
  private async findCallbackDataFromBotConfig(buttonText: string): Promise<string | null> {
    try {
      if (!this.botId) {
        console.error('❌ 缺少botId');
        return null;
      }

      // 从数据库查找机器人配置
      const result = await query('SELECT keyboard_config FROM telegram_bots WHERE id = $1', [this.botId]);
      
      if (result.rows.length === 0) {
        console.error('❌ 未找到机器人配置');
        return null;
      }

      const keyboardConfig = result.rows[0].keyboard_config;
      if (!keyboardConfig?.main_menu?.rows) {
        console.error('❌ 键盘配置无效');
        return null;
      }

      // 遍历所有按钮查找匹配
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

      return null;
    } catch (error) {
      console.error('❌ 查找callback_data失败:', error);
      return null;
    }
  }

  /**
   * 刷新按钮映射缓存
   */
  async refreshButtonMappings(): Promise<void> {
    await this.buttonMapper.refreshCache();
  }

  /**
   * 获取调度器统计信息
   */
  getDispatcherStats(): {
    registeredHandlers: string[];
    buttonMappingStats: any;
  } {
    return {
      registeredHandlers: this.callbackDispatcher.getRegisteredHandlers(),
      buttonMappingStats: this.buttonMapper.getStats()
    };
  }

  /**
   * 动态注册新的回调处理器
   */
  registerCallbackHandler(actionType: string, handler: any): void {
    this.callbackDispatcher.registerHandler(actionType, handler);
  }

  /**
   * 取消注册回调处理器
   */
  unregisterCallbackHandler(actionType: string): boolean {
    return this.callbackDispatcher.unregisterHandler(actionType);
  }
}
