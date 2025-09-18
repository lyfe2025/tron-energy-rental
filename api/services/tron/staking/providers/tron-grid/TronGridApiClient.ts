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

    console.log(`[TronGridApiClient] 发起API请求: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    console.log(`[TronGridApiClient] API响应状态: ${response.status} ${response.statusText}`);
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
}
