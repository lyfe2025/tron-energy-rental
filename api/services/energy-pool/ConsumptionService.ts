import { query } from '../../database/index';

export interface DailyConsumption {
  consumption_date: string;
  pool_account_id: string;
  account_name: string;
  account_type: string;
  total_consumed_energy: number;
  total_cost: number;
  transaction_count: number;
}

export interface TodayConsumptionSummary {
  total_consumed_energy: number;
  total_revenue: number; // 改为收入
  total_transactions: number;
  average_price: number; // 新增平均单价
  account_breakdown: DailyConsumption[];
}

export interface ConsumptionReport {
  period: { start: Date; end: Date };
  totalConsumption: number;
  totalCost: number;
  averageDaily: number;
  peakDay: { date: string; consumption: number };
  accountBreakdown: Array<{
    accountId: string;
    accountName: string;
    consumption: number;
    cost: number;
    percentage: number;
  }>;
}

export class ConsumptionService {
  constructor() {
    // 初始化消耗服务
  }

  /**
   * 获取今日消耗统计
   */
  async getTodayConsumption(): Promise<TodayConsumptionSummary> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const sql = `
        SELECT 
          consumption_date,
          pool_account_id,
          account_name,
          account_type,
          total_consumed_energy,
          total_cost,
          transaction_count
        FROM daily_energy_consumption 
        WHERE consumption_date = $1
        ORDER BY total_consumed_energy DESC
      `;
      
      const result = await query(sql, [today]);
      const dailyData: DailyConsumption[] = result.rows;
      
      // 计算总计（服务商视角）
      const totalConsumedEnergy = dailyData.reduce((sum, item) => sum + Number(item.total_consumed_energy), 0);
      const totalRevenue = dailyData.reduce((sum, item) => sum + Number(item.total_cost), 0); // 这里实际是收入
      const totalTransactions = dailyData.reduce((sum, item) => sum + Number(item.transaction_count), 0);
      const averagePrice = totalConsumedEnergy > 0 ? totalRevenue / totalConsumedEnergy : 0;
      
      const summary: TodayConsumptionSummary = {
        total_consumed_energy: totalConsumedEnergy,
        total_revenue: totalRevenue, // 改为收入
        total_transactions: totalTransactions,
        average_price: averagePrice, // 新增平均单价
        account_breakdown: dailyData
      };
      
