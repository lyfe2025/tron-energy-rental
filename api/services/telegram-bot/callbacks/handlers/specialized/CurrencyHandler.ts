/**
 * 货币切换处理器
 * 负责处理USDT和TRX之间的货币切换
 */
import TelegramBot from 'node-telegram-bot-api';
import { TransactionPackageOrderService } from '../../../../order/TransactionPackageOrderService.ts';
import { StateManager } from '../../../core/StateManager.ts';
import { MessageFormatter } from '../../formatters/MessageFormatter.ts';
import { ResponseFormatter } from '../../utils/ResponseFormatter.ts';

export class CurrencyHandler {
  private bot: TelegramBot;
  private stateManager?: StateManager;
  private transactionPackageOrderService: TransactionPackageOrderService;

  constructor(bot: TelegramBot, stateManager?: StateManager) {
    this.bot = bot;
    this.stateManager = stateManager;
    this.transactionPackageOrderService = new TransactionPackageOrderService();
  }

  /**
   * 处理货币切换（USDT -> TRX）
   */
  async handleCurrencySwitch(chatId: number, orderInfo: any, messageId?: number): Promise<void> {
    try {
      console.log('🔄 处理货币切换:', orderInfo);

      /**
       * 🚨 重要说明：用户ID映射关系
       * ================================
       * orderInfo.userId = telegram_id (来自Telegram机器人的用户ID，是数字类型)
       * realUserId = users表中的真实用户UUID (数据库主键，UUID格式)
       * 
       * 为什么需要映射：
       * - Telegram回调数据中的userId实际上是telegram_id
       * - 数据库orders表的user_id字段存储的是users表的UUID主键
       * - 必须通过telegram_id查询users表获取真实的user_id (UUID)
       * 
       * ⚠️  注意：其他地方如果遇到类似问题，也需要做这个映射！
       */
      let realUserId = null;
      if (orderInfo.userId) {
        const { query } = await import('../../../../../config/database.ts');
        const userResult = await query(
          'SELECT id FROM users WHERE telegram_id = $1',
          [parseInt(orderInfo.userId)]
        );
        
        if (userResult.rows.length > 0) {
          realUserId = userResult.rows[0].id;
          console.log('📍 映射用户ID:', { 
            telegramId: orderInfo.userId, 
            realUserId,
            orderInfo 
          });
        } else {
          console.error('❌ 未找到对应的用户:', { telegramId: orderInfo.userId });
          await this.bot.sendMessage(chatId, '❌ 用户信息不存在，请重新开始');
          return;
        }
      }

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
      
      // 🎯 重要：更新笔数套餐订单的支付方式和过期时间
      try {
        // 检查是否是真正的订单号（长度和格式特征）
        const isRealOrderNumber = orderInfo.orderId && orderInfo.orderId.startsWith('TP') && orderInfo.orderId.length > 15;
        
        if (isRealOrderNumber) {
          // 直接使用订单号更新
          console.log('🔄 [笔数套餐] 直接使用订单号更新支付方式为TRX:', { 
            orderNumber: orderInfo.orderId,
            telegramId: orderInfo.userId
          });
          
          const updateResult = await this.transactionPackageOrderService.updatePaymentCurrency(
            orderInfo.orderId,
            'TRX'
          );
          
          if (updateResult.success) {
            console.log('✅ [笔数套餐] 订单支付方式更新成功:', { orderNumber: orderInfo.orderId });
          } else {
            console.error('❌ [笔数套餐] 订单支付方式更新失败:', updateResult.message);
          }
        } else if (realUserId) {
          // 向后兼容：通过用户ID查找订单（临时标识符的情况）
          console.log('🔄 [笔数套餐] 通过用户ID查找并更新订单支付方式为TRX:', { 
            realUserId, 
            telegramId: orderInfo.userId,
            callbackOrderId: orderInfo.orderId 
          });
          
          // 通过用户ID查找最新的待支付订单
          const { query } = await import('../../../../../config/database.ts');
          const orderResult = await query(
            `SELECT order_number FROM orders 
             WHERE user_id = $1 AND status = 'pending' AND payment_status = 'unpaid' 
             ORDER BY created_at DESC LIMIT 1`,
            [realUserId]
          );
          
          if (orderResult.rows.length > 0) {
            const realOrderNumber = orderResult.rows[0].order_number;
            console.log('📋 找到待支付订单:', { 
              realOrderNumber, 
              realUserId,
              telegramId: orderInfo.userId 
            });
            
            const updateResult = await this.transactionPackageOrderService.updatePaymentCurrency(
              realOrderNumber,
              'TRX'
            );
            
            if (updateResult.success) {
              console.log('✅ [笔数套餐] 订单支付方式更新成功:', { realOrderNumber });
            } else {
              console.error('❌ [笔数套餐] 订单支付方式更新失败:', updateResult.message);
            }
          } else {
            console.error('❌ 未找到待支付的订单:', { realUserId, telegramId: orderInfo.userId });
          }
        }
      } catch (updateError) {
        console.error('❌ [笔数套餐] 订单更新异常:', updateError);
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

      /**
       * 🚨 重要说明：用户ID映射关系
       * ================================
       * orderInfo.userId = telegram_id (来自Telegram机器人的用户ID，是数字类型)
       * realUserId = users表中的真实用户UUID (数据库主键，UUID格式)
       * 
       * 为什么需要映射：
       * - Telegram回调数据中的userId实际上是telegram_id
       * - 数据库orders表的user_id字段存储的是users表的UUID主键
       * - 必须通过telegram_id查询users表获取真实的user_id (UUID)
       * 
       * ⚠️  注意：其他地方如果遇到类似问题，也需要做这个映射！
       */
      let realUserId = null;
      if (orderInfo.userId) {
        const { query } = await import('../../../../../config/database.ts');
        const userResult = await query(
          'SELECT id FROM users WHERE telegram_id = $1',
          [parseInt(orderInfo.userId)]
        );
        
        if (userResult.rows.length > 0) {
          realUserId = userResult.rows[0].id;
          console.log('📍 映射用户ID:', { 
            telegramId: orderInfo.userId, 
            realUserId,
            orderInfo 
          });
        } else {
          console.error('❌ 未找到对应的用户:', { telegramId: orderInfo.userId });
          await this.bot.sendMessage(chatId, '❌ 用户信息不存在，请重新开始');
          return;
        }
      }

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
      
      // 🎯 重要：更新笔数套餐订单的支付方式和过期时间
      try {
        // 检查是否是真正的订单号（长度和格式特征）
        const isRealOrderNumber = orderInfo.orderId && orderInfo.orderId.startsWith('TP') && orderInfo.orderId.length > 15;
        
        if (isRealOrderNumber) {
          // 直接使用订单号更新
          console.log('🔄 [笔数套餐] 直接使用订单号更新支付方式为USDT:', { 
            orderNumber: orderInfo.orderId,
            telegramId: orderInfo.userId
          });
          
          const updateResult = await this.transactionPackageOrderService.updatePaymentCurrency(
            orderInfo.orderId,
            'USDT'
          );
          
          if (updateResult.success) {
            console.log('✅ [笔数套餐] 订单支付方式更新成功:', { orderNumber: orderInfo.orderId });
          } else {
            console.error('❌ [笔数套餐] 订单支付方式更新失败:', updateResult.message);
          }
        } else if (realUserId) {
          // 向后兼容：通过用户ID查找订单（临时标识符的情况）
          console.log('🔄 [笔数套餐] 通过用户ID查找并更新订单支付方式为USDT:', { 
            realUserId, 
            telegramId: orderInfo.userId,
            callbackOrderId: orderInfo.orderId 
          });
          
          // 通过用户ID查找最新的待支付订单
          const { query } = await import('../../../../../config/database.ts');
          const orderResult = await query(
            `SELECT order_number FROM orders 
             WHERE user_id = $1 AND status = 'pending' AND payment_status = 'unpaid' 
             ORDER BY created_at DESC LIMIT 1`,
            [realUserId]
          );
          
          if (orderResult.rows.length > 0) {
            const realOrderNumber = orderResult.rows[0].order_number;
            console.log('📋 找到待支付订单:', { 
              realOrderNumber, 
              realUserId,
              telegramId: orderInfo.userId 
            });
            
            const updateResult = await this.transactionPackageOrderService.updatePaymentCurrency(
              realOrderNumber,
              'USDT'
            );
            
            if (updateResult.success) {
              console.log('✅ [笔数套餐] 订单支付方式更新成功:', { realOrderNumber });
            } else {
              console.error('❌ [笔数套餐] 订单支付方式更新失败:', updateResult.message);
            }
          } else {
            console.error('❌ 未找到待支付的订单:', { realUserId, telegramId: orderInfo.userId });
          }
        }
      } catch (updateError) {
        console.error('❌ [笔数套餐] 订单更新异常:', updateError);
      }
      
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
