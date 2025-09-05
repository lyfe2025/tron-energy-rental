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
      const resources = await this.tronWeb.trx.getAccountResources(address);
      
      // 计算完整的带宽信息：包含免费带宽(600) + 质押获得的带宽
      const freeNetLimit = resources.freeNetLimit || 600; // TRON每日免费带宽
      const stakedNetLimit = resources.NetLimit || 0; // 质押获得的带宽
      const totalBandwidth = freeNetLimit + stakedNetLimit; // 总带宽
      
      // 带宽使用情况计算
      const netUsed = resources.NetUsed || 0;
      const availableBandwidth = totalBandwidth - netUsed;
      
      return {
        success: true,
        data: {
          energy: {
            used: resources.EnergyUsed || 0,
            limit: resources.EnergyLimit || 0,
            available: (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0)
          },
          bandwidth: {
            used: netUsed,
            limit: totalBandwidth, // 修正：包含免费带宽的总带宽
            available: availableBandwidth // 修正：基于总带宽计算的可用带宽
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
