/**
 * 事件分发器
 * 负责处理Telegram Bot的各种事件分发和路由
 */
import TelegramBot from 'node-telegram-bot-api';

export class EventDispatcher {
  private bot: TelegramBot;
  private messageProcessor: {
    processMessage: (message: TelegramBot.Message) => Promise<void>;
    processCallbackQuery: (callbackQuery: TelegramBot.CallbackQuery) => Promise<void>;
  };
  private logger: {
    logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, metadata?: any) => Promise<void>;
  };

  constructor(
    bot: TelegramBot,
    messageProcessor: {
      processMessage: (message: TelegramBot.Message) => Promise<void>;
      processCallbackQuery: (callbackQuery: TelegramBot.CallbackQuery) => Promise<void>;
    },
    logger: {
      logBotActivity: (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, metadata?: any) => Promise<void>;
    }
  ) {
    this.bot = bot;
    this.messageProcessor = messageProcessor;
    this.logger = logger;
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听消息事件
    this.bot.on('message', async (message: TelegramBot.Message) => {
      await this.handleMessage(message);
    });

    // 监听回调查询事件
    this.bot.on('callback_query', async (callbackQuery: TelegramBot.CallbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    // 监听内联查询事件
    this.bot.on('inline_query', async (inlineQuery: TelegramBot.InlineQuery) => {
      await this.handleInlineQuery(inlineQuery);
    });

    // 监听选择的内联结果
    this.bot.on('chosen_inline_result', async (chosenInlineResult: TelegramBot.ChosenInlineResult) => {
      await this.handleChosenInlineResult(chosenInlineResult);
    });

    // 监听频道帖子事件
    this.bot.on('channel_post', async (message: TelegramBot.Message) => {
      await this.handleChannelPost(message);
    });

    // 监听编辑的消息
    this.bot.on('edited_message', async (message: TelegramBot.Message) => {
      await this.handleEditedMessage(message);
    });

    // 监听新的聊天成员
    this.bot.on('new_chat_members', async (message: TelegramBot.Message) => {
      await this.handleNewChatMembers(message);
    });

    // 监听离开的聊天成员
    this.bot.on('left_chat_member', async (message: TelegramBot.Message) => {
      await this.handleLeftChatMember(message);
    });
  }

  /**
   * 处理消息事件
   */
  private async handleMessage(message: TelegramBot.Message): Promise<void> {
    try {
      await this.messageProcessor.processMessage(message);
    } catch (error) {
      console.error('处理消息事件失败:', error);
      await this.logger.logBotActivity('error', 'message_event_error', `处理消息事件失败: ${error.message}`, {
        error: error.stack,
        messageId: message.message_id,
        chatId: message.chat.id
      });
    }
  }

  /**
   * 处理回调查询事件
   */
  private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    try {
      await this.messageProcessor.processCallbackQuery(callbackQuery);
    } catch (error) {
      console.error('处理回调查询事件失败:', error);
      await this.logger.logBotActivity('error', 'callback_event_error', `处理回调查询事件失败: ${error.message}`, {
        error: error.stack,
        callbackId: callbackQuery.id,
        data: callbackQuery.data
      });
    }
  }

  /**
   * 处理内联查询事件
   */
  private async handleInlineQuery(inlineQuery: TelegramBot.InlineQuery): Promise<void> {
    try {
      await this.logger.logBotActivity('debug', 'inline_query_received', `收到内联查询: ${inlineQuery.query}`, {
        queryId: inlineQuery.id,
        userId: inlineQuery.from.id,
        query: inlineQuery.query
      });

      // 这里可以添加内联查询的处理逻辑
      // 暂时返回空结果
      await this.bot.answerInlineQuery(inlineQuery.id, []);
    } catch (error) {
      console.error('处理内联查询事件失败:', error);
      await this.logger.logBotActivity('error', 'inline_query_error', `处理内联查询失败: ${error.message}`, {
        error: error.stack,
        queryId: inlineQuery.id
      });
    }
  }

  /**
   * 处理选择的内联结果
   */
  private async handleChosenInlineResult(chosenInlineResult: TelegramBot.ChosenInlineResult): Promise<void> {
    try {
      await this.logger.logBotActivity('debug', 'chosen_inline_result', `用户选择了内联结果: ${chosenInlineResult.result_id}`, {
        resultId: chosenInlineResult.result_id,
        userId: chosenInlineResult.from.id,
        query: chosenInlineResult.query
      });

      // 这里可以添加选择内联结果的处理逻辑
    } catch (error) {
      console.error('处理选择内联结果事件失败:', error);
      await this.logger.logBotActivity('error', 'chosen_inline_result_error', `处理选择内联结果失败: ${error.message}`, {
        error: error.stack,
        resultId: chosenInlineResult.result_id
      });
    }
  }

  /**
   * 处理频道帖子事件
   */
  private async handleChannelPost(message: TelegramBot.Message): Promise<void> {
    try {
      await this.logger.logBotActivity('debug', 'channel_post_received', `收到频道帖子`, {
        chatId: message.chat.id,
        messageId: message.message_id,
        chatTitle: message.chat.title
      });

      // 这里可以添加频道帖子的处理逻辑
    } catch (error) {
      console.error('处理频道帖子事件失败:', error);
      await this.logger.logBotActivity('error', 'channel_post_error', `处理频道帖子失败: ${error.message}`, {
        error: error.stack,
        messageId: message.message_id,
        chatId: message.chat.id
      });
    }
  }

  /**
   * 处理编辑的消息事件
   */
  private async handleEditedMessage(message: TelegramBot.Message): Promise<void> {
    try {
      await this.logger.logBotActivity('debug', 'edited_message_received', `收到编辑的消息`, {
        chatId: message.chat.id,
        messageId: message.message_id,
        userId: message.from?.id
      });

      // 这里可以添加编辑消息的处理逻辑
    } catch (error) {
      console.error('处理编辑消息事件失败:', error);
      await this.logger.logBotActivity('error', 'edited_message_error', `处理编辑消息失败: ${error.message}`, {
        error: error.stack,
        messageId: message.message_id,
        chatId: message.chat.id
      });
    }
  }

  /**
   * 处理新聊天成员事件
   */
  private async handleNewChatMembers(message: TelegramBot.Message): Promise<void> {
    try {
      const newMembers = message.new_chat_members || [];
      
      await this.logger.logBotActivity('info', 'new_chat_members', `新成员加入聊天`, {
        chatId: message.chat.id,
        newMembersCount: newMembers.length,
        newMembers: newMembers.map(member => ({
          id: member.id,
          username: member.username,
          first_name: member.first_name
        }))
      });

      // 这里可以添加欢迎新成员的逻辑
      for (const member of newMembers) {
        if (!member.is_bot) {
          // 只对非机器人成员发送欢迎消息
          await this.bot.sendMessage(message.chat.id, 
            `🎉 欢迎 ${member.first_name} 加入群组！\n\n使用 /help 了解如何使用机器人。`
          );
        }
      }
    } catch (error) {
      console.error('处理新聊天成员事件失败:', error);
      await this.logger.logBotActivity('error', 'new_chat_members_error', `处理新聊天成员失败: ${error.message}`, {
        error: error.stack,
        chatId: message.chat.id
      });
    }
  }

  /**
   * 处理离开聊天成员事件
   */
  private async handleLeftChatMember(message: TelegramBot.Message): Promise<void> {
    try {
      const leftMember = message.left_chat_member;
      
      if (!leftMember) {
        return;
      }

      await this.logger.logBotActivity('info', 'left_chat_member', `成员离开聊天`, {
        chatId: message.chat.id,
        leftMember: {
          id: leftMember.id,
          username: leftMember.username,
          first_name: leftMember.first_name
        }
      });

      // 这里可以添加成员离开的处理逻辑
      if (!leftMember.is_bot) {
        await this.bot.sendMessage(message.chat.id, 
          `👋 ${leftMember.first_name} 离开了群组。`
        );
      }
    } catch (error) {
      console.error('处理离开聊天成员事件失败:', error);
      await this.logger.logBotActivity('error', 'left_chat_member_error', `处理离开聊天成员失败: ${error.message}`, {
        error: error.stack,
        chatId: message.chat.id
      });
    }
  }

  /**
   * 更新消息处理器
   */
  updateMessageProcessor(messageProcessor: {
    processMessage: (message: TelegramBot.Message) => Promise<void>;
    processCallbackQuery: (callbackQuery: TelegramBot.CallbackQuery) => Promise<void>;
  }): void {
    this.messageProcessor = messageProcessor;
  }
}
