import type { 
  FreezeBalanceV2Params, 
  FreezeOperationResult 
} from '../../../types/staking.types';
import { FreezeCalculator } from '../utils/FreezeCalculator';

/**
 * 质押余额处理器
 * 负责处理质押余额相关的操作
 */
export class FreezeBalanceHandler {
  private tronWeb: any;
  private freezeCalculator: FreezeCalculator;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
    this.freezeCalculator = new FreezeCalculator(tronWeb);
  }

  /**
   * 执行质押TRX操作
   */
  async executeFreezeBalanceV2(params: FreezeBalanceV2Params): Promise<FreezeOperationResult> {
    try {
      const { ownerAddress, frozenBalance, resource } = params;

      console.log('🔍 [FreezeBalanceHandler] 开始构建freezeBalanceV2交易 (正确参数顺序):', {
        ownerAddress,
        resource,
        frozenBalance,
        '参数顺序': 'amount, resource, address (根据TronWeb源码)',
        '地址格式': 'Base58 format (TronWeb会自动转换为hex)',
        '金额格式': 'number format required'
      });

      // 🔧 统一使用Base58地址格式并设置visible参数
      const ownerBase58 = this.freezeCalculator.convertToBase58Address(ownerAddress);
      
      console.log('🔍 [FreezeBalanceHandler] 使用Base58地址:', {
        ownerAddress: `${ownerAddress} -> ${ownerBase58}`
      });
      
      // freezeBalanceV2(amount, resource, address, options)
      // 1.构建交易
      const transaction = await this.tronWeb.transactionBuilder.freezeBalanceV2(
        frozenBalance,  // amount (number) - 金额，单位为SUN
        resource,       // resource (string) - ENERGY 或 BANDWIDTH  
        ownerBase58,    // address (string) - Base58地址格式
        { visible: true } // options - 指定使用Base58地址格式
      );
      
      // 2. 签名交易
      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      
      // 3. 广播交易
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      return this.formatTransactionResult(result);
      
    } catch (error: any) {
      console.error('[FreezeBalanceHandler] Failed to freeze balance v2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 格式化交易结果
   */
  private formatTransactionResult(result: any): FreezeOperationResult {
    if (result.result) {
      // 质押成功，直接返回结果（不再存储到数据库，所有数据从TRON网络实时获取）
      return {
        success: true,
        txid: result.txid,
        energyUsed: result.energy_used,
        netUsed: result.net_used,
        poolId: 1
      };
    } else {
      return {
        success: false,
        error: result.message || 'Freeze transaction failed'
      };
    }
  }
}
