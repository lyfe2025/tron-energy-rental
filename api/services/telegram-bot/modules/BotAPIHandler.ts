/**
 * 机器人API处理模块
 * 负责与Telegram Bot API的交互
 */
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';
import type { BotConfig } from '../types/bot.types.js';

export class BotAPIHandler {
  private bot: TelegramBot;
  private config: BotConfig;

  constructor(bot: TelegramBot, config: BotConfig) {
    this.bot = bot;
    this.config = config;
  }

  /**
   * 调用Telegram Bot API的通用方法
   */
  private async callTelegramAPI(method: string, params: any = {}): Promise<any> {
    if (!this.config.token || this.config.token === 'temp-token') {
      throw new Error('Bot Token无效');
    }

    const url = `https://api.telegram.org/bot${this.config.token}/${method}`;
    
    try {
      const response = await axios.post(url, params, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10秒超时
      });

      if (response.data.ok) {
        return response.data.result;
      } else {
        throw new Error(`Telegram API错误: ${response.data.description || '未知错误'}`);
      }
    } catch (error: any) {
      if (error.response) {
        // HTTP错误响应
        const errorData = error.response.data;
        throw new Error(`Telegram API错误 (${error.response.status}): ${errorData.description || error.message}`);
      } else if (error.request) {
        // 网络错误
        throw new Error('网络错误: 无法连接到Telegram API');
      } else {
        // 其他错误
        throw error;
      }
    }
  }

  /**
   * 获取机器人信息
   */
  async getBotInfo(): Promise<TelegramBot.User> {
    return await this.bot.getMe();
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId: number, message: string, options?: TelegramBot.SendMessageOptions): Promise<TelegramBot.Message> {
    return await this.bot.sendMessage(chatId, message, options);
  }

  /**
   * 发送照片
   */
  async sendPhoto(chatId: number, photo: string | Buffer, options?: TelegramBot.SendPhotoOptions): Promise<TelegramBot.Message> {
    return await this.bot.sendPhoto(chatId, photo, options);
  }

  /**
   * 发送文档
   */
  async sendDocument(chatId: number, document: string | Buffer, options?: TelegramBot.SendDocumentOptions): Promise<TelegramBot.Message> {
    return await this.bot.sendDocument(chatId, document, options);
  }

  /**
   * 编辑消息
   */
  async editMessageText(text: string, options: TelegramBot.EditMessageTextOptions): Promise<TelegramBot.Message | boolean> {
    return await this.bot.editMessageText(text, options);
  }

  /**
   * 删除消息
   */
  async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
    return await this.bot.deleteMessage(chatId, messageId);
  }

  /**
   * 回答回调查询
   */
  async answerCallbackQuery(callbackQueryId: string, options?: TelegramBot.AnswerCallbackQueryOptions): Promise<boolean> {
    return await this.bot.answerCallbackQuery(callbackQueryId, options);
  }

  /**
   * 设置机器人命令菜单
   */
  async setMyCommands(commands: TelegramBot.BotCommand[]): Promise<boolean> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，跳过命令菜单同步');
        return false;
      }
      
      const response = await this.bot.setMyCommands(commands);
      console.log('✅ 命令菜单已设置');
      return response;
    } catch (error) {
      console.error('❌ 设置命令菜单失败:', error);
      return false;
    }
  }

  /**
   * 设置机器人名称
   */
  async setMyName(name: string): Promise<boolean> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，跳过名称同步');
        return false;
      }
      
      await this.callTelegramAPI('setMyName', { name });
      console.log(`✅ 机器人名称已同步到Telegram: ${name}`);
      return true;
    } catch (error) {
      console.error('❌ 同步机器人名称失败:', error);
      return false;
    }
  }

  /**
   * 设置机器人描述
   */
  async setMyDescription(description: string): Promise<boolean> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，跳过描述同步');
        return false;
      }
      
      await this.callTelegramAPI('setMyDescription', { description });
      console.log(`✅ 机器人描述已同步到Telegram: ${description}`);
      return true;
    } catch (error) {
      console.error('❌ 同步机器人描述失败:', error);
      return false;
    }
  }

  /**
   * 从Telegram获取机器人名称
   */
  async getMyName(): Promise<string | null> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，无法获取名称');
        return null;
      }
      
      const response = await this.callTelegramAPI('getMyName');
      return response.name || null;
    } catch (error) {
      console.error('获取机器人名称失败:', error);
      return null;
    }
  }

  /**
   * 从Telegram获取机器人描述
   */
  async getMyDescription(): Promise<string | null> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，无法获取描述');
        return null;
      }
      
      const response = await this.callTelegramAPI('getMyDescription');
      return response.description || null;
    } catch (error) {
      console.error('获取机器人描述失败:', error);
      return null;
    }
  }

  /**
   * 从Telegram获取机器人命令列表
   */
  async getMyCommands(): Promise<TelegramBot.BotCommand[] | null> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        console.warn('⚠️ 机器人未初始化，无法获取命令列表');
        return null;
      }
      
      const commands = await this.bot.getMyCommands();
      return commands;
    } catch (error) {
      console.error('获取机器人命令列表失败:', error);
      return null;
    }
  }

  /**
   * 设置Webhook
   */
  async setWebhook(url: string, options?: TelegramBot.SetWebHookOptions): Promise<boolean> {
    return await this.bot.setWebHook(url, options);
  }

  /**
   * 获取Webhook信息
   */
  async getWebhookInfo(): Promise<TelegramBot.WebhookInfo> {
    return await this.bot.getWebHookInfo();
  }

  /**
   * 删除Webhook
   */
  async deleteWebhook(): Promise<boolean> {
    return await this.bot.deleteWebHook();
  }

  /**
   * 设置Webhook（仅webhook模式）
   */
  async setWebhookUrl(url: string, options?: {
    secret?: string;
    maxConnections?: number;
    allowedUpdates?: string[];
  }): Promise<boolean> {
    if (!this.bot) {
      throw new Error('机器人实例未初始化');
    }
    
    const webhookOptions: any = {
      max_connections: options?.maxConnections || 40,
      allowed_updates: options?.allowedUpdates || ['message', 'callback_query'],
      drop_pending_updates: true
    };
    
    if (options?.secret) {
      webhookOptions.secret_token = options.secret;
    }
    
    return await this.bot.setWebHook(url, webhookOptions);
  }
}
