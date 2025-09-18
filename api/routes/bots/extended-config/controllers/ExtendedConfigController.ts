/**
 * 扩展配置控制器
 * 负责机器人扩展配置的获取和更新操作
 */
import type { Request, Response } from 'express';
import type { ExtendedBotConfigData } from '../../types.js';
import { ExtendedConfigService } from '../services/ExtendedConfigService.js';

export class ExtendedConfigController {
  /**
   * 获取机器人扩展配置
   * GET /api/bots/:id/extended-config
   * 权限：管理员
   */
  static async getBotExtendedConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const configData = await ExtendedConfigService.getBotExtendedConfig(id);
      
      if (!configData) {
        res.status(404).json({
          success: false,
          message: '机器人不存在'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: '机器人扩展配置获取成功',
        data: configData
      });
      
    } catch (error) {
      console.error('获取机器人扩展配置错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新机器人扩展配置
   * PUT /api/bots/:id/extended-config
   * 权限：管理员
   */
  static async updateBotExtendedConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const configData = req.body as ExtendedBotConfigData;
      
      const updatedBot = await ExtendedConfigService.updateBotExtendedConfig(
        id, 
        configData, 
        req.user?.id,
        req.ip
      );
      
      res.status(200).json({
        success: true,
        message: '机器人扩展配置更新成功',
        data: {
          bot: updatedBot
        }
      });
      
    } catch (error) {
      console.error('更新机器人扩展配置错误:', error);
      
      if (error instanceof Error) {
        if (error.message === '机器人不存在') {
          res.status(404).json({
            success: false,
            message: error.message
          });
          return;
        }
        
        if (error.message === '没有提供要更新的配置字段') {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}
