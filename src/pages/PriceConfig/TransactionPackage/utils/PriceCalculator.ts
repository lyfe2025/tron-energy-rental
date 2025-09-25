/**
 * 价格计算工具
 * 负责汇率转换和价格计算
 */
import type { Button } from '../types/transaction-package.types'

export class PriceCalculator {
  /**
   * 为按钮添加TRX价格
   */
  static addTrxPrices(button: any, usdtToTrxRate: number = 3.02): Button {
    return {
      ...button,
      trxUnitPrice: Number((button.unitPrice * usdtToTrxRate).toFixed(4)),
      trxPrice: Number((button.price * usdtToTrxRate).toFixed(2))
    }
  }

  /**
   * 计算USDT到TRX的转换
   */
  static convertUsdtToTrx(usdtAmount: number, rate: number): number {
    return Number((usdtAmount * rate).toFixed(4))
  }

  /**
   * 计算TRX到USDT的转换
   */
  static convertTrxToUsdt(trxAmount: number, rate: number): number {
    return Number((trxAmount / rate).toFixed(4))
  }

  /**
   * 计算单价（从总价和数量）
   */
  static calculateUnitPrice(totalPrice: number, count: number): number {
    if (count <= 0) return 0
    return Number((totalPrice / count).toFixed(4))
  }

  /**
   * 计算总价（从单价和数量）
   */
  static calculateTotalPrice(unitPrice: number, count: number): number {
    return Number((unitPrice * count).toFixed(2))
  }

  /**
   * 验证价格数据的有效性
   */
  static validatePriceData(data: {
    unitPrice?: number
    totalPrice?: number
    count?: number
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data.unitPrice !== undefined) {
      if (data.unitPrice <= 0) {
        errors.push('单价必须大于0')
      }
      if (data.unitPrice > 1000) {
        errors.push('单价过高，请检查输入')
      }
    }

    if (data.totalPrice !== undefined) {
      if (data.totalPrice <= 0) {
        errors.push('总价必须大于0')
      }
      if (data.totalPrice > 100000) {
        errors.push('总价过高，请检查输入')
      }
    }

    if (data.count !== undefined) {
      if (data.count <= 0) {
        errors.push('数量必须大于0')
      }
      if (data.count > 10000) {
        errors.push('数量过大，请检查输入')
      }
    }

    // 交叉验证
    if (data.unitPrice && data.totalPrice && data.count) {
      const calculatedTotal = this.calculateTotalPrice(data.unitPrice, data.count)
      const difference = Math.abs(calculatedTotal - data.totalPrice)
      if (difference > 0.01) {
        errors.push('单价、总价和数量之间不匹配')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 格式化价格显示
   */
  static formatPrice(price: number, currency: 'USDT' | 'TRX' = 'USDT', decimalPlaces?: number): string {
    let decimals = decimalPlaces
    if (decimals === undefined) {
      decimals = currency === 'USDT' ? 4 : 2
    }
    
    return `${price.toFixed(decimals)} ${currency}`
  }

  /**
   * 格式化数字（添加千分位分隔符）
   */
  static formatNumber(num: number): string {
    return num.toLocaleString('zh-CN')
  }

  /**
   * 计算价格变化百分比
   */
  static calculatePriceChangePercentage(oldPrice: number, newPrice: number): number {
    if (oldPrice === 0) return 0
    return Number(((newPrice - oldPrice) / oldPrice * 100).toFixed(2))
  }

  /**
   * 计算批量折扣
   */
  static calculateBulkDiscount(baseUnitPrice: number, count: number): number {
    // 简单的阶梯折扣逻辑
    let discountRate = 0
    
    if (count >= 500) {
      discountRate = 0.05 // 5% 折扣
    } else if (count >= 200) {
      discountRate = 0.03 // 3% 折扣
    } else if (count >= 100) {
      discountRate = 0.02 // 2% 折扣
    } else if (count >= 50) {
      discountRate = 0.01 // 1% 折扣
    }

    return Number((baseUnitPrice * (1 - discountRate)).toFixed(4))
  }

  /**
   * 根据数量自动计算推荐价格
   */
  static calculateRecommendedPrice(count: number, baseUnitPrice: number = 1.15): {
    unitPrice: number
    totalPrice: number
    discountRate: number
  } {
    const discountedUnitPrice = this.calculateBulkDiscount(baseUnitPrice, count)
    const totalPrice = this.calculateTotalPrice(discountedUnitPrice, count)
    const discountRate = (baseUnitPrice - discountedUnitPrice) / baseUnitPrice

    return {
      unitPrice: discountedUnitPrice,
      totalPrice,
      discountRate: Number((discountRate * 100).toFixed(2))
    }
  }

  /**
   * 验证汇率的合理性
   */
  static validateExchangeRate(rate: number): { isValid: boolean; message?: string } {
    if (rate <= 0) {
      return { isValid: false, message: '汇率必须大于0' }
    }
    
    if (rate < 1) {
      return { isValid: false, message: '汇率过低，请检查输入' }
    }
    
    if (rate > 20) {
      return { isValid: false, message: '汇率过高，请检查输入' }
    }
    
    return { isValid: true }
  }

  /**
   * 获取价格统计信息
   */
  static getPriceStatistics(buttons: Button[]): {
    minUnitPrice: number
    maxUnitPrice: number
    avgUnitPrice: number
    totalPackages: number
    priceRange: number
  } {
    if (buttons.length === 0) {
      return {
        minUnitPrice: 0,
        maxUnitPrice: 0,
        avgUnitPrice: 0,
        totalPackages: 0,
        priceRange: 0
      }
    }

    const unitPrices = buttons.map(b => b.unitPrice)
    const minUnitPrice = Math.min(...unitPrices)
    const maxUnitPrice = Math.max(...unitPrices)
    const avgUnitPrice = unitPrices.reduce((sum, price) => sum + price, 0) / unitPrices.length
    const priceRange = maxUnitPrice - minUnitPrice

    return {
      minUnitPrice: Number(minUnitPrice.toFixed(4)),
      maxUnitPrice: Number(maxUnitPrice.toFixed(4)),
      avgUnitPrice: Number(avgUnitPrice.toFixed(4)),
      totalPackages: buttons.length,
      priceRange: Number(priceRange.toFixed(4))
    }
  }
}
