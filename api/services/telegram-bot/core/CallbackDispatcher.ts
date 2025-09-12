/**
 * Telegram机器人回调调度器
 * 基于回调数据的方法调度系统，支持动态注册处理器
 */
import TelegramBot from 'node-telegram-bot-api';

export interface CallbackContext {
  chatId: number;
  userId?: number;
  username?: string;
  messageId?: number;
  callbackQuery: TelegramBot.CallbackQuery;
}

export interface CallbackHandler {
  [methodName: string]: (context: CallbackContext, params?: any) => Promise<void>;
}

export interface CallbackAction {
  action: string;
  method: string;
  params?: any;
}

export class CallbackDispatcher {
  private handlers: Map<string, CallbackHandler> = new Map();
  private bot: TelegramBot;
  private logger: {
    logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
  };

  constructor(
    bot: TelegramBot,
    logger: {
      logBotActivity: (level: string, action: string, message: string, metadata?: any) => Promise<void>;
    }
  ) {
    this.bot = bot;
    this.logger = logger;
  }

  /**
   * 注册回调处理器
   */
  registerHandler(actionType: string, handler: CallbackHandler): void {
    this.handlers.set(actionType, handler);
    console.log(`📋 注册回调处理器: ${actionType}`);
  }

  /**
   * 解析回调数据
   * 支持格式：
   * 1. "action:method" - 简单格式
   * 2. "action:method:param1,param2" - 带参数格式
   * 3. "action:method:{"key":"value"}" - 带JSON参数格式
   * 4. "legacy_callback_data" - 兼容旧格式
   */
  private parseCallbackData(data: string): CallbackAction | null {
    try {
      // 检查是否是新格式（包含冒号）
      if (data.includes(':')) {
        const parts = data.split(':');
        
        if (parts.length >= 2) {
          const action = parts[0];
          const method = parts[1];
          let params = null;

          // 解析参数（如果存在）
          if (parts.length > 2) {
            const paramString = parts.slice(2).join(':');
            
            // 尝试解析为JSON
            if (paramString.startsWith('{') && paramString.endsWith('}')) {
              try {
                params = JSON.parse(paramString);
              } catch (e) {
                // 如果不是有效JSON，当作字符串处理
                params = paramString;
              }
            } else if (paramString.includes(',')) {
              // 逗号分隔的参数
              params = paramString.split(',').map(p => p.trim());
            } else {
              // 单个参数
              params = paramString;
            }
          }

          return { action, method, params };
        }
      }

      // 旧格式兼容处理
      return this.parseLegacyCallback(data);
    } catch (error) {
      console.error('解析回调数据失败:', error);
      return null;
    }
  }

  /**
   * 解析旧格式回调数据（兼容性支持）
   */
  private parseLegacyCallback(data: string): CallbackAction | null {
    // 映射旧的回调数据到新的action:method格式
    const legacyMappings: Record<string, CallbackAction> = {
      'buy_energy': { action: 'menu', method: 'showEnergyPackages' },
      'my_orders': { action: 'order', method: 'showUserOrders' },
      'check_balance': { action: 'user', method: 'showBalance' },
      'help_support': { action: 'help', method: 'showHelp' },
      'refresh_menu': { action: 'menu', method: 'showMainMenu' },
      'energy_flash': { action: 'price', method: 'showEnergyFlash' },
      'transaction_package': { action: 'price', method: 'showTransactionPackage' },
      'trx_exchange': { action: 'price', method: 'showTrxExchange' },
    };

    // 处理TRX兑换回调
    if (data.startsWith('trx_exchange_')) {
      if (data === 'trx_exchange_usdt_to_trx') {
        return {
          action: 'price',
          method: 'handleTrxExchangeUsdtToTrx',
          params: 'usdt_to_trx'
        };
      } else if (data === 'trx_exchange_trx_to_usdt') {
        return {
          action: 'price',
          method: 'handleTrxExchangeTrxToUsdt',
          params: 'trx_to_usdt'
        };
      }
    }

    // 处理以特定前缀开头的回调
    if (data.startsWith('package_')) {
      return {
        action: 'package',
        method: 'selectPackage',
        params: data.replace('package_', '')
      };
    } else if (data.startsWith('confirm_package_')) {
      return {
        action: 'package',
        method: 'confirmPackage',
        params: data.replace('confirm_package_', '')
      };
    } else if (data.startsWith('cancel_package_')) {
      return {
        action: 'package',
        method: 'cancelPackage',
        params: data.replace('cancel_package_', '')
      };
    } else if (data.startsWith('confirm_order_')) {
      return {
        action: 'order',
        method: 'confirmOrder',
        params: data.replace('confirm_order_', '')
      };
    } else if (data.startsWith('cancel_order_')) {
      return {
        action: 'order',
        method: 'cancelOrder',
        params: data.replace('cancel_order_', '')
      };
    } else if (data.startsWith('delegation_status_')) {
      return {
        action: 'delegation',
        method: 'showStatus',
        params: data.replace('delegation_status_', '')
      };
    }

    return legacyMappings[data] || null;
  }

