import { query } from '../../database/index';
import { UserService } from '../user';
import type { RecentOrder, RiskAssessment } from './types';

export class PaymentRiskService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
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
  private async getRecentOrdersByUser(userId: string, hours: number): Promise<RecentOrder[]> {
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
}
