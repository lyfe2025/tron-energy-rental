/**
 * 提取操作控制器
 */
import type { Request, Response } from 'express';
import { query } from '../../../database/index.js';
import { tronService } from '../../../services/tron.js';
import type { RouteHandler, WithdrawRequest } from '../types/stake.types.js';

export class WithdrawController {
  /**
   * 提取已解冻的资金
   */
  static withdraw: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { ownerAddress, networkId, accountId } = req.body as WithdrawRequest;
      
      // 验证参数
      if (!ownerAddress) {
        return res.status(400).json({ 
          success: false, 
          error: 'ownerAddress is required' 
        });
      }
      
      // 检查是否有可提取的资金
      const withdrawableQuery = `
        SELECT 
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM unfreeze_records 
        WHERE ($1::text IS NULL OR pool_account_id = $1) 
          AND status = 'unfrozen'
          AND available_time <= NOW()
      `;
      
      const withdrawableResult = await query(withdrawableQuery, [accountId || ownerAddress]);
      
      if (parseInt(withdrawableResult.rows[0].count) === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No withdrawable funds available',
          details: '没有可提取的资金，请确认解冻期已过'
        });
      }
      
      const totalAmount = parseFloat(withdrawableResult.rows[0].total_amount) || 0;
      
      // 执行提取
      const result = await tronService.withdrawExpireUnfreeze({ ownerAddress });
      
      if (result.success) {
        // 更新解质押记录状态
        try {
          const updateResult = await query(
            `UPDATE unfreeze_records 
             SET status = 'withdrawn', updated_at = NOW()
             WHERE ($1::text IS NULL OR pool_account_id = $1) 
               AND status = 'unfrozen'
               AND available_time <= NOW()`,
            [accountId || ownerAddress]
          );
          
          console.log(`已更新 ${updateResult.rowCount} 条解质押记录状态为已提取`);
        } catch (updateError: any) {
          console.error('更新解质押记录状态失败:', updateError);
          // 不阻断主流程，只记录日志
        }
        
        // 更新能量池统计
        if (accountId) {
          try {
            await query(
              `UPDATE energy_pools 
               SET withdrawn_amount = COALESCE(withdrawn_amount, 0) + $1,
                   last_stake_update = NOW()
               WHERE id = $2`,
              [totalAmount, accountId]
            );
          } catch (poolUpdateError: any) {
            console.error('更新能量池提取统计失败:', poolUpdateError);
            // 不阻断主流程，只记录日志
          }
        }
        
        res.json({ 
          success: true, 
          data: {
            ...result,
            withdrawnAmount: totalAmount,
            recordsUpdated: true
          }
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error || '提取失败',
          details: result.error
        });
      }
    } catch (error: any) {
      console.error('提取资金失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 获取可提取资金信息
   */
  static getWithdrawableInfo: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { address, poolId } = req.query;
      
      if (!address && !poolId) {
        return res.status(400).json({ 
          success: false, 
          error: 'address or poolId is required' 
        });
      }
      
      // 获取可提取资金详情
      const withdrawableQuery = `
        SELECT 
          id,
          amount,
          resource_type,
          unfreeze_time,
          available_time,
          status,
          created_at
        FROM unfreeze_records 
        WHERE ($1::text IS NULL OR pool_account_id = $1) 
          AND status IN ('unfrozen', 'withdrawable')
        ORDER BY available_time ASC
      `;
      
      const result = await query(withdrawableQuery, [poolId || address]);
      
      // 计算可提取统计
      const availableNow = result.rows.filter(row => new Date(row.available_time) <= new Date());
      const pendingWithdraw = result.rows.filter(row => new Date(row.available_time) > new Date());
      
      const totalAvailable = availableNow.reduce((sum, row) => sum + parseFloat(row.amount), 0);
      const totalPending = pendingWithdraw.reduce((sum, row) => sum + parseFloat(row.amount), 0);
      
      const summary = {
        totalWithdrawable: totalAvailable,
        totalPending: totalPending,
        availableRecords: availableNow.length,
        pendingRecords: pendingWithdraw.length,
        records: result.rows.map(row => ({
          id: row.id,
          amount: parseFloat(row.amount),
          resourceType: row.resource_type,
          unfreezeTime: row.unfreeze_time,
          availableTime: row.available_time,
          status: row.status,
          createdAt: row.created_at,
          canWithdraw: new Date(row.available_time) <= new Date()
        }))
      };
      
      res.json({ success: true, data: summary });
        return;
      
    } catch (error: any) {
      console.error('获取可提取资金信息失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 批量提取操作（扩展功能）
   */
  static batchWithdraw: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { addresses } = req.body;
      
      if (!Array.isArray(addresses) || addresses.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'addresses array is required and cannot be empty'
        });
      }
      
      const results = [];
      const errors = [];
      
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        try {
          // 检查可提取资金
          const withdrawableQuery = `
            SELECT COUNT(*) as count, SUM(amount) as total_amount
            FROM unfreeze_records 
            WHERE pool_account_id = $1 
              AND status = 'unfrozen'
              AND available_time <= NOW()
          `;
          
          const withdrawableResult = await query(withdrawableQuery, [address]);
          const count = parseInt(withdrawableResult.rows[0].count);
          const totalAmount = parseFloat(withdrawableResult.rows[0].total_amount) || 0;
          
          if (count === 0) {
            results.push({
              index: i,
              address,
              success: false,
              error: 'No withdrawable funds available'
            });
            continue;
          }
          
          // 执行提取
          const result = await tronService.withdrawExpireUnfreeze({ ownerAddress: address });
          
          results.push({
            index: i,
            address,
            success: result.success,
            data: result.success ? { ...result, withdrawnAmount: totalAmount } : null,
            error: result.error || null
          });
          
          // 更新记录状态
          if (result.success) {
            await query(
              `UPDATE unfreeze_records 
               SET status = 'withdrawn', updated_at = NOW()
               WHERE pool_account_id = $1 
                 AND status = 'unfrozen'
                 AND available_time <= NOW()`,
              [address]
            );
          }
        } catch (opError: any) {
          errors.push({
            index: i,
            address,
            error: opError.message
          });
        }
      }
      
      res.json({
        success: true,
        data: {
          results,
          errors,
          total: addresses.length,
          succeeded: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length + errors.length
        }
      });
      
    } catch (error: any) {
      console.error('批量提取失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };
}
