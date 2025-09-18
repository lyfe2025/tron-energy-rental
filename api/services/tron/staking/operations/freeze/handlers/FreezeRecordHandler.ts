import { TronGridProvider } from '../../../providers/TronGridProvider';
import type {
    FormattedStakeRecord,
    ServiceResponse
} from '../../../types/staking.types';

/**
 * 质押记录处理器
 * 负责处理质押记录的获取和格式化
 */
export class FreezeRecordHandler {
  private tronWeb: any;
  private tronGridProvider: TronGridProvider;

  constructor(tronWeb: any, tronGridProvider: TronGridProvider) {
    this.tronWeb = tronWeb;
    this.tronGridProvider = tronGridProvider;
  }

  /**
   * 获取质押相关交易记录
   */
  async getStakeTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    try {
      console.log(`[FreezeRecordHandler] 🔥🔥🔥 开始获取质押交易记录`);
      console.log(`[FreezeRecordHandler] 参数 - 地址: ${address}, 限制: ${limit}, 偏移: ${offset}`);
      
      let transactions: any[] = [];
      
      // 使用TronGrid API获取交易记录
      const transactionsResponse = await this.tronGridProvider.getAccountTransactions(address, limit);
      
      if (transactionsResponse.success && transactionsResponse.data) {
        let allTransactions = transactionsResponse.data;
        
        // ✅ 修复：处理对象格式数据（与TronGridDataFormatter保持一致）
        if (!Array.isArray(allTransactions)) {
          console.warn(`[FreezeRecordHandler] 🔧 API返回对象格式数据，转换为数组:`, typeof allTransactions);
          
          if (allTransactions && typeof allTransactions === 'object') {
            const transactionValues = Object.values(allTransactions);
            console.log(`[FreezeRecordHandler] 转换前对象键数: ${Object.keys(allTransactions).length}`);
            console.log(`[FreezeRecordHandler] 转换后数组长度: ${transactionValues.length}`);
            
            // 确保转换后的数据是有效的交易对象
            allTransactions = transactionValues.filter(tx => 
              tx && typeof tx === 'object' && (tx as any).txID
            );
            console.log(`[FreezeRecordHandler] 过滤后有效交易数量: ${allTransactions.length}`);
          } else {
            console.warn(`[FreezeRecordHandler] ❌ 数据格式不支持:`, typeof allTransactions);
            allTransactions = [];
          }
        }
        
        console.log(`[FreezeRecordHandler] 获取到所有交易: ${allTransactions.length} 条`);
        
        // 写入调试信息
        this.tronGridProvider.writeDebugLog(`=== 开始调试 ${new Date().toISOString()} ===`);
        this.tronGridProvider.writeDebugLog(`地址: ${address}`);
        this.tronGridProvider.writeDebugLog(`总交易数: ${Array.isArray(allTransactions) ? allTransactions.length : 'NOT_ARRAY'}`);
        this.tronGridProvider.writeDebugLog(`数据类型: ${typeof allTransactions}`);
        
        // 只有当allTransactions是数组时才继续处理
        if (Array.isArray(allTransactions)) {
          // 调试：显示前几条交易的类型
          if (allTransactions.length > 0) {
            console.log(`[FreezeRecordHandler] 前5条交易类型:`);
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
          
          console.log(`[FreezeRecordHandler] 第一层筛选 - 使用合约类型: ${stakeContractTypes.join(', ')}`);
          
          const filteredTransactions = this.tronGridProvider.filterTransactionsByType(
            allTransactions, 
            stakeContractTypes
          );
          
          console.log(`[FreezeRecordHandler] 筛选出质押相关交易: ${filteredTransactions.length} 条`);
          
          // 按时间戳降序排序并限制数量
          transactions = filteredTransactions
            .sort((a, b) => (b.block_timestamp || 0) - (a.block_timestamp || 0))
            .slice(0, limit);
            
          console.log(`[FreezeRecordHandler] 最终质押交易数量: ${transactions.length} 条`);
        } else {
          console.warn(`[FreezeRecordHandler] ❌ 无法处理非数组数据，使用空数组`);
          transactions = [];
        }
      } else {
        console.warn('[FreezeRecordHandler] TronGrid API调用失败，尝试回退方法');
        
        // 回退到TronWeb方法
        try {
          console.log('[FreezeRecordHandler] 回退到TronWeb方法');
          // ✅ 修复：明确设置 visible: true 确保地址统一为Base58格式
          transactions = await this.tronWeb.trx.getTransactionsFromAddress(address, limit, offset, { visible: true });
        } catch (tronWebError: any) {
          console.error('[FreezeRecordHandler] TronWeb方法也失败:', tronWebError.message);
          return {
            success: false,
            data: [],
            error: '无法获取质押记录，请检查网络连接或稍后重试'
          };
        }
      }
      
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.log(`[FreezeRecordHandler] 🚨🚨🚨 无有效交易数据`);
        return {
          success: true,
          data: [],
          error: '该地址暂无质押记录'
        };
      }
      
      console.log(`[FreezeRecordHandler] 💫💫💫 开始处理 ${transactions.length} 条交易数据`);
      
      // 筛选和格式化质押交易
      const formattedRecords = this.formatStakeTransactions(transactions, address);

      console.log(`[FreezeRecordHandler] 🎯🎯🎯 格式化完成 - 获取到 ${formattedRecords.length} 条质押交易记录`);
      
      if (formattedRecords.length === 0) {
        console.log(`[FreezeRecordHandler] ⚠️⚠️⚠️ 该地址暂无质押记录`);
        return {
          success: true,
          data: [],
          error: '该地址暂无质押记录'
        };
      }
      
      console.log(`[FreezeRecordHandler] ✅✅✅ 返回真实质押数据 ${formattedRecords.length} 条`);
      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('[FreezeRecordHandler] 获取质押交易记录失败:', error);
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
        console.log(`[FreezeRecordHandler] 处理交易: ${tx.txID.substring(0, 8)}...`);
      }
      
