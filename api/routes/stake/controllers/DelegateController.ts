/**
 * 委托操作控制器
 */
import type { Request, Response } from 'express';
import { query } from '../../../database/index.js';
import { tronService } from '../../../services/tron.js';
import type {
    DelegateOperationRequest,
    RouteHandler
} from '../types/stake.types.js';

export class DelegateController {
  /**
   * 委托资源
   */
  static delegate: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { 
        ownerAddress, 
        receiverAddress, 
        balance, 
        resource, 
        lock, 
        lockPeriod, 
        networkId,
        accountId 
      } = req.body as DelegateOperationRequest;
      
      // 验证参数
      if (!ownerAddress || !receiverAddress || !balance || !resource) {
        return res.status(400).json({ 
          success: false, 
          error: 'ownerAddress, receiverAddress, balance, and resource are required' 
        });
      }
      
      if (!['ENERGY', 'BANDWIDTH'].includes(resource)) {
        return res.status(400).json({ 
          success: false, 
          error: 'resource must be ENERGY or BANDWIDTH' 
        });
      }
      
      if (balance <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'balance must be greater than 0' 
        });
      }
      
      // 执行委托
      const result = await tronService.delegateResource({
        ownerAddress,
        receiverAddress,
        balance,
        resource,
        lock: lock || false,
        lockPeriod: lockPeriod || 0
      });
      
      if (result.success) {
        // 记录委托记录
        try {
          await query(
            `INSERT INTO delegate_records (
              tx_hash, pool_account_id, receiver_address, amount,
              resource_type, operation_type, lock_period, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
            [result.txid, accountId || null, receiverAddress, balance, resource.toUpperCase(), 'delegate', lockPeriod || 0]
          );
        } catch (dbError: any) {
          console.error('记录委托记录失败:', dbError);
          // 不阻断主流程，只记录日志
        }
        
        // 更新能量池统计
        if (accountId) {
          try {
            const updateField = resource === 'ENERGY' ? 'delegated_energy' : 'delegated_bandwidth';
            await query(
              `UPDATE energy_pools 
               SET ${updateField} = COALESCE(${updateField}, 0) + $1,
                   last_stake_update = NOW()
               WHERE id = $2`,
              [balance, accountId]
            );
          } catch (updateError: any) {
            console.error('更新能量池统计失败:', updateError);
            // 不阻断主流程，只记录日志
          }
        }
        
        res.json({ success: true, data: result });
        return;
      } else {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
    } catch (error: any) {
      console.error('委托资源失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 取消委托资源
   */
  static undelegate: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { 
        ownerAddress, 
        receiverAddress, 
        balance, 
        resource, 
        networkId,
        accountId 
      } = req.body as DelegateOperationRequest;
      
      // 验证参数
      if (!ownerAddress || !receiverAddress || !balance || !resource) {
        return res.status(400).json({ 
          success: false, 
          error: 'ownerAddress, receiverAddress, balance, and resource are required' 
        });
      }
      
      if (!['ENERGY', 'BANDWIDTH'].includes(resource)) {
        return res.status(400).json({ 
          success: false, 
          error: 'resource must be ENERGY or BANDWIDTH' 
        });
      }
      
      if (balance <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'balance must be greater than 0' 
        });
      }
      
      // 执行取消委托
      const result = await tronService.undelegateResource({
        ownerAddress,
        receiverAddress,
        balance,
        resource
      });
      
      if (result.success) {
        // 记录取消委托记录
        try {
          await query(
            `INSERT INTO delegate_records (
              tx_hash, pool_account_id, receiver_address, amount,
              resource_type, operation_type, lock_period, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
            [result.txid, accountId || null, receiverAddress, balance, resource.toUpperCase(), 'undelegate', 0]
          );
        } catch (dbError: any) {
          console.error('记录取消委托记录失败:', dbError);
          // 不阻断主流程，只记录日志
        }
        
        // 更新能量池统计
        if (accountId) {
          try {
            const updateField = resource === 'ENERGY' ? 'delegated_energy' : 'delegated_bandwidth';
            await query(
              `UPDATE energy_pools 
               SET ${updateField} = GREATEST(COALESCE(${updateField}, 0) - $1, 0),
                   last_stake_update = NOW()
               WHERE id = $2`,
              [balance, accountId]
            );
          } catch (updateError: any) {
            console.error('更新能量池统计失败:', updateError);
            // 不阻断主流程，只记录日志
          }
        }
        
        res.json({ success: true, data: result });
        return;
      } else {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
    } catch (error: any) {
      console.error('取消委托资源失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 批量委托操作（扩展功能）
   */
  static batchDelegate: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { operations } = req.body;
      
      if (!Array.isArray(operations) || operations.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'operations array is required and cannot be empty'
        });
      }
      
      const results = [];
      const errors = [];
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        try {
          const result = await tronService.delegateResource({
            ownerAddress: operation.ownerAddress,
            receiverAddress: operation.receiverAddress,
            balance: operation.balance,
            resource: operation.resource,
            lock: operation.lock || false,
            lockPeriod: operation.lockPeriod || 0
          });
          
          results.push({
            index: i,
            success: result.success,
            data: (result as any).data || null,
            error: result.error || null
          });
          
          // 记录委托记录和更新统计
          if (result.success) {
            try {
              await query(
                `INSERT INTO delegate_records (
                  tx_hash, pool_account_id, receiver_address, amount,
                  resource_type, operation_type, lock_period, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
                [result.txid, operation.poolId || null, operation.receiverAddress, operation.balance, operation.resource.toUpperCase(), 'delegate', operation.lockPeriod || 0]
              );
              
              if (operation.poolId) {
                const updateField = operation.resource === 'ENERGY' ? 'delegated_energy' : 'delegated_bandwidth';
                await query(
                  `UPDATE energy_pools 
                   SET ${updateField} = COALESCE(${updateField}, 0) + $1,
                       last_stake_update = NOW()
                   WHERE id = $2`,
                  [operation.balance, operation.poolId]
                );
              }
            } catch (dbError: any) {
              console.error(`批量委托记录数据库操作失败 (index: ${i}):`, dbError);
            }
          }
        } catch (opError: any) {
          errors.push({
            index: i,
            error: opError.message
          });
        }
      }
      
      res.json({
        success: true,
        data: {
          results,
          errors,
          total: operations.length,
          succeeded: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length + errors.length
        }
      });
      
    } catch (error: any) {
      console.error('批量委托失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };
}
