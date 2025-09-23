import { tronService } from '../tron';
import { accountManagementService } from './AccountManagementService';
import type { EnergyPoolAccount } from './types/account.types';

export interface EnergyAllocation {
  poolAccountId: string;
  energyAmount: number;
  estimatedCost: number;
}

export interface AllocationResult {
  allocations: EnergyAllocation[];
  totalCost: number;
  success: boolean;
  message?: string;
}

// 扩展账户类型，包含实时能量数据
interface AccountWithRealTimeEnergy extends EnergyPoolAccount {
  realtime_available_energy: number;
  realtime_total_energy: number;
}

export class AllocationService {
  constructor() {
    // 初始化能量分配服务（基于优先级）
  }

  /**
   * 获取账户的实时能量数据
   */
  private async getAccountRealTimeEnergy(account: EnergyPoolAccount): Promise<AccountWithRealTimeEnergy> {
    try {
      const accountInfo = await tronService.getAccountResources(account.tron_address);
      if (accountInfo.success && accountInfo.data) {
        const totalEnergy = accountInfo.data.energy.limit || 0;
        const usedEnergy = accountInfo.data.energy.used || 0;
        const availableEnergy = totalEnergy - usedEnergy;
        
        return {
          ...account,
          realtime_total_energy: totalEnergy,
          realtime_available_energy: availableEnergy
        };
      }
    } catch (error) {
      console.warn(`Failed to get real-time energy for account ${account.tron_address}:`, error);
    }
    
    // 如果获取失败，返回0值
    return {
      ...account,
      realtime_total_energy: 0,
      realtime_available_energy: 0
    };
  }

  /**
   * 刷新能量池状态（仅更新时间戳，能量数据实时从TRON获取）
   */
  async refreshPoolStatus(): Promise<void> {
    const accounts = await accountManagementService.getActivePoolAccounts();
    
    for (const account of accounts) {
      try {
        // 测试TRON网络连接
        const accountWithRealTime = await this.getAccountRealTimeEnergy(account);
        
        // 只更新最后检查时间
        await accountManagementService.updatePoolAccount(account.id, {
          last_updated_at: new Date()
        });
        
        console.log(`✅ Pool account ${account.tron_address}: ${accountWithRealTime.realtime_available_energy} energy (real-time)`);
      } catch (error) {
        console.error(`❌ Failed to check pool account ${account.tron_address}:`, error);
        // 标记账户为维护状态
        await accountManagementService.updatePoolAccount(account.id, {
          status: 'maintenance',
          last_updated_at: new Date()
        });
      }
    }
  }

  /**
   * 基于优先级的能量分配（使用实时TRON数据）
   */
  async allocateEnergyByPriority(requiredEnergy: number): Promise<AllocationResult> {
    const accounts = await accountManagementService.getActivePoolAccounts();
    
    if (accounts.length === 0) {
      return {
        allocations: [],
        totalCost: 0,
        success: false,
        message: 'No active pool accounts available'
      };
    }
    
    // 获取所有账户的实时能量数据
    const accountsWithRealTime: AccountWithRealTimeEnergy[] = [];
    let totalAvailable = 0;
    
    for (const account of accounts) {
      const accountWithRealTime = await this.getAccountRealTimeEnergy(account);
      accountsWithRealTime.push(accountWithRealTime);
      totalAvailable += accountWithRealTime.realtime_available_energy;
    }
    
    if (totalAvailable < requiredEnergy) {
      return {
        allocations: [],
        totalCost: 0,
        success: false,
        message: `Insufficient energy. Required: ${requiredEnergy}, Available: ${totalAvailable}`
      };
    }
    
    // 按优先级排序（数字越小优先级越高）
    accountsWithRealTime.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    
    const allocations: EnergyAllocation[] = [];
    let remainingEnergy = requiredEnergy;
    
    for (const account of accountsWithRealTime) {
      if (remainingEnergy <= 0) break;
      
      const allocatedEnergy = Math.min(remainingEnergy, account.realtime_available_energy);
      if (allocatedEnergy > 0) {
        allocations.push({
          poolAccountId: account.id,
          energyAmount: allocatedEnergy,
          estimatedCost: allocatedEnergy * (account.cost_per_energy || 0.001)
        });
        remainingEnergy -= allocatedEnergy;
        
        console.log(`📋 [能量分配] 使用账户: ${account.name || '未命名'} (${account.tron_address})`, {
          优先级: account.priority || 999,
          分配能量: allocatedEnergy,
          剩余需求: remainingEnergy,
          成本: allocatedEnergy * (account.cost_per_energy || 0.001)
        });
      }
    }
    
    const totalCost = allocations.reduce((sum, alloc) => sum + alloc.estimatedCost, 0);
    
    return {
      allocations,
      totalCost,
      success: remainingEnergy === 0,
      message: remainingEnergy > 0 ? `Still need ${remainingEnergy} more energy` : undefined
    };
  }

}

// 创建默认实例 - 简化的基于优先级的能量分配服务
export const allocationService = new AllocationService();