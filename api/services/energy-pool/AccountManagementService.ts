import { AccountCRUDService, accountCRUDService } from './account/AccountCRUDService.ts';
import { AccountStatsService, accountStatsService } from './account/AccountStatsService.ts';
import type {
  AddAccountResult,
  BatchUpdateResult,
  EnergyPoolAccount,
  PoolStatisticsResult,
  UpdateAccountResult
} from './types/account.types.ts';

/**
 * 账户管理服务主协调器
 * 整合各个子服务，提供统一的账户管理接口
 */
export class AccountManagementService {
  private crudService: AccountCRUDService;
  private statsService: AccountStatsService;

  constructor() {
    this.crudService = accountCRUDService;
    this.statsService = accountStatsService;
  }

  // ===================
  // CRUD 操作代理方法
  // ===================

  /**
   * 获取所有活跃的能量池账户
   */
  async getActivePoolAccounts(): Promise<EnergyPoolAccount[]> {
    return this.crudService.getActivePoolAccounts();
  }

  /**
   * 获取所有能量池账户（包括已停用的）
   */
  async getAllPoolAccounts(): Promise<EnergyPoolAccount[]> {
    return this.crudService.getAllPoolAccounts();
  }

  /**
   * 获取能量池账户详情
   */
  async getPoolAccountById(id: string): Promise<EnergyPoolAccount | null> {
    return this.crudService.getPoolAccountById(id);
  }

  /**
   * 更新能量池账户信息
   */
  async updatePoolAccount(id: string, updates: Partial<EnergyPoolAccount>): Promise<UpdateAccountResult> {
    return this.crudService.updatePoolAccount(id, updates);
  }

  /**
   * 批量更新能量池账户信息
   */
  async batchUpdateAccounts(accountIds: string[], updates: Partial<EnergyPoolAccount>): Promise<BatchUpdateResult> {
    return this.crudService.batchUpdateAccounts(accountIds, updates);
  }

  /**
   * 删除能量池账户
   */
  async deletePoolAccount(id: string): Promise<boolean> {
    return this.crudService.deletePoolAccount(id);
  }

  /**
   * 添加新的能量池账户
   */
  async addPoolAccount(accountData: Omit<EnergyPoolAccount, 'id' | 'last_updated_at' | 'created_at' | 'updated_at'>): Promise<AddAccountResult> {
    return this.crudService.addPoolAccount(accountData);
  }

  // ===================
  // 统计服务代理方法
  // ===================

  /**
   * 获取能量池统计信息（实时数据）
   */
  async getPoolStatistics(networkId?: string): Promise<PoolStatisticsResult> {
    return this.statsService.getPoolStatistics(networkId);
  }

  // ===================
  // 便利方法
  // ===================

  /**
   * 获取账户数量统计
   */
  async getAccountsCount(): Promise<{
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
  }> {
    const accounts = await this.getAllPoolAccounts();
    
    return {
      total: accounts.length,
      active: accounts.filter(acc => acc.status === 'active').length,
      inactive: accounts.filter(acc => acc.status === 'inactive').length,
      maintenance: accounts.filter(acc => acc.status === 'maintenance').length
    };
  }

  /**
   * 检查账户是否存在
   */
  async accountExists(id: string): Promise<boolean> {
    const account = await this.getPoolAccountById(id);
    return account !== null;
  }

  /**
   * 根据TRON地址查找账户
   */
  async getAccountByTronAddress(tronAddress: string): Promise<EnergyPoolAccount | null> {
    const accounts = await this.getAllPoolAccounts();
    return accounts.find(acc => acc.tron_address === tronAddress) || null;
  }

  /**
   * 获取特定状态的账户
   */
  async getAccountsByStatus(status: 'active' | 'inactive' | 'maintenance'): Promise<EnergyPoolAccount[]> {
    const accounts = await this.getAllPoolAccounts();
    return accounts.filter(acc => acc.status === status);
  }

  /**
   * 批量更改账户状态
   */
  async batchUpdateAccountsStatus(accountIds: string[], status: 'active' | 'inactive' | 'maintenance'): Promise<BatchUpdateResult> {
    return this.batchUpdateAccounts(accountIds, { status });
  }
}

// 创建默认实例
export const accountManagementService = new AccountManagementService();

// 导出类型以保持向后兼容
export type { EnergyPoolAccount } from './types/account.types.ts';
