import { TronGridProvider } from '../../providers/TronGridProvider';
import type {
  FormattedStakeRecord,
  FreezeBalanceV2Params,
  FreezeOperationResult,
  OperationParams,
  ServiceResponse,
  StakeOverview
} from '../../types/staking.types';
import { FreezeBalanceHandler } from './handlers/FreezeBalanceHandler';
import { FreezeNotificationHandler } from './handlers/FreezeNotificationHandler';
import { FreezeRecordHandler } from './handlers/FreezeRecordHandler';
import { FreezeCalculator } from './utils/FreezeCalculator';
import { FreezeValidator } from './validators/FreezeValidator';

/**
 * 质押操作类 (重构版)
 * 负责协调所有质押相关的操作
 */
export class FreezeOperation {
  private tronWeb: any;
  private tronGridProvider: TronGridProvider;
  private validator: FreezeValidator;
  private balanceHandler: FreezeBalanceHandler;
  private recordHandler: FreezeRecordHandler;
  private notificationHandler: FreezeNotificationHandler;
  private calculator: FreezeCalculator;

  constructor(params: OperationParams) {
    this.tronWeb = params.tronWeb;
    this.tronGridProvider = new TronGridProvider(params.networkConfig);
    
    // 初始化各个处理组件
    this.validator = new FreezeValidator(this.tronWeb);
    this.balanceHandler = new FreezeBalanceHandler(this.tronWeb);
    this.recordHandler = new FreezeRecordHandler(this.tronWeb, this.tronGridProvider);
    this.notificationHandler = new FreezeNotificationHandler();
    this.calculator = new FreezeCalculator(this.tronWeb);
  }

  /**
   * 设置网络配置
   */
  setNetworkConfig(config: any): void {
    this.tronGridProvider.setNetworkConfig(config);
  }

  /**
   * 质押TRX (Stake 2.0)
   */
  async freezeBalanceV2(params: FreezeBalanceV2Params): Promise<FreezeOperationResult> {
    try {
      // 1. 参数验证
      this.validator.validateFreezeBalanceV2Params(params);

      // 2. 执行质押操作
      const result = await this.balanceHandler.executeFreezeBalanceV2(params);

      // 3. 发送通知（如果需要）
      if (result.success && result.txid) {
        await this.notificationHandler.sendStakeSuccessNotification(
          result.txid, 
          params.frozenBalance, 
          params.resource
        );
      } else if (!result.success) {
        await this.notificationHandler.sendStakeFailureNotification(
          result.error || 'Unknown error', 
          params
        );
      }

      return result;
    } catch (error: any) {
      console.error('[FreezeOperation] Failed to freeze balance v2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取账户质押概览
   */
  async getStakeOverview(address: string): Promise<ServiceResponse<StakeOverview>> {
    try {
      const { logger } = await import('../../../../../utils/logger.js');
      logger.info(`[FreezeOperation] 开始获取质押概览 - 地址: ${address}`);
      logger.info(`[FreezeOperation] TronWeb实例: ${!!this.tronWeb}`);
      logger.info(`[FreezeOperation] TronWeb网络: ${this.tronWeb?.fullNode?.host}`);
      
      // ✅ 修复：明确设置 visible: true 确保地址统一为Base58格式
      const account = await this.tronWeb.trx.getAccount(address, { visible: true });
      logger.info(`[FreezeOperation] 获取账户信息成功: ${!!account}`);
      
      const resources = await this.tronWeb.trx.getAccountResources(address, { visible: true });
      logger.info(`[FreezeOperation] 获取资源信息成功: ${!!resources}`);
      
      // 使用计算工具计算统计数据
      const stats = this.calculator.calculateStakeStats(account, resources);
      const unfreezeStats = this.calculator.calculateUnfreezeStats(account);
      
      // 调试日志
      logger.info(`[FreezeOperation] 获取质押概览 - 地址: ${address}`);
      logger.info(`[FreezeOperation] 原始数据 - 质押能量TRX: ${stats.totalStakedEnergyTrx / stats.SUN_TO_TRX}, 质押带宽TRX: ${stats.totalStakedBandwidthTrx / stats.SUN_TO_TRX}`);
      logger.info(`[FreezeOperation] 原始数据 - 委托给他人能量: ${stats.delegatedResources}, 委托给他人带宽: ${stats.delegatedBandwidth}`);
      logger.info(`[FreezeOperation] 原始数据 - 接收委托能量: ${stats.receivedEnergyDelegation}, 接收委托带宽: ${stats.receivedBandwidthDelegation}`);
      logger.info(`[FreezeOperation] 原始数据 - 待解质押: ${unfreezeStats.pendingUnfreeze}, 可提取: ${unfreezeStats.withdrawableAmount}`);

      // 格式化结果
      const formattedOverview = this.calculator.formatStakeOverview(stats, unfreezeStats, resources);

      return {
        success: true,
        data: formattedOverview
      };
    } catch (error: any) {
      console.error('[FreezeOperation] Failed to get stake overview:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取质押相关交易记录 (从TRON网络)
   */
  async getStakeTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    return this.recordHandler.getStakeTransactionHistory(address, limit, offset);
  }
}
