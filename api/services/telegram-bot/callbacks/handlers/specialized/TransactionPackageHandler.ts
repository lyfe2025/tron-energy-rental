/**
 * 笔数套餐专门处理器
 * 负责处理笔数套餐相关的回调操作
 */
import TelegramBot from 'node-telegram-bot-api';
import { StateManager } from '../../../core/StateManager.ts';
import { CallbackValidator } from '../../utils/CallbackValidator.ts';
import { ResponseFormatter } from '../../utils/ResponseFormatter.ts';

export class TransactionPackageHandler {
  private bot: TelegramBot;
  private stateManager?: StateManager;

  constructor(bot: TelegramBot, stateManager?: StateManager) {
    this.bot = bot;
    this.stateManager = stateManager;
  }

  /**
   * 处理笔数套餐选择（transaction_package_10, transaction_package_20 等）
   */
  async handleTransactionPackageSelection(chatId: number, transactionCount: string, telegramId?: number): Promise<void> {
    if (!CallbackValidator.validateUserInfo(telegramId)) {
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      // 从数据库获取笔数套餐配置
      const { query } = await import('../../../../../config/database.ts');
      const configResult = await query(
        'SELECT id, config, inline_keyboard_config, network_id FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
        ['transaction_package']
      );

      if (configResult.rows.length === 0) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 笔数套餐服务暂不可用，请稍后再试。');
        return;
      }

      const config = configResult.rows[0].config;
      const keyboardConfig = configResult.rows[0].inline_keyboard_config;
      const networkId = configResult.rows[0].network_id; // 获取网络ID

      // 设置用户状态：等待地址输入
      console.log('📝 设置用户状态:', {
        hasStateManager: !!this.stateManager,
        telegramId: telegramId,
        transactionCount: transactionCount
      });
      
      if (this.stateManager && telegramId) {
        // 先创建或更新用户会话
        this.stateManager.updateUserSession(telegramId, chatId, 'waiting_address_input', {
          orderType: 'transaction_package',
          transactionCount: transactionCount,
          configId: configResult.rows[0].id,
          config: config,
          keyboardConfig: keyboardConfig,
          networkId: networkId // 添加网络ID到contextData
        });
        
        // 验证状态是否设置成功
        const userSession = this.stateManager.getUserSession(telegramId);
        console.log('✅ 用户状态已设置:', {
          userId: telegramId,
          state: userSession?.currentState,
          hasContextData: !!userSession?.contextData
        });
      }

      // 使用配置中的地址收集提示，优先使用后台配置的 config.reply_message，回退到 inline_keyboard_config.next_message
      let messageText = config?.reply_message || keyboardConfig?.next_message || '请输入能量接收地址:';
      
      // 如果配置中的消息模板包含套餐信息占位符，进行替换
      if (messageText.includes('{transactionCount}')) {
        messageText = messageText.replace(/{transactionCount}/g, transactionCount);
      }
      // 如果后台已配置完整提示文本，就直接使用，不添加额外信息

      await ResponseFormatter.safeSendMessage(this.bot, chatId, messageText);

    } catch (error) {
      console.error('Failed to handle transaction package selection:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理套餐选择时发生错误，请重试。');
    }
  }
}
