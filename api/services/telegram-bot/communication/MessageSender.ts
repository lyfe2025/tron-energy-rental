/**
 * 消息发送器
 * 负责所有类型的消息发送功能，包括文本、图片、文档等
 */
import TelegramBot from 'node-telegram-bot-api';
import { DatabaseAdapter } from '../integrated/adapters/DatabaseAdapter.js';

export interface MessageResult {
  success: boolean;
  message?: TelegramBot.Message;
  error?: string;
}

export interface MessageOptions {
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  reply_markup?: TelegramBot.InlineKeyboardMarkup | TelegramBot.ReplyKeyboardMarkup;
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  reply_to_message_id?: number;
}

export class MessageSender {
  private bot: TelegramBot;
  private databaseAdapter: DatabaseAdapter;
  private botId: string | null = null;

  constructor(bot: TelegramBot, botId?: string) {
    this.bot = bot;
    this.databaseAdapter = DatabaseAdapter.getInstance();
    this.botId = botId || null;
  }

  /**
   * 设置机器人 ID（用于统计和日志）
   */
  setBotId(botId: string): void {
    this.botId = botId;
  }

  /**
   * 发送文本消息
   */
  async sendMessage(
    chatId: number, 
    text: string, 
    options?: MessageOptions
  ): Promise<MessageResult> {
    try {
      const result = await this.bot.sendMessage(chatId, text, options);
      
      // 记录活动
      await this.updateActivity();
      
      return {
        success: true,
        message: result
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送消息失败'
      };
    }
  }

  /**
   * 发送照片
   */
  async sendPhoto(
    chatId: number, 
    photo: string | Buffer, 
    options?: TelegramBot.SendPhotoOptions
  ): Promise<MessageResult> {
    try {
      const result = await this.bot.sendPhoto(chatId, photo, options);
      await this.updateActivity();
      
      return {
        success: true,
        message: result
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送照片失败'
      };
    }
  }

  /**
   * 发送文档
   */
  async sendDocument(
    chatId: number, 
    document: string | Buffer, 
    options?: TelegramBot.SendDocumentOptions
  ): Promise<MessageResult> {
    try {
      const result = await this.bot.sendDocument(chatId, document, options);
      await this.updateActivity();
      
      return {
        success: true,
        message: result
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送文档失败'
      };
    }
  }

  /**
   * 发送音频
   */
  async sendAudio(
    chatId: number, 
    audio: string | Buffer, 
    options?: TelegramBot.SendAudioOptions
  ): Promise<MessageResult> {
    try {
      const result = await this.bot.sendAudio(chatId, audio, options);
      await this.updateActivity();
      
      return {
        success: true,
        message: result
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送音频失败'
      };
    }
  }

  /**
   * 发送视频
   */
  async sendVideo(
    chatId: number, 
    video: string | Buffer, 
    options?: TelegramBot.SendVideoOptions
  ): Promise<MessageResult> {
    try {
      const result = await this.bot.sendVideo(chatId, video, options);
      await this.updateActivity();
      
      return {
        success: true,
        message: result
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送视频失败'
      };
    }
  }

  /**
   * 发送贴纸
   */
  async sendSticker(
    chatId: number, 
    sticker: string | Buffer, 
    options?: TelegramBot.SendStickerOptions
  ): Promise<MessageResult> {
    try {
      const result = await this.bot.sendSticker(chatId, sticker, options);
      await this.updateActivity();
      
      return {
        success: true,
        message: result
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送贴纸失败'
      };
    }
  }

  /**
   * 发送位置
   */
  async sendLocation(
    chatId: number, 
    latitude: number, 
    longitude: number, 
    options?: TelegramBot.SendLocationOptions
  ): Promise<MessageResult> {
    try {
      const result = await this.bot.sendLocation(chatId, latitude, longitude, options);
      await this.updateActivity();
      
      return {
        success: true,
        message: result
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送位置失败'
      };
    }
  }

  /**
   * 编辑消息文本
   */
  async editMessageText(
    text: string, 
    options?: TelegramBot.EditMessageTextOptions
  ): Promise<MessageResult> {
    try {
      const result = await this.bot.editMessageText(text, options);
      await this.updateActivity();
      
      return {
        success: true,
        message: result as TelegramBot.Message
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '编辑消息失败'
      };
    }
  }

  /**
   * 编辑消息回复标记
   */
  async editMessageReplyMarkup(
    options?: TelegramBot.EditMessageReplyMarkupOptions
  ): Promise<MessageResult> {
    try {
      const result = await this.bot.editMessageReplyMarkup(
        options?.reply_markup,
        options
      );
      await this.updateActivity();
      
      return {
        success: true,
        message: result as TelegramBot.Message
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '编辑消息标记失败'
      };
    }
  }

  /**
   * 删除消息
   */
  async deleteMessage(chatId: number, messageId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.bot.deleteMessage(chatId, messageId);
      await this.updateActivity();
      
      return { success: result };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除消息失败'
      };
    }
  }

  /**
   * 回答回调查询
   */
  async answerCallbackQuery(
    callbackQueryId: string, 
    options?: TelegramBot.AnswerCallbackQueryOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.bot.answerCallbackQuery(callbackQueryId, options);
      await this.updateActivity();
      
      return { success: result };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '回答回调查询失败'
      };
    }
  }

  /**
   * 转发消息
   */
  async forwardMessage(
    chatId: number, 
    fromChatId: number, 
    messageId: number, 
    options?: TelegramBot.ForwardMessageOptions
  ): Promise<MessageResult> {
    try {
      const result = await this.bot.forwardMessage(chatId, fromChatId, messageId, options);
      await this.updateActivity();
      
      return {
        success: true,
        message: result
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '转发消息失败'
      };
    }
  }

  /**
   * 复制消息
   */
  async copyMessage(
    chatId: number, 
    fromChatId: number, 
    messageId: number, 
    options?: TelegramBot.CopyMessageOptions
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      const result = await this.bot.copyMessage(chatId, fromChatId, messageId, options);
      await this.updateActivity();
      
      return {
        success: true,
        messageId: result.message_id
      };
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '复制消息失败'
      };
    }
  }

  /**
   * 批量发送消息
   */
  async sendBulkMessages(
    messages: Array<{ chatId: number; text: string; options?: MessageOptions }>
  ): Promise<Array<MessageResult>> {
    const results: MessageResult[] = [];
    
    for (const message of messages) {
      const result = await this.sendMessage(message.chatId, message.text, message.options);
      results.push(result);
      
      // 添加小延迟以避免速率限制
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return results;
  }

  /**
   * 获取发送统计
   */
  getStats(): { botId: string | null; totalSent: number; totalErrors: number } {
    // 这里可以添加内存中的统计计数器
    return {
      botId: this.botId,
      totalSent: 0, // TODO: 实现统计计数器
      totalErrors: 0
    };
  }

  /**
   * 更新活动记录
   */
  private async updateActivity(): Promise<void> {
    if (this.botId) {
      try {
        await this.databaseAdapter.updateLastActivity(this.botId);
        await this.databaseAdapter.incrementMessageCount(this.botId);
      } catch (error) {
        console.error('更新活动记录失败:', error);
      }
    }
  }

  /**
   * 记录错误
   */
  private async recordError(): Promise<void> {
    if (this.botId) {
      try {
        await this.databaseAdapter.incrementErrorCount(this.botId);
      } catch (error) {
        console.error('记录错误失败:', error);
      }
    }
  }
}
