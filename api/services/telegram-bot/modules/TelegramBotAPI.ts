/**
 * Telegram机器人API调用模块
 * 负责处理所有与Telegram API相关的调用
 */
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';

export class TelegramBotAPI {
  constructor(
    private bot: TelegramBot,
    private config: { token: string },
    private logger: {
      logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
    }
  ) {}

  /**
   * 更新bot实例
   */
  updateBot(bot: TelegramBot): void {
    this.bot = bot;
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
    try {
      const result = await this.bot.sendMessage(chatId, message, options);
      await this.logger.logBotActivity('info', 'send_message', `发送消息到聊天 ${chatId}`, { 
        chatId, 
        messageLength: message.length,
        messageId: result.message_id 
      });
      return result;
    } catch (error) {
      await this.logger.logBotActivity('error', 'send_message_failed', `发送消息失败到聊天 ${chatId}: ${error.message}`, { 
        chatId, 
        error: error.stack 
      });
      throw error;
    }
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
      
      // 记录同步成功日志
      await this.logger.logBotActivity('info', 'commands_sync_success', `机器人命令菜单同步成功`, {
        commands,
        syncType: 'commands',
        commandCount: commands.length
      });
      
      return response;
    } catch (error) {
      console.error('❌ 设置命令菜单失败:', error);
      
      // 记录同步失败日志
      await this.logger.logBotActivity('error', 'commands_sync_failed', `机器人命令菜单同步失败: ${error.message}`, {
        commands,
        syncType: 'commands',
        error: error.message
      });
      
      // 不抛出错误，避免影响数据库更新
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
      
      // 记录同步成功日志
      await this.logger.logBotActivity('info', 'name_sync_success', `机器人名称同步成功: ${name}`, {
        name,
        syncType: 'name'
      });
      
      return true;
    } catch (error) {
      console.error('❌ 同步机器人名称失败:', error);
      
      // 记录同步失败日志
      await this.logger.logBotActivity('error', 'name_sync_failed', `机器人名称同步失败: ${error.message}`, {
        name,
        syncType: 'name',
        error: error.message
      });
      
      // 不抛出错误，避免影响数据库更新
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
      
      // 记录同步成功日志
      await this.logger.logBotActivity('info', 'description_sync_success', `机器人描述同步成功: ${description}`, {
        description,
        syncType: 'description'
      });
      
      return true;
    } catch (error) {
      console.error('❌ 同步机器人描述失败:', error);
      
      // 记录同步失败日志
      await this.logger.logBotActivity('error', 'description_sync_failed', `机器人描述同步失败: ${error.message}`, {
        description,
        syncType: 'description',
        error: error.message
      });
      
      // 不抛出错误，避免影响数据库更新
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
   * 从Telegram同步机器人信息到数据库
   */
  async syncFromTelegram(
    initContext: {
      initializeFromDatabase: () => Promise<void>;
    }
  ): Promise<{
    success: boolean;
    data?: {
      name: string | null;
      description: string | null;
      commands: TelegramBot.BotCommand[] | null;
      botInfo: any;
    };
    error?: string;
  }> {
    try {
      // 检查机器人是否已初始化
      if (!this.bot) {
        // 尝试重新初始化机器人
        console.log('机器人未初始化，尝试重新初始化...');
        try {
          await initContext.initializeFromDatabase();
          if (!this.bot) {
            return {
              success: false,
              error: '机器人初始化失败，请检查Token是否有效'
            };
          }
        } catch (initError) {
          console.error('重新初始化机器人失败:', initError);
          return {
            success: false,
            error: `机器人初始化失败: ${initError.message}`
          };
        }
      }

      // 获取机器人基本信息
      const botInfo = await this.getBotInfo();
      
      // 获取机器人名称
      const name = await this.getMyName();
      
      // 获取机器人描述
      const description = await this.getMyDescription();
      
      // 获取机器人命令列表
      const commands = await this.getMyCommands();

      console.log('✅ 从Telegram获取机器人信息成功:', {
        botInfo: { id: botInfo.id, username: botInfo.username, first_name: botInfo.first_name },
        name,
        description,
        commands: commands?.length || 0
      });

      return {
        success: true,
        data: {
          name,
          description,
          commands,
          botInfo
        }
      };
    } catch (error) {
      console.error('从Telegram同步机器人信息失败:', error);
      
      // 提供更详细的错误信息
      let errorMessage = error.message;
      if (error.code === 'ETELEGRAM') {
        if (error.response?.body?.error_code === 401) {
          errorMessage = 'Bot Token无效，请检查Token是否正确';
        } else if (error.response?.body?.description) {
          errorMessage = `Telegram API错误: ${error.response.body.description}`;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
