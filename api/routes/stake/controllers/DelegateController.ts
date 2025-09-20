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
   * 解析TRON错误消息为用户友好的提示
   */
  private static parseTronError(error: string): string {
    // 如果是十六进制编码的错误，先解码
    let decodedError = error;
    try {
      if (/^[0-9a-fA-F]+$/.test(error) && error.length > 10) {
        decodedError = Buffer.from(error, 'hex').toString('utf8');
        console.log('🔍 [parseTronError] 解码十六进制错误:', decodedError);
      }
    } catch (e) {
      console.log('⚠️ [parseTronError] 解码失败，使用原始错误');
    }

    // 解析常见的TRON错误消息
    if (decodedError.includes('delegateBalance must be less than or equal to available FreezeEnergyV2 balance')) {
      return '代理失败：账户可用的质押ENERGY余额不足，请先质押更多TRX获得ENERGY，或减少代理数量';
    }
    
    if (decodedError.includes('delegateBalance must be greater than or equal to 1 TRX')) {
      return '代理失败：代理数量必须至少为1 TRX';
    }
    
    if (decodedError.includes('delegateBalance must be less than or equal to available FreezeBandwidthV2 balance')) {
      return '代理失败：账户可用的质押BANDWIDTH余额不足，请先质押更多TRX获得BANDWIDTH，或减少代理数量';
    }
    
    if (decodedError.includes('account does not exist')) {
      return '代理失败：账户不存在或未激活';
    }
    
    if (decodedError.includes('Private key does not match address')) {
      return '代理失败：私钥与账户地址不匹配';
    }

    if (decodedError.includes('Invalid lock period')) {
      return '代理失败：锁定期设置无效';
    }

    if (decodedError.includes('Contract validate error')) {
      return `代理失败：TRON合约验证错误 - ${decodedError}`;
    }

    // 如果没有匹配的错误类型，返回解码后的原始错误
    return `代理失败：${decodedError}`;
  }

  /**
   * 代理资源
   */
  static delegate: RouteHandler = async (req: Request, res: Response) => {
    try {
      console.log('🚀 ==================== 资源代理流程开始 ====================');
      console.log('📝 [步骤0] 接收前端请求');
      console.log('🔍 原始请求体:', JSON.stringify(req.body, null, 2));
      
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
      
      console.log('📋 [步骤1] 参数解析结果:', {
        ownerAddress: `${ownerAddress} (发送方地址)`,
        receiverAddress: `${receiverAddress} (接收方地址)`,
        balance: `${balance} SUN (代理数量)`,
        resource: `${resource} (资源类型)`,
        lock: `${lock} (是否锁定)`,
        lockPeriod: `${lockPeriod} 天 (锁定期)`,
        networkId: `${networkId} (网络ID)`,
        accountId: `${accountId} (能量池账户ID)`
      });
      
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
      // 只有当明确提供 lockPeriod 且值大于 0 时才进行验证
      if (lockPeriod !== undefined && lockPeriod !== null && lockPeriod > 0) {
        if (lockPeriod < 0.000833) {
          return res.status(400).json({ 
            success: false, 
            error: 'lockPeriod must be at least 0.000833 hours (3 seconds, 1 block)' 
          });
        }

        // 如果提供了网络ID，获取官方API的最大限制
        if (networkId) {
          try {
            console.log(`[DelegateController] 验证代理期限，网络ID: ${networkId}, 期限: ${lockPeriod}小时`);
            
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
                // 将区块数转换为小时数进行比较（用户现在输入的是小时数）
                const maxHours = Math.floor(networkParams.maxDelegateLockPeriod * 3 / 3600);
                
                console.log(`[DelegateController] 官方API限制: ${maxHours}小时 (${networkParams.maxDelegateLockPeriod}区块)`);
                
                if (lockPeriod > maxHours) {
                  return res.status(400).json({ 
                    success: false, 
                    error: `lockPeriod cannot exceed ${maxHours} hours (TRON official limit for ${network.name})` 
                  });
                }
              }
            } else {
              console.warn(`[DelegateController] 网络ID ${networkId} 未找到或未激活`);
              // 网络未找到，使用保守限制（720小时 = 30天）
              if (lockPeriod > 720) {
                return res.status(400).json({ 
                  success: false, 
                  error: 'lockPeriod cannot exceed 720 hours (network not found, using default limit)' 
                });
              }
            }
          } catch (error: any) {
            console.warn(`[DelegateController] 无法获取网络参数进行验证: ${error.message}`);
            // 如果无法获取网络参数，使用保守的默认限制（720小时 = 30天）
            if (lockPeriod > 720) {
              return res.status(400).json({ 
                success: false, 
                error: 'lockPeriod cannot exceed 720 hours (fallback limit)' 
              });
            }
          }
        } else {
          // 没有提供网络ID时，使用保守的默认限制（720小时 = 30天）
          if (lockPeriod > 720) {
            return res.status(400).json({ 
              success: false, 
              error: 'lockPeriod cannot exceed 720 hours (default limit)' 
            });
          }
        }
      }

      // 🔧 步骤2: 根据networkId(网络ID)切换到正确的网络
      console.log('🌐 [步骤2] 开始网络切换流程');
      if (networkId) {
        console.log('🔄 切换到目标网络:', networkId);
        await tronService.switchToNetwork(networkId);
        console.log('✅ 网络切换完成');
      } else {
        console.log('⚠️ 未提供网络ID，使用默认网络');
      }

      // 🔧 步骤3: 如果有accountId(能量池账户ID)，获取对应的私钥
      console.log('🔑 [步骤3] 开始私钥配置流程');
      let privateKeyChanged = false;
      if (accountId) {
        console.log('🔍 正在查找能量池账户:', accountId);
        await tronService.setPoolAccountPrivateKey(accountId);
        privateKeyChanged = true;
        console.log('✅ 私钥配置完成');
      } else {
        console.log('⚠️ 未提供账户ID，使用默认私钥');
      }

      let result;
      try {
        console.log('🔨 [步骤4] 开始构建TRON交易');
        const delegateParams: any = {
          ownerAddress,
          receiverAddress,
          balance,
          resource,
          lock: lock || false
        };
        
        // 🔧 修正：只有在启用锁定且提供了有效lockPeriod时才传递
        if (lock && lockPeriod && lockPeriod > 0) {
          delegateParams.lockPeriod = lockPeriod;
        }
        
        console.log('📦 交易参数:', delegateParams);
        
        console.log('⚡ [步骤5] 执行代理操作 (构建→签名→广播)');
        // 执行代理
        result = await tronService.delegateResource(delegateParams);
        
        console.log('📊 [步骤6] 代理操作执行结果:', {
          success: result.success,
          txid: result.txid || '无',
          error: result.error || '无错误'
        });
        
        // 🔧 如果操作失败，解析TRON错误消息并提供友好提示
        if (!result.success && result.error) {
          const friendlyError = DelegateController.parseTronError(result.error);
          console.log('🔍 [步骤6.1] 错误消息友好化:', {
            原始错误: result.error,
            友好提示: friendlyError
          });
          result.error = friendlyError;
        }
      } finally {
        // 🔧 步骤3: 恢复默认私钥，确保不影响其他操作
        if (privateKeyChanged) {
          console.log('🔍 [DelegateController] 恢复默认私钥');
          await tronService.restoreDefaultPrivateKey();
        }
      }
      
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

      // 🔧 步骤1: 根据networkId(网络ID)切换到正确的网络  
      if (networkId) {
        console.log('🔍 [DelegateController] [取消代理] 切换到网络:', networkId);
        await tronService.switchToNetwork(networkId);
      }

      // 🔧 步骤2: 如果有accountId(能量池账户ID)，获取对应的私钥
      let privateKeyChanged = false;
      if (accountId) {
        console.log('🔍 [DelegateController] [取消代理] 获取能量池账户私钥:', accountId);
        await tronService.setPoolAccountPrivateKey(accountId);
        privateKeyChanged = true;
      }

      let result;
      try {
        // 执行取消代理
        result = await tronService.undelegateResource({
          ownerAddress,
          receiverAddress,
          balance,
          resource
        });
      } finally {
        // 🔧 步骤3: 恢复默认私钥，确保不影响其他操作
        if (privateKeyChanged) {
          console.log('🔍 [DelegateController] [取消代理] 恢复默认私钥');
          await tronService.restoreDefaultPrivateKey();
        }
      }
      
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
      
      // 获取第一个操作的参数来设置网络和私钥（假设批量操作都使用同一个网络和账户）
      const firstOperation = operations[0];
      let privateKeyChanged = false;
      
      // 🔧 步骤1: 根据第一个操作的networkId切换网络
      if (firstOperation?.networkId) {
        console.log('🔍 [DelegateController] [批量代理] 切换到网络:', firstOperation.networkId);
        await tronService.switchToNetwork(firstOperation.networkId);
      }
      
      // 🔧 步骤2: 如果有accountId，获取对应的私钥
      if (firstOperation?.accountId) {
        console.log('🔍 [DelegateController] [批量代理] 获取能量池账户私钥:', firstOperation.accountId);
        await tronService.setPoolAccountPrivateKey(firstOperation.accountId);
        privateKeyChanged = true;
      }

      try {
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
      } finally {
        // 🔧 恢复默认私钥
        if (privateKeyChanged) {
          console.log('🔍 [DelegateController] [批量代理] 恢复默认私钥');
          await tronService.restoreDefaultPrivateKey();
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
