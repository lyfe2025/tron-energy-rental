/**
 * 能量池同步控制器
 * 职责：处理能量池余额同步功能
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.ts';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 批量同步能量池余额
 * POST /api/energy-pools-extended/batch-sync
 * 权限：管理员
 */
export const batchSyncBalances: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { pool_ids, force_sync = false } = req.body;
    
    let poolsToSync;
    
    if (pool_ids && Array.isArray(pool_ids) && pool_ids.length > 0) {
      // 同步指定的能量池
      const poolsResult = await query(
        `SELECT id, name, tron_address, network_id, auto_sync_enabled 
         FROM energy_pools 
         WHERE id = ANY($1) AND status = 'active'`,
        [pool_ids]
      );
      poolsToSync = poolsResult.rows;
    } else {
      // 同步所有启用自动同步的能量池
      const poolsResult = await query(
        `SELECT id, name, tron_address, network_id, auto_sync_enabled 
         FROM energy_pools 
         WHERE status = 'active' AND (auto_sync_enabled = true OR $1 = true)
         ORDER BY last_sync_at ASC NULLS FIRST
         LIMIT 50`,
        [force_sync]
      );
      poolsToSync = poolsResult.rows;
    }
    
    if (poolsToSync.length === 0) {
      res.status(200).json({
        success: true,
        message: '没有需要同步的能量池',
        data: {
          total_pools: 0,
          sync_results: []
        }
      });
      return;
    }
    
    const syncResults = [];
    
    for (const pool of poolsToSync) {
      const startTime = Date.now();
      let syncStatus = 'success';
      let errorMessage = '';
      let balanceData = {
        balance_trx: 0,
        balance_energy: 0,
        balance_bandwidth: 0
      };
      
      try {
        // 模拟余额查询
        // 在实际实现中，这里应该调用TRON网络API查询真实余额
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        
        // 模拟余额数据
        balanceData = {
          balance_trx: Math.floor(Math.random() * 10000),
          balance_energy: Math.floor(Math.random() * 1000000),
          balance_bandwidth: Math.floor(Math.random() * 5000)
        };
        
      } catch (error) {
        syncStatus = 'failed';
        errorMessage = error instanceof Error ? error.message : '同步失败';
      }
      
      const responseTime = Date.now() - startTime;
      
      // 更新能量池余额和同步状态
      await query(
        `UPDATE energy_pools 
         SET balance_trx = $1, balance_energy = $2, balance_bandwidth = $3,
             last_sync_at = CURRENT_TIMESTAMP, sync_status = $4,
             last_balance_check = CURRENT_TIMESTAMP,
             error_count = CASE WHEN $4 = 'success' THEN 0 ELSE error_count + 1 END,
             last_error = CASE WHEN $4 = 'failed' THEN $5 ELSE last_error END,
             last_error_at = CASE WHEN $4 = 'failed' THEN CURRENT_TIMESTAMP ELSE last_error_at END
         WHERE id = $6`,
        [
          balanceData.balance_trx,
          balanceData.balance_energy,
          balanceData.balance_bandwidth,
          syncStatus,
          errorMessage || null,
          pool.id
        ]
      );
      
      syncResults.push({
        pool_id: pool.id,
        pool_name: pool.name,
        sync_status: syncStatus,
        response_time_ms: responseTime,
        balance_data: syncStatus === 'success' ? balanceData : undefined,
        error_message: errorMessage || undefined
      });
    }
    
    const successCount = syncResults.filter(r => r.sync_status === 'success').length;
    const failedCount = syncResults.filter(r => r.sync_status === 'failed').length;
    
    res.status(200).json({
      success: true,
      message: `批量同步完成：成功 ${successCount} 个，失败 ${failedCount} 个`,
      data: {
        total_pools: syncResults.length,
        success_count: successCount,
        failed_count: failedCount,
        sync_results: syncResults,
        sync_time: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('批量同步能量池余额错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};


