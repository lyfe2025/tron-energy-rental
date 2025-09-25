/**
 * 订单确认处理器
 * 从PriceConfigMessageHandler中分离出的订单确认处理逻辑
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../../config/database.ts';
import { KeyboardBuilder } from '../builders/KeyboardBuilder.ts';
import { TransactionPackageFormatter } from '../formatters/TransactionPackageFormatter.ts';

export class OrderConfirmationProcessor {
  private bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  /**
   * 生成订单确认信息
   */
  async generateOrderConfirmation(message: any, address: string, userSession: any): Promise<void> {
    try {
      const contextData = userSession.contextData;
      console.log('📋 生成订单确认信息 (OrderConfirmationProcessor):', {
        orderType: contextData.orderType,
        transactionCount: contextData.transactionCount,
        address: address.substring(0, 10) + '...'
      });

      // 从数据库获取订单确认模板
      const configResult = await query(
        'SELECT config FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
        [contextData.orderType]
      );

      if (configResult.rows.length === 0) {
        await this.bot.sendMessage(
          message.chat.id,
          '❌ 服务配置不可用，请稍后再试。'
        );
        return;
      }

      const config = configResult.rows[0].config;
      
      // 确认模板在 config.order_config.confirmation_template 中
      const confirmationTemplate = config?.order_config?.confirmation_template;
      
      console.log('📋 数据库配置检查:', {
        hasConfig: !!config,
        hasOrderConfig: !!config?.order_config,
        hasConfirmationTemplate: !!confirmationTemplate,
        transactionCount: contextData.transactionCount,
        template: confirmationTemplate?.substring(0, 100) + '...'
      });

      let confirmationText = '';

      // 根据订单类型生成确认信息
      if (contextData.orderType === 'transaction_package') {
        // 笔数套餐确认信息
        confirmationText = TransactionPackageFormatter.formatTransactionPackageConfirmation(config, contextData, address, confirmationTemplate);
      } else {
        // 其他订单类型的确认信息
        confirmationText = confirmationTemplate || '✅ 订单确认信息';
      }

      // 检查是否需要添加内嵌键盘
      const messageOptions: any = { parse_mode: 'Markdown' };
      
      if (config?.order_config?.inline_keyboard?.enabled) {
        // 补充contextData中的用户信息
        const extendedContextData = {
          ...contextData,
          userId: message.from?.id,
          chatId: message.chat.id
        };
        
        const keyboard = KeyboardBuilder.buildConfirmationInlineKeyboard(config.order_config.inline_keyboard, extendedContextData);
        if (keyboard && keyboard.length > 0) {
          messageOptions.reply_markup = {
            inline_keyboard: keyboard
          };
        }
      }

      await this.bot.sendMessage(message.chat.id, confirmationText, messageOptions);

    } catch (error) {
      console.error('❌ 生成订单确认信息失败 (OrderConfirmationProcessor):', error);
      
      await this.bot.sendMessage(
        message.chat.id,
        '❌ 生成订单确认信息时发生错误，请重试。'
      );
    }
  }
}
