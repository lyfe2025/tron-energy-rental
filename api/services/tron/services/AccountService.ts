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
      return {
        success: true,
        data: {
          energy: {
            used: resources.EnergyUsed || 0,
            limit: resources.EnergyLimit || 0,
            available: (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0)
          },
          bandwidth: {
            used: resources.NetUsed || 0,
            limit: resources.NetLimit || 0,
            available: (resources.NetLimit || 0) - (resources.NetUsed || 0)
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
