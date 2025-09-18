import { TronGridProvider } from '../../../providers/TronGridProvider';
import type {
  FormattedStakeRecord,
  ServiceResponse
} from '../../../types/staking.types';
import { DelegateCalculator } from '../utils/DelegateCalculator';

/**
 * 委托记录处理器
 * 负责处理委托记录的获取和格式化
 */
export class DelegateRecordHandler {
  private tronWeb: any;
  private tronGridProvider: TronGridProvider;
  private calculator: DelegateCalculator;

  constructor(tronWeb: any, tronGridProvider: TronGridProvider) {
    this.tronWeb = tronWeb;
    this.tronGridProvider = tronGridProvider;
    this.calculator = new DelegateCalculator(tronWeb);
  }

  /**
   * 获取代理交易记录
   */
  async getDelegateTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    try {
      console.log(`[DelegateRecordHandler] 尝试获取地址 ${address} 的代理交易记录`);
      
      let outgoingTransactions: any[] = [];
      let incomingTransactions: any[] = [];
      
      // 1. 获取发起方交易（当前账户代理给别人）
      const outgoingResponse = await this.tronGridProvider.getAccountTransactions(address, limit);
      
      if (outgoingResponse.success && outgoingResponse.data) {
        const allTransactions = outgoingResponse.data;
        console.log(`[DelegateRecordHandler] 获取到发起方交易: ${allTransactions.length} 条`);
        
        // 客户端筛选代理相关交易
        const delegateContractTypes = [
          'DelegateResourceContract',
          'UnDelegateResourceContract'
        ];
        
        const filteredTransactions = this.tronGridProvider.filterTransactionsByType(
          allTransactions, 
          delegateContractTypes
        );
        
        console.log(`[DelegateRecordHandler] 筛选出发起方代理交易: ${filteredTransactions.length} 条`);
        outgoingTransactions = filteredTransactions;
      }

      // 2. 尝试获取接收方交易（别人代理给当前账户）
      console.log(`[DelegateRecordHandler] 🔍 尝试通过搜索获取接收方代理记录...`);
      try {
        const incomingResponse = await this.getIncomingDelegateTransactions(address, limit);
        if (incomingResponse.success && incomingResponse.data) {
          incomingTransactions = incomingResponse.data;
          console.log(`[DelegateRecordHandler] 获取到接收方交易: ${incomingTransactions.length} 条`);
        }
      } catch (error) {
        console.warn('[DelegateRecordHandler] 获取接收方交易失败，将显示空记录:', error);
        incomingTransactions = [];
      }

      // 3. 合并所有交易记录
      const allTransactions = [...outgoingTransactions, ...incomingTransactions];
      
      if (allTransactions.length === 0) {
        console.log('[DelegateRecordHandler] 未找到任何代理记录');
        return {
          success: true,
          data: [],
          error: '该地址暂无代理记录'
        };
      }

      // 按时间戳降序排序并限制数量
      const sortedTransactions = allTransactions
        .sort((a, b) => (b.block_timestamp || 0) - (a.block_timestamp || 0))
        .slice(0, limit);

      // 转换为标准格式
      const formattedRecords = this.formatDelegateTransactions(sortedTransactions, address);

      console.log(`[DelegateRecordHandler] 成功格式化 ${formattedRecords.length} 条代理交易记录`);

      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('[DelegateRecordHandler] 获取代理交易记录失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 获取接收方代理交易（别人代理给当前账户的交易）
   */
  private async getIncomingDelegateTransactions(
    address: string, 
    limit: number = 20
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log(`[DelegateRecordHandler] 搜索代理给 ${address} 的交易`);

      // 使用TronGrid的搜索API来查找代理给当前地址的交易
      // 这里使用更广泛的搜索，然后过滤出相关交易
      const searchResponse = await this.tronGridProvider.searchDelegateTransactionsByReceiver(address, limit);
      
      if (!searchResponse.success) {
        console.warn('[DelegateRecordHandler] 搜索接收方交易失败:', searchResponse.error);
        return {
          success: true,
          data: []
        };
      }

      const transactions = searchResponse.data || [];
      console.log(`[DelegateRecordHandler] 搜索到 ${transactions.length} 条可能的接收方交易`);

      // 过滤出真正的代理交易
      const delegateTransactions = transactions.filter((tx: any) => {
        const contract = tx.raw_data?.contract?.[0];
        const contractType = contract?.type;
        const parameter = contract?.parameter?.value;
        
        // 检查是否是代理合约且接收方是当前地址
        if (contractType === 'DelegateResourceContract' || contractType === 'UnDelegateResourceContract') {
          const receiverAddress = this.calculator.convertToBase58Address(parameter?.receiver_address || '');
          return receiverAddress.toLowerCase() === address.toLowerCase();
        }
        
        return false;
      });

      console.log(`[DelegateRecordHandler] 过滤后得到 ${delegateTransactions.length} 条接收方代理交易`);

      return {
        success: true,
        data: delegateTransactions
      };
    } catch (error: any) {
      console.error('[DelegateRecordHandler] 获取接收方代理交易失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 格式化代理交易记录
   */
  private formatDelegateTransactions(transactions: any[], address: string): FormattedStakeRecord[] {
    console.log(`[DelegateRecordHandler] 🚀 开始格式化 ${transactions.length} 条代理交易`);
    
    return transactions.map((tx: any) => {
      console.log(`[DelegateRecordHandler] 🔍 处理交易: ${tx.txID?.substring(0, 12)}...`);
      const contract = tx.raw_data?.contract?.[0];
      const contractType = contract?.type;
      const parameter = contract?.parameter?.value;
      console.log(`[DelegateRecordHandler] 📋 合约类型: ${contractType}`);
      
      // 确定操作类型
      let operationType = 'unknown';
      let resourceType = 'ENERGY';
      let amount = 0;
      let toAddress = '';
      let fromAddress = '';

      // 获取交易地址
      console.log(`[DelegateRecordHandler] 🔍 解析交易地址，parameter:`, JSON.stringify(parameter, null, 2));
      console.log(`[DelegateRecordHandler] 📋 完整交易对象:`, JSON.stringify(tx, null, 2).substring(0, 500) + '...');
      const { ownerAddress, receiverAddress } = this.calculator.extractTransactionAddresses(parameter);
      console.log(`[DelegateRecordHandler] 📍 解析结果: ownerAddress=${ownerAddress}, receiverAddress=${receiverAddress}`);

      switch (contractType) {
        case 'DelegateResourceContract':
          operationType = 'delegate';
          resourceType = parameter?.resource || 'ENERGY';
          amount = this.calculator.calculateTransactionAmount(parameter);
          fromAddress = ownerAddress;
          toAddress = receiverAddress;
          break;
        case 'UnDelegateResourceContract':
          operationType = 'undelegate';
          resourceType = parameter?.resource || 'ENERGY';
          amount = this.calculator.calculateTransactionAmount(parameter);
          fromAddress = ownerAddress;
          toAddress = receiverAddress;
          break;
      }

      // ✅ 修复：正确设置地址字段
      console.log(`[DelegateRecordHandler] 🔍 设置记录字段: operation_type=${operationType}, fromAddress=${fromAddress}, toAddress=${toAddress}, queryAddress=${address}`);
      
      // 根据操作类型和查询地址确定记录的方向
      let recordAddress = address; // 查询的地址
      let isOutgoing = false; // 是否是代理出去的记录
      
      if (operationType === 'delegate') {
        // 代理操作：如果查询地址是发起方，则是代理出去；如果是接收方，则是代理获得
        isOutgoing = (fromAddress === address);
      } else if (operationType === 'undelegate') {
        // 取消代理操作：如果查询地址是发起方，则是取消代理出去的
        isOutgoing = (fromAddress === address);
      }
      
      console.log(`[DelegateRecordHandler] 📍 代理方向判断: isOutgoing=${isOutgoing}`);
      
      return {
        id: tx.txID,
        transaction_id: tx.txID,
        pool_id: address,
        address: recordAddress,
        amount: amount,
        resource_type: resourceType as 'ENERGY' | 'BANDWIDTH',
        operation_type: operationType as 'freeze' | 'unfreeze' | 'delegate' | 'undelegate' | 'withdraw',
        status: tx.ret?.[0]?.contractRet === 'SUCCESS' ? 'success' : 'failed',
        created_at: new Date(tx.block_timestamp || tx.raw_data?.timestamp).toISOString(),
        block_number: tx.blockNumber,
        to_address: toAddress || '',
        from_address: fromAddress || '',
        fee: tx.ret?.[0]?.fee || 0,
        // 添加方向标识字段
        direction: isOutgoing ? 'outgoing' : 'incoming'
      } as FormattedStakeRecord;
    });
  }
}
