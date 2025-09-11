/**
 * 命令处理器
 * 负责处理所有 Telegram 机器人命令
 */
import type {
    CommandHandler as ICommandHandler,
    MessageProcessResult,
    ProcessorDependencies
} from './types.js';

export class CommandProcessor implements ICommandHandler {
  private dependencies: ProcessorDependencies;

  constructor(dependencies: ProcessorDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * 更新依赖
   */
  updateDependencies(dependencies: Partial<ProcessorDependencies>): void {
    this.dependencies = { ...this.dependencies, ...dependencies };
  }

  /**
   * 处理具体的命令
   */
  async handleCommand(command: string, message: any): Promise<MessageProcessResult> {
    try {
      console.log(`🎯 处理命令: /${command}`);

      let result: MessageProcessResult;

      switch (command) {
        case 'start':
          result = await this.handleStartCommand(message);
          break;
        case 'menu':
          result = await this.handleMenuCommand(message);
          break;
        case 'help':
          result = await this.handleHelpCommand(message);
          break;
        case 'balance':
          result = await this.handleBalanceCommand(message);
          break;
        case 'orders':
          result = await this.handleOrdersCommand(message);
          break;
        default:
          result = await this.handleUnknownCommand(command, message);
          break;
      }

      await this.dependencies.logger.logBotActivity(
        'info', 
        'command_handled', 
        `命令处理成功: /${command}`, 
        {
          command,
          chatId: message.chat.id,
          userId: message.from?.id,
          result
        }
      );

      return result;

    } catch (error) {
      console.error(`❌ 命令处理失败: /${command}`, error);
      
      try {
        await this.dependencies.api.sendMessage(
          message.chat.id,
          '抱歉，命令处理时出现错误，请稍后重试。'
        );
      } catch (sendError) {
        console.error('发送错误提示失败:', sendError);
      }

      await this.dependencies.logger.logBotActivity(
        'error', 
        'command_handling_failed', 
        `命令处理失败: /${command} - ${error.message}`, 
        {
          command,
          chatId: message.chat.id,
          userId: message.from?.id,
          error: error.stack
        }
      );

      return { 
        success: false, 
        error: error as Error,
        action: 'command_error',
        description: `命令处理失败: /${command}`
      };
    }
  }

  /**
   * 处理 /start 命令
   */
  private async handleStartCommand(message: any): Promise<MessageProcessResult> {
    try {
      await this.dependencies.commandHandler.handleStartCommand(message);
      // 显示主菜单键盘
      await this.dependencies.keyboardBuilder.showMainMenu(message.chat.id);
      
      return { 
        success: true, 
        action: 'start_command',
        description: '开始命令已处理'
      };
    } catch (error) {
      console.error('处理 /start 命令失败:', error);
      throw error;
    }
  }

  /**
   * 处理 /menu 命令
   */
  private async handleMenuCommand(message: any): Promise<MessageProcessResult> {
    try {
      await this.dependencies.keyboardBuilder.showMainMenu(message.chat.id);
      
      return { 
        success: true, 
        action: 'menu_command',
        description: '菜单命令已处理'
      };
    } catch (error) {
      console.error('处理 /menu 命令失败:', error);
      throw error;
    }
  }

  /**
   * 处理 /help 命令
   */
  private async handleHelpCommand(message: any): Promise<MessageProcessResult> {
    try {
      await this.dependencies.commandHandler.handleHelpCommand(message);
      
      return { 
        success: true, 
        action: 'help_command',
        description: '帮助命令已处理'
      };
    } catch (error) {
      console.error('处理 /help 命令失败:', error);
      throw error;
    }
  }

  /**
   * 处理 /balance 命令
   */
  private async handleBalanceCommand(message: any): Promise<MessageProcessResult> {
    try {
      await this.dependencies.commandHandler.handleBalanceCommand(message);
      
      return { 
        success: true, 
        action: 'balance_command',
        description: '余额命令已处理'
      };
    } catch (error) {
      console.error('处理 /balance 命令失败:', error);
      throw error;
    }
  }

  /**
   * 处理 /orders 命令
   */
  private async handleOrdersCommand(message: any): Promise<MessageProcessResult> {
    try {
      await this.dependencies.commandHandler.handleOrdersCommand(message);
      
      return { 
        success: true, 
        action: 'orders_command',
        description: '订单命令已处理'
      };
    } catch (error) {
      console.error('处理 /orders 命令失败:', error);
      throw error;
    }
  }

  /**
   * 处理未知命令
   */
  private async handleUnknownCommand(command: string, message: any): Promise<MessageProcessResult> {
    try {
      await this.dependencies.api.sendMessage(
        message.chat.id,
        `未知命令: /${command}\n\n发送 /help 查看可用命令`
      );
      
      return { 
        success: true, 
        action: 'unknown_command',
        description: `未知命令: /${command}`
      };
    } catch (error) {
      console.error('处理未知命令失败:', error);
      throw error;
    }
  }
}
