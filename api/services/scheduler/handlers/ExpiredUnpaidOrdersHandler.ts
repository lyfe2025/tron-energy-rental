import { logger } from '../../../utils/logger';
import { BaseTaskHandler } from '../base/BaseTaskHandler';

/**
 * 逾期未支付订单处理器
 * 负责自动取消逾期且未支付的订单
 */
export class ExpiredUnpaidOrdersHandler extends BaseTaskHandler {
  readonly name = 'expired-unpaid-orders';
  readonly description = '每5分钟检查并自动取消逾期未支付订单';
  readonly defaultCronExpression = '*/5 * * * *';
  readonly critical = true;

  constructor() {
    super();
    this.timeout = 10 * 60 * 1000; // 10分钟超时
    this.maxRetries = 2; // 最多重试2次
  }

  protected async doExecute(): Promise<string> {
    logger.info('🔍 [自动取消] 检查逾期未支付订单...');

    // 动态导入数据库查询
    const { query } = await import('../../../database/index');

    // 查询所有逾期且未支付的订单
    const expiredOrdersResult = await this.safeQuery(
      () => query(`
        SELECT 
          id, 
          order_number,
          order_type,
          payment_status,
          status,
          expires_at,
          created_at,
          target_address,
          user_id
        FROM orders 
        WHERE expires_at IS NOT NULL
          AND expires_at <= NOW()
          AND payment_status != 'paid'
          AND status NOT IN ('cancelled', 'completed', 'manually_completed', 'failed', 'refunded')
        ORDER BY expires_at ASC
      `),
      '查询逾期未支付订单失败'
    );

    const expiredOrders = expiredOrdersResult.rows;

    if (!expiredOrders || expiredOrders.length === 0) {
      return '没有发现逾期未支付订单';
    }

    logger.info(`🚨 [自动取消] 发现 ${expiredOrders.length} 个逾期未支付订单`);

    let cancelled = 0;
    let failed = 0;

    // 批量取消逾期订单
    for (const order of expiredOrders) {
      try {
        await this.cancelExpiredOrder(order, query);
        cancelled++;
        logger.debug(`✅ [自动取消] 成功取消订单: ${order.order_number || order.id}`);
      } catch (error) {
        failed++;
        logger.error(`❌ [自动取消] 取消订单失败 ${order.order_number || order.id}:`, error);
      }
    }

    return this.formatResult(cancelled, failed, '逾期订单自动取消');
  }

  /**
   * 取消单个逾期订单
   */
  private async cancelExpiredOrder(order: any, query: any): Promise<void> {
    logger.debug(`🔥 [自动取消] 正在取消订单: ${order.order_number || order.id}`);
    logger.debug(`   - 订单类型: ${order.order_type}`);
    logger.debug(`   - 目标地址: ${order.target_address}`);
    logger.debug(`   - 过期时间: ${order.expires_at}`);
    logger.debug(`   - 支付状态: ${order.payment_status}`);
    logger.debug(`   - 订单状态: ${order.status}`);

    // 更新订单状态为已取消
    await this.safeQuery(
      () => query(`
        UPDATE orders 
        SET 
          status = 'cancelled',
          error_message = '订单已过期，自动取消',
          updated_at = NOW()
        WHERE id = $1
      `, [order.id]),
      `更新订单状态失败 ${order.order_number || order.id}`
    );
  }

  async canExecute(): Promise<boolean> {
    try {
      // 检查数据库连接是否可用
      const { query } = await import('../../../database/index');
      await this.safeQuery(
        () => query('SELECT 1'),
        '数据库连接检查失败'
      );

      return true;
    } catch (error) {
      logger.error('检查逾期订单任务执行条件时发生错误:', error);
      return false;
    }
  }

  async prepare(): Promise<void> {
    logger.debug('准备执行逾期未支付订单检查任务');
  }

  async cleanup(): Promise<void> {
    logger.debug('逾期未支付订单检查任务清理完成');
  }
}
