/**
 * 统计分析控制器
 */
import type { Request, Response } from 'express';
import { StatisticsService } from '../services/statisticsService.ts';

export class StatisticsController {
  private service: StatisticsService;

  constructor() {
    this.service = new StatisticsService();
  }

  /**
   * 获取总览统计数据
   * GET /api/statistics/overview
   */
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30' } = req.query;
      const result = await this.service.getOverviewStats(period as string);

      res.status(200).json({
        success: true,
        message: '总览统计数据获取成功',
        data: result
      });
    } catch (error) {
      console.error('获取总览统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取订单统计数据
   * GET /api/statistics/orders
   */
  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const queryParams = {
        period: req.query.period as string,
        group_by: req.query.group_by as 'day' | 'week' | 'month'
      };

      const result = await this.service.getOrderStats(queryParams);

      res.status(200).json({
        success: true,
        message: '订单统计数据获取成功',
        data: result
      });
    } catch (error) {
      console.error('获取订单统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取收入统计数据
   * GET /api/statistics/revenue
   */
  async getRevenue(req: Request, res: Response): Promise<void> {
    try {
      const queryParams = {
        period: req.query.period as string,
        group_by: req.query.group_by as 'day' | 'week' | 'month'
      };

      const result = await this.service.getRevenueStats(queryParams);

      res.status(200).json({
        success: true,
        message: '收入统计数据获取成功',
        data: result
      });
    } catch (error) {
      console.error('获取收入统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取用户活跃度统计
   * GET /api/statistics/users
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30' } = req.query;
      const result = await this.service.getUserStats(period as string);

      res.status(200).json({
        success: true,
        message: '用户活跃度统计获取成功',
        data: result
      });
    } catch (error) {
      console.error('获取用户活跃度统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取机器人使用率统计
   * GET /api/statistics/bots
   */
  async getBots(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30' } = req.query;
      const result = await this.service.getBotStats(period as string);

      res.status(200).json({
        success: true,
        message: '机器人使用率统计获取成功',
        data: result
      });
    } catch (error) {
      console.error('获取机器人使用率统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取实时统计数据
   * GET /api/statistics/realtime
   */
  async getRealtime(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.getRealtimeStats();

      res.status(200).json({
        success: true,
        message: '实时统计数据获取成功',
        data: result
      });
    } catch (error) {
      console.error('获取实时统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取机器人状态统计
   * GET /api/statistics/bot-status
   */
  async getBotStatus(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.getBotStatusStats();

      res.status(200).json({
        success: true,
        message: '机器人状态统计获取成功',
        data: result
      });
    } catch (error) {
      console.error('获取机器人状态统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        data: {
          online: 0,
          offline: 0,
          error: 0,
          maintenance: 0,
          chart_data: []
        }
      });
    }
  }
}

// 创建控制器实例并导出方法
const controller = new StatisticsController();

export const getOverview = controller.getOverview.bind(controller);
export const getOrders = controller.getOrders.bind(controller);
export const getRevenue = controller.getRevenue.bind(controller);
export const getUsers = controller.getUsers.bind(controller);
export const getBots = controller.getBots.bind(controller);
export const getRealtime = controller.getRealtime.bind(controller);
export const getBotStatus = controller.getBotStatus.bind(controller);
