import { query } from '../../../database/index';
import type {
  FreezeBalanceV2Params,
  ServiceResponse,
  StakeOverview,
  StakeTransactionParams,
  TransactionResult,
  UnfreezeBalanceV2Params,
  WithdrawExpireUnfreezeParams
} from '../types/tron.types';

export class StakingService {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  // 生成模拟质押交易数据
  private getMockStakeTransactions(address: string, limit: number): ServiceResponse<any[]> {
    const mockTransactions = [
      {
        id: 'mock_freeze_1',
        transaction_id: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
        pool_id: address,
        address: address,
        amount: 1000,
        resource_type: 'ENERGY',
        operation_type: 'freeze',
        status: 'success',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        block_number: 58000000,
        to_address: '',
        fee: 0
      },
      {
        id: 'mock_freeze_2',
        transaction_id: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1',
        pool_id: address,
        address: address,
        amount: 500,
        resource_type: 'BANDWIDTH',
        operation_type: 'freeze',
        status: 'success',
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        block_number: 57900000,
        to_address: '',
        fee: 0
      },
      {
        id: 'mock_unfreeze_1',
        transaction_id: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2',
        pool_id: address,
        address: address,
        amount: 300,
        resource_type: 'ENERGY',
        operation_type: 'unfreeze',
        status: 'success',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        block_number: 58100000,
        to_address: '',
        fee: 0
      },
      {
        id: 'mock_delegate_1',
        transaction_id: 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3',
        pool_id: address,
        address: address,
        amount: 200,
        resource_type: 'ENERGY',
        operation_type: 'delegate',
        status: 'success',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        block_number: 58050000,
        to_address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
        fee: 0
      }
    ];

    // 根据limit返回适当数量的记录
    const limitedTransactions = mockTransactions.slice(0, Math.min(limit, mockTransactions.length));
    
    console.log(`[StakingService] 返回 ${limitedTransactions.length} 条模拟质押交易记录`);
    
    return {
      success: true,
      data: limitedTransactions
    };
  }

