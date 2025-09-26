/**
 * Order命令处理器
 * 处理订单相关命令
 */
import TelegramBot from 'node-telegram-bot-api';
import { UserService } from '../../../user.ts';
import { CommandValidator } from '../middleware/CommandValidator.ts';
import { UserContextManager } from '../middleware/UserContextManager.ts';
import type { CommandHandlerDependencies } from '../types/command.types.ts';
import { MessageFormatter } from '../utils/MessageFormatter.ts';

export class OrderCommandHandler {
  private bot: TelegramBot;
  private userService: UserService;
  private orderService: typeof import('../../../order.ts').orderService;

  constructor(dependencies: CommandHandlerDependencies) {
    this.bot = dependencies.bot;
    this.userService = dependencies.userService;
    this.orderService = dependencies.orderService;
  }

  /**
   * 处理 /orders 命令
   */
  async handleOrdersCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    
    if (!CommandValidator.validateChatInfo(chatId) || !CommandValidator.validateUserInfo(msg.from)) {
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      // 更新用户上下文
      UserContextManager.createOrUpdateContext(msg);
      UserContextManager.setCurrentCommand(telegramId!, '/orders');

      const user = await UserService.getUserByTelegramId(telegramId!);
      if (!user) {
        await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 用户不存在，请先使用 /start 注册');
        return;
      }

      const orders = await this.orderService.getUserOrders(user.id, 5); // 获取最近5个订单
      
      if (!orders || orders.length === 0) {
        await this.sendEmptyOrdersMessage(chatId);
        return;
      }

      await this.sendOrdersList(chatId, orders);
    } catch (error) {
      console.error('Error in handleOrdersCommand:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取订单信息失败，请重试。');
    }
  }

  /**
   * 处理我的订单按钮
   */
  async handleMyOrdersButton(msg: TelegramBot.Message): Promise<void> {
    await this.handleOrdersCommand(msg);
  }

  /**
   * 处理我的订单回调
   */
  async handleMyOrdersCallback(chatId: number, telegramId?: number): Promise<void> {
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

      const orders = await this.orderService.getUserOrders(user.id, 5);
      
      if (!orders || orders.length === 0) {
        await this.sendEmptyOrdersMessage(chatId);
        return;
      }

      await this.sendOrdersList(chatId, orders, true); // 包含回调按钮
    } catch (error) {
      console.error('Error in handleMyOrdersCallback:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取订单信息失败，请重试。');
    }
  }

  /**
   * 发送空订单列表消息
   */
  private async sendEmptyOrdersMessage(chatId: number): Promise<void> {
    const message = `📋 订单记录

暂无订单记录

💡 您还没有任何订单，点击下方按钮开始您的第一次能量租赁吧！`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⚡ 购买能量', callback_data: 'buy_energy' },
          { text: '💰 账户余额', callback_data: 'check_balance' }
        ],
        [
          { text: '📱 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]
    };

    await MessageFormatter.safeSendMessage(this.bot, chatId, message, {
      reply_markup: keyboard
    });
  }

  /**
   * 发送订单列表
   */
  private async sendOrdersList(chatId: number, orders: any[], includeButtons: boolean = false): Promise<void> {
    let ordersMessage = '📋 最近订单记录\n\n';
    
    orders.forEach((order, index) => {
      const statusEmoji = MessageFormatter.getOrderStatusEmoji(order.status);
      const statusText = this.getOrderStatusText(order.status);
      
      ordersMessage += `${index + 1}️⃣ 订单 #${order.order_number}\n` +
        `⚡ 能量: ${MessageFormatter.formatNumber(order.energy_amount)} Energy\n` +
        `💰 金额: ${order.price} ${order.payment_currency || 'USDT'}\n` +
        `${statusEmoji} 状态: ${statusText}\n` +
        `📅 时间: ${MessageFormatter.formatDate(order.created_at)}\n`;
      
      if (order.target_address) {
        ordersMessage += `📍 地址: ${this.formatAddress(order.target_address)}\n`;
      }
      
      ordersMessage += '\n';
    });

    // 添加统计信息
    ordersMessage += `📊 显示最近 ${orders.length} 个订单`;

    let messageOptions: any = { parse_mode: 'Markdown' };

    if (includeButtons) {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 刷新订单', callback_data: 'my_orders' },
            { text: '📊 订单统计', callback_data: 'order_stats' }
          ],
          [
            { text: '⚡ 新建订单', callback_data: 'buy_energy' },
            { text: '📱 返回主菜单', callback_data: 'refresh_menu' }
          ]
        ]
      };
      messageOptions.reply_markup = keyboard;
    }

    await MessageFormatter.safeSendMessage(this.bot, chatId, ordersMessage, messageOptions);
  }

  /**
   * 获取订单状态文本
   */
  private getOrderStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return '等待支付';
      case 'paid':
        return '已支付';
      case 'processing':
        return '处理中';
      case 'active':
        return '已支付活跃';
      case 'completed':
        return '已完成';
      case 'manually_completed':
        return '手动补单完成';
      case 'failed':
        return '失败';
      case 'cancelled':
        return '已取消';
      case 'expired':
        return '已过期';
      case 'pending_delegation':
        return '等待委托';
      default:
        return '未知状态';
    }
  }

  /**
   * 格式化地址显示
   */
  private formatAddress(address: string): string {
    if (address.length <= 20) {
      return address;
    }
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  }

  /**
   * 处理订单详情查询
   */
  async handleOrderDetail(chatId: number, orderId: string, telegramId?: number): Promise<void> {
    if (!CommandValidator.validateUserInfo({ id: telegramId } as any)) {
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      const order = await this.orderService.getOrderById(orderId);
      if (!order) {
        await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 订单不存在');
        return;
      }

      // 验证订单是否属于当前用户
      const user = await UserService.getUserByTelegramId(telegramId!);
      if (!user || user.id !== order.user_id) {
        await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 无权查看此订单');
        return;
      }

      await this.sendOrderDetail(chatId, order);
    } catch (error) {
      console.error('Error in handleOrderDetail:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取订单详情失败，请重试。');
    }
  }

  /**
   * 发送订单详情
   */
  private async sendOrderDetail(chatId: number, order: any): Promise<void> {
    const statusEmoji = MessageFormatter.getOrderStatusEmoji(order.status);
    const statusText = this.getOrderStatusText(order.status);

    const detailMessage = `📋 订单详情 #${order.order_number}

${statusEmoji} **状态**: ${statusText}
⚡ **能量数量**: ${MessageFormatter.formatNumber(order.energy_amount)} Energy
💰 **支付金额**: ${order.price} ${order.payment_currency || 'USDT'}
📍 **接收地址**: \`${order.target_address}\`
⏰ **代理时长**: ${order.duration_hours}小时
📅 **创建时间**: ${MessageFormatter.formatDate(order.created_at)}
${order.updated_at ? `🔄 **更新时间**: ${MessageFormatter.formatDate(order.updated_at)}` : ''}

${order.transaction_hash ? `🔗 **交易哈希**: \`${order.transaction_hash}\`` : ''}
${order.delegation_id ? `📋 **代理ID**: \`${order.delegation_id}\`` : ''}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📋 返回订单列表', callback_data: 'my_orders' },
          { text: '📱 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]
    };

    await MessageFormatter.safeSendMessage(this.bot, chatId, detailMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  /**
   * 注册Orders命令处理器
   */
  registerOrdersCommand(): void {
    this.bot.onText(/\/orders/, async (msg) => {
      try {
        await this.handleOrdersCommand(msg);
      } catch (error) {
        console.error('Error handling /orders command:', error);
        await MessageFormatter.safeSendMessage(this.bot, msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });
  }
}
