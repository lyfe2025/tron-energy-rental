/**
 * 代理操作控制器
 */
import type { Request, Response } from 'express';
import { tronService } from '../../../services/tron.js';
import type {
    DelegateOperationRequest,
    RouteHandler
} from '../types/stake.types.js';

export class DelegateController {
  /**
   * 代理资源
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
      
      // 执行代理
      const result = await tronService.delegateResource({
        ownerAddress,
        receiverAddress,
        balance,
        resource,
        lock: lock || false,
        lockPeriod: lockPeriod || 0
      });
      
      if (result.success) {
        // 代理成功，直接返回结果（不再存储到数据库，所有数据从TRON网络实时获取）
        
        res.json({ success: true, data: result });
        return;
      } else {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
    } catch (error: any) {
      console.error('代理资源失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 取消代理资源
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
      
      // 执行取消代理
      const result = await tronService.undelegateResource({
        ownerAddress,
        receiverAddress,
        balance,
        resource
      });
      
      if (result.success) {
        // 取消代理成功，直接返回结果（不再存储到数据库，所有数据从TRON网络实时获取）
        
        res.json({ success: true, data: result });
        return;
      } else {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
    } catch (error: any) {
      console.error('取消代理资源失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 批量代理操作（扩展功能）
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
          
          // 批量代理操作完成（不再存储到数据库，所有数据从TRON网络实时获取）
          if (result.success) {
            console.log(`✅ 批量代理操作成功 (index: ${i}) - 交易ID: ${result.txid}`);
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
      console.error('批量代理失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };
}
