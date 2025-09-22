/**
 * 闪租订单号生成器
 * 负责生成唯一的闪租订单号
 */
export class FlashRentOrderNumberGenerator {
  /**
   * 生成订单号
   * 格式: FL{timestamp}{randomString}
   */
  async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FL${timestamp}${random}`;
  }

  /**
   * 验证订单号格式
   */
  validateOrderNumber(orderNumber: string): boolean {
    // 闪租订单号格式：FL + 13位时间戳 + 6位随机字符
    const pattern = /^FL\d{13}[A-Z0-9]{6}$/;
    return pattern.test(orderNumber);
  }

  /**
   * 从订单号中提取时间戳
   */
  extractTimestampFromOrderNumber(orderNumber: string): number | null {
    if (!this.validateOrderNumber(orderNumber)) {
      return null;
    }
    
    const timestampStr = orderNumber.substring(2, 15); // FL后面的13位数字
    return parseInt(timestampStr, 10);
  }

  /**
   * 从订单号中提取随机部分
   */
  extractRandomFromOrderNumber(orderNumber: string): string | null {
    if (!this.validateOrderNumber(orderNumber)) {
      return null;
    }
    
    return orderNumber.substring(15); // 最后6位随机字符
  }
}
