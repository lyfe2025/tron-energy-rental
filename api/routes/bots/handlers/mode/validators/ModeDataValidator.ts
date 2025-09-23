/**
 * 机器人模式数据验证器
 * 验证工作模式切换相关的数据
 */
import type { BotModeSwitchData } from '../../../types.ts';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * 机器人模式数据验证器类
 */
export class ModeDataValidator {
  /**
   * 验证工作模式
   * @param workMode 工作模式
   */
  static validateWorkMode(workMode: string): ValidationResult {
    if (!['polling', 'webhook'].includes(workMode)) {
      return {
        isValid: false,
        message: '无效的工作模式'
      };
    }
    
    return { isValid: true };
  }

  /**
   * 验证模式切换数据
   * @param data 模式切换数据
   */
  static validateModeSwitchData(data: BotModeSwitchData): ValidationResult {
    const { work_mode, webhook_url, max_connections } = data;
    
    // 验证工作模式
    const workModeResult = this.validateWorkMode(work_mode);
    if (!workModeResult.isValid) {
      return workModeResult;
    }
    
    // Webhook模式验证
    if (work_mode === 'webhook') {
      if (!webhook_url) {
        return {
          isValid: false,
          message: 'Webhook模式需要提供webhook_url'
        };
      }
    }
    
    // 验证最大连接数
    if (max_connections !== undefined && max_connections !== null) {
      if (typeof max_connections !== 'number' || max_connections < 1 || max_connections > 100) {
        return {
          isValid: false,
          message: '最大连接数必须在1-100之间'
        };
      }
    }
    
    return { isValid: true };
  }

  /**
   * 验证机器人Token格式
   * @param token 机器人Token
   */
  static validateBotToken(token: string): ValidationResult {
    if (!token || token === 'temp-token') {
      return {
        isValid: false,
        message: 'Bot Token无效，无法进行操作'
      };
    }
    
    // 基本的Token格式验证（Telegram Bot Token通常格式为：数字:字符串）
    const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
    if (!tokenPattern.test(token)) {
      return {
        isValid: false,
        message: 'Bot Token格式不正确'
      };
    }
    
    return { isValid: true };
  }

  /**
   * 验证同步选项
   * @param options 同步选项
   */
  static validateSyncOptions(options: any): ValidationResult {
    if (!options || typeof options !== 'object') {
      return {
        isValid: false,
        message: '同步选项不能为空'
      };
    }
    
    const validOptions = ['name', 'description', 'shortDescription', 'commands', 'workMode', 'webhookUrl', 'menuButton', 'keyboardType', 'priceConfig'];
    const hasValidOption = validOptions.some(option => options[option] === true);
    
    if (!hasValidOption) {
      return {
        isValid: false,
        message: '至少需要选择一个同步选项'
      };
    }
    
    return { isValid: true };
  }

  /**
   * 验证表单数据
   * @param formData 表单数据
   * @param options 选择的同步选项
   */
  static validateFormData(formData: any, options: any): ValidationResult {
    if (!formData || typeof formData !== 'object') {
      return {
        isValid: false,
        message: '表单数据不能为空'
      };
    }
    
    // 如果选择了工作模式同步，验证相关字段
    if (options.workMode) {
      if (formData.work_mode === 'webhook' && !formData.webhook_url) {
        return {
          isValid: false,
          message: '选择Webhook模式时必须提供Webhook URL'
        };
      }
    }
    
    // 如果选择了菜单按钮同步，验证相关字段
    if (options.menuButton && formData.menu_button_enabled) {
      if (formData.menu_type === 'web_app' && !formData.web_app_url) {
        return {
          isValid: false,
          message: '选择Web App菜单时必须提供Web App URL'
        };
      }
    }
    
    return { isValid: true };
  }
}
