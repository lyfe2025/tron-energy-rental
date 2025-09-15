import { query } from '../../database/index';

export interface EnergyPoolAccount {
  id: string; // UUID
  name: string;
  tron_address: string;
  private_key_encrypted: string;
  total_energy: number;
  available_energy: number;
  total_bandwidth: number;
  available_bandwidth: number;
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
      SELECT 
        ep.*,
        0.001 as cost_per_energy
      FROM energy_pools ep
      WHERE ep.status = $1
      ORDER BY ep.priority ASC, ep.created_at ASC, ep.id ASC
    `;
    const result = await query(sql, ['active']);
    return result.rows;
  }

  /**
   * 获取所有能量池账户（包括已停用的）
   */
  async getAllPoolAccounts(): Promise<EnergyPoolAccount[]> {
    const sql = `
      SELECT 
        ep.*,
        0.001 as cost_per_energy
      FROM energy_pools ep
      ORDER BY ep.priority ASC, ep.created_at ASC, ep.id ASC
    `;
    const result = await query(sql, []);
    
    return result.rows;
  }

  /**
   * 获取能量池账户详情
   */
  async getPoolAccountById(id: string): Promise<EnergyPoolAccount | null> {
    const sql = `
      SELECT 
        ep.*,
        0.001 as cost_per_energy
      FROM energy_pools ep
      WHERE ep.id = $1
    `;
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
      
      // Only add last_updated_at if it's not already in the fields
      const lastUpdatedClause = fields.some(field => field.startsWith('last_updated_at')) 
        ? '' 
        : ', last_updated_at = NOW()';
      
      const sql = `
        UPDATE energy_pools 
        SET ${fields.join(', ')}${lastUpdatedClause}
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
          
          // Only add last_updated_at if it's not already in the updateFields
          const lastUpdatedClause = updateFields.includes('last_updated_at') 
            ? '' 
            : ', last_updated_at = NOW()';
          
