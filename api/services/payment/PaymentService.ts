import { FlashRentPaymentService } from './FlashRentPaymentService';
import { PaymentMonitorService } from './PaymentMonitorService';
import { PaymentRiskService } from './PaymentRiskService';
import { PaymentStatsService } from './PaymentStatsService';
import type { PaymentStatistics, PaymentStatusResult, RiskAssessment } from './types';

export class PaymentService {
  private monitorService: PaymentMonitorService;
  private flashRentService: FlashRentPaymentService;
  private riskService: PaymentRiskService;
  private statsService: PaymentStatsService;

  constructor() {
    this.monitorService = new PaymentMonitorService();
    this.flashRentService = new FlashRentPaymentService();
    this.riskService = new PaymentRiskService();
    this.statsService = new PaymentStatsService();
  }

  // ===============================
  // 支付监控相关方法（委托给 PaymentMonitorService）
  // ===============================

  async createPaymentMonitor(orderId: string, expectedAmount: number, toAddress: string): Promise<boolean> {
    return await this.monitorService.createPaymentMonitor(orderId, expectedAmount, toAddress);
  }

  async stopMonitoring(paymentAddress: string): Promise<void> {
    return await this.monitorService.stopMonitoring(paymentAddress);
  }

  async manualConfirmPayment(orderId: string, txid: string): Promise<boolean> {
    return await this.monitorService.manualConfirmPayment(orderId, txid);
  }

  async confirmPaymentManually(orderId: string, txid: string): Promise<boolean> {
    return await this.monitorService.confirmPaymentManually(orderId, txid);
  }

  async cleanupExpiredMonitors(): Promise<void> {
    return await this.monitorService.cleanupExpiredMonitors();
  }

  getActiveMonitorsCount(): number {
    return this.monitorService.getActiveMonitorsCount();
  }

  stopAllMonitors(): void {
    return this.monitorService.stopAllMonitors();
  }

  // ===============================
  // 闪租支付相关方法（委托给 FlashRentPaymentService）
  // ===============================

  async handleFlashRentPayment(transaction: any, networkId: string): Promise<void> {
    return await this.flashRentService.handleFlashRentPayment(transaction, networkId);
  }

  // ===============================
  // 风险评估相关方法（委托给 PaymentRiskService）
  // ===============================

  async assessRisk(orderId: string, userId: string, amount: number): Promise<RiskAssessment> {
    return await this.riskService.assessRisk(orderId, userId, amount);
  }

  // ===============================
  // 统计和状态查询相关方法（委托给 PaymentStatsService）
  // ===============================

  async checkPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
    return await this.statsService.checkPaymentStatus(orderId);
  }

  async getPaymentStatistics(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<PaymentStatistics | null> {
    return await this.statsService.getPaymentStatistics(timeRange);
  }
}
