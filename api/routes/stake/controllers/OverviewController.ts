/**
 * 质押概览和统计控制器
 */
import type { Request, Response } from 'express';
import { query } from '../../../database/index.js';
import { tronService } from '../../../services/tron.js';
import type {
  RouteHandler,
  StakeQueryParams,
  StakeStatistics
} from '../types/stake.types.js';

export class OverviewController {
  /**
   * 获取质押概览
   */
  static getOverview: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { address, poolId, networkId: queryNetworkId } = req.query as StakeQueryParams;
      
      let targetAddress = address as string;
      
      // 如果提供了poolId，从数据库获取对应的地址
      let networkId: string | null = queryNetworkId as string || null;
      if (poolId && typeof poolId === 'string') {
        const poolQuery = 'SELECT tron_address FROM energy_pools WHERE id = $1';
        const poolResult = await query(poolQuery, [poolId]);
        
        if (poolResult.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: '能量池不存在',
            details: `未找到ID为 ${poolId} 的能量池` 
          });
        }
        
        targetAddress = poolResult.rows[0].tron_address;
        // 账户支持所有网络，使用传入的networkId参数
      }
      
      if (!targetAddress || typeof targetAddress !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: '缺少必要参数',
          details: '请提供 address 或 poolId 参数' 
        });
      }

      // 如果账户配置了特定网络，切换到该网络
      if (networkId) {
        try {
          await tronService.switchToNetwork(networkId);
        } catch (error: any) {
          console.warn(`切换到网络 ${networkId} 失败，使用默认网络:`, error.message);
        }
      }

      const result = await tronService.getStakeOverview(targetAddress);
      
      if (result.success) {
        res.json({ success: true, data: result.data });
        return;
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error || 'TRON网络调用失败',
          details: result.error 
        });
      }
    } catch (error: any) {
      console.error('获取质押概览失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message,
        type: 'server_error'
      });
    }
  };

  /**
   * 获取质押统计信息
   */
  static getStatistics: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { pool_id, poolId, networkId: queryNetworkId } = req.query as StakeQueryParams;
      
      // 支持两种参数名称：pool_id 和 poolId
      const targetPoolId = poolId || pool_id;
      
      // 如果提供了poolId，验证能量池是否存在
      let networkId: string | null = queryNetworkId as string || null;
      if (targetPoolId && typeof targetPoolId === 'string') {
        const poolQuery = 'SELECT id FROM energy_pools WHERE id = $1';
        const poolResult = await query(poolQuery, [targetPoolId]);
        
        if (poolResult.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: '能量池不存在',
            details: `未找到ID为 ${targetPoolId} 的能量池` 
          });
        }
        
        // 账户支持所有网络，不再依赖数据库中的network_id
      }
      
      // 如果账户配置了特定网络，切换到该网络
      if (networkId) {
        try {
          await tronService.switchToNetwork(networkId);
        } catch (error: any) {
          console.warn(`切换到网络 ${networkId} 失败，使用默认网络:`, error.message);
        }
      }
      
      // 质押统计已改为从TRON网络实时获取，这里提供默认统计结构
      const statsQuery = `
        SELECT 
          0 as total_stakes,
          0 as total_staked,
          0 as total_unstaked,
          0 as energy_stakes,
          0 as bandwidth_stakes
      `;
      
      // 委托统计已改为从TRON网络实时获取
      const delegateStatsQuery = `
        SELECT 
          0 as total_delegates,
          0 as total_delegated,
          0 as energy_delegates,
          0 as bandwidth_delegates
      `;
      
      const [stakeStats, delegateStats] = await Promise.all([
        query(statsQuery),
        query(delegateStatsQuery)
      ]);
      
      const statistics: StakeStatistics = {
        // 质押统计
        total_stakes: parseInt(stakeStats.rows[0]?.total_stakes) || 0,
        total_staked: parseFloat(stakeStats.rows[0]?.total_staked) || 0,
        total_unstaked: parseFloat(stakeStats.rows[0]?.total_unstaked) || 0,
        energy_stakes: parseInt(stakeStats.rows[0]?.energy_stakes) || 0,
        bandwidth_stakes: parseInt(stakeStats.rows[0]?.bandwidth_stakes) || 0,
        
        // 委托统计
        total_delegates: parseInt(delegateStats.rows[0]?.total_delegates) || 0,
        total_delegated: parseFloat(delegateStats.rows[0]?.total_delegated) || 0,
        energy_delegates: parseInt(delegateStats.rows[0]?.energy_delegates) || 0,
        bandwidth_delegates: parseInt(delegateStats.rows[0]?.bandwidth_delegates) || 0
      };
      
      res.json({ 
        success: true, 
        data: statistics 
      });
      
    } catch (error: any) {
      console.error('获取质押统计失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message,
        type: 'server_error'
      });
    }
  };

  /**
   * 获取账户资源信息
   */
  static getAccountResources: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const { networkId } = req.query;
      
      if (!address) {
        return res.status(400).json({ 
          success: false, 
          error: '缺少地址参数',
          details: '请在URL中提供TRON地址'
        });
      }

      // 如果指定了网络ID，切换到该网络
      if (networkId && typeof networkId === 'string') {
        try {
          await tronService.switchToNetwork(networkId);
        } catch (error: any) {
          console.warn(`切换到网络 ${networkId} 失败，使用默认网络:`, error.message);
        }
      }

      const result = await tronService.getAccountResources(address);
      
      if (result.success) {
        res.json({ success: true, data: result.data });
        return;
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error || '获取账户资源失败',
          details: result.error
        });
      }
    } catch (error: any) {
      console.error('获取账户资源失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message
      });
    }
  };

  /**
   * 获取账户信息
   */
  static getAccountInfo: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const { networkId } = req.query;
      
      if (!address) {
        return res.status(400).json({ 
          success: false, 
          error: '缺少地址参数',
          details: '请在URL中提供TRON地址'
        });
      }

      // 如果指定了网络ID，切换到该网络
      if (networkId && typeof networkId === 'string') {
        try {
          await tronService.switchToNetwork(networkId);
        } catch (error: any) {
          console.warn(`切换到网络 ${networkId} 失败，使用默认网络:`, error.message);
        }
      }

      const result = await tronService.getAccount(address);
      
      if (result.success) {
        res.json({ success: true, data: result.data });
        return;
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error || '获取账户信息失败',
          details: result.error
        });
      }
    } catch (error: any) {
      console.error('获取账户信息失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message
      });
    }
  };
}
