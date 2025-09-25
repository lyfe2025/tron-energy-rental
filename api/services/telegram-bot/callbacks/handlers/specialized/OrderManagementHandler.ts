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
  async handleOrderCancellation(chatId: number, orderId: string, messageId?: number): Promise<void> {
    try {
      console.log('❌ 处理订单取消:', orderId);

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
