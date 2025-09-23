/**
 * 更新工具类
 * 提供机器人更新过程中的辅助功能
 */
import type { Bot, UpdateBotData } from '../../../types.ts';

export class UpdateUtils {
  /**
   * 格式化更新数据
   */
  static formatUpdateData(data: UpdateBotData): UpdateBotData {
    const formatted: UpdateBotData = {};

    // 清理字符串字段
    if (data.name !== undefined) {
      formatted.name = String(data.name).trim();
    }

    if (data.username !== undefined) {
      formatted.username = String(data.username).replace(/[@\s]/g, '').toLowerCase();
    }

    if (data.token !== undefined) {
      formatted.token = String(data.token).trim();
    }

    if (data.description !== undefined) {
      formatted.description = data.description ? String(data.description).trim() : null;
    }

    if (data.short_description !== undefined) {
      formatted.short_description = data.short_description ? String(data.short_description).trim() : null;
    }

    if (data.webhook_url !== undefined) {
      formatted.webhook_url = data.webhook_url ? String(data.webhook_url).trim() : null;
    }

    if (data.webhook_secret !== undefined) {
      formatted.webhook_secret = data.webhook_secret ? String(data.webhook_secret).trim() : null;
    }

    if (data.welcome_message !== undefined) {
      formatted.welcome_message = data.welcome_message ? String(data.welcome_message).trim() : null;
    }

    if (data.help_message !== undefined) {
      formatted.help_message = data.help_message ? String(data.help_message).trim() : null;
    }

    // 处理其他字段
    Object.keys(data).forEach(key => {
      if (!(key in formatted)) {
        (formatted as any)[key] = (data as any)[key];
      }
    });

    return formatted;
  }

