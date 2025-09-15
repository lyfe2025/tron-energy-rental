/**
 * 质押操作控制器
 */
import type { Request, Response } from 'express';
import { query } from '../../../database/index.js';
import { tronService } from '../../../services/tron.js';
import type {
    RouteHandler,
    StakeOperationRequest
} from '../types/stake.types.js';

export class StakeController {
  /**
   * 质押TRX
   */
  static freeze: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { ownerAddress, frozenBalance, resource, poolId } = req.body as StakeOperationRequest;
      
      // 验证参数
      if (!ownerAddress || !frozenBalance || !resource) {
        res.status(400).json({ 
          success: false, 
          error: 'ownerAddress, frozenBalance, and resource are required' 
        });
        return;
      }
      
      if (!['ENERGY', 'BANDWIDTH'].includes(resource)) {
        res.status(400).json({ 
          success: false, 
          error: 'resource must be ENERGY or BANDWIDTH' 
        });
      }
      
      if (frozenBalance <= 0) {
        res.status(400).json({ 
          success: false, 
          error: 'frozenBalance must be greater than 0' 
        });
      }
      
      // 执行质押
      const result = await tronService.freezeBalanceV2({
        ownerAddress,
        frozenBalance,
        resource
      });
      
      if (result.success) {
        res.json({ success: true, data: result });
        return;
      } else {
        res.status(400).json({ success: false, error: result.error });
        return;
        return;
      }
    } catch (error: any) {
      console.error('质押失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 解质押TRX
   */
  static unfreeze: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { ownerAddress, unfreezeBalance, resource, poolId } = req.body as StakeOperationRequest;
      
      // 验证参数
      if (!ownerAddress || !unfreezeBalance || !resource) {
        res.status(400).json({ 
          success: false, 
          error: 'ownerAddress, unfreezeBalance, and resource are required' 
        });
      }
      
      if (!['ENERGY', 'BANDWIDTH'].includes(resource)) {
        res.status(400).json({ 
          success: false, 
          error: 'resource must be ENERGY or BANDWIDTH' 
        });
      }
      
      if (unfreezeBalance <= 0) {
        res.status(400).json({ 
          success: false, 
          error: 'unfreezeBalance must be greater than 0' 
        });
      }
      
      // 执行解质押
      const result = await tronService.unfreezeBalanceV2({
        ownerAddress,
        unfreezeBalance,
        resource
      });
      
      if (result.success) {
        // 记录解质押记录
        try {
          await query(
            `INSERT INTO unfreeze_records (
              unfreeze_tx_hash, pool_account_id, amount, resource_type,
              unfreeze_time, available_time, status, created_at
            ) VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '14 days', 'unfrozen', NOW())`,
            [result.txid, poolId || null, unfreezeBalance, resource.toLowerCase()]
          );
        } catch (dbError: any) {
          console.error('记录解质押记录失败:', dbError);
          // 不阻断主流程，只记录日志
        }
        
        // 更新能量池统计
        if (poolId) {
          try {
            const updateField = resource === 'ENERGY' ? 'pending_unfreeze_energy' : 'pending_unfreeze_bandwidth';
            await query(
              `UPDATE energy_pools 
               SET ${updateField} = COALESCE(${updateField}, 0) + $1,
                   last_stake_update = NOW()
               WHERE id = $2`,
              [unfreezeBalance, poolId]
            );
          } catch (updateError: any) {
            console.error('更新能量池统计失败:', updateError);
            // 不阻断主流程，只记录日志
          }
        }
        
        res.json({ success: true, data: result });
        return;
        return;
      } else {
        res.status(400).json({ success: false, error: result.error });
        return;
        return;
      }
    } catch (error: any) {
      console.error('解质押失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 批量质押操作（扩展功能）
   */
  static batchFreeze: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { operations } = req.body;
      
      if (!Array.isArray(operations) || operations.length === 0) {
        res.status(400).json({
          success: false,
          error: 'operations array is required and cannot be empty'
        });
      }
      
      const results = [];
      const errors = [];
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        try {
          const result = await tronService.freezeBalanceV2({
            ownerAddress: operation.ownerAddress,
            frozenBalance: operation.frozenBalance,
            resource: operation.resource
          });
          
          results.push({
            index: i,
            success: result.success,
            data: (result as any).data || null,
            error: result.error || null
          });
          
          // 质押完成，无需更新数据库统计（使用实时数据）
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
      console.error('批量质押失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };
}
