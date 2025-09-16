// 重构后的能量池服务 - 使用新的模块化服务架构
import { energyPoolService, EnergyPoolService } from './energy-pool/EnergyPoolService';

// 导出主服务类和实例，保持向后兼容
export { EnergyPoolService, energyPoolService };

// 导出所有类型定义，保持向后兼容
    export type {
    EnergyAllocation, EnergyPoolAccount, OptimizationResult
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

  async getPoolStatistics(networkId?: string) {
    return this.service.getPoolStatistics(networkId);
  }

  // 分配方法
  async refreshPoolStatus() {
    return this.service.refreshPoolStatus();
  }

  async optimizeEnergyAllocation(requiredEnergy: number) {
    return this.service.optimizeEnergyAllocation(requiredEnergy);
  }

  // 注意：预留和消耗统计方法已被移除
  // 这些功能现在直接基于 TRON 实时数据，不再需要本地记录
  
  // 如果需要向后兼容，可以返回适当的错误信息
  async reserveEnergy(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string) {
    throw new Error('预留功能已移除，请使用实时能量分配');
  }

  async releaseReservedEnergy(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string) {
    throw new Error('预留功能已移除，请使用实时能量分配');
  }

  async confirmEnergyUsage(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string) {
    throw new Error('确认功能已移除，能量使用现在通过 TRON 交易直接确认');
  }

  async getTodayConsumption() {
    throw new Error('消耗统计功能已移除，请使用 TRON 实时数据获取统计信息');
  }

  async logEnergyConsumption(data: any) {
    throw new Error('能量消耗日志功能已移除，现在基于 TRON 实时数据');
  }
}

// 创建向后兼容的默认实例
export const energyPoolService_Legacy = new EnergyPoolService_Legacy();

// 默认导出新服务实例
export default energyPoolService;
