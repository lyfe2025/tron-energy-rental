/**
 * 配置管理中间件
 * 
 * 提供配置管理相关的中间件功能
 * 包括配置验证、敏感信息加密/解密、配置变更审计日志等
 */

import crypto from 'crypto';
import { type NextFunction, type Request, type Response } from 'express';
import { query } from '../config/database.js';

// 配置类型定义
interface ConfigValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean;
}

interface ConfigSchema {
  [key: string]: ConfigValidationRule;
}

// 敏感配置字段列表
const SENSITIVE_FIELDS = [
  'api_key',
  'secret_key',
  'private_key',
  'password',
  'token',
  'webhook_secret',
  'database_password',
  'encryption_key'
];

// 加密密钥（实际项目中应从环境变量获取）
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

/**
 * 配置验证规则类型定义
 */
interface ValidationRule {
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean;
}

/**
 * 配置验证中间件
 * 根据配置类型验证请求数据
 */
export const validateConfig = (configType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // 只使用传入的configType参数，避免与请求体中的type字段冲突
      const actualConfigType = req.params.type || configType;
      const data = req.body;
      
      let schema: Record<string, ValidationRule>;
      switch (actualConfigType) {
        case 'tron_network':
          schema = ConfigValidationSchemas.tronNetwork;
          break;
        case 'telegram_bot':
          schema = ConfigValidationSchemas.telegramBot;
          break;
        case 'bot_network_config':
          schema = ConfigValidationSchemas.botNetworkConfig;
          break;
        case 'system_config':
          schema = ConfigValidationSchemas.systemConfig;
          break;
        default:
          res.status(400).json({
            success: false,
            message: `不支持的配置类型: ${actualConfigType}`
          });
          return;
      }
      
      const errors: string[] = [];
      
      // 验证必填字段和数据类型
      for (const [field, rule] of Object.entries(schema)) {
        const value = data[field];
        
        // 检查必填字段
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(`字段 '${field}' 是必填项`);
          continue;
        }
        
        // 如果字段不存在且非必填，跳过验证
        if (value === undefined || value === null) {
          continue;
        }
        
        // 类型验证
        if (rule.type === 'string' && typeof value !== 'string') {
          errors.push(`字段 '${field}' 必须是字符串类型`);
          continue;
        }
        
        if (rule.type === 'number' && typeof value !== 'number') {
          errors.push(`字段 '${field}' 必须是数字类型`);
          continue;
        }
        
        if (rule.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`字段 '${field}' 必须是布尔类型`);
          continue;
        }
        
        // 字符串长度验证
        if (rule.type === 'string' && typeof value === 'string') {
          if (rule.minLength && value.length < rule.minLength) {
            errors.push(`字段 '${field}' 长度不能少于 ${rule.minLength} 个字符`);
          }
          
          if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(`字段 '${field}' 长度不能超过 ${rule.maxLength} 个字符`);
          }
        }
        
        // 正则表达式验证
        if (rule.pattern && typeof value === 'string') {
          if (!rule.pattern.test(value)) {
            errors.push(`字段 '${field}' 格式不正确`);
          }
        }
        
        // 自定义验证器
        if (rule.validator && !rule.validator(value)) {
          errors.push(`字段 '${field}' 验证失败`);
        }
      }
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: '数据验证失败',
          errors
        });
        return;
      }
      
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '配置验证失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  };
};

/**
 * 敏感信息加密函数
 * @param text 要加密的文本
 * @returns 加密后的文本（包含IV和认证标签）
 */
