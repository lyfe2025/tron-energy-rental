import type {
    TransactionResult,
    WithdrawExpireUnfreezeParams
} from '../../../types/staking.types';
import { AddressConverter } from '../utils/AddressConverter';
import { UnfreezeValidator } from '../validators/UnfreezeValidator';

/**
 * 解质押提取处理器
 * 负责处理已到期的解质押资金提取
 */
export class UnfreezeWithdrawHandler {
  private tronWeb: any;
  private validator: UnfreezeValidator;
  private addressConverter: AddressConverter;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
    this.validator = new UnfreezeValidator(tronWeb);
    this.addressConverter = new AddressConverter(tronWeb);
  }

  /**
   * 提取已到期的解质押资金
   */
  async withdrawExpiredUnfreeze(params: WithdrawExpireUnfreezeParams): Promise<TransactionResult> {
    try {
      const { ownerAddress } = params;

      console.log('🔍 [UnfreezeWithdrawHandler] 开始构建withdrawExpireUnfreeze交易:', {
        ownerAddress,
        '地址格式': 'Base58 format with visible option'
      });

      // 验证参数
      this.validator.validateWithdrawParams(params);

      // 统一使用Base58地址格式并设置visible参数
      const ownerBase58 = this.addressConverter.convertToBase58Address(ownerAddress);
      
      console.log('🔍 [UnfreezeWithdrawHandler] 提取过期解质押使用Base58地址:', {
        ownerAddress: `${ownerAddress} -> ${ownerBase58}`
      });
      
      // 验证转换后的地址格式
      this.validator.validateAddress(ownerBase58);
      
      // 构建提取交易
      const transaction = await this.tronWeb.transactionBuilder.withdrawExpireUnfreeze(
        ownerBase58,                         // owner_address (string) - Base58地址格式
        { visible: true }                    // options - 指定使用Base58地址格式
      );

      // 签名交易
      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      
      // 广播交易
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        console.log('✅ [UnfreezeWithdrawHandler] 提取交易成功:', {
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        console.log('❌ [UnfreezeWithdrawHandler] 提取交易失败:', result.message);
        
        return {
          success: false,
          error: result.message || 'Withdraw transaction failed'
        };
      }
    } catch (error: any) {
      console.error('❌ [UnfreezeWithdrawHandler] 提取操作异常:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
