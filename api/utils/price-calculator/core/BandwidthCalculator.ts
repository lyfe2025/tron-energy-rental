/**
 * 带宽价格计算器
 * 专门处理TRON带宽相关的价格计算
 */
import { query } from '../../../config/database.js';
import type {
    CalculationInput,
    CalculationOptions,
    PackageInfo,
    PriceCalculationResult
} from '../types/index.js';
import { BaseCalculator } from './BaseCalculator.js';

export class BandwidthCalculator extends BaseCalculator {
  
  /**
   * 计算带宽价格
   */
  async calculateBandwidthPrice(
    input: CalculationInput,
    options: CalculationOptions = {}
  ): Promise<PriceCalculationResult> {
    // 验证输入
    const validationErrors = this.validateBandwidthInput(input);
    if (validationErrors.length > 0) {
      throw new Error(`输入验证失败: ${validationErrors.join(', ')}`);
    }

    // 获取带宽包信息
    const packageInfo = await this.getBandwidthPackageInfo(input.packageId);
    
    // 执行基础计算
    const result = await this.performCalculation(input, options);
    
    // 添加带宽特定的计算详情
    result.calculationDetails.packageInfo = packageInfo;
    
    // 应用带宽特定的调整
    return this.applyBandwidthSpecificAdjustments(result, input, packageInfo);
  }

  /**
   * 验证带宽计算输入
   */
  private validateBandwidthInput(input: CalculationInput): string[] {
    const errors = this.validateInput(input);
    
    if (input.type !== 'bandwidth') {
      errors.push('计算类型必须是bandwidth');
    }
    
    if (input.amount < 1024) {
      errors.push('带宽数量不能少于1KB (1024字节)');
    }
    
    if (input.amount > 100 * 1024 * 1024) {
      errors.push('带宽数量不能超过100MB');
    }
    
    return errors;
  }

  /**
   * 获取带宽包信息
   */
  private async getBandwidthPackageInfo(packageId?: string): Promise<PackageInfo | null> {
    if (!packageId) return null;
    
    try {
      const result = await query(`
        SELECT 
          id,
          name,
          type,
          base_price,
          min_quantity,
          max_quantity,
          currency,
          description
        FROM energy_packages 
        WHERE id = ? AND status = 'active' AND type = 'bandwidth'
      `, [packageId]);
      
      if (result.length === 0) return null;
      
      const pkg = result[0];
      return {
        id: pkg.id,
        name: pkg.name,
        type: pkg.type,
        basePrice: parseFloat(pkg.base_price),
        minQuantity: parseInt(pkg.min_quantity),
        maxQuantity: parseInt(pkg.max_quantity),
        currency: pkg.currency
      };
    } catch (error) {
      console.error('获取带宽包信息失败:', error);
      return null;
    }
  }

  /**
   * 应用带宽特定的价格调整
   */
  private async applyBandwidthSpecificAdjustments(
    result: PriceCalculationResult,
    input: CalculationInput,
    packageInfo: PackageInfo | null
  ): Promise<PriceCalculationResult> {
    let adjustedPrice = result.finalPrice;
    const adjustments: string[] = [];

    // 带宽使用效率调整
    const efficiencyMultiplier = this.getBandwidthEfficiencyMultiplier(input.amount);
    if (efficiencyMultiplier !== 1.0) {
      const adjustment = adjustedPrice * (efficiencyMultiplier - 1);
      adjustedPrice += adjustment;
      adjustments.push(`带宽效率调整: ${efficiencyMultiplier}x`);
    }

    // 网络速度要求调整
    const speedMultiplier = await this.getNetworkSpeedMultiplier();
    if (speedMultiplier !== 1.0) {
      const adjustment = adjustedPrice * (speedMultiplier - 1);
      adjustedPrice += adjustment;
      adjustments.push(`网络速度调整: ${speedMultiplier}x`);
    }

    // 数据传输优先级调整
    const priorityMultiplier = this.getPriorityMultiplier(input.isEmergency);
    if (priorityMultiplier !== 1.0) {
      const adjustment = adjustedPrice * (priorityMultiplier - 1);
      adjustedPrice += adjustment;
      adjustments.push(`优先级调整: ${priorityMultiplier}x`);
    }

    // 更新结果
    if (adjustments.length > 0) {
      result.finalPrice = this.roundPrice(adjustedPrice);
      result.appliedRules.push(...adjustments);
      
      // 更新计算详情
      if (result.calculationDetails.breakdown) {
        result.calculationDetails.breakdown.total = result.finalPrice;
      }
    }

    return result;
  }

