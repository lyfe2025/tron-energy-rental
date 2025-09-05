import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { NetworkLogService } from '../services/NetworkLogService';

const router = Router();

/**
 * GET /api/network-logs
 * 获取网络操作日志列表
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      network_id,
      level,
      action,
      start_date,
      end_date,
      page = 1,
      limit = 20
    } = req.query;

    const result = await NetworkLogService.getLogs({
      network_id: network_id as string,
      level: level as string,
      action: action as string,
      start_date: start_date as string,
      end_date: end_date as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      message: '网络日志获取成功',
      data: {
        logs: result.logs,
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('获取网络日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取网络日志失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/network-logs
 * 创建网络操作日志记录
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logData = {
      ...req.body,
      admin_id: (req as any).admin?.id,
      username: (req as any).admin?.username,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };

    const result = await NetworkLogService.createLog(logData);

    res.json({
      success: true,
      message: '网络日志记录成功',
      data: result
    });
  } catch (error) {
    console.error('创建网络日志失败:', error);
    res.status(500).json({
      success: false,
      message: '创建网络日志失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/network-logs/network/:networkId
 * 获取指定网络的日志记录
 */
router.get('/network/:networkId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { networkId } = req.params;
    const {
      level,
      action,
      start_date,
      end_date,
      page = 1,
      limit = 20
    } = req.query;

    const result = await NetworkLogService.getLogs({
      network_id: networkId,
      level: level as string,
      action: action as string,
      start_date: start_date as string,
      end_date: end_date as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      message: '网络日志获取成功',
      data: {
        logs: result.logs,
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('获取网络日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取网络日志失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
