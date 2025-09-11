/**
 * Telegram API 客户端
 * 负责与 Telegram Bot API 进行通信
 */
export class TelegramApiClient {
  private static readonly TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
  private static readonly MAX_RETRIES = 2;
  private static readonly RETRY_DELAY = 500;
  private static readonly REQUEST_TIMEOUT = 15000;

  /**
   * 调用Telegram API的通用方法
   */
  static async callTelegramAPI(
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
      
      // 添加网络错误的特殊处理
      if (isNetworkError) {
        const networkError = new Error(`Telegram API 网络连接失败: ${error.message}`);
        (networkError as any).isNetworkError = true;
        (networkError as any).originalError = error;
        throw networkError;
      }
      
      throw error;
    }
  }

  /**
   * 检查是否为网络错误，值得重试
   */
  static isNetworkError(error: any): boolean {
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

  /**
   * 检查当前服务器IP是否能访问Telegram API
   * 不需要具体的机器人token，只检查基础连接
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
    const suggestions: string[] = [];
    
    try {
      console.log('🔍 开始检测Telegram API可访问性...');
      
      const startTime = Date.now();
      
      // 使用一个无效token测试基础连接
      const testUrl = `${this.TELEGRAM_API_BASE}invalid_test_token/getMe`;
      console.log(`📡 测试URL: ${testUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      console.log(`📊 收到响应: 状态码=${response.status}, 延迟=${latency}ms`);
      
      // 能收到HTTP响应说明基础连接正常
      if (response.status >= 200 && response.status < 500) {
        console.log(`✅ Telegram API连接正常 (状态码: ${response.status})`);
        
        // 尝试读取响应内容以获取更多信息
        try {
          const responseText = await response.text();
          console.log(`📄 响应内容: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
        } catch (e) {
          console.log('📄 无法读取响应内容');
        }
        
        // 添加性能建议
        if (latency > 3000) {
          suggestions.push('网络延迟较高，建议更换网络环境');
        } else if (latency > 1000) {
          suggestions.push('当前网络到Telegram服务器延迟较高');
        }
        
        return {
          accessible: true,
          latency,
          suggestions
        };
      } else {
        // 5xx错误可能是服务器问题，但连接本身是通的
        if (response.status >= 500) {
          console.log(`⚠️ Telegram服务器错误 (状态码: ${response.status})，但网络连接正常`);
          
          return {
            accessible: true,
            latency,
            suggestions: ['Telegram服务器暂时出现问题，但网络连接正常']
          };
        }
        
        // 其他情况
        const errorText = await response.text();
        console.log(`⚠️ 收到意外响应状态: ${response.status}`);
        
        suggestions.push(`收到HTTP状态码: ${response.status}`);
        suggestions.push('这可能表示网络代理或防火墙的干扰');
        
        return {
          accessible: false,
          error: `HTTP状态码: ${response.status}`,
          suggestions
        };
      }
      
    } catch (error: any) {
      console.error('❌ Telegram API连接检测失败:', error);
      
      const errorMessage = error.message || '未知错误';
      
      // 根据错误类型给出具体建议
      if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
        suggestions.push('请求超时，可能的原因：');
        suggestions.push('• 当前IP被Telegram限制或屏蔽');
        suggestions.push('• 网络连接不稳定');
        suggestions.push('• 防火墙阻止了连接');
        suggestions.push('建议：更换IP地址或使用VPN/代理');
      } else if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ECONNREFUSED')) {
        suggestions.push('连接被重置或拒绝，可能的原因：');
        suggestions.push('• 当前IP被Telegram屏蔽');
        suggestions.push('• 网络运营商限制了访问');
        suggestions.push('• 服务器防火墙设置问题');
        suggestions.push('建议：立即更换IP地址或联系网络管理员');
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
        suggestions.push('DNS解析失败，可能的原因：');
        suggestions.push('• DNS服务器问题');
        suggestions.push('• 网络配置错误');
        suggestions.push('建议：更换DNS服务器或检查网络设置');
      } else if (errorMessage.includes('fetch failed')) {
        suggestions.push('网络请求失败，可能的原因：');
        suggestions.push('• 当前IP无法访问Telegram API');
        suggestions.push('• 网络连接问题');
        suggestions.push('• SSL/TLS证书问题');
        suggestions.push('建议：更换网络环境或IP地址');
      } else {
        suggestions.push('网络连接异常');
        suggestions.push('建议：检查网络设置或更换IP地址');
      }
      
      return {
        accessible: false,
        error: errorMessage,
        suggestions
      };
    }
  }
}
