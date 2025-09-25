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

      // 检查用户状态：是否在等待地址输入
      console.log('🔍 检查用户状态:', {
        hasStateManager: !!this.dependencies.stateManager,
        userId: message.from?.id,
        text: originalText
      });
      
      if (this.dependencies.stateManager && message.from?.id) {
        const userSession = this.dependencies.stateManager.getUserSession(message.from.id);
        console.log('👤 用户会话状态:', {
          userId: message.from.id,
          hasSession: !!userSession,
          currentState: userSession?.currentState,
          sessionData: userSession?.contextData
        });
        
        if (userSession && userSession.currentState === 'waiting_address_input') {
          console.log('🏠 开始处理地址输入:', originalText);
          return await this.handleAddressInput(message, originalText, userSession);
        }
      }

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

  /**
   * 处理地址输入
   */
  private async handleAddressInput(message: any, address: string, userSession: any): Promise<MessageProcessResult> {
    try {
      console.log('🏠 处理地址输入:', address);

      // 验证 TRON 地址格式
      const addressValidation = this.validateTronAddress(address);
      if (!addressValidation.isValid) {
        // 地址格式无效，提示用户重新输入
        await this.dependencies.api.sendMessage(
          message.chat.id,
          `❌ ${addressValidation.error}\n\n请重新输入正确的TRON地址：`
        );

        return {
          success: true,
          action: 'address_validation_failed',
          description: '地址格式无效，已提示重新输入'
        };
      }

      // 地址验证通过，生成订单确认信息
      const confirmationResult = await this.generateOrderConfirmation(message, address, userSession);
      
      // 清除用户状态
      this.dependencies.stateManager?.clearUserSession(message.from.id);

      return confirmationResult;

    } catch (error) {
      console.error('❌ 处理地址输入失败:', error);
      
      // 清除用户状态
      this.dependencies.stateManager?.clearUserSession(message.from.id);

      await this.dependencies.api.sendMessage(
        message.chat.id,
        '❌ 处理地址时发生错误，请重试。'
      );

      return {
        success: false,
        error: error as Error,
        action: 'address_input_error',
        description: '处理地址输入失败'
      };
    }
  }

  /**
   * 验证 TRON 地址格式
   */
  private validateTronAddress(address: string): { isValid: boolean; error?: string } {
    if (!address) {
      return { isValid: false, error: '地址不能为空' };
    }
    
    // 检查Base58格式
    if (address.startsWith('T') && address.length === 34) {
      return { isValid: true };
    }
    
    // 检查Hex格式
    if (address.startsWith('41') && address.length === 42) {
      return { isValid: true };
    }
    
    return { 
      isValid: false, 
      error: '无效的TRON地址格式。地址应为Base58格式（以T开头，34位字符）或Hex格式（以41开头，42位字符）' 
    };
  }

  /**
   * 生成订单确认信息
   */
  private async generateOrderConfirmation(message: any, address: string, userSession: any): Promise<MessageProcessResult> {
    try {
      const contextData = userSession.contextData;
      console.log('📋 生成订单确认信息:', {
        orderType: contextData.orderType,
        transactionCount: contextData.transactionCount,
        address: address.substring(0, 10) + '...'
      });

      // 从数据库获取订单确认模板
      const { query } = await import('../../../../../config/database.ts');
      const configResult = await query(
        'SELECT config FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
        [contextData.orderType]
      );

      if (configResult.rows.length === 0) {
        await this.dependencies.api.sendMessage(
          message.chat.id,
          '❌ 服务配置不可用，请稍后再试。'
        );
        return {
          success: false,
          action: 'config_not_found',
          description: '服务配置不可用'
        };
      }

      const config = configResult.rows[0].config;
      let confirmationText = '';

      // 根据订单类型生成确认信息
      if (contextData.orderType === 'transaction_package') {
        // 笔数套餐确认信息
        confirmationText = this.formatTransactionPackageConfirmation(config, contextData, address);
      } else {
        // 其他订单类型的确认信息
        confirmationText = config.confirmation_template || '✅ 订单确认信息';
      }

      await this.dependencies.api.sendMessage(message.chat.id, confirmationText, {
        parse_mode: 'Markdown'
      });

      return {
        success: true,
        action: 'order_confirmation_sent',
        description: '订单确认信息已发送'
      };

    } catch (error) {
      console.error('❌ 生成订单确认信息失败:', error);
      
      await this.dependencies.api.sendMessage(
        message.chat.id,
        '❌ 生成订单确认信息时发生错误，请重试。'
      );

      return {
        success: false,
        error: error as Error,
        action: 'confirmation_generation_error',
        description: '生成订单确认信息失败'
      };
    }
  }

  /**
   * 格式化笔数套餐确认信息
   */
  private formatTransactionPackageConfirmation(config: any, contextData: any, address: string): string {
    // 使用配置中的确认模板，如果没有就使用默认模板
    let template = config.confirmation_template || 
      `📋 *订单确认*\n\n` +
      `🔸 服务类型：笔数套餐\n` +
      `🔸 套餐规格：{transactionCount} 笔\n` +
      `🔸 接收地址：\`{address}\`\n` +
      `🔸 价格：{price} TRX\n\n` +
      `请确认以上信息无误后进行支付。`;

    // 替换占位符
    template = template.replace(/{transactionCount}/g, contextData.transactionCount);
    template = template.replace(/{address}/g, address);
    
    // 如果有价格信息，替换价格占位符
    if (config.price) {
      template = template.replace(/{price}/g, config.price.toString());
    }

    return template;
  }
}
