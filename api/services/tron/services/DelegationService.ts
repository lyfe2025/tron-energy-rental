import type { DelegateResourceParams, TransactionResult } from '../types/tron.types';
import { TransactionService } from './TransactionService';

export class DelegationService {
  private tronWeb: any;
  private transactionService: TransactionService;

  constructor(tronWeb: any, transactionService: TransactionService) {
    this.tronWeb = tronWeb;
    this.transactionService = transactionService;
  }

  /**
   * 智能地址格式转换 - 统一转换为Base58格式（T开头）
   */
  private convertToBase58Address(address: string): string {
    if (!address) return '';
    
    try {
      // 如果已经是Base58格式（T开头），直接返回
      if (address.startsWith('T') && address.length === 34) {
        return address;
      }
      
      // 如果是十六进制格式（41开头），转换为Base58
      if (address.startsWith('41') && address.length === 42) {
        return this.tronWeb.address.fromHex(address);
      }
      
      // 尝试作为十六进制地址转换
      const base58Address = this.tronWeb.address.fromHex(address);
      if (base58Address && base58Address.startsWith('T')) {
        return base58Address;
      }
      
      // 如果转换失败，记录警告并返回原始地址
      console.warn('[DelegationService] 地址转换失败:', address);
      return address;
      
    } catch (error) {
      console.warn('[DelegationService] 地址转换异常:', error);
      return address;
    }
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

      // 构建交易 - 统一使用Base58地址格式 (T开头格式，如TZ4UXDV5ZhNW7fb2AMSbgfAEZ7hWsnYS2g)
      // 🔧 修复：直接使用数字balance，避免字符串转换和parseInt的精度丢失
      
      // 🔧 修正：保持 lockPeriod 的原始状态，不强制转换为0
      const lockPeriodNum = lockPeriod;  // 保持 undefined/null/number 的原始状态

      // 确保地址为Base58格式
      const ownerBase58 = this.convertToBase58Address(ownerAddress);
      const receiverBase58 = this.convertToBase58Address(receiverAddress);

      console.log('🔍 [DelegationService] TronWeb参数详情:', {
        ownerAddressBase58: ownerBase58,
        receiverAddressBase58: receiverBase58,
        balance: balance,
        balanceType: typeof balance,
        resource: resource,
        lock: lock,
        lockPeriod: lockPeriodNum,
        lockPeriodType: typeof lockPeriodNum,
        lockPeriodIsUndefined: lockPeriodNum === undefined
      });

      // 根据TronWeb官方文档，delegateResource的正确参数顺序是：
      // delegateResource(amount, receiverAddress, resource, address, lock, options)
      let transaction;
      
      // 🔧 修正：正确判断是否启用锁定期
      if (lock && lockPeriodNum !== undefined && lockPeriodNum !== null && lockPeriodNum > 0) {
        // 🔧 单位转换：将小时转换为区块数 (TRON API要求)
        // 用户输入：小时数 → API期望：区块数 (每区块约3秒)
        const lockPeriodInBlocks = Math.round(lockPeriodNum * 1200);
        
        console.log('🔧 [DelegationService] 限期代理模式，单位转换:', {
          输入的小时数: lockPeriodNum,
          转换后的区块数: lockPeriodInBlocks,
          转换公式: 'hours × 1200 = blocks'
        });
        
        // 限期代理 - 修复精度问题：直接传递数字而不是parseInt
        transaction = await this.tronWeb.transactionBuilder.delegateResource(
          balance,                                      // amount (number) - 金额，单位为SUN，保持精度
          receiverBase58,                               // receiverAddress (string) - 接收方地址，Base58格式
          resource,                                     // resource (string) - ENERGY 或 BANDWIDTH  
          ownerBase58,                                  // address (string) - 委托方地址，Base58格式
          true,                                        // lock (boolean) - 限期代理设为true
          lockPeriodInBlocks,                          // lockPeriod (number) - 锁定期，单位为区块数
          { visible: true }                            // options - 指定使用Base58地址格式
        );
      } else {
        // 永久代理 - 正确传递所有7个参数位置
        console.log('🔧 [DelegationService] 永久代理模式，明确传递所有参数位置');
        
        // 根据TronWeb源码，方法签名：delegateResource(amount, receiverAddress, resource, address, lock, lockPeriod?, options)
        // 必须明确传递 undefined 作为 lockPeriod，然后传递 options
        transaction = await this.tronWeb.transactionBuilder.delegateResource(
          balance,                                      // amount (number) - 金额，单位为SUN，保持精度
          receiverBase58,                               // receiverAddress (string) - 接收方地址，Base58格式
          resource,                                     // resource (string) - ENERGY 或 BANDWIDTH  
          ownerBase58,                                  // address (string) - 委托方地址，Base58格式
          false,                                       // lock (boolean) - 永久代理设为false
          undefined,                                   // lockPeriod (undefined) - 明确传递undefined
          { visible: true }                            // options - 第7个参数
        );
      }

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

      // 统一使用Base58地址格式 (T开头格式，如TZ4UXDV5ZhNW7fb2AMSbgfAEZ7hWsnYS2g)
      // 🔧 修复：直接使用数字balance，避免字符串转换导致的问题

      // 确保地址为Base58格式
      const ownerBase58 = this.convertToBase58Address(ownerAddress);
      const receiverBase58 = this.convertToBase58Address(receiverAddress);

      console.log('🔍 [DelegationService] UndelegateResource TronWeb参数详情:', {
        ownerAddressBase58: ownerBase58,
        receiverAddressBase58: receiverBase58,
        balance: balance,
        balanceType: typeof balance,
        resource: resource
      });

      // 根据TronWeb官方文档，undelegateResource的正确参数顺序是：
      // undelegateResource(amount, receiverAddress, resource, address, options)
      const transaction = await this.tronWeb.transactionBuilder.undelegateResource(
        balance,                                      // amount (number) - 金额，单位为SUN，保持精度
        receiverBase58,                               // receiverAddress (string) - 接收方地址，Base58格式
        resource,                                     // resource (string) - ENERGY 或 BANDWIDTH
        ownerBase58,                                  // address (string) - 委托方地址，Base58格式
        { visible: true }                            // options - 指定使用Base58地址格式
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
