/**
 * 能量池健康检查与统计控制器
 * 职责：处理能量池健康状态检查和统计数据收集
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.ts';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 能量池健康检查
 * POST /api/energy-pools-extended/:id/health-check
 * 权限：管理员
 */
export const performPoolHealthCheck: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取能量池信息
    const poolResult = await query(
      `SELECT 
        ep.id, ep.name, ep.tron_address, ep.network_id,
        ep.balance_trx, ep.balance_energy, ep.balance_bandwidth,
        tn.name as network_name, tn.rpc_url, tn.health_status as network_health
       FROM energy_pools ep
       LEFT JOIN tron_networks tn ON ep.network_id = tn.id
       WHERE ep.id = $1`,
      [id]
    );
    
    if (poolResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量池不存在'
      });
      return;
    }
    
    const pool = poolResult.rows[0];
    const startTime = Date.now();
    
    let healthStatus = 'healthy';
    let healthIssues: string[] = [];
    let balanceInfo = {
      balance_trx: pool.balance_trx || 0,
      balance_energy: pool.balance_energy || 0,
      balance_bandwidth: pool.balance_bandwidth || 0
    };
    
    try {
      // 模拟健康检查
      // 在实际实现中，这里应该进行真实的网络连接和余额检查
      
      // 检查网络连接
      if (pool.network_health !== 'healthy') {
        healthIssues.push('关联网络状态异常');
        healthStatus = 'warning';
      }
      
      // 检查余额
      if (balanceInfo.balance_trx < 100) {
        healthIssues.push('TRX余额过低');
        healthStatus = 'warning';
      }
      
      if (balanceInfo.balance_energy < 10000) {
        healthIssues.push('能量余额过低');
        if (healthStatus !== 'unhealthy') healthStatus = 'warning';
      }
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
      
    } catch (error) {
      healthStatus = 'unhealthy';
      healthIssues.push(error instanceof Error ? error.message : '健康检查失败');
    }
    
    const responseTime = Date.now() - startTime;
    
    // 更新健康状态
    await query(
      `UPDATE energy_pools 
       SET health_status = $1, last_health_check = CURRENT_TIMESTAMP,
           error_count = CASE WHEN $1 = 'healthy' THEN 0 ELSE error_count + 1 END
       WHERE id = $2`,
      [healthStatus, id]
    );
    
    res.status(200).json({
      success: true,
      message: '能量池健康检查完成',
      data: {
        pool_id: id,
        pool_name: pool.name,
        health_status: healthStatus,
        health_issues: healthIssues,
        response_time_ms: responseTime,
        balance_info: balanceInfo,
        network_info: {
          network_id: pool.network_id,
          network_name: pool.network_name,
          network_health: pool.network_health
        },
        check_time: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('能量池健康检查错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取能量池统计报告
 * GET /api/energy-pools-extended/statistics
 * 权限：管理员
 */
export const getPoolStatistics: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { network_id, account_group, time_range = '24h' } = req.query;
    
    // 构建查询条件
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (network_id) {
      conditions.push(`network_id = $${paramIndex}`);
      queryParams.push(network_id);
      paramIndex++;
    }
    
    if (account_group) {
      conditions.push(`account_group = $${paramIndex}`);
      queryParams.push(account_group);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 获取基础统计
    const statsQuery = `
      SELECT 
        COUNT(*) as total_pools,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_pools,
        COUNT(CASE WHEN health_status = 'healthy' THEN 1 END) as healthy_pools,
        COUNT(CASE WHEN health_status = 'warning' THEN 1 END) as warning_pools,
        COUNT(CASE WHEN health_status = 'unhealthy' THEN 1 END) as unhealthy_pools,
        SUM(balance_trx) as total_trx_balance,
        SUM(balance_energy) as total_energy_balance,
        SUM(balance_bandwidth) as total_bandwidth_balance,
        AVG(balance_trx) as avg_trx_balance,
        AVG(balance_energy) as avg_energy_balance
      FROM energy_pools
      ${whereClause}
    `;
    
    const statsResult = await query(statsQuery, queryParams);
    const stats = statsResult.rows[0];
    
    // 获取网络分布统计
    const networkStatsQuery = `
      SELECT 
        tn.name as network_name,
        tn.type as network_type,
        COUNT(ep.id) as pool_count,
        SUM(ep.balance_energy) as total_energy
      FROM energy_pools ep
      LEFT JOIN tron_networks tn ON ep.network_id = tn.id
      ${whereClause}
      GROUP BY tn.id, tn.name, tn.type
      ORDER BY pool_count DESC
    `;
    
    const networkStatsResult = await query(networkStatsQuery, queryParams);
    
    // 获取账户组分布统计
    const groupStatsQuery = `
      SELECT 
        account_group,
        COUNT(*) as pool_count,
        SUM(balance_energy) as total_energy,
        AVG(balance_energy) as avg_energy
      FROM energy_pools
      ${whereClause}
      GROUP BY account_group
      ORDER BY pool_count DESC
    `;
    
    const groupStatsResult = await query(groupStatsQuery, queryParams);
    
    res.status(200).json({
      success: true,
      message: '能量池统计报告获取成功',
      data: {
        overview: {
          total_pools: parseInt(stats.total_pools),
          active_pools: parseInt(stats.active_pools),
          healthy_pools: parseInt(stats.healthy_pools),
          warning_pools: parseInt(stats.warning_pools),
          unhealthy_pools: parseInt(stats.unhealthy_pools),
          health_rate: stats.total_pools > 0 ? (stats.healthy_pools / stats.total_pools * 100).toFixed(2) + '%' : '0%'
        },
        balance_summary: {
          total_trx_balance: parseFloat(stats.total_trx_balance) || 0,
          total_energy_balance: parseFloat(stats.total_energy_balance) || 0,
          total_bandwidth_balance: parseFloat(stats.total_bandwidth_balance) || 0,
          avg_trx_balance: parseFloat(stats.avg_trx_balance) || 0,
          avg_energy_balance: parseFloat(stats.avg_energy_balance) || 0
        },
        network_distribution: networkStatsResult.rows,
        group_distribution: groupStatsResult.rows,
        report_time: new Date().toISOString(),
        time_range: time_range
      }
    });
    
  } catch (error) {
    console.error('获取能量池统计报告错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};


