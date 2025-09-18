import type { FormattedStakeRecord, ServiceResponse } from '../../../types/staking.types';

/**
 * 委托记录处理器
 * 负责处理委托记录的查询和格式化
 */
export class DelegateRecordHandler {
  private tronWeb: any;
  private tronGridProvider: any;

  constructor(tronWeb: any, tronGridProvider: any) {
    this.tronWeb = tronWeb;
    this.tronGridProvider = tronGridProvider;
  }

  /**
   * 转换hex地址为base58地址
   */
  private convertHexToBase58(hexAddress: string): string {
    try {
      if (!hexAddress) {
        console.log('[DelegateRecordHandler] 空地址，返回空字符串');
        return '';
      }
      
      console.log(`[DelegateRecordHandler] 转换地址: ${hexAddress}, 长度: ${hexAddress.length}, 前缀: ${hexAddress.substring(0, 2)}`);
      
      // 如果已经是base58格式，直接返回
      if (hexAddress.startsWith('T') && hexAddress.length === 34) {
        console.log(`[DelegateRecordHandler] 已是base58格式: ${hexAddress}`);
        return hexAddress;
      }
      
      // 如果是hex格式，使用TronWeb转换
      if (hexAddress.startsWith('41') && hexAddress.length === 42) {
        try {
          const base58Address = this.tronWeb.address.fromHex(hexAddress);
          console.log(`[DelegateRecordHandler] hex转base58成功: ${hexAddress} -> ${base58Address}`);
          return base58Address;
        } catch (error) {
          console.warn('[DelegateRecordHandler] TronWeb地址转换失败:', error);
          return hexAddress;
        }
      }
      
      // 处理可能的其他格式
      if (hexAddress.length === 40) {
        // 尝试添加41前缀
        const withPrefix = '41' + hexAddress;
        try {
          const base58Address = this.tronWeb.address.fromHex(withPrefix);
          console.log(`[DelegateRecordHandler] 添加前缀后转换成功: ${withPrefix} -> ${base58Address}`);
          return base58Address;
        } catch (error) {
          console.warn('[DelegateRecordHandler] 添加前缀转换失败:', error);
        }
      }
      
      console.warn(`[DelegateRecordHandler] 未识别的地址格式: ${hexAddress}，长度: ${hexAddress.length}`);
      return hexAddress;
    } catch (error) {
      console.warn('[DelegateRecordHandler] 地址转换失败:', error);
      return hexAddress;
    }
  }

