/**
 * 能量包控制器
 * 
 * 处理能量包相关的HTTP请求和响应
 * 协调请求验证、业务逻辑处理和响应格式化
 */

import type { Request, Response } from 'express';
import { EnergyPackagesService } from '../services/energyPackagesService.js';
import type {
    ApiResponse,
    BatchPriceUpdateRequest,
    CreateEnergyPackageRequest,
    DuplicatePackageRequest,
    EnergyPackageQuery,
    UpdateEnergyPackageRequest,
    UpdatePackageStatusRequest
} from '../types/energyPackages.types.js';

export class EnergyPackagesController {
  private service: EnergyPackagesService;

  constructor() {
    this.service = new EnergyPackagesService();
  }

  /**
   * 获取能量包列表
   */
  async getPackages(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: EnergyPackageQuery = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        min_energy: req.query.min_energy ? Number(req.query.min_energy) : undefined,
        max_energy: req.query.max_energy ? Number(req.query.max_energy) : undefined,
        min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
        max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
        search: req.query.search as string
      };

      const result = await this.service.getEnergyPackages(queryParams);

      const response: ApiResponse<any> = {
        success: true,
        message: '能量包列表获取成功',
        data: result
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('获取能量包列表错误:', error);
      const response: ApiResponse<any> = {
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 获取单个能量包详情
   */
  async getPackageById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const packageWithStats = await this.service.getPackageWithStats(id);

      const response: ApiResponse<any> = {
        success: true,
        message: '能量包信息获取成功',
        data: {
          package: (packageWithStats as any).package || packageWithStats,
          stats: (packageWithStats as any).stats
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('获取能量包详情错误:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 500;
      const response: ApiResponse<any> = {
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 创建新能量包
   */
  async createPackage(req: Request, res: Response): Promise<void> {
    try {
      const packageData: CreateEnergyPackageRequest = req.body;
      const newPackage = await this.service.createPackage(packageData);

      const response: ApiResponse<any> = {
        success: true,
        message: '能量包创建成功',
        data: { package: newPackage }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('创建能量包错误:', error);
      const statusCode = error instanceof Error && error.message.includes('已存在') ? 400 : 500;
      const response: ApiResponse<any> = {
        success: false,
        message: '创建能量包失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 更新能量包信息
   */
  async updatePackage(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const updateData: UpdateEnergyPackageRequest = req.body;
      const updatedPackage = await this.service.updatePackage(id, updateData);

      const response: ApiResponse<any> = {
        success: true,
        message: '能量包信息更新成功',
        data: { package: updatedPackage }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('更新能量包信息错误:', error);
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          statusCode = 404;
        } else if (error.message.includes('已被使用') || error.message.includes('没有提供')) {
          statusCode = 400;
        }
      }

      const response: ApiResponse<any> = {
        success: false,
        message: '更新能量包失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 更新能量包状态
   */
  async updatePackageStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const statusData: UpdatePackageStatusRequest = req.body;
      const updatedPackage = await this.service.updatePackageStatus(id, statusData);

      const response: ApiResponse<any> = {
        success: true,
        message: `能量包已${statusData.is_active ? '启用' : '禁用'}`,
        data: { package: updatedPackage }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('更新能量包状态错误:', error);
      const statusCode = error instanceof Error && error.message.includes('不存在') ? 404 : 400;
      const response: ApiResponse<any> = {
        success: false,
        message: '更新状态失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 批量更新能量包价格
   */
  async batchUpdatePrices(req: Request, res: Response): Promise<void> {
    try {
      const batchData: BatchPriceUpdateRequest = req.body;
      const result = await this.service.batchUpdatePrices(batchData);

      const response: ApiResponse<any> = {
        success: true,
        message: `批量价格更新完成，成功更新${result.summary.success}个能量包`,
        data: result
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('批量更新能量包价格错误:', error);
      const response: ApiResponse<any> = {
        success: false,
        message: '批量更新失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(400).json(response);
    }
  }

  /**
   * 删除能量包
   */
  async deletePackage(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await this.service.deletePackage(id);

      const response: ApiResponse<any> = {
        success: true,
        message: '能量包删除成功'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('删除能量包错误:', error);
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          statusCode = 404;
        } else if (error.message.includes('关联')) {
          statusCode = 400;
        }
      }

      const response: ApiResponse<any> = {
        success: false,
        message: '删除失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }

  /**
   * 获取能量包统计信息
   */
  async getPackageStats(req: Request, res: Response): Promise<void> {
    try {
      const overview = await this.service.getPackageOverview();

      const response: ApiResponse<any> = {
        success: true,
        message: '能量包统计信息获取成功',
        data: overview
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('获取能量包统计错误:', error);
      const response: ApiResponse<any> = {
        success: false,
        message: '获取统计信息失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 复制能量包
   */
  async duplicatePackage(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const duplicateData: DuplicatePackageRequest = req.body;
      const duplicatedPackage = await this.service.duplicatePackage(id, duplicateData);

      const response: ApiResponse = {
        success: true,
        message: '能量包复制成功',
        data: { package: duplicatedPackage }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('复制能量包错误:', error);
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          statusCode = 404;
        } else if (error.message.includes('已存在')) {
          statusCode = 400;
        }
      }

      const response: ApiResponse = {
        success: false,
        message: '复制失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
      res.status(statusCode).json(response);
    }
  }
}

// 创建控制器实例
const controller = new EnergyPackagesController();

// 导出控制器方法
export const getPackages = controller.getPackages.bind(controller);
export const getPackageById = controller.getPackageById.bind(controller);
export const createPackage = controller.createPackage.bind(controller);
export const updatePackage = controller.updatePackage.bind(controller);
export const updatePackageStatus = controller.updatePackageStatus.bind(controller);
export const batchUpdatePrices = controller.batchUpdatePrices.bind(controller);
export const deletePackage = controller.deletePackage.bind(controller);
export const getPackageStats = controller.getPackageStats.bind(controller);
export const duplicatePackage = controller.duplicatePackage.bind(controller);
