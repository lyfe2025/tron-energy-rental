import type { TronGridConfig } from '../../types/staking.types.ts';
import { NetworkProvider } from '../NetworkProvider.ts';

/**
 * TronGrid API客户端
 * 负责所有的HTTP请求处理
 */
export class TronGridApiClient {
  private networkProvider: NetworkProvider;

  constructor(networkConfig?: any) {
    this.networkProvider = new NetworkProvider(networkConfig);
  }

  /**
   * 设置网络配置
   */
  setNetworkConfig(config: any): void {
    this.networkProvider.setNetworkConfig(config);
  }

  /**
   * 获取TronGrid配置
   */
  private getTronGridConfig(): TronGridConfig {
    return this.networkProvider.getTronGridConfig();
  }

  /**
   * 通用的API请求方法
   */
  async makeRequest(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const { baseUrl, headers } = this.getTronGridConfig();
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    // 静默发起请求，只在异常时输出日志

    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    // 只在请求失败时输出日志
    if (!response.ok) {
      console.error(`[TronGridApiClient] ❌ API请求失败: ${response.status} ${response.statusText} - ${fullUrl}`);
    }
    
    return response;
  }

  /**
   * POST请求封装
   */
  async postRequest(url: string, body: any): Promise<Response> {
    return this.makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }

  /**
   * GET请求封装
   */
  async getRequest(url: string): Promise<Response> {
    return this.makeRequest(url, {
      method: 'GET'
    });
  }

  /**
   * 获取网络信息
   */
  getNetworkInfo(): {
    name: string;
    id: string;
    isTestNet: boolean;
    isValid: boolean;
  } {
    return {
      name: this.networkProvider.getNetworkName(),
      id: this.networkProvider.getNetworkId(),
      isTestNet: this.networkProvider.isTestNet(),
      isValid: this.networkProvider.isConfigValid()
    };
  }

  /**
   * 获取账户的TRC20代币交易记录
   */
  async getAccountTrc20Transactions(address: string, limit: number = 100): Promise<any> {
    try {
      const url = `/v1/accounts/${address}/transactions/trc20?limit=${limit}`;
      const response = await this.makeRequest(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TronGridApiClient] TRC20 API响应错误: ${response.status} ${response.statusText}`, errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data: []
        };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data.data || []
      };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error(`[TronGridApiClient] 获取TRC20交易失败:`, {
        error: errorMessage,
        stack: error?.stack,
        address,
        limit
      });
      return {
        success: false,
        error: errorMessage,
        data: []
      };
    }
  }
}
