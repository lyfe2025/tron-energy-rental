import { logger } from '../../../utils/logger';
import { energyPoolService } from '../../energy-pool';
import { BaseTaskHandler } from '../base/BaseTaskHandler';

/**
 * 能量池刷新处理器
 * 负责定期刷新能量池的状态信息
 */
export class RefreshPoolsHandler extends BaseTaskHandler {
  readonly name = 'refresh-pools';
  readonly description = '每小时刷新能量池状态';
  readonly defaultCronExpression = '0 * * * *';
  readonly critical = true;

  constructor() {
    super();
    this.timeout = 15 * 60 * 1000; // 15分钟超时
    this.maxRetries = 2; // 最多重试2次
  }

  protected async doExecute(): Promise<string> {
    logger.info('🔄 开始刷新能量池状态...');

    // 获取所有活跃的能量池
    const activePools = await this.getActivePools();

    if (!activePools || activePools.length === 0) {
      return '没有发现活跃的能量池';
    }

    logger.info(`🔍 发现 ${activePools.length} 个活跃能量池，开始刷新状态...`);

    let refreshed = 0;
    let failed = 0;

    // 刷新每个池的状态
    for (const pool of activePools) {
      try {
        await this.refreshSinglePool(pool);
        refreshed++;
        logger.debug(`✅ 成功刷新能量池: ${pool.id}`);
      } catch (error) {
        failed++;
        logger.error(`❌ 刷新能量池失败 ${pool.id}:`, error);
      }
    }

    return this.formatResult(refreshed, failed, '能量池状态刷新');
  }

  /**
   * 获取所有活跃的能量池
   */
  private async getActivePools(): Promise<any[]> {
    try {
      // 这里保留energy_pools表的查询，因为它不在删除列表中
      logger.debug('🔍 查询活跃的能量池列表...');
      
      // 暂时返回空数组，等待energyPoolService提供获取池列表的方法
      // 实际应该使用energyPoolService来获取池列表
      
      return [];
    } catch (error) {
      logger.error('获取活跃能量池列表失败:', error);
      throw new Error(`获取能量池列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 刷新单个能量池状态
   */
  private async refreshSinglePool(pool: any): Promise<void> {
    try {
      logger.debug(`🔄 刷新能量池状态: ${pool.id} - ${pool.name || 'Unknown'}`);
      
      // 调用能量池服务刷新状态
      await energyPoolService.refreshPoolStatus();
      
      logger.debug(`✅ 能量池状态刷新完成: ${pool.id}`);
    } catch (error) {
      logger.error(`❌ 刷新能量池状态失败 ${pool.id}:`, error);
      throw error;
    }
  }

  async canExecute(): Promise<boolean> {
    try {
      // 检查能量池服务是否可用
      if (!energyPoolService || typeof energyPoolService.refreshPoolStatus !== 'function') {
        logger.warn('能量池服务不可用');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('检查能量池刷新任务执行条件时发生错误:', error);
      return false;
    }
  }

  async prepare(): Promise<void> {
    logger.debug('准备执行能量池状态刷新任务');
    
    // 可以在这里做一些准备工作，比如：
    // - 预热连接池
    // - 检查外部服务状态
    // - 初始化临时数据结构等
  }

  async cleanup(): Promise<void> {
    logger.debug('能量池状态刷新任务清理完成');
    
    // 可以在这里做一些清理工作，比如：
    // - 清理临时数据
    // - 释放资源
    // - 发送完成通知等
  }
}
