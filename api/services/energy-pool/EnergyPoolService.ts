// 主服务入口，整合所有能量池相关服务
import { accountManagementService, type EnergyPoolAccount } from './AccountManagementService';
import { allocationService, type OptimizationResult } from './AllocationService';
import { consumptionService, type ConsumptionReport, type TodayConsumptionSummary } from './ConsumptionService';
import { energyReservationService } from './EnergyReservationService';

export class EnergyPoolService {
  // 账户管理服务
  public readonly accountManagement = accountManagementService;
  
  // 能量分配服务
  public readonly allocation = allocationService;
  
  // 预留机制服务
  public readonly reservation = energyReservationService;
  
  // 消耗统计服务
  public readonly consumption = consumptionService;

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
   * 预留能量资源
   */
  async reserveEnergy(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string): Promise<void> {
    return this.reservation.reserveEnergy(poolAccountId, energyAmount, transactionId, userId);
  }

  /**
   * 释放预留的能量资源
   */
  async releaseReservedEnergy(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string): Promise<void> {
    return this.reservation.releaseReservedEnergy(poolAccountId, energyAmount, transactionId, userId);
  }

  /**
   * 确认能量使用
   */
  async confirmEnergyUsage(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string): Promise<void> {
    return this.reservation.confirmEnergyUsage(poolAccountId, energyAmount, transactionId, userId);
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
   * 获取今日消耗统计
   */
  async getTodayConsumption(): Promise<TodayConsumptionSummary> {
    return this.consumption.getTodayConsumption();
  }

  /**
   * 获取消耗报告
   */
  async getConsumptionReport(startDate: Date, endDate: Date): Promise<ConsumptionReport> {
    return this.consumption.getConsumptionReport(startDate, endDate);
  }

  /**
   * 获取消耗趋势
   */
  async getConsumptionTrend(days: number = 30): Promise<Array<{
    date: string;
    consumption: number;
    cost: number;
    transactionCount: number;
  }>> {
    return this.consumption.getConsumptionTrend(days);
  }

  /**
   * 获取消耗概览
   */
  async getConsumptionOverview(): Promise<{
    today: TodayConsumptionSummary;
    thisWeek: { consumption: number; cost: number };
    thisMonth: { consumption: number; cost: number };
    topAccounts: Array<{ name: string; consumption: number }>;
  }> {
    return this.consumption.getConsumptionOverview();
  }

  /**
   * 批量预留能量
   */
  async batchReserveEnergy(reservations: Array<{
    poolAccountId: string;
    energyAmount: number;
    transactionId: string;
    userId?: string;
  }>): Promise<{
    successCount: number;
    failedCount: number;
    errors: Array<{ reservation: any; error: string }>;
    success: boolean;
  }> {
    return this.reservation.batchReserveEnergy(reservations);
  }

  /**
   * 获取预留统计
   */
  async getReservationStatistics(timeRange: { start: Date; end: Date }): Promise<{
    totalReservations: number;
    totalEnergyReserved: number;
    totalEnergyReleased: number;
    totalEnergyConfirmed: number;
    currentlyReserved: number;
  }> {
    return this.reservation.getReservationStatistics(timeRange);
  }

  /**
   * 清理过期预留
   */
  async cleanupExpiredReservations(expirationHours: number = 24): Promise<{
    releasedCount: number;
    totalEnergyReleased: number;
  }> {
    return this.reservation.cleanupExpiredReservations(expirationHours);
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
   * 获取热门账户排行
   */
  async getTopConsumingAccounts(limit: number = 10, days: number = 30): Promise<Array<{
    accountId: string;
    accountName: string;
    totalConsumption: number;
    totalCost: number;
    averageDaily: number;
    transactionCount: number;
  }>> {
    return this.consumption.getTopConsumingAccounts(limit, days);
  }

  /**
   * 生成日汇总（定时任务用）
   */
  async generateDailySummary(date?: Date): Promise<void> {
    return this.consumption.generateDailySummary(date);
  }

  /**
   * 清理旧日志
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<{
    deletedCount: number;
  }> {
    return this.consumption.cleanupOldLogs(retentionDays);
  }

  /**
   * 记录能量消耗
   */
  async logEnergyConsumption(data: {
    pool_account_id: string;
    transaction_type: 'reserve' | 'release' | 'confirm';
    energy_amount: number;
    cost_amount?: number;
    transaction_id?: string;
    user_id?: string;
    notes?: string;
  }): Promise<void> {
    return this.consumption.logEnergyConsumption(data);
  }

  /**
   * 健康检查 - 检查所有服务是否正常
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      accountManagement: boolean;
      allocation: boolean;
      reservation: boolean;
      consumption: boolean;
    };
    details: string[];
  }> {
    const details: string[] = [];
    const services = {
      accountManagement: true,
      allocation: true,
      reservation: true,
      consumption: true
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

    try {
      // 检查今日消耗统计
      await this.consumption.getTodayConsumption();
    } catch (error) {
      services.consumption = false;
      details.push(`Consumption service error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    try {
      // 检查预留统计
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      await this.reservation.getReservationStatistics({ start: yesterday, end: now });
    } catch (error) {
      services.reservation = false;
      details.push(`Reservation service error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

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

export type {
    ConsumptionReport, DailyConsumption,
    TodayConsumptionSummary
} from './ConsumptionService';

// 创建默认实例
export const energyPoolService = new EnergyPoolService();
