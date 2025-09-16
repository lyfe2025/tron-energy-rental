import type { DelegateResourceParams, TransactionResult } from '../types/tron.types';
import { TransactionService } from './TransactionService';

export class DelegationService {
  private tronWeb: any;
  private transactionService: TransactionService;

  constructor(tronWeb: any, transactionService: TransactionService) {
    this.tronWeb = tronWeb;
    this.transactionService = transactionService;
  }

  // 委托资源
  async delegateResource(params: DelegateResourceParams): Promise<TransactionResult> {
    try {
      const {
        ownerAddress,
        receiverAddress,
        balance,
        resource,
        lock,
        lockPeriod
      } = params;

      console.log('🔍 [DelegationService] 开始构建delegateResource交易:', {
        ownerAddress,
        receiverAddress,
        balance,
        resource,
        lock,
        lockPeriod,
        '地址格式': 'HEX format required (per TRON documentation)',
        '金额格式': 'int64 number format required'
      });

      // 构建交易 - 根据TRON官方文档，使用十六进制地址和数字金额
      const transaction = await this.tronWeb.transactionBuilder.delegateResource(
        this.tronWeb.address.toHex(ownerAddress),     // owner_address (string) - 十六进制地址格式
        this.tronWeb.address.toHex(receiverAddress),  // receiver_address (string) - 十六进制地址格式
        balance,                                      // balance (int64) - 金额，单位为SUN，数字格式
        resource,                                     // resource (string) - ENERGY 或 BANDWIDTH
        lock,                                        // lock (boolean) - 是否锁定
        lockPeriod                                   // lock_period (int) - 锁定期，数字格式
      );

      // 签名交易
      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      
      // 广播交易
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 记录到数据库
        await this.transactionService.recordEnergyTransaction({
          txid: result.txid,
          from_address: ownerAddress,
          to_address: receiverAddress,
          amount: balance,
          resource_type: resource.toLowerCase(),
          status: 'pending',
          lock_period: lockPeriod || 0
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Transaction failed'
        };
      }
    } catch (error) {
      console.error('Failed to delegate resource:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 取消委托资源
  async undelegateResource(params: Omit<DelegateResourceParams, 'lock' | 'lockPeriod'>): Promise<TransactionResult> {
    try {
      const {
        ownerAddress,
        receiverAddress,
        balance,
        resource
      } = params;

      console.log('🔍 [DelegationService] 开始构建undelegateResource交易:', {
        ownerAddress,
        receiverAddress,
        balance,
        resource,
        '地址格式': 'HEX format required (per TRON documentation)',
        '金额格式': 'int64 number format required'
      });

      // 根据TRON官方文档，使用十六进制地址和数字金额
      const transaction = await this.tronWeb.transactionBuilder.undelegateResource(
        this.tronWeb.address.toHex(ownerAddress),     // owner_address (string) - 十六进制地址格式
        this.tronWeb.address.toHex(receiverAddress),  // receiver_address (string) - 十六进制地址格式
        balance,                                      // balance (int64) - 金额，单位为SUN，数字格式
        resource                                     // resource (string) - ENERGY 或 BANDWIDTH
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Transaction failed'
        };
      }
    } catch (error) {
      console.error('Failed to undelegate resource:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
