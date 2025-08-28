/**
 * 代理商管理API路由
 * 处理代理商的增删改查、状态管理、定价配置等功能
 * 基于agents表结构（注意：agent_pricing表已移除）
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth.js';

const router: Router = Router();

/**
 * 获取代理商列表
 * GET /api/agents
 * 权限：管理员
 */
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(
        agent_code ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';
    
    // 构建查询 (注意：bots表已移除)
    const agentsQuery = `
      SELECT 
        a.id, a.agent_code, a.user_id, a.commission_rate, 
        a.status, a.total_earnings, a.total_orders, a.total_customers,
        a.created_at, a.updated_at
      FROM agents a
      ${whereClause.replace('status =', 'a.status =').replace('agent_code ILIKE', 'a.agent_code ILIKE')}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const agentsResult = await query(agentsQuery, queryParams);
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM agents a ${whereClause.replace('status =', 'a.status =').replace('agent_code ILIKE', 'a.agent_code ILIKE')}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '代理商列表获取成功',
      data: {
        agents: agentsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取代理商列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取单个代理商详情
 * GET /api/agents/:id
 * 权限：管理员
 */
router.get('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 查询代理商基本信息 (注意：bots表已移除)
    const agentResult = await query(
      `SELECT 
        a.id, a.agent_code, a.user_id, a.commission_rate, 
        a.status, a.total_earnings, a.total_orders, a.total_customers,
        a.created_at, a.updated_at
       FROM agents a
       WHERE a.id = $1`,
      [id]
    );
    
    if (agentResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商不存在'
      });
      return;
    }
    
    // 注意：旧的代理商定价配置表已移除，如需要请根据新架构实现
    // const pricingResult = await query(...)
    
    // 查询代理商管理的用户数量
    const userCountResult = await query(
      'SELECT COUNT(*) as user_count FROM telegram_users WHERE agent_id = $1',
      [id]
    );
    
    const agent = agentResult.rows[0];
    agent.pricing = []; // 旧的定价配置表已移除
    agent.user_count = parseInt(userCountResult.rows[0].user_count);
    
    res.status(200).json({
      success: true,
      message: '代理商信息获取成功',
      data: {
        agent
      }
    });
    
  } catch (error) {
    console.error('获取代理商详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 创建新代理商
 * POST /api/agents
 * 权限：管理员
 */
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user_id,
      agent_code,
      commission_rate = 0.1000,
      status = 'pending',
      bot_id
    } = req.body;
    
    // 验证必填字段
    if (!user_id || !agent_code) {
      res.status(400).json({
        success: false,
        message: '用户ID和代理商编码是必填字段'
      });
      return;
    }
    
    // 检查用户是否存在
    const existingUser = await query(
      'SELECT id FROM telegram_users WHERE id = $1',
      [user_id]
    );
    
    if (existingUser.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }
    
    // 检查代理商编码是否已存在
    const existingAgent = await query(
      'SELECT agent_code FROM agents WHERE agent_code = $1',
      [agent_code]
    );
    
    if (existingAgent.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '代理商编码已存在'
      });
      return;
    }
    
    // 检查用户是否已经是代理商
    const existingUserAgent = await query(
      'SELECT user_id FROM agents WHERE user_id = $1',
      [user_id]
    );
    
    if (existingUserAgent.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '该用户已经是代理商'
      });
      return;
    }
    
    // 验证佣金比例
    if (commission_rate < 0 || commission_rate > 1) {
      res.status(400).json({
        success: false,
        message: '佣金比例必须在0-1之间'
      });
      return;
    }
    
    // 注意：bots表已移除，bot_id参数已不再使用
    // if (bot_id) { ... }
    
    // 创建代理商
    const newAgent = await query(
      `INSERT INTO agents (
        user_id, agent_code, commission_rate, status
      ) VALUES ($1, $2, $3, $4)
      RETURNING 
        id, user_id, agent_code, commission_rate, status, created_at`,
      [user_id, agent_code, commission_rate, status]
    );
    
    // 注意：bots表已移除，不再需要更新机器人的agent_id
    // if (bot_id) { ... }
    
    res.status(201).json({
      success: true,
      message: '代理商创建成功',
      data: {
        agent: newAgent.rows[0]
      }
    });
    
  } catch (error) {
    console.error('创建代理商错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新代理商信息
 * PUT /api/agents/:id
 * 权限：管理员
 */
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      agent_code,
      commission_rate,
      status,
      bot_id
    } = req.body;
    
    // 检查代理商是否存在
    const existingAgent = await query(
      'SELECT id, agent_code FROM agents WHERE id = $1',
      [id]
    );
    
    if (existingAgent.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商不存在'
      });
      return;
    }
    
    const agent = existingAgent.rows[0];
    
    // 检查代理商编码是否被其他代理商使用
    if (agent_code && agent_code !== agent.agent_code) {
      const codeCheck = await query(
        'SELECT agent_code FROM agents WHERE agent_code = $1 AND id != $2',
        [agent_code, id]
      );
      
      if (codeCheck.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '代理商编码已被其他代理商使用'
        });
        return;
      }
    }
    
    // 验证佣金比例
    if (commission_rate !== undefined && (commission_rate < 0 || commission_rate > 1)) {
      res.status(400).json({
        success: false,
        message: '佣金比例必须在0-1之间'
      });
      return;
    }
    
    // 注意：bots表已移除，bot_id参数已不再使用
    // if (bot_id !== undefined) { ... }
    
    // 构建更新字段
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (agent_code !== undefined) {
      updateFields.push(`agent_code = $${paramIndex}`);
      updateValues.push(agent_code);
      paramIndex++;
    }
    
    if (commission_rate !== undefined) {
      updateFields.push(`commission_rate = $${paramIndex}`);
      updateValues.push(commission_rate);
      paramIndex++;
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
      return;
    }
    
    // 注意：bots表已移除，不再处理机器人关联更新
    // if (bot_id !== undefined) { ... }
    
    // 添加更新时间
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    
    // 执行更新
    const updateQuery = `
      UPDATE agents 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, agent_code, user_id, commission_rate, status, updated_at
    `;
    
    const updatedAgent = await query(updateQuery, updateValues);
    
    res.status(200).json({
      success: true,
      message: '代理商信息更新成功',
      data: {
        agent: updatedAgent.rows[0]
      }
    });
    

    
  } catch (error) {
    console.error('更新代理商信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新代理商状态
 * PATCH /api/agents/:id/status
 * 权限：管理员
 */
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // 验证状态值
    const validStatuses = ['active', 'inactive', 'pending'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: '无效的状态值，允许的值: ' + validStatuses.join(', ')
      });
      return;
    }
    
    // 检查代理商是否存在
    const existingAgent = await query(
      'SELECT id, status FROM agents WHERE id = $1',
      [id]
    );
    
    if (existingAgent.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商不存在'
      });
      return;
    }
    
    // 更新状态
    const updatedAgent = await query(
      `UPDATE agents 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, status, updated_at`,
      [status, id]
    );
    
    res.status(200).json({
      success: true,
      message: '代理商状态更新成功',
      data: {
        agent: updatedAgent.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新代理商状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 设置代理商定价
 * PUT /api/agents/:id/pricing
 * 权限：管理员
 */
router.put('/:id/pricing', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { energy_type, purchase_price, selling_price } = req.body;
    
    // 验证必填字段
    if (!energy_type || purchase_price === undefined || selling_price === undefined) {
      res.status(400).json({
        success: false,
        message: '能量类型、采购价格和销售价格是必填字段'
      });
      return;
    }
    
    // 验证价格
    if (purchase_price < 0 || selling_price < 0) {
      res.status(400).json({
        success: false,
        message: '价格不能为负数'
      });
      return;
    }
    
    if (selling_price <= purchase_price) {
      res.status(400).json({
        success: false,
        message: '销售价格必须大于采购价格'
      });
      return;
    }
    
    // 检查代理商是否存在
    const agentCheck = await query(
      'SELECT id FROM agents WHERE id = $1',
      [id]
    );
    
    if (agentCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商不存在'
      });
      return;
    }
    
    // 注意：旧的代理商定价表已移除，如需要请根据新架构实现
    res.status(501).json({
      success: false,
      message: '代理商定价功能已移除，请使用新的定价架构'
    });
    
  } catch (error) {
    console.error('设置代理商定价错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取代理商定价列表
 * GET /api/agents/:id/pricing
 * 权限：管理员
 */
router.get('/:id/pricing', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 检查代理商是否存在
    const agentCheck = await query(
      'SELECT id, name FROM agents WHERE id = $1',
      [id]
    );
    
    if (agentCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商不存在'
      });
      return;
    }
    
    // 注意：旧的代理商定价表已移除，如需要请根据新架构实现
    res.status(501).json({
      success: false,
      message: '代理商定价功能已移除，请使用新的定价架构'
    });
    
  } catch (error) {
    console.error('获取代理商定价列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除代理商定价
 * DELETE /api/agents/:id/pricing/:pricing_id
 * 权限：管理员
 */
router.delete('/:id/pricing/:pricing_id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, pricing_id } = req.params;
    
    // 注意：旧的代理商定价表已移除，如需要请根据新架构实现
    res.status(501).json({
      success: false,
      message: '代理商定价功能已移除，请使用新的定价架构'
    });
    
  } catch (error) {
    console.error('删除代理商定价错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除代理商
 * DELETE /api/agents/:id
 * 权限：管理员
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 检查代理商是否存在
    const existingAgent = await query(
      'SELECT id, name FROM agents WHERE id = $1',
      [id]
    );
    
    if (existingAgent.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商不存在'
      });
      return;
    }
    
    // 检查是否有关联的用户
    const userCheck = await query(
      'SELECT COUNT(*) as count FROM telegram_users WHERE agent_id = $1',
      [id]
    );
    
    if (parseInt(userCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该代理商有关联的用户，不能删除。请先处理相关用户或将代理商状态设为禁用。'
      });
      return;
    }
    
    // 删除代理商（会级联删除定价配置）
    await query('DELETE FROM agents WHERE id = $1', [id]);
    
    res.status(200).json({
      success: true,
      message: '代理商删除成功'
    });
    
  } catch (error) {
    console.error('删除代理商错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取可用的机器人列表（用于代理商关联）
 * GET /api/bots/available
 * 权限：管理员
 */
router.get('/bots/available', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 查询所有可用的机器人
    const botsResult = await query(
      `SELECT 
        id, name, username, status
       FROM bots 
       WHERE status = 'active'
       ORDER BY name`
    );
    
    res.status(200).json({
      success: true,
      message: '可用机器人列表获取成功',
      data: botsResult.rows
    });
    
  } catch (error) {
    console.error('获取可用机器人列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取代理商统计信息
 * GET /api/agents/stats/overview
 * 权限：管理员
 */
router.get('/stats/overview', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取代理商统计
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_agents,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_agents,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_agents,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_agents,
        AVG(commission_rate) as avg_commission_rate,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_agents_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_agents_month
      FROM agents
    `);
    
    // 获取代理商管理的用户统计
    const userStatsResult = await query(`
      SELECT 
        COUNT(*) as total_managed_users,
        COUNT(DISTINCT agent_id) as agents_with_users
      FROM telegram_users 
      WHERE agent_id IS NOT NULL
    `);
    
    const stats = {
      ...statsResult.rows[0],
      ...userStatsResult.rows[0]
    };
    
    res.status(200).json({
      success: true,
      message: '代理商统计信息获取成功',
      data: {
        stats
      }
    });
    
  } catch (error) {
    console.error('获取代理商统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;