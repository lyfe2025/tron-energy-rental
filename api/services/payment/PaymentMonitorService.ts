import { query } from '../../database/index';
import { tronService } from '../tron';
import type { PaymentCheckResult, PaymentMonitorConfig } from './types';
import { getOrderService } from './utils';

export class PaymentMonitorService {
  private monitoringTasks: Map<string, NodeJS.Timeout> = new Map();
  
  private config: PaymentMonitorConfig = {
    checkInterval: 10000, // 10秒
    timeout: 1800000, // 30分钟
    minConfirmations: 1
  };

  // 创建支付监控任务
  async createPaymentMonitor(orderId: string, expectedAmount: number, toAddress: string): Promise<boolean> {
    try {
      // 检查是否已存在监控任务
      if (this.monitoringTasks.has(orderId)) {
        console.log(`Payment monitor already exists for order: ${orderId}`);
        return true;
      }

      // 创建支付记录
      const result = await query(
        `INSERT INTO payment_monitors (
          order_id, to_address, amount, status, confirmations, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, toAddress, expectedAmount, 'pending', 0, new Date()]
      );

      // 启动监控任务
      this.startPaymentMonitoring(orderId, expectedAmount, toAddress);
      
      return true;
    } catch (error) {
      console.error('Failed to create payment monitor:', error);
      return false;
    }
  }

  // 启动支付监控
  private startPaymentMonitoring(orderId: string, expectedAmount: number, toAddress: string): void {
    const startTime = Date.now();
    
    const monitorTask = setInterval(async () => {
      try {
        // 检查超时
        if (Date.now() - startTime > this.config.timeout) {
          await this.handlePaymentTimeout(orderId);
          this.stopPaymentMonitoring(orderId);
          return;
        }

        // 检查支付
        const paymentResult = await this.checkPayment(toAddress, expectedAmount);
        
        if (paymentResult.found) {
          await this.handlePaymentConfirmed(orderId, paymentResult.txid!, paymentResult.amount!);
          this.stopPaymentMonitoring(orderId);
        }
      } catch (error) {
        console.error(`Payment monitoring error for order ${orderId}:`, error);
      }
    }, this.config.checkInterval);

    this.monitoringTasks.set(orderId, monitorTask);
    console.log(`Started payment monitoring for order: ${orderId}`);
  }

  // 停止支付监控
  private stopPaymentMonitoring(orderId: string): void {
    const task = this.monitoringTasks.get(orderId);
    if (task) {
      clearInterval(task);
      this.monitoringTasks.delete(orderId);
      console.log(`Stopped payment monitoring for order: ${orderId}`);
    }
  }

  // 公共方法：停止监控
  async stopMonitoring(paymentAddress: string): Promise<void> {
    // 根据支付地址查找订单ID
    try {
      const result = await query(
        'SELECT order_id FROM payment_monitors WHERE to_address = $1 AND status = $2',
        [paymentAddress, 'pending']
      );
      
      if (result.rows && result.rows.length > 0) {
        const orderId = result.rows[0].order_id;
        this.stopPaymentMonitoring(orderId);
        
        // 更新数据库状态
        await query(
          'UPDATE payment_monitors SET status = $1 WHERE to_address = $2',
          ['cancelled', paymentAddress]
        );
      }
    } catch (error) {
      console.error('Stop monitoring error:', error);
    }
  }

  // 检查支付
  private async checkPayment(toAddress: string, expectedAmount: number): Promise<PaymentCheckResult> {
    try {
      // 获取地址的最近交易
      const transactions = await tronService.getTransactionsFromAddress(toAddress, 10, 0);
      
      for (const tx of transactions) {
        if (tx.raw_data?.contract?.[0]?.type === 'TransferContract') {
          const contract = tx.raw_data.contract[0];
          const amount = contract.parameter.value.amount;
          
          // 检查金额是否匹配（允许5%的误差）
          if (amount >= expectedAmount * 0.95 && amount <= expectedAmount * 1.05) {
            // 获取交易确认数
            const txInfo = await tronService.getTransaction(tx.txID);
            const confirmations = txInfo.success ? (txInfo.data.confirmations || 0) : 0;
            
            return {
              found: true,
              txid: tx.txID,
              amount: amount,
              confirmations: confirmations
            };
          }
        }
      }
      
      return { found: false };
    } catch (error) {
      console.error('Failed to check payment:', error);
      return { found: false };
    }
  }

  // 处理支付确认
  private async handlePaymentConfirmed(orderId: string, txid: string, amount: number): Promise<void> {
    try {
      // 更新支付记录
      await query(
        `UPDATE payment_transactions 
         SET txid = $1, status = $2, confirmed_at = $3 
         WHERE order_id = $4`,
        [txid, 'confirmed', new Date(), orderId]
      );

      // 更新订单状态
      const orderService = await getOrderService();
      await orderService.handlePaymentConfirmed(orderId, txid, amount);
      
      console.log(`Payment confirmed for order ${orderId}: ${txid}`);
    } catch (error) {
      console.error('Failed to handle payment confirmation:', error);
    }
  }

  // 处理支付超时
  private async handlePaymentTimeout(orderId: string): Promise<void> {
    try {
      // 更新支付记录
      await query(
        `UPDATE payment_transactions 
         SET status = $1 
         WHERE order_id = $2`,
        ['expired', orderId]
      );

      // 取消订单
      const orderService = await getOrderService();
      await orderService.updateOrderStatus(parseInt(orderId), 'cancelled');
      
      console.log(`Payment timeout for order: ${orderId}`);
    } catch (error) {
      console.error('Failed to handle payment timeout:', error);
    }
  }

  // 手动确认支付
  async manualConfirmPayment(orderId: string, txid: string): Promise<boolean> {
    try {
      // 验证交易
      const txResult = await tronService.getTransaction(txid);
      if (!txResult.success) {
        console.error('Invalid transaction ID:', txid);
        return false;
      }

      // 获取订单信息
      const orderService = await getOrderService();
      const order = await orderService.getOrderById(orderId);
      if (!order) {
        console.error('Order not found:', orderId);
        return false;
      }

      // 停止自动监控
      this.stopPaymentMonitoring(orderId);
      
      // 确认支付
      await this.handlePaymentConfirmed(orderId, txid, order.price);
      
      return true;
    } catch (error) {
      console.error('Failed to manually confirm payment:', error);
      return false;
    }
  }

  // 清理过期的监控任务
  async cleanupExpiredMonitors(): Promise<void> {
    try {
      const expiredTime = new Date(Date.now() - this.config.timeout).toISOString();
      
      // 获取过期的支付记录
      const result = await query(
        `SELECT order_id FROM payment_transactions 
         WHERE status = $1 AND created_at < $2`,
        ['pending', expiredTime]
      );

      if (!result.rows) return;
      const expiredPayments = result.rows;

      // 停止监控任务并更新状态
      for (const payment of expiredPayments) {
        this.stopPaymentMonitoring(payment.order_id);
        await this.handlePaymentTimeout(payment.order_id);
      }

      console.log(`Cleaned up ${expiredPayments.length} expired payment monitors`);
    } catch (error) {
      console.error('Failed to cleanup expired monitors:', error);
    }
  }

  // 获取活跃监控任务数量
  getActiveMonitorsCount(): number {
    return this.monitoringTasks.size;
  }

  // 停止所有监控任务
  stopAllMonitors(): void {
    for (const [orderId, task] of this.monitoringTasks) {
      clearInterval(task);
    }
    this.monitoringTasks.clear();
    console.log('Stopped all payment monitors');
  }

  // 手动确认支付（别名方法）
  async confirmPaymentManually(orderId: string, txid: string): Promise<boolean> {
    return await this.manualConfirmPayment(orderId, txid);
  }
}
