import { Router, type Router as ExpressRouter } from 'express';
import { query } from '../database/index';
import { authenticateToken } from '../middleware/auth';
import { tronService } from '../services/tron';

const router: ExpressRouter = Router();

// 获取质押概览
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const { address, poolId } = req.query;
    
    let targetAddress = address as string;
    
    // 如果提供了poolId，从数据库获取对应的地址
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
    }
    
    if (!targetAddress || typeof targetAddress !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数',
        details: '请提供 address 或 poolId 参数' 
      });
    }

    const result = await tronService.getStakeOverview(targetAddress);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error || 'TRON网络调用失败',
        details: result.error 
      });
    }
  } catch (error) {
    console.error('获取质押概览失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误',
      details: error.message,
      type: 'server_error'
    });
  }
});

// 获取质押统计信息
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const { pool_id, poolId } = req.query;
    
    // 支持两种参数名称：pool_id 和 poolId
    const targetPoolId = poolId || pool_id;
    
    // 如果提供了poolId，验证能量池是否存在
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
    }
    
    // 获取质押统计数据
    const statsQuery = `
      SELECT 
        COUNT(*) as total_stakes,
        SUM(CASE WHEN operation_type = 'freeze' THEN amount ELSE 0 END) as total_staked,
        SUM(CASE WHEN operation_type = 'unfreeze' THEN amount ELSE 0 END) as total_unstaked,
        COUNT(CASE WHEN resource_type = 'ENERGY' THEN 1 END) as energy_stakes,
        COUNT(CASE WHEN resource_type = 'BANDWIDTH' THEN 1 END) as bandwidth_stakes
      FROM stake_records 
      WHERE ($1::uuid IS NULL OR pool_account_id = $1::uuid)
        AND status = 'confirmed'
    `;
    
    const delegateStatsQuery = `
      SELECT 
        COUNT(*) as total_delegates,
        SUM(amount) as total_delegated,
        COUNT(CASE WHEN resource_type = 'ENERGY' THEN 1 END) as energy_delegates,
        COUNT(CASE WHEN resource_type = 'BANDWIDTH' THEN 1 END) as bandwidth_delegates
      FROM delegate_records 
      WHERE ($1::uuid IS NULL OR pool_account_id = $1::uuid)
        AND status = 'confirmed'
    `;
    
    const [stakeStats, delegateStats] = await Promise.all([
      query(statsQuery, [targetPoolId || null]),
      query(delegateStatsQuery, [targetPoolId || null])
    ]);
    
    res.json({
      success: true,
      data: {
        stakes: stakeStats.rows[0],
        delegates: delegateStats.rows[0]
      }
    });
  } catch (error) {
    console.error('获取质押统计失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误',
      details: error.message,
      type: 'server_error'
    });
  }
});

