/**
 * 数据库键盘配置管理器
 * 负责管理从数据库读取的键盘配置
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../config/database.js';

export class DatabaseKeyboardManager {
  private bot: TelegramBot;
  private botId: string;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
  }

  /**
   * 从数据库获取机器人键盘配置
   */
  async getBotKeyboardConfig(): Promise<any> {
    try {
      const result = await query(
        'SELECT keyboard_config FROM telegram_bots WHERE id = $1',
        [this.botId]
      );
      
      if (result.rows.length > 0 && result.rows[0].keyboard_config) {
        return result.rows[0].keyboard_config;
      }
      
      return null;
    } catch (error) {
      console.error('获取机器人键盘配置失败:', error);
      return null;
    }
  }

  /**
   * 显示主菜单（支持从数据库配置读取）
   */
  async showMainMenuFromConfig(chatId: number, defaultKeyboard: any): Promise<void> {
    try {
      console.log(`\n🏠 准备显示主菜单 - Bot ID: ${this.botId}`);
      
      // 从数据库获取键盘配置
      const keyboardConfig = await this.getBotKeyboardConfig();
      
      if (keyboardConfig && keyboardConfig.main_menu && keyboardConfig.main_menu.is_enabled) {
        console.log(`📋 使用数据库键盘配置，类型: ${keyboardConfig.main_menu.type}`);
        
        const menuTitle = keyboardConfig.main_menu.title || '🏠 主菜单';
        const menuDescription = keyboardConfig.main_menu.description || '请选择您需要的服务：';
        const menuMessage = `${menuTitle}\n\n${menuDescription}`;
        
        // 根据配置类型发送对应的键盘
        if (keyboardConfig.main_menu.type === 'reply') {
          console.log(`📱 发送ReplyKeyboard（回复键盘）`);
          
          const replyKeyboard = this.buildReplyKeyboard(keyboardConfig);
          
          await this.bot.sendMessage(chatId, menuMessage, {
            reply_markup: replyKeyboard,
            parse_mode: 'Markdown'
          });
          
          console.log(`✅ ReplyKeyboard已发送，行数: ${replyKeyboard.keyboard.length}`);
          
        } else {
          // 默认使用inline类型
          console.log(`📋 发送InlineKeyboard（内嵌键盘）`);
          
          const inlineKeyboard = this.buildInlineKeyboardFromConfig(keyboardConfig);
          
          await this.bot.sendMessage(chatId, menuMessage, {
            reply_markup: inlineKeyboard,
            parse_mode: 'Markdown'
          });
          
          console.log(`✅ InlineKeyboard已发送，行数: ${inlineKeyboard.inline_keyboard.length}`);
        }
        
      } else {
        console.log(`⚠️ 未找到键盘配置或配置未启用，使用默认InlineKeyboard`);
        
        // 使用默认的硬编码键盘
        const menuMessage = '🏠 主菜单\n\n请选择您需要的服务：';

        await this.bot.sendMessage(chatId, menuMessage, {
          reply_markup: defaultKeyboard,
          parse_mode: 'Markdown'
        });
        
        console.log(`✅ 默认InlineKeyboard已发送`);
      }
      
    } catch (error) {
      console.error('显示主菜单失败:', error);
      
      // 发送错误消息
      await this.bot.sendMessage(chatId, '❌ 菜单加载失败，请稍后重试。');
    }
  }

  /**
   * 构建ReplyKeyboard（回复键盘）
   */
  private buildReplyKeyboard(config: any): TelegramBot.ReplyKeyboardMarkup {
    const keyboardRows: TelegramBot.KeyboardButton[][] = [];
    
    if (config.main_menu && config.main_menu.rows) {
      config.main_menu.rows.forEach((row: any) => {
        if (row.is_enabled && row.buttons) {
          const buttonRow: TelegramBot.KeyboardButton[] = [];
          
          row.buttons.forEach((button: any) => {
            if (button.is_enabled) {
              buttonRow.push({
                text: button.text
              });
            }
          });
          
          if (buttonRow.length > 0) {
            keyboardRows.push(buttonRow);
          }
        }
      });
    }
    
    return {
      keyboard: keyboardRows,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: false
    };
  }

  /**
   * 构建InlineKeyboard（内嵌键盘）
   */
  private buildInlineKeyboardFromConfig(config: any): any {
    const keyboardRows: TelegramBot.InlineKeyboardButton[][] = [];
    
    if (config.main_menu && config.main_menu.rows) {
      config.main_menu.rows.forEach((row: any) => {
        if (row.is_enabled && row.buttons) {
          const buttonRow: TelegramBot.InlineKeyboardButton[] = [];
          
          row.buttons.forEach((button: any) => {
            if (button.is_enabled) {
              buttonRow.push({
                text: button.text,
                callback_data: button.callback_data || `action_${Date.now()}`
              });
            }
          });
          
          if (buttonRow.length > 0) {
            keyboardRows.push(buttonRow);
          }
        }
      });
    }
    
    return {
      inline_keyboard: keyboardRows
    };
  }
}