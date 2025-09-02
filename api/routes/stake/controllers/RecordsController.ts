/**
 * 记录查询控制器
 */
import type { Request, Response } from 'express';
import { query } from '../../../database/index.js';
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
   * 获取质押记录
   */
  static getStakeRecords: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { 
        address, 
        pool_id, 
        page = '1', 
        limit = '20', 
        operation_type, 
        resource_type,
        startDate,
        endDate
      } = req.query as StakeQueryParams;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereConditions = ['1=1'];
      let params: any[] = [];
      let paramIndex = 1;
      
      // 构建查询条件
      if (address) {
        whereConditions.push(`pool_account_id = $${paramIndex}`);
        params.push(address);
        paramIndex++;
      }
      
      if (pool_id) {
        whereConditions.push(`pool_account_id = $${paramIndex}`);
        params.push(pool_id);
        paramIndex++;
      }
      
      if (operation_type) {
        whereConditions.push(`operation_type = $${paramIndex}`);
        params.push(operation_type);
        paramIndex++;
      }
      
      if (resource_type) {
        whereConditions.push(`resource_type = $${paramIndex}`);
        params.push(resource_type);
        paramIndex++;
      }
      
      if (startDate) {
        whereConditions.push(`created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        whereConditions.push(`created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }
      
      const recordsQuery = `
        SELECT 
          id, tx_hash as transaction_id, pool_account_id as pool_id, 
          pool_account_id as address, amount, resource_type, operation_type, 
          status, created_at, updated_at
        FROM stake_records 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total
        FROM stake_records 
        WHERE ${whereConditions.join(' AND ')}
      `;
      
      params.push(parseInt(limit), offset);
      
      const [records, countResult] = await Promise.all([
        query(recordsQuery, params),
        query(countQuery, params.slice(0, -2))
      ]);
      
      const response: PaginatedResponse<StakeRecord> = {
        success: true,
        data: records.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
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
   * 获取委托记录
   */
  static getDelegateRecords: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { 
        address, 
        pool_id, 
        page = '1', 
        limit = '20', 
        operation_type, 
        resource_type,
        startDate,
        endDate
      } = req.query as StakeQueryParams;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereConditions = ['1=1'];
      let params: any[] = [];
      let paramIndex = 1;
      
      // 构建查询条件
      if (address) {
        whereConditions.push(`pool_account_id = $${paramIndex}`);
        params.push(address);
        paramIndex++;
      }
      
      if (pool_id) {
        whereConditions.push(`pool_account_id = $${paramIndex}`);
        params.push(pool_id);
        paramIndex++;
      }
      
      if (operation_type) {
        whereConditions.push(`operation_type = $${paramIndex}`);
        params.push(operation_type);
        paramIndex++;
      }
      
      if (resource_type) {
        whereConditions.push(`resource_type = $${paramIndex}`);
        params.push(resource_type);
        paramIndex++;
      }
      
      if (startDate) {
        whereConditions.push(`created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        whereConditions.push(`created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }
      
      const recordsQuery = `
        SELECT 
          id, tx_hash as transaction_id, pool_account_id as pool_id,
          receiver_address, amount, resource_type, operation_type,
          lock_period, is_locked, status, created_at, updated_at
        FROM delegate_records 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total
        FROM delegate_records 
        WHERE ${whereConditions.join(' AND ')}
      `;
      
      params.push(parseInt(limit), offset);
      
      const [records, countResult] = await Promise.all([
        query(recordsQuery, params),
        query(countQuery, params.slice(0, -2))
      ]);
      
      const response: PaginatedResponse<DelegateRecord> = {
        success: true,
        data: records.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
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
   * 获取解冻记录
   */
  static getUnfreezeRecords: RouteHandler = async (req: Request, res: Response) => {
    try {
      const { 
        address, 
        pool_id, 
        page = '1', 
        limit = '20',
        startDate,
        endDate
      } = req.query as StakeQueryParams;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereConditions = ['1=1'];
      let params: any[] = [];
      let paramIndex = 1;
      
      // 构建查询条件
      if (address) {
        whereConditions.push(`pool_account_id = $${paramIndex}`);
        params.push(address);
        paramIndex++;
      }
      
      if (pool_id) {
        whereConditions.push(`pool_account_id = $${paramIndex}`);
        params.push(pool_id);
        paramIndex++;
      }
      
      if (startDate) {
        whereConditions.push(`created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        whereConditions.push(`created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }
      
      const recordsQuery = `
        SELECT 
          id, unfreeze_tx_hash as txid, pool_account_id as pool_id,
          amount, resource_type, unfreeze_time, available_time as withdrawable_time,
          status, created_at
        FROM unfreeze_records 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total
        FROM unfreeze_records 
        WHERE ${whereConditions.join(' AND ')}
      `;
      
      params.push(parseInt(limit), offset);
      
      const [records, countResult] = await Promise.all([
        query(recordsQuery, params),
        query(countQuery, params.slice(0, -2))
      ]);
      
      // 添加状态计算
      const processedRecords = records.rows.map((record: any) => ({
        ...record,
        canWithdraw: record.status === 'unfrozen' && new Date(record.withdrawable_time) <= new Date(),
        daysUntilWithdrawable: record.status === 'unfrozen' 
          ? Math.ceil((new Date(record.withdrawable_time).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0
      }));
      
      const response: PaginatedResponse<UnfreezeRecord> = {
        success: true,
        data: processedRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
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