          const batchUpdateSql = `
            UPDATE energy_pools 
            SET ${setClause}${lastUpdatedClause}
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
      console.log('🔍 [AccountManagement] 准备插入账户数据:', accountData);
      
      // 首先检查TRON地址是否已存在
      const existingAccountSql = `
        SELECT id, name, tron_address, status, created_at 
        FROM energy_pools 
        WHERE tron_address = $1
      `;
      
      const existingResult = await query(existingAccountSql, [accountData.tron_address]);
      
      if (existingResult.rows.length > 0) {
        const existingAccount = existingResult.rows[0];
        console.log('⚠️ [AccountManagement] 发现重复的TRON地址:', {
          existingId: existingAccount.id,
          existingName: existingAccount.name,
          tronAddress: accountData.tron_address,
          status: existingAccount.status,
          createdAt: existingAccount.created_at
        });
        
        return {
          success: false,
          message: `此TRON地址已经存在于能量池中。现有账户名称：「${existingAccount.name}」，状态：${existingAccount.status}，创建时间：${new Date(existingAccount.created_at).toLocaleString('zh-CN')}。请检查是否重复添加，或使用不同的TRON地址。`
        };
      }
      
      const sql = `
        INSERT INTO energy_pools (
          name, tron_address, private_key_encrypted, total_energy, available_energy, 
          status, account_type, priority, cost_per_energy,
          description, contact_info, daily_limit, monthly_limit,
          staked_trx_energy, staked_trx_bandwidth, delegated_energy, delegated_bandwidth,
          pending_unfreeze_energy, pending_unfreeze_bandwidth, total_bandwidth, available_bandwidth
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id
      `;
      
      const values = [
        accountData.name,
        accountData.tron_address,
        accountData.private_key_encrypted,
        accountData.total_energy,
        accountData.available_energy,
        accountData.status,
        accountData.account_type || 'own_energy',
        accountData.priority || 1,
        accountData.cost_per_energy || '0.001',
        accountData.description || null,
        accountData.contact_info || null,
        accountData.daily_limit || null,
        accountData.monthly_limit || null,
        0, // staked_trx_energy
        0, // staked_trx_bandwidth  
        0, // delegated_energy
        0, // delegated_bandwidth
        0, // pending_unfreeze_energy
        0, // pending_unfreeze_bandwidth
        accountData.total_bandwidth || 0, // total_bandwidth
        accountData.available_bandwidth || 0 // available_bandwidth
      ];
      
      console.log('📝 [AccountManagement] 执行SQL:', sql);
      console.log('📊 [AccountManagement] 参数值:', values);
      
      const result = await query(sql, values);
      
      console.log('✅ [AccountManagement] 插入成功，返回ID:', result.rows[0].id);
      
      return {
        success: true,
        message: 'Pool account added successfully',
        accountId: result.rows[0].id
      };
    } catch (error) {
      console.error('❌ [AccountManagement] 插入账户失败:', error);
      console.error('❌ [AccountManagement] 错误详情:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position
      });
      
      // 处理特定的数据库错误
      if (error.code === '23505' && error.constraint === 'energy_pools_tron_address_key') {
        // 唯一性约束违规 - 虽然我们已经预先检查了，但可能存在竞争条件
        return {
          success: false,
          message: '此TRON地址已经存在于能量池中，请使用不同的地址或检查是否重复添加。'
        };
      } else if (error.code === '23505') {
        // 其他唯一性约束错误
        return {
          success: false,
          message: `数据重复冲突：${error.detail || error.message}`
        };
      } else if (error.code === '23514') {
        // 检查约束错误
        return {
          success: false,
          message: `数据验证失败：${error.detail || error.message}`
        };
      } else if (error.code === '23502') {
        // 非空约束错误
        return {
          success: false,
          message: `缺少必需字段：${error.detail || error.message}`
        };
      } else if (error.code === '23503') {
        // 外键约束错误
        return {
          success: false,
          message: `关联数据不存在：${error.detail || error.message}`
        };
      }
      
      // 通用错误处理
      return { 
        success: false, 
        message: `添加能量池账户失败：${error.message}` 
      };
    }
  }

  /**
   * 获取能量池统计信息（实时数据）
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
    try {
      console.log('📊 [PoolStatistics] 开始获取实时统计信息:', { networkId });
      
      // 1. 获取所有账户的基本信息
      const accountsResult = await query(`
        SELECT id, name, tron_address, status, cost_per_energy
        FROM energy_pools
        ORDER BY created_at DESC
      `);
      
      const accounts = accountsResult.rows;
      const totalAccounts = accounts.length;
      const activeAccounts = accounts.filter(acc => acc.status === 'active').length;
      
      console.log('📊 [PoolStatistics] 数据库账户信息:', {
        totalAccounts,
        activeAccounts,
        accounts: accounts.map(acc => ({ id: acc.id, name: acc.name, status: acc.status }))
      });
      
      // 2. 并行获取每个账户的实时数据
      const realTimeDataPromises = accounts.map(async (account) => {
        try {
          console.log(`📊 [PoolStatistics] 获取账户实时数据: ${account.name} (${account.id})`);
          
          // 直接调用validate-address API获取实时数据
          const response = await fetch('http://localhost:3001/api/energy-pool/accounts/validate-address', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              address: account.tron_address,
              private_key: '', // 空私钥，只获取账户信息
              network_id: networkId
            })
          });
          
          if (!response.ok) {
            console.warn(`⚠️ [PoolStatistics] 账户 ${account.name} 实时数据获取失败:`, response.status);
            return null;
          }
          
          const result = await response.json();
          if (result.success && result.data) {
            console.log(`✅ [PoolStatistics] 账户 ${account.name} 实时数据获取成功:`, {
              energy: result.data.energy,
              bandwidth: result.data.bandwidth
            });
            
            return {
              id: account.id,
              name: account.name,
              status: account.status,
              energy: {
                total: result.data.energy.total || 0,
                available: result.data.energy.available || 0,
                used: result.data.energy.used || 0
              },
              bandwidth: {
                total: result.data.bandwidth.total || 0,
                available: result.data.bandwidth.available || 0,
                used: result.data.bandwidth.used || 0
              },
              costPerEnergy: account.cost_per_energy || 0.0001
            };
          }
          return null;
        } catch (error) {
          console.warn(`⚠️ [PoolStatistics] 账户 ${account.name} 实时数据获取异常:`, error.message);
          return null;
        }
      });
      
      // 3. 等待所有实时数据获取完成
      const realTimeData = await Promise.all(realTimeDataPromises);
      const validData = realTimeData.filter(data => data !== null);
      
      console.log('📊 [PoolStatistics] 实时数据获取结果:', {
        totalAccounts,
        validDataCount: validData.length,
        failedCount: totalAccounts - validData.length
      });
      
      // 4. 计算统计信息
      let totalEnergy = 0;
      let availableEnergy = 0;
      let totalBandwidth = 0;
      let availableBandwidth = 0;
      let totalCostPerEnergy = 0;
      
      console.log('📊 [PoolStatistics] 开始计算统计信息，有效数据:', validData.length);
      
      validData.forEach((data, index) => {
        console.log(`📊 [PoolStatistics] 账户 ${index + 1}: ${data.name}`, {
          energy: data.energy,
          bandwidth: data.bandwidth,
          costPerEnergy: data.costPerEnergy
        });
        
        totalEnergy += data.energy.total || 0;
        availableEnergy += data.energy.available || 0;
        totalBandwidth += data.bandwidth.total || 0;
        availableBandwidth += data.bandwidth.available || 0;
        totalCostPerEnergy += data.costPerEnergy || 0.0001;
      });
      
      console.log('📊 [PoolStatistics] 累计统计:', {
        totalEnergy,
        availableEnergy,
        totalBandwidth,
        availableBandwidth,
        totalCostPerEnergy
      });
      
      const utilizationRate = totalEnergy > 0 
        ? ((totalEnergy - availableEnergy) / totalEnergy) * 100 
        : 0;
        
      const bandwidthUtilizationRate = totalBandwidth > 0 
        ? ((totalBandwidth - availableBandwidth) / totalBandwidth) * 100 
        : 0;
      
      // 计算平均成本（基于TRON官方定价）
      const ENERGY_COST_PER_UNIT = 100; // 100 sun per energy unit
      const BANDWIDTH_COST_PER_UNIT = 1000; // 1000 sun per bandwidth unit
      const SUN_TO_TRX = 1000000; // 1 TRX = 1,000,000 sun
      
      const averageCostPerEnergy = ENERGY_COST_PER_UNIT / SUN_TO_TRX; // 0.0001 TRX
      const averageCostPerBandwidth = BANDWIDTH_COST_PER_UNIT / SUN_TO_TRX; // 0.001 TRX
      
      const statistics = {
        totalAccounts,
        activeAccounts,
        totalEnergy,
        availableEnergy,
        totalBandwidth,
        availableBandwidth,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        bandwidthUtilizationRate: Math.round(bandwidthUtilizationRate * 100) / 100,
        averageCostPerEnergy,
        averageCostPerBandwidth
      };
      
      console.log('📊 [PoolStatistics] 实时统计信息计算完成:', statistics);
      
      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      console.error('Failed to get pool statistics:', error);
      return { success: false, message: 'Failed to get pool statistics' };
    }
  }
}

// 创建默认实例
export const accountManagementService = new AccountManagementService();
