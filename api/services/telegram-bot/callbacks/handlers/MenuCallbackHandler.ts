/**
 * 菜单回调处理器
 * 处理菜单相关的回调查询
 */
import TelegramBot from 'node-telegram-bot-api';
import { UserService } from '../../../user.ts';
import type { CallbackHandlerDependencies } from '../types/callback.types.ts';
import { ResponseFormatter } from '../utils/ResponseFormatter.ts';

export class MenuCallbackHandler {
  private bot: TelegramBot;
  private stateManager: any;

  // 索引签名以支持动态方法调用
  [methodName: string]: any;

  constructor(dependencies: CallbackHandlerDependencies) {
    this.bot = dependencies.bot;
    this.stateManager = dependencies.stateManager;
  }

  /**
   * 处理购买能量按钮
   */
  async handleBuyEnergy(chatId: number): Promise<void> {
    try {
      const message = `⚡ 能量购买服务\n\n` +
        `选择您需要的服务类型：`;

      const keyboard = ResponseFormatter.createInlineKeyboard([
        [
          { text: '⚡ 能量闪租', callback_data: 'energy_flash' },
          { text: '🔥 笔数套餐', callback_data: 'transaction_package' }
        ],
        [
          { text: '💱 TRX闪兑', callback_data: 'trx_exchange' }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]);

      await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('处理购买能量失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理购买能量请求时发生错误，请重试。');
    }
  }

  /**
   * 处理我的订单按钮
   */
  async handleMyOrders(chatId: number): Promise<void> {
    try {
      // 这里会被CommandHandler处理，所以暂时只是占位
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '📋 正在加载订单信息...');
    } catch (error) {
      console.error('处理我的订单失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理订单查询请求时发生错误，请重试。');
    }
  }

