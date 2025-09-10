/**
 * 网络设置服务
 * 负责与Telegram API进行同步和网络配置
 */

export class NetworkSetup {
  private static readonly TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;

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
      const options: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const result = await response.json();

      if (!result.ok) {
        throw new Error(`Telegram API错误: ${result.description || '未知错误'}`);
      }

      return result.result;
    } catch (error) {
      console.error(`Telegram API调用失败 (${method}):`, error);
      
      if (retries < this.MAX_RETRIES) {
        console.log(`重试 ${retries + 1}/${this.MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (retries + 1)));
        return this.callTelegramAPI(token, method, data, retries + 1);
      }
      
      throw error;
    }
  }

  /**
   * 设置机器人名称
   */
  static async setBotName(token: string, name: string): Promise<boolean> {
    try {
      await this.callTelegramAPI(token, 'setMyName', { name });
      console.log(`机器人名称设置成功: ${name}`);
      return true;
    } catch (error) {
      console.error('设置机器人名称失败:', error);
      throw new Error(`设置机器人名称失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 设置机器人描述
   */
  static async setBotDescription(token: string, description: string): Promise<boolean> {
    try {
      await this.callTelegramAPI(token, 'setMyDescription', { description });
      console.log('机器人描述设置成功');
      return true;
    } catch (error) {
      console.error('设置机器人描述失败:', error);
      throw new Error(`设置机器人描述失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 设置机器人短描述
   */
  static async setBotShortDescription(token: string, shortDescription: string): Promise<boolean> {
    try {
      await this.callTelegramAPI(token, 'setMyShortDescription', { short_description: shortDescription });
      console.log('机器人短描述设置成功');
      return true;
    } catch (error) {
      console.error('设置机器人短描述失败:', error);
      throw new Error(`设置机器人短描述失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 设置机器人命令
   */
  static async setBotCommands(token: string, commands: any[]): Promise<boolean> {
    try {
      await this.callTelegramAPI(token, 'setMyCommands', { commands });
      console.log(`机器人命令设置成功，共 ${commands.length} 个命令`);
      return true;
    } catch (error) {
      console.error('设置机器人命令失败:', error);
      throw new Error(`设置机器人命令失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 设置Webhook
   */
  static async setWebhook(token: string, webhookUrl: string): Promise<boolean> {
    try {
      const webhookData = {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'inline_query'],
        drop_pending_updates: true
      };

      await this.callTelegramAPI(token, 'setWebhook', webhookData);
      console.log(`Webhook设置成功: ${webhookUrl}`);
      return true;
    } catch (error) {
      console.error('设置Webhook失败:', error);
      throw new Error(`设置Webhook失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除Webhook (用于polling模式)
   */
  static async deleteWebhook(token: string): Promise<boolean> {
    try {
      await this.callTelegramAPI(token, 'deleteWebhook', { drop_pending_updates: true });
      console.log('Webhook删除成功');
      return true;
    } catch (error) {
      console.error('删除Webhook失败:', error);
      throw new Error(`删除Webhook失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 设置菜单按钮
   */
  static async setMenuButton(token: string, menuButton?: any): Promise<boolean> {
    try {
      const defaultMenuButton = {
        type: 'commands'
      };

      await this.callTelegramAPI(token, 'setChatMenuButton', {
        menu_button: menuButton || defaultMenuButton
      });
      console.log('菜单按钮设置成功');
      return true;
    } catch (error) {
      console.error('设置菜单按钮失败:', error);
      throw new Error(`设置菜单按钮失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证Webhook状态
   */
  static async getWebhookInfo(token: string): Promise<any> {
    try {
      const webhookInfo = await this.callTelegramAPI(token, 'getWebhookInfo');
      return webhookInfo;
    } catch (error) {
      console.error('获取Webhook信息失败:', error);
      throw new Error(`获取Webhook信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 综合设置机器人所有网络配置
   */
  static async setupBotNetwork(
    token: string,
    config: {
      name: string;
      description: string;
      shortDescription: string;
      commands: any[];
      workMode: string;
      webhookUrl?: string;
      menuButton?: any;
    }
  ): Promise<{
    success: boolean;
    results: {
      name: boolean;
      description: boolean;
      shortDescription: boolean;
      commands: boolean;
      webhook: boolean;
      menuButton: boolean;
    };
    errors: string[];
  }> {
    const results = {
      name: false,
      description: false,
      shortDescription: false,
      commands: false,
      webhook: false,
      menuButton: false
    };
    const errors: string[] = [];

    console.log('开始设置机器人网络配置...');

    // 1. 设置机器人名称
    try {
      results.name = await this.setBotName(token, config.name);
    } catch (error) {
      errors.push(`设置名称失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 2. 设置机器人描述
    try {
      results.description = await this.setBotDescription(token, config.description);
    } catch (error) {
      errors.push(`设置描述失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 3. 设置机器人短描述
    try {
      results.shortDescription = await this.setBotShortDescription(token, config.shortDescription);
    } catch (error) {
      errors.push(`设置短描述失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 4. 设置机器人命令
    try {
      results.commands = await this.setBotCommands(token, config.commands);
    } catch (error) {
      errors.push(`设置命令失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 5. 设置Webhook或polling模式
    try {
      if (config.workMode === 'webhook' && config.webhookUrl) {
        results.webhook = await this.setWebhook(token, config.webhookUrl);
      } else {
        results.webhook = await this.deleteWebhook(token);
      }
    } catch (error) {
      errors.push(`设置工作模式失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 6. 设置菜单按钮
    try {
      results.menuButton = await this.setMenuButton(token, config.menuButton);
    } catch (error) {
      errors.push(`设置菜单按钮失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    const success = Object.values(results).every(result => result === true);

    console.log('机器人网络配置设置完成:', {
      success,
      results,
      errorsCount: errors.length
    });

    return {
      success,
      results,
      errors
    };
  }

  /**
   * 验证机器人配置状态
   */
  static async verifyBotConfiguration(token: string): Promise<{
    isValid: boolean;
    info: any;
    webhook: any;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // 获取机器人信息
      const botInfo = await this.callTelegramAPI(token, 'getMe');
      
      // 获取Webhook信息
      const webhookInfo = await this.getWebhookInfo(token);

      // 检查机器人信息完整性
      if (!botInfo.username) {
        issues.push('机器人用户名未设置');
      }

      if (!botInfo.first_name) {
        issues.push('机器人名称未设置');
      }

      // 检查Webhook状态
      if (webhookInfo.url && !webhookInfo.has_custom_certificate) {
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
        isValid: issues.length === 0,
        info: botInfo,
        webhook: webhookInfo,
        issues
      };
    } catch (error) {
      console.error('验证机器人配置失败:', error);
      return {
        isValid: false,
        info: null,
        webhook: null,
        issues: [`验证失败: ${error instanceof Error ? error.message : '未知错误'}`]
      };
    }
  }

  /**
   * 测试机器人连接
   */
  static async testBotConnection(token: string): Promise<{
    success: boolean;
    latency?: number;
    botInfo?: any;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const botInfo = await this.callTelegramAPI(token, 'getMe');
      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
        botInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '连接测试失败'
      };
    }
  }
}
