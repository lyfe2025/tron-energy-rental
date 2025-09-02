import { query } from '../../database/index';

export interface EnergyPoolAccount {
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

export class AccountManagementService {
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
   * 批量更新能量池账户信息 - 优化版本，避免 N+1 查询问题
   * 性能优化：从 N 个 UPDATE 查询降低到 2 个查询（固定）
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

    if (accountIds.length === 0) {
      results.message = 'No accounts to update';
      return results;
    }

    try {
      // 构建动态更新字段
      const updateFields = Object.keys(updates).filter(key => updates[key] !== undefined);
      
      if (updateFields.length === 0) {
        results.success = false;
        results.message = 'No fields to update';
        return results;
      }

      await query('BEGIN');

      try {
        // 1. 检查哪些账户存在
        const checkSql = 'SELECT id FROM energy_pools WHERE id = ANY($1)';
        const existingResult = await query(checkSql, [accountIds]);
        const existingIds = existingResult.rows.map(row => row.id);
        const notFoundIds = accountIds.filter(id => !existingIds.includes(id));

        // 记录不存在的账户
        notFoundIds.forEach(id => {
          results.failedCount++;
          results.errors.push({ id, error: 'Account not found' });
        });

        if (existingIds.length > 0) {
          // 2. 批量更新存在的账户
          const setClause = updateFields.map((field, index) => 
            `${field} = $${index + 2}`
          ).join(', ');
          
          const values = updateFields.map(field => updates[field]);
          
          const batchUpdateSql = `
            UPDATE energy_pools 
            SET ${setClause}, last_updated_at = NOW()
            WHERE id = ANY($1)
          `;

          await query(batchUpdateSql, [existingIds, ...values]);
          results.successCount = existingIds.length;
          
          console.log(`批量更新账户成功: ${results.successCount} 个账户已更新`);
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
      results.message = `Batch update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.failedCount = accountIds.length;
      // 清空之前的错误，用统一的错误信息
      results.errors = accountIds.map(id => ({ 
        id, 
        error: 'Batch operation failed' 
      }));
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
}

// 创建默认实例
export const accountManagementService = new AccountManagementService();
