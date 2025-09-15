/**
 * Help命令处理器
 * 处理/help命令和帮助支持功能
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../config/database.js';
import { CommandValidator } from '../middleware/CommandValidator.js';
import { UserContextManager } from '../middleware/UserContextManager.js';
import type { BotConfig, CommandHandlerDependencies } from '../types/command.types.js';
import { MessageFormatter } from '../utils/MessageFormatter.js';
import { PlaceholderReplacer } from '../utils/PlaceholderReplacer.js';

export class HelpCommandHandler {
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
   * 处理 /help 命令
   */
  async handleHelpCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramUser = msg.from;
    
    if (!CommandValidator.validateChatInfo(chatId)) {
      return;
    }
    
    try {
      // 更新用户上下文
      if (telegramUser) {
        UserContextManager.createOrUpdateContext(msg, this.botId);
        UserContextManager.setCurrentCommand(telegramUser.id, '/help');
      }

      // 获取机器人配置
      const botConfig = await this.getBotConfig();
      
      // 使用配置的帮助消息，如果没有配置则使用默认消息
      let helpMessage = MessageFormatter.createDefaultHelpMessage();

      // 如果机器人配置了自定义帮助消息，则使用自定义消息
      if (botConfig?.help_message && botConfig.help_message.trim()) {
        helpMessage = botConfig.help_message;
      }

      // 替换用户占位符
      if (telegramUser) {
        helpMessage = PlaceholderReplacer.replacePlaceholders(helpMessage, telegramUser);
      }

      await MessageFormatter.safeSendMessage(this.bot, chatId, helpMessage);
    } catch (error) {
      console.error('Error in handleHelpCommand:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取帮助信息失败，请重试。');
    }
  }

  /**
   * 处理帮助支持按钮
   */
  async handleHelpSupportButton(msg: TelegramBot.Message): Promise<void> {
    await this.handleHelpCommand(msg);
  }

  /**
   * 处理帮助支持回调
   */
  async handleHelpSupportCallback(chatId: number): Promise<void> {
    try {
      // 获取机器人配置
      const botConfig = await this.getBotConfig();
      
      // 使用配置的帮助消息，如果没有配置则使用默认消息
      let helpMessage = MessageFormatter.createDefaultHelpMessage();

      // 如果机器人配置了自定义帮助消息，则使用自定义消息
      if (botConfig?.help_message && botConfig.help_message.trim()) {
        helpMessage = botConfig.help_message;
      }

      // 添加快捷操作按钮
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📱 返回主菜单', callback_data: 'refresh_menu' },
            { text: '📋 我的订单', callback_data: 'my_orders' }
          ],
          [
            { text: '💰 账户余额', callback_data: 'check_balance' },
            { text: '⚡ 购买能量', callback_data: 'buy_energy' }
          ]
        ]
      };

      await MessageFormatter.safeSendMessage(this.bot, chatId, helpMessage, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error in handleHelpSupportCallback:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取帮助信息失败，请重试。');
    }
  }

  /**
   * 创建扩展帮助消息
   */
  createExtendedHelpMessage(): string {
    return `📖 TRON能量租赁机器人详细使用指南

🤖 **基础命令：**
• /start - 启动机器人并注册账户
• /menu - 显示主菜单
• /help - 显示此帮助信息
• /balance - 查询账户余额和统计
• /orders - 查看订单历史记录

🔋 **能量租赁流程：**
1️⃣ 点击"⚡ 能量闪租"选择套餐
2️⃣ 确认订单信息和接收地址
3️⃣ 完成TRX支付
4️⃣ 等待系统自动委托能量
5️⃣ 查看委托状态和剩余时间

💰 **套餐类型：**
• **能量闪租**：按能量数量计费，适合偶尔使用
• **笔数套餐**：按交易次数计费，适合频繁交易
• **TRX闪兑**：快速兑换TRX和USDT

⚠️ **重要注意事项：**
• 请确保TRON地址正确无误
• 支付后请耐心等待区块确认
• 能量委托有效期通常为24小时
• 委托期间请勿冻结或转移相关资源

📞 **客服支持：**
如遇到问题，请联系客服获取帮助
• 工作时间：7x24小时
• 响应时间：通常在30分钟内

💡 **小贴士：**
• 建议在交易前预先租赁能量
• 大额交易建议分批进行
• 定期查看订单状态确保正常`;
  }

  /**
   * 注册Help命令处理器
   */
  registerHelpCommand(): void {
    this.bot.onText(/\/help/, async (msg) => {
      try {
        await this.handleHelpCommand(msg);
      } catch (error) {
        console.error('Error handling /help command:', error);
        await MessageFormatter.safeSendMessage(this.bot, msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });
  }
}
