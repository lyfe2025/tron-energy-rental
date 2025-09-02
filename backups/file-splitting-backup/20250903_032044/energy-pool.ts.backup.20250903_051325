import { query } from '../database/index';
import { tronService } from './tron';

interface EnergyPoolAccount {
  id: string; // UUID
  name: string;
  tron_address: string;
  private_key_encrypted: string;
  total_energy: number;
  available_energy: number;
  reserved_energy: number;
  cost_per_energy?: number; // 这个字段在数据库中不存在，需要计算或添加
  status: 'active' | 'inactive' | 'maintenance';
  last_updated_at: Date;
  created_at: Date;
  updated_at: Date;
  account_type?: 'own_energy' | 'agent_energy' | 'third_party';
  priority?: number;
  description?: string;
  contact_info?: any;
  daily_limit?: number;
  monthly_limit?: number;
}

interface EnergyAllocation {
  poolAccountId: string;
  energyAmount: number;
  estimatedCost: number;
}

interface OptimizationResult {
  allocations: EnergyAllocation[];
  totalCost: number;
  success: boolean;
  message?: string;
}

interface DailyConsumption {
  consumption_date: string;
  pool_account_id: string;
  account_name: string;
  account_type: string;
  total_consumed_energy: number;
  total_cost: number;
  transaction_count: number;
}

interface TodayConsumptionSummary {
  total_consumed_energy: number;
  total_cost: number;
  total_transactions: number;
  account_breakdown: DailyConsumption[];
}

export class EnergyPoolService {
  constructor() {
    // 使用直接的query函数而不是Database实例
  }

  /**
   * 获取所有活跃的能量池账户
   */
  async getActivePoolAccounts(): Promise<EnergyPoolAccount[]> {
    const sql = `
      SELECT *, 0.001 as cost_per_energy FROM energy_pools 
      WHERE status = $1
      ORDER BY priority ASC, created_at ASC, id ASC
    `;
    const result = await query(sql, ['active']);
    return result.rows;
  }

  /**
   * 获取所有能量池账户（包括已停用的）
   */
  async getAllPoolAccounts(): Promise<EnergyPoolAccount[]> {
    const sql = `
      SELECT *, 0.001 as cost_per_energy FROM energy_pools 
      ORDER BY priority ASC, created_at ASC, id ASC
    `;
    const result = await query(sql, []);
    
    // 直接返回数据库中的原始状态值，不进行错误的状态映射
    return result.rows;
  }

