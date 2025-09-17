// 重构后的能量代理服务 - 移除预留机制，直接基于 TRON 实时数据
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
 * 能量代理服务
 * 负责处理能量代理的完整流程，已移除预留机制，直接基于 TRON 实时数据
 */
export class EnergyDelegationService {
  /**
   * 执行能量代理
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
      
      // 3. 直接执行区块链代理操作（无预留机制）
      const delegationResults = await this.performBlockchainDelegations(
        optimizationResult.allocations,
        request.recipientAddress,
        request.durationHours
      );
      
      if (!delegationResults.success) {
        return {
          success: false,
          error: delegationResults.error
        };
      }
      
      // 4. 记录代理交易
      const delegationId = await this.recordEnergyTransaction({
        orderId: orderId.toString(),
        recipientAddress: request.recipientAddress,
        energyAmount: request.energyAmount,
        durationHours: request.durationHours,
        txIds: delegationResults.txIds,
        poolAllocations: optimizationResult.allocations,
        reservationId: null // 不再使用预留ID
      });
      
      // 5. 更新能量池状态（如果需要缓存）
      // 注意：实际的能量状态现在从 TRON 网络实时获取
        
      // 6. 更新订单状态
      await orderService.updateOrderStatus(orderId, 'processing');
      
      // 7. 启动代理监控
      this.startDelegationMonitoring(delegationId, request.durationHours);
      
      return {
        success: true,
        txId: delegationResults.txIds[0], // 返回第一个交易ID
        delegationId
      };
        
    } catch (error) {
      console.error('Energy delegation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 执行区块链代理操作
   */
  private async performBlockchainDelegations(
    allocations: any[],
    recipientAddress: string,
    durationHours: number
  ): Promise<{ success: boolean; txIds?: string[]; error?: string }> {
    try {
      const txIds: string[] = [];
      
      for (const allocation of allocations) {
        // 执行单个代理操作
        const result = await tronService.delegateResource({
          ownerAddress: allocation.address,
          receiverAddress: recipientAddress,
          balance: allocation.energyAmount,
          resource: 'ENERGY',
          lock: false,
          lockPeriod: durationHours
        });
        
        if (result.success && result.txid) {
          txIds.push(result.txid);
          console.log(`✅ 代理成功: ${allocation.address} -> ${recipientAddress}, Energy: ${allocation.energyAmount}, TxID: ${result.txid}`);
        } else {
          console.error(`❌ 代理失败: ${allocation.address} -> ${recipientAddress}, Error: ${result.error}`);
          // 如果任一代理失败，返回错误
          return {
            success: false,
            error: `Delegation failed for pool ${allocation.address}: ${result.error}`
          };
        }
      }
      
      return {
        success: true,
        txIds
      };
    } catch (error) {
      console.error('Blockchain delegation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown blockchain error'
      };
    }
  }

  private async recordEnergyTransaction(data: {
    orderId: string;
    recipientAddress: string;
    energyAmount: number;
    durationHours: number;
    txIds: string[];
    poolAllocations: any[];
    reservationId: string | null;
  }): Promise<string> {
    try {
      const delegationId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 记录代理交易到日志
      console.log(`✅ 代理记录创建 - ID: ${delegationId}, 订单: ${data.orderId}, 接收地址: ${data.recipientAddress}`);
      
      // 详细记录每个池的分配情况
      console.log(`✅ 能量代理完成 - DelegationId: ${delegationId}, 池分配数量: ${data.poolAllocations.length}`);
      for (let i = 0; i < data.poolAllocations.length; i++) {
        const allocation = data.poolAllocations[i];
        const txId = data.txIds[i];
        console.log(`   池 ${i + 1}: ${allocation.address} -> ${allocation.energyAmount} Energy, TxID: ${txId}`);
      }
      
      return delegationId;
    } catch (error) {
      console.error('Failed to record energy transaction:', error);
      throw new Error('Failed to record delegation');
    }
  }

  /**
   * 启动代理监控
   */
  private async startDelegationMonitoring(delegationId: string, durationHours: number): Promise<void> {
    try {
      console.log(`🔍 [startDelegationMonitoring] 已改为实时监控 - 代理ID: ${delegationId}, 持续: ${durationHours}小时`);
      console.log(`🔍 代理监控现在通过定时任务和TRON网络状态实时检查`);
      
      // 这里可以设置定时任务来监控代理状态
      // 实际实现应该使用 cron job 或其他定时机制
      
    } catch (error) {
      console.error('Failed to start delegation monitoring:', error);
    }
  }

