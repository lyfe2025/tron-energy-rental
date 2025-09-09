/**
 * Telegram机器人键盘构建器
 * 负责构建各种内联键盘和回复键盘
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../config/database.js';
import type { EnergyPackage, InlineKeyboard, OrderInfo } from '../types/bot.types.js';

export class KeyboardBuilder {
  private bot: TelegramBot;
  private botId: string;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
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
   * 从数据库获取机器人键盘配置
   */
  private async getBotKeyboardConfig(): Promise<any> {
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
  private buildInlineKeyboardFromConfig(config: any): InlineKeyboard {
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

  /**
   * 显示主菜单（支持从数据库配置读取）
   */
  async showMainMenu(chatId: number): Promise<void> {
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
        const keyboard = this.buildMainMenuKeyboard();

        await this.bot.sendMessage(chatId, menuMessage, {
          reply_markup: keyboard,
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