  /**
   * 获取能量池账户详情
   */
  async getPoolAccountById(id: string): Promise<EnergyPoolAccount | null> {
    const sql = 'SELECT *, 0.001 as cost_per_energy FROM energy_pools WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * 刷新能量池状态
   */
  async refreshPoolStatus(): Promise<void> {
    const accounts = await this.getActivePoolAccounts();
    
    for (const account of accounts) {
      try {
        // 获取链上能量信息
        const accountInfo = await tronService.getAccountResources(account.tron_address);
        if (accountInfo.success && accountInfo.data) {
          const totalEnergy = accountInfo.data.energy.limit || 0;
          const usedEnergy = accountInfo.data.energy.used || 0;
          const availableEnergy = totalEnergy - usedEnergy;
          
          // 更新数据库
          await this.updatePoolAccount(account.id, {
            total_energy: totalEnergy,
            available_energy: availableEnergy - account.reserved_energy,
            last_updated_at: new Date()
          });
          
          console.log(`Updated pool account ${account.tron_address}: ${availableEnergy} energy available`);
        }
      } catch (error) {
        console.error(`Failed to refresh pool account ${account.tron_address}:`, error);
        // 标记账户为维护状态
        await this.updatePoolAccount(account.id, {
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
    const accounts = await this.getActivePoolAccounts();
    
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
   * 预留能量资源
   */
  async reserveEnergy(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string): Promise<void> {
    try {
      const sql = `
        UPDATE energy_pools 
        SET 
          available_energy = available_energy - $2,
          reserved_energy = reserved_energy + $2,
          updated_at = NOW()
        WHERE id = $1 AND available_energy >= $2
      `;
      
      const result = await query(sql, [poolAccountId, energyAmount]);
      
      if (result.rowCount === 0) {
        throw new Error('可用能量不足或账户不存在');
      }
      
      // 记录能量预留
      await this.logEnergyConsumption({
        pool_account_id: poolAccountId,
        transaction_type: 'reserve',
        energy_amount: energyAmount,
        transaction_id: transactionId,
        user_id: userId,
        notes: `预留能量: ${energyAmount}`
      });
      
      console.log(`预留能量成功: 账户 ${poolAccountId}, 数量 ${energyAmount}, 交易 ${transactionId}`);
    } catch (error) {
      console.error('预留能量失败:', error);
      throw new Error(`预留能量失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 释放预留的能量资源
   */
  async releaseReservedEnergy(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string): Promise<void> {
    try {
      const sql = `
        UPDATE energy_pools 
        SET 
          available_energy = available_energy + $2,
          reserved_energy = reserved_energy - $2,
          updated_at = NOW()
        WHERE id = $1 AND reserved_energy >= $2
      `;
      
      const result = await query(sql, [poolAccountId, energyAmount]);
      
      if (result.rowCount === 0) {
        throw new Error('预留能量不足或账户不存在');
      }
      
      // 记录能量释放
      await this.logEnergyConsumption({
        pool_account_id: poolAccountId,
        transaction_type: 'release',
        energy_amount: energyAmount,
        transaction_id: transactionId,
        user_id: userId,
        notes: `释放预留能量: ${energyAmount}`
      });
      
      console.log(`释放预留能量成功: 账户 ${poolAccountId}, 数量 ${energyAmount}, 交易 ${transactionId}`);
    } catch (error) {
      console.error('释放预留能量失败:', error);
      throw new Error(`释放预留能量失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 确认能量使用
   */
  async confirmEnergyUsage(poolAccountId: string, energyAmount: number, transactionId: string, userId?: string): Promise<void> {
    try {
      // 获取账户信息以计算成本
      const accountInfo = await this.getPoolAccountById(poolAccountId);
      if (!accountInfo) {
        throw new Error('账户不存在');
      }
      
      const costAmount = (accountInfo.cost_per_energy || 0) * energyAmount;
      
      const sql = `
        UPDATE energy_pools 
        SET 
          reserved_energy = reserved_energy - $2,
          updated_at = NOW()
        WHERE id = $1 AND reserved_energy >= $2
      `;
      
      const result = await query(sql, [poolAccountId, energyAmount]);
      
      if (result.rowCount === 0) {
        throw new Error('预留能量不足或账户不存在');
      }
      
      // 记录能量消耗
      await this.logEnergyConsumption({
        pool_account_id: poolAccountId,
        transaction_type: 'confirm',
        energy_amount: energyAmount,
        cost_amount: costAmount,
        transaction_id: transactionId,
        user_id: userId,
        notes: `确认使用能量: ${energyAmount}`
      });
      
      console.log(`确认使用能量: 账户 ${poolAccountId}, 数量 ${energyAmount}, 交易 ${transactionId}`);
    } catch (error) {
      console.error('确认能量使用失败:', error);
      throw new Error(`确认能量使用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新能量池账户信息
   */
  async updatePoolAccount(id: string, updates: Partial<EnergyPoolAccount>): Promise<{ success: boolean; message: string }> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      if (fields.length === 0) {
        return { success: false, message: 'No fields to update' };
      }
      
      const sql = `
        UPDATE energy_pools 
        SET ${fields.join(', ')}, last_updated_at = NOW()
        WHERE id = $${paramIndex}
      `;
      
      values.push(id);
      const result = await query(sql, values);
      
      if (result.rowCount === 0) {
        return { success: false, message: 'Pool account not found' };
      }
      
      return { success: true, message: 'Pool account updated successfully' };
    } catch (error) {
      console.error('Failed to update pool account:', error);
      return { success: false, message: 'Failed to update pool account' };
    }
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
    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as Array<{ id: string; error: string }>,
      success: true,
      message: ''
    };

    try {
      // 构建批量更新SQL
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      if (fields.length === 0) {
        results.success = false;
        results.message = 'No fields to update';
        return results;
      }
      
      // 使用事务确保数据一致性
      const client = await query('BEGIN');
      
      try {
        for (const accountId of accountIds) {
          try {
            const sql = `
              UPDATE energy_pools 
              SET ${fields.join(', ')}, last_updated_at = NOW()
              WHERE id = $${paramIndex}
            `;
            
            const updateValues = [...values, accountId];
            const result = await query(sql, updateValues);
            
            if (result.rowCount > 0) {
              results.successCount++;
            } else {
              results.failedCount++;
              results.errors.push({ id: accountId, error: 'Account not found' });
            }
          } catch (error) {
            results.failedCount++;
            results.errors.push({ 
              id: accountId, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
        
        await query('COMMIT');
        
        results.message = `批量更新完成: 成功 ${results.successCount} 个，失败 ${results.failedCount} 个`;
        results.success = results.failedCount === 0;
        
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Failed to batch update accounts:', error);
      results.success = false;
      results.message = 'Batch update failed';
      results.failedCount = accountIds.length;
    }
    
    return results;
  }

  /**
   * 删除能量池账户
   */
  async deletePoolAccount(id: string): Promise<boolean> {
    try {
      const sql = 'DELETE FROM energy_pools WHERE id = $1';
      const result = await query(sql, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to delete pool account:', error);
      throw error;
    }
  }

  /**
   * 添加新的能量池账户
   */
  async addPoolAccount(accountData: Omit<EnergyPoolAccount, 'id' | 'last_updated_at' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; message: string; accountId?: string }> {
    try {
      const sql = `
        INSERT INTO energy_pools (
          name, tron_address, private_key_encrypted, total_energy, available_energy, 
          reserved_energy, status, account_type, priority, cost_per_energy,
          description, contact_info, daily_limit, monthly_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `;
      
      const result = await query(sql, [
        accountData.name,
        accountData.tron_address,
        accountData.private_key_encrypted,
        accountData.total_energy,
        accountData.available_energy,
        accountData.reserved_energy,
        accountData.status,
        accountData.account_type || 'own_energy',
        accountData.priority || 1,
        accountData.cost_per_energy || '0.001',
        accountData.description || null,
        accountData.contact_info || null,
        accountData.daily_limit || null,
        accountData.monthly_limit || null
      ]);
      
      return {
        success: true,
        message: 'Pool account added successfully',
        accountId: result.rows[0].id
      };
    } catch (error) {
      console.error('Failed to add pool account:', error);
      return { success: false, message: 'Failed to add pool account' };
    }
  }

  /**
   * 获取能量池统计信息
   */
  async getPoolStatistics(): Promise<{
    success: boolean;
    data?: {
      totalAccounts: number;
      activeAccounts: number;
      totalEnergy: number;
      availableEnergy: number;
      reservedEnergy: number;
      utilizationRate: number;
    };
    message?: string;
  }> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_accounts,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts,
          COALESCE(SUM(total_energy), 0) as total_energy,
          COALESCE(SUM(available_energy), 0) as available_energy,
          COALESCE(SUM(reserved_energy), 0) as reserved_energy
        FROM energy_pools
      `;
      
      const result = await query(sql);
      const stats = result.rows[0];
      
      const utilizationRate = stats.total_energy > 0 
        ? ((stats.total_energy - stats.available_energy) / stats.total_energy) * 100 
        : 0;
      
      return {
        success: true,
        data: {
          totalAccounts: parseInt(stats.total_accounts),
          activeAccounts: parseInt(stats.active_accounts),
          totalEnergy: parseInt(stats.total_energy),
          availableEnergy: parseInt(stats.available_energy),
          reservedEnergy: parseInt(stats.reserved_energy),
          utilizationRate: Math.round(utilizationRate * 100) / 100
        }
      };
    } catch (error) {
      console.error('Failed to get pool statistics:', error);
      return { success: false, message: 'Failed to get pool statistics' };
    }
  }

  /**
   * 获取今日消耗统计
   */
  async getTodayConsumption(): Promise<TodayConsumptionSummary> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const sql = `
        SELECT 
          consumption_date,
          pool_account_id,
          account_name,
          account_type,
          total_consumed_energy,
          total_cost,
          transaction_count
        FROM daily_energy_consumption 
        WHERE consumption_date = $1
        ORDER BY total_consumed_energy DESC
      `;
      
      const result = await query(sql, [today]);
      const dailyData: DailyConsumption[] = result.rows;
      
      // 计算总计
      const summary: TodayConsumptionSummary = {
        total_consumed_energy: dailyData.reduce((sum, item) => sum + Number(item.total_consumed_energy), 0),
        total_cost: dailyData.reduce((sum, item) => sum + Number(item.total_cost), 0),
        total_transactions: dailyData.reduce((sum, item) => sum + Number(item.transaction_count), 0),
        account_breakdown: dailyData
      };
      
      return summary;
    } catch (error) {
      console.error('获取今日消耗统计失败:', error);
      throw new Error(`获取今日消耗统计失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
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
    try {
      const sql = `
        INSERT INTO energy_consumption_logs (
          id, pool_account_id, transaction_type, energy_amount, 
          cost_amount, transaction_id, user_id, notes, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        )
      `;
      
      await query(sql, [
        data.pool_account_id,
        data.transaction_type,
        data.energy_amount,
        data.cost_amount || 0,
        data.transaction_id,
        data.user_id,
        data.notes
      ]);
    } catch (error) {
      console.error('记录能量消耗失败:', error);
      throw new Error(`记录能量消耗失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }


}

// 创建默认实例
export const energyPoolService = new EnergyPoolService();