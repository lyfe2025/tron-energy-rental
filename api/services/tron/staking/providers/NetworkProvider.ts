import type { NetworkConfig, TronGridConfig } from '../types/staking.types';

/**
 * 网络配置提供者
 * 负责管理TRON网络配置和TronGrid API配置
 */
export class NetworkProvider {
  private networkConfig: NetworkConfig | null = null;

  constructor(networkConfig?: NetworkConfig) {
    this.networkConfig = networkConfig || null;
  }

  /**
   * 设置网络配置
   */
  setNetworkConfig(config: NetworkConfig): void {
    this.networkConfig = config;
  }

  /**
   * 获取当前网络配置
   */
  getNetworkConfig(): NetworkConfig | null {
    return this.networkConfig;
  }

  /**
   * 获取TronGrid API的基础URL和请求头
   */
  getTronGridConfig(): TronGridConfig {
    // 完全静默获取配置，不输出日志

    if (this.networkConfig) {
      let baseUrl = this.networkConfig.rpcUrl || 
                   this.networkConfig.rpc_url || 
                   this.networkConfig.fullHost || 
                   'https://api.trongrid.io';

      // 确保URL指向TronGrid格式
      if (baseUrl.includes('api.trongrid.io') || 
          baseUrl.includes('api.shasta.trongrid.io') || 
          baseUrl.includes('nile.trongrid.io')) {
        // 已经是TronGrid格式（静默处理）
      } else if (baseUrl.includes('trongrid.io')) {
        // 可能是其他TronGrid格式，保持原样（静默处理）
      } else {
        // 使用默认TronGrid（这种情况需要警告，因为是配置错误）
        console.warn(`[NetworkProvider] ❌ 非TronGrid格式，使用默认主网: ${baseUrl}`);
        baseUrl = 'https://api.trongrid.io';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // 添加API Key
      if (this.networkConfig.apiKey || this.networkConfig.api_key) {
        const apiKey = this.networkConfig.apiKey || this.networkConfig.api_key;
        headers['TRON-PRO-API-KEY'] = apiKey;
        // 静默设置API Key
      } else {
        // 没有API Key时给出警告（这可能影响功能）
        console.warn(`[NetworkProvider] ⚠️ 没有API Key，可能影响API调用`);
      }
      return { baseUrl, headers };
    }

    // 默认配置（这种情况需要警告，因为可能是配置问题）
    console.warn(`[NetworkProvider] ⚠️ 没有网络配置，使用默认主网配置`);
    return {
      baseUrl: 'https://api.trongrid.io',
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * 验证网络配置是否有效
   */
  isConfigValid(): boolean {
    if (!this.networkConfig) {
      return false;
    }

    const hasValidUrl = !!(this.networkConfig.rpcUrl || 
                          this.networkConfig.rpc_url || 
                          this.networkConfig.fullHost);

    return hasValidUrl;
  }

  /**
   * 获取网络名称
   */
  getNetworkName(): string {
    if (!this.networkConfig || !this.networkConfig.name) {
      return 'unknown';
    }
    return this.networkConfig.name;
  }

  /**
   * 检查是否为测试网络
   */
  isTestNet(): boolean {
    if (!this.networkConfig) {
      return false;
    }

    const url = this.networkConfig.rpcUrl || 
                this.networkConfig.rpc_url || 
                this.networkConfig.fullHost || '';

    return url.includes('shasta') || url.includes('nile') || url.includes('test');
  }

  /**
   * 获取网络标识符
   */
  getNetworkId(): string {
    const name = this.getNetworkName().toLowerCase();
    if (name.includes('main') || name === 'unknown') {
      return 'mainnet';
    } else if (name.includes('shasta')) {
      return 'shasta';
    } else if (name.includes('nile')) {
      return 'nile';
    } else {
      return 'testnet';
    }
  }
}
