/**
 * Telegram机器人键盘构建器
 * 负责构建各种内联键盘
 */
import TelegramBot from 'node-telegram-bot-api';
import type { EnergyPackage, InlineKeyboard, OrderInfo } from '../types/bot.types.js';

export class KeyboardBuilder {
  private bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  /**
   * 构建主菜单键盘
   */
  buildMainMenuKeyboard(): InlineKeyboard {
    return {
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
  }

  /**
   * 构建能量套餐选择键盘
   */
  buildEnergyPackagesKeyboard(packages: EnergyPackage[]): InlineKeyboard {
    const keyboard = packages.map(pkg => [{
      text: `${pkg.name} - ${pkg.energy.toLocaleString()} 能量 - ${pkg.price} TRX`,
      callback_data: `package_${pkg.id}`
    }]);

    // 添加返回主菜单按钮
    keyboard.push([
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]);

    return {
      inline_keyboard: keyboard
    };
  }

  /**
   * 构建套餐确认键盘
   */
  buildPackageConfirmationKeyboard(packageId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '✅ 确认订单', callback_data: `confirm_package_${packageId}` },
          { text: '❌ 取消订单', callback_data: `cancel_package_${packageId}` }
        ],
        [
          { text: '🔙 返回套餐选择', callback_data: 'buy_energy' }
        ]
      ]
    };
  }

  /**
   * 构建订单确认键盘
   */
  buildOrderConfirmationKeyboard(orderId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '✅ 确认支付', callback_data: `confirm_order_${orderId}` },
          { text: '❌ 取消订单', callback_data: `cancel_order_${orderId}` }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]
    };
  }

  /**
   * 构建委托状态查看键盘
   */
  buildDelegationStatusKeyboard(delegationId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '📊 查看状态', callback_data: `delegation_status_${delegationId}` },
          { text: '🔄 刷新状态', callback_data: `delegation_status_${delegationId}` }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]
    };
  }

  /**
   * 显示主菜单
   */
  async showMainMenu(chatId: number): Promise<void> {
    const menuMessage = '🏠 主菜单\n\n请选择您需要的服务：';
    const keyboard = this.buildMainMenuKeyboard();

    await this.bot.sendMessage(chatId, menuMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  /**
   * 显示能量套餐
   */
  async showEnergyPackages(chatId: number): Promise<void> {
    try {
      // 获取能量套餐数据（这里应该从数据库获取）
      const packages: EnergyPackage[] = [
        {
          id: '1',
          name: '基础套餐',
          energy: 32000,
          price: 2.5,
          duration: 24,
          description: '适合日常使用的基础能量套餐'
        },
        {
          id: '2',
          name: '标准套餐',
          energy: 65000,
          price: 4.8,
          duration: 24,
          description: '性价比最高的标准能量套餐'
        },
        {
          id: '3',
          name: '高级套餐',
          energy: 130000,
          price: 9.2,
          duration: 24,
          description: '大额交易专用的高级能量套餐'
        }
      ];

      const keyboard = this.buildEnergyPackagesKeyboard(packages);

      const packageMessages = packages.map(pkg => 
        `📦 ${pkg.name}\n` +
        `⚡ 能量: ${pkg.energy.toLocaleString()}\n` +
        `💰 价格: ${pkg.price} TRX\n` +
        `⏰ 时长: ${pkg.duration}小时\n` +
        `📝 说明: ${pkg.description || '无'}`
      ).join('\n\n');

      const message = `⚡ 选择能量套餐:\n\n${packageMessages}\n\n请选择您需要的套餐:`;

      await this.bot.sendMessage(chatId, message, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Failed to show energy packages:', error);
      await this.bot.sendMessage(chatId, '❌ 获取套餐信息失败，请稍后再试。');
    }
  }

  /**
   * 显示套餐确认界面
   */
  async showPackageConfirmation(chatId: number, packageId: string, tronAddress?: string): Promise<void> {
    try {
      // 这里应该根据packageId获取套餐详情
      const packageInfo = await this.getPackageInfo(packageId);
      if (!packageInfo) {
        await this.bot.sendMessage(chatId, '❌ 套餐信息不存在');
        return;
      }

      const keyboard = this.buildPackageConfirmationKeyboard(packageId);
      
      const confirmationMessage = `📋 订单确认\n\n` +
        `📦 套餐: ${packageInfo.name}\n` +
        `⚡ 能量: ${packageInfo.energy.toLocaleString()}\n` +
        `💰 价格: ${packageInfo.price} TRX\n` +
        `⏰ 有效期: ${packageInfo.duration}小时\n\n` +
        `${tronAddress ? `📍 接收地址: ${tronAddress}\n\n` : ''}` +
        `请确认订单信息无误后点击确认:`;

      await this.bot.sendMessage(chatId, confirmationMessage, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Failed to show package confirmation:', error);
      await this.bot.sendMessage(chatId, '❌ 显示确认信息失败，请重试。');
    }
  }

  /**
   * 显示订单支付界面
   */
  async showOrderPayment(chatId: number, orderInfo: OrderInfo): Promise<void> {
    try {
      const keyboard = this.buildOrderConfirmationKeyboard(orderInfo.id);
      
      const paymentMessage = `💳 支付信息\n\n` +
        `📋 订单号: ${orderInfo.id}\n` +
        `💰 支付金额: ${orderInfo.amount} TRX\n` +
        `📍 支付地址: ${orderInfo.payment_address || '生成中...'}\n\n` +
        `⚠️ 注意事项:\n` +
        `• 请在30分钟内完成支付\n` +
        `• 确保转账金额准确无误\n` +
        `• 支付完成后点击确认支付\n\n` +
        `✅ 支付完成后，能量将在3分钟内到账`;

      await this.bot.sendMessage(chatId, paymentMessage, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Failed to show order payment:', error);
      await this.bot.sendMessage(chatId, '❌ 显示支付信息失败，请重试。');
    }
  }

  /**
   * 获取套餐信息（辅助方法）
   */
  private async getPackageInfo(packageId: string): Promise<EnergyPackage | null> {
    // 这里应该从数据库获取，现在用模拟数据
    const packages: EnergyPackage[] = [
      {
        id: '1',
        name: '基础套餐',
        energy: 32000,
        price: 2.5,
        duration: 24,
        description: '适合日常使用的基础能量套餐'
      },
      {
        id: '2',
        name: '标准套餐',
        energy: 65000,
        price: 4.8,
        duration: 24,
        description: '性价比最高的标准能量套餐'
      },
      {
        id: '3',
        name: '高级套餐',
        energy: 130000,
        price: 9.2,
        duration: 24,
        description: '大额交易专用的高级能量套餐'
      }
    ];

    return packages.find(pkg => pkg.id === packageId) || null;
  }
}
