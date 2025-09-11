/**
 * 同步服务协调器
 * 负责协调各个同步模块，提供高级同步功能
 */
import { BotInfoSyncer } from './BotInfoSyncer';
import { CommandSyncer } from './CommandSyncer';
import { TelegramApiClient } from './TelegramApiClient';
import { WebhookSyncer } from './WebhookSyncer';
import { SyncDataValidator, TokenValidator } from './validators';

interface SyncStep {
  name: string;
  description: string;
  execute: () => Promise<boolean>;
}

export class SynchronizationService {
  /**
   * 逐步同步机器人设置
   */
  static async stepByStepSync(
    token: string,
    config: {
      name?: string;
      description?: string;
      shortDescription?: string;
      commands?: any[];
      workMode?: string;
      webhookUrl?: string;
      webhookSecret?: string;
      menuButton?: {
        is_enabled: boolean;
        button_text?: string;
        menu_type?: 'commands' | 'web_app';
        web_app_url?: string;
        commands?: any[];
      };
    }
  ): Promise<{
    success: boolean;
    results: Record<string, boolean>;
    errors: string[];
    summary: string;
  }> {
    const results: Record<string, boolean> = {};
    const errors: string[] = [];
    const steps: SyncStep[] = [];

    console.log('\n🔄 开始逐步同步机器人设置...');
    console.log('====================================');

    // 验证Token
    const tokenValidation = await TokenValidator.validateTokenAvailability(token);
    if (!tokenValidation.valid) {
      return {
        success: false,
        results: {},
        errors: [tokenValidation.error || 'Token验证失败'],
        summary: 'Token验证失败，同步中止'
      };
    }

    // 验证同步配置
    const configValidation = SyncDataValidator.validateSyncConfig(config);
    if (!configValidation.valid) {
      return {
        success: false,
        results: {},
        errors: configValidation.errors,
        summary: '配置验证失败，同步中止'
      };
    }

    // 构建同步步骤
    if (config.name) {
      steps.push({
        name: 'name',
        description: `设置机器人名称: ${config.name}`,
        execute: () => BotInfoSyncer.syncBotName(token, config.name!)
      });
    }

    if (config.description) {
      steps.push({
        name: 'description',
        description: '设置机器人描述',
        execute: () => BotInfoSyncer.syncBotDescription(token, config.description!)
      });
    }

    if (config.shortDescription) {
      steps.push({
        name: 'shortDescription',
        description: '设置机器人短描述',
        execute: () => BotInfoSyncer.syncBotShortDescription(token, config.shortDescription!)
      });
    }

    if (config.commands) {
      steps.push({
        name: 'commands',
        description: `设置机器人命令 (${config.commands.length}个)`,
        execute: () => CommandSyncer.syncBotCommands(token, config.commands!)
      });
    }

    // Webhook/Polling 模式设置
    if (config.workMode === 'webhook' && config.webhookUrl) {
      steps.push({
        name: 'webhook',
        description: `设置Webhook: ${config.webhookUrl}`,
        execute: () => WebhookSyncer.setWebhook(token, config.webhookUrl!, config.webhookSecret)
      });
    } else if (config.workMode === 'polling') {
      steps.push({
        name: 'webhook',
        description: '删除Webhook (切换到Polling模式)',
        execute: () => WebhookSyncer.deleteWebhook(token)
      });
    }

    if (config.menuButton !== undefined) {
      const buttonDesc = config.menuButton.is_enabled 
        ? `启用菜单按钮: ${config.menuButton.button_text || '菜单'} (${config.menuButton.menu_type || 'commands'})`
        : '禁用菜单按钮';
      
      steps.push({
        name: 'menuButton',
        description: buttonDesc,
        execute: () => BotInfoSyncer.syncMenuButton(token, config.menuButton)
      });
    }

    // 执行同步步骤
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`\n📋 步骤 ${i + 1}/${steps.length}: ${step.description}`);
      
      try {
        const result = await step.execute();
        results[step.name] = result;
        
        if (result) {
          console.log(`✅ 步骤 ${i + 1} 完成`);
        } else {
          console.log(`❌ 步骤 ${i + 1} 失败`);
          errors.push(`${step.description} 失败`);
        }
      } catch (error) {
        console.log(`💥 步骤 ${i + 1} 出错:`, error);
        results[step.name] = false;
        errors.push(`${step.description} 出错: ${error instanceof Error ? error.message : '未知错误'}`);
      }

