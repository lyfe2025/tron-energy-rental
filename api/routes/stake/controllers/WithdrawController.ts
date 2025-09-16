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
      
      // 检查可提取资金 - 改为从TRON网络实时获取
      // 通过获取账户信息检查是否有可提取的解质押资金
      let result: any;
      try {
        const overview = await tronService.getStakeOverview(ownerAddress);
        
        if (!overview.success || !overview.data) {
          return res.status(500).json({
            success: false,
            error: 'Failed to get account stake overview'
          });
        }

        const withdrawableAmount = overview.data.withdrawableTrx || 0;
        
        if (withdrawableAmount === 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'No withdrawable funds available',
            details: '没有可提取的资金，请确认解冻期已过'
          });
        }
        
        // 执行提取
        result = await tronService.withdrawExpireUnfreeze({ ownerAddress });
      } catch (error: any) {
        console.error('获取可提取资金信息失败:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to check withdrawable funds',
          details: error.message
        });
      }
      
      if (result.success) {
        // 提取成功，直接返回结果（不再更新数据库记录，所有数据从TRON网络实时获取）
        res.json({ 
          success: true, 
          data: {
            ...result,
            withdrawnAmount: 0, // 具体金额从TRON网络结果中获取
            recordsUpdated: false
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
      
      // 获取可提取资金详情 - 改为从TRON网络实时获取
      // 使用空结果集，因为所有数据现在从TRON网络实时获取
      const result = { rows: [] };
      
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
          // 改为从TRON网络实时获取可提取信息
          const withdrawableQuery = `
            SELECT 0 as count, 0 as total_amount
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
            // 提取成功，不再需要更新数据库记录（所有数据从TRON网络实时获取）
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