      return summary;
    } catch (error) {
      console.error('获取今日消耗统计失败:', error);
      throw new Error(`获取今日消耗统计失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取指定时间范围的消耗报告
   */
  async getConsumptionReport(startDate: Date, endDate: Date): Promise<ConsumptionReport> {
    try {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      
      // 获取期间总体统计
      const totalSql = `
        SELECT 
          COALESCE(SUM(total_consumed_energy), 0) as total_consumption,
          COALESCE(SUM(total_cost), 0) as total_cost,
          COALESCE(SUM(transaction_count), 0) as total_transactions,
          COUNT(DISTINCT consumption_date) as days_count
        FROM daily_energy_consumption 
        WHERE consumption_date BETWEEN $1 AND $2
      `;
      
      const totalResult = await query(totalSql, [start, end]);
      const totalStats = totalResult.rows[0];
      
      // 获取峰值日统计
      const peakSql = `
        SELECT 
          consumption_date,
          SUM(total_consumed_energy) as daily_consumption
        FROM daily_energy_consumption 
        WHERE consumption_date BETWEEN $1 AND $2
        GROUP BY consumption_date
        ORDER BY daily_consumption DESC
        LIMIT 1
      `;
      
      const peakResult = await query(peakSql, [start, end]);
      const peakDay = peakResult.rows[0] || { consumption_date: start, daily_consumption: 0 };
      
      // 获取账户分解统计
      const accountSql = `
        SELECT 
          pool_account_id,
          account_name,
          SUM(total_consumed_energy) as consumption,
          SUM(total_cost) as cost
        FROM daily_energy_consumption 
        WHERE consumption_date BETWEEN $1 AND $2
        GROUP BY pool_account_id, account_name
        ORDER BY consumption DESC
      `;
      
      const accountResult = await query(accountSql, [start, end]);
      const totalConsumption = Number(totalStats.total_consumption);
      
      const accountBreakdown = accountResult.rows.map((row: any) => ({
        accountId: row.pool_account_id,
        accountName: row.account_name,
        consumption: Number(row.consumption),
        cost: Number(row.cost),
        percentage: totalConsumption > 0 ? (Number(row.consumption) / totalConsumption) * 100 : 0
      }));
      
      const report: ConsumptionReport = {
        period: { start: startDate, end: endDate },
        totalConsumption,
        totalCost: Number(totalStats.total_cost),
        averageDaily: totalConsumption / Math.max(Number(totalStats.days_count), 1),
        peakDay: {
          date: peakDay.consumption_date,
          consumption: Number(peakDay.daily_consumption)
        },
        accountBreakdown
      };
      
      return report;
    } catch (error) {
      console.error('获取消耗报告失败:', error);
      throw new Error(`获取消耗报告失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取历史消耗趋势
   */
  async getConsumptionTrend(days: number = 30): Promise<Array<{
    date: string;
    consumption: number;
    cost: number;
    transactionCount: number;
  }>> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const sql = `
        SELECT 
          consumption_date as date,
          COALESCE(SUM(total_consumed_energy), 0) as consumption,
          COALESCE(SUM(total_cost), 0) as cost,
          COALESCE(SUM(transaction_count), 0) as transaction_count
        FROM daily_energy_consumption 
        WHERE consumption_date BETWEEN $1 AND $2
        GROUP BY consumption_date
        ORDER BY consumption_date ASC
      `;
      
      const result = await query(sql, [
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ]);
      
      return result.rows.map((row: any) => ({
        date: row.date,
        consumption: Number(row.consumption),
        cost: Number(row.cost),
        transactionCount: Number(row.transaction_count)
      }));
    } catch (error) {
      console.error('获取消耗趋势失败:', error);
      throw new Error('获取消耗趋势失败');
    }
  }

  /**
   * 获取账户消耗排行榜
   */
  async getTopConsumingAccounts(limit: number = 10, days: number = 30): Promise<Array<{
    accountId: string;
    accountName: string;
    totalConsumption: number;
    totalCost: number;
    averageDaily: number;
    transactionCount: number;
  }>> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const sql = `
        SELECT 
          pool_account_id as account_id,
          account_name,
          SUM(total_consumed_energy) as total_consumption,
          SUM(total_cost) as total_cost,
          AVG(total_consumed_energy) as average_daily,
          SUM(transaction_count) as transaction_count
        FROM daily_energy_consumption 
        WHERE consumption_date BETWEEN $1 AND $2
        GROUP BY pool_account_id, account_name
        ORDER BY total_consumption DESC
        LIMIT $3
      `;
      
      const result = await query(sql, [
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        limit
      ]);
      
      return result.rows.map((row: any) => ({
        accountId: row.account_id,
        accountName: row.account_name,
        totalConsumption: Number(row.total_consumption),
        totalCost: Number(row.total_cost),
        averageDaily: Number(row.average_daily),
        transactionCount: Number(row.transaction_count)
      }));
    } catch (error) {
      console.error('获取账户排行榜失败:', error);
      throw new Error('获取账户排行榜失败');
    }
  }

  /**
   * 记录能量消耗日志
   */
  async logEnergyConsumption(data: {
    pool_account_id: string;
    transaction_type: 'reserve' | 'release' | 'confirm';
    energy_amount: number;
    cost_amount?: number;
    transaction_id?: string;
    user_id?: string;
    notes?: string;
  }): Promise<void> {
    try {
      const sql = `
        INSERT INTO energy_consumption_logs (
          id, pool_account_id, transaction_type, energy_amount, 
          cost_amount, transaction_id, user_id, notes, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        )
      `;
      
      await query(sql, [
        data.pool_account_id,
        data.transaction_type,
        data.energy_amount,
        data.cost_amount || 0,
        data.transaction_id,
        data.user_id,
        data.notes
      ]);
    } catch (error) {
      console.error('记录能量消耗失败:', error);
      throw new Error(`记录能量消耗失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成消耗汇总（通常用于定时任务）
   */
  async generateDailySummary(date?: Date): Promise<void> {
    try {
      const targetDate = date || new Date();
      const dateStr = targetDate.toISOString().split('T')[0];
      
      // 检查是否已经存在该日期的汇总
      const existingCheck = `
        SELECT COUNT(*) as count 
        FROM daily_energy_consumption 
        WHERE consumption_date = $1
      `;
      const existingResult = await query(existingCheck, [dateStr]);
      
      if (Number(existingResult.rows[0].count) > 0) {
        console.log(`Daily summary for ${dateStr} already exists, skipping...`);
        return;
      }
      
      // 生成日汇总
      const summarySql = `
        INSERT INTO daily_energy_consumption (
          consumption_date, pool_account_id, account_name, account_type,
          total_consumed_energy, total_cost, transaction_count
        )
        SELECT 
          $1 as consumption_date,
          ecl.pool_account_id,
          ep.name as account_name,
          ep.account_type,
          COALESCE(SUM(CASE WHEN ecl.transaction_type = 'confirm' THEN ecl.energy_amount END), 0) as total_consumed_energy,
          COALESCE(SUM(CASE WHEN ecl.transaction_type = 'confirm' THEN ecl.cost_amount END), 0) as total_cost,
          COUNT(CASE WHEN ecl.transaction_type = 'confirm' THEN 1 END) as transaction_count
        FROM energy_consumption_logs ecl
        LEFT JOIN energy_pools ep ON ecl.pool_account_id = ep.id
        WHERE DATE(ecl.created_at) = $1
        GROUP BY ecl.pool_account_id, ep.name, ep.account_type
        HAVING COALESCE(SUM(CASE WHEN ecl.transaction_type = 'confirm' THEN ecl.energy_amount END), 0) > 0
      `;
      
      await query(summarySql, [dateStr]);
      console.log(`Generated daily summary for ${dateStr}`);
    } catch (error) {
      console.error('生成日汇总失败:', error);
      throw new Error('生成日汇总失败');
    }
  }

  /**
   * 清理旧的消耗日志（保留指定天数）
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<{
    deletedCount: number;
  }> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const deleteSql = `
        DELETE FROM energy_consumption_logs 
        WHERE created_at < $1
      `;
      
      const result = await query(deleteSql, [cutoffDate]);
      
      console.log(`Cleaned up ${result.rowCount} old consumption logs`);
      return { deletedCount: result.rowCount || 0 };
    } catch (error) {
      console.error('清理旧日志失败:', error);
      throw new Error('清理旧日志失败');
    }
  }

  /**
   * 获取消耗统计概览
   */
  async getConsumptionOverview(): Promise<{
    today: TodayConsumptionSummary;
    thisWeek: { consumption: number; revenue: number }; // 改为收入
    thisMonth: { consumption: number; revenue: number }; // 改为收入
    topAccounts: Array<{ name: string; consumption: number }>;
  }> {
    try {
      // 今日统计
      const today = await this.getTodayConsumption();
      
      // 本周统计
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekReport = await this.getConsumptionReport(weekStart, new Date());
      
      // 本月统计
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthReport = await this.getConsumptionReport(monthStart, new Date());
      
      // 热门账户
      const topAccounts = await this.getTopConsumingAccounts(5, 7);
      
      return {
        today,
        thisWeek: { 
          consumption: weekReport.totalConsumption, 
          revenue: weekReport.totalCost // 这里实际是收入
        },
        thisMonth: { 
          consumption: monthReport.totalConsumption, 
          revenue: monthReport.totalCost // 这里实际是收入
        },
        topAccounts: topAccounts.map(acc => ({ 
          name: acc.accountName, 
          consumption: acc.totalConsumption 
        }))
      };
    } catch (error) {
      console.error('获取消耗概览失败:', error);
      throw new Error('获取消耗概览失败');
    }
  }
}

// 创建默认实例
export const consumptionService = new ConsumptionService();
