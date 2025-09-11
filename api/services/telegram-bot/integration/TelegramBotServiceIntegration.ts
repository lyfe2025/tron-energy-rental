/**
 * TelegramBotService 集成示例
 * 展示如何在现有 TelegramBotService 中集成新的 TelegramBotProcessorRefactored
 * 确保每个机器人使用自己的 webhook URL
 */
import TelegramBot from 'node-telegram-bot-api';
import { CommandHandler } from '../commands/CommandHandler.js';
import { KeyboardBuilder } from '../keyboards/KeyboardBuilder.js';
import { TelegramBotProcessorRefactored } from '../modules/TelegramBotProcessorRefactored.js';

/**
 * 扩展现有的 TelegramBotService 以支持新的重构处理器
 */
export class TelegramBotServiceWithRefactoredProcessor {
  private bot: TelegramBot;
  private botId: string;
  private processor: TelegramBotProcessorRefactored;
  private commandHandler: CommandHandler;
  private keyboardBuilder: KeyboardBuilder;
  private logger: {
    logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
  };

  constructor(botId: string) {
    this.botId = botId;
  }

  /**
   * 初始化机器人服务
   * 这个方法替代原有的 initializeModules 方法
   */
  async initialize(
    bot: TelegramBot,
    commandHandler: CommandHandler,
    keyboardBuilder: KeyboardBuilder,
    logger: {
      logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
    }
  ): Promise<void> {
    this.bot = bot;
    this.commandHandler = commandHandler;
    this.keyboardBuilder = keyboardBuilder;
    this.logger = logger;

    // 🔥 关键：使用新的重构处理器，确保传递 botId
    this.processor = new TelegramBotProcessorRefactored(
      this.bot,
      this.botId,  // 📡 确保每个机器人使用自己的 ID
      this.commandHandler,
      this.keyboardBuilder,
      this.logger
    );

    console.log(`✅ 机器人 ${this.botId} 已初始化重构处理器`);
    
    // 设置消息和回调处理
    this.setupMessageHandlers();
  }

  /**
   * 设置消息处理器
   */
  private setupMessageHandlers(): void {
    // 处理普通消息
    this.bot.on('message', async (message: any) => {
      try {
        await this.processor.processMessage(message);
      } catch (error) {
        console.error(`机器人 ${this.botId} 处理消息失败:`, error);
        await this.logger.logBotActivity('error', 'message_processing_failed', 
          `消息处理失败: ${error.message}`, {
            botId: this.botId,
            error: error.stack,
            message
          });
      }
    });

    // 处理回调查询
    this.bot.on('callback_query', async (callbackQuery: any) => {
      try {
        await this.processor.processCallbackQuery(callbackQuery);
      } catch (error) {
        console.error(`机器人 ${this.botId} 处理回调失败:`, error);
        await this.logger.logBotActivity('error', 'callback_processing_failed', 
          `回调处理失败: ${error.message}`, {
            botId: this.botId,
            error: error.stack,
            callbackQuery
          });
      }
    });

    console.log(`📱 机器人 ${this.botId} 消息处理器已设置`);
  }

  /**
   * 获取处理器统计信息
   */
  getProcessorStats(): any {
    return this.processor.getDispatcherStats();
  }

  /**
   * 刷新按钮映射配置
   */
  async refreshButtonMappings(): Promise<void> {
    await this.processor.refreshButtonMappings();
    console.log(`🔄 机器人 ${this.botId} 按钮映射已刷新`);
  }

  /**
   * 动态注册新的回调处理器
   */
  registerCallbackHandler(actionType: string, handler: any): void {
    this.processor.registerCallbackHandler(actionType, handler);
    console.log(`📋 机器人 ${this.botId} 已注册处理器: ${actionType}`);
  }
}

/**
 * 在现有 TelegramBotService 中集成重构处理器的示例
 */
