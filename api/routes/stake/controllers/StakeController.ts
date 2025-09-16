/**
 * 质押操作控制器
 */
import type { Request, Response } from 'express';
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
      console.log('==================== STAKE CONTROLLER FREEZE 被调用 ====================');
      console.log('🔍 [StakeController] freeze方法被调用');
      console.log('🔍 [StakeController] 原始请求体:', JSON.stringify(req.body, null, 2));
      
      const { ownerAddress, frozenBalance, resource, networkId, accountId } = req.body as StakeOperationRequest;
      
      console.log('🔍 [StakeController] 解构后的参数:', {
        ownerAddress类型: typeof ownerAddress,
        ownerAddress值: ownerAddress,
        frozenBalance类型: typeof frozenBalance,
        frozenBalance值: frozenBalance,
        resource类型: typeof resource,
        resource值: resource,
        networkId值: networkId,
        accountId值: accountId,
        '说明': 'networkId=网络ID(tron_networks表), accountId=能量池账户ID(energy_pools表)'
      });
      
      // 验证参数
      if (!ownerAddress || !frozenBalance || !resource) {
        console.log('🔍 [StakeController] 参数验证失败 - 缺少必需参数');
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
      
      console.log('🔍 [StakeController] 准备执行质押操作:', {
        networkId类型: typeof networkId,
        networkId值: networkId,
        accountId类型: typeof accountId, 
        accountId值: accountId,
        '操作': '需要根据networkId(网络ID)切换网络，根据accountId(能量池账户ID)获取私钥'
      });

      // 🔧 步骤1: 根据networkId(网络ID)切换到正确的网络
      if (networkId) {
        console.log('🔍 [StakeController] 切换到网络:', networkId);
        await tronService.switchToNetwork(networkId);
      }

      // 🔧 步骤2: 如果有accountId(能量池账户ID)，获取对应的私钥
      let privateKeyChanged = false;
      if (accountId) {
        console.log('🔍 [StakeController] 获取能量池账户私钥:', accountId);
        await tronService.setPoolAccountPrivateKey(accountId);
        privateKeyChanged = true;
      }

      try {
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
        }
      } finally {
        // 🔧 步骤3: 恢复默认私钥，确保不影响其他操作
        if (privateKeyChanged) {
          console.log('🔍 [StakeController] 恢复默认私钥');
          await tronService.restoreDefaultPrivateKey();
        }
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
      const { ownerAddress, unfreezeBalance, resource, networkId, accountId } = req.body as StakeOperationRequest;
      
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
      
      // 🔧 步骤1: 根据networkId(网络ID)切换到正确的网络
      if (networkId) {
        console.log('🔍 [StakeController] [解质押] 切换到网络:', networkId);
        await tronService.switchToNetwork(networkId);
      }

      // 🔧 步骤2: 如果有accountId(能量池账户ID)，获取对应的私钥
      let privateKeyChanged = false;
      if (accountId) {
        console.log('🔍 [StakeController] [解质押] 获取能量池账户私钥:', accountId);
        await tronService.setPoolAccountPrivateKey(accountId);
        privateKeyChanged = true;
      }

      try {
        // 执行解质押
        const result = await tronService.unfreezeBalanceV2({
          ownerAddress,
          unfreezeBalance,
          resource
        });
      
      if (result.success) {
        // 解质押成功，直接返回结果（不再存储到数据库，所有数据从TRON网络实时获取）
        
          res.json({ success: true, data: result });
          return;
        } else {
          res.status(400).json({ success: false, error: result.error });
          return;
        }
      } finally {
        // 🔧 步骤3: 恢复默认私钥，确保不影响其他操作
        if (privateKeyChanged) {
          console.log('🔍 [StakeController] [解质押] 恢复默认私钥');
          await tronService.restoreDefaultPrivateKey();
        }
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
