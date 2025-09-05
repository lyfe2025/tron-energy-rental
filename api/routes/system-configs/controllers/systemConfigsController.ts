/**
 * 系统配置控制器
 * 
 * 处理系统配置相关的HTTP请求和响应
 * 协调请求验证、业务逻辑处理和响应格式化
 */

import type { Request, Response } from 'express';
import { SystemConfigsService } from '../services/systemConfigsService.js';
import type {
    ApiResponse,
    BatchUpdateRequest,
    CreateSystemConfigRequest,
    DeleteConfigRequest,
    ResetConfigRequest,
    SystemConfigQuery,
    UpdateSystemConfigRequest
} from '../types/systemConfigs.types.js';

export class SystemConfigsController {
  private service: SystemConfigsService;

  constructor() {
    this.service = new SystemConfigsService();
  }

  /**
   * 获取系统配置列表
   */
  async getConfigs(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: SystemConfigQuery = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        category: req.query.category as string,
        search: req.query.search as string,
        is_public: req.query.is_public ? req.query.is_public === 'true' : undefined,
        is_editable: req.query.is_editable ? req.query.is_editable === 'true' : undefined
      };

      const result = await this.service.getSystemConfigs(queryParams, req.user?.role);

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (error) {
      console.error('获取系统配置列表失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '获取系统配置列表失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 获取单个配置
   */
  async getConfigByKey(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;

      const config = await this.service.getConfigByKey(key, req.user?.role);

      const response: ApiResponse = {
        success: true,
        data: config
      };

      res.json(response);
    } catch (error) {
      console.error('获取配置失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      const response: ApiResponse = {
        success: false,
        message: '获取配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 创建配置
   */
  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const configData: CreateSystemConfigRequest = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: '用户信息缺失'
        };
        res.status(401).json(response);
        return;
      }

      const newConfig = await this.service.createConfig(configData, String(userId));

      const response: ApiResponse = {
        success: true,
        message: '配置创建成功',
        data: newConfig
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('创建配置失败:', error);
      const statusCode = error instanceof Error && error.message.includes('已存在') ? 409 : 400;
      const response: ApiResponse = {
        success: false,
        message: '创建配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const updateData: UpdateSystemConfigRequest = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: '用户信息缺失'
        };
        res.status(401).json(response);
        return;
      }

      const updatedConfig = await this.service.updateConfig(key, updateData, String(userId));

      const response: ApiResponse = {
        success: true,
        message: '配置更新成功',
        data: updatedConfig
      };

      res.json(response);
    } catch (error) {
      console.error('更新配置失败:', error);
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          statusCode = 404;
        } else if (error.message.includes('不允许') || error.message.includes('没有提供')) {
          statusCode = 403;
        } else if (error.message.includes('格式错误') || error.message.includes('验证失败')) {
          statusCode = 400;
        }
      }

      const response: ApiResponse = {
        success: false,
        message: '更新配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(req: Request, res: Response): Promise<void> {
    console.log('🚀 [批量更新] 开始批量更新配置请求');
    console.log('📥 [批量更新] 请求体:', JSON.stringify(req.body, null, 2));
    console.log('👤 [批量更新] 用户信息:', {
      userId: req.user?.userId,
      role: req.user?.role,
      email: req.user?.email
    });
    
    try {
      const batchData: BatchUpdateRequest = req.body;
      const userId = req.user?.userId;

      console.log('📋 [批量更新] 解析后的批量数据:', batchData);
      console.log('🔍 [批量更新] 配置项数量:', batchData.configs?.length || 0);
      
      if (batchData.configs) {
        batchData.configs.forEach((config, index) => {
          console.log(`📝 [批量更新] 配置项 ${index + 1}:`, {
            config_key: config.config_key,
            config_value: config.config_value,
            value_type: typeof config.config_value
          });
        });
      }

      if (!userId) {
        console.error('❌ [批量更新] 用户信息缺失');
        const response: ApiResponse = {
          success: false,
          message: '用户信息缺失'
        };
        res.status(401).json(response);
        return;
      }

      console.log('🔄 [批量更新] 调用服务层进行批量更新...');
      const result = await this.service.batchUpdateConfigs(batchData, String(userId), req.user?.role);
      console.log('✅ [批量更新] 服务层返回结果:', result);

      const response: ApiResponse = {
        success: true,
        message: `批量更新完成，成功: ${result.updated.length}，失败: ${result.errors.length}`,
        data: result
      };

      console.log('📤 [批量更新] 发送响应:', response);
      res.json(response);
    } catch (error) {
      console.error('💥 [批量更新] 批量更新配置失败:', error);
      console.error('💥 [批量更新] 错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : null,
        name: error instanceof Error ? error.name : null
      });
      
      const response: ApiResponse = {
        success: false,
        message: '批量更新配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      
      console.log('📤 [批量更新] 发送错误响应:', response);
      res.status(400).json(response);
    }
  }

