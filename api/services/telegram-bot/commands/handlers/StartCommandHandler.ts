/**
 * Start命令处理器
 * 处理/start命令，用户注册和欢迎消息
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../config/database.js';
import { UserAuthService } from '../../../user/modules/UserAuthService.js';
import { CommandValidator } from '../middleware/CommandValidator.js';
import { UserContextManager } from '../middleware/UserContextManager.js';
import type { BotConfig, CommandHandlerDependencies } from '../types/command.types.js';
import { MessageFormatter } from '../utils/MessageFormatter.js';
import { PlaceholderReplacer } from '../utils/PlaceholderReplacer.js';

export class StartCommandHandler {
  private bot: TelegramBot;
  private botId?: string;

  constructor(dependencies: CommandHandlerDependencies) {
    this.bot = dependencies.bot;
    this.botId = dependencies.botId;
  }

  /**
   * 获取当前机器人配置
   */
  private async getBotConfig(): Promise<BotConfig | null> {
    try {
      let result;
      
      if (this.botId) {
        // 优先使用机器人ID获取特定机器人的配置
        result = await query(
          'SELECT welcome_message, help_message, keyboard_config FROM telegram_bots WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
          [this.botId]
        );
      } else {
        // 兼容模式：如果没有机器人ID，获取任意一个活跃机器人的配置
        result = await query(
          'SELECT welcome_message, help_message, keyboard_config FROM telegram_bots WHERE is_active = true AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1'
        );
      }
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    } catch (error) {
      console.error('获取机器人配置失败:', error);
      return null;
    }
  }

  /**
   * 处理 /start 命令 - 机器人启动和用户注册
   */
  async handleStartCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramUser = msg.from;
    
    if (!CommandValidator.validateUserInfo(telegramUser) || !CommandValidator.validateChatInfo(chatId)) {
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息，请重试。');
      return;
    }

    try {
      // 创建或更新用户上下文
      const userContext = UserContextManager.createOrUpdateContext(msg, this.botId);
      if (!userContext) {
        await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 创建用户上下文失败，请重试。');
        return;
      }

      // 🔍 详细调试Telegram用户对象内容
      console.log(`🔍 详细检查Telegram用户对象:`, {
        telegram_user_full_object: telegramUser,
        extracted_fields: {
          id: telegramUser!.id,
          username: telegramUser!.username,
          first_name: telegramUser!.first_name,
          last_name: telegramUser!.last_name,
          language_code: telegramUser!.language_code,
          is_premium: (telegramUser as any).is_premium
        },
        language_code_debug: {
          raw_value: telegramUser!.language_code,
          type: typeof telegramUser!.language_code,
          is_undefined: telegramUser!.language_code === undefined,
          is_null: telegramUser!.language_code === null,
          is_empty_string: telegramUser!.language_code === '',
          truthy: !!telegramUser!.language_code
        }
      });

      // 注册或获取用户 - 完整版本，保存所有Telegram用户信息
      const registrationData = UserContextManager.createRegistrationData(userContext);
      const user = await UserAuthService.registerTelegramUser(registrationData);

      // 记录用户通过机器人进入的信息 - 完整日志
      console.log(`👤 用户通过机器人注册/登录:`, {
        user_id: user.id,
        telegram_id: telegramUser!.id,
        username: user.username,
        first_name: telegramUser!.first_name,
        last_name: telegramUser!.last_name,
        language_code: telegramUser!.language_code,
        is_premium: !!(telegramUser as any).is_premium,
        bot_id: this.botId,
        chat_id: chatId,
        complete_telegram_info: {
          has_username: !!telegramUser!.username,
          has_last_name: !!telegramUser!.last_name,
          has_language: !!telegramUser!.language_code,
          is_premium_user: !!(telegramUser as any).is_premium
        }
      });

      // 验证注册数据完整性
      if (user.id) {
        const validation = await UserAuthService.validateTelegramUserRegistration(user.id);
        if (!validation.isValid) {
          console.warn(`⚠️ 用户注册数据不完整:`, {
            user_id: user.id,
            issues: validation.issues
          });
        } else {
          console.log(`✅ 用户注册数据验证通过: ${user.id}`);
        }
      }

      // 获取机器人配置
      const botConfig = await this.getBotConfig();
      
      // 使用配置的欢迎消息，如果没有配置则使用默认消息
      let welcomeMessage = MessageFormatter.createDefaultWelcomeMessage();

      // 如果机器人配置了自定义欢迎消息，则使用自定义消息
      if (botConfig?.welcome_message && botConfig.welcome_message.trim()) {
        welcomeMessage = botConfig.welcome_message;
      }

      // 替换用户占位符
      welcomeMessage = PlaceholderReplacer.replacePlaceholders(welcomeMessage, telegramUser!);

      // 构建键盘（内嵌键盘或回复键盘）
      const messageOptions = MessageFormatter.buildKeyboardFromConfig(botConfig || {});

      await MessageFormatter.safeSendMessage(this.bot, chatId, welcomeMessage, messageOptions);
      
      // 更新用户上下文
      UserContextManager.setCurrentCommand(telegramUser!.id, '/start');
      
      return;
    } catch (error) {
      console.error('❌ /start命令处理失败:', {
        error: error instanceof Error ? error.message : error,
        telegram_id: telegramUser!.id,
        chat_id: chatId,
        bot_id: this.botId,
        stack: error instanceof Error ? error.stack : undefined
      });
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 注册失败，请重试。如问题持续存在，请联系客服。');
    }
  }

  /**
   * 注册Start命令处理器
   */
  registerStartCommand(): void {
    this.bot.onText(/\/start/, async (msg) => {
      try {
        await this.handleStartCommand(msg);
      } catch (error) {
        console.error('Error handling /start command:', error);
        await MessageFormatter.safeSendMessage(this.bot, msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });
  }
}
