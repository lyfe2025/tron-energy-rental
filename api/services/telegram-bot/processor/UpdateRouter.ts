/**
 * 更新路由分发器
 * 负责识别和分发不同类型的 Telegram 更新
 */
import { CallbackProcessor } from './CallbackProcessor.ts';
import { MessageProcessor } from './MessageProcessor.ts';
import type {
    UpdateRouter as IUpdateRouter,
    MessageProcessResult,
    ProcessorDependencies
} from './types.ts';

export class UpdateRouter implements IUpdateRouter {
  private messageProcessor: MessageProcessor;
  private callbackProcessor: CallbackProcessor;
  private dependencies: ProcessorDependencies;

  constructor(dependencies: ProcessorDependencies) {
    this.dependencies = dependencies;
    this.messageProcessor = new MessageProcessor(dependencies);
    this.callbackProcessor = new CallbackProcessor(dependencies);
  }

  /**
   * 更新依赖
   */
  updateDependencies(dependencies: Partial<ProcessorDependencies>): void {
    this.dependencies = { ...this.dependencies, ...dependencies };
    this.messageProcessor.updateDependencies(this.dependencies);
    this.callbackProcessor.updateDependencies(this.dependencies);
  }

  /**
   * 路由处理不同类型的更新
   */
  async route(update: any): Promise<MessageProcessResult> {
    try {
      // 记录收到的更新
      await this.dependencies.logger.logBotActivity(
        'debug', 
        'update_received', 
        '收到Telegram更新', 
        { 
          updateId: update.update_id,
          hasMessage: !!update.message,
          hasCallbackQuery: !!update.callback_query,
          hasEditedMessage: !!update.edited_message
        }
      );

      // 处理普通消息
      if (update.message) {
        return await this.messageProcessor.processMessage(update.message);
      }

      // 处理回调查询
      if (update.callback_query) {
        return await this.callbackProcessor.processCallbackQuery(update.callback_query);
      }

      // 处理编辑消息（暂时不处理，只记录）
      if (update.edited_message) {
        await this.dependencies.logger.logBotActivity(
          'info', 
          'edited_message_ignored', 
          '忽略编辑消息', 
          { 
            messageId: update.edited_message.message_id,
            chatId: update.edited_message.chat.id
          }
        );
        return { success: true, action: 'ignored', description: '编辑消息已忽略' };
      }

      // 处理其他类型的更新（内联查询、频道帖子等）
      await this.dependencies.logger.logBotActivity(
        'info', 
        'unsupported_update_type', 
        '不支持的更新类型', 
        { update }
      );

      return { 
        success: true, 
        action: 'unsupported', 
        description: '不支持的更新类型' 
      };

    } catch (error) {
      console.error('❌ 路由处理失败:', error);
      
      await this.dependencies.logger.logBotActivity(
        'error', 
        'route_processing_failed', 
        `路由处理失败: ${error.message}`, 
        {
          error: error.stack,
          update
        }
      );

      return { 
        success: false, 
        error: error as Error,
        action: 'route_error',
        description: '路由处理失败'
      };
    }
  }

  /**
   * 获取消息处理器（用于直接调用）
   */
  getMessageProcessor(): MessageProcessor {
    return this.messageProcessor;
  }

  /**
   * 获取回调查询处理器（用于直接调用）
   */
  getCallbackProcessor(): CallbackProcessor {
    return this.callbackProcessor;
  }
}
