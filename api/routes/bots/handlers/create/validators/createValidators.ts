/**
 * 机器人创建验证器
 * 负责验证创建机器人时的输入数据
 */
import { query } from '../../../../../config/database.ts';
import { isValidBotToken } from '../../../middleware.ts';
import type { CreateBotData } from '../../../types.ts';

export class CreateValidators {
  /**
   * 验证必填字段
   */
  static validateRequiredFields(data: CreateBotData): { isValid: boolean; message?: string } {
    const { name, username, token } = data;
    
    if (!name || !username || !token) {
      return {
        isValid: false,
        message: '机器人名称、用户名和Token为必填项'
      };
    }

    return { isValid: true };
  }

  /**
   * 验证Token格式
   */
  static validateTokenFormat(token: string): { isValid: boolean; message?: string } {
    if (!isValidBotToken(token)) {
      return {
        isValid: false,
        message: 'Token格式不正确'
      };
    }

    return { isValid: true };
  }

  /**
   * 验证Webhook配置
   */
  static validateWebhookConfig(workMode: string, webhookUrl?: string): { isValid: boolean; message?: string } {
    if (workMode === 'webhook') {
      if (!webhookUrl) {
        return {
          isValid: false,
          message: 'Webhook模式需要提供webhook_url'
        };
      }
      
      try {
        const parsedUrl = new URL(webhookUrl);
        if (parsedUrl.protocol !== 'https:') {
          return {
            isValid: false,
            message: 'Webhook URL必须使用HTTPS协议'
          };
        }
      } catch (error) {
        return {
          isValid: false,
          message: 'Webhook URL格式不正确'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * 检查用户名是否已存在
   */
  static async checkUsernameExists(username: string): Promise<{ exists: boolean; message?: string }> {
    try {
      const existingBot = await query(
        'SELECT id FROM telegram_bots WHERE bot_username = $1',
        [username]
      );
      
      if (existingBot.rows.length > 0) {
        return {
          exists: true,
          message: '该用户名已被使用'
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('检查用户名时出错:', error);
      throw new Error('检查用户名失败');
    }
  }

  /**
   * 检查Token是否已存在
   */
  static async checkTokenExists(token: string): Promise<{ exists: boolean; message?: string }> {
    try {
      const existingToken = await query(
        'SELECT id FROM telegram_bots WHERE bot_token = $1',
        [token]
      );
      
      if (existingToken.rows.length > 0) {
        return {
          exists: true,
          message: '该Token已被使用'
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('检查Token时出错:', error);
      throw new Error('检查Token失败');
    }
  }

  /**
   * 验证机器人Token并获取机器人信息
   */
  static async validateBotToken(token: string): Promise<{
    isValid: boolean;
    botInfo?: any;
    message?: string;
  }> {
    try {
      // 验证Token格式
      const formatValidation = this.validateTokenFormat(token);
      if (!formatValidation.isValid) {
        return {
          isValid: false,
          message: formatValidation.message
        };
      }

      // 检查Token是否已被使用
      const tokenCheck = await this.checkTokenExists(token);
      if (tokenCheck.exists) {
        return {
          isValid: false,
          message: tokenCheck.message
        };
      }

      // 使用Telegram Bot API验证Token并获取机器人信息
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
    } catch (apiError) {
      console.error('Telegram API调用错误:', apiError);
      return {
        isValid: false,
        message: 'Token验证失败，请检查Token是否正确'
      };
    }
  }

  /**
   * 验证自定义命令配置
   */
  static validateCustomCommands(customCommands: any[]): { isValid: boolean; message?: string } {
    if (!Array.isArray(customCommands)) {
      return {
        isValid: false,
        message: '自定义命令必须是数组格式'
      };
    }

    for (const cmd of customCommands) {
      if (!cmd.command || !cmd.response_message) {
        return {
          isValid: false,
          message: '自定义命令必须包含command和response_message字段'
        };
      }

      if (cmd.command.includes(' ')) {
        return {
          isValid: false,
          message: '命令名称不能包含空格'
        };
      }

      if (cmd.command.length > 32) {
        return {
          isValid: false,
          message: '命令名称不能超过32个字符'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * 验证菜单命令配置
   */
  static validateMenuCommands(menuCommands: any[]): { isValid: boolean; message?: string } {
    if (!Array.isArray(menuCommands)) {
      return {
        isValid: false,
        message: '菜单命令必须是数组格式'
      };
    }

    for (const cmd of menuCommands) {
      if (!cmd.command || !cmd.description) {
        return {
          isValid: false,
          message: '菜单命令必须包含command和description字段'
        };
      }

      if (cmd.command.includes(' ')) {
        return {
          isValid: false,
          message: '命令名称不能包含空格'
        };
      }

      if (cmd.description.length > 256) {
        return {
          isValid: false,
          message: '命令描述不能超过256个字符'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * 验证键盘配置
   */
  static validateKeyboardConfig(keyboardConfig: any): { isValid: boolean; message?: string } {
    if (!keyboardConfig || typeof keyboardConfig !== 'object') {
      return { isValid: true }; // 键盘配置是可选的
    }

    // 验证主菜单配置
    if (keyboardConfig.main_menu) {
      const mainMenu = keyboardConfig.main_menu;
      
      if (mainMenu.rows && Array.isArray(mainMenu.rows)) {
        for (const row of mainMenu.rows) {
          if (!row.buttons || !Array.isArray(row.buttons)) {
            return {
              isValid: false,
              message: '键盘行必须包含buttons数组'
            };
          }

          for (const button of row.buttons) {
            if (!button.text) {
              return {
                isValid: false,
                message: '键盘按钮必须有text属性'
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
    }

    // 验证命令配置
    if (keyboardConfig.commands && Array.isArray(keyboardConfig.commands)) {
      for (const cmd of keyboardConfig.commands) {
        if (!cmd.command || !cmd.description) {
          return {
            isValid: false,
            message: '命令配置必须包含command和description字段'
          };
        }

        if (cmd.command.length > 32) {
          return {
            isValid: false,
            message: '命令名称不能超过32个字符'
          };
        }

        if (cmd.description.length > 256) {
          return {
            isValid: false,
            message: '命令描述不能超过256个字符'
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * 综合验证创建数据
   */
  static async validateCreateData(data: CreateBotData): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // 验证必填字段
    const requiredValidation = this.validateRequiredFields(data);
    if (!requiredValidation.isValid) {
      errors.push(requiredValidation.message!);
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // 验证Token格式
    const tokenFormatValidation = this.validateTokenFormat(data.token);
    if (!tokenFormatValidation.isValid) {
      errors.push(tokenFormatValidation.message!);
    }

    // 验证Webhook配置
    const webhookValidation = this.validateWebhookConfig(data.work_mode || 'polling', data.webhook_url);
    if (!webhookValidation.isValid) {
      errors.push(webhookValidation.message!);
    }

    // 验证自定义命令
    if (data.custom_commands) {
      const customCmdValidation = this.validateCustomCommands(data.custom_commands);
      if (!customCmdValidation.isValid) {
        errors.push(customCmdValidation.message!);
      }
    }

    // 验证菜单命令
    if (data.menu_commands) {
      const menuCmdValidation = this.validateMenuCommands(data.menu_commands);
      if (!menuCmdValidation.isValid) {
        errors.push(menuCmdValidation.message!);
      }
    }

    // 验证键盘配置
    if (data.keyboard_config) {
      const keyboardValidation = this.validateKeyboardConfig(data.keyboard_config);
      if (!keyboardValidation.isValid) {
        errors.push(keyboardValidation.message!);
      }
    }

    // 检查用户名是否已存在
    try {
      const usernameCheck = await this.checkUsernameExists(data.username);
      if (usernameCheck.exists) {
        errors.push(usernameCheck.message!);
      }
    } catch (error) {
      errors.push('检查用户名时发生错误');
    }

    // 检查Token是否已存在
    try {
      const tokenCheck = await this.checkTokenExists(data.token);
      if (tokenCheck.exists) {
        errors.push(tokenCheck.message!);
      }
    } catch (error) {
      errors.push('检查Token时发生错误');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
