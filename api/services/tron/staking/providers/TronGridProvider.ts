import type {
  ChainParametersResponse,
  NetworkConfig,
  ServiceResponse,
  TronGridAccountResponse,
  TronGridConfig
} from '../types/staking.types';
import { NetworkProvider } from './NetworkProvider';

/**
 * TronGrid API提供者
 * 负责与TronGrid API的所有通信
 */
export class TronGridProvider {
  private networkProvider: NetworkProvider;

  constructor(networkConfig?: NetworkConfig) {
    this.networkProvider = new NetworkProvider(networkConfig);
  }

  /**
   * 设置网络配置
   */
  setNetworkConfig(config: NetworkConfig): void {
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
  private async makeRequest(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const { baseUrl, headers } = this.getTronGridConfig();
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    console.log(`[TronGridProvider] 发起API请求: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    console.log(`[TronGridProvider] API响应状态: ${response.status} ${response.statusText}`);
    return response;
  }

  /**
   * 获取账户的所有交易记录
   */
  async getAccountTransactions(
    address: string, 
    limit: number = 20, 
    orderBy: string = 'block_timestamp,desc'
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log(`[TronGridProvider] 获取账户交易记录: ${address}`);

      const url = `/v1/accounts/${address}/transactions?limit=${Math.min(limit * 10, 200)}&order_by=${orderBy}`;
      const response = await this.makeRequest(url);

      if (response.ok) {
        const data = await response.json();
        const transactions = data.data || [];

        console.log(`[TronGridProvider] 成功获取 ${transactions.length} 条交易记录`);

        return {
          success: true,
          data: transactions
        };
      } else {
        const error = `TronGrid API请求失败: ${response.status} ${response.statusText}`;
        console.warn(`[TronGridProvider] ${error}`);
        return {
          success: false,
          error,
          data: []
        };
      }
    } catch (error: any) {
      console.error('[TronGridProvider] 获取账户交易记录失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 获取账户详细信息
   */
  async getAccountInfo(address: string): Promise<ServiceResponse<TronGridAccountResponse>> {
    try {
      console.log(`[TronGridProvider] 获取账户信息: ${address}`);

      const response = await this.makeRequest('/wallet/getaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: address,
          visible: true
        })
      });

      if (response.ok) {
        const accountInfo = await response.json();
        console.log(`[TronGridProvider] 成功获取账户信息`);

        return {
          success: true,
          data: accountInfo
        };
      } else {
        const error = `获取账户信息失败: ${response.status} ${response.statusText}`;
        console.warn(`[TronGridProvider] ${error}`);
        return {
          success: false,
          error
        };
      }
    } catch (error: any) {
      console.error('[TronGridProvider] 获取账户信息失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取TRON网络链参数
   */
  async getChainParameters(): Promise<ServiceResponse<ChainParametersResponse>> {
    try {
      console.log(`[TronGridProvider] 🔍 查询TRON网络链参数...`);

      const response = await this.makeRequest('/wallet/getchainparameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const chainParams = await response.json();
        console.log(`[TronGridProvider] ✅ 获取到链参数`);

        return {
          success: true,
          data: chainParams
        };
      } else {
        const error = `获取链参数失败: ${response.status} ${response.statusText}`;
        console.warn(`[TronGridProvider] ${error}`);
        return {
          success: false,
          error
        };
      }
    } catch (error: any) {
      console.error('[TronGridProvider] 查询链参数失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 筛选特定类型的交易
   */
  filterTransactionsByType(
    transactions: any[], 
    contractTypes: string[]
  ): any[] {
    console.log(`[TronGridProvider] 筛选交易类型: ${contractTypes.join(', ')}`);

    const filtered = transactions.filter((tx: any) => {
      const contractType = tx.raw_data?.contract?.[0]?.type;
      const isMatch = contractTypes.includes(contractType);
      
      if (isMatch) {
        console.log(`[TronGridProvider] ✅ 匹配交易: ${contractType} - ${tx.txID?.substring(0, 12)}...`);
      }
      
      return isMatch;
    });

    console.log(`[TronGridProvider] 筛选出 ${filtered.length} 条匹配交易`);
    return filtered;
  }

  /**
   * 获取网络解锁期参数
   */
  async getNetworkUnlockPeriod(): Promise<number | null> {
    try {
      const chainParamsResponse = await this.getChainParameters();
      
      if (!chainParamsResponse.success || !chainParamsResponse.data) {
        return null;
      }

      const chainParams = chainParamsResponse.data;
      
      // 查找解锁期相关参数
      const unlockParam = chainParams.chainParameter?.find((param: any) => 
        param.key && (
          param.key.includes('UNFREEZE') || 
          param.key.includes('WAITING') ||
          param.key.includes('DELAY')
        )
      );
      
      if (unlockParam) {
        const periodDays = parseInt(unlockParam.value) || null;
        console.log(`[TronGridProvider] 🎯 找到解锁期参数:`, unlockParam);
        return periodDays ? periodDays * 24 * 60 * 60 * 1000 : null;
      }
      
      console.warn(`[TronGridProvider] ⚠️ 无法从链参数获取解锁期`);
      return null;
      
    } catch (error: any) {
      console.error('[TronGridProvider] 查询网络解锁期失败:', error);
      return null;
    }
  }

  /**
   * 写入调试日志到文件
   */
  writeDebugLog(content: string): void {
    try {
      const { appendFileSync } = require('fs');
      const timestamp = new Date().toISOString();
      appendFileSync('/tmp/tron-debug.log', `[${timestamp}] ${content}\n`);
    } catch (error) {
      console.warn('[TronGridProvider] 写入调试日志失败:', error);
    }
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
