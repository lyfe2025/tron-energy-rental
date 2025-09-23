/**
 * TRON 网络参数服务
 * 从TRON官方API实时获取不同网络的参数信息
 */

import axios from 'axios';
import { getTronGridHeaders } from '../../../utils/database-api-key';

export interface TronNetworkParams {
  network: 'mainnet' | 'shasta' | 'nile';
  unlockPeriod: number; // 解锁期（小时）
  minStakeAmount: number; // 最小质押金额
  maxDelegateLockPeriod?: number; // 最大代理锁定期（区块数）
  lastUpdated: Date;
  // TRON网络资源参数 - 基于官方文档
  totalDailyEnergy: number; // 全网每日固定能量总量：180,000,000,000
  totalDailyBandwidth: number; // 全网每日固定带宽总量：43,200,000,000
  totalStakedForEnergy: number; // 全网用于获取Energy的TRX总量（实时数据）
  totalStakedForBandwidth: number; // 全网用于获取Bandwidth的TRX总量（实时数据）
  energyUnitPrice: number; // Energy单价：100 sun
  bandwidthUnitPrice: number; // Bandwidth单价：1000 sun
  freeBandwidthPerDay: number; // 每日免费带宽：600
}

export interface ChainParameters {
  key: string;
  value: number;
}

