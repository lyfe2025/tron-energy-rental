import { query } from '../../../database/index';
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
  async recordEnergyTransaction(data: EnergyTransactionData): Promise<{ success: boolean; error?: string }> {
    try {
      await query(
        `INSERT INTO energy_transactions (
          transaction_id, from_address, to_address, amount,
          resource_type, status, lock_period, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.txid,
          data.from_address,
          data.to_address,
          data.amount,
          data.resource_type,
          data.status,
          data.lock_period,
          new Date()
        ]
      );
      return { success: true };
    } catch (error) {
      console.error('Failed to record energy transaction:', error);
      return { success: false, error: error.message };
    }
  }
}
