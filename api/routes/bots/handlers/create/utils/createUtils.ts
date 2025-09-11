/**
 * 创建工具类
 * 提供机器人创建过程中的辅助功能
 */
import type { Bot, CreateBotData } from '../../../types.js';

export class CreateUtils {
  /**
   * 生成唯一的机器人ID
   */
  static generateBotId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `bot_${timestamp}_${random}`;
  }

  /**
   * 格式化机器人用户名
   */
  static formatUsername(username: string): string {
    // 移除@符号和空格，转换为小写
    return username.replace(/[@\s]/g, '').toLowerCase();
  }

  /**
   * 验证并格式化Token
   */
  static formatToken(token: string): string {
    return token.trim();
  }

  /**
   * 生成Webhook密钥
   */
  static generateWebhookSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 解析机器人Token获取Bot ID
   */
  static parseBotIdFromToken(token: string): string | null {
    try {
      const parts = token.split(':');
      if (parts.length !== 2) {
        return null;
      }
      return parts[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * 格式化错误消息
   */
  static formatErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return '未知错误';
  }

  /**
   * 创建成功响应
   */
  static createSuccessResponse(bot: Bot, networkSetupResult?: any): object {
    // 构建同步状态结果，前端可以直接使用
    const syncResult = networkSetupResult ? {
      success: networkSetupResult.success,
      results: networkSetupResult.results,
      errors: networkSetupResult.errors || [],
      summary: `机器人创建${networkSetupResult.success ? '成功' : '完成但部分功能同步失败'}`,
    } : null;

    return {
      success: true,
      message: '机器人创建成功',
      data: {
        bot: {
          id: bot.id,
          name: bot.name,
          username: bot.bot_username,
          is_active: bot.is_active,
          work_mode: bot.work_mode,
          created_at: bot.created_at
        },
        network_setup: networkSetupResult || null,
        sync_result: syncResult
      }
    };
  }

  /**
   * 创建错误响应
   */
  static createErrorResponse(message: string, errors?: string[]): object {
    return {
      success: false,
      message,
      errors: errors || []
    };
  }

  /**
   * 验证URL格式
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证HTTPS URL
   */
  static isHttpsUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 生成默认Webhook URL
   * 现在使用 bot_username 而不是 ID
   */
  static generateWebhookUrl(baseUrl: string, botUsername: string): string {
    if (!botUsername) {
      throw new Error('无效的Bot Username');
    }
    
    // 移除末尾的斜杠
    let cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // 检查URL是否已经包含 /api/telegram/webhook 路径
    if (cleanBaseUrl.includes('/api/telegram/webhook')) {
      // 如果已经包含路径，只添加用户名
      return `${cleanBaseUrl}/${botUsername}`;
    } else {
      // 如果不包含路径，添加完整路径和用户名
      return `${cleanBaseUrl}/api/telegram/webhook/${botUsername}`;
    }
  }

  /**
   * 深拷贝对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }

  /**
   * 合并配置对象
   */
  static mergeConfigs(defaultConfig: object, customConfig: object | null): object {
    if (!customConfig) {
      return this.deepClone(defaultConfig);
    }
    
    return {
      ...this.deepClone(defaultConfig),
      ...this.deepClone(customConfig)
    };
  }

  /**
   * 清理配置对象（移除null和undefined值）
   */
  static cleanConfig(config: any): any {
    if (config === null || config === undefined) {
      return null;
    }
    
    if (Array.isArray(config)) {
      return config
        .map(item => this.cleanConfig(item))
        .filter(item => item !== null && item !== undefined);
    }
    
    if (typeof config === 'object') {
      const cleaned: any = {};
      for (const key in config) {
        const value = this.cleanConfig(config[key]);
        if (value !== null && value !== undefined) {
          cleaned[key] = value;
        }
      }
      return cleaned;
    }
    
    return config;
  }

  /**
   * 生成创建摘要
   */
  static generateCreationSummary(
    data: CreateBotData,
    bot: Bot,
    networkSetupResult: any
  ): string {
    const lines = [
      '🤖 机器人创建摘要',
      '==================',
      `📝 名称: ${bot.name}`,
      `👤 用户名: @${bot.bot_username}`,
      `🔧 工作模式: ${bot.work_mode}`,
      `🌐 网络ID: ${bot.network_id}`,
      `📅 创建时间: ${new Date(bot.created_at).toLocaleString('zh-CN')}`,
      ''
    ];

    if (networkSetupResult) {
      lines.push('🔗 网络设置结果:');
      lines.push(`  ✅ 名称设置: ${networkSetupResult.results?.name ? '成功' : '失败'}`);
      lines.push(`  ✅ 描述设置: ${networkSetupResult.results?.description ? '成功' : '失败'}`);
      lines.push(`  ✅ 命令设置: ${networkSetupResult.results?.commands ? '成功' : '失败'}`);
      lines.push(`  ✅ Webhook设置: ${networkSetupResult.results?.webhook ? '成功' : '失败'}`);
      
      if (networkSetupResult.errors && networkSetupResult.errors.length > 0) {
        lines.push('');
        lines.push('⚠️ 设置警告:');
        networkSetupResult.errors.forEach((error: string) => {
          lines.push(`  • ${error}`);
        });
      }
    }

    return lines.join('\n');
  }

  /**
   * 验证创建数据的必要字段
   */
  static validateEssentialFields(data: CreateBotData): {
    isValid: boolean;
    missingFields: string[];
  } {
    const requiredFields = ['name', 'username', 'token'];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!data[field as keyof CreateBotData] || String(data[field as keyof CreateBotData]).trim() === '') {
        missingFields.push(field);
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * 生成默认配置的变体（用于测试或备选方案）
   */
  static generateConfigVariant(baseConfig: object, variant: 'minimal' | 'full' | 'business'): object {
    const base = this.deepClone(baseConfig);

    switch (variant) {
      case 'minimal':
        return {
          ...base,
          // 最小化配置，只保留核心功能
          main_menu: {
            rows: [
              {
                buttons: [
                  { text: '💰 购买能量', action: 'buy_energy' },
                  { text: '❓ 帮助', action: 'help' }
                ]
              }
            ]
          }
        };

      case 'full':
        return {
          ...base,
          // 完整配置，包含所有功能
          main_menu: {
            rows: [
              {
                buttons: [
                  { text: '💰 购买能量', action: 'buy_energy' },
                  { text: '📊 查询余额', action: 'check_balance' },
                  { text: '📈 价格查询', action: 'check_price' }
                ]
              },
              {
                buttons: [
                  { text: '📦 交易套餐', action: 'transaction_package' },
                  { text: '💱 TRX兑换', action: 'trx_exchange' },
                  { text: '❓ 帮助', action: 'help' }
                ]
              },
              {
                buttons: [
                  { text: '⚙️ 设置', action: 'settings' },
                  { text: '📞 客服', action: 'contact' }
                ]
              }
            ]
          }
        };

      case 'business':
        return {
          ...base,
          // 商业配置，重点突出交易功能
          main_menu: {
            rows: [
              {
                buttons: [
                  { text: '⚡ 闪电能量', action: 'energy_flash' },
                  { text: '📦 交易套餐', action: 'transaction_package' }
                ]
              },
              {
                buttons: [
                  { text: '💱 TRX兑换', action: 'trx_exchange' },
                  { text: '📊 我的账户', action: 'my_account' }
                ]
              },
              {
                buttons: [
                  { text: '📈 实时价格', action: 'live_price' },
                  { text: '🎯 定制服务', action: 'custom_service' }
                ]
              }
            ]
          }
        };

      default:
        return base;
    }
  }

  /**
   * 计算配置复杂度评分
   */
  static calculateConfigComplexity(config: any): {
    score: number;
    level: 'simple' | 'moderate' | 'complex';
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    // 检查主菜单复杂度
    if (config.main_menu?.rows) {
      const buttonCount = config.main_menu.rows.reduce(
        (total: number, row: any) => total + (row.buttons?.length || 0), 
        0
      );
      
      if (buttonCount > 6) {
        score += 3;
        factors.push('按钮数量较多');
      } else if (buttonCount > 3) {
        score += 2;
        factors.push('按钮数量中等');
      } else {
        score += 1;
        factors.push('按钮数量较少');
      }
    }

    // 检查命令复杂度
    if (config.commands?.length > 5) {
      score += 2;
      factors.push('命令较多');
    } else if (config.commands?.length > 2) {
      score += 1;
      factors.push('命令适中');
    }

    // 检查是否有自定义配置
    if (config.custom_features) {
      score += 2;
      factors.push('包含自定义功能');
    }

    // 检查嵌套深度
    const depth = this.getObjectDepth(config);
    if (depth > 4) {
      score += 2;
      factors.push('配置嵌套较深');
    } else if (depth > 2) {
      score += 1;
      factors.push('配置嵌套适中');
    }

    const level = score <= 3 ? 'simple' : score <= 6 ? 'moderate' : 'complex';

    return { score, level, factors };
  }

  /**
   * 获取对象嵌套深度
   */
  private static getObjectDepth(obj: any, depth = 1): number {
    if (typeof obj !== 'object' || obj === null) {
      return depth;
    }

    let maxDepth = depth;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentDepth = this.getObjectDepth(obj[key], depth + 1);
        maxDepth = Math.max(maxDepth, currentDepth);
      }
    }

    return maxDepth;
  }
}
