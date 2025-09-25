/**
 * 交易处理器 - 入口文件
 * 负责单个交易的完整处理流程
 * 
 * 重构说明：原始代码已分离到 processors/ 目录下的多个模块中
 * 此文件现在作为向后兼容的入口点
 */
import { Logger } from 'winston';
import { PaymentService } from '../payment';
import { TransactionCache } from './TransactionCache';
import { TransactionParser } from './TransactionParser';
import type { MonitoredAddress } from './types';

// 导入重构后的处理器
import { TransactionProcessor as RefactoredTransactionProcessor } from './processors/TransactionProcessor.ts';

export class TransactionProcessor {
  private refactoredProcessor: RefactoredTransactionProcessor;

  constructor(
    private logger: Logger,
    private transactionCache: TransactionCache,
    private transactionParser: TransactionParser,
    private paymentService: PaymentService
  ) {
    // 使用重构后的处理器
    this.refactoredProcessor = new RefactoredTransactionProcessor(
      logger,
      transactionCache,
      transactionParser,
      paymentService
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
    return await this.refactoredProcessor.processSingleTransaction(
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
    return await this.refactoredProcessor.processAddressTransactions(monitoredAddress);
  }
}