export function integrateRefactoredProcessorIntoExistingService() {
  return `
/**
 * 在现有的 TelegramBotService.ts 中的修改示例
 */

// 1. 在 TelegramBotService 类中添加新的属性
private refactoredProcessor: TelegramBotProcessorRefactored;
private currentBotId: string;

// 2. 在 createHandlers 方法中保存 botId
private createHandlers(bot: TelegramBot, botId: string): {
  commandHandler: CommandHandler;
  callbackHandler: CallbackHandler;
  keyboardBuilder: KeyboardBuilder;
  botUtils: BotUtils;
} {
  this.currentBotId = botId; // 🔥 保存当前机器人 ID
  
  this.commandHandler = new CommandHandler({ bot, botId });
  this.callbackHandler = new CallbackHandler(bot);
  this.keyboardBuilder = new KeyboardBuilder(bot, botId);
  this.botUtils = new BotUtils(bot);

  return {
    commandHandler: this.commandHandler,
    callbackHandler: this.callbackHandler,
    keyboardBuilder: this.keyboardBuilder,
    botUtils: this.botUtils
  };
}

// 3. 在 initializeModules 方法中替换处理器
private initializeModules(): void {
  // ... 其他模块初始化 ...

  // 🔥 使用新的重构处理器替代旧的处理器
  this.refactoredProcessor = new TelegramBotProcessorRefactored(
    this.bot,
    this.currentBotId,  // 📡 确保传递正确的 botId
    this.commandHandler,
    this.keyboardBuilder,
    {
      logBotActivity: (level, action, message, metadata) => 
        this.logger.logBotActivity(level, action, message, metadata)
    }
  );

  // 设置消息处理
  this.setupRefactoredMessageHandlers();
}

// 4. 新的消息处理设置方法
private setupRefactoredMessageHandlers(): void {
  this.bot.on('message', async (message) => {
    await this.refactoredProcessor.processMessage(message);
  });

  this.bot.on('callback_query', async (callbackQuery) => {
    await this.refactoredProcessor.processCallbackQuery(callbackQuery);
  });
}
`;
}

/**
 * 验证多机器人 webhook URL 获取的测试用例
 */
export async function testMultipleBotWebhookUrls() {
  console.log('🧪 测试多机器人 webhook URL 获取...');

  // 模拟两个不同的机器人
  const bot1Config = {
    id: 'bot-001',
    webhookUrl: 'https://bot1.ngrok.app/api/telegram/webhook/bot-001'
  };

  const bot2Config = {
    id: 'bot-002', 
    webhookUrl: 'https://bot2.ngrok.app/api/telegram/webhook/bot-002'
  };

  // 创建测试用的机器人服务
  const botService1 = new TelegramBotServiceWithRefactoredProcessor(bot1Config.id);
  const botService2 = new TelegramBotServiceWithRefactoredProcessor(bot2Config.id);

  console.log('✅ 两个机器人服务已创建');
  console.log('📡 机器人1 将使用:', bot1Config.webhookUrl);
  console.log('📡 机器人2 将使用:', bot2Config.webhookUrl);
  
  return {
    bot1: botService1,
    bot2: botService2,
    verification: {
      bot1Id: bot1Config.id,
      bot2Id: bot2Config.id,
      bot1WebhookBase: 'https://bot1.ngrok.app',
      bot2WebhookBase: 'https://bot2.ngrok.app'
    }
  };
}

/**
 * 验证资源URL构建的正确性
 */
export function verifyResourceUrlBuilding() {
  return {
    scenario: '多机器人资源URL构建验证',
    examples: [
      {
        botId: 'bot-001',
        webhookUrl: 'https://bot1.ngrok.app/api/telegram/webhook/bot-001',
        imageUrl: '/uploads/price-configs/energy-flash.jpg',
        expectedFullUrl: 'https://bot1.ngrok.app/uploads/price-configs/energy-flash.jpg'
      },
      {
        botId: 'bot-002',
        webhookUrl: 'https://bot2.ngrok.app/api/telegram/webhook/bot-002',
        imageUrl: '/uploads/price-configs/transaction-package.jpg',
        expectedFullUrl: 'https://bot2.ngrok.app/uploads/price-configs/transaction-package.jpg'
      }
    ],
    verification: '每个机器人的图片资源都使用自己的域名'
  };
}