  /**
   * 处理余额查询按钮
   */
  async handleCheckBalance(chatId: number): Promise<void> {
    try {
      // 这里会被CommandHandler处理，所以暂时只是占位
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '💰 正在查询账户余额...');
    } catch (error) {
      console.error('处理余额查询失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理余额查询请求时发生错误，请重试。');
    }
  }

  /**
   * 处理帮助支持按钮
   */
  async handleHelpSupport(chatId: number): Promise<void> {
    try {
      // 这里会被CommandHandler处理，所以暂时只是占位
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❓ 正在加载帮助信息...');
    } catch (error) {
      console.error('处理帮助支持失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理帮助请求时发生错误，请重试。');
    }
  }

  /**
   * 处理刷新菜单按钮
   */
  async handleRefreshMenu(chatId: number): Promise<void> {
    try {
      // 这里会被CommandHandler处理，所以暂时只是占位
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '🔄 正在刷新菜单...');
    } catch (error) {
      console.error('处理刷新菜单失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理菜单刷新请求时发生错误，请重试。');
    }
  }

  /**
   * 处理绑定TRON地址
   */
  async handleBindTronAddress(chatId: number, telegramId?: number): Promise<void> {
    try {
      if (!telegramId) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
        return;
      }

      // 检查用户是否存在
      const user = await UserService.getUserByTelegramId(telegramId);
      if (!user) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 用户不存在，请先使用 /start 注册');
        return;
      }

      // 检查用户是否已经绑定了TRON地址
      if (user.tron_address) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '⚠️ 您已经绑定了TRON地址，请先解绑再重新绑定。');
        return;
      }

      const message = `🔗 绑定 TRON 地址

请输入您的 TRON 地址（Base58 格式）：

⚠️ **注意事项：**
• 请确保地址格式正确（以T开头）
• 地址绑定后将用于能量转账
• 请仔细核对，避免输入错误

💡 **示例格式：**
\`TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH\`

请直接回复您的TRON地址：`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '❌ 取消绑定', callback_data: 'check_balance' }
          ]
        ]
      };

      await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });

      // 设置用户状态为等待输入TRON地址
      if (this.stateManager) {
        this.stateManager.setUserState(telegramId, 'waiting_tron_address', {
          action: 'bind',
          chatId: chatId
        });
        console.log('✅ 用户状态已设置:', { 
          telegramId, 
          state: 'waiting_tron_address',
          contextData: { action: 'bind', chatId }
        });
      } else {
        console.error('❌ StateManager未找到，无法设置用户状态');
      }

    } catch (error) {
      console.error('处理绑定TRON地址失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理绑定请求时发生错误，请重试。');
    }
  }

  /**
   * 处理解绑TRON地址
   */
  async handleUnbindTronAddress(chatId: number, telegramId?: number): Promise<void> {
    try {
      if (!telegramId) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
        return;
      }

      // 检查用户是否存在
      const user = await UserService.getUserByTelegramId(telegramId);
      if (!user) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 用户不存在，请先使用 /start 注册');
        return;
      }

      // 检查用户是否有绑定TRON地址
      if (!user.tron_address) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '⚠️ 您还没有绑定TRON地址，无需解绑。');
        return;
      }

      const message = `🔓 解绑 TRON 地址

**当前绑定地址：**
\`${user.tron_address}\`

⚠️ **确认解绑操作？**

解绑后您将无法：
• 使用当前地址进行能量转账
• 查看与此地址相关的订单记录

如需重新绑定，请点击绑定按钮重新操作。`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ 确认解绑', callback_data: `confirm_unbind_tron_${telegramId}` },
            { text: '❌ 取消操作', callback_data: 'check_balance' }
          ]
        ]
      };

      await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('处理解绑TRON地址失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理解绑请求时发生错误，请重试。');
    }
  }

  /**
   * 处理确认解绑TRON地址
   */
  async handleConfirmUnbindTronAddress(chatId: number, telegramId: number): Promise<void> {
    try {
      // 检查用户是否存在
      const user = await UserService.getUserByTelegramId(telegramId);
      if (!user) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 用户不存在，请先使用 /start 注册');
        return;
      }

      // 检查用户是否有绑定TRON地址
      if (!user.tron_address) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '⚠️ 您还没有绑定TRON地址，无需解绑。');
        return;
      }

      const oldAddress = user.tron_address;

      // 执行解绑操作
      const success = await UserService.updateTronAddress(telegramId, null);
      
      if (success) {
        const message = `✅ 解绑成功

**已解绑地址：**
\`${oldAddress}\`

您的TRON地址已成功解绑。如需重新绑定，请点击下方按钮。`;

        const keyboard = {
          inline_keyboard: [
            [
              { text: '🔗 重新绑定', callback_data: 'bind_tron_address' },
              { text: '💰 查看余额', callback_data: 'check_balance' }
            ]
          ]
        };

        await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } else {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 解绑失败，请稍后重试。');
      }

    } catch (error) {
      console.error('处理确认解绑TRON地址失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 解绑操作失败，请重试。');
    }
  }

  /**
   * 处理用户输入的TRON地址
   */
  async handleTronAddressInput(chatId: number, telegramId: number, address: string): Promise<void> {
    try {
      // 验证TRON地址格式
      if (!this.isValidTronAddress(address)) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, 
          '❌ TRON地址格式不正确\n\n请输入正确的TRON地址（以T开头，34位字符）\n\n示例：`TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH`'
        );
        return;
      }

      // 检查地址是否已被其他用户使用
      const isAddressUsed = await this.checkTronAddressExists(address, telegramId);
      if (isAddressUsed) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, 
          '⚠️ 该TRON地址已被其他用户绑定\n\n请使用其他地址，或联系客服处理。'
        );
        return;
      }

      // 执行绑定操作
      const success = await UserService.updateTronAddress(telegramId, address);
      
      if (success) {
        const message = `✅ 绑定成功

**已绑定地址：**
\`${address}\`

您的TRON地址已成功绑定。现在您可以使用此地址进行能量转账。`;

        const keyboard = {
          inline_keyboard: [
            [
              { text: '💰 查看余额', callback_data: 'check_balance' },
              { text: '⚡ 购买能量', callback_data: 'buy_energy' }
            ]
          ]
        };

        await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });

        // 清除用户状态
        if (this.stateManager) {
          this.stateManager.setUserState(telegramId, 'idle');
        }
      } else {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 绑定失败，请稍后重试。');
      }

    } catch (error) {
      console.error('处理TRON地址输入失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 绑定操作失败，请重试。');
    }
  }

  /**
   * 验证TRON地址格式
   */
  private isValidTronAddress(address: string): boolean {
    // TRON地址基本格式验证：以T开头，34位字符
    const tronAddressRegex = /^T[A-Za-z1-9]{33}$/;
    return tronAddressRegex.test(address);
  }

  /**
   * 检查TRON地址是否已被其他用户使用
   */
  private async checkTronAddressExists(address: string, excludeTelegramId: number): Promise<boolean> {
    try {
      // 查询数据库检查地址是否已存在
      const { query } = await import('../../../../config/database.ts');
      const result = await query(
        'SELECT telegram_id FROM users WHERE tron_address = $1 AND telegram_id != $2',
        [address, excludeTelegramId]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('检查TRON地址是否存在失败:', error);
      return false; // 出错时允许绑定，避免误报
    }
  }
}
