/**
 * Telegram机器人服务
 * 实现用户交互界面和命令处理
 */

import TelegramBot from 'node-telegram-bot-api';
import { query } from '../database/index.js';
import { UserService } from './user.js';
import { energyPoolService } from './energy-pool.js';
import { paymentService } from './payment.js';
import { tronService } from './tron.js';
import { energyDelegationService } from './energy-delegation.js';
import { orderService, type CreateOrderRequest } from './order.js';

export class TelegramBotService {
  private bot: TelegramBot;
  private userService: UserService;
  private orderService: typeof orderService;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.userService = new UserService();
    this.orderService = orderService;
    
    this.setupCommands();
    this.setupCallbacks();
  }

  /**
   * 设置基础命令处理
   */
  private setupCommands(): void {
    // /start 命令 - 机器人启动和用户注册
    this.bot.onText(/\/start/, async (msg) => {
      try {
        await this.handleStartCommand(msg);
      } catch (error) {
        console.error('Error handling /start command:', error);
        await this.sendErrorMessage(msg.chat.id);
      }
    });

    // /menu 命令 - 显示主菜单
    this.bot.onText(/\/menu/, async (msg) => {
      try {
        await this.handleMenuCommand(msg);
      } catch (error) {
        console.error('Error handling /menu command:', error);
        await this.sendErrorMessage(msg.chat.id);
      }
    });

    // /help 命令 - 帮助信息
    this.bot.onText(/\/help/, async (msg) => {
      try {
        await this.handleHelpCommand(msg);
      } catch (error) {
        console.error('Error handling /help command:', error);
        await this.sendErrorMessage(msg.chat.id);
      }
    });

    // /balance 命令 - 查询余额
    this.bot.onText(/\/balance/, async (msg) => {
      try {
        await this.handleBalanceCommand(msg);
      } catch (error) {
        console.error('Error handling /balance command:', error);
        await this.sendErrorMessage(msg.chat.id);
      }
    });

    // /orders 命令 - 订单历史
    this.bot.onText(/\/orders/, async (msg) => {
      try {
        await this.handleOrdersCommand(msg);
      } catch (error) {
        console.error('Error handling /orders command:', error);
        await this.sendErrorMessage(msg.chat.id);
      }
    });
  }

  /**
   * 设置回调查询处理
   */
  private setupCallbacks(): void {
    this.bot.on('callback_query', async (callbackQuery) => {
      try {
        await this.handleCallbackQuery(callbackQuery);
      } catch (error) {
        console.error('Error handling callback query:', error);
        if (callbackQuery.message) {
          await this.sendErrorMessage(callbackQuery.message.chat.id);
        }
      }
    });
  }

  /**
   * 处理 /start 命令
   */
  private async handleStartCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramUser = msg.from;
    
    if (!telegramUser) {
      await this.bot.sendMessage(chatId, '❌ 无法获取用户信息，请重试。');
      return;
    }

    // 注册或获取用户
    const user = await this.userService.registerTelegramUser({
      telegram_id: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      language_code: telegramUser.language_code
    });

    // 发送欢迎消息
    const welcomeMessage = `🎉 欢迎使用TRON能量租赁机器人！

` +
      `👋 你好，${telegramUser.first_name}！

` +
      `🔋 我们提供快速、安全的TRON能量租赁服务：
` +
      `• 💰 超低价格，性价比最高
` +
      `• ⚡ 秒级到账，即买即用
` +
      `• 🛡️ 安全可靠，无需私钥
` +
      `• 🎯 多种套餐，满足不同需求

` +
      `📱 使用 /menu 查看主菜单
` +
      `❓ 使用 /help 获取帮助`;

    await this.bot.sendMessage(chatId, welcomeMessage);
    
    // 显示主菜单
    await this.showMainMenu(chatId);
  }

  /**
   * 处理 /menu 命令
   */
  private async handleMenuCommand(msg: TelegramBot.Message): Promise<void> {
    await this.showMainMenu(msg.chat.id);
  }

  /**
   * 处理 /help 命令
   */
  private async handleHelpCommand(msg: TelegramBot.Message): Promise<void> {
    const helpMessage = `📖 TRON能量租赁机器人使用指南

` +
      `🤖 基础命令：
` +
      `• /start - 启动机器人
` +
      `• /menu - 显示主菜单
` +
      `• /help - 显示帮助信息
` +
      `• /balance - 查询账户余额
` +
      `• /orders - 查看订单历史

` +
      `🔋 能量租赁流程：
` +
      `1️⃣ 选择能量套餐
` +
      `2️⃣ 输入接收地址
` +
      `3️⃣ 确认订单信息
` +
      `4️⃣ 完成支付
` +
      `5️⃣ 等待能量到账

` +
      `💡 注意事项：
` +
      `• 请确保TRON地址正确
` +
      `• 支付后请耐心等待确认
` +
      `• 能量有效期为24小时

` +
      `🆘 如需帮助，请联系客服`;

    await this.bot.sendMessage(msg.chat.id, helpMessage);
  }

  /**
   * 处理 /balance 命令
   */
  private async handleBalanceCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    
    if (!telegramId) {
      await this.bot.sendMessage(chatId, '❌ 无法获取用户信息');
      return;
    }

    const user = await this.userService.getUserByTelegramId(telegramId);
    if (!user) {
      await this.bot.sendMessage(chatId, '❌ 用户不存在，请先使用 /start 注册');
      return;
    }

    const balanceMessage = `💰 账户余额信息

` +
      `💵 USDT余额: ${user.usdt_balance || 0} USDT
` +
      `🔴 TRX余额: ${user.trx_balance || 0} TRX
` +
      `📊 总订单数: ${user.total_orders || 0}
` +
      `💸 总消费: ${user.total_spent || 0} USDT
` +
      `⚡ 总能量使用: ${user.total_energy_used || 0} Energy`;

    await this.bot.sendMessage(chatId, balanceMessage);
  }

  /**
   * 处理 /orders 命令
   */
  private async handleOrdersCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    
    if (!telegramId) {
      await this.bot.sendMessage(chatId, '❌ 无法获取用户信息');
      return;
    }

    const user = await this.userService.getUserByTelegramId(telegramId);
    if (!user) {
      await this.bot.sendMessage(chatId, '❌ 用户不存在，请先使用 /start 注册');
      return;
    }

    const orders = await this.orderService.getUserOrders(user.id, 5); // 获取最近5个订单
    
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
  }

  /**
   * 显示主菜单
   */
  private async showMainMenu(chatId: number): Promise<void> {
    const menuMessage = '🏠 主菜单\n\n请选择您需要的服务：';
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔋 购买能量', callback_data: 'buy_energy' },
          { text: '📋 我的订单', callback_data: 'my_orders' }
        ],
        [
          { text: '💰 账户余额', callback_data: 'check_balance' },
          { text: '❓ 帮助支持', callback_data: 'help_support' }
        ],
        [
          { text: '🔄 刷新菜单', callback_data: 'refresh_menu' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, menuMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  /**
   * 处理回调查询
   */
  private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const chatId = callbackQuery.message?.chat.id;
    const data = callbackQuery.data;
    
    if (!chatId || !data) return;

    // 回答回调查询
    await this.bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
      case 'buy_energy':
        await this.showEnergyPackages(chatId);
        break;
      case 'my_orders':
        await this.handleOrdersCommand({ chat: { id: chatId }, from: callbackQuery.from } as TelegramBot.Message);
        break;
      case 'check_balance':
        await this.handleBalanceCommand({ chat: { id: chatId }, from: callbackQuery.from } as TelegramBot.Message);
        break;
      case 'help_support':
        await this.handleHelpCommand({ chat: { id: chatId }, from: callbackQuery.from } as TelegramBot.Message);
        break;
      case 'refresh_menu':
        await this.showMainMenu(chatId);
        break;
      default:
        if (data.startsWith('package_')) {
          const packageId = data.replace('package_', '');
          await this.handleEnergyPackageSelection(chatId, packageId, callbackQuery.from?.id);
        } else if (data.startsWith('confirm_package_')) {
          const packageId = data.replace('confirm_package_', '');
          await this.handlePackageConfirmation(chatId, packageId, callbackQuery.from?.id?.toString());
        } else if (data.startsWith('confirm_order_')) {
          const orderId = data.replace('confirm_order_', '');
          await this.handleOrderConfirmation(chatId, orderId);
        } else if (data.startsWith('cancel_order_')) {
          const orderId = data.replace('cancel_order_', '');
          await this.handleOrderCancellation(chatId, orderId);
        } else if (data.startsWith('delegation_status_')) {
          const delegationId = data.replace('delegation_status_', '');
          await this.handleDelegationStatus(chatId, delegationId);
        }
        break;
    }
  }

  /**
   * 显示能量套餐
   */
  private async showEnergyPackages(chatId: number): Promise<void> {
    try {
      // 模拟能量套餐数据
      const packages = [
        {
          id: '1',
          name: '基础套餐',
          energy_amount: 32000,
          price: 2.5,
          duration_hours: 24
        },
        {
          id: '2',
          name: '标准套餐',
          energy_amount: 65000,
          price: 4.8,
          duration_hours: 24
        },
        {
          id: '3',
          name: '高级套餐',
          energy_amount: 130000,
          price: 9.2,
          duration_hours: 24
        }
      ];

      const keyboard = {
        inline_keyboard: packages.map(pkg => [{
          text: `${pkg.name} - ${pkg.energy_amount.toLocaleString()} 能量 - ${pkg.price} TRX`,
          callback_data: `package_${pkg.id}`
        }])
      };

      await this.bot.sendMessage(chatId, 
        '⚡ 选择能量套餐:\n\n' +
        packages.map(pkg => 
          `${pkg.name}\n` +
          `能量: ${pkg.energy_amount.toLocaleString()}\n` +
          `价格: ${pkg.price} TRX\n` +
          `时长: ${pkg.duration_hours}小时\n`
        ).join('\n') +
        '\n请选择您需要的套餐:',
        { reply_markup: keyboard }
      );
    } catch (error) {
      console.error('Failed to show energy packages:', error);
      await this.bot.sendMessage(chatId, '❌ 获取套餐信息失败，请稍后再试。');
    }
  }

  /**
   * 处理能量套餐选择
   */
  private async handleEnergyPackageSelection(chatId: number, packageId: string, telegramId?: number): Promise<void> {
    if (!telegramId) {
      await this.bot.sendMessage(chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      // 模拟套餐数据
      const packages = {
        '1': { id: '1', name: '基础套餐', energy_amount: 32000, price: 2.5, duration_hours: 24 },
        '2': { id: '2', name: '标准套餐', energy_amount: 65000, price: 4.8, duration_hours: 24 },
        '3': { id: '3', name: '高级套餐', energy_amount: 130000, price: 9.2, duration_hours: 24 }
      };

      const packageData = packages[packageId as keyof typeof packages];
      if (!packageData) {
        await this.bot.sendMessage(chatId, '❌ 套餐不存在或已下架');
        return;
      }

      // 获取用户信息
      const user = await this.userService.getUserByTelegramId(telegramId);
      if (!user) {
        await this.bot.sendMessage(chatId, '❌ 用户信息不存在，请重新开始');
        return;
      }

      // 检查用户TRON地址
      if (!user.tron_address) {
        await this.bot.sendMessage(chatId, 
          '❌ 请先设置您的TRON地址\n\n' +
          '使用命令: /setaddress <您的TRON地址>'
        );
        return;
      }

      const confirmationMessage = 
        `📦 套餐确认\n\n` +
        `套餐: ${packageData.name}\n` +
        `能量: ${packageData.energy_amount.toLocaleString()}\n` +
        `价格: ${packageData.price} TRX\n` +
        `时长: ${packageData.duration_hours}小时\n` +
        `接收地址: ${user.tron_address}\n\n` +
        `请确认您的选择:`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ 确认订单', callback_data: `confirm_package_${packageId}` },
            { text: '❌ 取消', callback_data: 'buy_energy' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, confirmationMessage, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Failed to handle package selection:', error);
      await this.bot.sendMessage(chatId, '❌ 处理套餐选择时发生错误，请重试。');
    }
  }

  /**
   * 处理套餐确认
   */
  private async handlePackageConfirmation(chatId: number, packageId: string, telegramId?: string): Promise<void> {
    if (!telegramId) {
      await this.bot.sendMessage(chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      // 模拟套餐数据
      const packages = {
        '1': { id: '1', name: '基础套餐', energy_amount: 32000, price: 2.5, duration_hours: 24 },
        '2': { id: '2', name: '标准套餐', energy_amount: 65000, price: 4.8, duration_hours: 24 },
        '3': { id: '3', name: '高级套餐', energy_amount: 130000, price: 9.2, duration_hours: 24 }
      };

      const packageData = packages[packageId as keyof typeof packages];
      if (!packageData) {
        await this.bot.sendMessage(chatId, '❌ 套餐不存在');
        return;
      }

      // 获取用户信息
       const user = await this.userService.getUserByTelegramId(parseInt(telegramId));
       if (!user) {
         await this.bot.sendMessage(chatId, '❌ 用户信息不存在');
         return;
       }

      // 创建订单
      const orderData: CreateOrderRequest = {
        userId: user.id,
        packageId: parseInt(packageData.id),
        energyAmount: packageData.energy_amount,
        priceTrx: packageData.price,
        recipientAddress: user.tron_address!,
        durationHours: packageData.duration_hours
      };

      const order = await this.orderService.createOrder(orderData);
      if (!order) {
        await this.bot.sendMessage(chatId, '❌ 创建订单失败，请重试');
        return;
      }

      // 发送支付信息
      const paymentAddress = process.env.TRON_PAYMENT_ADDRESS || 'TExample123456789';
      const paymentMessage = 
        `💰 请完成支付\n\n` +
        `订单号: ${order.id}\n` +
        `金额: ${order.price_trx} TRX\n` +
        `支付地址: \`${paymentAddress}\`\n\n` +
        `⚠️ 请在30分钟内完成支付\n` +
        `支付完成后系统将自动确认并开始能量委托。`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '❌ 取消订单', callback_data: `cancel_order_${order.id}` }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, paymentMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      
      // 创建订单
      const newOrder = await orderService.createOrder({
        userId: user.id,
        packageId: parseInt(packageData.id, 10),
        energyAmount: packageData.energy_amount,
        durationHours: packageData.duration_hours,
        priceTrx: packageData.price,
        recipientAddress: user.tron_address!
      });

      // 启动支付监控
      const paymentMonitoring = await paymentService.createPaymentMonitor(
        newOrder.id.toString(),
        packageData.price,
        user.tron_address!
      );
    } catch (error) {
      console.error('Failed to handle package confirmation:', error);
      await this.bot.sendMessage(chatId, '❌ 确认套餐时发生错误，请重试。');
    }
  }

  /**
   * 处理订单确认
   */
  private async handleOrderConfirmation(chatId: number, orderId: string): Promise<void> {
    try {
      const orderIdNum = parseInt(orderId);
      
      // 获取订单详情
      const order = await orderService.getOrderById(orderIdNum);
      if (!order) {
        await this.bot.sendMessage(chatId, '❌ 订单不存在');
        return;
      }

      // 检查订单状态
      if (order.status !== 'paid') {
        await this.bot.sendMessage(chatId, '❌ 订单尚未支付，请先完成支付');
        return;
      }

      await this.bot.sendMessage(chatId, '✅ 订单确认成功！正在处理能量委托...');
      
      // 执行能量委托
      const delegationResult = await energyDelegationService.executeDelegation({
        orderId: order.id,
        recipientAddress: order.recipient_address,
        energyAmount: order.energy_amount,
        durationHours: order.duration_hours
      });
      
      if (delegationResult.success) {
        const successMessage = `
🎉 *能量委托成功！*

⚡ 能量数量: ${order.energy_amount.toLocaleString()} TRX
📍 接收地址: \`${order.recipient_address}\`
⏰ 委托时长: ${order.duration_hours}小时
🔗 交易ID: \`${delegationResult.txId}\`
📋 委托ID: \`${delegationResult.delegationId}\`

✨ 能量已成功委托到您的地址，请查看钱包确认。
        `;
        
        const keyboard = {
          inline_keyboard: [
            [{ text: '📊 查看委托状态', callback_data: `delegation_status_${delegationResult.delegationId}` }],
            [{ text: '🔙 返回主菜单', callback_data: 'main_menu' }]
          ]
        };
        
        await this.bot.sendMessage(chatId, successMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        
        // 更新订单状态
        await orderService.updateOrderStatus(orderIdNum, 'completed');
      } else {
        await this.bot.sendMessage(chatId, `❌ 能量委托失败: ${delegationResult.error}`);
        // 更新订单状态为失败
        await orderService.updateOrderStatus(orderIdNum, 'failed');
      }
    } catch (error) {
      console.error('Failed to handle order confirmation:', error);
      await this.bot.sendMessage(chatId, '❌ 确认订单时发生错误，请重试。');
    }
  }

  /**
   * 处理订单取消
   */
  private async handleOrderCancellation(chatId: number, orderId: string): Promise<void> {
    try {
      const orderIdNum = parseInt(orderId, 10);
      if (isNaN(orderIdNum)) {
        await this.bot.sendMessage(chatId, '❌ 无效的订单ID');
        return;
      }
      const success = await orderService.cancelOrder(orderIdNum, 'User cancelled');
      if (success) {
        await this.bot.sendMessage(chatId, '✅ 订单已取消');
      } else {
        await this.bot.sendMessage(chatId, '❌ 取消订单失败，请联系客服');
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      await this.bot.sendMessage(chatId, '❌ 取消订单时发生错误，请重试。');
    }
  }

  /**
   * 处理委托状态查看
   */
  private async handleDelegationStatus(chatId: number, delegationId: string): Promise<void> {
    try {
      const delegation = await energyDelegationService.getDelegationStatus(delegationId);
      
      if (!delegation) {
        await this.bot.sendMessage(chatId, '❌ 委托记录不存在');
        return;
      }
      
      const statusEmoji = {
        'active': '🟢',
        'expired': '🔴',
        'cancelled': '⚫'
      }[delegation.status] || '⚪';
      
      const expiresAt = new Date(delegation.expires_at);
      const now = new Date();
      const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
      
      const statusMessage = `
📊 *委托状态详情*

📋 委托ID: \`${delegation.id}\`
${statusEmoji} 状态: ${delegation.status === 'active' ? '进行中' : delegation.status === 'expired' ? '已到期' : '已取消'}
⚡ 能量数量: ${delegation.total_energy.toLocaleString()} TRX
📍 接收地址: \`${delegation.recipient_address}\`
⏰ 委托时长: ${delegation.duration_hours}小时
⏳ 剩余时间: ${timeLeft > 0 ? `${timeLeft}小时` : '已到期'}
📅 创建时间: ${new Date(delegation.created_at).toLocaleString('zh-CN')}
📅 到期时间: ${expiresAt.toLocaleString('zh-CN')}
      `;
      
      const keyboard = {
        inline_keyboard: [
          [{ text: '🔄 刷新状态', callback_data: `delegation_status_${delegationId}` }],
          [{ text: '🔙 返回主菜单', callback_data: 'main_menu' }]
        ]
      };
      
      await this.bot.sendMessage(chatId, statusMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
    } catch (error) {
      console.error('Handle delegation status error:', error);
      await this.bot.sendMessage(chatId, '❌ 获取委托状态时发生错误');
    }
  }

  /**
   * 获取订单状态表情符号
   */
  private getOrderStatusEmoji(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': '⏳',
      'paid': '💳',
      'processing': '⚙️',
      'completed': '✅',
      'failed': '❌',
      'cancelled': '🚫'
    };
    return statusMap[status] || '❓';
  }

  /**
   * 获取支付状态表情符号
   */
  private getPaymentStatusEmoji(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': '⏳',
      'paid': '✅',
      'failed': '❌',
      'refunded': '🔄'
    };
    return statusMap[status] || '❓';
  }

  /**
   * 发送错误消息
   */
  private async sendErrorMessage(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, '❌ 系统错误，请稍后重试或联系客服。');
  }

  /**
   * 启动机器人
   */
  public start(): void {
    if (!this.bot) {
      console.error('Telegram bot not initialized');
      return;
    }

    console.log('Telegram bot started successfully');
  }

  /**
   * 停止机器人
   */
  public stop(): void {
    if (this.bot) {
      this.bot.stopPolling();
      console.log('Telegram bot stopped');
    }
  }

  /**
   * 设置Webhook
   */
  public async setWebhook(url: string): Promise<boolean> {
    try {
      if (!this.bot) {
        console.error('Telegram bot not initialized');
        return false;
      }

      const result = await this.bot.setWebHook(url);
      console.log('Webhook set:', result);
      return result;
    } catch (error) {
      console.error('Failed to set webhook:', error);
      return false;
    }
  }

  /**
   * 获取Webhook信息
   */
  public async getWebhookInfo(): Promise<any> {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized');
      }

      return await this.bot.getWebHookInfo();
    } catch (error) {
      console.error('Failed to get webhook info:', error);
      throw error;
    }
  }

  /**
   * 删除Webhook
   */
  public async deleteWebhook(): Promise<boolean> {
    try {
      if (!this.bot) {
        console.error('Telegram bot not initialized');
        return false;
      }

      const result = await this.bot.deleteWebHook();
      console.log('Webhook deleted:', result);
      return result;
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      return false;
    }
  }
}

// 创建并导出服务实例
// 暂时注释掉自动初始化，避免启动时因缺少TELEGRAM_BOT_TOKEN而失败
// export const telegramBotService = new TelegramBotService();
export const telegramBotService = null;