      // 步骤间延迟，避免API限制
      if (i < steps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 生成摘要
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    const successRate = totalCount > 0 ? (successCount / totalCount * 100).toFixed(1) : '0';
    
    const summary = `同步完成: ${successCount}/${totalCount} 步骤成功 (${successRate}%)`;
    
    console.log('\n📊 同步结果摘要:');
    console.log('====================================');
    console.log(summary);
    
    if (errors.length > 0) {
      console.log(`❌ 错误信息 (${errors.length}个):`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    const success = errors.length === 0 && successCount === totalCount;

    return {
      success,
      results,
      errors,
      summary
    };
  }

  /**
   * 验证同步结果
   */
  static async verifySyncResult(token: string): Promise<{
    success: boolean;
    botInfo: any;
    webhookInfo: any;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // 获取机器人信息
      const botInfo = await TelegramApiClient.getBotInfo(token);
      
      // 获取Webhook信息
      const webhookInfo = await TelegramApiClient.getWebhookInfo(token);

      // 检查潜在问题
      if (!botInfo.username) {
        issues.push('机器人用户名未设置');
      }

      if (!botInfo.first_name) {
        issues.push('机器人名称未设置');
      }

      if (webhookInfo.url) {
        if (webhookInfo.pending_update_count > 100) {
          issues.push(`Webhook积压更新过多: ${webhookInfo.pending_update_count}`);
        }

        if (webhookInfo.last_error_date) {
          const errorDate = new Date(webhookInfo.last_error_date * 1000);
          const now = new Date();
          const timeDiff = now.getTime() - errorDate.getTime();
          
          // 如果最近5分钟内有错误
          if (timeDiff < 5 * 60 * 1000) {
            issues.push(`Webhook近期出错: ${webhookInfo.last_error_message}`);
          }
        }
      }

      return {
        success: issues.length === 0,
        botInfo,
        webhookInfo,
        issues
      };
    } catch (error) {
      console.error('验证同步结果失败:', error);
      return {
        success: false,
        botInfo: null,
        webhookInfo: null,
        issues: [`验证失败: ${error instanceof Error ? error.message : '未知错误'}`]
      };
    }
  }

  /**
   * 快速同步（只同步必要信息）
   */
  static async quickSync(
    token: string,
    config: {
      name?: string;
      workMode?: string;
      webhookUrl?: string;
    }
  ): Promise<{
    success: boolean;
    results: Record<string, boolean>;
  }> {
    const results: Record<string, boolean> = {};

    try {
      // 验证Token
      const tokenValidation = await TokenValidator.validateTokenAvailability(token);
      if (!tokenValidation.valid) {
        console.error('Token验证失败:', tokenValidation.error);
        return { success: false, results };
      }

      // 只同步关键设置
      if (config.name) {
        results.name = await BotInfoSyncer.syncBotName(token, config.name);
      }

      if (config.workMode === 'webhook' && config.webhookUrl) {
        // 验证Webhook URL
        const urlValidation = SyncDataValidator.validateWebhookUrl(config.webhookUrl);
        if (urlValidation.valid) {
          results.webhook = await WebhookSyncer.setWebhook(token, config.webhookUrl);
        } else {
          console.error('Webhook URL验证失败:', urlValidation.error);
          results.webhook = false;
        }
      } else if (config.workMode === 'polling') {
        results.webhook = await WebhookSyncer.deleteWebhook(token);
      }

      const success = Object.values(results).every(Boolean);
      return { success, results };
    } catch (error) {
      console.error('快速同步失败:', error);
      return { success: false, results };
    }
  }

  /**
   * 获取机器人信息（委托给API客户端）
   */
  static async getBotInfo(token: string): Promise<any> {
    return TelegramApiClient.getBotInfo(token);
  }

  /**
   * 获取Webhook信息（委托给API客户端）
   */
  static async getWebhookInfo(token: string): Promise<any> {
    return TelegramApiClient.getWebhookInfo(token);
  }

  /**
   * 检查API连接状态（委托给API客户端）
   */
  static async checkApiConnection(token: string): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    return TelegramApiClient.checkApiConnection(token);
  }

  /**
   * 检查Telegram API可访问性（委托给API客户端）
   */
  static async checkTelegramApiAccessibility(): Promise<{
    accessible: boolean;
    latency?: number;
    error?: string;
    ipInfo?: {
      country?: string;
      region?: string;
      isp?: string;
    };
    suggestions: string[];
  }> {
    return TelegramApiClient.checkTelegramApiAccessibility();
  }

  // 向后兼容的静态方法
  static async syncBotName(token: string, name: string): Promise<boolean> {
    return BotInfoSyncer.syncBotName(token, name);
  }

  static async syncBotDescription(token: string, description: string): Promise<boolean> {
    return BotInfoSyncer.syncBotDescription(token, description);
  }

  static async syncBotShortDescription(token: string, shortDescription: string): Promise<boolean> {
    return BotInfoSyncer.syncBotShortDescription(token, shortDescription);
  }

  static async syncBotCommands(token: string, commands: any[]): Promise<boolean> {
    return CommandSyncer.syncBotCommands(token, commands);
  }

  static async setWebhook(token: string, webhookUrl: string, secret?: string): Promise<boolean> {
    return WebhookSyncer.setWebhook(token, webhookUrl, secret);
  }

  static async deleteWebhook(token: string): Promise<boolean> {
    return WebhookSyncer.deleteWebhook(token);
  }

  static async syncMenuButton(token: string, menuButtonConfig?: {
    is_enabled: boolean;
    button_text?: string;
    menu_type?: 'commands' | 'web_app';
    web_app_url?: string;
    commands?: any[];
  }): Promise<boolean> {
    return BotInfoSyncer.syncMenuButton(token, menuButtonConfig);
  }
}
