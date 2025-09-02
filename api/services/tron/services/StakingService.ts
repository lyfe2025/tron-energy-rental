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
      
      // 获取质押信息
      const frozenV2 = account.frozenV2 || [];
      const totalStakedEnergy = frozenV2
        .filter((f: any) => f.type === 'ENERGY')
        .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
      const totalStakedBandwidth = frozenV2
        .filter((f: any) => f.type === 'BANDWIDTH')
        .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
      
      // 获取委托信息
      const delegatedResources = account.delegated_frozenV2_balance_for_energy || 0;
      const delegatedBandwidth = account.delegated_frozenV2_balance_for_bandwidth || 0;
      
      // 获取待解质押信息
      const unfrozenV2 = account.unfrozenV2 || [];
      const pendingUnfreeze = unfrozenV2
        .filter((u: any) => u.unfreeze_expire_time > Date.now())
        .reduce((sum: number, u: any) => sum + (u.unfreeze_amount || 0), 0);
      
      // 获取可提取金额
      const withdrawableAmount = unfrozenV2
        .filter((u: any) => u.unfreeze_expire_time <= Date.now())
        .reduce((sum: number, u: any) => sum + (u.unfreeze_amount || 0), 0);

      return {
        success: true,
        data: {
          totalStaked: totalStakedEnergy + totalStakedBandwidth,
          totalDelegated: delegatedResources + delegatedBandwidth,
          availableEnergy: (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0),
          availableBandwidth: (resources.NetLimit || 0) - (resources.NetUsed || 0),
          pendingUnfreeze,
          withdrawableAmount
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
