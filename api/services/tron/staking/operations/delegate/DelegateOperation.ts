import { TronGridProvider } from '../../providers/TronGridProvider';
import type {
  DelegateOperationResult,
  DelegateResourceParams,
  FormattedStakeRecord,
  OperationParams,
  ServiceResponse,
  UndelegateResourceParams
} from '../../types/staking.types';
import { DelegateNotificationHandler } from './handlers/DelegateNotificationHandler';
import { DelegateRecordHandler } from './handlers/DelegateRecordHandler';
import { DelegateResourceHandler } from './handlers/DelegateResourceHandler';
import { DelegateCalculator } from './utils/DelegateCalculator';
import { DelegateValidator } from './validators/DelegateValidator';

/**
 * 代理操作类 (重构版)
 * 负责协调所有代理相关的操作
 */
export class DelegateOperation {
  private tronWeb: any;
  private tronGridProvider: TronGridProvider;
  private validator: DelegateValidator;
  private resourceHandler: DelegateResourceHandler;
  private recordHandler: DelegateRecordHandler;
  private notificationHandler: DelegateNotificationHandler;
  private calculator: DelegateCalculator;

  constructor(params: OperationParams) {
    this.tronWeb = params.tronWeb;
    this.tronGridProvider = new TronGridProvider(params.networkConfig);
    
    // 初始化各个处理组件
    this.validator = new DelegateValidator(this.tronWeb);
    this.resourceHandler = new DelegateResourceHandler(this.tronWeb);
    this.recordHandler = new DelegateRecordHandler(this.tronWeb, this.tronGridProvider);
    this.notificationHandler = new DelegateNotificationHandler();
    this.calculator = new DelegateCalculator(this.tronWeb);
  }

  /**
   * 设置网络配置
   */
  setNetworkConfig(config: any): void {
    this.tronGridProvider.setNetworkConfig(config);
  }

  /**
   * 代理资源给其他地址
   */
  async delegateResource(params: DelegateResourceParams): Promise<DelegateOperationResult> {
    try {
      // 1. 参数验证
      this.validator.validateDelegateResourceParams(params);
      this.validator.validateAddressesNotSame(params.ownerAddress, params.receiverAddress);

      // 2. 执行委托操作
      const result = await this.resourceHandler.executeDelegateResource(params);

      // 3. 发送通知（如果需要）
      if (result.success && result.txid) {
        await this.notificationHandler.sendDelegateSuccessNotification(
          result.txid,
          params.balance / 1000000, // 转换为TRX
          params.resource,
          params.receiverAddress
        );
      } else if (!result.success) {
        await this.notificationHandler.sendDelegateFailureNotification(
          result.error || 'Unknown error',
          params
        );
      }

      return result;
    } catch (error: any) {
      console.error('[DelegateOperation] Failed to delegate resource:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 取消代理资源
   */
  async undelegateResource(params: UndelegateResourceParams): Promise<DelegateOperationResult> {
    try {
      // 1. 参数验证
      this.validator.validateUndelegateResourceParams(params);
      this.validator.validateAddressesNotSame(params.ownerAddress, params.receiverAddress);

      // 2. 执行取消委托操作
      const result = await this.resourceHandler.executeUndelegateResource(params);

      // 3. 发送通知（如果需要）
      if (result.success && result.txid) {
        await this.notificationHandler.sendUndelegateSuccessNotification(
          result.txid,
          params.balance / 1000000, // 转换为TRX
          params.resource,
          params.receiverAddress
        );
      } else if (!result.success) {
        await this.notificationHandler.sendUndelegateFailureNotification(
          result.error || 'Unknown error',
          params
        );
      }

      return result;
    } catch (error: any) {
      console.error('[DelegateOperation] Failed to undelegate resource:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取代理交易记录
   */
  async getDelegateTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    return this.recordHandler.getDelegateTransactionHistory(address, limit, offset);
  }

  /**
   * 获取账户的代理资源概览
   */
  async getDelegationOverview(address: string): Promise<ServiceResponse<any>> {
    try {
      // ✅ 修复：明确设置 visible: true 确保地址统一为Base58格式
      const account = await this.tronWeb.trx.getAccount(address, { visible: true });
      
      // 使用计算工具计算代理概览
      const overview = this.calculator.calculateDelegationOverview(account);

      console.log(`[DelegateOperation] 获取代理概览 - 地址: ${address}`);
      console.log(`[DelegateOperation] 代理给他人 - 能量: ${overview.delegatedToOthers.energy}, 带宽: ${overview.delegatedToOthers.bandwidth}`);
      console.log(`[DelegateOperation] 接收代理 - 能量: ${overview.receivedFromOthers.energy}, 带宽: ${overview.receivedFromOthers.bandwidth}`);

      return {
        success: true,
        data: overview
      };
    } catch (error: any) {
      console.error('[DelegateOperation] Failed to get delegation overview:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查可代理的资源
   */
  async getAvailableForDelegation(address: string): Promise<ServiceResponse<any>> {
    try {
      // ✅ 修复：明确设置 visible: true 确保地址统一为Base58格式
      const account = await this.tronWeb.trx.getAccount(address, { visible: true });
      
      // 使用计算工具计算可代理资源
      const availableData = this.calculator.calculateAvailableForDelegation(account);

      console.log(`[DelegateOperation] 可代理资源 - 地址: ${address}`);
      console.log(`[DelegateOperation] 质押能量: ${availableData.staked.energy}, 已代理: ${availableData.delegated.energy}, 可代理: ${availableData.available.energy}`);
      console.log(`[DelegateOperation] 质押带宽: ${availableData.staked.bandwidth}, 已代理: ${availableData.delegated.bandwidth}, 可代理: ${availableData.available.bandwidth}`);

      return {
        success: true,
        data: availableData
      };
    } catch (error: any) {
      console.error('[DelegateOperation] Failed to get available for delegation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
