// 重构后的能量池服务 - 使用新的模块化服务架构
import { energyPoolService, EnergyPoolService } from './energy-pool/EnergyPoolService';

// 导出主服务类和实例，保持向后兼容
export { EnergyPoolService, energyPoolService };

// 导出所有类型定义，保持向后兼容
    export type {
        ConsumptionReport, DailyConsumption, EnergyAllocation, EnergyPoolAccount, OptimizationResult, TodayConsumptionSummary
    } from './energy-pool/EnergyPoolService';

// 为了保持向后兼容，重新导出原有的类
export class EnergyPoolService_Legacy {
  private service = energyPoolService;

  constructor() {
    // 保持向后兼容的构造函数
  }

  // 账户管理方法 - 直接代理到新服务
  async getActivePoolAccounts() {
    return this.service.getActivePoolAccounts();
  }

  async getAllPoolAccounts() {
    return this.service.getAllPoolAccounts();
  }

  async getPoolAccountById(id: string) {
    return this.service.getPoolAccountById(id);
  }

  async updatePoolAccount(id: string, updates: any) {
    return this.service.updatePoolAccount(id, updates);
  }

  async batchUpdateAccounts(accountIds: string[], updates: any) {
    return this.service.batchUpdateAccounts(accountIds, updates);
  }

  async deletePoolAccount(id: string) {
    return this.service.deletePoolAccount(id);
  }

  async addPoolAccount(accountData: any) {
    return this.service.addPoolAccount(accountData);
  }

  async getPoolStatistics() {
    return this.service.getPoolStatistics();
  }

  // 分配方法
  async refreshPoolStatus() {
    return this.service.refreshPoolStatus();
  }

  async optimizeEnergyAllocation(requiredEnergy: number) {
    return this.service.optimizeEnergyAllocation(requiredEnergy);
  }

  // 预留方法
  async reserveEnergy(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string) {
    return this.service.reserveEnergy(poolAccountId, energyAmount, transactionId, userId);
  }

  async releaseReservedEnergy(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string) {
    return this.service.releaseReservedEnergy(poolAccountId, energyAmount, transactionId, userId);
  }

  async confirmEnergyUsage(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string) {
    return this.service.confirmEnergyUsage(poolAccountId, energyAmount, transactionId, userId);
  }

  // 消耗统计方法
  async getTodayConsumption() {
    return this.service.getTodayConsumption();
  }

  async logEnergyConsumption(data: any) {
    return this.service.logEnergyConsumption(data);
  }
}

// 创建向后兼容的默认实例
export const energyPoolService_Legacy = new EnergyPoolService_Legacy();

// 默认导出新服务实例
export default energyPoolService;
