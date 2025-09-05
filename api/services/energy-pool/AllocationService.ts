import { tronService } from '../tron';
import { accountManagementService } from './AccountManagementService';

export interface EnergyAllocation {
  poolAccountId: string;
  energyAmount: number;
  estimatedCost: number;
}

export interface OptimizationResult {
  allocations: EnergyAllocation[];
  totalCost: number;
  success: boolean;
  message?: string;
}

export class AllocationService {
  constructor() {
    // 初始化分配服务
  }

  /**
   * 刷新能量池状态
   */
  async refreshPoolStatus(): Promise<void> {
    const accounts = await accountManagementService.getActivePoolAccounts();
    
    for (const account of accounts) {
      try {
        // 获取链上能量信息
        const accountInfo = await tronService.getAccountResources(account.tron_address);
        if (accountInfo.success && accountInfo.data) {
          const totalEnergy = accountInfo.data.energy.limit || 0;
          const usedEnergy = accountInfo.data.energy.used || 0;
          const availableEnergy = totalEnergy - usedEnergy;
          
          // 更新数据库
          await accountManagementService.updatePoolAccount(account.id, {
            total_energy: totalEnergy,
            available_energy: availableEnergy,
            last_updated_at: new Date()
          });
          
          console.log(`Updated pool account ${account.tron_address}: ${availableEnergy} energy available`);
        }
      } catch (error) {
        console.error(`Failed to refresh pool account ${account.tron_address}:`, error);
        // 标记账户为维护状态
        await accountManagementService.updatePoolAccount(account.id, {
          status: 'maintenance',
          last_updated_at: new Date()
        });
      }
    }
  }

  /**
   * 优化能量分配算法
   */
  async optimizeEnergyAllocation(requiredEnergy: number): Promise<OptimizationResult> {
    const accounts = await accountManagementService.getActivePoolAccounts();
    
    if (accounts.length === 0) {
      return {
        allocations: [],
        totalCost: 0,
        success: false,
        message: 'No active pool accounts available'
      };
    }
    
    // 计算总可用能量
    const totalAvailable = accounts.reduce((sum, acc) => sum + acc.available_energy, 0);
    
    if (totalAvailable < requiredEnergy) {
      return {
        allocations: [],
        totalCost: 0,
        success: false,
        message: `Insufficient energy. Required: ${requiredEnergy}, Available: ${totalAvailable}`
      };
    }
    
    // 贪心算法：优先使用成本最低的账户
    const allocations: EnergyAllocation[] = [];
    let remainingEnergy = requiredEnergy;
    
    for (const account of accounts) {
      if (remainingEnergy <= 0) break;
      
      const allocatedEnergy = Math.min(remainingEnergy, account.available_energy);
      if (allocatedEnergy > 0) {
        allocations.push({
          poolAccountId: account.id,
          energyAmount: allocatedEnergy,
          estimatedCost: allocatedEnergy * (account.cost_per_energy || 0.001)
        });
        remainingEnergy -= allocatedEnergy;
      }
    }
    
    return {
      allocations,
      totalCost: requiredEnergy - remainingEnergy, // 实际分配的总成本
      success: remainingEnergy === 0,
      message: remainingEnergy > 0 ? `Still need ${remainingEnergy} more energy` : undefined
    };
  }

