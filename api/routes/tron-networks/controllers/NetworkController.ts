/**
 * TRON网络基础CRUD控制器
 * 包含：网络列表查询、详情获取、创建、更新、删除等基础操作
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 获取TRON网络列表
 * GET /api/tron-networks
 * 权限：管理员
 */
export const getNetworksList: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status,
      search 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (type) {
      conditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    if (status === 'active') {
      conditions.push(`is_active = true`);
    } else if (status === 'inactive') {
      conditions.push(`is_active = false`);
    }
    
    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 查询网络列表
    const networksQuery = `
      SELECT 
        id, name, network_type as type, rpc_url, api_key, chain_id, block_explorer_url as explorer_url,
        is_active, is_default, priority, timeout_ms, retry_count,
        rate_limit_per_second as rate_limit, health_status, last_health_check as last_check_at,
        description, created_at, updated_at
      FROM tron_networks 
      ${whereClause}
      ORDER BY priority ASC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const networksResult = await query(networksQuery, queryParams);
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM tron_networks ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: 'TRON网络列表获取成功',
      data: {
        networks: networksResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取TRON网络列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取单个TRON网络详情
 * GET /api/tron-networks/:id
 * 权限：管理员
 */
export const getNetworkDetails: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const networkResult = await query(
      `SELECT 
        id, name, network_type as type, rpc_url, api_key, chain_id, block_explorer_url as explorer_url,
        is_active, is_default, priority, timeout_ms, retry_count,
        rate_limit_per_second as rate_limit, config, health_check_url, health_status,
        last_health_check as last_check_at, description, created_at, updated_at
       FROM tron_networks 
       WHERE id = $1`,
      [id]
    );
    
    if (networkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'TRON网络不存在'
      });
      return;
    }
    
    // 获取使用此网络的机器人数量
    const botCountResult = await query(
      `SELECT COUNT(*) as bot_count FROM bot_network_configs WHERE network_id = $1`,
      [id]
    );
    
    // 获取使用此网络的能量池数量 (暂时设为0，因为energy_pools表没有network_id字段)
    const poolCountResult = { rows: [{ pool_count: '0' }] };
    
    const network = networkResult.rows[0];
    const botCount = parseInt(botCountResult.rows[0].bot_count);
    const poolCount = parseInt(poolCountResult.rows[0].pool_count);
    
    res.status(200).json({
      success: true,
      message: 'TRON网络详情获取成功',
      data: {
        network,
        usage_stats: {
          connected_bots: botCount,
          connected_pools: poolCount
        }
      }
    });
    
  } catch (error) {
    console.error('获取TRON网络详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 创建新的TRON网络配置
 * POST /api/tron-networks
 * 权限：管理员
 */
export const createNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const {
      name,
      type,
      network_type,
      rpc_url,
      api_key,
      chain_id,
      explorer_url,
      block_explorer_url,
      is_active = true,
      is_default = false,
      priority = 1,
      timeout_ms = 30000,
      retry_count = 3,
      rate_limit = 100,
      rate_limit_per_second,
      config = {},
      health_check_url,
      description
    } = req.body;
    
    // Handle field mappings
    const networkType = network_type || type;
    const explorerUrl = block_explorer_url || explorer_url;
    const rateLimitPerSecond = rate_limit_per_second || rate_limit;
    
    // 验证必填字段
    if (!name || !networkType || !rpc_url || !chain_id) {
      res.status(400).json({
        success: false,
        message: '网络名称、类型、RPC URL和链ID为必填项'
      });
      return;
    }
    
    // 验证网络类型
    if (!['mainnet', 'testnet', 'private'].includes(networkType)) {
      res.status(400).json({
        success: false,
        message: '网络类型必须为 mainnet、testnet 或 private'
      });
      return;
    }
    
    // 检查网络名称是否已存在
    const existingNetwork = await query(
      'SELECT id FROM tron_networks WHERE name = $1',
      [name]
    );
    
    if (existingNetwork.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '该网络名称已存在'
      });
      return;
    }
    
    // 如果设置为默认网络，需要将其他网络的默认状态取消
    if (is_default) {
      await query(
        'UPDATE tron_networks SET is_default = false WHERE network_type = $1',
        [networkType]
      );
    }
    
    // 创建网络配置
    const newNetwork = await query(
      `INSERT INTO tron_networks (
        name, network_type, rpc_url, api_key, chain_id, block_explorer_url,
        is_active, is_default, priority, timeout_ms, retry_count,
        rate_limit_per_second, config, health_check_url, health_status, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING 
        id, name, network_type as type, network_type, rpc_url, api_key, chain_id, 
        block_explorer_url as explorer_url, block_explorer_url,
        is_active, is_default, priority, timeout_ms, retry_count,
        rate_limit_per_second as rate_limit, health_status, last_health_check as last_check_at,
        health_check_url, description, created_at`,
      [
        name, networkType, rpc_url, api_key, chain_id, explorerUrl,
        is_active, is_default, priority, timeout_ms, retry_count,
        rateLimitPerSecond, JSON.stringify(config), health_check_url, 'unknown', description
      ]
    );
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        new_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'tron_network',
        newNetwork.rows[0].id,
        'create',
        null,
        JSON.stringify(req.body),
        '创建TRON网络配置',
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'TRON网络配置创建成功',
      data: {
        network: newNetwork.rows[0]
      }
    });
    
  } catch (error) {
    console.error('创建TRON网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新TRON网络配置
 * PUT /api/tron-networks/:id
 * 权限：管理员
 */
export const updateNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // 检查网络是否存在
    const existingNetwork = await query(
      'SELECT id, network_type as type FROM tron_networks WHERE id = $1',
      [id]
    );
    
    if (existingNetwork.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'TRON网络不存在'
      });
      return;
    }
    
    // 检查网络名称是否被其他网络使用
    if (updateData.name) {
      const nameCheck = await query(
        'SELECT id FROM tron_networks WHERE name = $1 AND id != $2',
        [updateData.name, id]
      );
      
      if (nameCheck.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该网络名称已被其他网络使用'
        });
        return;
      }
    }
    
    // 如果设置为默认网络，需要将其他同类型网络的默认状态取消
    if (updateData.is_default === true) {
      const networkType = existingNetwork.rows[0].type;
      await query(
        'UPDATE tron_networks SET is_default = false WHERE network_type = $1 AND id != $2',
        [networkType, id]
      );
    }
    
    // 构建更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'name', 'network_type', 'rpc_url', 'api_key', 'chain_id', 'explorer_url', 'block_explorer_url',
      'is_active', 'is_default', 'priority', 'timeout_ms', 'retry_count',
      'rate_limit_per_second', 'config', 'health_check_url', 'description'
    ];
    
    // 追踪已处理的数据库字段，避免重复更新
    const processedDbFields = new Set();
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        let shouldAddField = false;
        
        if (field === 'config') {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(JSON.stringify(updateData[field]));
          processedDbFields.add(field);
          shouldAddField = true;
        } else if (field === 'rate_limit_per_second') {
          // Handle rate_limit mapping to rate_limit_per_second
          const value = updateData.rate_limit || updateData[field];
          if (!processedDbFields.has('rate_limit_per_second')) {
            updateFields.push(`${field} = $${paramIndex}`);
            updateValues.push(value);
            processedDbFields.add('rate_limit_per_second');
            shouldAddField = true;
          }
        } else if (field === 'explorer_url') {
          // Map explorer_url to block_explorer_url in database
          if (!processedDbFields.has('block_explorer_url')) {
            updateFields.push(`block_explorer_url = $${paramIndex}`);
            updateValues.push(updateData[field]);
            processedDbFields.add('block_explorer_url');
            shouldAddField = true;
          }
        } else if (field === 'block_explorer_url') {
          // Handle direct block_explorer_url field (only if not already processed)
          if (!processedDbFields.has('block_explorer_url')) {
            updateFields.push(`${field} = $${paramIndex}`);
            updateValues.push(updateData[field]);
            processedDbFields.add('block_explorer_url');
            shouldAddField = true;
          }
        } else {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(updateData[field]);
          processedDbFields.add(field);
          shouldAddField = true;
        }
        
        // 只有当字段实际被添加时才递增参数索引
        if (shouldAddField) {
          paramIndex++;
        }
      }
    }
    
    // Handle additional mappings for fields that may come with different names
    if (updateData.type !== undefined && !processedDbFields.has('network_type')) {
      // Map 'type' to 'network_type' (only if network_type wasn't already processed)
      updateFields.push(`network_type = $${paramIndex}`);
      updateValues.push(updateData.type);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
      return;
    }
    
    // 添加更新时间
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    
    // 执行更新
    const updateQuery = `
      UPDATE tron_networks 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, name, network_type as type, network_type, rpc_url, api_key, chain_id, 
        block_explorer_url as explorer_url, block_explorer_url,
        is_active, is_default, priority, timeout_ms, retry_count,
        rate_limit_per_second as rate_limit, health_status, last_health_check as last_check_at,
        health_check_url, description, updated_at
    `;
    
    const updatedNetwork = await query(updateQuery, updateValues);
    
    // TODO: 记录配置变更历史 - 需要根据实际表结构实现
    
    res.status(200).json({
      success: true,
      message: 'TRON网络配置更新成功',
      data: {
        network: updatedNetwork.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新TRON网络配置错误:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message // 在开发环境中返回具体错误信息
    });
  }
};

/**
 * 删除TRON网络配置
 * DELETE /api/tron-networks/:id
 * 权限：管理员
 */
export const deleteNetwork: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查网络是否存在
    const existingNetwork = await query(
      'SELECT id, name, is_default FROM tron_networks WHERE id = $1',
      [id]
    );
    
    if (existingNetwork.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'TRON网络不存在'
      });
      return;
    }
    
    const network = existingNetwork.rows[0];
    
    // 检查是否为默认网络
    if (network.is_default) {
      res.status(400).json({
        success: false,
        message: '不能删除默认网络，请先设置其他网络为默认网络'
      });
      return;
    }
    
    // 检查是否有关联的机器人配置
    const botConfigCheck = await query(
      'SELECT COUNT(*) as count FROM bot_network_configs WHERE network_id = $1',
      [id]
    );
    
    if (parseInt(botConfigCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该网络有关联的机器人配置，不能删除。请先移除相关配置。'
      });
      return;
    }
    
    // 注意: energy_pools表没有network_id字段，因为能量池不直接关联到特定网络
    // 能量池是独立的资源，可以在任何网络上使用
    
    // 删除网络配置
    await query(
      'DELETE FROM tron_networks WHERE id = $1',
      [id]
    );
    
    // 记录配置变更历史
    await query(
      `INSERT INTO system_config_history (
        entity_type, entity_id, operation_type, field_name,
        old_value, change_reason, user_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'tron_network',
        id,
        'delete',
        null,
        JSON.stringify({ name: network.name }),
        '删除TRON网络配置',
        req.user?.id || null,
        req.ip
      ]
    );
    
    res.status(200).json({
      success: true,
      message: 'TRON网络配置删除成功'
    });
    
  } catch (error) {
    console.error('删除TRON网络配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
