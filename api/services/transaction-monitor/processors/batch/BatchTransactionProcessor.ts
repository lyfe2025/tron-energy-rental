/**
 * 批量交易处理器
 * 从TransactionProcessor中分离出的批量交易处理逻辑
 */
import { Logger } from 'winston';
import { orderLogger } from '../../../../utils/logger';
import type { MonitoredAddress } from '../../types';
import { SingleTransactionProcessor } from '../single/SingleTransactionProcessor.ts';

export class BatchTransactionProcessor {
  private singleTransactionProcessor: SingleTransactionProcessor;

  constructor(
    private logger: Logger,
    singleTransactionProcessor: SingleTransactionProcessor
  ) {
    this.singleTransactionProcessor = singleTransactionProcessor;
  }

  /**
   * 批量处理地址的交易
   */
  async processAddressTransactions(monitoredAddress: MonitoredAddress): Promise<void> {
    const { address, networkId, networkName, tronWebInstance, tronGridProvider } = monitoredAddress;
    
    try {
      // 🕐 计算查询时间范围：当前时间向前45秒（减少重复处理，提高效率）
      const now = Date.now();
      const queryStartTime = now - 45 * 1000; // 45秒查询时间窗口

      // 📥 查询最近45秒内的交易记录（优化查询数量和时间窗口）
      const transactionsResult = await tronGridProvider.getAccountTransactions(address, 100, 'block_timestamp,desc');

      if (!transactionsResult.success || !transactionsResult.data) {
        return;
      }

      // 确保数据是数组格式
      let transactions = transactionsResult.data;
      if (!Array.isArray(transactions)) {
        if (transactions && typeof transactions === 'object') {
          transactions = Object.values(transactions);
        } else {
          transactions = [];
        }
      }

      // 🎯 过滤：只处理最近45秒内的交易
      const recentTransactions = transactions
        .filter((tx: any) => tx && tx.raw_data && tx.raw_data.contract)
        .filter((tx: any) => {
          const txTimestamp = tx.raw_data.timestamp || 0;
          return txTimestamp >= queryStartTime;
        })
        .sort((a: any, b: any) => (b.raw_data?.timestamp || 0) - (a.raw_data?.timestamp || 0));

      // 📊 只显示关键信息：待处理交易数量
      if (recentTransactions.length > 0) {
        this.logger.info(`🔍 [${networkName}] 发现 ${recentTransactions.length} 条待处理交易记录`);

        // =============== 开始处理 ===============
        orderLogger.info(`=============== 开始处理 [${networkName}] ===============`, {
          networkName,
          transactionCount: recentTransactions.length
        });

        let processedCount = 0;
        for (const tx of recentTransactions) {
          try {
            processedCount++;
            const shortTxId = tx.txID.substring(0, 8) + '...';
            orderLogger.info(`📦 [${shortTxId}] ${processedCount}. 处理交易: ${tx.txID}`, {
              txId: tx.txID,
              networkName,
              step: 1
            });
            await this.singleTransactionProcessor.processSingleTransaction(tx, networkId, networkName, tronWebInstance);
          } catch (error: any) {
            const shortTxId = tx.txID.substring(0, 8) + '...';
            orderLogger.error(`📦 [${shortTxId}] ❌ 处理交易失败 - 详细错误信息`, {
              txId: tx.txID,
              networkName,
              errorMessage: error.message,
              errorStack: error.stack,
              errorName: error.name,
              errorCode: error.code,
              processStep: '批量处理交易时发生异常',
              transactionData: {
                timestamp: tx.raw_data?.timestamp,
                contractType: tx.raw_data?.contract?.[0]?.type,
                contractCount: tx.raw_data?.contract?.length || 0,
                hasParameter: !!tx.raw_data?.contract?.[0]?.parameter?.value
              },
              batchInfo: {
                currentIndex: processedCount,
                totalTransactions: recentTransactions.length,
                networkId: networkId
              }
            });
          }
        }

        // =============== 处理结束 ===============
        orderLogger.info(`=============== 处理结束 [${networkName}] ===============`, {
          networkName,
          processedCount
        });
      }
    } catch (error: any) {
      this.logger.error(`❌ [${networkName}] 轮询地址 ${address} 交易失败:`, error);
    }
  }
}
