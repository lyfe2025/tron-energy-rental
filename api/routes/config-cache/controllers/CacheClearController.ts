/**
 * 缓存清除控制器
 * 负责处理各种缓存清除相关的请求
 */
import type { Request, Response } from 'express';
import { query } from '../../../config/database.js';
import configCacheService from '../../../services/config-cache.js';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 清除指定机器人的缓存
 * DELETE /api/config-cache/bot/:id
 * 权限：管理员
 */
export const clearBotCache: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 验证机器人是否存在
    const botCheck = await query(
      'SELECT id, name FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (botCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    await configCacheService.clearBotCache(id);
    
    res.status(200).json({
      success: true,
      message: `机器人 ${botCheck.rows[0].name} 的缓存已清除`,
      data: {
        bot_id: id,
        bot_name: botCheck.rows[0].name,
        cleared_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('清除机器人缓存错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 清除指定网络的缓存
 * DELETE /api/config-cache/network/:id
 * 权限：管理员
 */
export const clearNetworkCache: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 验证网络是否存在
    const networkCheck = await query(
      'SELECT id, name FROM tron_networks WHERE id = $1',
      [id]
    );
    
    if (networkCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '网络不存在'
      });
      return;
    }
    
    await configCacheService.clearNetworkCache(id);
    
    res.status(200).json({
      success: true,
      message: `网络 ${networkCheck.rows[0].name} 的缓存已清除`,
      data: {
        network_id: id,
        network_name: networkCheck.rows[0].name,
        cleared_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('清除网络缓存错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 清除指定能量池的缓存
 * DELETE /api/config-cache/pool/:id
 * 权限：管理员
 */
export const clearPoolCache: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 验证能量池是否存在
    const poolCheck = await query(
      'SELECT id, name FROM energy_pools WHERE id = $1',
      [id]
    );
    
    if (poolCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量池不存在'
      });
      return;
    }
    
    await configCacheService.clearPoolCache(id);
    
    res.status(200).json({
      success: true,
      message: `能量池 ${poolCheck.rows[0].name} 的缓存已清除`,
      data: {
        pool_id: id,
        pool_name: poolCheck.rows[0].name,
        cleared_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('清除能量池缓存错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 清除所有系统缓存
 * DELETE /api/config-cache/system
 * 权限：管理员
 */
export const clearSystemCache: RouteHandler = async (req: Request, res: Response) => {
  try {
    await configCacheService.clearSystemCache();
    
    res.status(200).json({
      success: true,
      message: '系统缓存已清除',
      data: {
        cleared_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('清除系统缓存错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 批量清除缓存
 * DELETE /api/config-cache/batch
 * 权限：管理员
 */
export const clearBatchCache: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { types, entity_ids } = req.body;
    
    if (!Array.isArray(types) || types.length === 0) {
      res.status(400).json({
        success: false,
        message: '请提供要清除的缓存类型列表'
      });
      return;
    }
    
    const results = [];
    
    for (const type of types) {
      try {
        switch (type) {
          case 'bot':
            if (entity_ids && Array.isArray(entity_ids)) {
              for (const id of entity_ids) {
                await configCacheService.clearBotCache(id);
              }
              results.push({ type: 'bot', status: 'success', count: entity_ids.length });
            } else {
              results.push({ type: 'bot', status: 'skipped', reason: '未提供机器人ID列表' });
            }
            break;
            
          case 'network':
            if (entity_ids && Array.isArray(entity_ids)) {
              for (const id of entity_ids) {
                await configCacheService.clearNetworkCache(id);
              }
              results.push({ type: 'network', status: 'success', count: entity_ids.length });
            } else {
              results.push({ type: 'network', status: 'skipped', reason: '未提供网络ID列表' });
            }
            break;
            
          case 'pool':
            if (entity_ids && Array.isArray(entity_ids)) {
              for (const id of entity_ids) {
                await configCacheService.clearPoolCache(id);
              }
              results.push({ type: 'pool', status: 'success', count: entity_ids.length });
            } else {
              results.push({ type: 'pool', status: 'skipped', reason: '未提供能量池ID列表' });
            }
            break;
            
          case 'system':
            await configCacheService.clearSystemCache();
            results.push({ type: 'system', status: 'success' });
            break;
            
          default:
            results.push({ type, status: 'error', reason: '未知的缓存类型' });
        }
      } catch (error) {
        results.push({ 
          type, 
          status: 'error', 
          reason: error instanceof Error ? error.message : '清除失败' 
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    res.status(200).json({
      success: true,
      message: `批量清除缓存完成：成功 ${successCount} 个，失败 ${errorCount} 个`,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          error: errorCount,
          skipped: results.filter(r => r.status === 'skipped').length
        },
        cleared_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('批量清除缓存错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
