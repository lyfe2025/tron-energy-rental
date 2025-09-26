/**
 * 订单管理处理器
 * 负责订单的取消、确认等管理操作
 */
import TelegramBot from 'node-telegram-bot-api';
import { energyDelegationService } from '../../../../energy-delegation.ts';
import { CallbackValidator } from '../../utils/CallbackValidator.ts';
import { ResponseFormatter } from '../../utils/ResponseFormatter.ts';

export class OrderManagementHandler {
  private bot: TelegramBot;
  private orderService: any;

  constructor(bot: TelegramBot, orderServiceInstance: any) {
    this.bot = bot;
    this.orderService = orderServiceInstance;
  }

  /**
   * 处理订单取消
   */
  async handleOrderCancellation(chatId: number, orderInfo: any, messageId?: number): Promise<void> {
    try {
      console.log('❌ 处理订单取消:', orderInfo);

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

      // 取消订单逻辑
      try {
        // 检查是否是真正的订单号（长度和格式特征）
        const isRealOrderNumber = orderInfo.orderId && orderInfo.orderId.startsWith('TP') && orderInfo.orderId.length > 15;
        
        if (isRealOrderNumber) {
          // 直接使用订单号取消
          console.log('🔍 直接使用订单号取消订单:', { 
            orderNumber: orderInfo.orderId,
            telegramId: orderInfo.userId
          });
          
          const canceledOrder = await this.orderService.cancelOrder(orderInfo.orderId, '用户主动取消');
          
          console.log('✅ 订单已成功取消:', {
            inputOrderNumber: orderInfo.orderId,
            orderId: canceledOrder.id,
            orderNumber: canceledOrder.order_number,
            status: canceledOrder.status
          });

          const cancelText = '❌ 订单已取消\n\n如需重新下单，请重新选择套餐。';

          // 删除原消息或编辑为取消状态
          if (messageId) {
            try {
              await this.bot.editMessageText(cancelText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
              });
            } catch (editError) {
              // 如果编辑失败，尝试删除消息
              try {
                await this.bot.deleteMessage(chatId, messageId);
              } catch (deleteError) {
                console.warn('删除消息失败，发送新消息');
              }
              await ResponseFormatter.safeSendMessage(this.bot, chatId, cancelText);
            }
          } else {
            await ResponseFormatter.safeSendMessage(this.bot, chatId, cancelText);
          }
        } else if (realUserId) {
          // 向后兼容：通过用户ID查找订单（临时标识符的情况）
          console.log('🔍 通过用户ID查找并取消订单:', { 
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
            console.log('📋 找到待取消订单:', { 
              realOrderNumber, 
              realUserId,
              telegramId: orderInfo.userId 
            });
            
            const canceledOrder = await this.orderService.cancelOrder(realOrderNumber, '用户主动取消');
            
            console.log('✅ 订单已成功取消:', {
              realOrderNumber,
              orderId: canceledOrder.id,
              orderNumber: canceledOrder.order_number,
              status: canceledOrder.status
            });

            const cancelText = '❌ 订单已取消\n\n如需重新下单，请重新选择套餐。';

            // 删除原消息或编辑为取消状态
            if (messageId) {
              try {
                await this.bot.editMessageText(cancelText, {
                  chat_id: chatId,
                  message_id: messageId,
                  parse_mode: 'Markdown'
                });
              } catch (editError) {
                // 如果编辑失败，尝试删除消息
                try {
                  await this.bot.deleteMessage(chatId, messageId);
                } catch (deleteError) {
                  console.warn('删除消息失败，发送新消息');
                }
                await ResponseFormatter.safeSendMessage(this.bot, chatId, cancelText);
              }
            } else {
              await ResponseFormatter.safeSendMessage(this.bot, chatId, cancelText);
            }
          } else {
            console.error('❌ 未找到待取消的订单:', { realUserId, telegramId: orderInfo.userId });
            await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 没有找到可取消的订单');
          }
        }
      } catch (orderError: any) {
        console.error('❌ 取消订单失败:', orderError);
        
        // 根据错误类型提供不同的用户反馈
        let errorMessage = '❌ 取消订单失败，请重试。';
        
        if (orderError.message?.includes('not found')) {
          errorMessage = '❌ 订单不存在或已被处理。';
        } else if (orderError.message?.includes('Cannot cancel order with status')) {
          // 根据订单状态提供不同的处理
          if (orderError.message.includes('cancelled')) {
            // 订单已经是取消状态，直接删除消息
            console.log('📱 订单已取消，删除Telegram消息');
            try {
              if (messageId) {
                await this.bot.deleteMessage(chatId, messageId);
              }
              return; // 直接返回，不发送错误消息
            } catch (deleteError) {
              console.warn('删除已取消订单消息失败:', deleteError);
              errorMessage = '❌ 订单已取消。';
            }
          } else if (orderError.message.includes('completed') || orderError.message.includes('paid')) {
            // 订单已完成或已支付，编辑消息显示状态
            const statusText = orderError.message.includes('completed') ? '已完成' : '已支付';
            const updateText = `✅ 订单${statusText}\n\n该订单已经${statusText}，无法取消。`;
            try {
              if (messageId) {
                await this.bot.editMessageText(updateText, {
                  chat_id: chatId,
                  message_id: messageId,
                  parse_mode: 'Markdown'
                });
              } else {
                await ResponseFormatter.safeSendMessage(this.bot, chatId, updateText);
              }
              return;
            } catch (editError) {
              console.warn('编辑已完成订单消息失败:', editError);
              errorMessage = `❌ 订单已${statusText}，无法取消。`;
            }
          } else {
            errorMessage = '❌ 该订单当前状态无法取消。';
          }
        }
        
        await ResponseFormatter.safeSendMessage(this.bot, chatId, errorMessage);
      }

    } catch (error) {
      console.error('处理订单取消失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 取消订单失败，请重试。');
    }
  }

