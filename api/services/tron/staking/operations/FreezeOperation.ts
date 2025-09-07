import { query } from '../../../../database/index';
import { TronGridProvider } from '../providers/TronGridProvider';
import type {
    FormattedStakeRecord,
    FreezeBalanceV2Params,
    FreezeOperationResult,
    OperationParams,
    ServiceResponse,
    StakeOverview,
    StakeTransactionParams
} from '../types/staking.types';

/**
 * 质押操作类
 * 负责处理所有质押相关的操作
 */
export class FreezeOperation {
  private tronWeb: any;
  private tronGridProvider: TronGridProvider;

  constructor(params: OperationParams) {
    this.tronWeb = params.tronWeb;
    this.tronGridProvider = new TronGridProvider(params.networkConfig);
  }

  /**
   * 设置网络配置
   */
  setNetworkConfig(config: any): void {
    this.tronGridProvider.setNetworkConfig(config);
  }

  /**
   * 质押TRX (Stake 2.0)
   */
  async freezeBalanceV2(params: FreezeBalanceV2Params): Promise<FreezeOperationResult> {
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
          netUsed: result.net_used,
          poolId: 1
        };
      } else {
        return {
          success: false,
          error: result.message || 'Freeze transaction failed'
        };
      }
    } catch (error: any) {
      console.error('Failed to freeze balance v2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取账户质押概览
   */
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
      
      // 获取接收到的委托资源（从其他账户委托给自己的资源）
      const receivedEnergyDelegation = parseInt(account.acquired_delegated_frozenV2_balance_for_energy) || 0;
      const receivedBandwidthDelegation = parseInt(account.acquired_delegated_frozenV2_balance_for_bandwidth) || 0;
      
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

      // 计算质押获得的资源（自己质押获得的资源）
      const actualEnergyFromStaking = Math.max(0, totalStakedEnergy);
      const actualBandwidthFromStaking = Math.max(0, totalStakedBandwidth);

      // 调试日志
      console.log(`[FreezeOperation] 获取质押概览 - 地址: ${address}`);
      console.log(`[FreezeOperation] 原始数据 - 质押能量: ${totalStakedEnergy}, 质押带宽: ${totalStakedBandwidth}`);
      console.log(`[FreezeOperation] 原始数据 - 委托给他人能量: ${delegatedResources}, 委托给他人带宽: ${delegatedBandwidth}`);
      console.log(`[FreezeOperation] 原始数据 - 接收委托能量: ${receivedEnergyDelegation}, 接收委托带宽: ${receivedBandwidthDelegation}`);
      console.log(`[FreezeOperation] 原始数据 - 待解质押: ${pendingUnfreeze}, 可提取: ${withdrawableAmount}`);

      return {
        success: true,
        data: {
          // 新的9个统计字段
          totalStakedTrx: (totalStakedEnergy + totalStakedBandwidth) / SUN_TO_TRX,
          unlockingTrx: pendingUnfreeze / SUN_TO_TRX,
          withdrawableTrx: withdrawableAmount / SUN_TO_TRX,
          stakedEnergy: actualEnergyFromStaking,
          delegatedToOthersEnergy: delegatedResources,
          delegatedToSelfEnergy: receivedEnergyDelegation,
          stakedBandwidth: actualBandwidthFromStaking,
          delegatedToOthersBandwidth: delegatedBandwidth,
          delegatedToSelfBandwidth: receivedBandwidthDelegation,
          
          // 保留原有字段以保持向后兼容性
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
    } catch (error: any) {
      console.error('Failed to get stake overview:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取质押相关交易记录 (从TRON网络)
   */
  async getStakeTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    try {
      console.log(`[FreezeOperation] 🔥🔥🔥 开始获取质押交易记录`);
      console.log(`[FreezeOperation] 参数 - 地址: ${address}, 限制: ${limit}, 偏移: ${offset}`);
      
      let transactions: any[] = [];
      
      // 使用TronGrid API获取交易记录
      const transactionsResponse = await this.tronGridProvider.getAccountTransactions(address, limit);
      
      if (transactionsResponse.success && transactionsResponse.data) {
        const allTransactions = transactionsResponse.data;
        console.log(`[FreezeOperation] 获取到所有交易: ${allTransactions.length} 条`);
        
        // 写入调试信息
        this.tronGridProvider.writeDebugLog(`=== 开始调试 ${new Date().toISOString()} ===`);
        this.tronGridProvider.writeDebugLog(`地址: ${address}`);
        this.tronGridProvider.writeDebugLog(`总交易数: ${allTransactions.length}`);
        
        // 调试：显示前几条交易的类型
        if (allTransactions.length > 0) {
          console.log(`[FreezeOperation] 前5条交易类型:`);
          allTransactions.slice(0, 5).forEach((tx: any, index: number) => {
            const contractType = tx.raw_data?.contract?.[0]?.type;
            console.log(`  ${index + 1}. ${contractType} - TxID: ${tx.txID?.substring(0, 12)}...`);
          });
        }
        
        // 客户端筛选纯质押相关交易（排除委托操作）
        const stakeContractTypes = [
          'FreezeBalanceV2Contract',
          'FreezeBalanceContract'
        ];
        
        console.log(`[FreezeOperation] 第一层筛选 - 使用合约类型: ${stakeContractTypes.join(', ')}`);
        
        const filteredTransactions = this.tronGridProvider.filterTransactionsByType(
          allTransactions, 
          stakeContractTypes
        );
        
        console.log(`[FreezeOperation] 筛选出质押相关交易: ${filteredTransactions.length} 条`);
        
        // 按时间戳降序排序并限制数量
        transactions = filteredTransactions
          .sort((a, b) => (b.block_timestamp || 0) - (a.block_timestamp || 0))
          .slice(0, limit);
          
        console.log(`[FreezeOperation] 最终质押交易数量: ${transactions.length} 条`);
      } else {
        console.warn('[FreezeOperation] TronGrid API调用失败，尝试回退方法');
        
        // 回退到TronWeb方法
        try {
          console.log('[FreezeOperation] 回退到TronWeb方法');
          transactions = await this.tronWeb.trx.getTransactionsFromAddress(address, limit, offset);
        } catch (tronWebError: any) {
          console.error('[FreezeOperation] TronWeb方法也失败:', tronWebError.message);
          return {
            success: false,
            data: [],
            error: '无法获取质押记录，请检查网络连接或稍后重试'
          };
        }
      }
      
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.log(`[FreezeOperation] 🚨🚨🚨 无有效交易数据`);
        return {
          success: true,
          data: [],
          error: '该地址暂无质押记录'
        };
      }
      
      console.log(`[FreezeOperation] 💫💫💫 开始处理 ${transactions.length} 条交易数据`);
      
      // 筛选和格式化质押交易
      const formattedRecords = this.formatStakeTransactions(transactions, address);

      console.log(`[FreezeOperation] 🎯🎯🎯 格式化完成 - 获取到 ${formattedRecords.length} 条质押交易记录`);
      
      if (formattedRecords.length === 0) {
        console.log(`[FreezeOperation] ⚠️⚠️⚠️ 该地址暂无质押记录`);
        return {
          success: true,
          data: [],
          error: '该地址暂无质押记录'
        };
      }
      
      console.log(`[FreezeOperation] ✅✅✅ 返回真实质押数据 ${formattedRecords.length} 条`);
      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('获取质押交易记录失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 格式化质押交易记录
   */
  private formatStakeTransactions(transactions: any[], address: string): FormattedStakeRecord[] {
    const stakeTransactions = transactions.filter((tx: any) => {
      // 打印交易的基本信息用于调试
      if (tx.txID) {
        console.log(`[FreezeOperation] 处理交易: ${tx.txID.substring(0, 8)}...`);
      }
      
      // 尝试多种方式获取合约类型
      let contractType = null;
      
      // 方式1：从raw_data.contract[0].type获取（TronGrid v1格式）
      if (tx.raw_data?.contract?.[0]?.type) {
        contractType = tx.raw_data.contract[0].type;
        console.log(`[FreezeOperation] 方式1获取合约类型: ${contractType}`);
      }
      // 方式2：从contract_type字段直接获取（TronScan格式）
      else if (tx.contract_type) {
        contractType = tx.contract_type;
        console.log(`[FreezeOperation] 方式2获取合约类型: ${contractType}`);
      }
      // 方式3：从其他可能的路径获取
      else if (tx.contract?.[0]?.type) {
        contractType = tx.contract[0].type;
        console.log(`[FreezeOperation] 方式3获取合约类型: ${contractType}`);
      }
      
      console.log(`[FreezeOperation] 最终获取的合约类型: ${contractType}`);
      
      if (!contractType) {
        console.log(`[FreezeOperation] ❌ 无法获取合约类型，跳过此交易`);
        return false;
      }
      
      // 质押记录只包含纯质押操作
      const stakeContractTypes = [
        'FreezeBalanceV2Contract',    // 质押 V2
        'FreezeBalanceContract'       // 质押 V1（兼容旧版本）
      ];
      
      const isStakeTransaction = stakeContractTypes.includes(contractType);
      
      if (isStakeTransaction) {
        console.log(`[FreezeOperation] ✅ 匹配质押交易: ${contractType}`);
      } else {
        console.log(`[FreezeOperation] ❌ 非质押交易: ${contractType}`);
      }
      
      return isStakeTransaction;
    });

    // 转换为标准格式
    return stakeTransactions.map((tx: any) => {
      console.log(`[FreezeOperation] 开始格式化交易: ${tx.txID?.substring(0, 8)}...`);
      
      // 尝试多种方式获取合约信息
      let contract = null;
      let contractType = null;
      let parameter = null;
      
      // 方式1：从raw_data.contract[0]获取（TronGrid v1格式）
      if (tx.raw_data?.contract?.[0]) {
        contract = tx.raw_data.contract[0];
        contractType = contract.type;
        parameter = contract.parameter?.value;
        console.log(`[FreezeOperation] 方式1获取合约信息: ${contractType}`);
      }
      // 方式2：直接从tx获取（其他格式）
      else if (tx.contract_type) {
        contractType = tx.contract_type;
        parameter = tx.parameter || tx.contract_parameter;
        console.log(`[FreezeOperation] 方式2获取合约信息: ${contractType}`);
      }
      // 方式3：从contract数组获取
      else if (tx.contract?.[0]) {
        contract = tx.contract[0];
        contractType = contract.type;
        parameter = contract.parameter?.value;
        console.log(`[FreezeOperation] 方式3获取合约信息: ${contractType}`);
      }
      
      console.log(`[FreezeOperation] 合约类型: ${contractType}, 参数:`, parameter ? 'exists' : 'null');
      
      // 确定操作类型
      let operationType = 'unknown';
      let resourceType = 'ENERGY';
      let amount = 0;

      switch (contractType) {
        case 'FreezeBalanceV2Contract':
        case 'FreezeBalanceContract':
          operationType = 'freeze';
          resourceType = parameter?.resource || 'ENERGY';
          // 尝试多个可能的金额字段
          amount = parameter?.frozen_balance || 
                   parameter?.frozen_duration || 
                   parameter?.balance || 
                   parameter?.amount || 0;
          console.log(`[FreezeOperation] 质押操作: ${amount} ${resourceType}`);
          break;
          
        default:
          console.log(`[FreezeOperation] 🚨 未预期的合约类型在质押记录中: ${contractType}`);
          operationType = 'unknown';
          break;
      }

      return {
        id: tx.txID,
        transaction_id: tx.txID,
        pool_id: address,
        address: address,
        amount: amount / 1000000, // 转换为TRX
        resource_type: resourceType as 'ENERGY' | 'BANDWIDTH',
        operation_type: operationType as 'freeze' | 'unfreeze' | 'delegate' | 'undelegate' | 'withdraw',
        status: tx.ret?.[0]?.contractRet === 'SUCCESS' ? 'success' : 'failed',
        created_at: new Date(tx.block_timestamp || tx.raw_data?.timestamp).toISOString(),
        block_number: tx.blockNumber,
        to_address: '',
        fee: tx.ret?.[0]?.fee || 0
      } as FormattedStakeRecord;
    });
  }

  /**
   * 记录质押相关交易到数据库
   */
  private async recordStakeTransaction(params: StakeTransactionParams): Promise<{ success: boolean; error?: string }> {
    try {
      if (params.operationType === 'freeze') {
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
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Record stake transaction error:', error);
      return { success: false, error: error.message };
    }
  }
}
