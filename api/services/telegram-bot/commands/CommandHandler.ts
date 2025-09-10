/**
 * Telegram机器人命令处理器
 * 处理各种用户命令（/start, /menu, /help等）
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../config/database.js';
import { orderService } from '../../order.js';
import { UserService } from '../../user.js';

export class CommandHandler {
  private bot: TelegramBot;
  private userService: UserService;
  private orderService: typeof orderService;

  constructor(bot: TelegramBot) {
    this.bot = bot;
    this.userService = new UserService();
    this.orderService = orderService;
  }

  /**
   * 获取活跃机器人配置
   */
  private async getActiveBotConfig(): Promise<any> {
    try {
      const result = await query(
        'SELECT welcome_message, help_message, keyboard_config FROM telegram_bots WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
      );
      
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
    
    if (!telegramUser) {
      await this.bot.sendMessage(chatId, '❌ 无法获取用户信息，请重试。');
      return;
    }

    try {
      // 注册或获取用户
      const user = await UserService.registerTelegramUser({
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        language_code: telegramUser.language_code
      });

      // 获取机器人配置
      const botConfig = await this.getActiveBotConfig();
      
      // 使用配置的欢迎消息，如果没有配置则使用默认消息
      let welcomeMessage = botConfig?.welcome_message || `🎉 欢迎使用TRON能量租赁机器人！

👋 你好，${telegramUser.first_name}！

🔋 我们提供快速、安全的TRON能量租赁服务：
• 💰 超低价格，性价比最高
• ⚡ 秒级到账，即买即用
• 🛡️ 安全可靠，无需私钥
• 🎯 多种套餐，满足不同需求

📱 使用 /menu 查看主菜单
❓ 使用 /help 获取帮助`;

      // 替换用户名占位符
      welcomeMessage = welcomeMessage.replace('{first_name}', telegramUser.first_name || '用户');

      // 构建内嵌键盘
      let messageOptions: any = {};
      
      if (botConfig?.keyboard_config?.main_menu?.is_enabled) {
        const keyboardConfig = botConfig.keyboard_config.main_menu;
        
        if (keyboardConfig.rows && keyboardConfig.rows.length > 0) {
          const inlineKeyboard = keyboardConfig.rows
            .filter(row => row.is_enabled)
            .map(row => 
              row.buttons
                .filter(button => button.is_enabled)
                .map(button => ({
                  text: button.text,
                  callback_data: button.callback_data
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

      await this.bot.sendMessage(chatId, welcomeMessage, messageOptions);
      
      return;
    } catch (error) {
      console.error('Error in handleStartCommand:', error);
      await this.bot.sendMessage(chatId, '❌ 注册失败，请重试。');
    }
  }

  /**
   * 处理 /menu 命令
   */
  async handleMenuCommand(msg: TelegramBot.Message): Promise<void> {
    // 这个方法需要调用键盘构建器来显示菜单
    // 在主服务中会被重写
    const chatId = msg.chat.id;
    await this.bot.sendMessage(chatId, '📱 主菜单正在加载...');
  }

  /**
   * 处理 /help 命令
   */
  async handleHelpCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    
    try {
      // 获取机器人配置
      const botConfig = await this.getActiveBotConfig();
      
      // 使用配置的帮助消息，如果没有配置则使用默认消息
      const helpMessage = botConfig?.help_message || `📖 TRON能量租赁机器人使用指南

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

      await this.bot.sendMessage(chatId, helpMessage);
    } catch (error) {
      console.error('Error in handleHelpCommand:', error);
      await this.bot.sendMessage(chatId, '❌ 获取帮助信息失败，请重试。');
    }
  }

  /**
   * 处理 /balance 命令
   */
  async handleBalanceCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    
    if (!telegramId) {
      await this.bot.sendMessage(chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      const user = await UserService.getUserByTelegramId(telegramId);
      if (!user) {
        await this.bot.sendMessage(chatId, '❌ 用户不存在，请先使用 /start 注册');
        return;
      }

      const balanceMessage = `💰 账户余额信息

💵 USDT余额: ${user.usdt_balance || 0} USDT
🔴 TRX余额: ${user.trx_balance || 0} TRX
📊 总订单数: ${user.total_orders || 0}
💸 总消费: ${user.total_spent || 0} USDT
⚡ 总能量使用: ${user.total_energy_used || 0} Energy`;

      await this.bot.sendMessage(chatId, balanceMessage);
    } catch (error) {
      console.error('Error in handleBalanceCommand:', error);
      await this.bot.sendMessage(chatId, '❌ 获取余额信息失败，请重试。');
    }
  }

  /**
   * 处理 /orders 命令
   */
  async handleOrdersCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    
    if (!telegramId) {
      await this.bot.sendMessage(chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      const user = await UserService.getUserByTelegramId(telegramId);
      if (!user) {
        await this.bot.sendMessage(chatId, '❌ 用户不存在，请先使用 /start 注册');
        return;
      }

      const orders = await this.orderService.getUserOrders(parseInt(user.id), 5); // 获取最近5个订单
      
      if (!orders || orders.length === 0) {
        await this.bot.sendMessage(chatId, '📋 暂无订单记录');
        return;
      }

      let ordersMessage = '📋 最近订单记录\n\n';
      
      orders.forEach((order, index) => {
        const statusEmoji = this.getOrderStatusEmoji(order.status);
        
        ordersMessage += `${index + 1}️⃣ 订单 #${order.id}\n` +
          `⚡ 能量: ${order.energy_amount} Energy\n` +
          `💰 金额: ${order.price_trx} TRX\n` +
          `${statusEmoji} 状态: ${order.status}\n` +
          `📅 时间: ${new Date(order.created_at).toLocaleString('zh-CN')}\n\n`;
      });

      await this.bot.sendMessage(chatId, ordersMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in handleOrdersCommand:', error);
      await this.bot.sendMessage(chatId, '❌ 获取订单信息失败，请重试。');
    }
  }

  /**
   * 获取订单状态对应的表情符号
   */
  private getOrderStatusEmoji(status: string): string {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'paid':
        return '💳';
      case 'processing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '🚫';
      default:
        return '❓';
    }
  }

  /**
   * 统一的命令处理方法
   */
  async handleCommand(message: TelegramBot.Message): Promise<boolean> {
    if (!message.text || !message.text.startsWith('/')) {
      return false; // 不是命令
    }

    const command = message.text.split(' ')[0].toLowerCase();
    
    try {
      switch (command) {
        case '/start':
          await this.handleStartCommand(message);
          return true;
        case '/menu':
          await this.handleMenuCommand(message);
          return true;
        case '/help':
          await this.handleHelpCommand(message);
          return true;
        case '/orders':
          await this.handleOrdersCommand(message);
          return true;
        case '/balance':
          await this.handleBalanceCommand(message);
          return true;
        default:
          return false; // 未知命令
      }
    } catch (error) {
      console.error(`处理命令 ${command} 失败:`, error);
      return false;
    }
  }

  /**
   * 注册所有命令处理器
   */
  registerCommands(): void {
    // /start 命令
    this.bot.onText(/\/start/, async (msg) => {
      try {
        await this.handleStartCommand(msg);
      } catch (error) {
        console.error('Error handling /start command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });

    // /menu 命令
    this.bot.onText(/\/menu/, async (msg) => {
      try {
        await this.handleMenuCommand(msg);
      } catch (error) {
        console.error('Error handling /menu command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });

    // /help 命令
    this.bot.onText(/\/help/, async (msg) => {
      try {
        await this.handleHelpCommand(msg);
      } catch (error) {
        console.error('Error handling /help command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });

    // /balance 命令
    this.bot.onText(/\/balance/, async (msg) => {
      try {
        await this.handleBalanceCommand(msg);
      } catch (error) {
        console.error('Error handling /balance command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });

    // /orders 命令
    this.bot.onText(/\/orders/, async (msg) => {
      try {
        await this.handleOrdersCommand(msg);
      } catch (error) {
        console.error('Error handling /orders command:', error);
        await this.bot.sendMessage(msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });
  }
}