  /**
   * 获取带宽使用效率倍数
   */
  private getBandwidthEfficiencyMultiplier(amount: number): number {
    // 将字节转换为MB
    const amountInMB = amount / (1024 * 1024);
    
    // 大数据传输享受规模优惠
    if (amountInMB >= 50) {
      return 0.8; // 50MB以上优惠20%
    } else if (amountInMB >= 10) {
      return 0.9; // 10-50MB优惠10%
    } else if (amountInMB >= 1) {
      return 0.95; // 1-10MB优惠5%
    }
    
    // 小数据传输正常价格
    return 1.0;
  }

  /**
   * 获取网络速度要求倍数
   */
  private async getNetworkSpeedMultiplier(): Promise<number> {
    try {
      // 获取当前网络状态
      const networkStatus = await this.getCurrentNetworkStatus();
      
      switch (networkStatus.speed) {
        case 'high':
          return 1.2; // 高速网络加价20%
        case 'medium':
          return 1.0; // 中速网络正常价格
        case 'low':
          return 0.8; // 低速网络优惠20%
        default:
          return 1.0;
      }
    } catch (error) {
      console.error('获取网络速度状态失败:', error);
      return 1.0;
    }
  }

  /**
   * 获取优先级倍数
   */
  private getPriorityMultiplier(isEmergency?: boolean): number {
    if (isEmergency) {
      return 1.5; // 紧急传输加价50%
    }
    return 1.0;
  }

  /**
   * 获取当前网络状态
   */
  private async getCurrentNetworkStatus(): Promise<{
    speed: 'high' | 'medium' | 'low',
    latency: number,
    throughput: number
  }> {
    // 模拟网络状态检测
    // 实际项目中可以调用TRON网络API
    const hour = new Date().getHours();
    
    let speed: 'high' | 'medium' | 'low' = 'medium';
    let latency = 100; // ms
    let throughput = 1000; // Mbps
    
    // 根据时间段模拟网络状态
    if (hour >= 2 && hour <= 6) {
      // 深夜网络较好
      speed = 'high';
      latency = 50;
      throughput = 2000;
    } else if ((hour >= 8 && hour <= 10) || (hour >= 19 && hour <= 21)) {
      // 高峰时段网络较差
      speed = 'low';
      latency = 200;
      throughput = 500;
    }
    
    return { speed, latency, throughput };
  }

