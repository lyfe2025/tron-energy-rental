import { query } from '../database/index';
import { orderService } from './order';
import { tronService } from './tron';
import { UserService } from './user';

export interface PaymentMonitorConfig {
  checkInterval: number; // 检查间隔（毫秒）
  timeout: number; // 超时时间（毫秒）
  minConfirmations: number; // 最小确认数
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  txid?: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  confirmations: number;
  createdAt: string;
  confirmedAt?: string;
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  factors: string[];
  recommendation: 'approve' | 'review' | 'reject';
}

export class PaymentService {
  private orderService: typeof orderService;
  private userService: UserService;
  private monitoringTasks: Map<string, NodeJS.Timeout> = new Map();
  
  private config: PaymentMonitorConfig = {
    checkInterval: 10000, // 10秒
    timeout: 1800000, // 30分钟
    minConfirmations: 1
  };

  constructor() {
    this.orderService = orderService;
    this.userService = new UserService();
  }

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
          await this.handlePaymentConfirmed(orderId, paymentResult.txid!, paymentResult.amount);
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
  private async checkPayment(toAddress: string, expectedAmount: number): Promise<{
    found: boolean;
    txid?: string;
    amount?: number;
    confirmations?: number;
  }> {
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
      await this.orderService.handlePaymentConfirmed(parseInt(orderId), txid, amount);
      
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
      await this.orderService.updateOrderStatus(parseInt(orderId), 'cancelled');
      
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
      const order = await this.orderService.getOrderById(parseInt(orderId));
      if (!order) {
        console.error('Order not found:', orderId);
        return false;
      }

      // 停止自动监控
      this.stopPaymentMonitoring(orderId);
      
      // 确认支付
      await this.handlePaymentConfirmed(orderId, txid, order.price_trx);
      
      return true;
    } catch (error) {
      console.error('Failed to manually confirm payment:', error);
      return false;
    }
  }

  // 风险评估
  async assessRisk(orderId: string, userId: string, amount: number): Promise<RiskAssessment> {
    try {
      let riskScore = 0;
      const riskFactors: string[] = [];

      // 1. 检查用户历史 - 暂时跳过用户统计检查
      const userStats = null; // await this.userService.getUserStats(userId);
      if (userStats) {
        // 新用户风险较高
        if (userStats.total_orders < 3) {
          riskScore += 30;
          riskFactors.push('New user with limited history');
        }
        
        // 检查失败率
        const failureRate = userStats.total_orders > 0 
          ? (userStats.failed_orders / userStats.total_orders) * 100 
          : 0;
        
        if (failureRate > 20) {
          riskScore += 40;
          riskFactors.push('High failure rate in previous orders');
        }
      }

      // 2. 检查订单金额
      if (amount > 1000000) { // 超过100万TRX
        riskScore += 25;
        riskFactors.push('High value transaction');
      }

      // 3. 检查频率
      const recentOrders = await this.getRecentOrdersByUser(userId, 24); // 24小时内
      if (recentOrders.length > 5) {
        riskScore += 20;
        riskFactors.push('High frequency trading');
      }

      // 4. 检查时间模式
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 22) {
        riskScore += 10;
        riskFactors.push('Unusual trading hours');
      }

      // 确定风险等级
      let riskLevel: 'low' | 'medium' | 'high';
      let recommendation: 'approve' | 'review' | 'reject';

      if (riskScore <= 30) {
        riskLevel = 'low';
        recommendation = 'approve';
      } else if (riskScore <= 60) {
        riskLevel = 'medium';
        recommendation = 'review';
      } else {
        riskLevel = 'high';
        recommendation = 'reject';
      }

      return {
        riskLevel,
        score: riskScore,
        factors: riskFactors,
        recommendation
      };
    } catch (error) {
      console.error('Failed to assess risk:', error);
      return {
        riskLevel: 'high',
        score: 100,
        factors: ['Risk assessment failed'],
        recommendation: 'review'
      };
    }
  }

  // 获取用户最近订单
  private async getRecentOrdersByUser(userId: string, hours: number) {
    try {
      const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const result = await query(
        `SELECT id, created_at FROM orders 
         WHERE user_id = $1 AND created_at >= $2`,
        [userId, timeThreshold]
      );

      return result.rows || [];
    } catch (error) {
      console.error('Database error:', error);
      return [];
    }
  }

  // 检查支付状态
  async checkPaymentStatus(orderId: string) {
    try {
      const result = await query(
        `SELECT * FROM payment_transactions WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [orderId]
      );

      if (!result.rows || result.rows.length === 0) {
        return { status: 'not_found', message: 'Payment record not found' };
      }

      const payment = result.rows[0];
      return {
        status: payment.status,
        txid: payment.txid,
        amount: payment.amount,
        confirmations: payment.confirmations,
        created_at: payment.created_at,
        confirmed_at: payment.confirmed_at
      };
    } catch (error) {
      console.error('Failed to check payment status:', error);
      return { status: 'error', message: 'Failed to check payment status' };
    }
  }

  // 手动确认支付（别名方法）
  async confirmPaymentManually(orderId: string, txid: string): Promise<boolean> {
    return await this.manualConfirmPayment(orderId, txid);
  }

  // 获取支付统计
  async getPaymentStatistics(timeRange: 'day' | 'week' | 'month' = 'day') {
    try {
      let timeThreshold: string;
      const now = new Date();
      
      switch (timeRange) {
        case 'week':
          timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      }

      const result = await query(
        `SELECT status, amount FROM payment_transactions 
         WHERE created_at >= $1`,
        [timeThreshold]
      );

      const data = result.rows;

      const stats = {
        total: data.length,
        confirmed: data.filter(p => p.status === 'confirmed').length,
        pending: data.filter(p => p.status === 'pending').length,
        failed: data.filter(p => p.status === 'failed').length,
        expired: data.filter(p => p.status === 'expired').length,
        totalAmount: data.reduce((sum, p) => sum + p.amount, 0),
        confirmedAmount: data.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0)
      };

      stats['successRate'] = stats.total > 0 ? (stats.confirmed / stats.total) * 100 : 0;

      return stats;
    } catch (error) {
      console.error('Database error:', error);
      return null;
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
}

// 创建默认实例
export const paymentService = new PaymentService();
export default PaymentService;