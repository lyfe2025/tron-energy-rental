/**
 * 代理操作控制器
 */
import type { Request, Response } from 'express';
import { tronService } from '../../../services/tron.js';
import { networkParametersService } from '../../../services/tron/services/NetworkParametersService.js';
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

      // 验证代理期限（基于TRON官方API限制）
      if (lockPeriod !== undefined && lockPeriod !== null) {
        if (lockPeriod < 0.01) {
          return res.status(400).json({ 
            success: false, 
            error: 'lockPeriod must be at least 0.01 days' 
          });
        }

        // 如果提供了网络ID，获取官方API的最大限制
        if (networkId) {
          try {
            console.log(`[DelegateController] 验证代理期限，网络ID: ${networkId}, 期限: ${lockPeriod}天`);
            
            // 查询网络信息
            const { pool } = req.app.locals;
            const networkResult = await pool.query(
              'SELECT * FROM tron_networks WHERE id = $1 AND is_active = true',
              [networkId]
            );

            if (networkResult.rows.length > 0) {
              const network = networkResult.rows[0];
              console.log(`[DelegateController] 找到网络: ${network.name} (${network.network_type})`);
              
              // 获取网络参数（包含官方API限制）
              const networkParams = await networkParametersService.getNetworkParams(
                network.network_type, 
                network.rpc_url, 
                network.name
              );

              if (networkParams.maxDelegateLockPeriod) {
                // 将区块数转换为天数进行比较
                const maxDays = Math.floor(networkParams.maxDelegateLockPeriod * 3 / 86400);
                
                console.log(`[DelegateController] 官方API限制: ${maxDays}天 (${networkParams.maxDelegateLockPeriod}区块)`);
                
                if (lockPeriod > maxDays) {
                  return res.status(400).json({ 
                    success: false, 
                    error: `lockPeriod cannot exceed ${maxDays} days (TRON official limit for ${network.name})` 
                  });
                }
              }
            } else {
              console.warn(`[DelegateController] 网络ID ${networkId} 未找到或未激活`);
              // 网络未找到，使用保守限制
              if (lockPeriod > 30) {
                return res.status(400).json({ 
                  success: false, 
                  error: 'lockPeriod cannot exceed 30 days (network not found, using default limit)' 
                });
              }
            }
          } catch (error: any) {
            console.warn(`[DelegateController] 无法获取网络参数进行验证: ${error.message}`);
            // 如果无法获取网络参数，使用保守的默认限制
            if (lockPeriod > 30) {
              return res.status(400).json({ 
                success: false, 
                error: 'lockPeriod cannot exceed 30 days (fallback limit)' 
              });
            }
          }
        } else {
          // 没有提供网络ID时，使用保守的默认限制
          if (lockPeriod > 30) {
            return res.status(400).json({ 
              success: false, 
              error: 'lockPeriod cannot exceed 30 days (default limit)' 
            });
          }
        }
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
