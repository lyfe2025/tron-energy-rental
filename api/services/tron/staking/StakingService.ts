import type {
    DelegateOperationResult,
    DelegateResourceParams,
    FormattedStakeRecord,
    FormattedUnfreezeRecord,
    FreezeBalanceV2Params,
    FreezeOperationResult,
    NetworkConfig,
    ServiceResponse,
    StakeOverview,
    StakeTransactionParams,
    TransactionResult,
    UndelegateResourceParams,
    UnfreezeBalanceV2Params,
    UnfreezeOperationResult,
    WithdrawExpireUnfreezeParams
} from './types/staking.types';

import { DelegateOperation } from './operations/DelegateOperation';
import { FreezeOperation } from './operations/FreezeOperation';
import { UnfreezeOperation } from './operations/UnfreezeOperation';
import { NetworkProvider } from './providers/NetworkProvider';

/**
 * TRON质押服务主入口类
 * 
 * 这是一个门面模式的实现，将所有质押相关操作组合在一起，
 * 保持原有的公共接口不变，确保向后兼容性。
 * 
 * 内部使用分离的操作类来处理具体的业务逻辑：
 * - FreezeOperation: 处理质押相关操作
 * - UnfreezeOperation: 处理解质押相关操作  
 * - DelegateOperation: 处理委托相关操作
 * - NetworkProvider: 处理网络配置管理
 */
export class StakingService {
  private tronWeb: any;
  private networkProvider: NetworkProvider;
  private freezeOperation: FreezeOperation;
  private unfreezeOperation: UnfreezeOperation;
  private delegateOperation: DelegateOperation;

  constructor(tronWeb: any, networkConfig?: NetworkConfig) {
    this.tronWeb = tronWeb;
    this.networkProvider = new NetworkProvider(networkConfig);
    
    // 初始化各个操作类
    const operationParams = { tronWeb, networkConfig };
    this.freezeOperation = new FreezeOperation(operationParams);
    this.unfreezeOperation = new UnfreezeOperation(operationParams);
    this.delegateOperation = new DelegateOperation(operationParams);
  }

  /**
   * 设置网络配置（用于TronGrid API调用）
   */
  setNetworkConfig(config: NetworkConfig): void {
    this.networkProvider.setNetworkConfig(config);
    this.freezeOperation.setNetworkConfig(config);
    this.unfreezeOperation.setNetworkConfig(config);
    this.delegateOperation.setNetworkConfig(config);
  }

  // ==================== 质押相关操作 ====================

  /**
   * 质押TRX (Stake 2.0)
   */
  async freezeBalanceV2(params: FreezeBalanceV2Params): Promise<FreezeOperationResult> {
    return this.freezeOperation.freezeBalanceV2(params);
  }

  /**
   * 获取账户质押概览
   */
  async getStakeOverview(address: string): Promise<ServiceResponse<StakeOverview>> {
    return this.freezeOperation.getStakeOverview(address);
  }

  /**
   * 获取质押相关交易记录 (从TRON网络)
   */
  async getStakeTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    return this.freezeOperation.getStakeTransactionHistory(address, limit, offset);
  }

  // ==================== 解质押相关操作 ====================

  /**
   * 解质押TRX (Stake 2.0)
   */
  async unfreezeBalanceV2(params: UnfreezeBalanceV2Params): Promise<UnfreezeOperationResult> {
    return this.unfreezeOperation.unfreezeBalanceV2(params);
  }

  /**
   * 提取已到期的解质押资金
   */
  async withdrawExpireUnfreeze(params: WithdrawExpireUnfreezeParams): Promise<TransactionResult> {
    return this.unfreezeOperation.withdrawExpireUnfreeze(params);
  }

  /**
   * 获取解质押记录
   */
  async getUnfreezeTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedUnfreezeRecord[]>> {
    return this.unfreezeOperation.getUnfreezeTransactionHistory(address, limit, offset);
  }

  // ==================== 委托相关操作 ====================

  /**
   * 委托资源给其他地址
   */
  async delegateResource(params: DelegateResourceParams): Promise<DelegateOperationResult> {
    return this.delegateOperation.delegateResource(params);
  }

  /**
   * 取消委托资源
   */
  async undelegateResource(params: UndelegateResourceParams): Promise<DelegateOperationResult> {
    return this.delegateOperation.undelegateResource(params);
  }

  /**
   * 获取委托交易记录
   */
  async getDelegateTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    return this.delegateOperation.getDelegateTransactionHistory(address, limit, offset);
  }

  /**
   * 获取账户的委托资源概览
   */
  async getDelegationOverview(address: string): Promise<ServiceResponse<any>> {
    return this.delegateOperation.getDelegationOverview(address);
  }

  /**
   * 检查可委托的资源
   */
  async getAvailableForDelegation(address: string): Promise<ServiceResponse<any>> {
    return this.delegateOperation.getAvailableForDelegation(address);
  }

  // ==================== 网络和配置相关 ====================

  /**
   * 获取网络信息
   */
  getNetworkInfo(): {
    name: string;
    id: string;
    isTestNet: boolean;
    isValid: boolean;
  } {
    return {
      name: this.networkProvider.getNetworkName(),
      id: this.networkProvider.getNetworkId(),
      isTestNet: this.networkProvider.isTestNet(),
      isValid: this.networkProvider.isConfigValid()
    };
  }

  /**
   * 验证网络配置是否有效
   */
  isNetworkConfigValid(): boolean {
    return this.networkProvider.isConfigValid();
  }

  /**
   * 获取当前网络配置
   */
  getNetworkConfig(): NetworkConfig | null {
    return this.networkProvider.getNetworkConfig();
  }

  // ==================== 兼容性方法 ====================
  // 以下方法保持向后兼容性，内部调用新的分离操作

  /**
   * 记录质押相关交易到数据库
   * @deprecated 此方法已移至各操作类内部，保留用于向后兼容
   */
  async recordStakeTransaction(params: StakeTransactionParams): Promise<{ success: boolean; error?: string }> {
    console.warn('[StakingService] recordStakeTransaction 方法已废弃，交易记录已自动在操作内部完成');
    return { success: true };
  }

  // ==================== 调试和日志方法 ====================

  /**
   * 获取服务状态信息
   */
  getServiceStatus(): {
    initialized: boolean;
    networkConfigured: boolean;
    operationsReady: boolean;
    networkInfo: any;
  } {
    return {
      initialized: !!(this.tronWeb && this.freezeOperation && this.unfreezeOperation && this.delegateOperation),
      networkConfigured: this.networkProvider.isConfigValid(),
      operationsReady: !!(this.freezeOperation && this.unfreezeOperation && this.delegateOperation),
      networkInfo: this.getNetworkInfo()
    };
  }

  /**
   * 输出服务组件信息（用于调试）
   */
  logServiceComponents(): void {
    console.log('[StakingService] 服务组件状态:');
    console.log('  - TronWeb:', !!this.tronWeb);
    console.log('  - NetworkProvider:', !!this.networkProvider);
    console.log('  - FreezeOperation:', !!this.freezeOperation);
    console.log('  - UnfreezeOperation:', !!this.unfreezeOperation);
    console.log('  - DelegateOperation:', !!this.delegateOperation);
    console.log('  - Network Info:', this.getNetworkInfo());
  }
}