export function encryptSensitiveData(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    cipher.setAAD(Buffer.from('config-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // 返回格式: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error(`加密失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 敏感信息解密函数
 * @param encryptedText 加密的文本
 * @returns 解密后的文本
 */
export function decryptSensitiveData(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('加密数据格式错误');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAAD(Buffer.from('config-data'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`解密失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 检查字段是否为敏感字段
 * @param fieldName 字段名
 * @returns 是否为敏感字段
 */
export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELDS.some(sensitive => 
    fieldName.toLowerCase().includes(sensitive.toLowerCase())
  );
}

/**
 * 敏感信息加密中间件
 * 自动加密请求中的敏感字段
 */
export const encryptSensitiveFields = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const config = req.body;
    
    // 递归处理配置对象
    function processObject(obj: any): any {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(processObject);
      }
      
      const processed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && isSensitiveField(key)) {
          // 加密敏感字段
          processed[key] = encryptSensitiveData(value);
        } else if (typeof value === 'object') {
          // 递归处理嵌套对象
          processed[key] = processObject(value);
        } else {
          processed[key] = value;
        }
      }
      return processed;
    }
    
    req.body = processObject(config);
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '敏感信息加密失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

/**
 * 敏感信息解密中间件
 * 自动解密响应中的敏感字段
 */
export const decryptSensitiveFields = (req: Request, res: Response, next: NextFunction): void => {
  // 保存原始的 json 方法
  const originalJson = res.json;
  
  // 重写 json 方法
  res.json = function(data: any) {
    try {
      // 递归处理响应数据
      function processObject(obj: any): any {
        if (typeof obj !== 'object' || obj === null) {
          return obj;
        }
        
        if (Array.isArray(obj)) {
          return obj.map(processObject);
        }
        
        const processed: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && isSensitiveField(key) && value.includes(':')) {
            try {
              // 尝试解密敏感字段
              processed[key] = decryptSensitiveData(value);
            } catch {
              // 解密失败，保持原值
              processed[key] = value;
            }
          } else if (typeof value === 'object') {
            // 递归处理嵌套对象
            processed[key] = processObject(value);
          } else {
            processed[key] = value;
          }
        }
        return processed;
      }
      
      const processedData = processObject(data);
      return originalJson.call(this, processedData);
    } catch (error) {
      // 解密失败时返回原始数据
      return originalJson.call(this, data);
    }
  };
  
  next();
};

/**
 * 配置变更审计日志中间件
 * 记录配置的创建、更新、删除操作
 */
export const auditConfigChanges = (configType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
  // 保存原始的 json 方法
  const originalJson = res.json;
  
  // 重写 json 方法以在响应后记录日志
  res.json = function(data: any) {
    // 先发送响应
    const result = originalJson.call(this, data);
    
    // 异步记录审计日志
    setImmediate(async () => {
      try {
        const userId = req.user?.id || 'system';
        const userRole = req.user?.role || 'unknown';
        const action = getActionFromMethod(req.method);
        const configKey = req.params.key || req.body.key || 'unknown';
        const actualConfigType = req.params.type || req.body.type || configType;
        
        // 记录到配置变更日志表
        await query(`
          INSERT INTO config_change_logs (
            user_id, user_role, action, config_type, config_key,
            old_value, new_value, ip_address, user_agent
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          userId,
          userRole,
          action,
          actualConfigType,
          configKey,
          req.body.old_value || null,
          req.body.new_value || JSON.stringify(req.body),
          req.ip,
          req.get('User-Agent') || ''
        ]);
        
        console.log(`配置变更审计: 用户 ${userId} 执行了 ${action} 操作，配置键: ${configKey}`);
      } catch (error) {
        console.error('记录配置变更审计日志失败:', error);
      }
    });
    
    return result;
  };
  
  next();
  };
};

/**
 * 根据HTTP方法获取操作类型
 * @param method HTTP方法
 * @returns 操作类型
 */
function getActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'GET':
      return 'READ';
    default:
      return 'UNKNOWN';
  }
}

/**
 * 预定义的配置验证规则
 */
export const ConfigValidationSchemas: Record<string, Record<string, ValidationRule>> = {
  // TRON网络配置验证
  tronNetwork: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 50 },
    full_host: { required: true, type: 'string', pattern: /^https?:\/\/.+/ },
    solidity_node: { required: true, type: 'string', pattern: /^https?:\/\/.+/ },
    event_server: { required: true, type: 'string', pattern: /^https?:\/\/.+/ },
    is_mainnet: { required: true, type: 'boolean' },
    is_active: { required: true, type: 'boolean' }
  },
  
  // Telegram机器人配置验证
  telegramBot: {
    name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    token: { required: true, type: 'string', pattern: /^\d+:[A-Za-z0-9_-]+$/ },
    webhook_url: { required: false, type: 'string', pattern: /^https:\/\/.+/ },
    is_active: { required: true, type: 'boolean' }
  },
  
  // 机器人网络配置验证
  botNetworkConfig: {
    bot_id: { required: true, type: 'number' },
    network_id: { required: true, type: 'number' },
    private_key: { required: true, type: 'string', minLength: 64, maxLength: 64 },
    is_active: { required: true, type: 'boolean' }
  },
  
  // 系统配置验证
  systemConfig: {
    config_key: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    config_value: { required: true, type: 'string' },
    description: { required: false, type: 'string', maxLength: 500 },
    category: { required: false, type: 'string', maxLength: 50 },
    is_sensitive: { required: false, type: 'boolean' },
    is_editable: { required: false, type: 'boolean' }
  }
};

/**
 * 配置权限检查中间件
 * 检查用户是否有权限访问特定配置
 */
export const checkConfigPermission = (configType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userRole = req.user?.role;
      
      // 超级管理员拥有所有权限
      if (userRole === 'super_admin') {
        next();
        return;
      }
      
      // 管理员可以访问大部分配置
      if (userRole === 'admin') {
        // 某些敏感配置只有超级管理员可以访问
        const restrictedConfigs = ['system_security', 'encryption_keys'];
        if (restrictedConfigs.includes(configType)) {
          res.status(403).json({
            success: false,
            message: '权限不足，只有超级管理员可以访问此配置'
          });
          return;
        }
        next();
        return;
      }
      
      // 其他角色无权访问配置管理
      res.status(403).json({
        success: false,
        message: '权限不足，需要管理员权限'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '权限检查失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  };
};