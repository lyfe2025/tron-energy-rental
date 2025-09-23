/**
 * Menu命令处理器
 * 处理/menu命令和菜单刷新
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../config/database.ts';
import { CommandValidator } from '../middleware/CommandValidator.ts';
import { UserContextManager } from '../middleware/UserContextManager.ts';
import type { BotConfig, CommandHandlerDependencies } from '../types/command.types.ts';
import { MessageFormatter } from '../utils/MessageFormatter.ts';

export class MenuCommandHandler {
  private bot: TelegramBot;
  private botId?: string;

  constructor(dependencies: CommandHandlerDependencies) {
    this.bot = dependencies.bot;
    this.botId = dependencies.botId;
  }

  /**
   * 获取当前机器人配置
   */
  private async getBotConfig(): Promise<BotConfig | null> {
    try {
      let result;
      
      if (this.botId) {
        // 优先使用机器人ID获取特定机器人的配置
        result = await query(
          'SELECT welcome_message, help_message, keyboard_config FROM telegram_bots WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
          [this.botId]
        );
      } else {
        // 兼容模式：如果没有机器人ID，获取任意一个活跃机器人的配置
        result = await query(
          'SELECT welcome_message, help_message, keyboard_config FROM telegram_bots WHERE is_active = true AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1'
        );
      }
      
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
   * 处理 /menu 命令
   */
  async handleMenuCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramUser = msg.from;
    
    if (!CommandValidator.validateChatInfo(chatId)) {
      return;
    }
    
    try {
      // 更新用户上下文
      if (telegramUser) {
        UserContextManager.createOrUpdateContext(msg, this.botId);
        UserContextManager.setCurrentCommand(telegramUser.id, '/menu');
      }

      // 获取机器人配置
      const botConfig = await this.getBotConfig();
      
      let menuMessage = '📱 TRON能量租赁主菜单\n\n请选择您需要的服务：';
      
      // 构建键盘配置
      const messageOptions = MessageFormatter.buildKeyboardFromConfig(botConfig || {});
      
      await MessageFormatter.safeSendMessage(this.bot, chatId, menuMessage, messageOptions);
    } catch (error) {
      console.error('Error in handleMenuCommand:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 加载菜单失败，请重试。');
    }
  }

  /**
   * 处理回复键盘中的刷新菜单按钮
   */
  async handleRefreshMenuButton(msg: TelegramBot.Message): Promise<void> {
    await this.handleMenuCommand(msg);
  }

  /**
   * 处理回调查询中的刷新菜单
   */
  async handleRefreshMenuCallback(chatId: number): Promise<void> {
    try {
      // 获取机器人配置
      const botConfig = await this.getBotConfig();
      
      let menuMessage = '📱 TRON能量租赁主菜单\n\n请选择您需要的服务：';
      
      // 构建键盘配置
      const messageOptions = MessageFormatter.buildKeyboardFromConfig(botConfig || {});
      
      await MessageFormatter.safeSendMessage(this.bot, chatId, menuMessage, messageOptions);
    } catch (error) {
      console.error('Error in handleRefreshMenuCallback:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 刷新菜单失败，请重试。');
    }
  }

  /**
   * 创建默认菜单键盘
   */
  private createDefaultMenuKeyboard(): any {
    return {
      inline_keyboard: [
        [
          { text: '⚡ 能量闪租', callback_data: 'energy_flash' },
          { text: '🔥 笔数套餐', callback_data: 'transaction_package' }
        ],
        [
          { text: '💱 TRX闪兑', callback_data: 'trx_exchange' }
        ],
        [
          { text: '📋 我的订单', callback_data: 'my_orders' },
          { text: '💰 账户余额', callback_data: 'check_balance' }
        ],
        [
          { text: '❓ 帮助支持', callback_data: 'help_support' }
        ]
      ]
    };
  }

  /**
   * 检查菜单按钮文本是否有效
   */
  isMenuButton(text: string): boolean {
    const menuButtons = [
      '⚡ 能量闪租', '🔥 笔数套餐', '💱 TRX闪兑',
      '📋 我的订单', '💰 账户余额', '❓ 帮助支持', '🔄 刷新菜单'
    ];
    return menuButtons.includes(text);
  }

  /**
   * 注册Menu命令处理器
   */
  registerMenuCommand(): void {
    this.bot.onText(/\/menu/, async (msg) => {
      try {
        await this.handleMenuCommand(msg);
      } catch (error) {
        console.error('Error handling /menu command:', error);
        await MessageFormatter.safeSendMessage(this.bot, msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });
  }
}
