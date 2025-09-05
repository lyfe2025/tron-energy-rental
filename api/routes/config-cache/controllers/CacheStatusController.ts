/**
 * 缓存状态控制器
 * 负责处理缓存状态查询相关的请求
 */
import type { Request, Response } from 'express';
import configCacheService from '../../../services/config-cache.js';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 获取缓存状态和统计信息
 * GET /api/config-cache/status
 * 权限：管理员
 */
export const getCacheStatus: RouteHandler = async (req: Request, res: Response) => {
  try {
    const stats = await configCacheService.getCacheStats();
    
    res.status(200).json({
      success: true,
      message: '缓存状态获取成功',
      data: {
        cache_status: stats,
        service_info: {
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('获取缓存状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
