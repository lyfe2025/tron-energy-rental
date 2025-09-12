/**
 * Webhook验证器
 * 验证Webhook相关配置和URL格式
 */

export interface WebhookValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Webhook验证器类
 */
export class WebhookValidator {
  /**
   * 验证Webhook URL格式
   * @param webhookUrl Webhook URL
   */
  static validateWebhookUrl(webhookUrl: string): WebhookValidationResult {
    if (!webhookUrl) {
      return {
        isValid: false,
        message: 'Webhook URL不能为空'
      };
    }
    
    try {
      const parsedUrl = new URL(webhookUrl);
      
      // 必须使用HTTPS协议
      if (parsedUrl.protocol !== 'https:') {
        return {
          isValid: false,
          message: 'Webhook URL必须使用HTTPS协议'
        };
      }
      
      // 验证域名格式
      if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
        return {
          isValid: false,
          message: 'Webhook URL必须包含有效的域名'
        };
      }
      
      // 不允许使用localhost或本地IP（生产环境）
      const forbiddenHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
      if (forbiddenHosts.includes(parsedUrl.hostname)) {
        return {
          isValid: false,
          message: '不允许使用本地地址作为Webhook URL'
        };
      }
      
    } catch (error) {
      return {
        isValid: false,
        message: 'Webhook URL格式不正确'
      };
    }
    
    return { isValid: true };
  }

  /**
   * 验证Webhook密钥
   * @param secret Webhook密钥
   */
  static validateWebhookSecret(secret?: string): WebhookValidationResult {
    if (secret !== undefined && secret !== null) {
      // 如果提供了密钥，验证其格式
      if (typeof secret !== 'string') {
        return {
          isValid: false,
          message: 'Webhook密钥必须是字符串类型'
        };
      }
      
      // 密钥长度限制（1-256字符）
      if (secret.length === 0 || secret.length > 256) {
        return {
          isValid: false,
          message: 'Webhook密钥长度必须在1-256字符之间'
        };
      }
    }
    
    return { isValid: true };
  }

  /**
   * 验证最大连接数
   * @param maxConnections 最大连接数
   */
  static validateMaxConnections(maxConnections?: number): WebhookValidationResult {
    if (maxConnections !== undefined && maxConnections !== null) {
      if (typeof maxConnections !== 'number') {
        return {
          isValid: false,
          message: '最大连接数必须是数字类型'
        };
      }
      
      // Telegram允许的连接数范围：1-100
      if (maxConnections < 1 || maxConnections > 100) {
        return {
          isValid: false,
          message: '最大连接数必须在1-100之间'
        };
      }
    }
    
    return { isValid: true };
  }

  /**
   * 验证完整的Webhook配置
   * @param config Webhook配置
   */
  static validateWebhookConfig(config: {
    webhook_url?: string;
    webhook_secret?: string;
    max_connections?: number;
  }): WebhookValidationResult {
    const { webhook_url, webhook_secret, max_connections } = config;
    
    // 验证URL
    if (webhook_url) {
      const urlResult = this.validateWebhookUrl(webhook_url);
      if (!urlResult.isValid) {
        return urlResult;
      }
    }
    
    // 验证密钥
    const secretResult = this.validateWebhookSecret(webhook_secret);
    if (!secretResult.isValid) {
      return secretResult;
    }
    
    // 验证最大连接数
    const connectionsResult = this.validateMaxConnections(max_connections);
    if (!connectionsResult.isValid) {
      return connectionsResult;
    }
    
    return { isValid: true };
  }

  /**
   * 验证Web App URL（用于菜单按钮）
   * @param webAppUrl Web App URL
   */
  static validateWebAppUrl(webAppUrl: string): WebhookValidationResult {
    if (!webAppUrl) {
      return {
        isValid: false,
        message: 'Web App URL不能为空'
      };
    }
    
    try {
      const parsedUrl = new URL(webAppUrl);
      
      // 必须使用HTTPS协议
      if (parsedUrl.protocol !== 'https:') {
        return {
          isValid: false,
          message: 'Web App URL必须使用HTTPS协议'
        };
      }
      
    } catch (error) {
      return {
        isValid: false,
        message: 'Web App URL格式不正确'
      };
    }
    
    return { isValid: true };
  }

  /**
   * 检查URL是否可达（异步验证）
   * @param url 要检查的URL
   * @param timeout 超时时间（毫秒）
   */
  static async checkUrlReachability(url: string, timeout: number = 5000): Promise<WebhookValidationResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return { isValid: true };
      } else {
        return {
          isValid: false,
          message: `URL无法访问，状态码：${response.status}`
        };
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          isValid: false,
          message: '连接超时'
        };
      }
      
      return {
        isValid: false,
        message: `连接失败：${error.message}`
      };
    }
  }
}
