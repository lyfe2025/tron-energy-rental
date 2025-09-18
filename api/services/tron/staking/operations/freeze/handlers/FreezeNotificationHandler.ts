import type { StakeTransactionParams } from '../../../types/staking.types';

/**
 * 质押通知处理器
 * 负责处理质押相关的通知和记录
 */
export class FreezeNotificationHandler {
  constructor() {
    // 初始化通知处理器
  }

  /**
   * @deprecated 已移除数据库存储逻辑，所有质押数据从TRON网络实时获取
   * 保留此方法以避免类型错误，但不执行任何操作
   */
  async recordStakeTransaction(params: StakeTransactionParams): Promise<{ success: boolean; error?: string }> {
    console.log('[FreezeNotificationHandler] 🔍 recordStakeTransaction 已废弃 - 所有数据从TRON网络实时获取');
    return { success: true };
  }

  /**
   * 发送质押成功通知（预留接口）
   */
  async sendStakeSuccessNotification(transactionId: string, amount: number, resource: string): Promise<void> {
    console.log(`[FreezeNotificationHandler] 质押成功通知: ${transactionId} - ${amount} ${resource}`);
    // 这里可以实现实际的通知逻辑，比如发送到消息队列、Webhook等
  }

  /**
   * 发送质押失败通知（预留接口）
   */
  async sendStakeFailureNotification(error: string, params: any): Promise<void> {
    console.log(`[FreezeNotificationHandler] 质押失败通知: ${error}`, params);
    // 这里可以实现实际的通知逻辑
  }
}
