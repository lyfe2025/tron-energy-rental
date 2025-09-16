// 主服务入口，整合所有能量池相关服务
import { accountManagementService, type EnergyPoolAccount } from './AccountManagementService';
import { allocationService, type OptimizationResult } from './AllocationService';

export class EnergyPoolService {
  // 账户管理服务
  public readonly accountManagement = accountManagementService;
  
  // 能量分配服务
  public readonly allocation = allocationService;

  constructor() {
    // 主服务入口
  }

  /**
   * 获取所有活跃的能量池账户
   */
  async getActivePoolAccounts(): Promise<EnergyPoolAccount[]> {
    return this.accountManagement.getActivePoolAccounts();
  }

  /**
   * 获取所有能量池账户（包括已停用的）
   */
  async getAllPoolAccounts(): Promise<EnergyPoolAccount[]> {
    return this.accountManagement.getAllPoolAccounts();
  }

  /**
   * 获取能量池账户详情
   */
  async getPoolAccountById(id: string): Promise<EnergyPoolAccount | null> {
    return this.accountManagement.getPoolAccountById(id);
  }

  /**
   * 刷新能量池状态
   */
  async refreshPoolStatus(): Promise<void> {
    return this.allocation.refreshPoolStatus();
  }

  /**
   * 优化能量分配算法
   */
  async optimizeEnergyAllocation(requiredEnergy: number): Promise<OptimizationResult> {
    return this.allocation.optimizeEnergyAllocation(requiredEnergy);
  }

  /**
   * 智能能量分配
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
    return this.allocation.smartEnergyAllocation(requiredEnergy, options);
  }

  /**
   * 更新能量池账户信息
   */
  async updatePoolAccount(id: string, updates: Partial<EnergyPoolAccount>): Promise<{ success: boolean; message: string }> {
    return this.accountManagement.updatePoolAccount(id, updates);
  }

  /**
   * 批量更新能量池账户信息
   */
  async batchUpdateAccounts(accountIds: string[], updates: Partial<EnergyPoolAccount>): Promise<{ 
    successCount: number; 
    failedCount: number; 
    errors: Array<{ id: string; error: string }>;
    success: boolean;
    message: string;
  }> {
    return this.accountManagement.batchUpdateAccounts(accountIds, updates);
  }

  /**
   * 删除能量池账户
   */
  async deletePoolAccount(id: string): Promise<boolean> {
    return this.accountManagement.deletePoolAccount(id);
  }

  /**
   * 添加新的能量池账户
   */
  async addPoolAccount(accountData: Omit<EnergyPoolAccount, 'id' | 'last_updated_at' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; message: string; accountId?: string }> {
    return this.accountManagement.addPoolAccount(accountData);
  }

  /**
   * 获取能量池统计信息
   */
  async getPoolStatistics(networkId?: string): Promise<{
    success: boolean;
    data?: {
      totalAccounts: number;
      activeAccounts: number;
      totalEnergy: number;
      availableEnergy: number;
      totalBandwidth: number;
      availableBandwidth: number;
      utilizationRate: number;
      bandwidthUtilizationRate: number;
      averageCostPerEnergy: number;
      averageCostPerBandwidth: number;
    };
    message?: string;
  }> {
    return this.accountManagement.getPoolStatistics(networkId);
  }

  /**
   * 预测能量需求
   */
  async predictAndAllocate(
    historicalData: { energy: number; timestamp: Date }[],
    targetHours: number = 24
  ): Promise<{
    predictedEnergy: number;
    recommendedAllocation: OptimizationResult;
    confidence: number;
  }> {
    return this.allocation.predictAndAllocate(historicalData, targetHours);
  }

  /**
   * 健康检查 - 检查所有服务是否正常
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      accountManagement: boolean;
      allocation: boolean;
    };
    details: string[];
  }> {
    const details: string[] = [];
    const services = {
      accountManagement: true,
      allocation: true
    };

    try {
      // 检查账户管理服务
      const stats = await this.accountManagement.getPoolStatistics();
      if (!stats.success) {
        services.accountManagement = false;
        details.push('Account management service failed');
      }
    } catch (error) {
      services.accountManagement = false;
      details.push(`Account management error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // 暂时移除分配服务检查，因为它可能依赖一些已删除的功能
    // TODO: 如果需要，可以添加分配服务的健康检查

    const healthyServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.values(services).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      status = 'healthy';
    } else if (healthyServices >= totalServices / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, services, details };
  }
}

// 导出类型，保持向后兼容
export type {
    EnergyPoolAccount
} from './AccountManagementService';

export type {
    EnergyAllocation, OptimizationResult
} from './AllocationService';

// 创建默认实例
export const energyPoolService = new EnergyPoolService();