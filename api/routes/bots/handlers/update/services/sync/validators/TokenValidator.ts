/**
 * Token 验证器
 * 负责验证 Telegram Bot Token 的有效性
 */
import { TelegramApiClient } from '../TelegramApiClient';

export class TokenValidator {
  /**
   * 验证Token格式
   */
  static validateTokenFormat(token: string): { valid: boolean; error?: string } {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token不能为空' };
    }

    // Telegram Bot Token格式: 数字:字母数字字符串
    // 例如: 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ
    const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
    
    if (!tokenPattern.test(token)) {
      return { 
        valid: false, 
        error: 'Token格式无效，应为数字:字母数字字符串的格式' 
      };
    }

    const parts = token.split(':');
    if (parts.length !== 2) {
      return { valid: false, error: 'Token格式无效，应包含一个冒号分隔符' };
    }

    const [botId, secretPart] = parts;
    
    // 验证机器人ID部分
    if (!/^\d+$/.test(botId)) {
      return { valid: false, error: 'Token中的机器人ID部分应为纯数字' };
    }

    // 验证密钥部分长度
    if (secretPart.length < 35) {
      return { valid: false, error: 'Token中的密钥部分长度不足' };
    }

    return { valid: true };
  }

  /**
   * 验证Token可用性（通过API调用）
   */
  static async validateTokenAvailability(token: string): Promise<{
    valid: boolean;
    error?: string;
    botInfo?: any;
  }> {
    try {
      // 首先验证格式
      const formatValidation = this.validateTokenFormat(token);
      if (!formatValidation.valid) {
        return { valid: false, error: formatValidation.error };
      }

      // 通过API调用验证Token可用性
      const botInfo = await TelegramApiClient.getBotInfo(token);
      
      return {
        valid: true,
        botInfo
      };
    } catch (error: any) {
      let errorMessage = 'Token验证失败';

      if (error.message) {
        if (error.message.includes('Unauthorized')) {
          errorMessage = 'Token无效或已失效';
        } else if (error.message.includes('Not Found')) {
          errorMessage = 'Token对应的机器人不存在';
        } else if (error.isNetworkError) {
          errorMessage = '网络连接问题，无法验证Token';
        } else {
          errorMessage = `Token验证失败: ${error.message}`;
        }
      }

      return {
        valid: false,
        error: errorMessage
      };
    }
  }

  /**
   * 提取Token中的机器人ID
   */
  static extractBotId(token: string): string | null {
    const formatValidation = this.validateTokenFormat(token);
    if (!formatValidation.valid) {
      return null;
    }

    return token.split(':')[0];
  }

  /**
   * 检查Token是否属于指定的机器人ID
   */
  static validateTokenBotId(token: string, expectedBotId: string): { valid: boolean; error?: string } {
    const actualBotId = this.extractBotId(token);
    
    if (!actualBotId) {
      return { valid: false, error: 'Token格式无效，无法提取机器人ID' };
    }

    if (actualBotId !== expectedBotId) {
      return { 
        valid: false, 
        error: `Token的机器人ID(${actualBotId})与期望的ID(${expectedBotId})不匹配` 
      };
    }

    return { valid: true };
  }

  /**
   * 批量验证多个Token的格式
   */
  static validateMultipleTokensFormat(tokens: string[]): {
    valid: boolean;
    results: Array<{ token: string; valid: boolean; error?: string }>;
  } {
    const results = tokens.map(token => ({
      token,
      ...this.validateTokenFormat(token)
    }));

    return {
      valid: results.every(r => r.valid),
      results
    };
  }
}