export class NetworkParametersService {
  private static instance: NetworkParametersService;
  private cache = new Map<string, { data: TronNetworkParams; expires: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  // TRON官方API端点
  private readonly API_ENDPOINTS = {
    mainnet: 'https://api.trongrid.io',
    shasta: 'https://api.shasta.trongrid.io',
    nile: 'https://nile.trongrid.io'
  };

  // TRON官方固定参数 (基于官方文档: https://developers.tron.network/docs/resource-model)
  private readonly TRON_CONSTANTS = {
    totalDailyEnergy: 180_000_000_000, // 全网每日固定能量总量
    totalDailyBandwidth: 43_200_000_000, // 全网每日固定带宽总量
    energyUnitPrice: 100, // Energy单价（sun）
    bandwidthUnitPrice: 1000, // Bandwidth单价（sun）
    freeBandwidthPerDay: 600 // 每日免费带宽
  };

  private constructor() {}

  public static getInstance(): NetworkParametersService {
    if (!NetworkParametersService.instance) {
      NetworkParametersService.instance = new NetworkParametersService();
    }
    return NetworkParametersService.instance;
  }

  /**
   * 获取网络参数
   */
  async getNetworkParams(networkType: string, rpcUrl?: string, networkName?: string): Promise<TronNetworkParams> {
    const network = this.mapNetworkType(networkType, rpcUrl, networkName);
    const cacheKey = network;
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    try {
      const params = await this.fetchNetworkParams(network);
      
      // 缓存结果
      this.cache.set(cacheKey, {
        data: params,
        expires: Date.now() + this.CACHE_DURATION
      });

      return params;
    } catch (error) {
      console.error(`[NetworkParametersService] 获取${network}网络参数失败:`, error);
      
      // 返回默认值（使用校准数据）
      return this.getDefaultParams(network);
    }
  }

  /**
   * 从TRON官方API获取网络参数
   */
  private async fetchNetworkParams(network: 'mainnet' | 'shasta' | 'nile'): Promise<TronNetworkParams> {
    const baseUrl = this.API_ENDPOINTS[network];
    
    try {
      // 1. 获取链参数
      const headers = await getTronGridHeaders(baseUrl);
      const chainParamsResponse = await axios.post(`${baseUrl}/wallet/getchainparameters`, {}, {
        headers,
        timeout: 10000
      });

      console.log(`[NetworkParametersService] ${network}网络链参数响应:`, chainParamsResponse.data);

      const chainParams = chainParamsResponse.data.chainParameter || [];
      
      // 解析关键参数
      const params = this.parseChainParameters(chainParams, network);
      
      // 2. 获取全网质押数据（基于TRON官方公式）
      const stakeData = await this.fetchGlobalStakeData(baseUrl, network);
      
      return {
        ...params,
        ...stakeData,
        // TRON官方固定参数
        totalDailyEnergy: this.TRON_CONSTANTS.totalDailyEnergy,
        totalDailyBandwidth: this.TRON_CONSTANTS.totalDailyBandwidth,
        energyUnitPrice: this.TRON_CONSTANTS.energyUnitPrice,
        bandwidthUnitPrice: this.TRON_CONSTANTS.bandwidthUnitPrice,
        freeBandwidthPerDay: this.TRON_CONSTANTS.freeBandwidthPerDay,
        network,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error(`[NetworkParametersService] 从${network}网络获取参数失败:`, error);
      throw error;
    }
  }

  /**
   * 解析链参数
   */
  private parseChainParameters(chainParams: ChainParameters[], network: 'mainnet' | 'shasta' | 'nile') {
    const params = {
      unlockPeriod: this.getDefaultUnlockPeriod(network),
      minStakeAmount: 1000000, // 默认1 TRX (单位: sun)
      maxDelegateLockPeriod: 864000 // 默认30天 (864000区块 × 3秒/区块 ÷ 86400秒/天 = 30天)
    };

    for (const param of chainParams) {
      switch (param.key) {
        case 'getUnfreezeDelayDays':
          // TRON 2.0 解锁延迟天数
          params.unlockPeriod = param.value * 24; // 转换为小时
          break;
        case 'getMinFrozenBalanceForStake':
          // 最小质押金额
          params.minStakeAmount = param.value;
          break;
        case 'getMaxDelegateLockPeriod':
          // 最大代理锁定期 (单位: 区块数，每个区块约3秒)
          params.maxDelegateLockPeriod = param.value;
          break;
      }
    }

    return params;
  }

  /**
   * 获取全网质押数据（基于TRON官方API和用户测试数据校准）
   */
  private async fetchGlobalStakeData(baseUrl: string, network: 'mainnet' | 'shasta' | 'nile') {
    try {
      console.log(`[NetworkParametersService] 开始获取${network}全网质押数据...`);
      
      let totalStakedForEnergy = 0;
      let totalStakedForBandwidth = 0;

      // 方法1：尝试多个地址获取全网权重数据
      const testAddresses = [
        'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', // TRON基金会地址
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT合约地址
        this.getSampleAddress(network)
      ];

      for (const address of testAddresses) {
        try {
          // 获取能量数据
          const energyHeaders = await getTronGridHeaders(baseUrl);
          const energyResponse = await axios.post(`${baseUrl}/wallet/getaccountresource`, {
            address,
            visible: true
          }, {
            headers: energyHeaders,
            timeout: 15000
          });

          const energyData = energyResponse.data;
          console.log(`[NetworkParametersService] ${network} ${address} energy数据:`, {
            TotalEnergyWeight: energyData.TotalEnergyWeight,
            totalEnergyWeight: energyData.totalEnergyWeight,
            TotalEnergyTargetLimit: energyData.TotalEnergyTargetLimit
          });
          
          if (energyData.TotalEnergyWeight > 0) {
            totalStakedForEnergy = energyData.TotalEnergyWeight;
            break; // 找到有效数据就退出
          } else if (energyData.totalEnergyWeight > 0) {
            totalStakedForEnergy = energyData.totalEnergyWeight;
            break;
          }
          
        } catch (error) {
          console.warn(`[NetworkParametersService] ${network} ${address} 能量数据获取失败:`, error.message);
        }
      }

      // 获取带宽数据
      for (const address of testAddresses) {
        try {
          const bandwidthHeaders = await getTronGridHeaders(baseUrl);
          const bandwidthResponse = await axios.post(`${baseUrl}/wallet/getaccountnet`, {
            address,
            visible: true
          }, {
            headers: bandwidthHeaders,
            timeout: 15000
          });

          const bandwidthData = bandwidthResponse.data;
          console.log(`[NetworkParametersService] ${network} ${address} bandwidth数据:`, {
            TotalNetWeight: bandwidthData.TotalNetWeight,
            totalNetWeight: bandwidthData.totalNetWeight
          });
          
          if (bandwidthData.TotalNetWeight > 0) {
            totalStakedForBandwidth = bandwidthData.TotalNetWeight;
            break;
          } else if (bandwidthData.totalNetWeight > 0) {
            totalStakedForBandwidth = bandwidthData.totalNetWeight;
            break;
          }
          
        } catch (error) {
          console.warn(`[NetworkParametersService] ${network} ${address} 带宽数据获取失败:`, error.message);
        }
      }

      // 如果API获取失败，使用基于用户测试数据反推的权重值
      if (totalStakedForEnergy === 0 || totalStakedForBandwidth === 0) {
        console.warn(`[NetworkParametersService] ${network}无法获取实时数据，使用基于测试数据的校准值`);
        return this.getCalibratedStakeData(network);
      }

      const result = {
        totalStakedForEnergy,
        totalStakedForBandwidth
      };

      console.log(`[NetworkParametersService] ${network}最终质押数据:`, result);
      return result;

    } catch (error) {
      console.error(`[NetworkParametersService] 获取${network}全网质押数据失败:`, error);
      console.log(`[NetworkParametersService] 使用${network}校准值作为备选`);
      return this.getCalibratedStakeData(network);
    }
  }

  /**
   * 基于用户测试数据校准的全网质押数据
   * 根据用户提供的实际测试结果反推出合理的全网质押量
   */
  private getCalibratedStakeData(network: 'mainnet' | 'shasta' | 'nile') {
    switch (network) {
      case 'nile':
        // 根据用户测试数据：100 TRX = 7,613 能量, 64 带宽
        // 使用公式反推：totalStakedForEnergy = (100 * 1,000,000) * 180,000,000,000 / 7,613
        // 注意：全网质押数据应该以sun为单位存储
        const nileEnergyStake = Math.floor((100 * 1_000_000 * 180_000_000_000) / 7613);
        const nileBandwidthStake = Math.floor((100 * 1_000_000 * 43_200_000_000) / 64);
        return {
          totalStakedForEnergy: nileEnergyStake, // 约 2.36T sun
          totalStakedForBandwidth: nileBandwidthStake, // 约 67.5T sun
        };
      case 'shasta':
        // 根据用户测试数据：100 TRX = 1,408 能量, 12 带宽  
        const shastaEnergyStake = Math.floor((100 * 1_000_000 * 180_000_000_000) / 1408);
        const shastaBandwidthStake = Math.floor((100 * 1_000_000 * 43_200_000_000) / 12);
        return {
          totalStakedForEnergy: shastaEnergyStake, // 约 12.8B TRX
          totalStakedForBandwidth: shastaBandwidthStake, // 约 360B TRX
        };
      case 'mainnet':
        // 主网使用较为保守的估算值
        return {
          totalStakedForEnergy: 50_000_000_000_000, // 约50B TRX质押给Energy
          totalStakedForBandwidth: 20_000_000_000_000, // 约20B TRX质押给Bandwidth
        };
      default:
        return {
          totalStakedForEnergy: 50_000_000_000_000,
          totalStakedForBandwidth: 20_000_000_000_000,
        };
    }
  }

  /**
   * 尝试通过不同的TRON API接口获取实时全网质押数据
   */
  private async tryAlternativeStakeDataSources(baseUrl: string, network: 'mainnet' | 'shasta' | 'nile') {
    try {
      // 尝试获取链状态信息
      const statusHeaders = await getTronGridHeaders(baseUrl);
      const chainStatusResponse = await axios.post(`${baseUrl}/wallet/getnowblock`, {}, {
        headers: statusHeaders,
        timeout: 10000
      });

      console.log(`[NetworkParametersService] ${network}当前区块信息:`, {
        blockNumber: chainStatusResponse.data?.block_header?.raw_data?.number,
        timestamp: chainStatusResponse.data?.block_header?.raw_data?.timestamp
      });

      // 尝试查询一个知名账户的资源信息来推断全网数据
      const sampleAddress = this.getSampleAddress(network);
      const sampleHeaders = await getTronGridHeaders(baseUrl);
      const sampleAccountResponse = await axios.post(`${baseUrl}/wallet/getaccountresource`, {
        address: sampleAddress
      }, {
        headers: sampleHeaders,
        timeout: 10000
      });

      console.log(`[NetworkParametersService] ${network}示例账户资源:`, sampleAccountResponse.data);

      // 如果示例账户返回了全网数据，使用它
      const sampleData = sampleAccountResponse.data;
      if (sampleData.TotalEnergyWeight || sampleData.TotalNetWeight) {
        return {
          totalStakedForEnergy: sampleData.TotalEnergyWeight || 0,
          totalStakedForBandwidth: sampleData.TotalNetWeight || 0
        };
      }

    } catch (error) {
      console.warn(`[NetworkParametersService] 备选方法获取${network}数据失败:`, error);
    }

    return null;
  }

  /**
   * 获取估算的全网质押数据
   */
  private getEstimatedStakeData(network: 'mainnet' | 'shasta' | 'nile') {
    switch (network) {
      case 'mainnet':
        // 主网估算值（基于公开数据和历史统计）
        return {
          totalStakedForEnergy: 50_000_000_000_000, // 约50B TRX质押给Energy
          totalStakedForBandwidth: 20_000_000_000_000, // 约20B TRX质押给Bandwidth
        };
      case 'shasta':
        // Shasta测试网
        return {
          totalStakedForEnergy: 1_000_000_000_000, // 约1B TRX
          totalStakedForBandwidth: 500_000_000_000, // 约0.5B TRX
        };
      case 'nile':
        // Nile测试网
        return {
          totalStakedForEnergy: 500_000_000_000, // 约0.5B TRX
          totalStakedForBandwidth: 250_000_000_000, // 约0.25B TRX
        };
      default:
        return {
          totalStakedForEnergy: 50_000_000_000_000,
          totalStakedForBandwidth: 20_000_000_000_000,
        };
    }
  }

  /**
   * 根据TRON官方公式计算资源获得量
   * @param stakeAmount 质押的TRX数量（单位：sun）
   * @param resourceType 资源类型
   * @param params 网络参数
   * @returns 预估获得的资源数量
   */
  static calculateResourceAmount(
    stakeAmount: number, 
    resourceType: 'ENERGY' | 'BANDWIDTH', 
    params: TronNetworkParams
  ): number {
    if (resourceType === 'ENERGY') {
      // Amount of Energy obtained = Amount of TRX staked for obtaining Energy / Total amount of TRX staked for obtaining Energy on the whole network * 180,000,000,000
      if (params.totalStakedForEnergy <= 0) return 0;
      const rawResult = (stakeAmount / params.totalStakedForEnergy) * params.totalDailyEnergy;
      // TRON资源单位转换：官方公式返回的数值需要除以1,000,000得到用户显示单位
      return rawResult / 1_000_000;
    } else {
      // Amount of Bandwidth obtained = Amount of TRX staked for obtaining Bandwidth / Total amount of TRX staked for obtaining Bandwidth on the whole network * 43,200,000,000
      if (params.totalStakedForBandwidth <= 0) return 0;
      const rawResult = (stakeAmount / params.totalStakedForBandwidth) * params.totalDailyBandwidth;
      // TRON资源单位转换：官方公式返回的数值需要除以1,000,000得到用户显示单位
      return rawResult / 1_000_000;
    }
  }

  /**
   * 获取示例地址
   */
  private getSampleAddress(network: 'mainnet' | 'shasta' | 'nile'): string {
    switch (network) {
      case 'mainnet':
        return 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // USDT合约地址
      case 'shasta':
        return 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs'; // Shasta示例地址
      case 'nile':
        return 'TGas8VQzG4FdVbkqJnLpHvTz6hgKNpbNcr'; // Nile示例地址
      default:
        return 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    }
  }

  /**
   * 映射网络类型 - 根据RPC URL和网络名称准确识别
   */
  private mapNetworkType(networkType: string, rpcUrl?: string, networkName?: string): 'mainnet' | 'shasta' | 'nile' {
    // 优先通过RPC URL识别
    if (rpcUrl) {
      if (rpcUrl.includes('nile.trongrid.io')) return 'nile';
      if (rpcUrl.includes('shasta.trongrid.io')) return 'shasta';
      if (rpcUrl.includes('api.trongrid.io')) return 'mainnet';
    }
    
    // 通过网络名称识别
    if (networkName) {
      const lowerName = networkName.toLowerCase();
      if (lowerName.includes('nile')) return 'nile';
      if (lowerName.includes('shasta')) return 'shasta';
      if (lowerName.includes('main')) return 'mainnet';
    }
    
    // 最后通过网络类型识别
    const lowerType = networkType.toLowerCase();
    if (lowerType.includes('main')) return 'mainnet';
    
    // 对于testnet类型，如果无法进一步识别，默认返回nile（因为它更常用于测试）
    if (lowerType.includes('testnet')) return 'nile';
    
    return 'mainnet'; // 默认主网
  }

  /**
   * 获取默认解锁期
   */
  private getDefaultUnlockPeriod(network: 'mainnet' | 'shasta' | 'nile'): number {
    switch (network) {
      case 'nile':
        return 24; // 1天
      case 'shasta':
      case 'mainnet':
      default:
        return 14 * 24; // 14天
    }
  }


  /**
   * 获取默认参数
   */
  private getDefaultParams(network: 'mainnet' | 'shasta' | 'nile'): TronNetworkParams {
    const stakeData = this.getCalibratedStakeData(network);
    return {
      network,
      unlockPeriod: this.getDefaultUnlockPeriod(network),
      minStakeAmount: 1000000, // 1 TRX
      lastUpdated: new Date(),
      // TRON官方固定参数
      totalDailyEnergy: this.TRON_CONSTANTS.totalDailyEnergy,
      totalDailyBandwidth: this.TRON_CONSTANTS.totalDailyBandwidth,
      energyUnitPrice: this.TRON_CONSTANTS.energyUnitPrice,
      bandwidthUnitPrice: this.TRON_CONSTANTS.bandwidthUnitPrice,
      freeBandwidthPerDay: this.TRON_CONSTANTS.freeBandwidthPerDay,
      ...stakeData
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// 导出单例实例
export const networkParametersService = NetworkParametersService.getInstance();