  /**
   * 调度回调处理
   */
  async dispatch(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message?.chat.id;
    
    if (!data || !chatId) {
      console.warn('无效的回调查询数据');
      return;
    }

    try {
      // 先回应回调查询
      await this.bot.answerCallbackQuery(callbackQuery.id);

      // 解析回调数据
      const callbackAction = this.parseCallbackData(data);
      if (!callbackAction) {
        console.warn(`无法解析回调数据: ${data}`);
        await this.sendErrorMessage(chatId, '无效的操作');
        return;
      }

      // 构建上下文
      const context: CallbackContext = {
        chatId,
        userId: callbackQuery.from?.id,
        username: callbackQuery.from?.username,
        messageId: callbackQuery.message?.message_id,
        callbackQuery
      };

      // 记录回调处理
      await this.logger.logBotActivity('info', 'callback_dispatched', 
        `调度回调: ${callbackAction.action}:${callbackAction.method}`, {
          action: callbackAction.action,
          method: callbackAction.method,
          params: callbackAction.params,
          chatId,
          userId: context.userId,
          originalData: data
        });

      // 查找并执行处理器
      const handler = this.handlers.get(callbackAction.action);
      if (!handler) {
        console.warn(`未找到处理器: ${callbackAction.action}`);
        await this.sendErrorMessage(chatId, '操作暂不支持');
        return;
      }

      const method = handler[callbackAction.method];
      if (!method || typeof method !== 'function') {
        console.warn(`未找到方法: ${callbackAction.action}.${callbackAction.method}`);
        await this.sendErrorMessage(chatId, '操作方法不存在');
        return;
      }

      // 执行处理方法
      await method.call(handler, context, callbackAction.params);

      // 记录成功执行
      await this.logger.logBotActivity('info', 'callback_executed', 
        `成功执行回调: ${callbackAction.action}:${callbackAction.method}`, {
          action: callbackAction.action,
          method: callbackAction.method,
          chatId,
          userId: context.userId
        });

    } catch (error) {
      console.error('回调调度失败:', error);
      
      await this.logger.logBotActivity('error', 'callback_dispatch_failed', 
        `回调调度失败: ${error.message}`, {
          error: error.stack,
          callbackData: data,
          chatId,
          userId: callbackQuery.from?.id
        });

      // 尝试回应回调查询（如果还没有回应）
      try {
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: '操作失败，请稍后重试',
          show_alert: true
        });
      } catch (answerError) {
        console.error('回应回调查询失败:', answerError);
      }

      await this.sendErrorMessage(chatId, '操作失败，请稍后重试');
    }
  }

  /**
   * 发送错误消息
   */
  private async sendErrorMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, `❌ ${message}`);
    } catch (error) {
      console.error('发送错误消息失败:', error);
    }
  }

  /**
   * 获取已注册的处理器列表
   */
  getRegisteredHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 取消注册处理器
   */
  unregisterHandler(actionType: string): boolean {
    return this.handlers.delete(actionType);
  }
}
