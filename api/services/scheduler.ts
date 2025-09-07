import * as cron from 'node-cron';
import { query } from '../database/index';
import { energyDelegationService } from './energy-delegation';
import { energyPoolService } from './energy-pool';

/**
 * 定时任务调度服务
 * 负责处理各种定时任务，如委托到期、支付超时等
 */
export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  
  /**
   * 启动所有定时任务
   */
  start(): void {
    console.log('Starting scheduler service...');
    
    // 每5分钟检查一次到期委托
    this.scheduleTask('expired-delegations', '*/5 * * * *', async () => {
      await this.processExpiredDelegations();
    });
    
    // 每10分钟检查一次支付超时
    this.scheduleTask('payment-timeouts', '*/10 * * * *', async () => {
      await this.processPaymentTimeouts();
    });
    
    // 每小时刷新能量池状态
    this.scheduleTask('refresh-pools', '0 * * * *', async () => {
      await this.refreshEnergyPools();
    });
    
    // 每天凌晨2点清理过期数据
    this.scheduleTask('cleanup-expired', '0 2 * * *', async () => {
      await this.cleanupExpiredData();
    });
    
    console.log('Scheduler service started successfully');
  }
  
  /**
   * 停止所有定时任务
   */
  stop(): void {
    console.log('Stopping scheduler service...');
    
    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`Stopped task: ${name}`);
    }
    
    this.tasks.clear();
    console.log('Scheduler service stopped');
  }
  
  /**
   * 调度单个任务
   */
  private scheduleTask(name: string, cronExpression: string, handler: () => Promise<void>): void {
    try {
      const task = cron.schedule(cronExpression, async () => {
        try {
          console.log(`Executing scheduled task: ${name}`);
          await handler();
          console.log(`Completed scheduled task: ${name}`);
        } catch (error) {
          console.error(`Error in scheduled task ${name}:`, error);
        }
      }, {
        timezone: 'Asia/Shanghai'
      });
      
      this.tasks.set(name, task);
      console.log(`Scheduled task: ${name} with cron: ${cronExpression}`);
    } catch (error) {
      console.error(`Failed to schedule task ${name}:`, error);
    }
  }
  
  /**
   * 处理到期委托
   */
  private async processExpiredDelegations(): Promise<void> {
    try {
      console.log('Processing expired delegations...');
      
      // 获取所有到期的委托
      const result = await query(
        `SELECT id FROM delegate_records 
         WHERE status = $1 AND expires_at < $2 
         LIMIT 50`,
        ['active', new Date()]
      );
      
      // 错误通过异常处理，这里不需要检查 result.error
      
      const expiredDelegations = result.rows;
      if (!expiredDelegations || expiredDelegations.length === 0) {
        console.log('No expired delegations found');
        return;
      }
      
      console.log(`Found ${expiredDelegations.length} expired delegations`);
      
      // 批量处理到期委托
      let processed = 0;
      let failed = 0;
      
      for (const delegation of expiredDelegations) {
        try {
          await energyDelegationService.handleDelegationExpiry(delegation.id);
          processed++;
        } catch (error) {
          console.error(`Failed to process delegation ${delegation.id}:`, error);
          failed++;
        }
      }
      
      console.log(`Processed expired delegations: ${processed} success, ${failed} failed`);
    } catch (error) {
      console.error('Error processing expired delegations:', error);
    }
  }
  
  /**
   * 处理支付超时
   */
  private async processPaymentTimeouts(): Promise<void> {
    try {
      console.log('Processing payment timeouts...');
      
      // 获取超时的支付监控
      const result = await query(
        `SELECT id, order_id FROM payment_monitors 
         WHERE status = $1 AND timeout_at < $2 
         LIMIT 50`,
        ['monitoring', new Date()]
      );
      
      // 错误通过异常处理，这里不需要检查 result.error
      
      const timeoutMonitors = result.rows;
      if (!timeoutMonitors || timeoutMonitors.length === 0) {
        console.log('No payment timeouts found');
        return;
      }
      
      console.log(`Found ${timeoutMonitors.length} payment timeouts`);
      
      // 处理超时支付
      for (const monitor of timeoutMonitors) {
        try {
          // 更新监控状态为超时
          await query(
            `UPDATE payment_monitors 
             SET status = $1, updated_at = $2 
             WHERE id = $3`,
            ['timeout', new Date(), monitor.id]
          );
          
          // 取消相关订单
          const { orderService } = await import('./order');
          await orderService.updateOrderStatus(monitor.order_id, 'cancelled');
          
          console.log(`Processed payment timeout for order: ${monitor.order_id}`);
        } catch (error) {
          console.error(`Failed to process payment timeout ${monitor.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing payment timeouts:', error);
    }
  }
  
  /**
   * 刷新能量池状态
   */
  private async refreshEnergyPools(): Promise<void> {
    try {
      console.log('Refreshing energy pools...');
      
      // 获取所有活跃的能量池
      const result = await query(
        `SELECT id FROM energy_pools WHERE status = $1`,
        ['active']
      );
      
      // 错误通过异常处理，这里不需要检查 result.error
      
      const pools = result.rows;
      if (!pools || pools.length === 0) {
        console.log('No active energy pools found');
        return;
      }
      
      console.log(`Refreshing ${pools.length} energy pools`);
      
      // 刷新每个池的状态
      for (const pool of pools) {
        try {
          await energyPoolService.refreshPoolStatus();
        } catch (error) {
          console.error(`Failed to refresh pool ${pool.id}:`, error);
        }
      }
      
      console.log('Energy pools refresh completed');
    } catch (error) {
      console.error('Error refreshing energy pools:', error);
    }
  }
  
  /**
   * 清理过期数据
   */
  private async cleanupExpiredData(): Promise<void> {
    try {
      console.log('Cleaning up expired data...');
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // 清理过期的支付监控记录（7天前）
      const paymentResult = await query(
        `DELETE FROM payment_monitors 
         WHERE status = ANY($1) AND created_at < $2`,
        [['completed', 'timeout', 'cancelled'], sevenDaysAgo]
      );
      
      console.log('Cleaned up expired payment monitors');
      
      // 清理过期的能量预留记录（7天前）
      const reservationResult = await query(
        `DELETE FROM energy_reservations 
         WHERE status = $1 AND created_at < $2`,
        ['released', sevenDaysAgo]
      );
      
      console.log('Cleaned up expired energy reservations');
      
      // 清理过期的委托监控记录（30天前）
      const monitorResult = await query(
        `DELETE FROM delegation_monitors 
         WHERE status = $1 AND created_at < $2`,
        ['completed', thirtyDaysAgo]
      );
      
      console.log('Cleaned up expired delegation monitors');
      
      console.log('Data cleanup completed');
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
    }
  }
  
  /**
   * 手动触发任务
   */
  async triggerTask(taskName: string): Promise<boolean> {
    try {
      console.log(`Manually triggering task: ${taskName}`);
      
      switch (taskName) {
        case 'expired-delegations':
          await this.processExpiredDelegations();
          break;
        case 'payment-timeouts':
          await this.processPaymentTimeouts();
          break;
        case 'refresh-pools':
          await this.refreshEnergyPools();
          break;
        case 'cleanup-expired':
          await this.cleanupExpiredData();
          break;
        default:
          console.error(`Unknown task: ${taskName}`);
          return false;
      }
      
      console.log(`Task ${taskName} completed successfully`);
      return true;
    } catch (error) {
      console.error(`Error triggering task ${taskName}:`, error);
      return false;
    }
  }
  
  /**
   * 获取任务状态
   */
  getTaskStatus(): { name: string; running: boolean }[] {
    return Array.from(this.tasks.entries()).map(([name, task]) => ({
      name,
      running: task.getStatus() === 'scheduled'
    }));
  }
}

// 创建默认实例
export const schedulerService = new SchedulerService();

// 在应用启动时自动启动调度器
if (process.env.NODE_ENV !== 'test') {
  schedulerService.start();
  
  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('Received SIGINT, stopping scheduler...');
    schedulerService.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, stopping scheduler...');
    schedulerService.stop();
    process.exit(0);
  });
}