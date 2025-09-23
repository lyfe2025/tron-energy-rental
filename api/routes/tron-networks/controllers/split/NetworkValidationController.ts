/**
 * TRON网络验证控制器
 * 包含：网络配置验证、字段校验等验证逻辑
 */
import { query } from '../../../../config/database.ts';

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

interface NetworkData {
  name?: string;
  type?: string;
  network_type?: string;
  rpc_url?: string;
  chain_id?: string | number;
  is_default?: boolean;
}

/**
 * 验证网络基本字段
 */
export const validateBasicFields = (data: NetworkData): ValidationResult => {
  const { name, type, network_type, rpc_url, chain_id } = data;
  const networkType = network_type || type;

  // 验证必填字段
  if (!name || !networkType || !rpc_url || !chain_id) {
    return {
      isValid: false,
      message: '网络名称、类型、RPC URL和链ID为必填项'
    };
  }

  // 验证网络类型
  if (!['mainnet', 'testnet', 'private'].includes(networkType)) {
    return {
      isValid: false,
      message: '网络类型必须为 mainnet、testnet 或 private'
    };
  }

  return { isValid: true };
};

/**
 * 验证网络名称唯一性
 */
export const validateNetworkNameUniqueness = async (
  name: string, 
  excludeId?: string
): Promise<ValidationResult> => {
  try {
    let checkQuery = 'SELECT id FROM tron_networks WHERE name = $1';
    const queryParams = [name];

    if (excludeId) {
      checkQuery += ' AND id != $2';
      queryParams.push(excludeId);
    }

    const existingNetwork = await query(checkQuery, queryParams);

    if (existingNetwork.rows.length > 0) {
      return {
        isValid: false,
        message: excludeId ? '该网络名称已被其他网络使用' : '该网络名称已存在'
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('验证网络名称唯一性错误:', error);
    return {
      isValid: false,
      message: '验证网络名称时发生错误'
    };
  }
};

/**
 * 验证网络是否存在
 */
export const validateNetworkExists = async (id: string): Promise<ValidationResult & { network?: any }> => {
  try {
    const existingNetwork = await query(
      'SELECT id, network_type as type, is_default, name FROM tron_networks WHERE id = $1',
      [id]
    );

    if (existingNetwork.rows.length === 0) {
      return {
        isValid: false,
        message: 'TRON网络不存在'
      };
    }

    return { 
      isValid: true, 
      network: existingNetwork.rows[0] 
    };
  } catch (error) {
    console.error('验证网络是否存在错误:', error);
    return {
      isValid: false,
      message: '验证网络是否存在时发生错误'
    };
  }
};

/**
 * 验证网络是否可以删除
 */
export const validateNetworkDeletable = async (id: string): Promise<ValidationResult> => {
  try {
    // 检查网络是否存在并获取基本信息
    const networkValidation = await validateNetworkExists(id);
    if (!networkValidation.isValid) {
      return networkValidation;
    }

    const network = networkValidation.network;

    // 检查是否为默认网络
    if (network.is_default) {
      return {
        isValid: false,
        message: '不能删除默认网络，请先设置其他网络为默认网络'
      };
    }

    // 检查是否有关联的机器人配置
    const botConfigCheck = await query(
      `SELECT COUNT(*) as count FROM telegram_bots 
       WHERE is_active = true 
       AND network_configurations IS NOT NULL 
       AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(network_configurations) AS config 
         WHERE (config->>'networkId')::uuid = $1 
         AND (config->>'isActive')::boolean IS NOT FALSE
       )`,
      [id]
    );

    if (parseInt(botConfigCheck.rows[0].count) > 0) {
      return {
        isValid: false,
        message: '该网络有关联的机器人配置，不能删除。请先移除相关配置。'
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('验证网络是否可删除错误:', error);
    return {
      isValid: false,
      message: '验证网络是否可删除时发生错误'
    };
  }
};

/**
 * 验证字段映射和处理
 */
export const validateAndMapFields = (data: any): { 
  isValid: boolean; 
  message?: string; 
  mappedData?: any 
} => {
  try {
    // Handle field mappings
    const networkType = data.network_type || data.type;
    const explorerUrl = data.block_explorer_url || data.explorer_url;
    const rateLimitPerSecond = data.rate_limit_per_second || data.rate_limit;

    const mappedData = {
      ...data,
      network_type: networkType,
      explorer_url: explorerUrl,
      block_explorer_url: explorerUrl,
      rate_limit_per_second: rateLimitPerSecond,
      rate_limit: rateLimitPerSecond
    };

    return {
      isValid: true,
      mappedData
    };
  } catch (error) {
    console.error('字段映射验证错误:', error);
    return {
      isValid: false,
      message: '字段映射验证失败'
    };
  }
};

/**
 * 验证更新字段
 */
export const validateUpdateFields = (updateData: any): {
  isValid: boolean;
  message?: string;
  allowedFields?: string[];
  processedDbFields?: Set<string>;
} => {
  const allowedFields = [
    'name', 'network_type', 'rpc_url', 'api_key', 'chain_id', 'explorer_url', 'block_explorer_url',
    'is_active', 'is_default', 'priority', 'timeout_ms', 'retry_count',
    'rate_limit_per_second', 'config', 'health_check_url', 'description'
  ];

  // 检查是否有有效的更新字段
  const hasValidFields = allowedFields.some(field => updateData[field] !== undefined);
  
  if (!hasValidFields && updateData.type === undefined && updateData.rate_limit === undefined) {
    return {
      isValid: false,
      message: '没有提供要更新的字段'
    };
  }

  return {
    isValid: true,
    allowedFields,
    processedDbFields: new Set()
  };
};
