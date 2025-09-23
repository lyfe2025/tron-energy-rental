/**
 * 文本消息处理器 (重构版)
 * 负责协调各个子模块处理普通文本消息
 */
import type {
    TextMessageHandler as ITextMessageHandler,
    MessageProcessResult,
    ProcessorDependencies
} from '../../types.ts';
import { ButtonActionHandler } from './handlers/ButtonActionHandler.ts';

export class TextMessageHandler implements ITextMessageHandler {
  private dependencies: ProcessorDependencies;
  private buttonActionHandler: ButtonActionHandler;

  constructor(dependencies: ProcessorDependencies) {
    this.dependencies = dependencies;
    this.buttonActionHandler = new ButtonActionHandler(dependencies);
  }

  /**
   * 更新依赖
   */
  updateDependencies(dependencies: Partial<ProcessorDependencies>): void {
    this.dependencies = { ...this.dependencies, ...dependencies };
    this.buttonActionHandler.updateDependencies(dependencies);
  }

  /**
   * 处理回复键盘按钮文本（兼容接口）
   */
  async handleReplyKeyboardButtons(message: any, text: string): Promise<boolean> {
    const result = await this.buttonActionHandler.handleReplyKeyboardButtons(message, text);
    return result.processed;
  }

  /**
   * 处理普通文本消息
   */
  async handleTextMessage(message: any): Promise<MessageProcessResult> {
    try {
      const originalText = message.text.trim();
      const text = originalText.toLowerCase();
      
      console.log('💬 处理文本消息:', originalText.substring(0, 100));

      let responseAction = 'text_response';
      let responseDescription = '默认响应';

      // 处理回复键盘按钮文本
      const buttonResult = await this.buttonActionHandler.handleReplyKeyboardButtons(message, originalText);
      if (buttonResult.processed) {
        return { 
          success: buttonResult.success, 
          action: buttonResult.action || 'reply_keyboard_response',
          description: buttonResult.description || '回复键盘按钮已处理',
          error: buttonResult.error
        };
      }

      // 简单的关键词响应
      if (text.includes('帮助') || text.includes('help')) {
        await this.dependencies.commandHandler.handleHelpCommand(message);
        responseAction = 'help_response';
        responseDescription = '帮助响应';
      } else if (text.includes('菜单') || text.includes('menu')) {
        await this.dependencies.keyboardBuilder.showMainMenu(message.chat.id);
        responseAction = 'menu_response';
        responseDescription = '菜单响应';
      } else if (text.includes('余额') || text.includes('balance')) {
        await this.dependencies.commandHandler.handleBalanceCommand(message);
        responseAction = 'balance_response';
        responseDescription = '余额查询响应';
      } else {
        // 默认响应
        await this.dependencies.api.sendMessage(
          message.chat.id,
          '您好！我是TRON能量租赁机器人。\n\n' +
          '发送 /menu 查看主菜单\n' +
          '发送 /help 获取帮助\n' +
          '发送 /start 重新开始'
        );
      }

      // 记录机器人响应
      await this.dependencies.logger.logBotActivity(
        'info', 
        responseAction, 
        `机器人响应: ${responseDescription}`, 
        {
          chatId: message.chat.id,
          userId: message.from?.id,
          userMessage: message.text.substring(0, 100),
          responseType: responseAction
        }
      );

      return { 
        success: true, 
        action: responseAction,
        description: responseDescription
      };

    } catch (error) {
      console.error('❌ 文本消息处理失败:', error);
      
      await this.dependencies.logger.logBotActivity(
        'error', 
        'text_message_failed', 
        `文本消息处理失败: ${error.message}`, 
        {
          error: error.stack,
          message
        }
      );

      return { 
        success: false, 
        error: error as Error,
        action: 'text_message_error',
        description: '文本消息处理失败'
      };
    }
  }
}
