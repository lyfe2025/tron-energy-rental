/**
 * 同步服务
 * 负责将机器人信息与Telegram API同步
 */

interface SyncStep {
  name: string;
  description: string;
  execute: () => Promise<boolean>;
}

export class SynchronizationService {
  private static readonly TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly REQUEST_TIMEOUT = 30000; // 30秒超时

  /**
   * 调用Telegram API的通用方法
   */
  private static async callTelegramAPI(
    token: string,
    method: string,
    data?: any,
    retries = 0
  ): Promise<any> {
    try {
      const url = `${this.TELEGRAM_API_BASE}${token}/${method}`;
      
      // 创建带超时的AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);
      
      const options: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      const result = await response.json();

      if (!result.ok) {
        throw new Error(`Telegram API错误: ${result.description || '未知错误'}`);
      }

      return result.result;
    } catch (error) {
      console.error(`Telegram API调用失败 (${method}):`, error);
      
      // 检查是否为网络相关错误，值得重试
      const isNetworkError = this.isNetworkError(error);
      
      if (retries < this.MAX_RETRIES && isNetworkError) {
        const delay = this.RETRY_DELAY * Math.pow(2, retries); // 指数退避
        console.log(`重试 ${retries + 1}/${this.MAX_RETRIES}... (${delay}ms后)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callTelegramAPI(token, method, data, retries + 1);
      }
      
      throw error;
    }
  }

  /**
   * 检查是否为网络错误，值得重试
   */
  private static isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    // 网络超时、连接重置、DNS错误等
    const networkErrorPatterns = [
      'fetch failed',
      'network error',
      'timeout',
      'ECONNRESET',
      'ECONNREFUSED', 
      'ENOTFOUND',
      'ETIMEDOUT',
      'UND_ERR_CONNECT_TIMEOUT',
      'AbortError'
    ];
    
    return networkErrorPatterns.some(pattern => 
      errorMessage.includes(pattern) || errorCode.includes(pattern)
    );
  }

  /**
   * 同步机器人名称
   */
  static async syncBotName(token: string, name: string): Promise<boolean> {
    try {
      await this.callTelegramAPI(token, 'setMyName', { name });
      console.log(`✅ 机器人名称同步成功: ${name}`);
      return true;
    } catch (error) {
      console.error('❌ 同步机器人名称失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 同步机器人描述
   */
  static async syncBotDescription(token: string, description: string): Promise<boolean> {
    try {
      await this.callTelegramAPI(token, 'setMyDescription', { description });
      console.log('✅ 机器人描述同步成功');
      return true;
    } catch (error) {
      console.error('❌ 同步机器人描述失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 同步机器人短描述
   */
  static async syncBotShortDescription(token: string, shortDescription: string): Promise<boolean> {
    try {
      await this.callTelegramAPI(token, 'setMyShortDescription', { 
        short_description: shortDescription 
      });
      console.log('✅ 机器人短描述同步成功');
      return true;
    } catch (error) {
      console.error('❌ 同步机器人短描述失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 同步机器人命令
   */
  static async syncBotCommands(token: string, commands: any[]): Promise<boolean> {
    try {
      await this.callTelegramAPI(token, 'setMyCommands', { commands });
      console.log(`✅ 机器人命令同步成功，共 ${commands.length} 个命令`);
      return true;
    } catch (error) {
      console.error('❌ 同步机器人命令失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 设置Webhook
   */
  static async setWebhook(token: string, webhookUrl: string, secret?: string): Promise<boolean> {
    try {
      const webhookData: any = {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'inline_query'],
        drop_pending_updates: true
      };

      if (secret) {
        webhookData.secret_token = secret;
      }

      await this.callTelegramAPI(token, 'setWebhook', webhookData);
      console.log(`✅ Webhook设置成功: ${webhookUrl}`);
      return true;
    } catch (error) {
      console.error('❌ 设置Webhook失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 删除Webhook
   */
  static async deleteWebhook(token: string): Promise<boolean> {
    try {
      await this.callTelegramAPI(token, 'deleteWebhook', { 
        drop_pending_updates: true 
      });
      console.log('✅ Webhook删除成功');
      return true;
    } catch (error) {
      console.error('❌ 删除Webhook失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 同步菜单按钮
   */
  static async syncMenuButton(token: string, menuButtonConfig?: {
    is_enabled: boolean;
    button_text?: string;
    menu_type?: 'commands' | 'web_app';
    web_app_url?: string;
    commands?: any[];
  }): Promise<boolean> {
    try {
      let menuButtonData: any;

      if (!menuButtonConfig || !menuButtonConfig.is_enabled) {
        // 禁用菜单按钮 - 使用default type
        menuButtonData = {
          type: 'default'
        };
        console.log('🔄 禁用菜单按钮');
      } else {
        // 启用菜单按钮
        if (menuButtonConfig.menu_type === 'web_app' && menuButtonConfig.web_app_url) {
          // Web App类型菜单按钮
          menuButtonData = {
            type: 'web_app',
            text: menuButtonConfig.button_text || '菜单',
            web_app: {
              url: menuButtonConfig.web_app_url
            }
          };
          console.log(`🔄 设置Web App菜单按钮: ${menuButtonConfig.button_text} -> ${menuButtonConfig.web_app_url}`);
        } else {
          // 命令类型菜单按钮（注意：commands类型不支持自定义text参数）
          menuButtonData = {
            type: 'commands'
          };
          console.log('🔄 设置命令菜单按钮（文本固定为"Menu"）');
        }
      }

      // 调用Telegram API设置菜单按钮
      // 注意：chat_id参数可选，不提供则设置为所有私聊的默认菜单按钮
      await this.callTelegramAPI(token, 'setChatMenuButton', {
        menu_button: menuButtonData
      });
      
      console.log('✅ 菜单按钮同步成功');
      return true;
    } catch (error) {
      console.error('❌ 同步菜单按钮失败:', error);
      return false;
    }
  }

  /**
   * 获取当前机器人信息
   */
  static async getBotInfo(token: string): Promise<any> {
    try {
      const botInfo = await this.callTelegramAPI(token, 'getMe');
      return botInfo;
    } catch (error) {
      console.error('❌ 获取机器人信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取Webhook信息
   */
  static async getWebhookInfo(token: string): Promise<any> {
    try {
      const webhookInfo = await this.callTelegramAPI(token, 'getWebhookInfo');
      return webhookInfo;
    } catch (error) {
      console.error('❌ 获取Webhook信息失败:', error);
      throw error;
    }
  }

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

    // 构建同步步骤
    if (config.name) {
      steps.push({
        name: 'name',
        description: `设置机器人名称: ${config.name}`,
        execute: () => this.syncBotName(token, config.name!)
      });
    }

    if (config.description) {
      steps.push({
        name: 'description',
        description: '设置机器人描述',
        execute: () => this.syncBotDescription(token, config.description!)
      });
    }

    if (config.shortDescription) {
      steps.push({
        name: 'shortDescription',
        description: '设置机器人短描述',
        execute: () => this.syncBotShortDescription(token, config.shortDescription!)
      });
    }

    if (config.commands) {
      steps.push({
        name: 'commands',
        description: `设置机器人命令 (${config.commands.length}个)`,
        execute: () => this.syncBotCommands(token, config.commands!)
      });
    }

    // Webhook/Polling 模式设置
    if (config.workMode === 'webhook' && config.webhookUrl) {
      steps.push({
        name: 'webhook',
        description: `设置Webhook: ${config.webhookUrl}`,
        execute: () => this.setWebhook(token, config.webhookUrl!, config.webhookSecret)
      });
    } else if (config.workMode === 'polling') {
      steps.push({
        name: 'webhook',
        description: '删除Webhook (切换到Polling模式)',
        execute: () => this.deleteWebhook(token)
      });
    }

    if (config.menuButton !== undefined) {
      const buttonDesc = config.menuButton.is_enabled 
        ? `启用菜单按钮: ${config.menuButton.button_text || '菜单'} (${config.menuButton.menu_type || 'commands'})`
        : '禁用菜单按钮';
      
      steps.push({
        name: 'menuButton',
        description: buttonDesc,
        execute: () => this.syncMenuButton(token, config.menuButton)
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
      const botInfo = await this.getBotInfo(token);
      
      // 获取Webhook信息
      const webhookInfo = await this.getWebhookInfo(token);

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
      // 只同步关键设置
      if (config.name) {
        results.name = await this.syncBotName(token, config.name);
      }

      if (config.workMode === 'webhook' && config.webhookUrl) {
        results.webhook = await this.setWebhook(token, config.webhookUrl);
      } else if (config.workMode === 'polling') {
        results.webhook = await this.deleteWebhook(token);
      }

      const success = Object.values(results).every(Boolean);
      return { success, results };
    } catch (error) {
      console.error('快速同步失败:', error);
      return { success: false, results };
    }
  }

  /**
   * 检查API连接状态
   */
  static async checkApiConnection(token: string): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      await this.getBotInfo(token);
      const latency = Date.now() - startTime;

      return {
        connected: true,
        latency
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : '连接失败'
      };
    }
  }
}
