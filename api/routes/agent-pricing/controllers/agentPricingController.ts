/**
 * 代理商价格配置控制器
 * 处理HTTP请求和响应
 */
import type { Request, Response } from 'express';
import { AgentPricingService } from '../services/agentPricingService.js';
import type {
    AgentPricingQuery,
    BatchConfigRequest,
    CreateAgentPricingRequest,
    UpdateAgentPricingRequest
} from '../types/agentPricing.types.js';
import { AgentPricingValidation } from './agentPricingValidation.js';

export class AgentPricingController {
  private service: AgentPricingService;

  constructor() {
    this.service = new AgentPricingService();
  }

  /**
   * 获取代理商价格配置列表
   * GET /api/agent-pricing
   */
  async getConfigs(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: AgentPricingQuery = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        agent_id: req.query.agent_id as string,
        package_id: req.query.package_id as string,
        status: req.query.status as 'active' | 'inactive',
        search: req.query.search as string,
        level: req.query.level as string
      };

      const result = await this.service.getConfigsList(queryParams);

      res.status(200).json({
        success: true,
        message: '获取代理商价格配置成功',
        data: result
      });

    } catch (error) {
      console.error('获取代理商价格配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取特定代理商的价格配置
   * GET /api/agent-pricing/agent/:agentId
   */
  async getAgentConfigs(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const packageId = req.query.package_id as string;

      const result = await this.service.getAgentConfigs(agentId, packageId);

      res.status(200).json({
        success: true,
        message: '获取代理商价格配置成功',
        data: result
      });

    } catch (error) {
      console.error('获取代理商价格配置错误:', error);
      
      if (error instanceof Error && error.message === '代理商不存在') {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
    }
  }

  /**
   * 创建代理商价格配置
   * POST /api/agent-pricing
   */
  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateAgentPricingRequest = req.body;

      // 验证请求数据
      const validation = await AgentPricingValidation.validateCreateRequest(data);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          message: validation.error
        });
        return;
      }

      const result = await this.service.createConfig(data, req.user?.userId || '');

      res.status(201).json({
        success: true,
        message: '代理商价格配置创建成功',
        data: result
      });

    } catch (error) {
      console.error('创建代理商价格配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新代理商价格配置
   * PUT /api/agent-pricing/:id
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateAgentPricingRequest = req.body;

      // 验证是否有更新字段
      const hasFieldsValidation = AgentPricingValidation.validateHasUpdateFields(data);
      if (!hasFieldsValidation.valid) {
        res.status(400).json({
          success: false,
          message: hasFieldsValidation.error
        });
        return;
      }

      // 验证请求数据
      const validation = await AgentPricingValidation.validateUpdateRequest(id, data);
      if (!validation.valid) {
        res.status(404).json({
          success: false,
          message: validation.error
        });
        return;
      }

      const result = await this.service.updateConfig(id, data, req.user?.userId || '');

      res.status(200).json({
        success: true,
        message: '代理商价格配置更新成功',
        data: result
      });

    } catch (error) {
      console.error('更新代理商价格配置错误:', error);
      
      if (error instanceof Error && error.message === '代理商价格配置不存在') {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
    }
  }

  /**
   * 删除代理商价格配置
   * DELETE /api/agent-pricing/:id
   */
  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // 验证删除权限
      const validation = await AgentPricingValidation.validateDeleteRequest(id);
      if (!validation.valid) {
        res.status(404).json({
          success: false,
          message: validation.error
        });
        return;
      }

      await this.service.deleteConfig(id, req.user?.userId || '');

      res.status(200).json({
        success: true,
        message: '代理商价格配置删除成功'
      });

    } catch (error) {
      console.error('删除代理商价格配置错误:', error);
      
      if (error instanceof Error && error.message === '代理商价格配置不存在') {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
    }
  }

  /**
   * 获取代理商等级价格配置
   * GET /api/agent-pricing/levels
   */
  async getLevelConfigs(req: Request, res: Response): Promise<void> {
    try {
      const packageId = req.query.package_id as string;

      const result = await this.service.getLevelConfigs(packageId);

      res.status(200).json({
        success: true,
        message: '获取代理商等级价格配置成功',
        data: result
      });

    } catch (error) {
      console.error('获取代理商等级价格配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 批量设置代理商价格配置
   * POST /api/agent-pricing/batch
   */
  async batchSetConfigs(req: Request, res: Response): Promise<void> {
    try {
      const data: BatchConfigRequest = req.body;

      // 验证批量请求
      const validation = AgentPricingValidation.validateBatchRequest(data);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          message: validation.error
        });
        return;
      }

      const result = await this.service.batchSetConfigs(data, req.user?.userId || '');

      res.status(200).json({
        success: true,
        message: '批量操作完成',
        data: result
      });

    } catch (error) {
      console.error('批量设置代理商价格配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取代理商等级价格配置统计
   * GET /api/agent-pricing/level-stats
   */
  async getLevelStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.getLevelStats();

      res.status(200).json({
        success: true,
        message: '获取代理商等级统计成功',
        data: result
      });

    } catch (error) {
      console.error('获取代理商等级统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 错误处理中间件
   */
  private handleError(error: any, res: Response, defaultMessage: string = '服务器内部错误'): void {
    console.error(error);
    
    // 根据错误类型返回不同的状态码和消息
    if (error instanceof Error) {
      switch (error.message) {
        case '代理商不存在':
        case '能量包不存在':
        case '价格模板不存在':
        case '代理商价格配置不存在':
          res.status(404).json({
            success: false,
            message: error.message
          });
          return;
        case '该代理商和能量包的价格配置已存在':
          res.status(409).json({
            success: false,
            message: error.message
          });
          return;
        case '代理商状态不活跃，无法设置价格配置':
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
      }
    }

    res.status(500).json({
      success: false,
      message: defaultMessage
    });
  }
}

// 创建控制器实例并导出方法
const controller = new AgentPricingController();

export const getConfigs = controller.getConfigs.bind(controller);
export const getAgentConfigs = controller.getAgentConfigs.bind(controller);
export const createConfig = controller.createConfig.bind(controller);
export const updateConfig = controller.updateConfig.bind(controller);
export const deleteConfig = controller.deleteConfig.bind(controller);
export const getLevelConfigs = controller.getLevelConfigs.bind(controller);
export const batchSetConfigs = controller.batchSetConfigs.bind(controller);
export const getLevelStats = controller.getLevelStats.bind(controller);