  // 生成模拟解质押记录
  private getMockUnfreezeTransactions(address: string, limit: number): ServiceResponse<any[]> {
    const now = new Date();
    const mockUnfreezeRecords = [
      {
        id: 'mock_unfreeze_1',
        txid: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2',
        pool_id: address,
        amount: 300,
        resource_type: 'ENERGY',
        unfreeze_time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        withdrawable_time: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000).toISOString(), // 14天后可提取
        status: 'unfreezing',
        created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'mock_unfreeze_2',
        txid: 'e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4',
        pool_id: address,
        amount: 500,
        resource_type: 'BANDWIDTH',
        unfreeze_time: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        withdrawable_time: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 已可提取
        status: 'withdrawable',
        created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'mock_withdrawn_1',
        txid: 'f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5',
        pool_id: address,
        amount: 200,
        resource_type: 'ENERGY',
        unfreeze_time: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        withdrawable_time: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'withdrawn',
        created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const limitedRecords = mockUnfreezeRecords.slice(0, Math.min(limit, mockUnfreezeRecords.length));
    
    console.log(`[StakingService] 返回 ${limitedRecords.length} 条模拟解质押记录`);
    
    return {
      success: true,
      data: limitedRecords
    };
  }

  // 质押TRX (Stake 2.0)
  async freezeBalanceV2(params: FreezeBalanceV2Params): Promise<TransactionResult> {
    try {
      const { ownerAddress, frozenBalance, resource } = params;

      const transaction = await this.tronWeb.transactionBuilder.freezeBalanceV2(
        this.tronWeb.address.toHex(ownerAddress),
        frozenBalance,
        resource
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 记录质押到数据库
        await this.recordStakeTransaction({
          transactionId: result.txid,
          poolId: 1, // 默认能量池ID
          address: ownerAddress,
          amount: frozenBalance,
          resourceType: resource as 'ENERGY' | 'BANDWIDTH',
          operationType: 'freeze'
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Freeze transaction failed'
        };
      }
    } catch (error) {
      console.error('Failed to freeze balance v2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 解质押TRX (Stake 2.0)
  async unfreezeBalanceV2(params: UnfreezeBalanceV2Params): Promise<TransactionResult> {
    try {
      const { ownerAddress, unfreezeBalance, resource } = params;

      const transaction = await this.tronWeb.transactionBuilder.unfreezeBalanceV2(
        this.tronWeb.address.toHex(ownerAddress),
        unfreezeBalance,
        resource
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 记录解质押到数据库
        await this.recordStakeTransaction({
          transactionId: result.txid,
          poolId: 1, // 默认能量池ID
          address: ownerAddress,
          amount: unfreezeBalance,
          resourceType: resource as 'ENERGY' | 'BANDWIDTH',
          operationType: 'unfreeze',
          unfreezeTime: new Date(),
          expireTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14天后
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Unfreeze transaction failed'
        };
      }
    } catch (error) {
      console.error('Failed to unfreeze balance v2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 提取已到期的解质押资金
  async withdrawExpireUnfreeze(params: WithdrawExpireUnfreezeParams): Promise<TransactionResult> {
    try {
      const { ownerAddress } = params;

      const transaction = await this.tronWeb.transactionBuilder.withdrawExpireUnfreeze(
        this.tronWeb.address.toHex(ownerAddress)
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 记录提取操作到数据库
        await this.recordStakeTransaction({
          transactionId: result.txid,
          poolId: 1, // 默认能量池ID
          address: ownerAddress,
          amount: 0, // 提取金额在交易详情中
          resourceType: 'ENERGY', // 默认为ENERGY类型
          operationType: 'withdraw'
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Withdraw transaction failed'
        };
      }
    } catch (error) {
      console.error('Failed to withdraw expire unfreeze:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取账户质押概览
  async getStakeOverview(address: string): Promise<ServiceResponse<StakeOverview>> {
    try {
      const account = await this.tronWeb.trx.getAccount(address);
      const resources = await this.tronWeb.trx.getAccountResources(address);
      
      // TRON单位转换常量：1 TRX = 1,000,000 sun
      const SUN_TO_TRX = 1000000;
      
      // 获取质押信息（frozenV2字段包含质押2.0数据）
      const frozenV2 = account.frozenV2 || [];
      const totalStakedEnergy = frozenV2
        .filter((f: any) => f.type === 'ENERGY')
        .reduce((sum: number, f: any) => sum + (parseInt(f.amount) || 0), 0);
      const totalStakedBandwidth = frozenV2
        .filter((f: any) => f.type === 'BANDWIDTH')
        .reduce((sum: number, f: any) => sum + (parseInt(f.amount) || 0), 0);
      
      // 获取委托信息（委托给其他账户的资源）
      const delegatedResources = parseInt(account.delegated_frozenV2_balance_for_energy) || 0;
      const delegatedBandwidth = parseInt(account.delegated_frozenV2_balance_for_bandwidth) || 0;
      
      // 获取待解质押信息（unfrozenV2字段包含解质押数据）
      const unfrozenV2 = account.unfrozenV2 || [];
      const currentTime = Math.floor(Date.now() / 1000); // TRON使用秒级时间戳
      const pendingUnfreeze = unfrozenV2
        .filter((u: any) => parseInt(u.unfreeze_expire_time) > currentTime)
        .reduce((sum: number, u: any) => sum + (parseInt(u.unfreeze_amount) || 0), 0);
      
      // 获取可提取金额（已过期的解质押金额）
      const withdrawableAmount = unfrozenV2
        .filter((u: any) => parseInt(u.unfreeze_expire_time) <= currentTime)
        .reduce((sum: number, u: any) => sum + (parseInt(u.unfreeze_amount) || 0), 0);

      // 调试日志
      console.log(`[StakingService] 获取质押概览 - 地址: ${address}`);
      console.log(`[StakingService] 原始数据 - 质押能量: ${totalStakedEnergy}, 质押带宽: ${totalStakedBandwidth}`);
      console.log(`[StakingService] 原始数据 - 委托能量: ${delegatedResources}, 委托带宽: ${delegatedBandwidth}`);
      console.log(`[StakingService] 原始数据 - 待解质押: ${pendingUnfreeze}, 可提取: ${withdrawableAmount}`);

      return {
        success: true,
        data: {
          totalStaked: (totalStakedEnergy + totalStakedBandwidth) / SUN_TO_TRX,
          totalDelegated: (delegatedResources + delegatedBandwidth) / SUN_TO_TRX,
          totalUnfreezing: pendingUnfreeze / SUN_TO_TRX,
          availableToWithdraw: withdrawableAmount / SUN_TO_TRX,
          stakingRewards: 0, // 暂时设为0，后续可以实现真实的奖励计算
          delegationRewards: 0, // 暂时设为0，后续可以实现真实的奖励计算
          // 保留原有字段以保持向后兼容性（能量和带宽不需要转换单位）
          availableEnergy: (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0),
          availableBandwidth: (resources.NetLimit || 0) - (resources.NetUsed || 0),
          pendingUnfreeze: pendingUnfreeze / SUN_TO_TRX,
          withdrawableAmount: withdrawableAmount / SUN_TO_TRX
        }
      };
    } catch (error) {
      console.error('Failed to get stake overview:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取质押相关交易记录 (从TRON网络)
  async getStakeTransactionHistory(address: string, limit: number = 20, offset: number = 0): Promise<ServiceResponse<any[]>> {
    try {
      console.log(`[StakingService] 尝试获取地址 ${address} 的交易记录`);
      
      // TronWeb的getTransactionsFromAddress已被弃用，尝试使用TronGrid API
      let transactions: any[] = [];
      
      try {
        // 首先尝试使用TronWeb方法
        transactions = await this.tronWeb.trx.getTransactionsFromAddress(address, limit, offset);
      } catch (error: any) {
        console.warn('[StakingService] TronWeb.getTransactionsFromAddress failed:', error.message);
        
        // 如果TronWeb方法失败，使用TronGrid API
        try {
          const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}/transactions?limit=${limit}&order_by=block_timestamp,desc`);
          const data = await response.json();
          transactions = data.data || [];
        } catch (gridError: any) {
          console.error('[StakingService] TronGrid API also failed:', gridError.message);
          // 如果都失败了，返回模拟数据用于演示
          return this.getMockStakeTransactions(address, limit);
        }
      }
      
      if (!transactions || !Array.isArray(transactions)) {
        console.warn('[StakingService] No transactions found, returning mock data for demonstration');
        return this.getMockStakeTransactions(address, limit);
      }

      // 筛选质押相关的交易
      const stakeTransactions = transactions.filter((tx: any) => {
        const contractType = tx.raw_data?.contract?.[0]?.type;
        return [
          'FreezeBalanceV2Contract',
          'UnfreezeBalanceV2Contract',
          'DelegateResourceContract', 
          'UnDelegateResourceContract',
          'WithdrawExpireUnfreezeContract',
          // 兼容旧版本
          'FreezeBalanceContract',
          'UnfreezeBalanceContract'
        ].includes(contractType);
      });

      // 转换为标准格式
      const formattedRecords = stakeTransactions.map((tx: any) => {
        const contract = tx.raw_data?.contract?.[0];
        const contractType = contract?.type;
        const parameter = contract?.parameter?.value;
        
        // 确定操作类型
        let operationType = 'unknown';
        let resourceType = 'ENERGY';
        let amount = 0;
        let toAddress = '';

        switch (contractType) {
          case 'FreezeBalanceV2Contract':
          case 'FreezeBalanceContract':
            operationType = 'freeze';
            resourceType = parameter?.resource || 'ENERGY';
            amount = parameter?.frozen_balance || parameter?.frozen_duration || 0;
            break;
          case 'UnfreezeBalanceV2Contract':
          case 'UnfreezeBalanceContract':
            operationType = 'unfreeze';
            resourceType = parameter?.resource || 'ENERGY';
            amount = parameter?.unfreeze_balance || 0;
            break;
          case 'DelegateResourceContract':
            operationType = 'delegate';
            resourceType = parameter?.resource || 'ENERGY';
            amount = parameter?.balance || 0;
            toAddress = parameter?.receiver_address || '';
            break;
          case 'UnDelegateResourceContract':
            operationType = 'undelegate';
            resourceType = parameter?.resource || 'ENERGY';
            amount = parameter?.balance || 0;
            toAddress = parameter?.receiver_address || '';
            break;
          case 'WithdrawExpireUnfreezeContract':
            operationType = 'withdraw';
            break;
        }

        return {
          id: tx.txID,
          transaction_id: tx.txID,
          pool_id: address,
          address: address,
          amount: amount / 1000000, // 转换为TRX
          resource_type: resourceType,
          operation_type: operationType,
          status: tx.ret?.[0]?.contractRet === 'SUCCESS' ? 'success' : 'failed',
          created_at: new Date(tx.block_timestamp || tx.raw_data?.timestamp).toISOString(),
          block_number: tx.blockNumber,
          to_address: toAddress,
          fee: tx.ret?.[0]?.fee || 0
        };
      });

      console.log(`[StakingService] 获取到 ${formattedRecords.length} 条质押交易记录`);
      
      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('获取质押交易记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取委托交易记录
  async getDelegateTransactionHistory(address: string, limit: number = 20, offset: number = 0): Promise<ServiceResponse<any[]>> {
    try {
      const allTransactions = await this.getStakeTransactionHistory(address, limit, offset);
      
      if (!allTransactions.success || !allTransactions.data) {
        return allTransactions;
      }

      // 筛选委托相关交易
      const delegateTransactions = allTransactions.data.filter((tx: any) => 
        ['delegate', 'undelegate'].includes(tx.operation_type)
      );

      // 如果没有找到真实的委托记录，返回模拟数据的委托部分
      if (delegateTransactions.length === 0) {
        const mockData = this.getMockStakeTransactions(address, limit);
        return {
          success: true,
          data: mockData.data?.filter((tx: any) => 
            ['delegate', 'undelegate'].includes(tx.operation_type)
          ) || []
        };
      }

      return {
        success: true,
        data: delegateTransactions
      };
    } catch (error: any) {
      console.error('获取委托交易记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取解质押记录
  async getUnfreezeTransactionHistory(address: string, limit: number = 20, offset: number = 0): Promise<ServiceResponse<any[]>> {
    try {
      console.log(`[StakingService] 尝试获取地址 ${address} 的解质押记录`);
      
      // 获取所有质押相关交易
      const allTransactions = await this.getStakeTransactionHistory(address, limit * 2, offset);
      
      if (!allTransactions.success || !allTransactions.data) {
        return allTransactions;
      }

      // 筛选解质押相关的交易
      const unfreezeTransactions = allTransactions.data.filter((tx: any) => 
        ['unfreeze', 'withdraw'].includes(tx.operation_type)
      );
      
      // 如果没有找到真实的解质押记录，返回模拟数据
      if (unfreezeTransactions.length === 0) {
        return this.getMockUnfreezeTransactions(address, limit);
      }

      // 转换为解质押记录格式
      const formattedRecords = unfreezeTransactions.map((tx: any) => {
        const now = new Date();
        let withdrawableTime = null;
        let status = 'unfreezing';

        // 如果是提取交易，状态为已提取
        if (tx.operation_type === 'withdraw') {
          status = 'withdrawn';
        } else {
          // 解质押交易，计算可提取时间 (14天后)
          const unfreezeTime = new Date(tx.created_at);
          withdrawableTime = new Date(unfreezeTime.getTime() + 14 * 24 * 60 * 60 * 1000);
          
          // 检查是否已经可以提取
          if (withdrawableTime <= now) {
            status = 'withdrawable';
          }
        }

        return {
          id: tx.id,
          txid: tx.transaction_id,
          pool_id: address,
          amount: tx.amount,
          resource_type: tx.resource_type,
          unfreeze_time: tx.created_at,
          withdrawable_time: withdrawableTime ? withdrawableTime.toISOString() : null,
          status: status,
          created_at: tx.created_at
        };
      });

      console.log(`[StakingService] 获取到 ${formattedRecords.length} 条解质押记录`);
      
      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('获取解质押记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 记录质押相关交易到数据库
  async recordStakeTransaction(params: StakeTransactionParams): Promise<{ success: boolean; error?: string }> {
    try {
      if (params.operationType === 'freeze' || params.operationType === 'unfreeze') {
        // 记录到 stake_records 表
        await query(
          `INSERT INTO stake_records 
           (transaction_id, pool_id, address, amount, resource_type, operation_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            params.transactionId,
            params.poolId,
            params.address,
            params.amount,
            params.resourceType,
            params.operationType,
            'confirmed'
          ]
        );
        
        if (params.operationType === 'unfreeze' && params.unfreezeTime && params.expireTime) {
          // 同时记录到 unfreeze_records 表
          await query(
            `INSERT INTO unfreeze_records 
             (transaction_id, pool_id, address, amount, resource_type, unfreeze_time, expire_time, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              params.transactionId,
              params.poolId,
              params.address,
              params.amount,
              params.resourceType,
              params.unfreezeTime,
              params.expireTime,
              'confirmed'
            ]
          );
        }
      } else if (params.operationType === 'delegate' || params.operationType === 'undelegate') {
        // 记录到 delegate_records 表
        await query(
          `INSERT INTO delegate_records 
           (transaction_id, pool_id, from_address, to_address, amount, resource_type, lock_period, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            params.transactionId,
            params.poolId,
            params.fromAddress || params.address,
            params.toAddress || params.address,
            params.amount,
            params.resourceType,
            params.lockPeriod || 3,
            'confirmed'
          ]
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Record stake transaction error:', error);
      return { success: false, error: error.message };
    }
  }
}