  /**
   * 智能分配算法 - 基于多种因素进行分配优化
   */
  async smartEnergyAllocation(
    requiredEnergy: number, 
    options: {
      preferLowCost?: boolean;
      balanceLoad?: boolean;
      excludeAccountIds?: string[];
      maxAccountsUsed?: number;
    } = {}
  ): Promise<OptimizationResult> {
    let accounts = await accountManagementService.getActivePoolAccounts();
    
    // 过滤排除的账户
    if (options.excludeAccountIds && options.excludeAccountIds.length > 0) {
      accounts = accounts.filter(acc => !options.excludeAccountIds!.includes(acc.id));
    }
    
    if (accounts.length === 0) {
      return {
        allocations: [],
        totalCost: 0,
        success: false,
        message: 'No available pool accounts'
      };
    }
    
    // 计算总可用能量
    const totalAvailable = accounts.reduce((sum, acc) => sum + acc.available_energy, 0);
    
    if (totalAvailable < requiredEnergy) {
      return {
        allocations: [],
        totalCost: 0,
        success: false,
        message: `Insufficient energy. Required: ${requiredEnergy}, Available: ${totalAvailable}`
      };
    }
    
    // 根据配置进行排序
    if (options.preferLowCost) {
      // 按成本排序（低到高）
      accounts.sort((a, b) => (a.cost_per_energy || 0.001) - (b.cost_per_energy || 0.001));
    } else if (options.balanceLoad) {
      // 按可用能量排序（高到低），实现负载均衡
      accounts.sort((a, b) => b.available_energy - a.available_energy);
    } else {
      // 默认按优先级排序
      accounts.sort((a, b) => (a.priority || 1) - (b.priority || 1));
    }
    
    // 限制使用的账户数量
    if (options.maxAccountsUsed && options.maxAccountsUsed > 0) {
      accounts = accounts.slice(0, options.maxAccountsUsed);
    }
    
    const allocations: EnergyAllocation[] = [];
    let remainingEnergy = requiredEnergy;
    
    if (options.balanceLoad) {
      // 负载均衡模式：平均分配
      const avgEnergyPerAccount = Math.ceil(requiredEnergy / accounts.length);
      
      for (const account of accounts) {
        if (remainingEnergy <= 0) break;
        
        const allocatedEnergy = Math.min(
          remainingEnergy, 
          account.available_energy, 
          avgEnergyPerAccount
        );
        
        if (allocatedEnergy > 0) {
          allocations.push({
            poolAccountId: account.id,
            energyAmount: allocatedEnergy,
            estimatedCost: allocatedEnergy * (account.cost_per_energy || 0.001)
          });
          remainingEnergy -= allocatedEnergy;
        }
      }
      
      // 如果还有剩余能量，继续分配给有余量的账户
      while (remainingEnergy > 0 && accounts.some(acc => acc.available_energy > 0)) {
        for (const account of accounts) {
          if (remainingEnergy <= 0) break;
          
          const existingAllocation = allocations.find(a => a.poolAccountId === account.id);
          const usedEnergy = existingAllocation ? existingAllocation.energyAmount : 0;
          const availableEnergy = account.available_energy - usedEnergy;
          
          if (availableEnergy > 0) {
            const additionalEnergy = Math.min(remainingEnergy, availableEnergy);
            
            if (existingAllocation) {
              existingAllocation.energyAmount += additionalEnergy;
              existingAllocation.estimatedCost += additionalEnergy * (account.cost_per_energy || 0.001);
            } else {
              allocations.push({
                poolAccountId: account.id,
                energyAmount: additionalEnergy,
                estimatedCost: additionalEnergy * (account.cost_per_energy || 0.001)
              });
            }
            
            remainingEnergy -= additionalEnergy;
          }
        }
      }
    } else {
      // 贪心模式：优先使用排序后的账户
      for (const account of accounts) {
        if (remainingEnergy <= 0) break;
        
        const allocatedEnergy = Math.min(remainingEnergy, account.available_energy);
        if (allocatedEnergy > 0) {
          allocations.push({
            poolAccountId: account.id,
            energyAmount: allocatedEnergy,
            estimatedCost: allocatedEnergy * (account.cost_per_energy || 0.001)
          });
          remainingEnergy -= allocatedEnergy;
        }
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

  /**
   * 预测能量需求并提前分配
   */
  async predictAndAllocate(
    historicalData: { energy: number; timestamp: Date }[],
    targetHours: number = 24
  ): Promise<{
    predictedEnergy: number;
    recommendedAllocation: OptimizationResult;
    confidence: number;
  }> {
    // 简单的线性预测模型
    if (historicalData.length < 2) {
      return {
        predictedEnergy: 0,
        recommendedAllocation: {
          allocations: [],
          totalCost: 0,
          success: false,
          message: 'Insufficient historical data'
        },
        confidence: 0
      };
    }
    
    // 计算平均每小时使用量
    const totalHours = (historicalData[historicalData.length - 1].timestamp.getTime() - 
                       historicalData[0].timestamp.getTime()) / (1000 * 60 * 60);
    const totalEnergy = historicalData.reduce((sum, item) => sum + item.energy, 0);
    const avgEnergyPerHour = totalEnergy / Math.max(totalHours, 1);
    
    // 预测未来需求
    const predictedEnergy = Math.ceil(avgEnergyPerHour * targetHours);
    
    // 计算置信度（基于数据点数量和变异性）
    const variance = historicalData.reduce((sum, item) => {
      const diff = item.energy - (totalEnergy / historicalData.length);
      return sum + diff * diff;
    }, 0) / historicalData.length;
    
    const confidence = Math.min(0.9, Math.max(0.1, 
      (historicalData.length / 100) * (1 - Math.min(variance / totalEnergy, 1))
    ));
    
    // 获取推荐分配
    const recommendedAllocation = await this.smartEnergyAllocation(predictedEnergy, {
      preferLowCost: true,
      balanceLoad: false
    });
    
    return {
      predictedEnergy,
      recommendedAllocation,
      confidence
    };
  }
}

// 创建默认实例
export const allocationService = new AllocationService();
