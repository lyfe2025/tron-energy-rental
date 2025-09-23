/**
 * Stats命令处理器
 * 处理统计相关命令，如余额查询、用户统计等
 */
import TelegramBot from 'node-telegram-bot-api';
import { UserService } from '../../../user.ts';
import { CommandValidator } from '../middleware/CommandValidator.ts';
import { UserContextManager } from '../middleware/UserContextManager.ts';
import type { CommandHandlerDependencies } from '../types/command.types.ts';
import { MessageFormatter } from '../utils/MessageFormatter.ts';

export class StatsCommandHandler {
  private bot: TelegramBot;
  private userService: UserService;
  private orderService: typeof import('../../../order.ts').orderService;

  constructor(dependencies: CommandHandlerDependencies) {
    this.bot = dependencies.bot;
    this.userService = dependencies.userService;
    this.orderService = dependencies.orderService;
  }

  /**
   * 处理 /balance 命令
   */
  async handleBalanceCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    
    if (!CommandValidator.validateChatInfo(chatId) || !CommandValidator.validateUserInfo(msg.from)) {
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      // 更新用户上下文
      UserContextManager.createOrUpdateContext(msg);
      UserContextManager.setCurrentCommand(telegramId!, '/balance');

      const user = await UserService.getUserByTelegramId(telegramId!);
      if (!user) {
        await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 用户不存在，请先使用 /start 注册');
        return;
      }

      await this.sendUserBalance(chatId, user);
    } catch (error) {
      console.error('Error in handleBalanceCommand:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取余额信息失败，请重试。');
    }
  }

  /**
   * 处理账户余额按钮
   */
  async handleBalanceButton(msg: TelegramBot.Message): Promise<void> {
    await this.handleBalanceCommand(msg);
  }

  /**
   * 处理账户余额回调
   */
  async handleBalanceCallback(chatId: number, telegramId?: number): Promise<void> {
    if (!CommandValidator.validateUserInfo({ id: telegramId } as any)) {
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      const user = await UserService.getUserByTelegramId(telegramId!);
      if (!user) {
        await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 用户不存在，请先使用 /start 注册');
        return;
      }

      await this.sendUserBalance(chatId, user, true); // 包含回调按钮
    } catch (error) {
      console.error('Error in handleBalanceCallback:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取余额信息失败，请重试。');
    }
  }

  /**
   * 发送用户余额信息
   */
  private async sendUserBalance(chatId: number, user: any, includeButtons: boolean = false): Promise<void> {
    try {
      // 获取用户统计信息
      const stats = await this.getUserStats(user.id);

      const balanceMessage = `💰 账户余额信息

👤 **用户信息**
• 用户ID: ${user.id}
• Telegram ID: ${user.telegram_id}
• 用户名: ${user.username || '未设置'}
• 注册时间: ${MessageFormatter.formatDate(user.created_at)}

💵 **余额信息**
• USDT余额: ${user.usdt_balance || 0} USDT
• TRX余额: ${user.trx_balance || 0} TRX
• 账户状态: ${this.getAccountStatus(user.status)}

📊 **统计信息**
• 总订单数: ${stats.totalOrders}
• 已完成订单: ${stats.completedOrders}
• 总消费: ${stats.totalSpent} TRX
• 总能量使用: ${MessageFormatter.formatNumber(stats.totalEnergyUsed)} Energy
• 最后订单: ${stats.lastOrderDate || '无'}

${user.tron_address ? `📍 **TRON地址**: \`${user.tron_address}\`` : '⚠️ **TRON地址**: 未设置'}`;

      let messageOptions: any = { parse_mode: 'Markdown' };

      if (includeButtons) {
        const keyboard = {
          inline_keyboard: [
            [
              { text: '🔄 刷新余额', callback_data: 'check_balance' },
              { text: '📋 我的订单', callback_data: 'my_orders' }
            ],
            [
              { text: '⚡ 购买能量', callback_data: 'buy_energy' },
              { text: '📱 返回主菜单', callback_data: 'refresh_menu' }
            ]
          ]
        };
        messageOptions.reply_markup = keyboard;
      }

      await MessageFormatter.safeSendMessage(this.bot, chatId, balanceMessage, messageOptions);
    } catch (error) {
      console.error('Error sending user balance:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  private async getUserStats(userId: string): Promise<any> {
    try {
      // 获取订单统计
      const orders = await this.orderService.getUserOrders(parseInt(userId), 1000); // 获取所有订单进行统计
      
      const stats = {
        totalOrders: orders?.length || 0,
        completedOrders: orders?.filter(order => order.status === 'completed').length || 0,
        totalSpent: orders?.reduce((sum, order) => sum + (order.price_trx || 0), 0) || 0,
        totalEnergyUsed: orders?.filter(order => order.status === 'completed')
          .reduce((sum, order) => sum + (order.energy_amount || 0), 0) || 0,
        lastOrderDate: orders && orders.length > 0 ? 
          MessageFormatter.formatDate(orders[0].created_at) : null
      };

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalOrders: 0,
        completedOrders: 0,
        totalSpent: 0,
        totalEnergyUsed: 0,
        lastOrderDate: null
      };
    }
  }

  /**
   * 获取账户状态文本
   */
  private getAccountStatus(status?: string): string {
    switch (status) {
      case 'active':
        return '✅ 正常';
      case 'suspended':
        return '⏸️ 暂停';
      case 'blocked':
        return '🚫 封禁';
      case 'pending':
        return '⏳ 待激活';
      default:
        return '✅ 正常';
    }
  }

  /**
   * 处理用户统计查询
   */
  async handleUserStats(chatId: number, telegramId?: number): Promise<void> {
    if (!CommandValidator.validateUserInfo({ id: telegramId } as any)) {
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      const user = await UserService.getUserByTelegramId(telegramId!);
      if (!user) {
        await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 用户不存在');
        return;
      }

      const stats = await this.getUserStats(user.id);
      
      const statsMessage = `📊 用户统计报告

📈 **订单统计**
• 总订单数: ${stats.totalOrders}
• 成功订单: ${stats.completedOrders}
• 成功率: ${stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
• 平均订单金额: ${stats.totalOrders > 0 ? (stats.totalSpent / stats.totalOrders).toFixed(2) : 0} TRX

⚡ **能量使用统计**
• 总能量使用: ${MessageFormatter.formatNumber(stats.totalEnergyUsed)} Energy
• 平均单次能量: ${stats.completedOrders > 0 ? MessageFormatter.formatNumber(Math.round(stats.totalEnergyUsed / stats.completedOrders)) : 0} Energy

💰 **消费统计**
• 总消费金额: ${stats.totalSpent} TRX
• 等值USDT: ~${(stats.totalSpent * 0.12).toFixed(2)} USDT (按当前汇率)

📅 **时间统计**
• 注册时间: ${MessageFormatter.formatDate(user.created_at)}
• 最后订单: ${stats.lastOrderDate || '无'}
• 活跃天数: ${this.calculateActiveDays(user.created_at)}天`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '💰 账户余额', callback_data: 'check_balance' },
            { text: '📋 订单记录', callback_data: 'my_orders' }
          ],
          [
            { text: '📱 返回主菜单', callback_data: 'refresh_menu' }
          ]
        ]
      };

      await MessageFormatter.safeSendMessage(this.bot, chatId, statsMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Error in handleUserStats:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取统计信息失败，请重试。');
    }
  }

  /**
   * 计算活跃天数
   */
  private calculateActiveDays(createdAt: string | Date): number {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * 注册Balance命令处理器
   */
  registerBalanceCommand(): void {
    this.bot.onText(/\/balance/, async (msg) => {
      try {
        await this.handleBalanceCommand(msg);
      } catch (error) {
        console.error('Error handling /balance command:', error);
        await MessageFormatter.safeSendMessage(this.bot, msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });
  }
}