      // 尝试多种方式获取合约类型
      let contractType = null;
      
      // 方式1：从raw_data.contract[0].type获取（TronGrid v1格式）
      if (tx.raw_data?.contract?.[0]?.type) {
        contractType = tx.raw_data.contract[0].type;
        console.log(`[FreezeRecordHandler] 方式1获取合约类型: ${contractType}`);
      }
      // 方式2：从contract_type字段直接获取（TronScan格式）
      else if (tx.contract_type) {
        contractType = tx.contract_type;
        console.log(`[FreezeRecordHandler] 方式2获取合约类型: ${contractType}`);
      }
      // 方式3：从其他可能的路径获取
      else if (tx.contract?.[0]?.type) {
        contractType = tx.contract[0].type;
        console.log(`[FreezeRecordHandler] 方式3获取合约类型: ${contractType}`);
      }
      
      console.log(`[FreezeRecordHandler] 最终获取的合约类型: ${contractType}`);
      
      if (!contractType) {
        console.log(`[FreezeRecordHandler] ❌ 无法获取合约类型，跳过此交易`);
        return false;
      }
      
      // 质押记录只包含纯质押操作
      const stakeContractTypes = [
        'FreezeBalanceV2Contract',    // 质押 V2
        'FreezeBalanceContract'       // 质押 V1（兼容旧版本）
      ];
      
      const isStakeTransaction = stakeContractTypes.includes(contractType);
      
      if (isStakeTransaction) {
        console.log(`[FreezeRecordHandler] ✅ 匹配质押交易: ${contractType}`);
      } else {
        console.log(`[FreezeRecordHandler] ❌ 非质押交易: ${contractType}`);
      }
      
      return isStakeTransaction;
    });

    // 转换为标准格式
    return stakeTransactions.map((tx: any) => {
      console.log(`[FreezeRecordHandler] 开始格式化交易: ${tx.txID?.substring(0, 8)}...`);
      
      // 尝试多种方式获取合约信息
      let contract = null;
      let contractType = null;
      let parameter = null;
      
      // 方式1：从raw_data.contract[0]获取（TronGrid v1格式）
      if (tx.raw_data?.contract?.[0]) {
        contract = tx.raw_data.contract[0];
        contractType = contract.type;
        parameter = contract.parameter?.value;
        console.log(`[FreezeRecordHandler] 方式1获取合约信息: ${contractType}`);
      }
      // 方式2：直接从tx获取（其他格式）
      else if (tx.contract_type) {
        contractType = tx.contract_type;
        parameter = tx.parameter || tx.contract_parameter;
        console.log(`[FreezeRecordHandler] 方式2获取合约信息: ${contractType}`);
      }
      // 方式3：从contract数组获取
      else if (tx.contract?.[0]) {
        contract = tx.contract[0];
        contractType = contract.type;
        parameter = contract.parameter?.value;
        console.log(`[FreezeRecordHandler] 方式3获取合约信息: ${contractType}`);
      }
      
      console.log(`[FreezeRecordHandler] 合约类型: ${contractType}, 参数:`, parameter ? 'exists' : 'null');
      
      // 确定操作类型
      let operationType = 'unknown';
      let resourceType = 'ENERGY';
      let amount = 0;

      switch (contractType) {
        case 'FreezeBalanceV2Contract':
        case 'FreezeBalanceContract':
          operationType = 'freeze';
          // 🔧 修复资源类型解析逻辑：
          // - 如果明确指定了 resource，使用指定的值
          // - 如果 resource 为空/未指定，默认为 BANDWIDTH（符合TRON规则）
          if (parameter?.resource) {
            resourceType = parameter.resource;
          } else {
            resourceType = 'BANDWIDTH'; // TRON默认：未指定resource时为带宽质押
          }
          // 尝试多个可能的金额字段
          amount = parameter?.frozen_balance || 
                   parameter?.frozen_duration || 
                   parameter?.balance || 
                   parameter?.amount || 0;
          console.log(`[FreezeRecordHandler] 质押操作: ${amount} ${resourceType} (原始resource: ${parameter?.resource || '未指定'})`);
          break;
          
        default:
          console.log(`[FreezeRecordHandler] 🚨 未预期的合约类型在质押记录中: ${contractType}`);
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
}
