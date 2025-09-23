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
      const shortTxId = txId.substring(0, 8) + '...';
      orderLogger.warn(`📦 [${shortTxId}]    ⚠️ TronWeb getTransactionInfo 失败 - 详细警告信息`, {
        txId: txId,
        networkName,
        warningMessage: tronWebError.message,
        warningStack: tronWebError.stack,
        warningName: tronWebError.name,
        warningCode: tronWebError.code,
        processStep: 'TronWeb获取交易信息时发生异常',
        methodAttempt: {
          method: 'tronWebInstance.trx.getTransactionInfo',
          parameter: txId,
          tronWebAvailable: !!tronWebInstance,
          tronWebType: typeof tronWebInstance
        },
        fallbackAction: '将尝试使用HTTP API方法'
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
        const shortTxId = txId.substring(0, 8) + '...';
        orderLogger.warn(`📦 [${shortTxId}]    ⚠️ HTTP API 查询失败 - 详细警告信息`, {
          txId: txId,
          networkName,
          warningMessage: httpError.message,
          warningStack: httpError.stack,
          warningName: httpError.name,
          warningCode: httpError.code,
          processStep: 'HTTP API获取交易信息时发生异常',
          httpRequest: {
            method: 'POST',
            url: `${rpcUrl}/wallet/gettransactioninfobyid`,
            payload: { value: txId },
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey?.length || 0
          },
          httpResponse: {
            status: httpError.response?.status || 'unknown',
            statusText: httpError.response?.statusText || 'unknown',
            data: httpError.response?.data || 'no_data',
            headers: httpError.response?.headers || {}
          }
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
      const shortTxId = txId.substring(0, 8) + '...';
      orderLogger.warn(`📦 [${shortTxId}]    ❌ 交易验证失败，跳过处理 - 详细验证信息`, {
        txId: txId,
        networkName,
        step: 2,
        validationFailure: {
          reason: validationResult.reason,
          isValid: validationResult.isValid
        },
        txInfoAnalysis: {
          txInfoExists: !!txInfo,
          txInfoType: typeof txInfo,
          txInfoKeys: txInfo ? Object.keys(txInfo) : [],
          hasValidId: txInfo && (txInfo.id || txInfo.txid),
          actualId: txInfo?.id || txInfo?.txid || 'missing',
          hasResult: !!txInfo?.result,
          resultValue: txInfo?.result || 'none',
          hasBlockNumber: !!txInfo?.blockNumber,
          blockNumber: txInfo?.blockNumber || 'missing',
          hasReceipt: !!txInfo?.receipt,
          receiptKeys: txInfo?.receipt ? Object.keys(txInfo.receipt) : []
        },
        validationChecks: {
          hasValidId: txInfo && (txInfo.id || txInfo.txid),
          hasValidResult: !txInfo?.result || txInfo.result === 'SUCCESS',
          hasBlockNumber: !!txInfo?.blockNumber
        },
        rawTxInfo: txInfo || 'null'
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
        const txId = rawTx?.txID || 'unknown';
        const shortTxId = txId.substring(0, 8) + '...';
        orderLogger.warn(`📦 [${shortTxId}]    ⚠️ 交易解析失败: 缺少合约数据 - 详细警告信息`, {
          txId: txId,
          warningReason: 'rawTx.raw_data.contract[0] 不存在',
          processStep: '检查交易合约数据时发现缺失',
          rawTxStructure: {
            hasRawTx: !!rawTx,
            hasTxID: !!rawTx?.txID,
            hasRawData: !!rawTx?.raw_data,
            hasContract: !!rawTx?.raw_data?.contract,
            contractType: typeof rawTx?.raw_data?.contract,
            contractIsArray: Array.isArray(rawTx?.raw_data?.contract),
            contractLength: rawTx?.raw_data?.contract?.length || 0,
            firstContractExists: !!rawTx?.raw_data?.contract?.[0]
          },
          expectedStructure: 'rawTx.raw_data.contract[0] should exist',
          fallbackAction: '跳过此交易解析'
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
        const shortTxId = rawTx.txID.substring(0, 8) + '...';
        orderLogger.warn(`📦 [${shortTxId}]    ⚠️ 交易解析跳过: 非TRX转账交易 - 详细警告信息`, {
          txId: rawTx.txID,
          warningReason: `期望 TransferContract，实际 ${contract.type}`,
          processStep: '检查交易类型时发现不匹配',
          contractAnalysis: {
            actualType: contract.type,
            expectedType: 'TransferContract',
            isTransferContract: contract.type === 'TransferContract',
            hasParameter: !!contract.parameter,
            parameterType: typeof contract.parameter,
            hasParameterValue: !!contract.parameter?.value
          },
          supportedTypes: ['TransferContract'],
          fallbackAction: '跳过此交易，只处理TRX转账交易'
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
        const shortTxId = rawTx.txID.substring(0, 8) + '...';
        orderLogger.warn(`📦 [${shortTxId}]    ⚠️ 交易解析跳过: 金额无效 - 详细警告信息`, {
          txId: rawTx.txID,
          warningReason: '金额必须大于0',
          processStep: '验证交易金额时发现无效值',
          amountAnalysis: {
            rawAmount: parameter.amount,
            convertedAmount: amount,
            amountInTRX: `${amount} TRX`,
            isPositive: amount > 0,
            isZero: amount === 0,
            isNegative: amount < 0,
            conversionRate: '1 TRX = 1,000,000 sun'
          },
          requirements: {
            minAmount: 0,
            mustBePositive: true
          },
          fallbackAction: '跳过此交易，只处理有效金额的交易'
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
      const txId = rawTx?.txID || 'unknown';
      const shortTxId = txId.substring(0, 8) + '...';
      orderLogger.error(`📦 [${shortTxId}]    ❌ 交易解析异常 - 详细错误信息`, {
        txId: txId,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        errorCode: error.code,
        processStep: '解析交易详情时发生异常',
        inputAnalysis: {
          hasRawTx: !!rawTx,
          hasTxID: !!rawTx?.txID,
          hasRawData: !!rawTx?.raw_data,
          hasContract: !!rawTx?.raw_data?.contract,
          contractLength: rawTx?.raw_data?.contract?.length || 0,
          firstContractType: rawTx?.raw_data?.contract?.[0]?.type,
          hasTxInfo: !!txInfo,
          txInfoType: typeof txInfo,
          tronWebAvailable: !!tronWebInstance
        },
        parsingContext: {
          method: 'parseTransaction',
          expectedOutput: 'Transaction object',
          actualOutput: null
        }
      });
      this.logger.error('解析交易详情失败:', error);
      return null;
    }
  }
}
