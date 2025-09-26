/**
 * 地址输入处理器
 * 从PriceConfigMessageHandler中分离出的地址输入处理逻辑
 */
import TelegramBot from 'node-telegram-bot-api';
import { StateManager } from '../../../core/StateManager.ts';
import { AddressValidator } from '../validators/AddressValidator.ts';
import { OrderConfirmationProcessor } from './OrderConfirmationProcessor';

export class AddressInputProcessor {
  private bot: TelegramBot;
  private botId: string;
  private stateManager?: StateManager;

  constructor(bot: TelegramBot, botId: string, stateManager?: StateManager) {
    this.bot = bot;
    this.botId = botId;
    this.stateManager = stateManager;
  }

  /**
   * 处理地址输入
   */
  async handleAddressInput(message: any, address: string, userSession: any): Promise<boolean> {
    try {
      console.log('🏠 处理地址输入 (AddressInputProcessor):', address);

      // 验证 TRON 地址格式
      const addressValidation = AddressValidator.validateTronAddress(address);
      if (!addressValidation.isValid) {
        // 地址格式无效，提示用户重新输入
        await this.bot.sendMessage(
          message.chat.id,
          `❌ ${addressValidation.error}\n\n请重新输入正确的TRON地址：`
        );

        return true; // 已处理该消息
      }

      // 地址验证通过，生成订单确认信息
      const orderProcessor = new OrderConfirmationProcessor(this.bot, this.botId);
      await orderProcessor.generateOrderConfirmation(message, address, userSession);
      
      // 保存地址信息到临时状态，用于货币切换
      if (this.stateManager && message.from?.id) {
        this.stateManager.setUserState(message.from.id, 'order_confirmation', {
          userAddress: address,
          orderType: userSession.contextData.orderType,
          transactionCount: userSession.contextData.transactionCount
        });
      }

      return true; // 已处理该消息

    } catch (error) {
      console.error('❌ 处理地址输入失败 (AddressInputProcessor):', error);
      
      // 清除用户状态
      this.stateManager?.clearUserSession(message.from.id);

      await this.bot.sendMessage(
        message.chat.id,
        '❌ 处理地址时发生错误，请重试。'
      );

      return true; // 已处理该消息
    }
  }
}