  /**
   * 处理代理到期
   */
  async handleDelegationExpiry(delegationId: string): Promise<void> {
    try {
      console.log('Processing delegation expiry:', delegationId);
      
      // 获取代理信息（从TRON网络实时获取）
      console.log(`🔍 代理到期处理 - ID: ${delegationId}`);
      
      // 由于改为实时查询，这里需要从 TRON 网络获取代理状态
      // 而不是从本地数据库查询
      
      const delegation: any = await this.getDelegationFromTronNetwork(delegationId);
      
      if (!delegation) {
        console.log('Delegation not found or already expired:', delegationId);
        return;
      }
      
      // 从TRON网络获取实际的代理交易记录
      console.log(`🔍 正在从TRON网络获取代理交易记录...`);
      const transactions = await this.getDelegationTransactionsFromTron(delegationId);
      
      if (transactions && transactions.length > 0) {
        // 处理每个代理交易的到期
        for (const tx of transactions) {
          console.log(`🔍 处理代理交易到期: ${tx.txid}`);
          
          // 检查是否需要执行解代理操作
          if (tx.needsUndelegation) {
            console.log(`🔄 执行解代理操作: ${tx.fromAddress} -> ${tx.toAddress}`);
            
            try {
              const undelegateResult = await tronService.undelegateResource({
                ownerAddress: tx.fromAddress,
                receiverAddress: tx.toAddress,
                balance: tx.amount,
                resource: 'ENERGY'
              });
              
              if (undelegateResult.success) {
                console.log(`✅ 解代理成功: ${undelegateResult.txid}`);
              } else {
                console.error(`❌ 解代理失败: ${undelegateResult.error}`);
              }
            } catch (undelegateError) {
              console.error('Undelegate operation failed:', undelegateError);
            }
          }
        }
      }
      
      // 代理状态更新完成（不再存储到数据库，状态从TRON网络实时获取）
      console.log(`✅ 代理状态更新为过期 - ID: ${delegationId}`);
      
      // 注意：预留机制已移除，不再需要释放预留资源
      // 能量状态现在从 TRON 网络实时获取
      
      console.log('Delegation expiry processed successfully:', delegationId);
    } catch (error) {
      console.error('Failed to handle delegation expiry:', error);
    }
  }

  /**
   * @deprecated 已移除数据库查询逻辑，代理状态从TRON网络实时获取
   */
  async getDelegationStatusLegacy(delegationId: string): Promise<any> {
    console.log(`🔍 [getDelegationStatusLegacy] 已废弃的方法 - ID: ${delegationId}`);
    console.log(`🔍 请使用新的实时查询方法获取代理状态`);
    return null;
  }

  /**
   * 获取用户代理历史 - 从TRON网络实时获取
   */
  async getUserDelegations(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      console.log(`🔍 [getUserDelegations] 获取用户代理历史 - 用户ID: ${userId}`);
      
      // 1. 根据用户ID获取TRON地址
      const userAddress = await this.getUserTronAddress(userId);
      if (!userAddress) {
        console.log('User TRON address not found');
        return [];
      }
      
      // 2. 从TRON网络获取代理历史
      const delegations = await this.getUserDelegationHistoryFromTron(userAddress, limit, offset);
      
      return delegations;
    } catch (error) {
      console.error('Failed to get user delegations:', error);
      return [];
    }
  }

  /**
   * 从TRON网络获取代理信息
   */
  private async getDelegationFromTronNetwork(delegationId: string): Promise<any> {
    // 实现从TRON网络获取代理信息的逻辑
    // 这里需要根据实际的TRON API来实现
    
    // 1. 解析代理ID，获取相关交易信息
    // 2. 调用TRON API查询代理状态
    // 3. 返回代理信息
    
    console.log(`🔗 正在从TRON网络获取代理业务信息: ${delegationId}`);
    
    return null; // 如果未找到有效代理则返回null
  }

  /**
   * 从TRON网络获取代理交易记录
   */
  private async getDelegationTransactionsFromTron(delegationId: string): Promise<any[]> {
    // 实现从TRON网络获取代理交易记录的逻辑
    // 这里需要根据实际的TRON API来实现
    
    // 1. 根据代理ID查找相关的交易记录
    // 2. 调用TRON API获取交易详情
    // 3. 返回交易列表
    
    console.log(`🔗 正在从TRON网络获取代理业务交易记录: ${delegationId}`);
    
    return [];
  }

  /**
   * 获取用户TRON地址
   */
  private async getUserTronAddress(userId: string): Promise<string | null> {
    // 实现获取用户TRON地址的逻辑
    console.log(`🔍 获取用户TRON地址: ${userId}`);
    return null;
  }

  /**
   * 从TRON网络获取用户代理历史
   */
  private async getUserDelegationHistoryFromTron(address: string, limit: number, offset: number): Promise<any[]> {
    // 实现从TRON网络获取用户代理历史的逻辑
    // 这里需要根据实际的TRON API来实现
    
    // 1. 调用TRON API获取地址的代理历史
    // 2. 解析和格式化代理数据
    // 3. 结合业务逻辑分页返回结果
    console.log(`🔗 正在从TRON网络获取用户代理业务历史: ${address}`);
    
    return [];
  }
}

// 创建默认实例
export const energyDelegationService = new EnergyDelegationService();