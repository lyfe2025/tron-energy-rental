/**
 * Telegram机器人回调查询处理器
 * 处理用户点击按钮的回调查询
 */
import TelegramBot from 'node-telegram-bot-api';
import { energyDelegationService } from '../../energy-delegation.js';
import { orderService, type CreateOrderRequest } from '../../order.js';
import { paymentService } from '../../payment.js';
import { UserService } from '../../user.js';
import type { EnergyPackage } from '../types/bot.types.js';

export class CallbackHandler {
  private bot: TelegramBot;
  private userService: UserService;
  private orderService: typeof orderService;

  constructor(params: { bot: TelegramBot; config?: any; logger?: any; configManager?: any; keyboardBuilder?: any } | TelegramBot) {
    // Handle both old style (direct bot) and new style (params object)
    if (params && typeof params === 'object' && 'bot' in params) {
      this.bot = params.bot;
    } else {
      this.bot = params as TelegramBot;
    }
    this.userService = new UserService();
    this.orderService = orderService;
  }

  /**
   * 安全地发送消息
   */
  private async safeSendMessage(chatId: number, text: string, options?: any): Promise<boolean> {
    try {
      if (!this.bot) {
        console.error('Bot instance is null or undefined');
        return false;
      }

      if (typeof this.safeSendMessage !== 'function') {
        console.error('Bot sendMessage method is not available');
        return false;
      }

      await this.safeSendMessage(chatId, text, options);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * 安全地回答回调查询
   */
  private async safeAnswerCallbackQuery(callbackQueryId: string, options?: any): Promise<boolean> {
    try {
      if (!this.bot) {
        console.error('Bot instance is null or undefined');
        return false;
      }

      if (typeof this.bot.answerCallbackQuery !== 'function') {
        console.error('Bot answerCallbackQuery method is not available');
        return false;
      }

      await this.bot.answerCallbackQuery(callbackQueryId, options);
      return true;
    } catch (error) {
      console.error('Failed to answer callback query:', error);
      return false;
    }
  }

  /**
   * 统一的回调处理方法（别名）
   */
  async handleCallback(callbackQuery: TelegramBot.CallbackQuery): Promise<boolean> {
    try {
      await this.handleCallbackQuery(callbackQuery);
      return true;
    } catch (error) {
      console.error('处理回调失败:', error);
      return false;
    }
  }

  /**
   * 处理主要的回调查询路由
   */
  async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const chatId = callbackQuery.message?.chat.id;
    const data = callbackQuery.data;
    
    if (!chatId || !data) return;

    try {
      // 回答回调查询
      await this.safeAnswerCallbackQuery(callbackQuery.id);

      // 路由到具体处理方法
      await this.routeCallback(chatId, data, callbackQuery);
    } catch (error) {
      console.error('Error handling callback query:', error);
      
      // 安全地发送错误消息
      await this.safeSendMessage(chatId, '❌ 处理请求时发生错误，请重试。');
    }
  }

  /**
   * 回调路由分发
   */
  private async routeCallback(chatId: number, data: string, callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    switch (data) {
      case 'buy_energy':
        // 这里需要调用键盘构建器的showEnergyPackages方法
        // 在主服务中会被重写
        break;
      case 'my_orders':
        // 调用命令处理器的订单查看方法
        break;
      case 'check_balance':
        // 调用命令处理器的余额查看方法
        break;
      case 'help_support':
        // 调用命令处理器的帮助方法
        break;
      case 'refresh_menu':
        // 刷新主菜单
        break;
      default:
        if (data.startsWith('package_')) {
          const packageId = data.replace('package_', '');
          await this.handleEnergyPackageSelection(chatId, packageId, callbackQuery.from?.id);
        } else if (data.startsWith('confirm_package_')) {
          const packageId = data.replace('confirm_package_', '');
          await this.handlePackageConfirmation(chatId, packageId, callbackQuery.from?.id?.toString());
        } else if (data.startsWith('cancel_package_')) {
          const packageId = data.replace('cancel_package_', '');
          await this.handlePackageCancellation(chatId, packageId);
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
   * 处理能量套餐选择
   */
  private async handleEnergyPackageSelection(chatId: number, packageId: string, telegramId?: number): Promise<void> {
    if (!telegramId) {
      await this.safeSendMessage(chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      const packageInfo = await this.getPackageInfo(packageId);
      if (!packageInfo) {
        await this.safeSendMessage(chatId, '❌ 套餐不存在或已下架');
        return;
      }

      // 获取用户信息
      const user = await UserService.getUserByTelegramId(telegramId);
      if (!user) {
        await this.safeSendMessage(chatId, '❌ 用户信息不存在，请重新开始');
        return;
      }

      // 检查用户TRON地址
      if (!user.tron_address) {
        await this.safeSendMessage(chatId, 
          '❌ 请先设置您的TRON地址\n\n' +
          '使用命令: /setaddress <您的TRON地址>'
        );
        return;
      }

      const confirmationMessage = 
        `📦 套餐确认\n\n` +
        `套餐: ${packageInfo.name}\n` +
        `能量: ${packageInfo.energy.toLocaleString()}\n` +
        `价格: ${packageInfo.price} TRX\n` +
        `时长: ${packageInfo.duration}小时\n` +
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

      await this.safeSendMessage(chatId, confirmationMessage, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Failed to handle package selection:', error);
      await this.safeSendMessage(chatId, '❌ 处理套餐选择时发生错误，请重试。');
    }
  }

  /**
   * 处理套餐确认
   */
  private async handlePackageConfirmation(chatId: number, packageId: string, telegramId?: string): Promise<void> {
    if (!telegramId) {
      await this.safeSendMessage(chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      const packageInfo = await this.getPackageInfo(packageId);
      if (!packageInfo) {
        await this.safeSendMessage(chatId, '❌ 套餐不存在');
        return;
      }

      // 获取用户信息
      const user = await UserService.getUserByTelegramId(parseInt(telegramId));
      if (!user) {
        await this.safeSendMessage(chatId, '❌ 用户信息不存在');
        return;
      }

      // 创建订单
      const orderData: CreateOrderRequest = {
        userId: parseInt(user.id),
        packageId: parseInt(packageInfo.id),
        energyAmount: packageInfo.energy,
        priceTrx: packageInfo.price,
        recipientAddress: user.tron_address!,
        durationHours: packageInfo.duration
      };

      const order = await this.orderService.createOrder(orderData);
      if (!order) {
        await this.safeSendMessage(chatId, '❌ 创建订单失败，请重试');
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
            { text: '✅ 我已支付', callback_data: `confirm_order_${order.id}` },
            { text: '❌ 取消订单', callback_data: `cancel_order_${order.id}` }
          ]
        ]
      };

      await this.safeSendMessage(chatId, paymentMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });

      // 启动支付监控
      try {
        const paymentMonitoring = await paymentService.createPaymentMonitor(
          order.id.toString(),
          packageInfo.price,
          user.tron_address!
        );
      } catch (paymentError) {
        console.error('Failed to create payment monitor:', paymentError);
      }
    } catch (error) {
      console.error('Failed to handle package confirmation:', error);
      await this.safeSendMessage(chatId, '❌ 确认套餐时发生错误，请重试。');
    }
  }

  /**
   * 处理套餐取消
   */
  private async handlePackageCancellation(chatId: number, packageId: string): Promise<void> {
    await this.safeSendMessage(chatId, '❌ 已取消套餐选择');
    // 可以返回到能量套餐选择界面
  }

  /**
   * 处理订单确认
   */
  private async handleOrderConfirmation(chatId: number, orderId: string): Promise<void> {
    try {
      const orderIdNum = parseInt(orderId);
      
      // 获取订单详情
      const order = await this.orderService.getOrderById(orderIdNum);
      if (!order) {
        await this.safeSendMessage(chatId, '❌ 订单不存在');
        return;
      }

      // 检查订单状态
      if (order.status !== 'paid') {
        await this.safeSendMessage(chatId, '⏳ 正在确认支付，请稍等...\n\n如果长时间未确认，请联系客服。');
        return;
      }

      await this.safeSendMessage(chatId, '✅ 订单确认成功！正在处理能量委托...');
      
      // 执行能量委托
      const delegationResult = await energyDelegationService.executeDelegation({
        orderId: order.id,
        recipientAddress: order.recipient_address,
        energyAmount: order.energy_amount,
        durationHours: order.duration_hours
      });
      
      if (delegationResult.success) {
        const successMessage = `🎉 *能量委托成功！*

⚡ 能量数量: ${order.energy_amount.toLocaleString()} Energy
📍 接收地址: \`${order.recipient_address}\`
⏰ 委托时长: ${order.duration_hours}小时
🔗 交易ID: \`${delegationResult.txId}\`
📋 委托ID: \`${delegationResult.delegationId}\`

✨ 能量已成功委托到您的地址，请查看钱包确认。`;
        
        const keyboard = {
          inline_keyboard: [
            [{ text: '📊 查看委托状态', callback_data: `delegation_status_${delegationResult.delegationId}` }],
            [{ text: '🔙 返回主菜单', callback_data: 'refresh_menu' }]
          ]
        };
        
        await this.safeSendMessage(chatId, successMessage, {
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } else {
        await this.safeSendMessage(chatId, 
          '❌ 能量委托失败，请联系客服处理。\n\n' +
          `错误信息: ${delegationResult.error || '未知错误'}`
        );
      }
    } catch (error) {
      console.error('Failed to handle order confirmation:', error);
      await this.safeSendMessage(chatId, '❌ 确认订单时发生错误，请重试。');
    }
  }

  /**
   * 处理订单取消
   */
  private async handleOrderCancellation(chatId: number, orderId: string): Promise<void> {
    try {
      const orderIdNum = parseInt(orderId);
      
      // 获取订单详情
      const order = await this.orderService.getOrderById(orderIdNum);
      if (!order) {
        await this.safeSendMessage(chatId, '❌ 订单不存在');
        return;
      }

      // 检查订单是否可以取消
      if (order.status === 'completed') {
        await this.safeSendMessage(chatId, '❌ 订单已完成，无法取消');
        return;
      }

      // 取消订单
      await this.orderService.cancelOrder(orderIdNum);
      
      await this.safeSendMessage(chatId, 
        `✅ 订单 #${orderId} 已成功取消\n\n` +
        `如有疑问，请联系客服。`
      );
    } catch (error) {
      console.error('Failed to handle order cancellation:', error);
      await this.safeSendMessage(chatId, '❌ 取消订单时发生错误，请重试。');
    }
  }

  /**
   * 处理委托状态查询
   */
  private async handleDelegationStatus(chatId: number, delegationId: string): Promise<void> {
    try {
      // 这里应该查询委托状态
      const statusMessage = `📊 委托状态查询\n\n` +
        `📋 委托ID: ${delegationId}\n` +
        `✅ 状态: 活跃中\n` +
        `⏰ 剩余时间: 计算中...\n` +
        `⚡ 可用能量: 计算中...\n\n` +
        `🔄 点击刷新获取最新状态`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 刷新状态', callback_data: `delegation_status_${delegationId}` }
          ],
          [
            { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
          ]
        ]
      };

      await this.safeSendMessage(chatId, statusMessage, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Failed to handle delegation status:', error);
      await this.safeSendMessage(chatId, '❌ 查询委托状态时发生错误，请重试。');
    }
  }

  /**
   * 获取套餐信息（应该从数据库获取）
   */
  private async getPackageInfo(packageId: string): Promise<EnergyPackage | null> {
    const packages: Record<string, EnergyPackage> = {
      '1': { id: '1', name: '基础套餐', energy: 32000, price: 2.5, duration: 24 },
      '2': { id: '2', name: '标准套餐', energy: 65000, price: 4.8, duration: 24 },
      '3': { id: '3', name: '高级套餐', energy: 130000, price: 9.2, duration: 24 }
    };

    return packages[packageId] || null;
  }

  /**
   * 注册回调查询处理器
   */
  registerCallbacks(): void {
    this.bot.on('callback_query', async (callbackQuery) => {
      try {
        await this.handleCallbackQuery(callbackQuery);
      } catch (error) {
        console.error('Error in callback query handler:', error);
        if (callbackQuery.message?.chat.id) {
          await this.safeSendMessage(callbackQuery.message.chat.id, '❌ 处理请求时发生错误，请重试。');
        }
      }
    });
  }
}
