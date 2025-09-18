/**
 * 按钮动作处理器
 * 负责处理回复键盘按钮点击事件
 */
import type {
  ProcessorDependencies,
  ButtonHandlerResult
} from '../types/index.js';
import { MessageMatcher } from '../utils/MessageMatcher.js';
import { PriceConfigHandler } from './PriceConfigHandler.js';

export class ButtonActionHandler {
  private dependencies: ProcessorDependencies;
  private messageMatcher: MessageMatcher;
  private priceConfigHandler: PriceConfigHandler;

  constructor(dependencies: ProcessorDependencies) {
    this.dependencies = dependencies;
    this.messageMatcher = new MessageMatcher(dependencies.botId);
    this.priceConfigHandler = new PriceConfigHandler(dependencies);
  }

  /**
   * 更新依赖
   */
  updateDependencies(dependencies: Partial<ProcessorDependencies>): void {
    this.dependencies = { ...this.dependencies, ...dependencies };
    this.messageMatcher.updateBotId(this.dependencies.botId);
    this.priceConfigHandler.updateDependencies(dependencies);
  }

  /**
   * 处理回复键盘按钮文本
   */
  async handleReplyKeyboardButtons(message: any, text: string): Promise<ButtonHandlerResult> {
    try {
      console.log(`🔍 处理回复键盘按钮: "${text}"`);
      
      // 动态查找按钮对应的callback_data
      const actionType = await this.messageMatcher.findCallbackDataByText(message.chat.id, text);
      if (!actionType) {
        return { success: true, processed: false }; // 不是回复键盘按钮
      }

      console.log(`🎯 识别到回复键盘按钮: "${text}" -> ${actionType}`);

      // 处理不同类型的按钮
      if (actionType === 'my_orders') {
        await this.handleOrdersButton(message, text);
        return { 
          success: true, 
          processed: true, 
          action: 'reply_keyboard_orders',
          description: '回复键盘 - 我的订单'
        };

      } else if (actionType === 'check_balance') {
        await this.handleBalanceButton(message, text);
        return { 
          success: true, 
          processed: true, 
          action: 'reply_keyboard_balance',
          description: '回复键盘 - 账户余额'
        };

      } else if (actionType === 'help_support') {
        await this.handleHelpButton(message, text);
        return { 
          success: true, 
          processed: true, 
          action: 'reply_keyboard_help',
          description: '回复键盘 - 帮助支持'
        };

      } else if (actionType === 'refresh_menu') {
        await this.handleMenuButton(message, text);
        return { 
          success: true, 
          processed: true, 
          action: 'reply_keyboard_menu',
          description: '回复键盘 - 刷新菜单'
        };

      } else if (['energy_flash', 'transaction_package', 'trx_exchange'].includes(actionType)) {
        // 处理价格配置相关的按钮
        console.log(`🎯 检测到价格配置按钮: ${actionType}, 文本: ${text}`);
        await this.priceConfigHandler.handlePriceConfigButton(message, actionType, text);
        console.log(`✅ 价格配置按钮处理完成: ${actionType}`);
        return { 
          success: true, 
          processed: true, 
          action: `price_config_${actionType}`,
          description: `价格配置响应: ${text}`
        };
      }

      return { success: true, processed: false };
    } catch (error) {
      console.error('❌ 处理回复键盘按钮失败:', error);
      await this.dependencies.logger.logBotActivity(
        'error', 
        'reply_keyboard_failed', 
        `回复键盘按钮处理失败: ${error.message}`, 
        {
          error: error.stack,
          buttonText: text,
          chatId: message.chat.id
        }
      );
      return { 
        success: false, 
        processed: false, 
        error: error as Error,
        action: 'reply_keyboard_error',
        description: '回复键盘按钮处理失败'
      };
    }
  }

  /**
   * 处理订单按钮
   */
  private async handleOrdersButton(message: any, text: string): Promise<void> {
    await this.dependencies.commandHandler.handleOrdersCommand(message);
    await this.dependencies.logger.logBotActivity(
      'info', 
      'reply_keyboard_orders', 
      '回复键盘 - 我的订单', 
      { 
        chatId: message.chat.id, 
        buttonText: text 
      }
    );
  }

  /**
   * 处理余额按钮
   */
  private async handleBalanceButton(message: any, text: string): Promise<void> {
    await this.dependencies.commandHandler.handleBalanceCommand(message);
    await this.dependencies.logger.logBotActivity(
      'info', 
      'reply_keyboard_balance', 
      '回复键盘 - 账户余额', 
      { 
        chatId: message.chat.id, 
        buttonText: text 
      }
    );
  }

  /**
   * 处理帮助按钮
   */
  private async handleHelpButton(message: any, text: string): Promise<void> {
    await this.dependencies.commandHandler.handleHelpCommand(message);
    await this.dependencies.logger.logBotActivity(
      'info', 
      'reply_keyboard_help', 
      '回复键盘 - 帮助支持', 
      { 
        chatId: message.chat.id, 
        buttonText: text 
      }
    );
  }

  /**
   * 处理菜单按钮
   */
  private async handleMenuButton(message: any, text: string): Promise<void> {
    await this.dependencies.keyboardBuilder.showMainMenu(message.chat.id);
    await this.dependencies.logger.logBotActivity(
      'info', 
      'reply_keyboard_menu', 
      '回复键盘 - 刷新菜单', 
      { 
        chatId: message.chat.id, 
        buttonText: text 
      }
    );
  }
}
