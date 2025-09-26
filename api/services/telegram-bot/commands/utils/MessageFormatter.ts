/**
 * 消息格式化工具
 */
import TelegramBot from 'node-telegram-bot-api';
import type { BotConfig, MessageOptions } from '../types/command.types.ts';

export class MessageFormatter {
  /**
   * 安全地发送消息
   */
  static async safeSendMessage(
    bot: TelegramBot, 
    chatId: number, 
    text: string, 
    options?: MessageOptions
  ): Promise<boolean> {
    try {
      if (!bot) {
        console.error('Bot instance is null or undefined');
        return false;
      }

      if (typeof bot.sendMessage !== 'function') {
        console.error('Bot sendMessage method is not available');
        return false;
      }

      await bot.sendMessage(chatId, text, options);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * 构建键盘配置
   */
  static buildKeyboardFromConfig(botConfig: BotConfig): MessageOptions {
    const messageOptions: MessageOptions = {};
    
    if (botConfig?.keyboard_config?.main_menu?.is_enabled) {
      const keyboardConfig = botConfig.keyboard_config.main_menu;
      
      if (keyboardConfig.rows && keyboardConfig.rows.length > 0) {
        const enabledRows = keyboardConfig.rows
          .filter(row => row.is_enabled)
          .map(row => 
            row.buttons
              .filter(button => button.is_enabled)
              .map(button => button.text)
          )
          .filter(row => row.length > 0);
        
        if (enabledRows.length > 0) {
          // 根据键盘类型构建不同的键盘
          if (keyboardConfig.type === 'reply') {
            messageOptions.reply_markup = {
              keyboard: enabledRows,
              resize_keyboard: true,
              one_time_keyboard: false
            };
          } else {
            // 内嵌键盘
            const inlineKeyboard = keyboardConfig.rows
              .filter(row => row.is_enabled)
              .map(row => 
                row.buttons
                  .filter(button => button.is_enabled)
                  .map(button => ({
                    text: button.text,
                    callback_data: button.callback_data || button.text
                  }))
              )
              .filter(row => row.length > 0);
            
            if (inlineKeyboard.length > 0) {
              messageOptions.reply_markup = {
                inline_keyboard: inlineKeyboard
              };
            }
          }
        }
      }
    }
    
    return messageOptions;
  }

  /**
   * 格式化数字显示
   */
  static formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * 格式化日期显示
   */
  static formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('zh-CN');
  }

  /**
   * 获取订单状态对应的表情符号
   */
  static getOrderStatusEmoji(status: string): string {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'paid':
        return '💳';
      case 'processing':
        return '🔄';
      case 'active':
        return '🟢';
      case 'completed':
        return '✅';
      case 'manually_completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '🚫';
      case 'expired':
        return '⏰';
      case 'pending_delegation':
        return '⏸️';
      default:
        return '❓';
    }
  }

  /**
   * 创建默认欢迎消息
   */
  static createDefaultWelcomeMessage(): string {
    return `🎉 欢迎使用TRON能量租赁机器人！

👋 你好，{first_name}！

🔋 我们提供快速、安全的TRON能量租赁服务：
• 💰 超低价格，性价比最高
• ⚡ 秒级到账，即买即用
• 🛡️ 安全可靠，无需私钥
• 🎯 多种套餐，满足不同需求

📱 使用 /menu 查看主菜单
❓ 使用 /help 获取帮助`;
  }

  /**
   * 创建默认帮助消息
   */
  static createDefaultHelpMessage(): string {
    return `📖 TRON能量租赁机器人使用指南

🤖 基础命令：
• /start - 启动机器人
• /menu - 显示主菜单
• /help - 显示帮助信息
• /balance - 查询账户余额
• /orders - 查看订单历史

🔋 能量租赁流程：
1️⃣ 选择能量套餐
2️⃣ 输入接收地址
3️⃣ 确认订单信息
4️⃣ 完成支付
5️⃣ 等待能量到账

💡 注意事项：
• 请确保TRON地址正确
• 支付后请耐心等待确认
• 能量有效期为24小时

🆘 如需帮助，请联系客服`;
  }
}
