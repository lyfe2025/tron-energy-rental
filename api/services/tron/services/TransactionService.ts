// import { query } from '../../../database/index'; // 已移除数据库写入功能
import type { EnergyTransactionData, ServiceResponse } from '../types/tron.types';

export class TransactionService {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  // 获取地址的交易历史
  async getTransactionsFromAddress(address: string, limit: number = 10, offset: number = 0) {
    try {
      const transactions = await this.tronWeb.trx.getTransactionsFromAddress(address, limit, offset);
      return transactions;
    } catch (error) {
      console.error('Failed to get transactions from address:', error);
      return [];
    }
  }

  // 获取交易信息
  async getTransaction(txid: string): Promise<ServiceResponse> {
    try {
      const transaction = await this.tronWeb.trx.getTransaction(txid);
      const transactionInfo = await this.tronWeb.trx.getTransactionInfo(txid);
      
      return {
        success: true,
        data: {
          ...transaction,
          ...transactionInfo
        }
      };
    } catch (error) {
      console.error('Failed to get transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 监控转账交易
  async monitorTransfer(toAddress: string, amount: number, timeout: number = 300000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkTransfer = async () => {
        try {
          // 获取最近的交易
          const transactions = await this.tronWeb.trx.getTransactionsFromAddress(toAddress, 1, 0);
          
          for (const tx of transactions) {
            if (tx.raw_data.contract[0].parameter.value.amount >= amount) {
              resolve({
                success: true,
                txid: tx.txID,
                amount: tx.raw_data.contract[0].parameter.value.amount
              });
              return;
            }
          }
          
          // 检查超时
          if (Date.now() - startTime > timeout) {
            resolve({
              success: false,
              error: 'Transfer monitoring timeout'
            });
            return;
          }
          
          // 继续监控
          setTimeout(checkTransfer, 5000);
        } catch (error) {
          reject(error);
        }
      };
      
      checkTransfer();
    });
  }

  // 记录能量交易到数据库
  /**
   * @deprecated 已移除数据库存储逻辑，所有交易数据从TRON网络实时获取
   * 保留此方法以避免类型错误，但不执行任何操作
   */
  async recordEnergyTransaction(data: EnergyTransactionData): Promise<{ success: boolean; error?: string }> {
    console.log('[TransactionService] 🔍 recordEnergyTransaction 已废弃 - 所有数据从TRON网络实时获取');
    console.log(`  - 交易ID: ${data.txid}`);
    console.log(`  - 从地址: ${data.from_address} -> 到地址: ${data.to_address}`);
    console.log(`  - 金额: ${data.amount}, 资源类型: ${data.resource_type}`);
    return { success: true };
  }
}