  /**
   * 删除配置
   */
  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const { change_reason }: DeleteConfigRequest = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: '用户信息缺失'
        };
        res.status(401).json(response);
        return;
      }

      await this.service.deleteConfig(key, String(userId), change_reason);

      const response: ApiResponse = {
        success: true,
        message: '配置删除成功'
      };

      res.json(response);
    } catch (error) {
      console.error('删除配置失败:', error);
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          statusCode = 404;
        } else if (error.message.includes('不允许')) {
          statusCode = 403;
        }
      }

      const response: ApiResponse = {
        success: false,
        message: '删除配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 重置配置为默认值
   */
  async resetConfig(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const resetData: ResetConfigRequest = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: '用户信息缺失'
        };
        res.status(401).json(response);
        return;
      }

      const resetConfig = await this.service.resetConfigToDefault(key, String(userId), resetData);

      const response: ApiResponse = {
        success: true,
        message: '配置重置成功',
        data: resetConfig
      };

      res.json(response);
    } catch (error) {
      console.error('重置配置失败:', error);
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          statusCode = 404;
        } else if (error.message.includes('不允许') || error.message.includes('没有默认值')) {
          statusCode = 403;
        }
      }

      const response: ApiResponse = {
        success: false,
        message: '重置配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 获取配置历史记录
   */
  async getConfigHistory(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await this.service.getConfigHistory(key, page, limit);

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (error) {
      console.error('获取配置历史失败:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      const response: ApiResponse = {
        success: false,
        message: '获取配置历史失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 获取配置分类列表
   */
  async getConfigCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.service.getConfigCategories(req.user?.role);

      const response: ApiResponse = {
        success: true,
        data: categories
      };

      res.json(response);
    } catch (error) {
      console.error('获取配置分类失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '获取配置分类失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 获取配置统计信息
   */
  async getConfigStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.service.getConfigStats(req.user?.role);

      const response: ApiResponse = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('获取配置统计失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '获取配置统计失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 验证配置值格式（工具接口）
   */
  async validateConfigValue(req: Request, res: Response): Promise<void> {
    try {
      const { value, type } = req.body;

      if (!type) {
        const response: ApiResponse = {
          success: false,
          message: '配置类型不能为空'
        };
        res.status(400).json(response);
        return;
      }

      const validationResult = this.service.validateConfigValue(value, type);

      const response: ApiResponse = {
        success: true,
        data: validationResult
      };

      res.json(response);
    } catch (error) {
      console.error('验证配置值失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '验证配置值失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 获取所有设置相关的配置（用于设置页面）
   */
  async getAllSettingsConfigs(req: Request, res: Response): Promise<void> {
    try {
      const categories = ['system', 'security', 'notification', 'pricing', 'cache', 'logging', 'api', 'features'];
      const allConfigs: any[] = [];
      
      // 获取所有分类的配置
      for (const category of categories) {
        const queryParams: SystemConfigQuery = {
          page: 1,
          limit: 100,
          category: category
        };
        
        const result = await this.service.getSystemConfigs(queryParams, req.user?.role);
        if (result.configs) {
          allConfigs.push(...result.configs);
        }
      }

      const response: ApiResponse = {
        success: true,
        data: allConfigs
      };

      res.json(response);
    } catch (error) {
      console.error('获取所有设置配置失败:', error);
      const response: ApiResponse = {
        success: false,
        message: '获取所有设置配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }
}

// 创建控制器实例
const controller = new SystemConfigsController();

// 导出控制器方法
export const getConfigs = controller.getConfigs.bind(controller);
export const getConfigByKey = controller.getConfigByKey.bind(controller);
export const createConfig = controller.createConfig.bind(controller);
export const updateConfig = controller.updateConfig.bind(controller);
export const batchUpdateConfigs = controller.batchUpdateConfigs.bind(controller);
export const deleteConfig = controller.deleteConfig.bind(controller);
export const resetConfig = controller.resetConfig.bind(controller);
export const getConfigHistory = controller.getConfigHistory.bind(controller);
export const getConfigCategories = controller.getConfigCategories.bind(controller);
export const getConfigStats = controller.getConfigStats.bind(controller);
export const validateConfigValue = controller.validateConfigValue.bind(controller);
export const getAllSettingsConfigs = controller.getAllSettingsConfigs.bind(controller);