  /**
   * 获取委托交易记录
   * 从TRON网络实时获取委托记录
   */
  async getDelegateTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    try {
      console.log(`[DelegateRecordHandler] 🔍 开始获取委托交易记录: ${address}, limit=${limit}, offset=${offset}`);
      
      // 使用TronGridProvider获取账户交易记录
      const transactionsResult = await this.tronGridProvider.getAccountTransactions(address, limit * 3);
      
      if (!transactionsResult.success || !transactionsResult.data) {
        console.log(`[DelegateRecordHandler] 获取交易记录失败或无数据`);
        return {
          success: true,
          data: []
        };
      }
      
      console.log(`[DelegateRecordHandler] 🔍 检查数据格式:`, {
        dataType: typeof transactionsResult.data,
        isArray: Array.isArray(transactionsResult.data),
        hasLength: transactionsResult.data?.length,
        keys: typeof transactionsResult.data === 'object' && !Array.isArray(transactionsResult.data) ? Object.keys(transactionsResult.data).slice(0, 5) : 'N/A'
      });
      
      // 确保数据是数组格式
      let transactions: any[] = [];
      
      if (Array.isArray(transactionsResult.data)) {
        transactions = transactionsResult.data;
        console.log(`[DelegateRecordHandler] ✅ 数据已是数组格式，数量: ${transactions.length}`);
      } else if (transactionsResult.data && typeof transactionsResult.data === 'object') {
        // 如果返回的是对象格式，尝试转换为数组
        const values = Object.values(transactionsResult.data);
        if (values.length > 0) {
          transactions = values.filter(item => item && typeof item === 'object');
          console.log(`[DelegateRecordHandler] 🔧 转换对象格式为数组格式，原始键数: ${Object.keys(transactionsResult.data).length}, 转换后数组长度: ${transactions.length}`);
        }
      } else {
        console.warn(`[DelegateRecordHandler] ⚠️ 无法处理的数据类型: ${typeof transactionsResult.data}`, transactionsResult.data);
        transactions = [];
      }
      
      console.log(`[DelegateRecordHandler] 最终数据数量: ${transactions.length}`);
      
      // 过滤出委托相关的交易（DelegateResourceContract 和 UnDelegateResourceContract）
      const delegateTransactions = transactions.filter((tx: any) => {
        const contract = tx.raw_data?.contract?.[0];
        return contract?.type === 'DelegateResourceContract' || contract?.type === 'UnDelegateResourceContract';
      });
      
      console.log(`[DelegateRecordHandler] 找到 ${delegateTransactions.length} 条委托相关交易`);
      
      // 🔍 调试：打印前几条交易的原始数据结构
      if (delegateTransactions.length > 0) {
        const firstTx = delegateTransactions[0];
        const contract = firstTx.raw_data?.contract?.[0];
        const parameter = contract?.parameter?.value;
        
        console.log(`[DelegateRecordHandler] 🔍 第一条交易的完整原始数据:`, {
          txID: firstTx.txID?.substring(0, 12),
          contractType: contract?.type,
          parameter: parameter,
          owner_address: parameter?.owner_address,
          receiver_address: parameter?.receiver_address,
          owner_address_type: typeof parameter?.owner_address,
          receiver_address_type: typeof parameter?.receiver_address,
          owner_address_length: parameter?.owner_address?.length,
          receiver_address_length: parameter?.receiver_address?.length
        });
      }
      
      // 转换为标准化格式
      const formattedRecords: FormattedStakeRecord[] = delegateTransactions
        .slice(offset, offset + limit) // 应用分页
        .map((tx: any) => {
          const contract = tx.raw_data?.contract?.[0];
          const parameter = contract?.parameter?.value;
          const isDelegateOperation = contract?.type === 'DelegateResourceContract';
          
          // 转换地址
          console.log(`[DelegateRecordHandler] 🔍 原始地址数据:`, {
            txId: tx.txID?.substring(0, 12),
            owner_address_hex: parameter?.owner_address,
            receiver_address_hex: parameter?.receiver_address
          });
          
          const fromAddress = parameter?.owner_address ? this.convertHexToBase58(parameter.owner_address) : '';
          const toAddress = parameter?.receiver_address ? this.convertHexToBase58(parameter.receiver_address) : '';
          
          console.log(`[DelegateRecordHandler] 🔍 转换后地址:`, {
            fromAddress,
            toAddress,
            fromValid: fromAddress.startsWith('T') && fromAddress.length === 34,
            toValid: toAddress.startsWith('T') && toAddress.length === 34
          });
          
          return {
            id: tx.txID || '',
            operation_type: isDelegateOperation ? 'delegate' : 'undelegate',
            amount: parameter?.balance ? Math.floor(parameter.balance / 1000000) : 0, // 转换SUN到TRX
            resource_type: parameter?.resource === 0 ? 'BANDWIDTH' : 'ENERGY',
            status: tx.ret?.[0]?.contractRet === 'SUCCESS' ? 'success' : 'failed',
            created_at: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : new Date().toISOString(),
            transaction_id: tx.txID || '',
            pool_id: '', // 委托记录不直接关联池ID
            address: address, // 使用查询的地址
            from_address: fromAddress,
            to_address: toAddress,
            block_number: tx.blockNumber || 0,
            fee: tx.fee || 0
          } as FormattedStakeRecord;
        });
      
      console.log(`[DelegateRecordHandler] ✅ 成功格式化 ${formattedRecords.length} 条委托记录`);
      
      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('[DelegateRecordHandler] Failed to get delegate transaction history:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 预留方法：未来可以实现从TRON网络获取实时交易记录
   */
  async getRealTimeDelegateHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    // 这里可以实现从TRON网络API获取实时委托记录的逻辑
    console.log(`[DelegateRecordHandler] 获取实时委托记录功能待实现`);
    
    return {
      success: true,
      data: []
    };
  }
}
