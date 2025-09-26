/**
 * 交易数据提取器
 * 从TransactionProcessor中分离出的数据提取逻辑
 */
import { orderLogger } from '../../../../utils/logger';

export interface ExtractedTransactionData {
  fromAddress: string;
  toAddress: string;
  amount: number;
}

export class TransactionDataExtractor {
  /**
   * 从原始交易中提取基本信息（支持TRX和TRC20交易）
   */
  static extractTransactionData(rawTx: any, txId: string, networkName: string): ExtractedTransactionData {
    const shortTxId = txId.substring(0, 8) + '...';
    
    // 默认值
    let fromAddress = 'unknown';
    let toAddress = 'unknown';
    let amount = 0;

    try {
      // 检测TRC20交易结构
      if (rawTx?.token_info && rawTx?.transaction_id) {
        // TRC20 USDT交易
        fromAddress = rawTx.from || 'unknown';
        toAddress = rawTx.to || 'unknown';
        const decimals = rawTx.token_info.decimals || 6;
        amount = parseFloat(rawTx.value || '0') / Math.pow(10, decimals);
        
        orderLogger.info(`📦 [${shortTxId}]    🔍 检测到TRC20交易`, {
          txId: txId,
          networkName,
          tokenSymbol: rawTx.token_info.symbol,
          contractAddress: rawTx.token_info.address,
          amount: amount,
          decimals: decimals
        });
      } 
      // 检测TRX交易结构
      else if (rawTx?.raw_data?.contract?.[0]?.parameter?.value) {
        const parameter = rawTx.raw_data.contract[0].parameter.value;
        fromAddress = parameter.owner_address || 'unknown';
        toAddress = parameter.to_address || 'unknown';
        amount = (parameter.amount || 0) / 1000000; // 转换为TRX
        
        orderLogger.info(`📦 [${shortTxId}]    🔍 检测到TRX交易`, {
          txId: txId,
          networkName,
          contractType: rawTx.raw_data.contract[0].type,
          amount: `${amount} TRX`
        });
      }
    } catch (extractError: any) {
      orderLogger.warn(`📦 [${shortTxId}]    ⚠️ 提取交易信息失败，使用默认值 - 详细警告信息`, {
        txId: txId,
        networkName,
        warningMessage: extractError.message,
        warningStack: extractError.stack,
        warningName: extractError.name,
        warningCode: extractError.code,
        processStep: '提取交易基本信息时发生异常',
        extractionAttempt: {
          // TRC20 交易结构检查
          hasTrc20Structure: !!(rawTx?.token_info && rawTx?.transaction_id),
          trc20TokenSymbol: rawTx?.token_info?.symbol,
          trc20From: rawTx?.from,
          trc20To: rawTx?.to,
          trc20Value: rawTx?.value,
          // TRX 交易结构检查
          hasRawData: !!rawTx?.raw_data,
          hasContract: !!rawTx?.raw_data?.contract,
          contractArray: Array.isArray(rawTx?.raw_data?.contract),
          contractLength: rawTx?.raw_data?.contract?.length || 0,
          firstContractType: rawTx?.raw_data?.contract?.[0]?.type,
          hasParameter: !!rawTx?.raw_data?.contract?.[0]?.parameter,
          hasParameterValue: !!rawTx?.raw_data?.contract?.[0]?.parameter?.value
        },
        fallbackValues: {
          fromAddress: 'unknown',
          toAddress: 'unknown',
          amount: 0
        }
      });
    }

    return {
      fromAddress,
      toAddress,
      amount
    };
  }

  /**
   * 生成订单号（默认为闪租订单号）
   * @deprecated 请使用 OrderCreationService.generateOrderNumberByType()
   */
  static generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FL${timestamp}${random}`;
  }

  /**
   * 创建初始交易对象
   */
  static createInitialTransaction(
    extractedData: ExtractedTransactionData,
    txId: string,
    rawTx: any,
    orderNumber: string,
    networkName: string
  ): any {
    return {
      txID: txId,
      from: extractedData.fromAddress,
      to: extractedData.toAddress,
      amount: extractedData.amount,
      timestamp: rawTx.raw_data?.timestamp || Date.now(),
      confirmed: false,
      _isInitialCreation: true,
      _orderNumber: orderNumber,
      _networkName: networkName
    };
  }

  /**
   * 创建失败更新交易对象
   */
  static createFailureUpdateTransaction(orderNumber: string, failureReason: string): any {
    return {
      txID: 'update-failed',
      from: 'system',
      to: 'system',
      amount: 0,
      timestamp: Date.now(),
      confirmed: false,
      _isOrderUpdate: true,
      _orderNumber: orderNumber,
      _failureReason: failureReason,
      _updateType: 'failed'
    };
  }
}
