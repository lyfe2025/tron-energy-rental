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
    console.log(`[NetworkProvider] 🌐 获取TronGrid配置`);
    console.log(`[NetworkProvider] 当前网络配置:`, this.networkConfig ? {
      name: this.networkConfig.name,
      rpc_url: this.networkConfig.rpcUrl || this.networkConfig.rpc_url,
      api_key: (this.networkConfig.apiKey || this.networkConfig.api_key) ? 
        `${(this.networkConfig.apiKey || this.networkConfig.api_key).substring(0, 8)}...` : 'none'
    } : 'null');

    if (this.networkConfig) {
      let baseUrl = this.networkConfig.rpcUrl || 
                   this.networkConfig.rpc_url || 
                   this.networkConfig.fullHost || 
                   'https://api.trongrid.io';

      console.log(`[NetworkProvider] 原始rpcUrl: ${this.networkConfig.rpcUrl || this.networkConfig.rpc_url}`);
      console.log(`[NetworkProvider] 处理后baseUrl: ${baseUrl}`);

      // 确保URL指向TronGrid格式
      if (baseUrl.includes('api.trongrid.io') || 
          baseUrl.includes('api.shasta.trongrid.io') || 
          baseUrl.includes('nile.trongrid.io')) {
        // 已经是TronGrid格式
        console.log(`[NetworkProvider] ✅ TronGrid格式正确`);
      } else if (baseUrl.includes('trongrid.io')) {
        // 可能是其他TronGrid格式，保持原样
        console.log(`[NetworkProvider] ⚠️ 其他TronGrid格式，保持原样`);
      } else {
        // 使用默认TronGrid
        console.log(`[NetworkProvider] ❌ 非TronGrid格式，使用默认主网`);
        baseUrl = 'https://api.trongrid.io';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // 添加API Key
      if (this.networkConfig.apiKey || this.networkConfig.api_key) {
        const apiKey = this.networkConfig.apiKey || this.networkConfig.api_key;
        headers['TRON-PRO-API-KEY'] = apiKey;
        console.log(`[NetworkProvider] ✅ API Key已设置: ${apiKey.substring(0, 8)}...`);
      } else {
        console.log(`[NetworkProvider] ⚠️ 没有API Key`);
      }

      console.log(`[NetworkProvider] 最终配置 - URL: ${baseUrl}`);
      return { baseUrl, headers };
    }

    // 默认配置
    console.log(`[NetworkProvider] ⚠️ 使用默认主网配置`);
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
