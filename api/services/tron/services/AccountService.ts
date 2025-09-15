import type { AccountData, ResourceData, ServiceResponse } from '../types/tron.types';

export class AccountService {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  // 获取账户信息
  async getAccount(address: string): Promise<ServiceResponse<AccountData>> {
    try {
      const account = await this.tronWeb.trx.getAccount(address);
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
    try {
      // 需要同时获取account和accountResources信息，因为代理数据在account中
      const [resources, accountInfo] = await Promise.all([
        this.tronWeb.trx.getAccountResources(address),
        this.tronWeb.trx.getAccount(address)
      ]);
      
      // 计算完整的带宽信息：包含免费带宽(600) + 质押获得的带宽
      const freeNetLimit = resources.freeNetLimit || 600; // TRON每日免费带宽
      const stakedNetLimit = resources.NetLimit || 0; // 质押获得的带宽
      const totalBandwidth = freeNetLimit + stakedNetLimit; // 总带宽
      
      // 带宽使用情况计算
      const netUsed = resources.NetUsed || 0;
      const availableBandwidth = totalBandwidth - netUsed;

      // 获取代理相关信息 - 从account信息中获取！
      const accountResource = accountInfo.account_resource || {};
      const delegatedEnergyOut = accountResource.delegated_frozenV2_balance_for_energy || 0; // 代理给别人的TRX（用于能量）
      const delegatedBandwidthOut = accountResource.delegated_frozenV2_balance_for_bandwidth || 0; // 代理给别人的TRX（用于带宽）
      const delegatedEnergyIn = accountResource.acquired_delegated_frozenV2_balance_for_energy || 0; // 从别人获得的TRX（用于能量）
      const delegatedBandwidthIn = accountResource.acquired_delegated_frozenV2_balance_for_bandwidth || 0; // 从别人获得的TRX（用于带宽）

      console.log('🔍 [AccountService] 代理信息获取:', {
        address,
        delegatedEnergyOut,
        delegatedBandwidthOut,
        delegatedEnergyIn, 
        delegatedBandwidthIn,
        accountResource
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

      // 带宽计算逻辑：用户公式 总带宽= 质押获得+他人代理给自己+免费 600
      const delegatedBandwidthInValue = (delegatedBandwidthIn / 1000000) * 1000;
      const delegatedBandwidthOutValue = (delegatedBandwidthOut / 1000000) * 1000;
      
      // 质押获得的带宽 (不包含免费带宽)
      const stakingOnlyBandwidth = stakedNetLimit;
      
      // 理论总带宽 = 质押获得 + 他人代理给自己 + 免费 600
      const theoreticalTotalBandwidth = stakingOnlyBandwidth + delegatedBandwidthInValue + freeNetLimit;
      
      // 实际可用带宽 = 理论总带宽 - 已使用 - 代理出去的
      const actualAvailableBandwidth = theoreticalTotalBandwidth - netUsed - delegatedBandwidthOutValue;
      
      return {
        success: true,
        data: {
          energy: {
            used: usedEnergy,
            limit: Math.max(0, stakingOnlyEnergy), // 仅质押获得的能量
            total: Math.max(0, theoreticalTotalEnergy), // 理论总能量（质押+代理获得）
            available: Math.max(0, actualAvailableEnergy), // 实际可用能量（扣除已使用的）
            delegatedOut: delegatedEnergyOut, // 代理给别人的TRX数量
            delegatedIn: delegatedEnergyIn // 从别人获得的TRX数量
          },
          bandwidth: {
            used: netUsed,
            limit: Math.max(0, stakingOnlyBandwidth), // 仅质押获得的带宽 (不含免费600)
            total: Math.max(0, theoreticalTotalBandwidth), // 理论总带宽（质押+代理获得+免费600）
            available: Math.max(0, actualAvailableBandwidth), // 实际可用带宽（总带宽-已使用-代理出去）
            delegatedOut: delegatedBandwidthOut, // 代理给别人的TRX数量
            delegatedIn: delegatedBandwidthIn // 从别人获得的TRX数量
          },
          // 添加原始代理数据用于调试
          delegation: {
            energyOut: delegatedEnergyOut,
            energyIn: delegatedEnergyIn,
            bandwidthOut: delegatedBandwidthOut,
            bandwidthIn: delegatedBandwidthIn
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
