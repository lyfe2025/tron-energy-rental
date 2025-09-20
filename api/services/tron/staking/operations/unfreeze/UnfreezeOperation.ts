import { TronGridProvider } from '../../providers/TronGridProvider';
import type {
    FormattedUnfreezeRecord,
    OperationParams,
    ServiceResponse,
    StakeTransactionParams,
    TransactionResult,
    UnfreezeBalanceV2Params,
    UnfreezeOperationResult,
    WithdrawExpireUnfreezeParams
} from '../../types/staking.types';
import { UnfreezeBalanceHandler } from './handlers/UnfreezeBalanceHandler';
import { UnfreezeRecordHandler } from './handlers/UnfreezeRecordHandler';
import { UnfreezeWithdrawHandler } from './handlers/UnfreezeWithdrawHandler';

/**
 * 解质押操作类 (分离重构版)
 * 
 * 使用门面模式协调各个专门的处理组件：
 * - UnfreezeBalanceHandler: 处理解质押交易执行
 * - UnfreezeRecordHandler: 处理解质押记录管理  
 * - UnfreezeWithdrawHandler: 处理已到期资金提取
 * 
 * 保持完全向后兼容，所有原有的接口和方法签名不变。
 */
export class UnfreezeOperation {
  private tronWeb: any;
  private tronGridProvider: TronGridProvider;
  private balanceHandler: UnfreezeBalanceHandler;
  private recordHandler: UnfreezeRecordHandler;
  private withdrawHandler: UnfreezeWithdrawHandler;

  constructor(params: OperationParams) {
    this.tronWeb = params.tronWeb;
    this.tronGridProvider = new TronGridProvider(params.networkConfig, params.tronWeb);
    
    // 初始化各个专门的处理组件
    this.balanceHandler = new UnfreezeBalanceHandler(this.tronWeb);
    this.recordHandler = new UnfreezeRecordHandler(this.tronWeb, this.tronGridProvider);
    this.withdrawHandler = new UnfreezeWithdrawHandler(this.tronWeb);
  }

  /**
   * 设置网络配置
   */
  setNetworkConfig(config: any): void {
    this.tronGridProvider.setNetworkConfig(config);
  }

  /**
   * 解质押TRX (Stake 2.0) - 完整生命周期日志版本
   * 参考: https://developers.tron.network/reference/unfreezebalancev2-1
   */
  async unfreezeBalanceV2(params: UnfreezeBalanceV2Params): Promise<UnfreezeOperationResult> {
    // 获取网络解锁期
    const networkUnlockPeriod = await this.tronGridProvider.getNetworkUnlockPeriod();
    
    // 委托给专门的解质押处理器执行
    return this.balanceHandler.executeUnfreeze(params, networkUnlockPeriod);
  }

  /**
   * 提取已到期的解质押资金
   */
  async withdrawExpireUnfreeze(params: WithdrawExpireUnfreezeParams): Promise<TransactionResult> {
    // 委托给专门的提取处理器执行
    return this.withdrawHandler.withdrawExpiredUnfreeze(params);
  }

  /**
   * 获取账户真实的解质押状态
   */
  async getAccountUnfrozenStatus(address: string): Promise<any[]> {
    // 委托给专门的记录处理器执行
    return this.recordHandler.getAccountUnfrozenStatus(address);
  }

  /**
   * 获取解质押记录
   */
  async getUnfreezeTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedUnfreezeRecord[]>> {
    // 委托给专门的记录处理器执行
    return this.recordHandler.getUnfreezeTransactionHistory(address, limit, offset);
  }

  // ==================== 兼容性方法 ====================
  // 以下方法保持向后兼容性

  /**
   * @deprecated 已移除数据库存储逻辑，所有解质押数据从TRON网络实时获取
   * 保留此方法以避免类型错误，但不执行任何操作
   */
  private async recordStakeTransaction(params: StakeTransactionParams): Promise<{ success: boolean; error?: string }> {
    console.log('[UnfreezeOperation] 🔍 recordStakeTransaction 已废弃 - 所有数据从TRON网络实时获取');
    return { success: true };
  }

  // ==================== 调试和状态方法 ====================

  /**
   * 获取操作组件状态信息
   */
  getOperationStatus(): {
    initialized: boolean;
    networkConfigured: boolean;
    handlersReady: boolean;
    componentInfo: any;
  } {
    return {
      initialized: !!(this.tronWeb && this.tronGridProvider),
      networkConfigured: !!this.tronGridProvider,
      handlersReady: !!(this.balanceHandler && this.recordHandler && this.withdrawHandler),
      componentInfo: {
        balanceHandler: !!this.balanceHandler,
        recordHandler: !!this.recordHandler,
        withdrawHandler: !!this.withdrawHandler,
        tronGridProvider: !!this.tronGridProvider
      }
    };
  }

  /**
   * 输出组件信息（用于调试）
   */
  logComponentStatus(): void {
    console.log('[UnfreezeOperation] 分离组件状态:');
    console.log('  - TronWeb:', !!this.tronWeb);
    console.log('  - TronGridProvider:', !!this.tronGridProvider);
    console.log('  - UnfreezeBalanceHandler:', !!this.balanceHandler);
    console.log('  - UnfreezeRecordHandler:', !!this.recordHandler);
    console.log('  - UnfreezeWithdrawHandler:', !!this.withdrawHandler);
    console.log('  - 整体状态:', this.getOperationStatus());
  }
}
