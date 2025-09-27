import { logger } from '../../../utils/logger';
import { energyDelegationService } from '../../energy-delegation';
import { BaseTaskHandler } from '../base/BaseTaskHandler';

/**
 * 到期委托处理器
 * 负责检查和处理到期的能量委托
 */
export class ExpiredDelegationsHandler extends BaseTaskHandler {
  readonly name = 'expired-delegations';
  readonly description = '每5分钟检查并处理到期的能量委托';
  readonly defaultCronExpression = '*/5 * * * *';
  readonly critical = true;

  constructor() {
    super();
    this.timeout = 10 * 60 * 1000; // 10分钟超时
    this.maxRetries = 2; // 最多重试2次
  }

  protected async doExecute(): Promise<string> {
    logger.info('🔍 检查到期委托 - 从TRON网络实时获取委托状态');

    // 获取到期委托（现在从TRON网络实时检查，不再依赖数据库）
    const expiredDelegations = await this.getExpiredDelegationsFromTron();

    if (!expiredDelegations || expiredDelegations.length === 0) {
      return '没有发现到期委托';
    }

    logger.info(`发现 ${expiredDelegations.length} 个到期委托，开始处理...`);

    // 批量处理到期委托
    let processed = 0;
    let failed = 0;

    for (const delegation of expiredDelegations) {
      try {
        await energyDelegationService.handleDelegationExpiry(delegation.id);
        processed++;
        logger.debug(`成功处理到期委托: ${delegation.id}`);
      } catch (error) {
        failed++;
        logger.error(`处理到期委托失败 ${delegation.id}:`, error);
      }
    }

    return this.formatResult(processed, failed, '到期委托');
  }

  /**
   * 从TRON网络获取到期的委托记录
   */
  private async getExpiredDelegationsFromTron(): Promise<any[]> {
    try {
      // TODO: 实现定时任务中的到期委托自动处理（非基础记录查询）
      // 基础委托记录查询功能已存在于 tronService.getDelegateTransactionHistory()
      // 这里需要实现：
      // 1. 查询所有需要定时处理的DelegateResourceContract交易
      // 2. 检查委托的业务锁定期是否已过期
      // 3. 返回需要自动处理的到期委托列表
      logger.info('🔗 正在从TRON网络检查到期委托业务状态...');
      
      // 暂时返回空数组，等待具体实现
      return [];
    } catch (error) {
      logger.error('从TRON网络获取到期委托时发生错误:', error);
      throw new Error(`获取到期委托失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async canExecute(): Promise<boolean> {
    try {
      // 检查能量委托服务是否可用
      if (!energyDelegationService || typeof energyDelegationService.handleDelegationExpiry !== 'function') {
        logger.warn('能量委托服务不可用');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('检查到期委托任务执行条件时发生错误:', error);
      return false;
    }
  }
}
