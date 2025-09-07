import { query } from '../database/index';
import { energyPoolService } from './energy-pool';
import { orderService } from './order';
import { tronService } from './tron';

interface DelegationRequest {
  orderId: string | number;
  recipientAddress: string;
  energyAmount: number;
  durationHours: number;
  poolAllocation?: any[];
}

interface DelegationResult {
  success: boolean;
  txId?: string;
  error?: string;
  delegationId?: string;
}

/**
 * 能量委托服务
 * 负责处理能量委托的完整流程
 */
export class EnergyDelegationService {
  /**
   * 执行能量委托
   */
  async executeDelegation(request: DelegationRequest): Promise<DelegationResult> {
    try {
      console.log('Starting energy delegation:', request);
      
      // 1. 验证订单状态
      const orderId = typeof request.orderId === 'string' ? parseInt(request.orderId) : request.orderId;
      const order = await orderService.getOrderById(orderId);
      if (!order || order.status !== 'paid') {
        return {
          success: false,
          error: 'Order not found or not paid'
        };
      }
      
      // 2. 优化能量池分配
      const optimizationResult = await energyPoolService.optimizeEnergyAllocation(request.energyAmount);
      if (!optimizationResult.success) {
        return {
          success: false,
          error: optimizationResult.message || 'Failed to optimize energy allocation'
        };
      }
      
      const allocation = request.poolAllocation || optimizationResult;
      
      // 3. 预留能量资源
      const reservationId = await this.reserveEnergyResources(optimizationResult.allocations);
      if (!reservationId) {
        return {
          success: false,
          error: 'Failed to reserve energy resources'
        };
      }
      
      try {
        // 4. 执行区块链委托操作
        const delegationResults = await this.performBlockchainDelegations(
          optimizationResult.allocations,
          request.recipientAddress,
          request.durationHours
        );
        
        if (!delegationResults.success) {
          // 回滚预留
          await this.releaseEnergyReservation(reservationId);
          return {
            success: false,
            error: delegationResults.error
          };
        }
        
        // 5. 记录委托交易
        const delegationId = await this.recordEnergyTransaction({
          orderId: orderId.toString(),
          recipientAddress: request.recipientAddress,
          energyAmount: request.energyAmount,
          durationHours: request.durationHours,
          txIds: delegationResults.txIds,
          poolAllocations: optimizationResult.allocations,
          reservationId
        });
        
        // 6. 确认能量使用
        for (let i = 0; i < optimizationResult.allocations.length; i++) {
          const allocation = optimizationResult.allocations[i];
          const txId = delegationResults.txIds[i];
          await energyPoolService.confirmEnergyUsage(
            allocation.poolAccountId,
            allocation.energyAmount,
            txId
          );
        }
        
        // 7. 更新订单状态
        await orderService.updateOrderStatus(orderId, 'processing');
        
        // 8. 启动委托监控
        await this.startDelegationMonitoring(delegationId, request.durationHours);
        
        console.log('Energy delegation completed successfully:', delegationId);
        
        return {
          success: true,
          txId: delegationResults.txIds[0], // 返回第一个交易ID
          delegationId
        };
        
      } catch (error) {
        // 发生错误时回滚预留
        await this.releaseEnergyReservation(reservationId);
        throw error;
      }
      
    } catch (error) {
      console.error('Energy delegation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * 预留能量资源
   */
  private async reserveEnergyResources(allocations: any[]): Promise<string | null> {
    try {
      const reservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      for (const allocation of allocations) {
        await energyPoolService.reserveEnergy(
          allocation.poolAccountId,
          allocation.energyAmount,
          reservationId
        );
        
        // 预留成功，继续下一个分配
      }
      
      return reservationId;
    } catch (error) {
      console.error('Failed to reserve energy resources:', error);
      return null;
    }
  }
  
  /**
   * 释放能量预留
   */
  private async releaseEnergyReservation(reservationId: string): Promise<void> {
    try {
      // 获取预留记录
      const result = await query(
        `SELECT * FROM energy_reservations WHERE reservation_id = $1`,
        [reservationId]
      );
      const reservations = result.rows;
      
      if (reservations) {
        for (const reservation of reservations) {
          await energyPoolService.releaseReservedEnergy(
            reservation.pool_id,
            reservation.amount,
            reservationId,
            reservation.user_id
          );
        }
      }
    } catch (error) {
      console.error('Failed to release energy reservation:', error);
    }
  }
  
  /**
   * 执行区块链委托操作
   */
  private async performBlockchainDelegations(
    allocations: any[],
    recipientAddress: string,
    durationHours: number
  ): Promise<{ success: boolean; txIds?: string[]; error?: string }> {
    try {
      const txIds: string[] = [];
      
      for (const allocation of allocations) {
        // 获取能量池信息
        const pool = await energyPoolService.getPoolAccountById(allocation.poolAccountId);
        if (!pool) {
          return {
            success: false,
            error: `Pool ${allocation.poolAccountId} not found`
          };
        }
        
        // 执行委托
        const result = await tronService.delegateResource({
          ownerAddress: pool.tron_address,
          receiverAddress: recipientAddress,
          balance: allocation.energyAmount,
          resource: 'ENERGY',
          lock: true,
          lockPeriod: durationHours
        });
        
        if (!result.success) {
          return {
            success: false,
            error: `Delegation failed for pool ${allocation.poolAccountId}: ${result.error}`
          };
        }
        
        txIds.push(result.txid!);
        
        // 更新能量池状态
        await energyPoolService.updatePoolAccount(allocation.poolAccountId, {
          available_energy: pool.available_energy - allocation.energyAmount,
          last_updated_at: new Date()
        });
      }
      
      return {
        success: true,
        txIds
      };
    } catch (error) {
      console.error('Blockchain delegation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Blockchain operation failed'
      };
    }
  }
  
  /**
   * 记录能量交易
   */
  private async recordEnergyTransaction(data: {
    orderId: string;
    recipientAddress: string;
    energyAmount: number;
    durationHours: number;
    txIds: string[];
    poolAllocations: any[];
    reservationId: string;
  }): Promise<string> {
    try {
      const delegationId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 记录主委托记录
      await query(
        `INSERT INTO delegate_records (
          id, order_id, recipient_address, total_energy, duration_hours, 
          status, reservation_id, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          delegationId, data.orderId, data.recipientAddress, data.energyAmount, 
          data.durationHours, 'active', data.reservationId, new Date(), 
          new Date(Date.now() + data.durationHours * 60 * 60 * 1000)
        ]
      );
      
      // 记录每个池的交易详情
      for (let i = 0; i < data.poolAllocations.length; i++) {
        const allocation = data.poolAllocations[i];
        const txId = data.txIds[i];
        
        await query(
          `INSERT INTO energy_transactions (
            delegation_id, pool_id, tx_id, from_address, to_address, 
            energy_amount, transaction_type, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            delegationId, allocation.poolId, txId, allocation.fromAddress, 
            data.recipientAddress, allocation.amount, 'delegate', 'confirmed', new Date()
          ]
        );
      }
      
      return delegationId;
    } catch (error) {
      console.error('Failed to record energy transaction:', error);
      throw error;
    }
  }
  
  /**
   * 启动委托监控
   */
  private async startDelegationMonitoring(delegationId: string, durationHours: number): Promise<void> {
    try {
      // 创建监控任务
      await query(
        `INSERT INTO delegation_monitors (
          delegation_id, monitor_type, scheduled_at, status, created_at
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          delegationId, 'expiration', 
          new Date(Date.now() + durationHours * 60 * 60 * 1000),
          'pending', new Date()
        ]
      );
    } catch (error) {
      console.error('Failed to start delegation monitoring:', error);
    }
  }
  
  /**
   * 处理委托到期
   */
  async handleDelegationExpiry(delegationId: string): Promise<void> {
    try {
      console.log('Processing delegation expiry:', delegationId);
      
      // 获取委托信息
      const delegationResult = await query(
        `SELECT * FROM delegate_records WHERE id = $1`,
        [delegationId]
      );
      
      if (!delegationResult.rows || delegationResult.rows.length === 0) {
        console.error('Delegation not found:', delegationId);
        return;
      }
      const delegation = delegationResult.rows[0];
      
      // 获取相关交易
      const transactionResult = await query(
        `SELECT * FROM energy_transactions 
         WHERE delegation_id = $1 AND transaction_type = $2`,
        [delegationId, 'delegate']
      );
      const transactions = transactionResult.rows;
      
      if (transactions) {
        // 执行取消委托操作
        for (const transaction of transactions) {
          try {
            const result = await tronService.undelegateResource({
              ownerAddress: transaction.from_address,
              receiverAddress: transaction.to_address,
              balance: transaction.energy_amount,
              resource: 'ENERGY'
            });
            
            if (result.success) {
              // 记录取消委托交易
              await query(
                `INSERT INTO energy_transactions (
                  delegation_id, pool_id, tx_id, from_address, to_address,
                  energy_amount, transaction_type, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  delegationId, transaction.pool_id, result.txid,
                  transaction.from_address, transaction.to_address,
                  transaction.energy_amount, 'undelegate', 'confirmed', new Date()
                ]
              );
              
              // 更新能量池状态
              const pool = await energyPoolService.getPoolAccountById(transaction.pool_id);
              if (pool) {
                await energyPoolService.updatePoolAccount(transaction.pool_id, {
                  available_energy: pool.available_energy + transaction.energy_amount,
                  last_updated_at: new Date()
                });
              }
            }
          } catch (error) {
            console.error('Failed to undelegate energy:', error);
          }
        }
      }
      
