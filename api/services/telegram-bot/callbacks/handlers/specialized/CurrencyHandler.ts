/**
 * 货币切换处理器
 * 负责处理USDT和TRX之间的货币切换
 */
import TelegramBot from 'node-telegram-bot-api';
import { StateManager } from '../../../core/StateManager.ts';
import { MessageFormatter } from '../../formatters/MessageFormatter.ts';
import { ResponseFormatter } from '../../utils/ResponseFormatter.ts';

export class CurrencyHandler {
  private bot: TelegramBot;
  private stateManager?: StateManager;

  constructor(bot: TelegramBot, stateManager?: StateManager) {
    this.bot = bot;
    this.stateManager = stateManager;
  }

  /**
   * 处理货币切换（USDT -> TRX）
   */
  async handleCurrencySwitch(chatId: number, orderInfo: any, messageId?: number): Promise<void> {
    try {
      console.log('🔄 处理货币切换:', orderInfo);

      // 从StateManager获取用户地址
      let userAddress = '';
      if (this.stateManager && orderInfo.userId) {
        // 尝试从当前会话获取地址
        let userSession = this.stateManager.getUserSession(parseInt(orderInfo.userId));
        userAddress = userSession?.contextData?.userAddress || '';
        
        // 如果没有找到，尝试从order_confirmation状态获取
        if (!userAddress && userSession && userSession.currentState === 'order_confirmation') {
          userAddress = userSession.contextData?.userAddress || '';
        }
        
        console.log('📍 获取用户地址:', { userAddress, hasSession: !!userSession, orderInfo });
      }

      // 从数据库获取配置
      const { query } = await import('../../../../../config/database.ts');
      const configResult = await query(
        'SELECT config FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
        ['transaction_package']
      );

      if (configResult.rows.length === 0) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 服务配置不可用，请稍后再试。');
        return;
      }

      const config = configResult.rows[0].config;
      
      // 使用TRX专用模板或回退到智能转换
      const trxTemplate = config?.order_config?.confirmation_template_trx;
      let confirmationText: string;
      
      if (trxTemplate) {
        // 使用TRX专用模板
        confirmationText = MessageFormatter.formatTrxConfirmation(config, orderInfo, trxTemplate, userAddress);
      } else {
        // 如果没有TRX模板，回退到智能转换USDT模板
        const usdtTemplate = config?.order_config?.confirmation_template;
        if (!usdtTemplate) {
          await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 订单确认模板未配置，请联系管理员。');
          return;
        }
        confirmationText = MessageFormatter.formatTrxConfirmationFromUsdt(config, orderInfo, usdtTemplate, userAddress);
      }
      
      // 构建切换回USDT的键盘
      const keyboard = [
        [
          { text: '💵 切换回 USDT 支付', callback_data: `switch_currency_usdt_${orderInfo.orderId}_${orderInfo.userId}_${orderInfo.transactionCount}` },
          { text: '❌ 取消订单', callback_data: `cancel_order_${orderInfo.orderId}_${orderInfo.userId}_${orderInfo.transactionCount}` }
        ]
      ];

      // 编辑原消息
      if (messageId) {
        await this.bot.editMessageText(confirmationText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, confirmationText, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      }

    } catch (error) {
      console.error('处理货币切换失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 切换货币失败，请重试。');
    }
  }

  /**
   * 处理切换回USDT支付
   */
  async handleCurrencySwitchBack(chatId: number, orderInfo: any, messageId?: number): Promise<void> {
    try {
      console.log('💵 处理切换回USDT支付:', orderInfo);

      // 从StateManager获取用户地址
      let userAddress = '';
      if (this.stateManager && orderInfo.userId) {
        // 尝试从当前会话获取地址
        let userSession = this.stateManager.getUserSession(parseInt(orderInfo.userId));
        userAddress = userSession?.contextData?.userAddress || '';
        
        // 如果没有找到，尝试从order_confirmation状态获取
        if (!userAddress && userSession && userSession.currentState === 'order_confirmation') {
          userAddress = userSession.contextData?.userAddress || '';
        }
        
        console.log('📍 获取用户地址:', { userAddress, hasSession: !!userSession, orderInfo });
      }

      // 从数据库获取配置
      const { query } = await import('../../../../../config/database.ts');
      const configResult = await query(
        'SELECT config FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
        ['transaction_package']
      );

      if (configResult.rows.length === 0) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 服务配置不可用，请稍后再试。');
        return;
      }

      const config = configResult.rows[0].config;
      
      // 获取主确认模板
      const baseTemplate = config?.order_config?.confirmation_template;
      if (!baseTemplate) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 订单确认模板未配置，请联系管理员。');
        return;
      }

      // 构建USDT版本的确认信息（直接使用原模板）
      const confirmationText = MessageFormatter.formatUsdtConfirmation(config, orderInfo, baseTemplate, userAddress);
      
      // 构建切换到TRX的键盘
      const keyboard = [
        [
          { text: '🔄 切换 TRX 支付', callback_data: `switch_currency_trx_${orderInfo.orderId}_${orderInfo.userId}_${orderInfo.transactionCount}` },
          { text: '❌ 取消订单', callback_data: `cancel_order_${orderInfo.orderId}_${orderInfo.userId}_${orderInfo.transactionCount}` }
        ]
      ];

      // 编辑原消息
      if (messageId) {
        await this.bot.editMessageText(confirmationText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, confirmationText, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      }

    } catch (error) {
      console.error('处理切换回USDT失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 切换货币失败，请重试。');
    }
  }
}
