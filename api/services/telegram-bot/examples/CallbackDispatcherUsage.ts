/**
 * 回调调度系统使用示例
 * 展示如何使用新的动态回调调度系统
 */

import TelegramBot from 'node-telegram-bot-api';
import { CallbackDispatcher } from '../core/CallbackDispatcher.ts';
import type { CallbackContext, CallbackHandler } from '../core/CallbackDispatcher.ts';
import { DynamicButtonMapper } from '../core/DynamicButtonMapper.ts';

// 示例：创建自定义回调处理器
class CustomOrderHandler implements CallbackHandler {
  private bot: TelegramBot;
  
  // 实现索引签名
  [methodName: string]: ((context: CallbackContext, params?: any) => Promise<void>) | any;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  /**
   * 显示用户订单
   */
  async showUserOrders(context: CallbackContext, params?: any): Promise<void> {
    await this.bot.sendMessage(context.chatId, `📋 正在加载您的订单...`);
    
    // 实际的订单查询逻辑
    // const orders = await orderService.getUserOrders(context.userId);
    
    await this.bot.sendMessage(context.chatId, `📋 您的订单列表:\n\n暂无订单`);
  }

  /**
   * 确认订单
   */
  async confirmOrder(context: CallbackContext, orderId?: string): Promise<void> {
    if (!orderId) {
      await this.bot.sendMessage(context.chatId, '❌ 订单ID不能为空');
      return;
    }

    await this.bot.sendMessage(context.chatId, `✅ 正在确认订单: ${orderId}`);
    
    // 实际的订单确认逻辑
    // const result = await orderService.confirmOrder(orderId);
    
    await this.bot.sendMessage(context.chatId, `✅ 订单 ${orderId} 确认成功！`);
  }

  /**
   * 取消订单
   */
  async cancelOrder(context: CallbackContext, orderId?: string): Promise<void> {
    if (!orderId) {
      await this.bot.sendMessage(context.chatId, '❌ 订单ID不能为空');
      return;
    }

    await this.bot.sendMessage(context.chatId, `❌ 正在取消订单: ${orderId}`);
    
    // 实际的订单取消逻辑
    // const result = await orderService.cancelOrder(orderId);
    
    await this.bot.sendMessage(context.chatId, `❌ 订单 ${orderId} 已取消`);
  }
}

// 示例：使用调度系统
export async function setupCallbackDispatcherExample() {
  const bot = new TelegramBot('YOUR_BOT_TOKEN');
  
  // 模拟日志器
  const logger = {
    logBotActivity: async (level: string, action: string, message: string, metadata?: any) => {
      console.log(`[${level.toUpperCase()}] ${action}: ${message}`, metadata);
    }
  };

  // 创建调度器
  const dispatcher = new CallbackDispatcher(bot, logger);

  // 注册自定义处理器
  const orderHandler = new CustomOrderHandler(bot);
  dispatcher.registerHandler('order', orderHandler);

  // 注册其他处理器...
  // dispatcher.registerHandler('user', userHandler);
  // dispatcher.registerHandler('help', helpHandler);

  console.log(`已注册处理器: ${dispatcher.getRegisteredHandlers().join(', ')}`);

  // 初始化按钮映射器
  const buttonMapper = new DynamicButtonMapper();
  await buttonMapper.loadButtonMappings();

  // 设置机器人消息处理
  bot.on('callback_query', async (callbackQuery) => {
    await dispatcher.dispatch(callbackQuery);
  });

  bot.on('message', async (message) => {
    if (message.text && !message.text.startsWith('/')) {
      // 检查是否为回复键盘按钮
      const callbackData = buttonMapper.getCallbackData(message.text);
      if (callbackData) {
        // 模拟回调查询
        const mockCallbackQuery = {
          id: `mock_${Date.now()}`,
          from: message.from!,
          message: message,
          chat_instance: `mock_${message.chat.id}`,
          data: callbackData
        };
        
        await dispatcher.dispatch(mockCallbackQuery);
      }
    }
  });

  return { dispatcher, buttonMapper };
}

// 示例：不同的回调数据格式
export const callbackDataExamples = {
  // 1. 简单格式：action:method
  simpleFormat: 'order:showUserOrders',
  
  // 2. 带单个参数：action:method:param
  withSingleParam: 'order:confirmOrder:12345',
  
  // 3. 带多个参数：action:method:param1,param2,param3
  withMultipleParams: 'package:selectPackage:1,energy_flash,basic',
  
  // 4. 带JSON参数：action:method:{"orderId":"12345","type":"confirm"}
  withJsonParams: 'order:confirmOrder:{"orderId":"12345","type":"confirm","source":"inline"}',
  
  // 5. 兼容旧格式
  legacyFormat: 'confirm_order_12345' // 会自动转换为 order:confirmOrder:12345
};

// 示例：创建内联键盘时使用新格式
export const inlineKeyboardExample = {
  inline_keyboard: [
    [
      { text: '📋 我的订单', callback_data: 'order:showUserOrders' },
      { text: '💰 账户余额', callback_data: 'user:showBalance' }
    ],
    [
      { text: '✅ 确认订单', callback_data: 'order:confirmOrder:12345' },
      { text: '❌ 取消订单', callback_data: 'order:cancelOrder:12345' }
    ],
    [
      { text: '📦 选择套餐', callback_data: 'package:selectPackage:{"id":"1","type":"energy"}' }
    ]
  ]
};

// 示例：数据库初始化
export async function initializeDatabaseExample() {
  try {
    // 创建按钮配置表
    await DynamicButtonMapper.createTableIfNotExists();
    
    // 初始化默认按钮配置
    await DynamicButtonMapper.initializeDefaultButtons();
    
    console.log('✅ 数据库初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
}

// 示例：迁移指南
export const migrationGuide = {
  // 旧的硬编码方式：
  oldWay: `
    // 旧代码（硬编码）
    const buttonMappings = {
      '⚡ 能量闪租': 'energy_flash',
      '📋 我的订单': 'my_orders',
      // ...
    };
    
    if (text === '⚡ 能量闪租') {
      await handleEnergyFlash(message);
    } else if (text === '📋 我的订单') {
      await handleMyOrders(message);
    }
  `,
  
  // 新的动态方式：
  newWay: `
    // 新代码（动态调度）
    const buttonMapper = new DynamicButtonMapper();
    const callbackData = buttonMapper.getCallbackData(text);
    
    if (callbackData) {
      const mockCallbackQuery = {
        id: \`mock_\${Date.now()}\`,
        from: message.from,
        message: message,
        data: callbackData
      };
      
      await dispatcher.dispatch(mockCallbackQuery);
    }
  `,
  
  benefits: [
    '✅ 不再需要硬编码按钮映射',
    '✅ 支持从数据库动态配置按钮',
    '✅ 统一的回调处理机制',
    '✅ 更好的代码组织和维护性',
    '✅ 支持复杂的参数传递',
    '✅ 向后兼容旧的回调格式'
  ]
};
