/**
 * 代理商管理API路由
 * 专门处理agents表的代理商管理
 */

import { Router, type Request, type Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../middleware/auth.ts';
import { handleValidationErrors } from '../middleware/validation.ts';
import { AgentService } from '../services/agent.ts';

const router: Router = Router();

// 应用认证中间件
router.use(authenticateToken);

/**
 * 获取代理商列表
 * GET /api/agents
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('status').optional().isString().withMessage('状态必须是字符串'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status
    } = req.query;

    const result = await AgentService.getAgents({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      status: status as string
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取代理商列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取代理商列表失败'
    });
  }
});

/**
 * 获取代理商统计数据
 * GET /api/agents/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await AgentService.getAgentStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取代理商统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
});

/**
 * 获取代理商详情
 * GET /api/agents/:id
 */
router.get('/:id', [
  param('id').isUUID().withMessage('代理商ID必须是有效的UUID'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agent = await AgentService.getAgentById(id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: '代理商不存在'
      });
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('获取代理商详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取代理商详情失败'
    });
  }
});

/**
 * 创建代理商
 * POST /api/agents
 */
router.post('/', [
  body('user_id').isUUID().withMessage('用户ID必须是有效的UUID'),
  body('agent_code').isString().isLength({ min: 3, max: 20 }).withMessage('代理商编码长度必须在3-20之间'),
  body('commission_rate').isFloat({ min: 0, max: 1 }).withMessage('佣金比例必须在0-1之间'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('状态无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const agentData = req.body;
    const agent = await AgentService.createAgent(agentData);

    res.status(201).json({
      success: true,
      data: agent,
      message: '代理商创建成功'
    });
  } catch (error) {
    console.error('创建代理商失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建代理商失败'
    });
  }
});

/**
 * 更新代理商
 * PUT /api/agents/:id
 */
router.put('/:id', [
  param('id').isUUID().withMessage('代理商ID必须是有效的UUID'),
  body('agent_code').optional().isString().isLength({ min: 3, max: 20 }).withMessage('代理商编码长度必须在3-20之间'),
  body('commission_rate').optional().isFloat({ min: 0, max: 1 }).withMessage('佣金比例必须在0-1之间'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('状态无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const agent = await AgentService.updateAgent(id, updateData);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: '代理商不存在'
      });
    }

    res.json({
      success: true,
      data: agent,
      message: '代理商更新成功'
    });
  } catch (error) {
    console.error('更新代理商失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新代理商失败'
    });
  }
});

/**
 * 更新代理商状态
 * PATCH /api/agents/:id/status
 */
router.patch('/:id/status', [
  param('id').isUUID().withMessage('代理商ID必须是有效的UUID'),
  body('status').isIn(['active', 'inactive', 'suspended']).withMessage('状态无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const agent = await AgentService.updateAgentStatus(id, status);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: '代理商不存在'
      });
    }

    res.json({
      success: true,
      data: agent,
      message: `代理商状态已更新为${status}`
    });
  } catch (error) {
    console.error('更新代理商状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新代理商状态失败'
    });
  }
});

/**
 * 删除代理商
 * DELETE /api/agents/:id
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('代理商ID必须是有效的UUID'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await AgentService.deleteAgent(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '代理商不存在'
      });
    }

    res.json({
      success: true,
      message: '代理商删除成功'
    });
  } catch (error) {
    console.error('删除代理商失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除代理商失败'
    });
  }
});

/**
 * 获取代理商的下级用户
 * GET /api/agents/:id/users
 */
router.get('/:id/users', [
  param('id').isUUID().withMessage('代理商ID必须是有效的UUID'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const result = await AgentService.getAgentUsers(id, {
      page: Number(page),
      limit: Number(limit)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取代理商用户失败:', error);
    res.status(500).json({
      success: false,
      error: '获取代理商用户失败'
    });
  }
});

export default router;