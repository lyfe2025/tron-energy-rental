/**
 * 简化的资源消耗配置路由
 * 
 * 只提供必要的能量和带宽配置CRUD操作
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { SystemConfigsService } from './services/systemConfigsService.js';
import type { ApiResponse } from './types/systemConfigs.types.js';

const router: Router = Router();
const configService = new SystemConfigsService();

// 能量配置映射
const ENERGY_CONFIG_KEYS = {
  usdt_standard_energy: 'resource_consumption.energy.usdt_standard_energy',
  usdt_max_energy: 'resource_consumption.energy.usdt_max_energy', 
  usdt_buffer_percentage: 'resource_consumption.energy.usdt_buffer_percentage',
  preset_values: 'resource_consumption.energy.preset_values'
};

// 带宽配置映射
const BANDWIDTH_CONFIG_KEYS = {
  trx_transfer_bandwidth: 'resource_consumption.bandwidth.trx_transfer_bandwidth',
  trc20_transfer_bandwidth: 'resource_consumption.bandwidth.trc20_transfer_bandwidth',
  account_create_bandwidth: 'resource_consumption.bandwidth.account_create_bandwidth',
  buffer_percentage: 'resource_consumption.bandwidth.buffer_percentage', 
  max_bandwidth_limit: 'resource_consumption.bandwidth.max_bandwidth_limit',
  preset_values: 'resource_consumption.bandwidth.preset_values'
};

/**
 * 获取能量配置
 */
router.get('/energy', authenticateToken, async (req: Request, res: Response) => {
  try {
    const energyConfig: any = {};
    const validationRules: any = {};
    
    // 获取所有能量相关配置
    for (const [frontendKey, backendKey] of Object.entries(ENERGY_CONFIG_KEYS)) {
      try {
        const config = await configService.getConfigByKey(backendKey, req.user?.role);
        if (config) {
          if (config.config_type === 'boolean') {
            energyConfig[frontendKey] = config.config_value === 'true';
          } else if (config.config_type === 'number') {
            energyConfig[frontendKey] = Number(config.config_value);
          } else if (frontendKey === 'preset_values') {
            // 特殊处理preset_values，从JSON字符串解析为数组
            try {
              energyConfig[frontendKey] = JSON.parse(config.config_value);
            } catch (e) {
              energyConfig[frontendKey] = [];
            }
          } else {
            energyConfig[frontendKey] = config.config_value;
          }
          
          // 添加验证规则
          if (config.validation_rules) {
            try {
              validationRules[frontendKey] = typeof config.validation_rules === 'string' 
                ? JSON.parse(config.validation_rules) 
                : config.validation_rules;
            } catch (e) {
              console.warn(`解析验证规则失败 ${backendKey}:`, e);
            }
          }
        }
      } catch (error) {
        console.warn(`配置项 ${backendKey} 不存在，使用默认值`);
      }
    }

    // 设置默认值
    const defaultEnergyConfig = {
      usdt_standard_energy: 15000,
      usdt_max_energy: 30000, 
      usdt_buffer_percentage: 20,
      preset_values: [
        { name: '保守', value: 32000 },
        { name: '标准', value: 15000 },
        { name: '激进', value: 13000 }
      ]
    };

    const response: ApiResponse = {
      success: true,
      data: { 
        ...defaultEnergyConfig, 
        ...energyConfig,
        validation_rules: validationRules 
      }
    };

    res.json(response);
  } catch (error) {
    console.error('获取能量配置失败:', error);
    const response: ApiResponse = {
      success: false,
      message: '获取能量配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    };
    res.status(500).json(response);
  }
});

/**
 * 保存能量配置
 */
router.put('/energy', authenticateToken, async (req: Request, res: Response) => {
  try {
    const energyConfig = req.body;
    const configs: { config_key: string; config_value: string }[] = [];

    // 将前端配置转换为后端配置更新请求
    for (const [frontendKey, backendKey] of Object.entries(ENERGY_CONFIG_KEYS)) {
      if (energyConfig[frontendKey] !== undefined) {
        let configValue: string;
        
        // 特殊处理preset_values，将其序列化为JSON
        if (frontendKey === 'preset_values') {
          configValue = JSON.stringify(energyConfig[frontendKey]);
        } else {
          configValue = String(energyConfig[frontendKey]);
        }
        
        configs.push({
          config_key: backendKey,
          config_value: configValue
        });
      }
    }

    if (configs.length > 0) {
      await configService.batchUpdateConfigs(
        { configs, change_reason: '更新能量消耗配置' },
        String(req.user?.id),
        req.user?.role
      );
    }

    const response: ApiResponse = {
      success: true,
      message: '能量配置保存成功'
    };

    res.json(response);
  } catch (error) {
    console.error('保存能量配置失败:', error);
    const response: ApiResponse = {
      success: false,
      message: '保存能量配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    };
    res.status(500).json(response);
  }
});

/**
 * 保存能量配置的预设值
 */
router.put('/energy/presets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { preset_values } = req.body;
    
    if (!Array.isArray(preset_values)) {
      const response: ApiResponse = {
        success: false,
        message: '预设值数据格式错误'
      };
      return res.status(400).json(response);
    }

    // 只更新预设值配置
    const configKey = ENERGY_CONFIG_KEYS.preset_values;
    const configValue = JSON.stringify(preset_values);
    
    await configService.batchUpdateConfigs(
      { 
        configs: [{
          config_key: configKey,
          config_value: configValue
        }],
        change_reason: '更新能量消耗预设值' 
      },
      String(req.user?.id),
      req.user?.role
    );

    const response: ApiResponse = {
      success: true,
      message: '预设值保存成功'
    };

    res.json(response);
  } catch (error) {
    console.error('保存预设值失败:', error);
    const response: ApiResponse = {
      success: false,
      message: '保存预设值失败',
      error: error instanceof Error ? error.message : '未知错误'
    };
    res.status(500).json(response);
  }
});

