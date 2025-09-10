/**
 * 机器人更新验证器
 * 负责验证更新机器人时的输入数据
 */
import { query } from '../../../../../config/database.js';
import { isValidBotToken } from '../../../middleware.js';
import type { UpdateBotData } from '../../../types.js';

export class UpdateValidators {
  /**
   * 验证机器人是否存在
   */
  static async validateBotExists(botId: string): Promise<{ exists: boolean; bot?: any; message?: string }> {
    try {
      const result = await query(
        'SELECT * FROM telegram_bots WHERE id = $1',
        [botId]
      );
      
      if (result.rows.length === 0) {
        return {
          exists: false,
          message: '机器人不存在'
        };
      }

      return {
        exists: true,
        bot: result.rows[0]
      };
    } catch (error) {
      console.error('检查机器人存在性失败:', error);
      throw new Error('检查机器人存在性失败');
    }
  }

  /**
   * 验证用户名是否可用（排除当前机器人）
   */
  static async validateUsernameAvailable(username: string, botId: string): Promise<{ available: boolean; message?: string }> {
    try {
      const result = await query(
        'SELECT id FROM telegram_bots WHERE bot_username = $1 AND id != $2',
        [username, botId]
      );
      
      if (result.rows.length > 0) {
        return {
          available: false,
          message: '该用户名已被其他机器人使用'
        };
      }

      return { available: true };
    } catch (error) {
      console.error('检查用户名可用性失败:', error);
      throw new Error('检查用户名可用性失败');
    }
  }

  /**
   * 验证Token是否可用（排除当前机器人）
   */
  static async validateTokenAvailable(token: string, botId: string): Promise<{ available: boolean; message?: string }> {
    try {
      const result = await query(
        'SELECT id FROM telegram_bots WHERE bot_token = $1 AND id != $2',
        [token, botId]
      );
      
      if (result.rows.length > 0) {
        return {
          available: false,
          message: '该Token已被其他机器人使用'
        };
      }

      return { available: true };
    } catch (error) {
      console.error('检查Token可用性失败:', error);
      throw new Error('检查Token可用性失败');
    }
  }

  /**
   * 验证Token格式和有效性
   */
  static async validateTokenFormat(token: string): Promise<{ isValid: boolean; botInfo?: any; message?: string }> {
    try {
      // 基本格式验证
      if (!isValidBotToken(token)) {
        return {
          isValid: false,
          message: 'Token格式不正确'
        };
      }

      // 通过Telegram API验证Token
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      
      if (!data.ok) {
        return {
          isValid: false,
          message: 'Token无效或已过期'
        };
      }
      
      return {
        isValid: true,
        botInfo: data.result
      };
    } catch (error) {
      console.error('Token验证失败:', error);
      return {
        isValid: false,
        message: 'Token验证失败，请检查网络连接'
      };
    }
  }

