/**
 * 交易解析器
 * 负责解析和验证交易数据
 */
import axios from 'axios';
import { Logger } from 'winston';
import { orderLogger } from '../../utils/logger';
import type { Transaction, TransactionInfo } from './types';

export class TransactionParser {
  constructor(private logger: Logger) {}

  /**
   * 验证交易确认状态并获取交易信息
   */
  async validateAndGetTransactionInfo(
    txId: string,
    networkName: string,
    tronWebInstance: any
  ): Promise<TransactionInfo | null> {
    const rpcUrl = (tronWebInstance as any)._rpcUrl;
    const apiKey = (tronWebInstance as any)._apiKey;

    orderLogger.info(`   2. 验证交易确认状态`, {
      txId: txId,
      networkName,
      step: 2
    });

    // ✅ 修复：使用多种方法获取交易信息
    let txInfo: any = null;

    try {
      // 方法1: 使用TronWeb的getTransactionInfo
      txInfo = await tronWebInstance.trx.getTransactionInfo(txId, { visible: true });
      orderLogger.info(`   2.0.1 TronWeb方法结果`, {
        txId: txId,
        networkName,
        method: 'tronWebInstance.trx.getTransactionInfo',
        hasData: !!txInfo && Object.keys(txInfo).length > 0
      });
    } catch (tronWebError) {
      orderLogger.warn(`   TronWeb getTransactionInfo 失败`, {
        txId: txId,
        error: tronWebError.message
      });
    }

    // 如果TronWeb方法失败，尝试直接HTTP API
    if (!txInfo || Object.keys(txInfo).length === 0) {
      try {
        const response = await axios.post(`${rpcUrl}/wallet/gettransactioninfobyid`, {
          value: txId
        }, {
          headers: {
            'Content-Type': 'application/json',
            'TRON-PRO-API-KEY': apiKey || ''
          }
        });

        if (response.data && response.data.id) {
          txInfo = response.data;
          orderLogger.info(`   2.0.2 HTTP API方法成功`, {
            txId: txId,
            networkName,
            method: 'HTTP API',
            hasData: !!txInfo
          });
        }
      } catch (httpError: any) {
        orderLogger.warn(`   HTTP API 查询失败`, {
          txId: txId,
          error: httpError.message
        });
      }
    }

    orderLogger.info(`   2.1 获取交易信息结果`, {
      txId: txId,
      networkName,
      step: 2.1,
      txInfoExists: !!txInfo,
      txInfoId: txInfo?.id || 'null',
      txInfoResult: txInfo?.result || 'null',
      txInfoKeys: txInfo ? Object.keys(txInfo) : [],
      txInfoFull: txInfo || {},
      txInfoType: typeof txInfo,
      hasBlockNumber: !!txInfo?.blockNumber,
      hasReceipt: !!txInfo?.receipt
    });

    // 验证交易信息
    const validationResult = this.validateTransactionInfo(txInfo, txId, networkName);
    if (!validationResult.isValid) {
      orderLogger.warn(`   ❌ 交易验证失败，跳过处理`, {
        txId: txId,
        networkName,
        step: 2,
        reason: validationResult.reason,
        txInfo: txInfo || 'null'
      });
      return null;
    }

    const validTxId = txInfo.id || txInfo.txid || txId;
    orderLogger.info(`   ✅ 交易验证成功`, {
      txId: validTxId,
      networkName,
      step: 2,
      status: txInfo.result || 'CONFIRMED',
      blockNumber: txInfo.blockNumber,
      hasReceipt: !!txInfo.receipt
    });

    return txInfo;
  }

  /**
   * 验证交易信息的有效性
   */
  private validateTransactionInfo(
    txInfo: any,
    txId: string,
    networkName: string
  ): { isValid: boolean; reason?: string } {
    // 检查交易信息是否有效
    const hasValidId = txInfo && (txInfo.id || txInfo.txid);
    const hasValidResult = !txInfo.result || txInfo.result === 'SUCCESS';
    const hasBlockNumber = !!txInfo.blockNumber;

    if (!hasValidId) {
      return {
        isValid: false,
        reason: 'txInfo缺少有效ID'
      };
    }

    // 如果有result字段但不是SUCCESS，则跳过
    if (txInfo.result && txInfo.result !== 'SUCCESS') {
      return {
        isValid: false,
        reason: `交易状态非SUCCESS: ${txInfo.result}`
      };
    }

    // 如果没有区块号，可能还在处理中
    if (!hasBlockNumber) {
      return {
        isValid: false,
        reason: '交易尚未完全确认（缺少区块号）'
      };
    }

    return { isValid: true };
  }

  /**
   * 解析交易详情
   */
  async parseTransaction(
    rawTx: any,
    txInfo: any,
    tronWebInstance: any
  ): Promise<Transaction | null> {
    try {
      // 检查合约数据
      if (!rawTx?.raw_data?.contract?.[0]) {
        orderLogger.warn(`   交易解析失败: 缺少合约数据`, {
          txId: rawTx?.txID || 'unknown',
          reason: 'rawTx.raw_data.contract[0] 不存在'
        });
        return null;
      }

      const contract = rawTx.raw_data.contract[0];

      orderLogger.info(`   3.1 检查交易类型`, {
        txId: rawTx.txID,
        contractType: contract.type,
        step: 3.1
      });

      // 只处理TRX转账交易
      if (contract.type !== 'TransferContract') {
        orderLogger.warn(`   交易解析跳过: 非TRX转账交易`, {
          txId: rawTx.txID,
          contractType: contract.type,
          reason: `期望 TransferContract，实际 ${contract.type}`
        });
        return null;
      }

      const parameter = contract.parameter.value;
      const fromAddress = tronWebInstance.address.fromHex(parameter.owner_address);
      const toAddress = tronWebInstance.address.fromHex(parameter.to_address);
      const amount = parameter.amount / 1000000; // 转换为TRX

      orderLogger.info(`   3.2 解析交易参数`, {
        txId: rawTx.txID,
        fromAddress,
        toAddress,
        amount: `${amount} TRX`,
        parameterAmount: parameter.amount,
        step: 3.2
      });

      // 只处理金额大于0的交易
      if (amount <= 0) {
        orderLogger.warn(`   交易解析跳过: 金额无效`, {
          txId: rawTx.txID,
          amount: `${amount} TRX`,
          reason: '金额必须大于0'
        });
        return null;
      }

      const result: Transaction = {
        txID: rawTx.txID,
        blockNumber: txInfo.blockNumber || 0,
        timestamp: rawTx.raw_data.timestamp,
        from: fromAddress,
        to: toAddress,
        amount: amount,
        confirmed: true
      };

      orderLogger.info(`   3.3 交易解析完成`, {
        txId: result.txID,
        transaction: result,
        step: 3.3
      });

      return result;
    } catch (error) {
      orderLogger.error(`   交易解析异常`, {
        txId: rawTx?.txID || 'unknown',
        error: error.message,
        stack: error.stack
      });
      this.logger.error('解析交易详情失败:', error);
      return null;
    }
  }
}
