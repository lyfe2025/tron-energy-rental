/**
 * 回调数据构建器
 * 从PriceConfigMessageHandler中分离出的回调数据构建逻辑
 */

export class CallbackDataBuilder {
  /**
   * 构建回调数据
   */
  static buildCallbackData(baseCallback: string, contextData: any): string {
    const timestamp = Date.now();
    const userId = contextData.userId || '';
    const transactionCount = contextData.transactionCount || '';
    
    // 生成一个简单的订单ID（时间戳 + 用户ID后4位 + 笔数）
    const orderId = `${timestamp.toString().slice(-6)}${userId.toString().slice(-4)}${transactionCount}`;
    
    return `${baseCallback}_${orderId}_${userId}_${transactionCount}`;
  }
}
