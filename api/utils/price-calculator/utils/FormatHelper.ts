/**
 * 格式化助手类
 * 负责价格、数量和其他数值的格式化处理
 */

export class FormatHelper {
  /**
   * 格式化价格
   * @param price 价格
   * @param currency 货币符号
   * @param decimals 小数位数
   * @returns 格式化后的价格字符串
   */
  static formatPrice(price: number, currency: string = 'TRX', decimals: number = 6): string {
    if (isNaN(price) || price < 0) return `0 ${currency}`;
    
    return `${price.toFixed(decimals)} ${currency}`;
  }

  /**
   * 格式化能量数量
   * @param energy 能量数量
   * @returns 格式化后的能量字符串
   */
  static formatEnergy(energy: number): string {
    if (isNaN(energy) || energy < 0) return '0 Energy';
    
    if (energy >= 1000000) {
      return `${(energy / 1000000).toFixed(2)}M Energy`;
    } else if (energy >= 1000) {
      return `${(energy / 1000).toFixed(2)}K Energy`;
    }
    
    return `${energy.toLocaleString()} Energy`;
  }

  /**
   * 格式化带宽数量
   * @param bandwidth 带宽数量（字节）
   * @returns 格式化后的带宽字符串
   */
  static formatBandwidth(bandwidth: number): string {
    if (isNaN(bandwidth) || bandwidth < 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bandwidth;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 格式化百分比
   * @param value 数值
   * @param decimals 小数位数
   * @returns 格式化后的百分比字符串
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    if (isNaN(value)) return '0%';
    
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * 格式化时间
   * @param hours 小时数
   * @returns 格式化后的时间字符串
   */
  static formatDuration(hours: number): string {
    if (isNaN(hours) || hours < 0) return '0 小时';
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      if (remainingHours === 0) {
        return `${days} 天`;
      } else {
        return `${days} 天 ${remainingHours} 小时`;
      }
    }
    
    return `${hours} 小时`;
  }

  /**
   * 格式化折扣信息
   * @param discountAmount 折扣金额
   * @param discountPercent 折扣百分比
   * @param currency 货币符号
   * @returns 格式化后的折扣字符串
   */
  static formatDiscount(discountAmount: number, discountPercent: number, currency: string = 'TRX'): string {
    if (discountAmount <= 0) return '无折扣';
    
    return `节省 ${this.formatPrice(discountAmount, currency)} (${this.formatPercentage(discountPercent)})`;
  }

  /**
   * 格式化计算规则列表
   * @param rules 规则数组
   * @returns 格式化后的规则字符串
   */
  static formatAppliedRules(rules: string[]): string {
    if (!rules || rules.length === 0) return '无特殊规则';
    
    return rules.join(', ');
  }

  /**
   * 格式化计算详情
   * @param basePrice 基础价格
   * @param finalPrice 最终价格
   * @param appliedRules 应用的规则
   * @param currency 货币符号
   * @returns 格式化后的计算详情
   */
  static formatCalculationSummary(
    basePrice: number,
    finalPrice: number,
    appliedRules: string[],
    currency: string = 'TRX'
  ): string {
    const discount = basePrice - finalPrice;
    const discountPercent = basePrice > 0 ? (discount / basePrice) * 100 : 0;
    
    let summary = `基础价格: ${this.formatPrice(basePrice, currency)}`;
    
    if (discount > 0) {
      summary += `\n折扣: ${this.formatDiscount(discount, discountPercent, currency)}`;
    }
    
    summary += `\n最终价格: ${this.formatPrice(finalPrice, currency)}`;
    
    if (appliedRules.length > 0) {
      summary += `\n应用规则: ${this.formatAppliedRules(appliedRules)}`;
    }
    
    return summary;
  }

  /**
   * 格式化数值为易读格式
   * @param value 数值
   * @param decimals 小数位数
   * @returns 格式化后的数值字符串
   */
  static formatNumber(value: number, decimals: number = 2): string {
    if (isNaN(value)) return '0';
    
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }

  /**
   * 格式化日期时间
   * @param date 日期对象或时间戳
   * @returns 格式化后的日期时间字符串
   */
  static formatDateTime(date: Date | number | string): string {
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '无效日期';
      
      return dateObj.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return '无效日期';
    }
  }

  /**
   * 解析格式化的价格字符串
   * @param priceString 价格字符串
   * @returns 数值价格
   */
  static parsePrice(priceString: string): number {
    try {
      const match = priceString.match(/^([\d.,]+)/);
      if (!match) return 0;
      
      return parseFloat(match[1].replace(/,/g, ''));
    } catch (error) {
      return 0;
    }
  }

  /**
   * 验证价格格式
   * @param priceString 价格字符串
   * @returns 是否为有效格式
   */
  static isValidPriceFormat(priceString: string): boolean {
    const priceRegex = /^[\d.,]+\s*[A-Z]{2,}$/;
    return priceRegex.test(priceString.trim());
  }
}
