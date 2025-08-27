/**
 * 机器人价格配置控制器
 */
import type { Request, Response } from 'express';
import { RobotPricingService } from '../services/robotPricingService.js';
import { RobotPricingValidation } from './robotPricingValidation.js';

export class RobotPricingController {
  private service: RobotPricingService;

  constructor() {
    this.service = new RobotPricingService();
  }

  async getConfigs(req: Request, res: Response): Promise<void> {
    try {
      const queryParams = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        bot_id: req.query.bot_id as string,
        package_id: req.query.package_id as string,
        status: req.query.status as 'active' | 'inactive',
        search: req.query.search as string
      };

      const result = await this.service.getConfigsList(queryParams);

      res.status(200).json({
        success: true,
        message: '获取机器人价格配置成功',
        data: result
      });
    } catch (error) {
      console.error('获取机器人价格配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  async getBotConfigs(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const packageId = req.query.package_id as string;

      const result = await this.service.getBotConfigs(botId, packageId);

      res.status(200).json({
        success: true,
        message: '获取机器人价格配置成功',
        data: result
      });
    } catch (error) {
      console.error('获取机器人价格配置错误:', error);
      
      if (error instanceof Error && error.message === '机器人不存在') {
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

  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;

      const validation = await RobotPricingValidation.validateCreateRequest(data);
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
        message: '机器人价格配置创建成功',
        data: result
      });
    } catch (error) {
      console.error('创建机器人价格配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const hasFieldsValidation = RobotPricingValidation.validateHasUpdateFields(data);
      if (!hasFieldsValidation.valid) {
        res.status(400).json({
          success: false,
          message: hasFieldsValidation.error
        });
        return;
      }

      const validation = await RobotPricingValidation.validateUpdateRequest(id, data);
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
        message: '机器人价格配置更新成功',
        data: result
      });
    } catch (error) {
      console.error('更新机器人价格配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const validation = await RobotPricingValidation.validateDeleteRequest(id);
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
        message: '机器人价格配置删除成功'
      });
    } catch (error) {
      console.error('删除机器人价格配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  async batchSetConfigs(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;

      const validation = RobotPricingValidation.validateBatchRequest(data);
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
      console.error('批量设置机器人价格配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  async copyConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { target_bot_ids, target_package_ids } = req.body;

      const validation = await RobotPricingValidation.validateCopyRequest(id, target_bot_ids, target_package_ids);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          message: validation.error
        });
        return;
      }

      const result = await this.service.copyConfig(id, { target_bot_ids, target_package_ids }, req.user?.userId || '');

      res.status(200).json({
        success: true,
        message: '复制配置完成',
        data: result
      });
    } catch (error) {
      console.error('复制机器人价格配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

// 创建控制器实例并导出方法
const controller = new RobotPricingController();

export const getConfigs = controller.getConfigs.bind(controller);
export const getBotConfigs = controller.getBotConfigs.bind(controller);
export const createConfig = controller.createConfig.bind(controller);
export const updateConfig = controller.updateConfig.bind(controller);
export const deleteConfig = controller.deleteConfig.bind(controller);
export const batchSetConfigs = controller.batchSetConfigs.bind(controller);
export const copyConfig = controller.copyConfig.bind(controller);