      // 更新委托状态
      await query(
        `UPDATE delegate_records 
         SET status = $1, updated_at = $2 
         WHERE id = $3`,
        ['expired', new Date(), delegationId]
      );
      
      // 释放预留资源
      if (delegation.reservation_id) {
        await this.releaseEnergyReservation(delegation.reservation_id);
      }
      
      console.log('Delegation expiry processed successfully:', delegationId);
    } catch (error) {
      console.error('Failed to handle delegation expiry:', error);
    }
  }
  
  /**
   * 获取委托状态
   */
  async getDelegationStatus(delegationId: string): Promise<any> {
    try {
      const delegationResult = await query(
        `SELECT * FROM delegate_records WHERE id = $1`,
        [delegationId]
      );
      
      if (!delegationResult.rows || delegationResult.rows.length === 0) {
        return null;
      }
      
      const delegation = delegationResult.rows[0];
      
      // 获取相关交易
      const transactionResult = await query(
        `SELECT * FROM energy_transactions WHERE delegation_id = $1`,
        [delegationId]
      );
      
      delegation.energy_transactions = transactionResult.rows || [];
      
      return delegation;
    } catch (error) {
      console.error('Failed to get delegation status:', error);
      return null;
    }
  }
  
  /**
   * 获取用户委托历史
   */
  async getUserDelegations(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const result = await query(
        `SELECT ed.* FROM delegate_records ed
         INNER JOIN orders o ON ed.order_id = o.id
         WHERE o.user_id = $1
         ORDER BY ed.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      
      return result.rows || [];
    } catch (error) {
      console.error('Failed to get user delegations:', error);
      return [];
    }
  }
}

// 创建默认实例
export const energyDelegationService = new EnergyDelegationService();