/**
 * 交易处理器 - 重构版本
 * 负责单个交易的完整处理流程
 * 
 * 重构说明：将原始611行代码拆分为多个模块，保持完全相同的功能
 */
import { Logger } from 'winston';
import { PaymentService } from '../../payment';
import { TransactionCache } from '../TransactionCache';
import { TransactionParser } from '../TransactionParser';
import type { MonitoredAddress } from '../types';

// 导入分离的模块
import { BatchTransactionProcessor } from './batch/BatchTransactionProcessor.ts';
import { SingleTransactionProcessor } from './single/SingleTransactionProcessor.ts';

export class TransactionProcessor {
  private singleTransactionProcessor: SingleTransactionProcessor;
  private batchTransactionProcessor: BatchTransactionProcessor;

  constructor(
    private logger: Logger,
    private transactionCache: TransactionCache,
    private transactionParser: TransactionParser,
    private paymentService: PaymentService
  ) {
    // 初始化子处理器
    this.singleTransactionProcessor = new SingleTransactionProcessor(
      logger,
      transactionCache,
      transactionParser,
      paymentService
    );
    
    this.batchTransactionProcessor = new BatchTransactionProcessor(
      logger,
      this.singleTransactionProcessor
    );
  }

  /**
   * 处理单个交易
   */
  async processSingleTransaction(
    rawTx: any,
    networkId: string,
    networkName: string,
    tronWebInstance: any
  ): Promise<void> {
    return await this.singleTransactionProcessor.processSingleTransaction(
      rawTx,
      networkId,
      networkName,
      tronWebInstance
    );
  }

  /**
   * 批量处理地址的交易
   */
  async processAddressTransactions(monitoredAddress: MonitoredAddress): Promise<void> {
    return await this.batchTransactionProcessor.processAddressTransactions(monitoredAddress);
  }
}