  /**
   * 计算数据传输成本
   */
  async calculateDataTransferCost(
    dataSize: number, // 字节
    transferType: 'upload' | 'download' | 'bidirectional' = 'bidirectional',
    priority: 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<{
    cost: number,
    estimatedTime: number, // 秒
    recommendations: string[]
  }> {
    const input: CalculationInput = {
      type: 'bandwidth',
      amount: dataSize,
      quantity: 1,
      isEmergency: priority === 'urgent'
    };
    
    const result = await this.calculateBandwidthPrice(input);
    
    // 计算预估传输时间
    const networkStatus = await this.getCurrentNetworkStatus();
    const estimatedTime = this.calculateTransferTime(dataSize, networkStatus.throughput, transferType);
    
    // 生成建议
    const recommendations = this.generateTransferRecommendations(
      dataSize,
      transferType,
      priority,
      networkStatus
    );
    
    return {
      cost: result.finalPrice,
      estimatedTime,
      recommendations
    };
  }

  /**
   * 计算传输时间
   */
  private calculateTransferTime(
    dataSize: number,
    throughputMbps: number,
    transferType: 'upload' | 'download' | 'bidirectional'
  ): number {
    const dataSizeMb = dataSize / (1024 * 1024);
    const effectiveThroughput = transferType === 'bidirectional' ? 
      throughputMbps * 0.5 : throughputMbps;
    
    return Math.ceil(dataSizeMb / effectiveThroughput);
  }

  /**
   * 生成传输建议
   */
  private generateTransferRecommendations(
    dataSize: number,
    transferType: string,
    priority: string,
    networkStatus: any
  ): string[] {
    const recommendations: string[] = [];
    const dataSizeMB = dataSize / (1024 * 1024);
    
    // 数据大小建议
    if (dataSizeMB > 50) {
      recommendations.push('建议分批传输大文件，每批不超过50MB');
    }
    
    // 时间段建议
    const hour = new Date().getHours();
    if ((hour >= 8 && hour <= 10) || (hour >= 19 && hour <= 21)) {
      recommendations.push('当前是网络高峰时段，建议在深夜(2-6点)传输以获得更好的速度和价格');
    }
    
    // 优先级建议
    if (priority === 'urgent' && dataSizeMB > 10) {
      recommendations.push('紧急传输大文件会产生较高费用，请确认是否必要');
    }
    
    // 网络状态建议
    if (networkStatus.speed === 'low') {
      recommendations.push('当前网络状态较差，建议稍后重试或选择非紧急传输');
    }
    
    return recommendations;
  }

  /**
   * 获取带宽价格历史
   */
  async getBandwidthPriceHistory(
    packageId?: string,
    days: number = 30
  ): Promise<Array<{date: string, price: number}>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      let sql = `
        SELECT 
          DATE(created_at) as date,
          AVG(final_price / (quantity * amount)) as avg_price_per_mb
        FROM price_history 
        WHERE entity_type = 'bandwidth'
          AND created_at >= ?
      `;
      const params: any[] = [startDate];
      
      if (packageId) {
        sql += ' AND entity_id = ?';
        params.push(packageId);
      }
      
      sql += `
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      
      const result = await query(sql, params);
      
      return result.map(row => ({
        date: row.date,
        price: parseFloat(row.avg_price_per_mb)
      }));
    } catch (error) {
      console.error('获取带宽价格历史失败:', error);
      return [];
    }
  }

  /**
   * 优化带宽使用建议
   */
  async getOptimizationSuggestions(
    plannedDataSize: number,
    budget: number
  ): Promise<{
    suggestions: string[],
    alternativeOptions: Array<{
      dataSize: number,
      cost: number,
      savingsPercentage: number
    }>
  }> {
    const suggestions: string[] = [];
    const alternativeOptions: Array<any> = [];
    
    // 计算当前方案成本
    const currentCost = await this.calculateBandwidthPrice({
      type: 'bandwidth',
      amount: plannedDataSize,
      quantity: 1
    });
    
    // 如果超出预算
    if (currentCost.finalPrice > budget) {
      suggestions.push(`当前方案需要 ${this.formatPrice(currentCost.finalPrice)}，超出预算 ${this.formatPrice(currentCost.finalPrice - budget)}`);
      
      // 生成预算内的替代方案
      const maxAffordableSize = Math.floor(plannedDataSize * (budget / currentCost.finalPrice));
      
      if (maxAffordableSize > 0) {
        const altCost = await this.calculateBandwidthPrice({
          type: 'bandwidth',
          amount: maxAffordableSize,
          quantity: 1
        });
        
        alternativeOptions.push({
          dataSize: maxAffordableSize,
          cost: altCost.finalPrice,
          savingsPercentage: Math.round((1 - altCost.finalPrice / currentCost.finalPrice) * 100)
        });
        
        suggestions.push(`建议将数据量降至 ${(maxAffordableSize / (1024 * 1024)).toFixed(2)}MB，可控制在预算内`);
      }
    }
    
    // 分批传输建议
    if (plannedDataSize > 10 * 1024 * 1024) { // 10MB
      const batchSize = 5 * 1024 * 1024; // 5MB per batch
      const batches = Math.ceil(plannedDataSize / batchSize);
      
      suggestions.push(`建议分 ${batches} 批传输，每批 ${(batchSize / (1024 * 1024)).toFixed(2)}MB，可享受批量优惠`);
    }
    
    // 时间优化建议
    const offPeakMultiplier = 0.8;
    const offPeakCost = currentCost.finalPrice * offPeakMultiplier;
    
    if (offPeakCost < currentCost.finalPrice) {
      suggestions.push(`在深夜时段(2-6点)传输可节省约 ${Math.round((1 - offPeakMultiplier) * 100)}% 的费用`);
      
      alternativeOptions.push({
        dataSize: plannedDataSize,
        cost: offPeakCost,
        savingsPercentage: Math.round((1 - offPeakMultiplier) * 100)
      });
    }
    
    return { suggestions, alternativeOptions };
  }
}
