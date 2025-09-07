/**
 * 记录查询控制器
 */
import type { Request, Response } from 'express';
import { query } from '../../../database/index.js';
import { tronService } from '../../../services/tron.js';
import type {
  DelegateRecord,
  PaginatedResponse,
  RouteHandler,
  StakeQueryParams,
  StakeRecord,
  UnfreezeRecord
} from '../types/stake.types.js';

export class RecordsController {
  /**
   * 获取质押记录 (从TRON网络API)
   */
  static getStakeRecords: RouteHandler = async (req: Request, res: Response) => {
    console.log('[RecordsController] 🚀🚀🚀 质押记录API被调用');
    console.log('[RecordsController] 完整请求参数:', JSON.stringify(req.query, null, 2));
    
    try {
      const { 
        address, 
        poolId,
        pool_id, 
        networkId: queryNetworkId,
        page = '1', 
        limit = '20', 
        operation_type, 
        resource_type,
        startDate,
        endDate
      } = req.query as StakeQueryParams;
      
      const targetPoolId = poolId || pool_id;
      let targetAddress = address as string;
      let networkId: string | null = queryNetworkId as string || null;
      
      // 如果提供了poolId，从数据库获取对应的地址和网络配置
      if (targetPoolId && typeof targetPoolId === 'string') {
        const poolQuery = 'SELECT tron_address FROM energy_pools WHERE id = $1';
        const poolResult = await query(poolQuery, [targetPoolId]);
        
        if (poolResult.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: '能量池不存在',
            details: `未找到ID为 ${targetPoolId} 的能量池` 
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

      // 网络切换调试信息
      console.log(`[RecordsController] 🔍 networkId值检查: ${networkId}, 类型: ${typeof networkId}`);
      
      // 如果账户配置了特定网络，切换到该网络
      if (networkId) {
        try {
          console.log(`[RecordsController] 🔀 准备切换到网络: ${networkId}`);
          await tronService.switchToNetwork(networkId);
          console.log(`[RecordsController] ✅ 网络切换成功 - 当前网络: ${tronService.getCurrentNetwork()?.name}`);
        } catch (error: any) {
          console.warn(`切换到网络 ${networkId} 失败，使用默认网络:`, error.message);
        }
      } else {
        console.log(`[RecordsController] ⚠️ 没有提供networkId，使用默认网络`);
      }

      console.log(`[RecordsController] 开始获取质押记录，地址: ${targetAddress}, 限制: ${limit}`);
      
      // 从TRON网络获取真实的质押记录
      console.log('[RecordsController] 🌐🌐🌐 即将调用 tronService.getStakeTransactionHistory');
      console.log('[RecordsController] 调用参数:', { 
        targetAddress, 
        limit: parseInt(limit) * 2, 
        offset: (parseInt(page) - 1) * parseInt(limit),
        网络配置: tronService.getCurrentNetwork()?.name
      });
      
      const tronResult = await tronService.getStakeTransactionHistory(
        targetAddress, 
        parseInt(limit) * 2, // 获取更多记录以便过滤
        (parseInt(page) - 1) * parseInt(limit)
      );
      
      console.log(`[RecordsController] 🎯🎯🎯 TRON服务返回结果:`, { 
        success: tronResult.success, 
        dataLength: tronResult.data?.length, 
        error: tronResult.error,
        数据样本: tronResult.data?.slice(0, 2).map(item => ({
          id: item.id,
          operation_type: item.operation_type,
          resource_type: item.resource_type,
          amount: item.amount
        }))
      });
      
      if (!tronResult.success) {
        throw new Error(tronResult.error || '获取TRON质押记录失败');
      }

      let filteredRecords = tronResult.data || [];
      console.log(`[RecordsController] 过滤前记录数量: ${filteredRecords.length}`);

      // 应用过滤条件
      if (operation_type) {
        filteredRecords = filteredRecords.filter(record => 
          record.operation_type === operation_type
        );
      }

      if (resource_type) {
        filteredRecords = filteredRecords.filter(record => 
          record.resource_type === resource_type
        );
      }

      if (startDate) {
        const startTime = new Date(startDate as string);
        filteredRecords = filteredRecords.filter(record => 
          new Date(record.created_at) >= startTime
        );
      }

      if (endDate) {
        const endTime = new Date(endDate as string);
        filteredRecords = filteredRecords.filter(record => 
          new Date(record.created_at) <= endTime
        );
      }

      // 分页处理
      const startIndex = 0;
      const endIndex = parseInt(limit);
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
      
      const response: PaginatedResponse<StakeRecord> = {
        success: true,
        data: paginatedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredRecords.length,
          totalPages: Math.ceil(filteredRecords.length / parseInt(limit))
        }
      };
      
      res.json(response);
      return;
    } catch (error: any) {
      console.error('获取质押记录失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 获取委托记录 (从TRON网络API)
   */
  static getDelegateRecords: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { 
        address, 
        poolId,
        pool_id, 
        networkId: queryNetworkId,
        page = '1', 
        limit = '20', 
        operation_type, 
        resource_type,
        startDate,
        endDate
      } = req.query as StakeQueryParams;
      
      const targetPoolId = poolId || pool_id;
      let targetAddress = address as string;
      let networkId: string | null = queryNetworkId as string || null;
      
      // 如果提供了poolId，从数据库获取对应的地址和网络配置
      if (targetPoolId && typeof targetPoolId === 'string') {
        const poolQuery = 'SELECT tron_address FROM energy_pools WHERE id = $1';
        const poolResult = await query(poolQuery, [targetPoolId]);
        
        if (poolResult.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: '能量池不存在',
            details: `未找到ID为 ${targetPoolId} 的能量池` 
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

      // 从TRON网络获取真实的委托记录
      const tronResult = await tronService.getDelegateTransactionHistory(
        targetAddress, 
        parseInt(limit) * 2, // 获取更多记录以便过滤
        (parseInt(page) - 1) * parseInt(limit)
      );
      
      if (!tronResult.success) {
        throw new Error(tronResult.error || '获取TRON委托记录失败');
      }

      let filteredRecords = tronResult.data || [];

      // 应用过滤条件
      if (operation_type) {
        filteredRecords = filteredRecords.filter(record => 
          record.operation_type === operation_type
        );
      }

      if (resource_type) {
        filteredRecords = filteredRecords.filter(record => 
          record.resource_type === resource_type
        );
      }

      if (startDate) {
        const startTime = new Date(startDate as string);
        filteredRecords = filteredRecords.filter(record => 
          new Date(record.created_at) >= startTime
        );
      }

      if (endDate) {
        const endTime = new Date(endDate as string);
        filteredRecords = filteredRecords.filter(record => 
          new Date(record.created_at) <= endTime
        );
      }

      // 分页处理
      const startIndex = 0;
      const endIndex = parseInt(limit);
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

      // 转换为委托记录格式
      const delegateRecords = paginatedRecords.map((record: any) => ({
        id: record.id,
        txid: record.transaction_id,
        transaction_id: record.transaction_id,
        pool_id: record.pool_id,
        pool_account_id: record.pool_id,
        receiver_address: record.to_address || '',
        amount: record.amount,
        resource_type: record.resource_type,
        operation_type: record.operation_type,
        lock_period: 0, // TRON 2.0 没有锁定期
        is_locked: false,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.created_at
      }));
      
      const response: PaginatedResponse<DelegateRecord> = {
        success: true,
        data: delegateRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredRecords.length,
          totalPages: Math.ceil(filteredRecords.length / parseInt(limit))
        }
      };
      
      res.json(response);
      return;
    } catch (error: any) {
      console.error('获取委托记录失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 获取解冻记录 (从TRON网络API)
   */
  static getUnfreezeRecords: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { 
        address, 
        poolId,
        pool_id, 
        networkId: queryNetworkId,
        page = '1', 
        limit = '20',
        startDate,
        endDate
      } = req.query as StakeQueryParams;
      
      const targetPoolId = poolId || pool_id;
      let targetAddress = address as string;
      let networkId: string | null = queryNetworkId as string || null;
      
      // 如果提供了poolId，从数据库获取对应的地址和网络配置
      if (targetPoolId && typeof targetPoolId === 'string') {
        const poolQuery = 'SELECT tron_address FROM energy_pools WHERE id = $1';
        const poolResult = await query(poolQuery, [targetPoolId]);
        
        if (poolResult.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: '能量池不存在',
            details: `未找到ID为 ${targetPoolId} 的能量池` 
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

      // 从TRON网络获取真实的解质押记录
      const tronResult = await tronService.getUnfreezeTransactionHistory(
        targetAddress, 
        parseInt(limit) * 2, // 获取更多记录以便过滤
        (parseInt(page) - 1) * parseInt(limit)
      );
      
      if (!tronResult.success) {
        throw new Error(tronResult.error || '获取TRON解质押记录失败');
      }

      let filteredRecords = tronResult.data || [];

      // 应用日期过滤条件
      if (startDate) {
        const startTime = new Date(startDate as string);
        filteredRecords = filteredRecords.filter(record => 
          new Date(record.created_at) >= startTime
        );
      }

      if (endDate) {
        const endTime = new Date(endDate as string);
        filteredRecords = filteredRecords.filter(record => 
          new Date(record.created_at) <= endTime
        );
      }

      // 分页处理
      const startIndex = 0;
      const endIndex = parseInt(limit);
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
      
      // 添加状态计算和格式转换
      const processedRecords = paginatedRecords.map((record: any) => {
        const withdrawableTime = record.withdrawable_time ? new Date(record.withdrawable_time) : null;
        const now = new Date();
        
        return {
          ...record,
          canWithdraw: record.status === 'withdrawable' || (withdrawableTime && withdrawableTime <= now),
          daysUntilWithdrawable: (withdrawableTime && withdrawableTime > now) 
            ? Math.ceil((withdrawableTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0
        };
      });
      
      const response: PaginatedResponse<UnfreezeRecord> = {
        success: true,
        data: processedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredRecords.length,
          totalPages: Math.ceil(filteredRecords.length / parseInt(limit))
        }
      };
      
      res.json(response);
      return;
    } catch (error: any) {
      console.error('获取解冻记录失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };

  /**
   * 获取综合记录摘要
   */
  static getRecordsSummary: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { address, pool_id } = req.query as StakeQueryParams;
      
      if (!address && !pool_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'address or pool_id is required' 
        });
      }
      
      const targetId = pool_id || address;
      
      // 并行获取各种统计信息
      const [stakeStats, delegateStats, unfreezeStats] = await Promise.all([
        // 质押统计
        query(`
          SELECT 
            COUNT(*) as total_operations,
            COUNT(CASE WHEN operation_type = 'freeze' THEN 1 END) as freeze_count,
            COUNT(CASE WHEN operation_type = 'unfreeze' THEN 1 END) as unfreeze_count,
            SUM(CASE WHEN operation_type = 'freeze' THEN amount ELSE 0 END) as total_frozen,
            SUM(CASE WHEN operation_type = 'unfreeze' THEN amount ELSE 0 END) as total_unfrozen
          FROM stake_records 
          WHERE pool_account_id = $1 AND status = 'confirmed'
        `, [targetId]),
        
        // 委托统计
        query(`
          SELECT 
            COUNT(*) as total_operations,
            COUNT(CASE WHEN operation_type = 'delegate' THEN 1 END) as delegate_count,
            COUNT(CASE WHEN operation_type = 'undelegate' THEN 1 END) as undelegate_count,
            SUM(CASE WHEN operation_type = 'delegate' THEN amount ELSE 0 END) as total_delegated,
            SUM(CASE WHEN operation_type = 'undelegate' THEN amount ELSE 0 END) as total_undelegated
          FROM delegate_records 
          WHERE pool_account_id = $1 AND status = 'confirmed'
        `, [targetId]),
        
        // 解冻统计
        query(`
          SELECT 
            COUNT(*) as total_unfreezes,
            COUNT(CASE WHEN status = 'unfrozen' AND available_time <= NOW() THEN 1 END) as withdrawable_count,
            COUNT(CASE WHEN status = 'withdrawn' THEN 1 END) as withdrawn_count,
            SUM(CASE WHEN status = 'unfrozen' AND available_time <= NOW() THEN amount ELSE 0 END) as withdrawable_amount,
            SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END) as total_withdrawn
          FROM unfreeze_records 
          WHERE pool_account_id = $1
        `, [targetId])
      ]);
      
      const summary = {
        staking: {
          totalOperations: parseInt(stakeStats.rows[0].total_operations) || 0,
          freezeOperations: parseInt(stakeStats.rows[0].freeze_count) || 0,
          unfreezeOperations: parseInt(stakeStats.rows[0].unfreeze_count) || 0,
          totalFrozen: parseFloat(stakeStats.rows[0].total_frozen) || 0,
          totalUnfrozen: parseFloat(stakeStats.rows[0].total_unfrozen) || 0,
          netStaked: (parseFloat(stakeStats.rows[0].total_frozen) || 0) - (parseFloat(stakeStats.rows[0].total_unfrozen) || 0)
        },
        delegation: {
          totalOperations: parseInt(delegateStats.rows[0].total_operations) || 0,
          delegateOperations: parseInt(delegateStats.rows[0].delegate_count) || 0,
          undelegateOperations: parseInt(delegateStats.rows[0].undelegate_count) || 0,
          totalDelegated: parseFloat(delegateStats.rows[0].total_delegated) || 0,
          totalUndelegated: parseFloat(delegateStats.rows[0].total_undelegated) || 0,
          netDelegated: (parseFloat(delegateStats.rows[0].total_delegated) || 0) - (parseFloat(delegateStats.rows[0].total_undelegated) || 0)
        },
        withdrawal: {
          totalUnfreezes: parseInt(unfreezeStats.rows[0].total_unfreezes) || 0,
          withdrawableCount: parseInt(unfreezeStats.rows[0].withdrawable_count) || 0,
          withdrawnCount: parseInt(unfreezeStats.rows[0].withdrawn_count) || 0,
          withdrawableAmount: parseFloat(unfreezeStats.rows[0].withdrawable_amount) || 0,
          totalWithdrawn: parseFloat(unfreezeStats.rows[0].total_withdrawn) || 0
        }
      };
      
      res.json({ success: true, data: summary });
        return;
      
    } catch (error: any) {
      console.error('获取记录摘要失败:', error);
      res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message 
      });
    }
  };
}