  /**
   * 验证Webhook URL格式
   */
  static validateWebhookUrl(url: string): { isValid: boolean; message?: string } {
    if (!url) {
      return { isValid: true }; // 允许空URL（删除webhook）
    }

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') {
        return {
          isValid: false,
          message: 'Webhook URL必须使用HTTPS协议'
        };
      }
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        message: 'Webhook URL格式不正确'
      };
    }
  }

  /**
   * 验证工作模式配置
   */
  static validateWorkMode(workMode: string, webhookUrl?: string): { isValid: boolean; message?: string } {
    const validModes = ['polling', 'webhook'];
    
    if (!validModes.includes(workMode)) {
      return {
        isValid: false,
        message: '工作模式必须是 polling 或 webhook'
      };
    }

    if (workMode === 'webhook' && !webhookUrl) {
      return {
        isValid: false,
        message: 'Webhook模式需要提供webhook_url'
      };
    }

    if (workMode === 'webhook' && webhookUrl) {
      const urlValidation = this.validateWebhookUrl(webhookUrl);
      if (!urlValidation.isValid) {
        return urlValidation;
      }
    }

    return { isValid: true };
  }

  /**
   * 验证键盘配置格式
   */
  static validateKeyboardConfig(config: any): { isValid: boolean; message?: string } {
    if (!config) {
      return { isValid: true }; // 允许空配置
    }

    if (typeof config !== 'object') {
      return {
        isValid: false,
        message: '键盘配置必须是对象格式'
      };
    }

    // 验证主菜单配置
    if (config.main_menu) {
      if (!config.main_menu.rows || !Array.isArray(config.main_menu.rows)) {
        return {
          isValid: false,
          message: '主菜单必须包含rows数组'
        };
      }

      for (const row of config.main_menu.rows) {
        if (!row.buttons || !Array.isArray(row.buttons)) {
          return {
            isValid: false,
            message: '菜单行必须包含buttons数组'
          };
        }

        for (const button of row.buttons) {
          if (!button.text) {
            return {
              isValid: false,
              message: '按钮必须有text属性'
            };
          }

          if (button.text.length > 64) {
            return {
              isValid: false,
              message: '按钮文本不能超过64个字符'
            };
          }
        }
      }
    }

    return { isValid: true };
  }

  /**
   * 验证价格配置格式
   */
  static validatePriceConfig(config: any): { isValid: boolean; message?: string } {
    if (!config) {
      return { isValid: true }; // 允许空配置
    }

    if (typeof config !== 'object') {
      return {
        isValid: false,
        message: '价格配置必须是对象格式'
      };
    }

    // 验证能量闪购配置
    if (config.energy_flash) {
      const flash = config.energy_flash;
      
      if (flash.enabled && typeof flash.enabled !== 'boolean') {
        return {
          isValid: false,
          message: 'energy_flash.enabled必须是布尔值'
        };
      }

      if (flash.price_per_energy && (typeof flash.price_per_energy !== 'number' || flash.price_per_energy <= 0)) {
        return {
          isValid: false,
          message: 'energy_flash.price_per_energy必须是正数'
        };
      }

      if (flash.min_energy && (typeof flash.min_energy !== 'number' || flash.min_energy <= 0)) {
        return {
          isValid: false,
          message: 'energy_flash.min_energy必须是正数'
        };
      }

      if (flash.max_energy && (typeof flash.max_energy !== 'number' || flash.max_energy <= 0)) {
        return {
          isValid: false,
          message: 'energy_flash.max_energy必须是正数'
        };
      }

      if (flash.min_energy && flash.max_energy && flash.min_energy > flash.max_energy) {
        return {
          isValid: false,
          message: '最小能量不能大于最大能量'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * 验证设置配置
   */
  static validateSettings(settings: any): { isValid: boolean; message?: string } {
    if (!settings) {
      return { isValid: true };
    }

    if (typeof settings !== 'object') {
      return {
        isValid: false,
        message: '设置必须是对象格式'
      };
    }

    // 验证语言设置
    if (settings.language && typeof settings.language !== 'string') {
      return {
        isValid: false,
        message: '语言设置必须是字符串'
      };
    }

    // 验证时区设置
    if (settings.timezone && typeof settings.timezone !== 'string') {
      return {
        isValid: false,
        message: '时区设置必须是字符串'
      };
    }

    // 验证最大连接数
    if (settings.max_connections && (typeof settings.max_connections !== 'number' || settings.max_connections < 1 || settings.max_connections > 100)) {
      return {
        isValid: false,
        message: '最大连接数必须是1-100之间的数字'
      };
    }

    return { isValid: true };
  }

  /**
   * 综合验证更新数据
   */
  static async validateUpdateData(botId: string, updateData: UpdateBotData): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. 验证机器人是否存在
      const botExists = await this.validateBotExists(botId);
      if (!botExists.exists) {
        errors.push(botExists.message!);
        return { isValid: false, errors, warnings };
      }

      // 2. 验证用户名
      if (updateData.username) {
        const usernameAvailable = await this.validateUsernameAvailable(updateData.username, botId);
        if (!usernameAvailable.available) {
          errors.push(usernameAvailable.message!);
        }
      }

      // 3. 验证Token
      if (updateData.token) {
        const tokenAvailable = await this.validateTokenAvailable(updateData.token, botId);
        if (!tokenAvailable.available) {
          errors.push(tokenAvailable.message!);
        } else {
          const tokenFormat = await this.validateTokenFormat(updateData.token);
          if (!tokenFormat.isValid) {
            errors.push(tokenFormat.message!);
          }
        }
      }

      // 4. 验证工作模式
      if (updateData.work_mode) {
        const workModeValidation = this.validateWorkMode(updateData.work_mode, updateData.webhook_url);
        if (!workModeValidation.isValid) {
          errors.push(workModeValidation.message!);
        }
      }

      // 5. 验证Webhook URL
      if (updateData.webhook_url !== undefined) {
        const webhookValidation = this.validateWebhookUrl(updateData.webhook_url);
        if (!webhookValidation.isValid) {
          errors.push(webhookValidation.message!);
        }
      }

      // 6. 验证键盘配置
      if (updateData.keyboard_config !== undefined) {
        const keyboardValidation = this.validateKeyboardConfig(updateData.keyboard_config);
        if (!keyboardValidation.isValid) {
          errors.push(keyboardValidation.message!);
        }
      }

      // 7. 验证价格配置
      if (updateData.price_config !== undefined) {
        const priceValidation = this.validatePriceConfig(updateData.price_config);
        if (!priceValidation.isValid) {
          errors.push(priceValidation.message!);
        }
      }

      // 8. 验证设置
      if (updateData.settings !== undefined) {
        const settingsValidation = this.validateSettings(updateData.settings);
        if (!settingsValidation.isValid) {
          errors.push(settingsValidation.message!);
        }
      }

      // 9. 检查特殊情况的警告
      if (updateData.work_mode === 'webhook' && botExists.bot?.work_mode === 'polling') {
        warnings.push('切换到Webhook模式，请确保服务器能够接收Telegram的请求');
      }

      if (updateData.work_mode === 'polling' && botExists.bot?.work_mode === 'webhook') {
        warnings.push('切换到Polling模式，Webhook将被自动删除');
      }

      if (updateData.is_active === false && botExists.bot?.is_active === true) {
        warnings.push('禁用机器人将停止所有相关服务');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('验证更新数据失败:', error);
      return {
        isValid: false,
        errors: ['数据验证过程中发生错误'],
        warnings
      };
    }
  }
}
