import type {
    DelegateOperationResult,
    DelegateResourceParams,
    UndelegateResourceParams
} from '../../../types/staking.types';
import { DelegateCalculator } from '../utils/DelegateCalculator';

/**
 * 委托资源处理器
 * 负责处理委托资源的核心操作
 */
export class DelegateResourceHandler {
  private tronWeb: any;
  private calculator: DelegateCalculator;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
    this.calculator = new DelegateCalculator(tronWeb);
  }

  /**
   * 执行委托资源操作
   */
  async executeDelegateResource(params: DelegateResourceParams): Promise<DelegateOperationResult> {
    try {
      const { ownerAddress, receiverAddress, balance, resource, lock, lockPeriod } = params;

      console.log('🔍 [DelegateResourceHandler] 开始构建delegateResource交易:', {
        ownerAddress,
        receiverAddress,
        balance,
        resource,
        lock,
        lockPeriod,
        '地址格式': 'HEX format required (per TRON documentation)',
        '金额格式': 'int64 number format required'
      });

      // 🔧 统一使用Base58地址格式 (T开头格式)
      const ownerBase58 = this.calculator.convertToBase58Address(ownerAddress);
      const receiverBase58 = this.calculator.convertToBase58Address(receiverAddress);
      
      console.log('🔍 [DelegateResourceHandler] 使用Base58地址:', {
        ownerAddress: `${ownerAddress} -> ${ownerBase58}`,
        receiverAddress: `${receiverAddress} -> ${receiverBase58}`
      });
      
      // 🔧 构建交易选项
      const transactionOptions: any = { 
        visible: true                              // visible - 指定使用Base58地址格式
      };
      
      // 🔧 单位转换：只有在启用锁定且提供了lockPeriod时才处理
      if (lock && lockPeriod && lockPeriod > 0) {
        // 用户输入：小时数 → API期望：区块数 (每区块约3秒)
        // 转换公式：hours * 3600 / 3 = hours * 1200
        const lockPeriodInBlocks = Math.round(lockPeriod * 1200);
        transactionOptions.lockPeriod = lockPeriodInBlocks;
        
        console.log('🔧 [DelegateResourceHandler] 启用锁定期，单位转换:', {
          输入的小时数: lockPeriod,
          转换后的区块数: lockPeriodInBlocks,
          转换说明: '小时数 × 1200 = 区块数 (每区块3秒)'
        });
      } else {
        console.log('🔧 [DelegateResourceHandler] 永久代理模式，不设置lockPeriod参数');
      }
      
      const transaction = await this.tronWeb.transactionBuilder.delegateResource(
        balance,                                      // balance (int64) - 金额，单位为SUN，数字格式
        receiverBase58,                               // receiver_address (string) - Base58地址格式
        resource,                                     // resource (string) - ENERGY 或 BANDWIDTH
        ownerBase58,                                  // owner_address (string) - Base58地址格式
        lock,                                        // lock (boolean) - 是否锁定
        transactionOptions                           // options - 动态选项
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      return this.formatDelegateResult(result, receiverAddress, lockPeriod);
      
    } catch (error: any) {
      console.error('[DelegateResourceHandler] Failed to delegate resource:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 执行取消委托资源操作
   */
  async executeUndelegateResource(params: UndelegateResourceParams): Promise<DelegateOperationResult> {
    try {
      const { ownerAddress, receiverAddress, balance, resource } = params;

      console.log('🔍 [DelegateResourceHandler] 开始构建undelegateResource交易:', {
        ownerAddress,
        receiverAddress,
        balance,
        resource,
        '地址格式': 'HEX format required (per TRON documentation)',
        '金额格式': 'int64 number format required'
      });

      // 🔧 统一使用Base58地址格式 (T开头格式)
      const ownerBase58 = this.calculator.convertToBase58Address(ownerAddress);
      const receiverBase58 = this.calculator.convertToBase58Address(receiverAddress);
      
      console.log('🔍 [DelegateResourceHandler] 取消代理使用Base58地址:', {
        ownerAddress: `${ownerAddress} -> ${ownerBase58}`,
        receiverAddress: `${receiverAddress} -> ${receiverBase58}`
      });
      
      const transaction = await this.tronWeb.transactionBuilder.undelegateResource(
        balance,                                      // balance (int64) - 金额，单位为SUN，数字格式
        receiverBase58,                               // receiver_address (string) - Base58地址格式
        resource,                                     // resource (string) - ENERGY 或 BANDWIDTH
        ownerBase58,                                  // owner_address (string) - Base58地址格式
        { visible: true }                            // options - 指定使用Base58地址格式
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      return this.formatUndelegateResult(result, receiverAddress);
      
    } catch (error: any) {
      console.error('[DelegateResourceHandler] Failed to undelegate resource:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 格式化委托交易结果
   */
  private formatDelegateResult(result: any, receiverAddress: string, lockPeriod?: number): DelegateOperationResult {
    if (result.result) {
      // 代理成功（不再存储到数据库，所有数据从TRON网络实时获取）
      return {
        success: true,
        txid: result.txid,
        energyUsed: result.energy_used,
        netUsed: result.net_used,
        receiverAddress,
        lockPeriod: lockPeriod || 3
      };
    } else {
      return {
        success: false,
        error: result.message || 'Delegate transaction failed'
      };
    }
  }

  /**
   * 格式化取消委托交易结果
   */
  private formatUndelegateResult(result: any, receiverAddress: string): DelegateOperationResult {
    if (result.result) {
      // 取消代理成功（不再存储到数据库，所有数据从TRON网络实时获取）
      return {
        success: true,
        txid: result.txid,
        energyUsed: result.energy_used,
        netUsed: result.net_used,
        receiverAddress
      };
    } else {
      return {
        success: false,
        error: result.message || 'Undelegate transaction failed'
      };
    }
  }
}