/**
 * 获取带宽配置
 */
router.get('/bandwidth', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bandwidthConfig: any = {};
    const validationRules: any = {};
    
    // 获取所有带宽相关配置
    for (const [frontendKey, backendKey] of Object.entries(BANDWIDTH_CONFIG_KEYS)) {
      try {
        const config = await configService.getConfigByKey(backendKey, req.user?.role);
        if (config) {
          if (config.config_type === 'boolean') {
            bandwidthConfig[frontendKey] = config.config_value === 'true';
          } else if (config.config_type === 'number') {
            bandwidthConfig[frontendKey] = Number(config.config_value);
          } else if (frontendKey === 'preset_values') {
            // 特殊处理preset_values，从JSON字符串解析为数组
            try {
              bandwidthConfig[frontendKey] = JSON.parse(config.config_value);
            } catch (e) {
              bandwidthConfig[frontendKey] = [];
            }
          } else {
            bandwidthConfig[frontendKey] = config.config_value;
          }
          
          // 添加验证规则
          if (config.validation_rules) {
            try {
              validationRules[frontendKey] = typeof config.validation_rules === 'string' 
                ? JSON.parse(config.validation_rules) 
                : config.validation_rules;
            } catch (e) {
              console.warn(`解析验证规则失败 ${backendKey}:`, e);
            }
          }
        }
      } catch (error) {
        console.warn(`配置项 ${backendKey} 不存在，使用默认值`);
      }
    }

    // 设置默认值
    const defaultBandwidthConfig = {
      trx_transfer_bandwidth: 268,
      trc20_transfer_bandwidth: 345,
      account_create_bandwidth: 1000,
      buffer_percentage: 15,
      max_bandwidth_limit: 5000,
      preset_values: [
        { name: '保守', value: 500 },
        { name: '标准', value: 345 },
        { name: '激进', value: 268 }
      ]
    };

    const response: ApiResponse = {
      success: true,
      data: { 
        ...defaultBandwidthConfig, 
        ...bandwidthConfig,
        validation_rules: validationRules 
      }
    };

    res.json(response);
  } catch (error) {
    console.error('获取带宽配置失败:', error);
    const response: ApiResponse = {
      success: false,
      message: '获取带宽配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    };
    res.status(500).json(response);
  }
});

/**
 * 保存带宽配置
 */
router.put('/bandwidth', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bandwidthConfig = req.body;
    const configs: { config_key: string; config_value: string }[] = [];

    // 将前端配置转换为后端配置更新请求
    for (const [frontendKey, backendKey] of Object.entries(BANDWIDTH_CONFIG_KEYS)) {
      if (bandwidthConfig[frontendKey] !== undefined) {
        let configValue: string;
        
        // 特殊处理preset_values，将其序列化为JSON
        if (frontendKey === 'preset_values') {
          configValue = JSON.stringify(bandwidthConfig[frontendKey]);
        } else {
          configValue = String(bandwidthConfig[frontendKey]);
        }
        
        configs.push({
          config_key: backendKey,
          config_value: configValue
        });
      }
    }

    if (configs.length > 0) {
      await configService.batchUpdateConfigs(
        { configs, change_reason: '更新带宽消耗配置' },
        String(req.user?.id),
        req.user?.role
      );
    }

    const response: ApiResponse = {
      success: true,
      message: '带宽配置保存成功'
    };

    res.json(response);
  } catch (error) {
    console.error('保存带宽配置失败:', error);
    const response: ApiResponse = {
      success: false,
      message: '保存带宽配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    };
    res.status(500).json(response);
  }
});

export default router;
