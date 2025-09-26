import { query } from '../../../database/index.ts';
import type {
    AddAccountResult,
    BatchUpdateResult,
    EnergyPoolAccount,
    UpdateAccountResult
} from '../types/account.types.ts';

/**
 * 账户基础CRUD服务
 * 负责账户的增删改查基本操作
 */
export class AccountCRUDService {
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
      ORDER BY ep.priority DESC, ep.created_at ASC, ep.id ASC
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
      ORDER BY ep.priority DESC, ep.created_at ASC, ep.id ASC
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
  async updatePoolAccount(id: string, updates: Partial<EnergyPoolAccount>): Promise<UpdateAccountResult> {
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
  async batchUpdateAccounts(accountIds: string[], updates: Partial<EnergyPoolAccount>): Promise<BatchUpdateResult> {
    const results: BatchUpdateResult = {
      successCount: 0,
      failedCount: 0,
      errors: [],
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
  async addPoolAccount(accountData: Omit<EnergyPoolAccount, 'id' | 'last_updated_at' | 'created_at' | 'updated_at'>): Promise<AddAccountResult> {
    try {
      console.log('🔍 [AccountCRUD] 准备插入账户数据:', accountData);
      
      // 首先检查TRON地址是否已存在
      const existingAccountSql = `
        SELECT id, name, tron_address, status, created_at 
        FROM energy_pools 
        WHERE tron_address = $1
      `;
      
      const existingResult = await query(existingAccountSql, [accountData.tron_address]);
      
      if (existingResult.rows.length > 0) {
        const existingAccount = existingResult.rows[0];
        console.log('⚠️ [AccountCRUD] 发现重复的TRON地址:', {
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
          name, tron_address, private_key_encrypted, 
          status, account_type, priority, cost_per_energy,
          description, contact_info, daily_limit, monthly_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;
      
      // 注意：已移除 total_energy, available_energy, total_bandwidth, available_bandwidth 字段
      // 这些数据现在从TRON网络实时获取，不再存储在数据库中
      const values = [
        accountData.name,
        accountData.tron_address,
        accountData.private_key_encrypted,
        accountData.status,
        accountData.account_type || 'own_energy',
        accountData.priority || 1,
        accountData.cost_per_energy || '0.001',
        accountData.description || null,
        accountData.contact_info || null,
        accountData.daily_limit || null,
        accountData.monthly_limit || null
      ];
      
      console.log('📝 [AccountCRUD] 执行SQL:', sql);
      console.log('📊 [AccountCRUD] 参数值:', values);
      
      const result = await query(sql, values);
      
      console.log('✅ [AccountCRUD] 插入成功，返回ID:', result.rows[0].id);
      
      return {
        success: true,
        message: 'Pool account added successfully',
        accountId: result.rows[0].id
      };
    } catch (error: any) {
      console.error('❌ [AccountCRUD] 插入账户失败:', error);
      console.error('❌ [AccountCRUD] 错误详情:', {
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
}

// 创建默认实例
export const accountCRUDService = new AccountCRUDService();