// 质押TRX
router.post('/freeze', authenticateToken, async (req, res) => {
  try {
    const { ownerAddress, frozenBalance, resource, poolId } = req.body;
    
    // 验证参数
    if (!ownerAddress || !frozenBalance || !resource) {
      return res.status(400).json({ 
        success: false, 
        error: 'ownerAddress, frozenBalance, and resource are required' 
      });
    }
    
    if (!['ENERGY', 'BANDWIDTH'].includes(resource)) {
      return res.status(400).json({ 
        success: false, 
        error: 'resource must be ENERGY or BANDWIDTH' 
      });
    }
    
    if (frozenBalance <= 0) {
      return res.status(400).json({ 
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
      // 更新能量池统计
      if (poolId) {
        const updateField = resource === 'ENERGY' ? 'staked_trx_energy' : 'staked_trx_bandwidth';
        await query(
          `UPDATE energy_pools 
           SET ${updateField} = COALESCE(${updateField}, 0) + $1,
               last_stake_update = NOW()
           WHERE id = $2`,
          [frozenBalance, poolId]
        );
      }
      
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 解质押TRX
router.post('/unfreeze', authenticateToken, async (req, res) => {
  try {
    const { ownerAddress, unfreezeBalance, resource, poolId } = req.body;
    
    // 验证参数
    if (!ownerAddress || !unfreezeBalance || !resource) {
      return res.status(400).json({ 
        success: false, 
        error: 'ownerAddress, unfreezeBalance, and resource are required' 
      });
    }
    
    if (!['ENERGY', 'BANDWIDTH'].includes(resource)) {
      return res.status(400).json({ 
        success: false, 
        error: 'resource must be ENERGY or BANDWIDTH' 
      });
    }
    
    if (unfreezeBalance <= 0) {
      return res.status(400).json({ 
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
      await query(
        `INSERT INTO unfreeze_records (
          unfreeze_tx_hash, pool_account_id, pool_account_id, amount, resource_type,
          unfreeze_time, available_time, status, created_at
        ) VALUES ($1, $2, $2, $4, $5, NOW(), NOW() + INTERVAL '14 days', 'unfrozen', NOW())`,
        [result.txid, poolId || null, ownerAddress, unfreezeBalance, resource.toLowerCase()]
      );
      
      // 更新能量池统计
      if (poolId) {
        const updateField = resource === 'ENERGY' ? 'pending_unfreeze_energy' : 'pending_unfreeze_bandwidth';
        await query(
          `UPDATE energy_pools 
           SET ${updateField} = COALESCE(${updateField}, 0) + $1,
               last_stake_update = NOW()
           WHERE id = $2`,
          [unfreezeBalance, poolId]
        );
      }
      
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 委托资源
router.post('/delegate', authenticateToken, async (req, res) => {
  try {
    const { ownerAddress, receiverAddress, balance, resource, lock, lockPeriod, poolId } = req.body;
    
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
      await query(
        `INSERT INTO delegate_records (
          tx_hash, pool_account_id, receiver_address, amount,
          resource_type, operation_type, lock_period, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
        [result.txid, poolId || null, receiverAddress, balance, resource.toUpperCase(), 'delegate', lockPeriod || 0]
      );
      
      // 更新能量池统计
      if (poolId) {
        const updateField = resource === 'ENERGY' ? 'delegated_energy' : 'delegated_bandwidth';
        await query(
          `UPDATE energy_pools 
           SET ${updateField} = COALESCE(${updateField}, 0) + $1,
               last_stake_update = NOW()
           WHERE id = $2`,
          [balance, poolId]
        );
      }
      
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 取消委托资源
router.post('/undelegate', authenticateToken, async (req, res) => {
  try {
    const { ownerAddress, receiverAddress, balance, resource, poolId } = req.body;
    
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
      await query(
        `INSERT INTO delegate_records (
          tx_hash, pool_account_id, receiver_address, amount,
          resource_type, operation_type, lock_period, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
        [result.txid, poolId || null, receiverAddress, balance, resource.toUpperCase(), 'undelegate', 0]
      );
      
      // 更新能量池统计
      if (poolId) {
        const updateField = resource === 'ENERGY' ? 'delegated_energy' : 'delegated_bandwidth';
        await query(
          `UPDATE energy_pools 
           SET ${updateField} = COALESCE(${updateField}, 0) - $1,
               last_stake_update = NOW()
           WHERE id = $2`,
          [balance, poolId]
        );
      }
      
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 提取已解质押资金
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const { ownerAddress } = req.body;
    
    // 验证参数
    if (!ownerAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'ownerAddress is required' 
      });
    }
    
    // 检查是否有可提取的资金
    const withdrawableQuery = `
      SELECT COUNT(*) as count
      FROM unfreeze_records 
      WHERE pool_account_id = $1 
        AND status = 'unfrozen'
        AND available_time <= NOW()
    `;
    
    const withdrawableResult = await query(withdrawableQuery, [ownerAddress]);
    
    if (parseInt(withdrawableResult.rows[0].count) === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No withdrawable funds available' 
      });
    }
    
    // 执行提取
    const result = await tronService.withdrawExpireUnfreeze({ ownerAddress });
    
    if (result.success) {
      // 更新解质押记录状态
      await query(
        `UPDATE unfreeze_records 
         SET status = 'withdrawn', updated_at = NOW()
         WHERE pool_account_id = $1 
           AND status = 'unfrozen'
           AND available_time <= NOW()`,
        [ownerAddress]
      );
      
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取质押记录
 */
router.get('/records', authenticateToken, async (req, res) => {
  try {
    const { address, pool_id, page = 1, limit = 20, operation_type, resource_type } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereConditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;
    
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
    
    const recordsQuery = `
      SELECT 
        id, tx_hash as transaction_id, pool_account_id as pool_id, pool_account_id as address, amount,
        resource_type, operation_type, status,
        created_at, updated_at
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
    
    params.push(parseInt(limit as string), offset);
    
    const [records, countResult] = await Promise.all([
      query(recordsQuery, params),
      query(countQuery, params.slice(0, -2))
    ]);
    
    res.json({
      success: true,
      data: {
        records: records.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取委托记录
 */
router.get('/delegates', authenticateToken, async (req, res) => {
  try {
    const { from_address, to_address, pool_id, page = 1, limit = 20, resource_type } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereConditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;
    
    // Note: from_address parameter is not supported as delegate_records table doesn't have owner_address field
    // The pool_account_id should be used to identify the source pool
    
    if (to_address) {
      whereConditions.push(`receiver_address = $${paramIndex}`);
      params.push(to_address);
      paramIndex++;
    }
    
    if (pool_id) {
      whereConditions.push(`pool_account_id = $${paramIndex}`);
      params.push(pool_id);
      paramIndex++;
    }
    
    if (resource_type) {
      whereConditions.push(`resource_type = $${paramIndex}`);
      params.push(resource_type);
      paramIndex++;
    }
    
    const delegatesQuery = `
      SELECT 
        id, tx_hash as transaction_id, pool_account_id as pool_id, 
        pool_account_id as from_address, receiver_address as to_address,
        amount, resource_type, operation_type, lock_period, status,
        created_at, updated_at
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
    
    params.push(parseInt(limit as string), offset);
    
    const [delegates, countResult] = await Promise.all([
      query(delegatesQuery, params),
      query(countQuery, params.slice(0, -2))
    ]);
    
    res.json({
      success: true,
      data: {
        delegates: delegates.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取解质押记录
 */
router.get('/unfreezes', authenticateToken, async (req, res) => {
  try {
    const { address, pool_id, page = 1, limit = 20, status, resource_type } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereConditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;
    
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
    
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    if (resource_type) {
      whereConditions.push(`resource_type = $${paramIndex}`);
      params.push(resource_type);
      paramIndex++;
    }
    
    const unfreezesQuery = `
      SELECT 
        id, unfreeze_tx_hash as transaction_id, pool_account_id as pool_id, 
        pool_account_id as address, amount,
        resource_type, unfreeze_time, available_time as expire_time, status,
        created_at, updated_at,
        CASE 
          WHEN available_time <= NOW() AND status = 'unfrozen' THEN true
          ELSE false
        END as withdrawable
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
    
    params.push(parseInt(limit as string), offset);
    
    const [unfreezes, countResult] = await Promise.all([
      query(unfreezesQuery, params),
      query(countQuery, params.slice(0, -2))
    ]);
    
    res.json({
      success: true,
      data: {
        unfreezes: unfreezes.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取账户资源信息
 */
router.get('/account-resources/:address', authenticateToken, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ success: false, error: 'Address is required' });
    }
    
    if (!tronService.isValidAddress(address)) {
      return res.status(400).json({ success: false, error: 'Invalid TRON address' });
    }
    
    const result = await tronService.getAccountResources(address);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取账户信息
 */
router.get('/account-info/:address', authenticateToken, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ success: false, error: 'Address is required' });
    }
    
    if (!tronService.isValidAddress(address)) {
      return res.status(400).json({ success: false, error: 'Invalid TRON address' });
    }
    
    const result = await tronService.getAccount(address);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;