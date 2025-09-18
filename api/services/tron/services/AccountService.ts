import type { AccountData, ResourceData, ServiceResponse } from '../types/tron.types';

export class AccountService {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  // 获取账户信息
  async getAccount(address: string): Promise<ServiceResponse<AccountData>> {
    try {
      // ✅ 修复：明确设置 visible: true 确保地址统一为Base58格式
      const account = await this.tronWeb.trx.getAccount(address, { visible: true });
      return {
        success: true,
        data: {
          address: this.tronWeb.address.fromHex(account.address),
          balance: account.balance || 0,
          energy: account.account_resource?.energy_usage || 0,
          bandwidth: account.bandwidth || 0,
          frozen: account.frozen || []
        }
      };
    } catch (error) {
      console.error('Failed to get account:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取账户资源信息
  async getAccountResources(address: string): Promise<ServiceResponse<ResourceData>> {
    console.log('🚨 [AccountService] getAccountResources 被调用了！地址:', address);
    try {
      const startTime = Date.now();
      
      // 需要同时获取account和accountResources信息，因为代理数据在account中
      // ✅ 修复：明确设置 visible: true 确保地址统一为Base58格式
      const [resources, accountInfo] = await Promise.all([
        this.tronWeb.trx.getAccountResources(address, { visible: true }),
        this.tronWeb.trx.getAccount(address, { visible: true })
      ]);
      
      console.log('🔍 [AccountService] TRON API 详细数据:', {
        address,
        timestamp: new Date().toISOString(),
        apiResponseTime: Date.now() - startTime + 'ms',
        rawData: {
          freeNetLimit: resources.freeNetLimit,
          freeNetUsed: resources.freeNetUsed,
          NetLimit: resources.NetLimit,
          NetUsed: resources.NetUsed,
          EnergyLimit: resources.EnergyLimit,
          EnergyUsed: resources.EnergyUsed
        }
      });
      
      // 根据TRON官方文档正确计算带宽信息
      const freeNetLimit = resources.freeNetLimit || 600; // TRON每日免费带宽
      const freeNetUsed = resources.freeNetUsed || 0; // 免费带宽已使用
      const stakedNetLimit = resources.NetLimit || 0; // 质押获得的带宽
      const stakedNetUsed = resources.NetUsed || 0; // 质押带宽已使用
      
      // 总带宽 = 免费带宽 + 质押带宽
      const totalBandwidth = freeNetLimit + stakedNetLimit;
      // 总已使用 = 免费带宽已使用 + 质押带宽已使用  
      const totalUsedBandwidth = freeNetUsed + stakedNetUsed;
      // 可用带宽 = 总带宽 - 总已使用
      const availableBandwidth = Math.max(0, totalBandwidth - totalUsedBandwidth);

      // 获取直接质押信息（frozenV2数组）
      const frozenV2 = accountInfo.frozenV2 || [];
      let directEnergyStaked = 0;
      let directBandwidthStaked = 0;
      
      frozenV2.forEach((frozen: any) => {
        const amount = frozen.amount || 0;
        if (frozen.type === 'ENERGY') {
          directEnergyStaked = amount;
        } else if (!frozen.type || frozen.type === 'BANDWIDTH') {
          // 没有type字段的表示带宽质押
          directBandwidthStaked = amount;
        }
      });

      // 获取代理相关信息
      const accountResource = accountInfo.account_resource || {};
      const delegatedEnergyOut = parseInt(accountResource.delegated_frozenV2_balance_for_energy) || 0; // 代理给别人的TRX（用于能量）
      // 🔧 修正：带宽代理数据在账户根级别，TRON API返回字符串需要parseInt转换
      const delegatedBandwidthOut = parseInt(accountInfo.delegated_frozenV2_balance_for_bandwidth) || 0; // 代理给别人的TRX（用于带宽）
      const delegatedEnergyIn = parseInt(accountResource.acquired_delegated_frozenV2_balance_for_energy) || 0; // 从别人获得的TRX（用于能量）
      const delegatedBandwidthIn = parseInt(accountResource.acquired_delegated_frozenV2_balance_for_bandwidth) || 0; // 从别人获得的TRX（用于带宽）

      console.log('🔍 [AccountService] TRON API 账户原始数据:', {
        address,
        'delegated_frozenV2_balance_for_bandwidth': accountInfo.delegated_frozenV2_balance_for_bandwidth,
        'delegated_frozenV2_balance_for_bandwidth_type': typeof accountInfo.delegated_frozenV2_balance_for_bandwidth,
        'delegatedBandwidthOut_parsed': parseInt(accountInfo.delegated_frozenV2_balance_for_bandwidth) || 0,
        'TotalNetWeight': resources.TotalNetWeight,
        'TotalNetLimit': resources.TotalNetLimit
      });

      // TRON API的EnergyLimit是净可用能量 = 质押获得 + 代理获得 - 代理出去
      const netAvailableEnergy = resources.EnergyLimit || 0;
      const usedEnergy = resources.EnergyUsed || 0;
      
      // 计算理论质押获得的能量（从净可用能量反推）
      const delegatedEnergyInValue = (delegatedEnergyIn / 1000000) * 76.2; // 代理获得的能量
      const delegatedEnergyOutValue = (delegatedEnergyOut / 1000000) * 76.2; // 代理出去的能量
      const stakingOnlyEnergy = netAvailableEnergy - delegatedEnergyInValue + delegatedEnergyOutValue;
      
      // 理论总能量 = 质押获得 + 代理获得
      const theoreticalTotalEnergy = stakingOnlyEnergy + delegatedEnergyInValue;
      
      // 实际可用能量 = 净可用能量 - 已使用
      const actualAvailableEnergy = netAvailableEnergy - usedEnergy;

      // 🔧 修正：使用TRON网络动态计算公式计算实际代理带宽
      // 公式：带宽 = (质押SUN / 全网总权重) × 全网总带宽
      const totalNetWeight = resources.TotalNetWeight || 1; // 避免除零错误
      const totalNetLimit = resources.TotalNetLimit || 0;
      
      const delegatedBandwidthInValue = totalNetWeight > 0 ? 
        Math.floor((delegatedBandwidthIn / totalNetWeight) * totalNetLimit) : 0;
      const delegatedBandwidthOutValue = totalNetWeight > 0 ? 
        Math.floor((delegatedBandwidthOut / totalNetWeight) * totalNetLimit) : 0;
        
      console.log('🚨 [AccountService] 强制测试 - 如果看到这个日志，说明AccountService正在运行');

      console.log('🔍 [AccountService] 质押信息获取:', {
        address,
        '直接质押': {
          directEnergyStaked_SUN: directEnergyStaked,
          directBandwidthStaked_SUN: directBandwidthStaked,
          directEnergyStaked_TRX: directEnergyStaked / 1000000,
          directBandwidthStaked_TRX: directBandwidthStaked / 1000000
        },
        '代理质押_SUN': {
          delegatedEnergyOut,
          delegatedBandwidthOut,
          delegatedEnergyIn, 
          delegatedBandwidthIn
        },
        '网络参数': {
          totalNetWeight,
          totalNetLimit
        },
        '计算后代理带宽': {
          delegatedBandwidthOutValue,
          delegatedBandwidthInValue,
          '计算公式': `(${delegatedBandwidthOut} / ${totalNetWeight}) * ${totalNetLimit} = ${delegatedBandwidthOutValue}`
        }
      });
      
      // 质押获得的带宽 (不包含免费带宽)
      const stakingOnlyBandwidth = stakedNetLimit;
      
      // 理论总带宽 = 质押获得 + 他人代理给自己 + 免费 600
      const theoreticalTotalBandwidth = stakingOnlyBandwidth + delegatedBandwidthInValue + freeNetLimit;
      
      // ✅ 修正：实际可用带宽 = 理论总带宽 - 已使用
      // 注意：代理出去的资源不影响当前账户的可用带宽（因为质押的TRX还是属于这个账户）
      const actualAvailableBandwidth = Math.max(0, theoreticalTotalBandwidth - totalUsedBandwidth);
      
      // 数据差异监控和警告
      console.log('📊 [AccountService] 带宽计算结果:', {
        address,
        freeNetUsed,
        stakedNetUsed,
        totalUsedBandwidth,
        theoreticalTotalBandwidth,
        actualAvailableBandwidth,
        calculationNote: '如与区块浏览器有差异，通常在±20个单位内属正常现象'
      });
      
      return {
        success: true,
        data: {
          energy: {
            used: usedEnergy,
            limit: Math.max(0, stakingOnlyEnergy), // 仅质押获得的能量
            total: Math.max(0, theoreticalTotalEnergy), // 理论总能量（质押+代理获得）
            available: Math.max(0, actualAvailableEnergy), // 实际可用能量（扣除已使用的）
            delegatedOut: delegatedEnergyOut, // 代理给别人的TRX数量
            delegatedIn: delegatedEnergyIn, // 从别人获得的TRX数量
            // 新增：总质押数量（直接质押 + 代理质押）
            totalStaked: directEnergyStaked + delegatedEnergyOut, // 总质押TRX数量（SUN单位）
            directStaked: directEnergyStaked, // 直接质押TRX数量（SUN单位）
            delegateStaked: delegatedEnergyOut // 代理质押TRX数量（SUN单位）
          },
          bandwidth: {
            used: totalUsedBandwidth, // 总已使用带宽（免费+质押）
            limit: Math.max(0, stakingOnlyBandwidth), // 仅质押获得的带宽 (不含免费600)
            total: Math.max(0, theoreticalTotalBandwidth), // 理论总带宽（质押+代理获得+免费600）
            available: Math.max(0, actualAvailableBandwidth), // 实际可用带宽（总带宽-已使用-代理出去）
            delegatedOut: delegatedBandwidthOut, // 代理给别人的TRX数量
            delegatedIn: delegatedBandwidthIn, // 从别人获得的TRX数量
            // 添加详细的使用情况，便于调试
            freeUsed: freeNetUsed, // 免费带宽已使用
            stakedUsed: stakedNetUsed, // 质押带宽已使用
            // 新增：总质押数量（直接质押 + 代理质押）
            totalStaked: directBandwidthStaked + delegatedBandwidthOut, // 总质押TRX数量（SUN单位）
            directStaked: directBandwidthStaked, // 直接质押TRX数量（SUN单位）
            delegateStaked: delegatedBandwidthOut // 代理质押TRX数量（SUN单位）
          },
            // ✅ 修正：使用TRON网络动态计算后的代理数据（前端直接使用）
            delegation: {
              energyOut: delegatedEnergyOutValue, // 使用计算后的能量值
              energyIn: delegatedEnergyInValue,   // 使用计算后的能量值
              bandwidthOut: delegatedBandwidthOutValue, // ✅ 使用计算后的带宽值（应为196）
              bandwidthIn: delegatedBandwidthInValue    // ✅ 使用计算后的带宽值
            }
        }
      };
    } catch (error) {
      console.error('Failed to get account resources:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取账户信息 (为了兼容routes中的调用)
  async getAccountInfo(address: string): Promise<ServiceResponse<AccountData>> {
    return await this.getAccount(address);
  }
}
