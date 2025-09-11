/**
 * 回调查询处理器
 * 负责处理所有 Telegram 回调查询
 */
import type {
    CallbackHandler as ICallbackHandler,
    MessageProcessResult,
    ProcessorDependencies
} from './types.js';

export class CallbackProcessor implements ICallbackHandler {
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
   * 处理回调查询（支持webhook和polling两种模式）
   */
  async processCallbackQuery(callbackQuery: any): Promise<MessageProcessResult> {
    try {
      const data = callbackQuery.data;
      const chatId = callbackQuery.message?.chat.id;

      console.log('🔘 处理回调查询:', {
        data,
        chatId,
        from: callbackQuery.from?.username
      });

      // 记录用户回调查询
      await this.dependencies.logger.logBotActivity(
        'info', 
        'user_callback_received', 
        `用户回调: ${data}`, 
        {
          chatId,
          userId: callbackQuery.from?.id,
          username: callbackQuery.from?.username,
          callbackData: data
        }
      );

      // 先回应回调查询
      await this.dependencies.api.answerCallbackQuery(callbackQuery.id);

      // 委托给回调处理器的路由方法
      if (this.dependencies.callbackHandler && 
          (this.dependencies.callbackHandler as any).routeCallback) {
        await (this.dependencies.callbackHandler as any).routeCallback(
          chatId, 
          data, 
          callbackQuery
        );
        
        return { 
          success: true, 
          action: 'callback_routed',
          description: '回调查询已路由处理'
        };
      } else {
        console.warn(`回调处理器未正确初始化或缺少routeCallback方法`);
        
        await this.dependencies.logger.logBotActivity(
          'warning', 
          'callback_handler_missing', 
          '回调处理器未正确初始化', 
          { callbackData: data, chatId }
        );

        return { 
          success: false, 
          action: 'callback_handler_missing',
          description: '回调处理器未正确初始化'
        };
      }

    } catch (error) {
      console.error('❌ 处理回调查询失败:', error);
      
      // 尝试回应回调查询，避免用户界面卡住
      try {
        if (this.dependencies.bot) {
          await this.dependencies.bot.answerCallbackQuery(callbackQuery.id, {
            text: '操作失败，请稍后重试',
            show_alert: true
          });
        }
      } catch (answerError) {
        console.error('回应回调查询失败:', answerError);
      }

      await this.dependencies.logger.logBotActivity(
        'error', 
        'callback_processing_failed', 
        `回调查询处理失败: ${error.message}`, 
        {
          error: error.stack,
          callbackQuery
        }
      );

      return { 
        success: false, 
        error: error as Error,
        action: 'callback_error',
        description: '回调查询处理失败'
      };
    }
  }
}
