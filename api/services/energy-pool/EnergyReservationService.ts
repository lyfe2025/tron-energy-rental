import { query } from '../../database/index';
import { accountManagementService } from './AccountManagementService';

export class EnergyReservationService {
  constructor() {
    // 初始化预留服务
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
      await this.logEnergyTransaction({
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
      await this.logEnergyTransaction({
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
      const accountInfo = await accountManagementService.getPoolAccountById(poolAccountId);
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
      await this.logEnergyTransaction({
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
   * 批量预留能量 - 优化版本，避免 N+1 查询问题
   * 性能优化：从 1+2N 个查询降低到 4 个查询（固定）
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
    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as Array<{ reservation: any; error: string }>,
      success: true
    };

    if (reservations.length === 0) {
      return results;
    }

    await query('BEGIN');
    
    try {
      // 1. 批量检查能量池状态
      const poolIds = [...new Set(reservations.map(r => r.poolAccountId))]; // 去重
      const poolCheckSql = `
        SELECT id, available_energy, reserved_energy
        FROM energy_pools 
        WHERE id = ANY($1)
      `;
      const poolResult = await query(poolCheckSql, [poolIds]);
      const poolData = new Map(
        poolResult.rows.map(row => [row.id, {
          availableEnergy: Number(row.available_energy),
          reservedEnergy: Number(row.reserved_energy)
        }])
      );

      // 2. 验证所有预留请求并累计每个池的需求
      const poolRequirements = new Map<string, number>();
      const validReservations = [];
      
      for (const reservation of reservations) {
        const poolInfo = poolData.get(reservation.poolAccountId);
        
        if (!poolInfo) {
          results.failedCount++;
          results.errors.push({
            reservation,
            error: '账户不存在'
          });
          continue;
        }

        // 累计该池的总需求
        const currentRequirement = poolRequirements.get(reservation.poolAccountId) || 0;
        const totalRequired = currentRequirement + reservation.energyAmount;
        
        if (poolInfo.availableEnergy >= totalRequired) {
          poolRequirements.set(reservation.poolAccountId, totalRequired);
          validReservations.push(reservation);
        } else {
          results.failedCount++;
          results.errors.push({
            reservation,
            error: '可用能量不足'
          });
        }
      }

      if (validReservations.length > 0) {
        // 3. 批量更新能量池 - 使用 CASE WHEN 语句
        const poolUpdateEntries = Array.from(poolRequirements.entries());
        if (poolUpdateEntries.length > 0) {
          const updateCases = poolUpdateEntries.map((_, index) => 
            `WHEN id = $${index * 2 + 1} THEN available_energy - $${index * 2 + 2}`
          ).join(' ');
          
          const reservedCases = poolUpdateEntries.map((_, index) => 
            `WHEN id = $${index * 2 + 1} THEN reserved_energy + $${index * 2 + 2}`
          ).join(' ');

          const updateParams = poolUpdateEntries.flatMap(([poolId, amount]) => [poolId, amount]);
          const affectedPoolIds = poolUpdateEntries.map(([poolId]) => poolId);
          
          const poolUpdateSql = `
            UPDATE energy_pools 
            SET 
              available_energy = CASE ${updateCases} ELSE available_energy END,
              reserved_energy = CASE ${reservedCases} ELSE reserved_energy END,
              updated_at = NOW()
            WHERE id = ANY($${updateParams.length + 1})
          `;
          
          await query(poolUpdateSql, [...updateParams, affectedPoolIds]);
        }

        // 4. 批量插入消费日志
        if (validReservations.length > 0) {
          const logValues = validReservations.map((_, index) => 
            `(gen_random_uuid(), $${index * 5 + 1}, 'reserve', $${index * 5 + 2}, 0, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5}, NOW(), NOW())`
          ).join(', ');
          
          const logParams = validReservations.flatMap(r => [
            r.poolAccountId,
            r.energyAmount,
            r.transactionId,
            r.userId || null,
            `预留能量: ${r.energyAmount}`
          ]);

          const logSql = `
            INSERT INTO energy_consumption_logs (
              id, pool_account_id, transaction_type, energy_amount, 
              cost_amount, transaction_id, user_id, notes, created_at, updated_at
            ) VALUES ${logValues}
          `;
          
          await query(logSql, logParams);
        }

        results.successCount = validReservations.length;
        console.log(`批量预留能量成功: ${results.successCount} 个请求, 涉及 ${poolRequirements.size} 个能量池`);
      }

      await query('COMMIT');
      results.success = results.failedCount === 0;
      
    } catch (error) {
      await query('ROLLBACK');
      console.error('批量预留能量失败:', error);
      results.success = false;
      results.failedCount = reservations.length;
      results.errors = [{ 
        reservation: 'all', 
        error: error instanceof Error ? error.message : '批量操作失败' 
      }];
    }
    
    return results;
  }

  /**
   * 获取预留能量统计
   */
  async getReservationStatistics(timeRange: { start: Date; end: Date }): Promise<{
    totalReservations: number;
    totalEnergyReserved: number;
    totalEnergyReleased: number;
    totalEnergyConfirmed: number;
    currentlyReserved: number;
  }> {
    try {
      // 获取时间范围内的预留统计
      const sql = `
        SELECT 
          COUNT(CASE WHEN transaction_type = 'reserve' THEN 1 END) as total_reservations,
          COALESCE(SUM(CASE WHEN transaction_type = 'reserve' THEN energy_amount END), 0) as total_energy_reserved,
          COALESCE(SUM(CASE WHEN transaction_type = 'release' THEN energy_amount END), 0) as total_energy_released,
          COALESCE(SUM(CASE WHEN transaction_type = 'confirm' THEN energy_amount END), 0) as total_energy_confirmed
        FROM energy_consumption_logs 
        WHERE created_at BETWEEN $1 AND $2
          AND transaction_type IN ('reserve', 'release', 'confirm')
      `;
      
      const result = await query(sql, [timeRange.start, timeRange.end]);
      const stats = result.rows[0];
      
      // 获取当前总预留量
      const currentReservedSql = `
        SELECT COALESCE(SUM(reserved_energy), 0) as currently_reserved
        FROM energy_pools
      `;
      const currentResult = await query(currentReservedSql);
      const currentlyReserved = parseInt(currentResult.rows[0].currently_reserved);
      
      return {
        totalReservations: parseInt(stats.total_reservations),
        totalEnergyReserved: parseInt(stats.total_energy_reserved),
        totalEnergyReleased: parseInt(stats.total_energy_released),
        totalEnergyConfirmed: parseInt(stats.total_energy_confirmed),
        currentlyReserved
      };
    } catch (error) {
      console.error('获取预留统计失败:', error);
      throw new Error('获取预留统计失败');
    }
  }

  /**
   * 清理过期预留 - 优化版本，避免 N+1 查询问题
   * 性能优化：从 1+2N 个查询降低到 3 个查询（固定）
   */
  async cleanupExpiredReservations(expirationHours: number = 24): Promise<{
    releasedCount: number;
    totalEnergyReleased: number;
  }> {
    try {
      const expirationTime = new Date(Date.now() - expirationHours * 60 * 60 * 1000);
      
      // 查找过期的预留记录
      const findExpiredSql = `
        SELECT DISTINCT pool_account_id, SUM(energy_amount) as expired_energy
        FROM energy_consumption_logs
        WHERE transaction_type = 'reserve' 
          AND created_at < $1
          AND transaction_id NOT IN (
            SELECT DISTINCT transaction_id 
            FROM energy_consumption_logs 
            WHERE transaction_type IN ('confirm', 'release')
              AND transaction_id IS NOT NULL
          )
        GROUP BY pool_account_id
      `;
      
      const expiredResult = await query(findExpiredSql, [expirationTime]);
      
      if (expiredResult.rows.length === 0) {
        console.log('没有发现过期的预留记录');
        return { releasedCount: 0, totalEnergyReleased: 0 };
      }

      const expiredRecords = expiredResult.rows.map(row => ({
        poolAccountId: row.pool_account_id,
        energyAmount: parseInt(row.expired_energy)
      }));

      const releasedCount = expiredRecords.length;
      const totalEnergyReleased = expiredRecords.reduce((sum, record) => sum + record.energyAmount, 0);

      await query('BEGIN');

      try {
        // 批量更新能量池 - 使用 CASE WHEN 语句
        const updateCases = expiredRecords.map((_, index) => 
          `WHEN id = $${index * 2 + 1} THEN available_energy + $${index * 2 + 2}`
        ).join(' ');
        
        const reservedCases = expiredRecords.map((_, index) => 
          `WHEN id = $${index * 2 + 1} THEN reserved_energy - $${index * 2 + 2}`
        ).join(' ');

        const updateParams = expiredRecords.flatMap(r => [r.poolAccountId, r.energyAmount]);
        const poolIds = expiredRecords.map(r => r.poolAccountId);
        
        const poolUpdateSql = `
          UPDATE energy_pools 
          SET 
            available_energy = CASE ${updateCases} ELSE available_energy END,
            reserved_energy = CASE ${reservedCases} ELSE reserved_energy END,
            updated_at = NOW()
          WHERE id = ANY($${updateParams.length + 1})
        `;
        
        await query(poolUpdateSql, [...updateParams, poolIds]);

        // 批量插入释放日志
        const timestamp = Date.now();
        const logValues = expiredRecords.map((_, index) => 
          `(gen_random_uuid(), $${index * 5 + 1}, 'release', $${index * 5 + 2}, 0, $${index * 5 + 3}, 'system', $${index * 5 + 4}, NOW(), NOW())`
        ).join(', ');
        
        const logParams = expiredRecords.flatMap(record => [
          record.poolAccountId,
          record.energyAmount,
          `cleanup_${timestamp}`,
          null,
          `系统清理过期预留: ${record.energyAmount}`
        ]);

        const logSql = `
          INSERT INTO energy_consumption_logs (
            id, pool_account_id, transaction_type, energy_amount, 
            cost_amount, transaction_id, user_id, notes, created_at, updated_at
          ) VALUES ${logValues}
        `;
        
        await query(logSql, logParams);

        await query('COMMIT');

        console.log(`批量清理过期预留完成: 释放 ${releasedCount} 个账户，总能量 ${totalEnergyReleased}`);

        return { releasedCount, totalEnergyReleased };
        
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('清理过期预留失败:', error);
      throw new Error(`清理过期预留失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录能量交易
   */
  private async logEnergyTransaction(data: {
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
      console.error('记录能量交易失败:', error);
      throw new Error(`记录能量交易失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}

// 创建默认实例
export const energyReservationService = new EnergyReservationService();
