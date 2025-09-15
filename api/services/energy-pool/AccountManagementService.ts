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
          total_bandwidth, available_bandwidth
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
      
      // 1. 获取所有启用状态的账户的基本信息（只统计启用的账户，不包含维护中或停用的账户）
      const accountsResult = await query(`
        SELECT id, name, tron_address, status, cost_per_energy
        FROM energy_pools
        WHERE status = 'active'
        ORDER BY created_at DESC
      `);
      
      const accounts = accountsResult.rows;
      const totalAccounts = accounts.length;  // 只统计启用的账户
      const activeAccounts = accounts.length;  // 由于已经过滤了，所以活跃账户数等于总账户数
      
      console.log('📊 [PoolStatistics] 数据库账户信息:', {
        totalAccounts,
        activeAccounts,
        accounts: accounts.map(acc => ({ id: acc.id, name: acc.name, status: acc.status }))
      });
      
      // 2. 获取网络配置
      let tronApiUrl = 'https://api.trongrid.io';
      if (networkId) {
        const networkResult = await query(
          'SELECT name, network_type, rpc_url FROM tron_networks WHERE id = $1',
          [networkId]
        );
        if (networkResult.rows.length > 0) {
          tronApiUrl = networkResult.rows[0].rpc_url;
          console.log('📊 [PoolStatistics] 使用指定网络:', {
            networkId,
            name: networkResult.rows[0].name,
            rpcUrl: tronApiUrl
          });
        }
      }

      // 3. 直接从TRON官方API获取所有账户的实时数据
      const realTimeDataPromises = accounts.map(async (account) => {
        try {
          console.log(`📊 [PoolStatistics] 从TRON官方API获取账户数据: ${account.name} (${account.tron_address})`);
          
          // 同时调用两个TRON官方API获取完整账户信息
          const [resourceResponse, accountResponse] = await Promise.all([
            fetch(`${tronApiUrl}/wallet/getaccountresource`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: account.tron_address, visible: true })
            }),
            fetch(`${tronApiUrl}/wallet/getaccount`, {
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: account.tron_address, visible: true })
            })
          ]);
          
          if (!resourceResponse.ok || !accountResponse.ok) {
            console.warn(`⚠️ [PoolStatistics] TRON API调用失败: ${account.name}`, {
              resourceStatus: resourceResponse.status,
              accountStatus: accountResponse.status
            });
            return null;
          }
          
          const [tronResourceData, tronAccountData] = await Promise.all([
            resourceResponse.json(),
            accountResponse.json()
          ]);
          
          console.log(`✅ [PoolStatistics] 获取TRON数据成功: ${account.name}`, {
            resource: tronResourceData,
            account: tronAccountData
          });
          
          // 解析账户资源数据
          const energyLimit = tronResourceData.EnergyLimit || 0; // TRON API返回的净可用能量
          const energyUsed = tronResourceData.EnergyUsed || 0; // 已使用的能量
          const currentAvailableEnergy = energyLimit - energyUsed; // 当前可用能量
          
          // 带宽计算
          const freeNetLimit = tronResourceData.freeNetLimit || 600; // 免费带宽
          const netLimit = tronResourceData.NetLimit || 0; // 质押获得的带宽
          const totalBandwidth = freeNetLimit + netLimit; // 总带宽
          const netUsed = tronResourceData.NetUsed || 0; // 已使用带宽
          const currentAvailableBandwidth = totalBandwidth - netUsed; // 当前可用带宽
          
          // 获取质押和代理信息（从account数据中）
          const accountResource = tronAccountData.account_resource || {};
          const frozenV2 = tronAccountData.frozenV2 || [];
          
          // 分别找到能量和带宽质押信息
          const energyFrozen = frozenV2.find(item => item.type === 'ENERGY');
          const bandwidthFrozen = frozenV2.find(item => item.type === 'BANDWIDTH');
          const stakedTrxForEnergy = energyFrozen ? (energyFrozen.amount || 0) : 0; // 质押的TRX数量（单位：sun）
          const stakedTrxForBandwidth = bandwidthFrozen ? (bandwidthFrozen.amount || 0) : 0; // 质押的TRX数量（单位：sun）
          
          // 获取代理信息
          const delegatedEnergyOut = accountResource.delegated_frozenV2_balance_for_energy || 0; // 代理给别人的TRX
          const delegatedBandwidthOut = accountResource.delegated_frozenV2_balance_for_bandwidth || 0; // 代理给别人的TRX
          const delegatedEnergyIn = accountResource.acquired_delegated_frozenV2_balance_for_energy || 0; // 从别人获得的TRX
          const delegatedBandwidthIn = accountResource.acquired_delegated_frozenV2_balance_for_bandwidth || 0; // 从别人获得的TRX
          
          // 转换为TRX单位
          const stakedTrxForEnergyInTrx = stakedTrxForEnergy / 1000000; 
          const stakedTrxForBandwidthInTrx = stakedTrxForBandwidth / 1000000;
          const delegatedEnergyInTrx = delegatedEnergyIn / 1000000;
          const delegatedEnergyOutTrx = delegatedEnergyOut / 1000000;
          const delegatedBandwidthInTrx = delegatedBandwidthIn / 1000000;
          const delegatedBandwidthOutTrx = delegatedBandwidthOut / 1000000;
          
          // === 能量计算 ===
          // 理论总能量 = 净可用能量 + 代理出去的能量
          let theoreticalTotalEnergy = energyLimit;
          
          if (delegatedEnergyOutTrx > 0) {
            // 根据你提供的数据：27 TRX代理 ≈ 2,057能量，比率约为76.2能量/TRX
            const energyPerTrx = 76.2; 
            const delegatedOutEnergy = delegatedEnergyOutTrx * energyPerTrx;
            theoreticalTotalEnergy = energyLimit + delegatedOutEnergy;
          }
          
          // === 带宽计算（关键修复） ===
          // 1. 免费带宽 = 600
          // 2. 质押获得的带宽 = netLimit（TRON API已返回）
          // 3. 代理出去的带宽需要从理论总带宽中计算
          // 4. 理论总带宽 = 免费带宽 + 质押带宽 + 代理出去的带宽
          
          let theoreticalTotalBandwidth = freeNetLimit + netLimit; // 基础带宽
          
          if (delegatedBandwidthOutTrx > 0) {
            // 假设1 TRX ≈ 1000 带宽（这是一个估算值，具体需要根据TRON网络状态）
            const bandwidthPerTrx = 1000; 
            const delegatedOutBandwidth = delegatedBandwidthOutTrx * bandwidthPerTrx;
            theoreticalTotalBandwidth = freeNetLimit + netLimit + delegatedOutBandwidth;
          }
          
          // 实际可用于出租的资源
          const rentableEnergy = Math.max(0, currentAvailableEnergy);
          const rentableBandwidth = Math.max(0, currentAvailableBandwidth);
          
          // 包含代理影响的总资源
          const totalEnergyWithDelegation = theoreticalTotalEnergy + (delegatedEnergyInTrx * 76.2);
          const totalBandwidthWithDelegation = theoreticalTotalBandwidth + (delegatedBandwidthInTrx * 1000);
          
          console.log(`📊 [PoolStatistics] 账户 ${account.name} 详细分析:`, {
            stakes: {
              energyTrx: stakedTrxForEnergyInTrx,
              bandwidthTrx: stakedTrxForBandwidthInTrx
            },
            delegations: {
              energyOutTrx: delegatedEnergyOutTrx,
              energyInTrx: delegatedEnergyInTrx,
              bandwidthOutTrx: delegatedBandwidthOutTrx,
              bandwidthInTrx: delegatedBandwidthInTrx
            },
            energy: {
              theoretical: theoreticalTotalEnergy,
              current: energyLimit,
              available: rentableEnergy,
              used: energyUsed
            },
            bandwidth: {
              theoretical: theoreticalTotalBandwidth,
              current: totalBandwidth,
              available: rentableBandwidth,
              used: netUsed
            }
          });
          
          return {
            id: account.id,
            name: account.name,
            status: account.status,
            energy: {
              fromStaking: theoreticalTotalEnergy, // 理论总能量（包含代理还原）
              total: theoreticalTotalEnergy, // 理论总能量
              available: rentableEnergy, // 实际可用于出租的能量（净能量）
              used: energyUsed,
              delegatedOut: delegatedEnergyOut, // 代理给别人的TRX数量
              delegatedIn: delegatedEnergyIn // 从别人获得的TRX数量
            },
            bandwidth: {
              fromStaking: theoreticalTotalBandwidth, // 理论总带宽（包含代理还原）
              total: theoreticalTotalBandwidth, // 理论总带宽
              available: rentableBandwidth, // 实际可用于出租的带宽
              used: netUsed,
              delegatedOut: delegatedBandwidthOut, // 代理给别人的TRX数量
              delegatedIn: delegatedBandwidthIn // 从别人获得的TRX数量
            },
            costPerEnergy: account.cost_per_energy || 0.0001
          };
        } catch (error) {
          console.error(`❌ [PoolStatistics] 获取账户 ${account.name} 数据失败:`, error);
          return null;
        }
      });
      
      // 4. 等待所有实时数据获取完成
      const realTimeData = await Promise.all(realTimeDataPromises);
      const validData = realTimeData.filter(data => data !== null);
      
      console.log('📊 [PoolStatistics] 实时数据获取结果:', {
        totalAccounts,
        validDataCount: validData.length,
        failedCount: totalAccounts - validData.length
      });
      
      // 5. 计算统计信息 - 使用修正后的数据结构
      let totalEnergyFromStaking = 0; // 仅质押获得的能量总和
      let totalEnergyWithDelegation = 0; // 包含代理的能量总和
      let availableEnergy = 0; // 实际可用于出租的能量
      let totalBandwidthFromStaking = 0; // 仅质押获得的带宽总和
      let totalBandwidthWithDelegation = 0; // 包含代理的带宽总和
      let availableBandwidth = 0; // 实际可用于出租的带宽
      let totalCostPerEnergy = 0;
      let totalDelegatedEnergyOut = 0; // 总的对外代理能量
      let totalDelegatedBandwidthOut = 0; // 总的对外代理带宽
      
      console.log('📊 [PoolStatistics] 开始计算统计信息，有效数据:', validData.length);
      
      validData.forEach((data, index) => {
        console.log(`📊 [PoolStatistics] 账户 ${index + 1}: ${data.name}`, {
          energy: data.energy,
          bandwidth: data.bandwidth,
          costPerEnergy: data.costPerEnergy
        });
        
        // 累加能量统计 - 使用正确的业务逻辑
        totalEnergyFromStaking += data.energy.fromStaking || 0; // 质押获得的能量
        totalEnergyWithDelegation += data.energy.total || 0; // 包含代理的总能量
        availableEnergy += data.energy.available || 0; // 实际可用能量
        totalDelegatedEnergyOut += data.energy.delegatedOut || 0; // 对外代理的能量
        
        // 累加带宽统计
        totalBandwidthFromStaking += data.bandwidth.fromStaking || 0; // 质押获得的带宽
        totalBandwidthWithDelegation += data.bandwidth.total || 0; // 包含代理的总带宽
        availableBandwidth += data.bandwidth.available || 0; // 实际可用带宽
        totalDelegatedBandwidthOut += data.bandwidth.delegatedOut || 0; // 对外代理的带宽
        
        totalCostPerEnergy += data.costPerEnergy || 0.0001;
      });
      
      console.log('📊 [PoolStatistics] 累计统计:', {
        totalEnergyFromStaking,
        totalEnergyWithDelegation,
        availableEnergy,
        totalBandwidthFromStaking,
        totalBandwidthWithDelegation,
        availableBandwidth,
        totalDelegatedEnergyOut,
        totalDelegatedBandwidthOut,
        totalCostPerEnergy
      });
      
      // 使用包含代理的总能量来计算利用率
      const utilizationRate = totalEnergyWithDelegation > 0 
        ? ((totalEnergyWithDelegation - availableEnergy) / totalEnergyWithDelegation) * 100 
        : 0;
        
      const bandwidthUtilizationRate = totalBandwidthWithDelegation > 0 
        ? ((totalBandwidthWithDelegation - availableBandwidth) / totalBandwidthWithDelegation) * 100 
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
        totalEnergy: totalEnergyWithDelegation, // 使用包含代理的总能量
        availableEnergy, // 实际可用于出租的能量
        totalBandwidth: totalBandwidthWithDelegation, // 使用包含代理的总带宽
        availableBandwidth, // 实际可用于出租的带宽
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        bandwidthUtilizationRate: Math.round(bandwidthUtilizationRate * 100) / 100,
        averageCostPerEnergy,
        averageCostPerBandwidth,
        // 添加额外的统计信息
        totalEnergyFromStaking, // 仅质押获得的能量
        totalBandwidthFromStaking, // 仅质押获得的带宽
        totalDelegatedEnergyOut, // 总的对外代理能量
        totalDelegatedBandwidthOut // 总的对外代理带宽
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
