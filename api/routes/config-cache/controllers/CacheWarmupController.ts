/**
 * 缓存预热控制器
 * 负责处理缓存预热和通知相关的请求
 */
import type { Request, Response } from 'express';
import { query } from '../../../config/database.js';
import configCacheService from '../../../services/config-cache.js';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 预热配置缓存
 * POST /api/config-cache/warmup
 * 权限：管理员
 */
export const warmupCache: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { types = ['bot', 'network', 'pool'] } = req.body;
    
    const results = [];
    
    for (const type of types) {
      try {
        let count = 0;
        
        switch (type) {
          case 'bot':
            // 预热所有活跃机器人配置
            const bots = await query(
              'SELECT id FROM telegram_bots WHERE is_active = $1',
              [true]
            );
            
            for (const bot of bots.rows) {
              await configCacheService.getBotConfig(bot.id);
              await configCacheService.getBotNetworks(bot.id);
              count++;
            }
            
            results.push({ type: 'bot', status: 'success', count });
            break;
            
          case 'network':
            // 预热所有活跃网络配置
            const networks = await query(
              'SELECT id FROM tron_networks WHERE is_active = true'
            );
            
            for (const network of networks.rows) {
              await configCacheService.getNetworkConfig(network.id);
              count++;
            }
            
            results.push({ type: 'network', status: 'success', count });
            break;
            
          case 'pool':
            // 预热所有活跃能量池配置
            const pools = await query(
              'SELECT id FROM energy_pools WHERE status = $1',
              ['active']
            );
            
            for (const pool of pools.rows) {
              await configCacheService.getPoolConfig(pool.id);
              count++;
            }
            
            results.push({ type: 'pool', status: 'success', count });
            break;
            
          default:
            results.push({ type, status: 'error', reason: '未知的缓存类型' });
        }
      } catch (error) {
        results.push({ 
          type, 
          status: 'error', 
          reason: error instanceof Error ? error.message : '预热失败' 
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const totalWarmed = results
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + (r.count || 0), 0);
    
    res.status(200).json({
      success: true,
      message: `缓存预热完成：预热了 ${totalWarmed} 个配置项`,
      data: {
        results,
        summary: {
          types_processed: results.length,
          successful_types: successCount,
          total_configs_warmed: totalWarmed
        },
        warmed_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('预热缓存错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 发布配置变更通知（测试用）
 * POST /api/config-cache/notify
 * 权限：管理员
 */
export const publishNotification: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { type, entity_id, changes } = req.body;
    
    if (!type || !entity_id) {
      res.status(400).json({
        success: false,
        message: '请提供配置类型和实体ID'
      });
      return;
    }
    
    await configCacheService.publishConfigChange(type, entity_id, changes || {});
    
    res.status(200).json({
      success: true,
      message: '配置变更通知已发布',
      data: {
        type,
        entity_id,
        changes,
        published_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('发布配置变更通知错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