  /**
   * 比较更新前后的差异
   */
  static compareChanges(
    originalBot: Bot,
    updateData: UpdateBotData
  ): {
    hasChanges: boolean;
    changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      type: 'modified' | 'added' | 'removed';
    }>;
  } {
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      type: 'modified' | 'added' | 'removed';
    }> = [];

    Object.keys(updateData).forEach(key => {
      const fieldKey = key as keyof UpdateBotData;
      const newValue = updateData[fieldKey];
      const oldValue = originalBot[fieldKey as keyof Bot];

      // 特殊处理JSON字段
      if (key === 'keyboard_config' || key === 'price_config' || key === 'settings') {
        const oldJson = JSON.stringify(oldValue);
        const newJson = JSON.stringify(newValue);
        
        if (oldJson !== newJson) {
          changes.push({
            field: key,
            oldValue: oldValue,
            newValue: newValue,
            type: oldValue === null || oldValue === undefined ? 'added' : 'modified'
          });
        }
      } else {
        // 常规字段比较
        if (oldValue !== newValue) {
          changes.push({
            field: key,
            oldValue: oldValue,
            newValue: newValue,
            type: oldValue === null || oldValue === undefined ? 'added' : 'modified'
          });
        }
      }
    });

    return {
      hasChanges: changes.length > 0,
      changes
    };
  }

  /**
   * 生成更新摘要
   */
  static generateUpdateSummary(
    bot: Bot,
    changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      type: 'modified' | 'added' | 'removed';
    }>,
    syncResult?: any
  ): string {
    const lines = [
      '🔄 机器人更新摘要',
      '==================',
      `📝 机器人: ${bot.name} (@${bot.bot_username})`,
      `🆔 ID: ${bot.id}`,
      `📅 更新时间: ${new Date().toLocaleString('zh-CN')}`,
      ''
    ];

    if (changes.length > 0) {
      lines.push('📋 更新内容:');
      changes.forEach((change, index) => {
        const changeType = change.type === 'added' ? '➕' : change.type === 'modified' ? '✏️' : '➖';
        lines.push(`  ${changeType} ${change.field}: ${this.formatValue(change.oldValue)} → ${this.formatValue(change.newValue)}`);
      });
      lines.push('');
    }

    if (syncResult) {
      lines.push('🔗 同步结果:');
      if (syncResult.results) {
        Object.entries(syncResult.results).forEach(([key, success]) => {
          const emoji = success ? '✅' : '❌';
          lines.push(`  ${emoji} ${key}: ${success ? '成功' : '失败'}`);
        });
      }
      
      if (syncResult.errors && syncResult.errors.length > 0) {
        lines.push('');
        lines.push('⚠️ 同步错误:');
        syncResult.errors.forEach((error: string) => {
          lines.push(`  • ${error}`);
        });
      }
    }

    return lines.join('\n');
  }

  /**
   * 格式化值显示
   */
  private static formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '(空)';
    }
    
    if (typeof value === 'string') {
      return value.length > 50 ? `${value.substring(0, 50)}...` : value;
    }
    
    if (typeof value === 'object') {
      return '(对象)';
    }
    
    return String(value);
  }

  /**
   * 创建成功响应
   */
  static createSuccessResponse(
    bot: Bot,
    changes: any[],
    syncResult?: any
  ): object {
    // 生成适当的消息
    let message = '机器人更新成功';
    let warnings: string[] = [];
    
    if (syncResult) {
      if (!syncResult.success && syncResult.errors && syncResult.errors.length > 0) {
        // 检查是否为网络问题
        const hasNetworkError = syncResult.errors.some((error: string) => 
          error.includes('网络连接问题') || 
          error.includes('timeout') || 
          error.includes('fetch failed') ||
          error.includes('同步失败')
        );
        
        if (hasNetworkError) {
          message = '机器人更新成功，但同步到Telegram时遇到网络问题';
          warnings.push('同步到Telegram API失败，但数据库更新已成功完成');
          warnings.push('您可以稍后重试或检查网络连接');
        } else {
          message = '机器人更新成功，但部分同步操作失败';
          warnings = syncResult.errors;
        }
      } else if (syncResult.success) {
        message = '机器人更新并同步成功';
      }
    }

    const response: any = {
      success: true,
      message,
      data: {
        bot: {
          id: bot.id,
          name: bot.name,
          username: bot.bot_username,
          is_active: bot.is_active,
          work_mode: bot.work_mode,
          updated_at: bot.updated_at
        },
        changes: changes,
        sync_result: syncResult
      }
    };

    // 添加警告信息（如果有）
    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    return response;
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
   * 验证必要字段不为空
   */
  static validateRequiredFields(data: UpdateBotData): {
    isValid: boolean;
    emptyFields: string[];
  } {
    const emptyFields: string[] = [];
    const criticalFields = ['name', 'username', 'token'];

    criticalFields.forEach(field => {
      const value = data[field as keyof UpdateBotData];
      if (value !== undefined && (!value || String(value).trim() === '')) {
        emptyFields.push(field);
      }
    });

    return {
      isValid: emptyFields.length === 0,
      emptyFields
    };
  }

  /**
   * 检查是否有敏感字段更新
   */
  static checkSensitiveUpdates(updateData: UpdateBotData): string[] {
    const sensitiveFields = ['token', 'work_mode', 'webhook_url'];
    const warnings: string[] = [];

    sensitiveFields.forEach(field => {
      if (updateData[field as keyof UpdateBotData] !== undefined) {
        switch (field) {
          case 'token':
            warnings.push('Token更新需要验证新Token的有效性');
            break;
          case 'work_mode':
            warnings.push('工作模式更改可能需要重启机器人服务');
            break;
          case 'webhook_url':
            warnings.push('Webhook URL更改需要确保新URL可访问');
            break;
        }
      }
    });

    return warnings;
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
   * 合并配置对象
   */
  static mergeConfigs(existingConfig: any, newConfig: any): any {
    if (!existingConfig) {
      return newConfig;
    }
    
    if (!newConfig) {
      return existingConfig;
    }

    // 深度合并对象
    const merged = JSON.parse(JSON.stringify(existingConfig));
    
    Object.keys(newConfig).forEach(key => {
      if (newConfig[key] !== null && newConfig[key] !== undefined) {
        if (typeof newConfig[key] === 'object' && !Array.isArray(newConfig[key])) {
          merged[key] = this.mergeConfigs(merged[key], newConfig[key]);
        } else {
          merged[key] = newConfig[key];
        }
      }
    });

    return merged;
  }

  /**
   * 验证配置对象的大小
   */
  static validateConfigSize(config: any, maxSizeKB = 64): {
    isValid: boolean;
    currentSizeKB: number;
    message?: string;
  } {
    try {
      const configString = JSON.stringify(config);
      const sizeBytes = Buffer.byteLength(configString, 'utf8');
      const sizeKB = Math.round(sizeBytes / 1024 * 100) / 100;

      if (sizeKB > maxSizeKB) {
        return {
          isValid: false,
          currentSizeKB: sizeKB,
          message: `配置大小 ${sizeKB}KB 超过限制 ${maxSizeKB}KB`
        };
      }

      return {
        isValid: true,
        currentSizeKB: sizeKB
      };
    } catch (error) {
      return {
        isValid: false,
        currentSizeKB: 0,
        message: '配置格式无效'
      };
    }
  }

  /**
   * 生成更新批次ID
   */
  static generateUpdateBatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `update_${timestamp}_${random}`;
  }

  /**
   * 计算更新影响评分
   */
  static calculateUpdateImpact(changes: any[]): {
    score: number;
    level: 'low' | 'medium' | 'high';
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    // 高影响字段
    const highImpactFields = ['token', 'work_mode', 'is_active'];
    // 中影响字段
    const mediumImpactFields = ['webhook_url', 'keyboard_config', 'price_config'];
    // 低影响字段
    const lowImpactFields = ['name', 'description', 'short_description'];

    changes.forEach(change => {
      if (highImpactFields.includes(change.field)) {
        score += 3;
        factors.push(`${change.field} (高影响)`);
      } else if (mediumImpactFields.includes(change.field)) {
        score += 2;
        factors.push(`${change.field} (中影响)`);
      } else if (lowImpactFields.includes(change.field)) {
        score += 1;
        factors.push(`${change.field} (低影响)`);
      }
    });

    const level = score <= 2 ? 'low' : score <= 5 ? 'medium' : 'high';

    return { score, level, factors };
  }

  /**
   * 检查更新时间冲突
   */
  static checkUpdateConflict(
    botLastUpdated: Date,
    requestTime: Date,
    toleranceSeconds = 5
  ): {
    hasConflict: boolean;
    timeDiff: number;
    message?: string;
  } {
    const timeDiff = Math.abs(requestTime.getTime() - botLastUpdated.getTime()) / 1000;

    if (timeDiff < toleranceSeconds) {
      return {
        hasConflict: true,
        timeDiff,
        message: `检测到可能的并发更新冲突，时间差: ${timeDiff.toFixed(2)}秒`
      };
    }

    return {
      hasConflict: false,
      timeDiff
    };
  }

  /**
   * 生成回滚数据
   */
  static generateRollbackData(originalBot: Bot, changes: any[]): any {
    const rollbackData: any = {};

    changes.forEach(change => {
      rollbackData[change.field] = change.oldValue;
    });

    return {
      bot_id: originalBot.id,
      rollback_data: rollbackData,
      original_updated_at: originalBot.updated_at,
      created_at: new Date().toISOString()
    };
  }
}
