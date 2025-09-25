/**
 * 能量套餐处理器
 * 负责处理能量套餐相关的回调操作
 */
import TelegramBot from 'node-telegram-bot-api';
import { type CreateOrderRequest } from '../../../../order.ts';
import { paymentService } from '../../../../payment.ts';
import { UserService } from '../../../../user.ts';
import type { EnergyPackage } from '../../../types/bot.types.ts';
import { CallbackValidator } from '../../utils/CallbackValidator.ts';
import { ResponseFormatter } from '../../utils/ResponseFormatter.ts';

export class EnergyPackageHandler {
  private bot: TelegramBot;
  private orderService: any;

  constructor(bot: TelegramBot, orderServiceInstance: any) {
    this.bot = bot;
    this.orderService = orderServiceInstance;
  }

  /**
   * 处理能量套餐选择
   */
  async handleEnergyPackageSelection(chatId: number, packageId: string, telegramId?: number): Promise<void> {
    if (!CallbackValidator.validateUserInfo(telegramId)) {
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    if (!CallbackValidator.validatePackageId(packageId)) {
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 套餐ID格式无效');
      return;
    }

    try {
      const packageInfo = await this.getPackageInfo(packageId);
      if (!packageInfo) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 套餐不存在或已下架');
        return;
      }

      // 获取用户信息
      const user = await UserService.getUserByTelegramId(telegramId!);
      if (!user) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 用户信息不存在，请重新开始');
        return;
      }

      // 检查用户TRON地址
      if (!user.tron_address) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, 
          '❌ 请先设置您的TRON地址\n\n' +
          '使用命令: /setaddress <您的TRON地址>'
        );
        return;
      }

      const confirmationMessage = 
        `📦 套餐确认\n\n` +
        `套餐: ${packageInfo.name}\n` +
        `能量: ${ResponseFormatter.formatNumber(packageInfo.energy)}\n` +
        `价格: ${packageInfo.price} TRX\n` +
        `时长: ${packageInfo.duration}小时\n` +
        `接收地址: ${user.tron_address}\n\n` +
        `请确认您的选择:`;

      const keyboard = ResponseFormatter.createInlineKeyboard([
        [
          { text: '✅ 确认订单', callback_data: `confirm_package_${packageId}` },
          { text: '❌ 取消', callback_data: 'buy_energy' }
        ]
      ]);

      await ResponseFormatter.safeSendMessage(this.bot, chatId, confirmationMessage, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Failed to handle package selection:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理套餐选择时发生错误，请重试。');
    }
  }

  /**
   * 处理套餐确认
   */
  async handlePackageConfirmation(chatId: number, packageId: string, telegramId?: string): Promise<void> {
    if (!telegramId) {
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      const packageInfo = await this.getPackageInfo(packageId);
      if (!packageInfo) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 套餐不存在');
        return;
      }

      // 获取用户信息
      const user = await UserService.getUserByTelegramId(parseInt(telegramId));
      if (!user) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 用户信息不存在');
        return;
      }

      // 创建订单
      const orderData: CreateOrderRequest = {
        userId: parseInt(user.id),
        priceConfigId: parseInt(packageInfo.id),
        energyAmount: packageInfo.energy,
        priceTrx: packageInfo.price,
        recipientAddress: user.tron_address!,
        durationHours: packageInfo.duration
      };

      const order = await this.orderService.createOrder(orderData);
      if (!order) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 创建订单失败，请重试');
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
        `支付完成后系统将自动确认并开始能量代理。`;

      const keyboard = ResponseFormatter.createInlineKeyboard([
        [
          { text: '✅ 我已支付', callback_data: `confirm_order_${order.id}` },
          { text: '❌ 取消订单', callback_data: `cancel_order_${order.id}` }
        ]
      ]);

      await ResponseFormatter.safeSendMessage(this.bot, chatId, paymentMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });

      // 启动支付监控
      try {
        await paymentService.createPaymentMonitor(
          order.id.toString(),
          packageInfo.price,
          user.tron_address!
        );
      } catch (paymentError) {
        console.error('Failed to create payment monitor:', paymentError);
      }
    } catch (error) {
      console.error('Failed to handle package confirmation:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 确认套餐时发生错误，请重试。');
    }
  }

  /**
   * 处理套餐取消
   */
  async handlePackageCancellation(chatId: number, packageId: string): Promise<void> {
    await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 已取消套餐选择');
    // 可以返回到能量套餐选择界面
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
}
