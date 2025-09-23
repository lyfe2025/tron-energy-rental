/**
 * 模式验证服务
 * 提供机器人模式切换相关的验证服务
 */
import { query } from '../../../../../config/database.ts';
import type { BotModeSwitchData } from '../../../types.ts';
import { ModeDataValidator, type ValidationResult } from '../validators/ModeDataValidator.ts';
import { WebhookValidator, type WebhookValidationResult } from '../validators/WebhookValidator.ts';

export interface BotValidationResult {
  isValid: boolean;
  message?: string;
  bot?: any;
}

/**
 * 模式验证服务类
 */
export class ModeValidationService {
  /**
   * 验证机器人是否存在并获取机器人信息
   * @param botId 机器人ID
   */
  static async validateBotExists(botId: string): Promise<BotValidationResult> {
    try {
      const existingBot = await query(
        'SELECT id, bot_token, work_mode FROM telegram_bots WHERE id = $1',
        [botId]
      );
      
      if (existingBot.rows.length === 0) {
        return {
          isValid: false,
          message: '机器人不存在'
        };
      }
      
      return {
        isValid: true,
        bot: existingBot.rows[0]
      };
    } catch (error) {
      console.error('验证机器人存在性时出错:', error);
      return {
        isValid: false,
        message: '数据库查询失败'
      };
    }
  }

  /**
   * 验证机器人Token有效性
   * @param botId 机器人ID
   */
  static async validateBotToken(botId: string): Promise<BotValidationResult> {
    try {
      const botResult = await query(
        'SELECT id, bot_token, work_mode FROM telegram_bots WHERE id = $1',
        [botId]
      );
      
      if (botResult.rows.length === 0) {
        return {
          isValid: false,
          message: '机器人不存在'
        };
      }
      
      const bot = botResult.rows[0];
      const tokenValidation = ModeDataValidator.validateBotToken(bot.bot_token);
      
      if (!tokenValidation.isValid) {
        return {
          isValid: false,
          message: tokenValidation.message
        };
      }
      
      return {
        isValid: true,
        bot
      };
    } catch (error) {
      console.error('验证机器人Token时出错:', error);
      return {
        isValid: false,
        message: '数据库查询失败'
      };
    }
  }

  /**
   * 验证模式切换数据完整性
   * @param data 模式切换数据
   */
  static validateModeSwitchData(data: BotModeSwitchData): ValidationResult {
    return ModeDataValidator.validateModeSwitchData(data);
  }

  /**
   * 验证Webhook模式配置
   * @param data 模式切换数据
   */
  static validateWebhookModeConfig(data: BotModeSwitchData): WebhookValidationResult {
    if (data.work_mode !== 'webhook') {
      return { isValid: true }; // 非Webhook模式，跳过验证
    }
    
    return WebhookValidator.validateWebhookConfig({
      webhook_url: data.webhook_url,
      webhook_secret: data.webhook_secret,
      max_connections: data.max_connections
    });
  }

  /**
   * 验证机器人当前状态是否支持模式切换
   * @param botId 机器人ID
   * @param targetMode 目标模式
   */
  static async validateModeSwitch(botId: string, targetMode: string): Promise<BotValidationResult> {
    try {
      // 先验证机器人存在
      const botValidation = await this.validateBotExists(botId);
      if (!botValidation.isValid) {
        return botValidation;
      }
      
      const bot = botValidation.bot;
      
      // 验证Token有效性
      const tokenValidation = ModeDataValidator.validateBotToken(bot.bot_token);
      if (!tokenValidation.isValid) {
        return {
          isValid: false,
          message: tokenValidation.message
        };
      }
      
      // 验证目标模式
      const modeValidation = ModeDataValidator.validateWorkMode(targetMode);
      if (!modeValidation.isValid) {
        return {
          isValid: false,
          message: modeValidation.message
        };
      }
      
      // 如果目标模式与当前模式相同，给出提示
      if (bot.work_mode === targetMode) {
        return {
          isValid: false,
          message: `机器人已经是${targetMode === 'webhook' ? 'Webhook' : 'Polling'}模式`
        };
      }
      
      return {
        isValid: true,
        bot
      };
    } catch (error) {
      console.error('验证模式切换时出错:', error);
      return {
        isValid: false,
        message: '验证过程中发生错误'
      };
    }
  }

  /**
   * 综合验证模式切换请求
   * @param botId 机器人ID
   * @param data 模式切换数据
   */
  static async validateFullModeSwitchRequest(
    botId: string, 
    data: BotModeSwitchData
  ): Promise<BotValidationResult> {
    // 1. 验证基础数据格式
    const dataValidation = this.validateModeSwitchData(data);
    if (!dataValidation.isValid) {
      return {
        isValid: false,
        message: dataValidation.message
      };
    }
    
    // 2. 验证机器人状态
    const botValidation = await this.validateModeSwitch(botId, data.work_mode);
    if (!botValidation.isValid) {
      return botValidation;
    }
    
    // 3. 如果是Webhook模式，验证Webhook配置
    if (data.work_mode === 'webhook') {
      const webhookValidation = this.validateWebhookModeConfig(data);
      if (!webhookValidation.isValid) {
        return {
          isValid: false,
          message: webhookValidation.message
        };
      }
    }
    
    return {
      isValid: true,
      bot: botValidation.bot
    };
  }

  /**
   * 验证同步操作的前置条件
   * @param botId 机器人ID
   * @param options 同步选项
   * @param formData 表单数据
   */
  static async validateSyncPrerequisites(
    botId: string,
    options: any,
    formData: any
  ): Promise<BotValidationResult> {
    // 1. 验证机器人Token
    const tokenValidation = await this.validateBotToken(botId);
    if (!tokenValidation.isValid) {
      return tokenValidation;
    }
    
    // 2. 验证同步选项
    const optionsValidation = ModeDataValidator.validateSyncOptions(options);
    if (!optionsValidation.isValid) {
      return {
        isValid: false,
        message: optionsValidation.message
      };
    }
    
    // 3. 验证表单数据
    const formValidation = ModeDataValidator.validateFormData(formData, options);
    if (!formValidation.isValid) {
      return {
        isValid: false,
        message: formValidation.message
      };
    }
    
    return {
      isValid: true,
      bot: tokenValidation.bot
    };
  }
}
