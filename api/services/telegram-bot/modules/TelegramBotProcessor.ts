/**
 * Telegram机器人消息处理模块 (重构版本)
 * 现在是一个轻量级适配器，委托给新的模块化架构
 */
import TelegramBot from 'node-telegram-bot-api';
import { UpdateRouter } from '../processor/UpdateRouter.ts';
import type {
  MessageProcessResult,
  ProcessorDependencies
} from '../processor/types.ts';

export class TelegramBotProcessor {
  private updateRouter: UpdateRouter;
  private dependencies: ProcessorDependencies;

  constructor(
    commandHandler: any,
    callbackHandler: any,
    keyboardBuilder: any,
    api: {
      sendMessage: (chatId: number, message: string, options?: TelegramBot.SendMessageOptions) => Promise<TelegramBot.Message>;
      answerCallbackQuery: (callbackQueryId: string, options?: TelegramBot.AnswerCallbackQueryOptions) => Promise<boolean>;
    },
    logger: {
      logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
    },
    bot?: TelegramBot,
    botId?: string
  ) {
    // 构建依赖对象
    this.dependencies = {
      commandHandler,
      callbackHandler,
      keyboardBuilder,
      api,
      logger,
      bot,
      botId
    };

    // 初始化路由器
    this.updateRouter = new UpdateRouter(this.dependencies);
  }

  /**
   * 更新处理器实例
   */
  updateHandlers(
    commandHandler: any,
    callbackHandler: any,
    keyboardBuilder: any
  ): void {
    // 更新依赖
    this.dependencies.commandHandler = commandHandler;
    this.dependencies.callbackHandler = callbackHandler;
    this.dependencies.keyboardBuilder = keyboardBuilder;

    // 更新路由器依赖
    this.updateRouter.updateDependencies(this.dependencies);
  }

  /**
   * 处理消息（支持webhook和polling两种模式）
   * @deprecated 使用 processUpdate 方法代替
   */
  async processMessage(message: any): Promise<void> {
    try {
      const result = await this.updateRouter.getMessageProcessor().processMessage(message);
      
      if (!result.success && result.error) {
        console.error('消息处理失败:', result.error);
      }
    } catch (error) {
      console.error('❌ processMessage 适配器失败:', error);
    }
  }

  /**
   * 处理回调查询（支持webhook和polling两种模式）
   * @deprecated 使用 processUpdate 方法代替
   */
  async processCallbackQuery(callbackQuery: any): Promise<void> {
    try {
      const result = await this.updateRouter.getCallbackProcessor().processCallbackQuery(callbackQuery);
      
      if (!result.success && result.error) {
        console.error('回调查询处理失败:', result.error);
      }
    } catch (error) {
      console.error('❌ processCallbackQuery 适配器失败:', error);
    }
  }

  /**
   * 处理 Telegram 更新（推荐使用的新方法）
   */
  async processUpdate(update: any): Promise<MessageProcessResult> {
    return await this.updateRouter.route(update);
  }

  /**
   * 处理具体的命令
   * @deprecated 使用路由器的命令处理器代替
   */
  async handleCommand(command: string, message: any): Promise<void> {
    try {
      const result = await this.updateRouter.getMessageProcessor()
        .getCommandProcessor()
        .handleCommand(command, message);
      
      if (!result.success && result.error) {
        console.error('命令处理失败:', result.error);
      }
    } catch (error) {
      console.error(`❌ handleCommand 适配器失败: /${command}`, error);
    }
  }

  /**
   * 处理普通文本消息
   * @deprecated 使用路由器的文本消息处理器代替
   */
  async handleTextMessage(message: any): Promise<void> {
    try {
      const result = await this.updateRouter.getMessageProcessor()
        .getTextMessageHandler()
        .handleTextMessage(message);
      
      if (!result.success && result.error) {
        console.error('文本消息处理失败:', result.error);
      }
    } catch (error) {
      console.error('❌ handleTextMessage 适配器失败:', error);
    }
  }

  // === 新的公共 API ===

  /**
   * 获取更新路由器（用于直接访问新架构）
   */
  getUpdateRouter(): UpdateRouter {
    return this.updateRouter;
  }

  /**
   * 获取消息处理器（用于直接访问新架构）
   */
  getMessageProcessor() {
    return this.updateRouter.getMessageProcessor();
  }

  /**
   * 获取回调查询处理器（用于直接访问新架构）
   */
  getCallbackProcessor() {
    return this.updateRouter.getCallbackProcessor();
  }

  /**
   * 获取命令处理器（用于直接访问新架构）
   */
  getCommandProcessor() {
    return this.updateRouter.getMessageProcessor().getCommandProcessor();
  }

  /**
   * 获取文本消息处理器（用于直接访问新架构）
   */
  getTextMessageHandler() {
    return this.updateRouter.getMessageProcessor().getTextMessageHandler();
  }
}