  /**
   * 处理订单确认
   */
  async handleOrderConfirmation(chatId: number, orderId: string): Promise<void> {
    if (!CallbackValidator.validateOrderId(orderId)) {
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 订单ID格式无效');
      return;
    }

    try {
      const orderIdNum = parseInt(orderId);
      
      // 获取订单详情
      const order = await this.orderService.getOrderById(orderIdNum);
      if (!order) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 订单不存在');
        return;
      }

      // 检查订单状态
      if (order.status !== 'paid') {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '⏳ 正在确认支付，请稍等...\n\n如果长时间未确认，请联系客服。');
        return;
      }

      await ResponseFormatter.safeSendMessage(this.bot, chatId, '✅ 订单确认成功！正在处理能量代理...');
      
      // 执行能量代理
      const delegationResult = await energyDelegationService.executeDelegation({
        orderId: order.id,
        recipientAddress: order.recipient_address,
        energyAmount: order.energy_amount,
        durationHours: order.duration_hours
      });
      
      if (delegationResult.success) {
        const successMessage = `🎉 *能量代理成功！*

⚡ 能量数量: ${ResponseFormatter.formatNumber(order.energy_amount)} Energy
📍 接收地址: \`${order.recipient_address}\`
⏰ 代理时长: ${order.duration_hours}小时
🔗 交易ID: \`${delegationResult.txId}\`
📋 代理ID: \`${delegationResult.delegationId}\`

✨ 能量已成功代理到您的地址，请查看钱包确认。`;
        
        const keyboard = ResponseFormatter.createInlineKeyboard([
          [{ text: '📊 查看代理状态', callback_data: `delegation_status_${delegationResult.delegationId}` }],
          [{ text: '🔙 返回主菜单', callback_data: 'refresh_menu' }]
        ]);
        
        await ResponseFormatter.safeSendMessage(this.bot, chatId, successMessage, {
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } else {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, 
          '❌ 能量代理失败，请联系客服处理。\n\n' +
          `错误信息: ${delegationResult.error || '未知错误'}`
        );
      }
    } catch (error) {
      console.error('Failed to handle order confirmation:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 确认订单时发生错误，请重试。');
    }
  }
}
