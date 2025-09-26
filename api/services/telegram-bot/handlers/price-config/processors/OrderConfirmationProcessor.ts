/**
 * 订单确认处理器
 * 从PriceConfigMessageHandler中分离出的订单确认处理逻辑
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../../config/database.ts';
import { TransactionPackageOrderService } from '../../../../order/TransactionPackageOrderService.ts';
import { KeyboardBuilder } from '../builders/KeyboardBuilder.ts';
import { TransactionPackageFormatter } from '../formatters/TransactionPackageFormatter.ts';

export class OrderConfirmationProcessor {
  private bot: TelegramBot;
  private botId: string;
  private transactionPackageOrderService: TransactionPackageOrderService;

  constructor(bot: TelegramBot, botId: string) {
    this.bot = bot;
    this.botId = botId;
    this.transactionPackageOrderService = new TransactionPackageOrderService();
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
        
        // 🎯 标记当前显示的是TRX版本还是USDT版本，用于生成正确的键盘
        const usingTrxTemplate = !!(config?.order_config?.confirmation_template_trx);
        console.log('📋 订单确认信息生成完成:', {
          orderType: contextData.orderType,
          usingTrxTemplate: usingTrxTemplate,
          messageLength: confirmationText.length
        });
        
        // 🎯 重要：在确认信息生成的同时创建笔数套餐订单
        console.log('📝 [笔数套餐] 创建订单中...');
        try {
          // 获取配置中的价格信息
          const orderConfig = config.order_config || {};
          const basePrice = orderConfig.base_price || 0;
          const pricePerTransaction = orderConfig.price_per_transaction || 0;
          const totalPrice = basePrice + (contextData.transactionCount * pricePerTransaction);

          const orderRequest = {
            userId: message.from?.id?.toString() || '0',
            priceConfigId: parseInt(configResult.rows[0].id || '0'),
            price: totalPrice,
            targetAddress: address,
            transactionCount: contextData.transactionCount,
            networkId: contextData.networkId, // 移除默认值，让服务内部处理
            botId: this.botId // 添加机器人ID
          };

          const createdOrder = await this.transactionPackageOrderService.createTransactionPackageOrder(orderRequest);
          
          console.log('✅ [笔数套餐] 订单创建成功:', {
            orderNumber: createdOrder.order_number,
            userId: message.from?.id,
            transactionCount: contextData.transactionCount,
            totalPrice: totalPrice
          });
        } catch (createError) {
          console.error('❌ [笔数套餐] 订单创建异常:', createError);
        }
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
        
        // 🎯 如果当前显示的是TRX版本，调整键盘按钮文本
        const usingTrxTemplate = !!(config?.order_config?.confirmation_template_trx);
        let keyboardConfig = config.order_config.inline_keyboard;
        
        if (usingTrxTemplate) {
          // 创建修改后的键盘配置，将"切换TRX支付"改为"切换USDT支付"
          keyboardConfig = {
            ...keyboardConfig,
            buttons: keyboardConfig.buttons?.map((button: any) => {
              if (button.callback_data === 'switch_currency_trx') {
                return {
                  ...button,
                  text: '💵 切换 USDT 支付',
                  callback_data: 'switch_currency_usdt'
                };
              }
              return button;
            }) || []
          };
          console.log('📋 调整键盘按钮:', { originalButtons: config.order_config.inline_keyboard.buttons?.length, adjustedButtons: keyboardConfig.buttons?.length });
        }
        
        const keyboard = KeyboardBuilder.buildConfirmationInlineKeyboard(keyboardConfig, extendedContextData);
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
