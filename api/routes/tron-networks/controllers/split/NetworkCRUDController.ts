/**
 * TRON网络CRUD控制器
 * 包含：创建、更新、删除等操作
 */
import { type Request, type Response } from 'express';
import { query } from '../../../../config/database.js';
import { 
  validateBasicFields, 
  validateNetworkNameUniqueness, 
  validateNetworkExists,
  validateNetworkDeletable,
  validateAndMapFields,
  validateUpdateFields
} from './NetworkValidationController.js';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

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
    
    // 验证和映射字段
    const mappingResult = validateAndMapFields({
      name, type, network_type, rpc_url, api_key, chain_id,
      explorer_url, block_explorer_url, is_active, is_default,
      priority, timeout_ms, retry_count, rate_limit, rate_limit_per_second,
      config, health_check_url, description
    });

    if (!mappingResult.isValid) {
      res.status(400).json({
        success: false,
        message: mappingResult.message
      });
      return;
    }

    const mappedData = mappingResult.mappedData!;
    
    // 验证基本字段
    const basicValidation = validateBasicFields(mappedData);
    if (!basicValidation.isValid) {
      res.status(400).json({
        success: false,
        message: basicValidation.message
      });
      return;
    }
    
    // 检查网络名称是否已存在
    const nameValidation = await validateNetworkNameUniqueness(mappedData.name);
    if (!nameValidation.isValid) {
      res.status(400).json({
        success: false,
        message: nameValidation.message
      });
      return;
    }
    
    // 如果设置为默认网络，需要将其他网络的默认状态取消
    if (mappedData.is_default) {
      await query(
        'UPDATE tron_networks SET is_default = false WHERE network_type = $1',
        [mappedData.network_type]
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
        mappedData.name, mappedData.network_type, mappedData.rpc_url, mappedData.api_key, 
        mappedData.chain_id, mappedData.block_explorer_url, mappedData.is_active, 
        mappedData.is_default, mappedData.priority, mappedData.timeout_ms, 
        mappedData.retry_count, mappedData.rate_limit_per_second, 
        JSON.stringify(mappedData.config), mappedData.health_check_url, 'unknown', 
        mappedData.description
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
    const networkValidation = await validateNetworkExists(id);
    if (!networkValidation.isValid) {
      res.status(404).json({
        success: false,
        message: networkValidation.message
      });
      return;
    }

    const existingNetwork = networkValidation.network;
    
    // 检查网络名称是否被其他网络使用
    if (updateData.name) {
      const nameValidation = await validateNetworkNameUniqueness(updateData.name, id);
      if (!nameValidation.isValid) {
        res.status(400).json({
          success: false,
          message: nameValidation.message
        });
        return;
      }
    }
    
    // 验证更新字段
    const fieldsValidation = validateUpdateFields(updateData);
    if (!fieldsValidation.isValid) {
      res.status(400).json({
        success: false,
        message: fieldsValidation.message
      });
      return;
    }

    const { allowedFields, processedDbFields } = fieldsValidation;
    
    // 如果设置为默认网络，需要将其他同类型网络的默认状态取消
    if (updateData.is_default === true) {
      const networkType = existingNetwork.type;
      await query(
        'UPDATE tron_networks SET is_default = false WHERE network_type = $1 AND id != $2',
        [networkType, id]
      );
    }
    
    // 构建更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    for (const field of allowedFields!) {
      if (updateData[field] !== undefined) {
        let shouldAddField = false;
        
        if (field === 'config') {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(JSON.stringify(updateData[field]));
          processedDbFields!.add(field);
          shouldAddField = true;
        } else if (field === 'rate_limit_per_second') {
          // Handle rate_limit mapping to rate_limit_per_second
          const value = updateData.rate_limit || updateData[field];
          if (!processedDbFields!.has('rate_limit_per_second')) {
            updateFields.push(`${field} = $${paramIndex}`);
            updateValues.push(value);
            processedDbFields!.add('rate_limit_per_second');
            shouldAddField = true;
          }
        } else if (field === 'explorer_url') {
          // Map explorer_url to block_explorer_url in database
          if (!processedDbFields!.has('block_explorer_url')) {
            updateFields.push(`block_explorer_url = $${paramIndex}`);
            updateValues.push(updateData[field]);
            processedDbFields!.add('block_explorer_url');
            shouldAddField = true;
          }
        } else if (field === 'block_explorer_url') {
          // Handle direct block_explorer_url field (only if not already processed)
          if (!processedDbFields!.has('block_explorer_url')) {
            updateFields.push(`${field} = $${paramIndex}`);
            updateValues.push(updateData[field]);
            processedDbFields!.add('block_explorer_url');
            shouldAddField = true;
          }
        } else {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(updateData[field]);
          processedDbFields!.add(field);
          shouldAddField = true;
        }
        
        // 只有当字段实际被添加时才递增参数索引
        if (shouldAddField) {
          paramIndex++;
        }
      }
    }
    
    // Handle additional mappings for fields that may come with different names
    if (updateData.type !== undefined && !processedDbFields!.has('network_type')) {
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
    
    // 验证网络是否可以删除
    const deletableValidation = await validateNetworkDeletable(id);
    if (!deletableValidation.isValid) {
      res.status(400).json({
        success: false,
        message: deletableValidation.message
      });
      return;
    }

    // 获取网络信息（为了记录历史）
    const networkValidation = await validateNetworkExists(id);
    const network = networkValidation.network;
    
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
