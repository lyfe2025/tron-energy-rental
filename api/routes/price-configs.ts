/**
 * 价格配置管理API路由
 * 处理机器人差异化定价、代理商优惠价格等配置功能
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = Router();

/**
 * 创建价格配置
 * POST /api/price-configs
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      config_name,
      config_type, // 'bot', 'agent', 'default'
      target_id, // bot_id 或 agent_id
      template_id,
      price_data,
      is_active = true,
      valid_from,
      valid_until
    } = req.body;
    
    // 验证必填字段
    if (!config_name || !config_type || !price_data) {
      res.status(400).json({
        success: false,
        message: '缺少必填字段：config_name, config_type, price_data'
      });
      return;
    }
    
    // 验证配置类型
    const validTypes = ['bot', 'agent', 'default'];
    if (!validTypes.includes(config_type)) {
      res.status(400).json({
        success: false,
        message: '无效的配置类型，支持：bot, agent, default'
      });
      return;
    }
    
    // 验证price_data格式
    if (typeof price_data !== 'object') {
      res.status(400).json({
        success: false,
        message: 'price_data必须是有效的JSON对象'
      });
      return;
    }
    
    // 如果指定了模板，验证模板是否存在
    if (template_id) {
      const templateResult = await query(
        'SELECT id FROM price_templates WHERE id = $1',
        [template_id]
      );
      
      if (templateResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: '指定的价格模板不存在'
        });
        return;
      }
    }
    
    // 验证目标对象是否存在
    if (config_type === 'bot' && target_id) {
      const botResult = await query(
        'SELECT id FROM bots WHERE id = $1',
        [target_id]
      );
      
      if (botResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: '指定的机器人不存在'
        });
        return;
      }
    }
    
    if (config_type === 'agent' && target_id) {
      const agentResult = await query(
        'SELECT id FROM agents WHERE id = $1',
        [target_id]
      );
      
      if (agentResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: '指定的代理商不存在'
        });
        return;
      }
    }
    
    // 检查是否已存在相同的配置
    let duplicateQuery = 'SELECT id FROM price_configs WHERE config_type = $1';
    let duplicateParams = [config_type];
    
    if (target_id) {
      duplicateQuery += ' AND target_id = $2';
      duplicateParams.push(target_id);
    } else {
      duplicateQuery += ' AND target_id IS NULL';
    }
    
    const duplicateResult = await query(duplicateQuery, duplicateParams);
    
    if (duplicateResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: '该配置已存在'
      });
      return;
    }
    
    // 创建价格配置
    const configResult = await query(
      `INSERT INTO price_configs (
        config_name, config_type, target_id, template_id, price_data,
        is_active, valid_from, valid_until, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        config_name,
        config_type,
        target_id,
        template_id,
        JSON.stringify(price_data),
        is_active,
        valid_from,
        valid_until,
        req.user?.userId
      ]
    );
    
    const config = configResult.rows[0];
    
    res.status(201).json({
      success: true,
      message: '价格配置创建成功',
      data: {
        config: {
          ...config,
          price_data: JSON.parse(config.price_data)
        }
      }
    });
    
  } catch (error) {
    console.error('创建价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取价格配置列表（支持搜索和筛选）
 * GET /api/price-configs
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      config_type,
      target_id,
      is_active,
      config_name
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (config_type) {
      whereConditions.push(`pc.config_type = $${paramIndex}`);
      queryParams.push(config_type);
      paramIndex++;
    }
    
    if (target_id) {
      whereConditions.push(`pc.target_id = $${paramIndex}`);
      queryParams.push(target_id);
      paramIndex++;
    }
    
    if (is_active !== undefined) {
      whereConditions.push(`pc.is_active = $${paramIndex}`);
      queryParams.push(is_active === 'true');
      paramIndex++;
    }
    
    if (config_name) {
      whereConditions.push(`pc.config_name ILIKE $${paramIndex}`);
      queryParams.push(`%${config_name}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 查询价格配置列表
    const configsQuery = `
      SELECT 
        pc.*,
        pt.template_name,
        u.username as creator_name,
        CASE 
          WHEN pc.config_type = 'bot' THEN b.bot_name
          WHEN pc.config_type = 'agent' THEN a.agent_name
          ELSE NULL
        END as target_name
      FROM price_configs pc
      LEFT JOIN price_templates pt ON pc.template_id = pt.id
      LEFT JOIN users u ON pc.created_by = u.id
      LEFT JOIN bots b ON pc.config_type = 'bot' AND pc.target_id = b.id
      LEFT JOIN agents a ON pc.config_type = 'agent' AND pc.target_id = a.id
      ${whereClause}
      ORDER BY pc.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const configsResult = await query(configsQuery, queryParams);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM price_configs pc
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    // 解析price_data
    const configs = configsResult.rows.map(config => ({
      ...config,
      price_data: JSON.parse(config.price_data)
    }));
    
    res.status(200).json({
      success: true,
      message: '获取价格配置列表成功',
      data: {
        configs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取价格配置列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取单个价格配置详情
 * GET /api/price-configs/:id
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const configResult = await query(
      `SELECT 
        pc.*,
        pt.template_name,
        pt.config_data as template_config,
        u.username as creator_name,
        CASE 
          WHEN pc.config_type = 'bot' THEN b.bot_name
          WHEN pc.config_type = 'agent' THEN a.agent_name
          ELSE NULL
        END as target_name
      FROM price_configs pc
      LEFT JOIN price_templates pt ON pc.template_id = pt.id
      LEFT JOIN users u ON pc.created_by = u.id
      LEFT JOIN bots b ON pc.config_type = 'bot' AND pc.target_id = b.id
      LEFT JOIN agents a ON pc.config_type = 'agent' AND pc.target_id = a.id
      WHERE pc.id = $1`,
      [id]
    );
    
    if (configResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '价格配置不存在'
      });
      return;
    }
    
    const config = configResult.rows[0];
    
    res.status(200).json({
      success: true,
      message: '获取价格配置详情成功',
      data: {
        config: {
          ...config,
          price_data: JSON.parse(config.price_data),
          template_config: config.template_config ? JSON.parse(config.template_config) : null
        }
      }
    });
    
  } catch (error) {
    console.error('获取价格配置详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新价格配置
 * PUT /api/price-configs/:id
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      config_name,
      price_data,
      is_active,
      valid_from,
      valid_until
    } = req.body;
    
    // 检查配置是否存在
    const configResult = await query(
      'SELECT id FROM price_configs WHERE id = $1',
      [id]
    );
    
    if (configResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '价格配置不存在'
      });
      return;
    }
    
    // 构建更新字段
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;
    
    if (config_name !== undefined) {
      updateFields.push(`config_name = $${paramIndex}`);
      updateParams.push(config_name);
      paramIndex++;
    }
    
    if (price_data !== undefined) {
      if (typeof price_data !== 'object') {
        res.status(400).json({
          success: false,
          message: 'price_data必须是有效的JSON对象'
        });
        return;
      }
      updateFields.push(`price_data = $${paramIndex}`);
      updateParams.push(JSON.stringify(price_data));
      paramIndex++;
    }
    
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateParams.push(is_active);
      paramIndex++;
    }
    
    if (valid_from !== undefined) {
      updateFields.push(`valid_from = $${paramIndex}`);
      updateParams.push(valid_from);
      paramIndex++;
    }
    
    if (valid_until !== undefined) {
      updateFields.push(`valid_until = $${paramIndex}`);
      updateParams.push(valid_until);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
      return;
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateParams.push(id);
    
    // 更新价格配置
    const updateQuery = `
      UPDATE price_configs 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const updatedResult = await query(updateQuery, updateParams);
    const updatedConfig = updatedResult.rows[0];
    
    res.status(200).json({
      success: true,
      message: '价格配置更新成功',
      data: {
        config: {
          ...updatedConfig,
          price_data: JSON.parse(updatedConfig.price_data)
        }
      }
    });
    
  } catch (error) {
    console.error('更新价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除价格配置
 * DELETE /api/price-configs/:id
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 检查配置是否存在
    const configResult = await query(
      'SELECT id, config_type FROM price_configs WHERE id = $1',
      [id]
    );
    
    if (configResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '价格配置不存在'
      });
      return;
    }
    
    // 检查是否有订单正在使用此配置
    const usageResult = await query(
      'SELECT COUNT(*) as count FROM orders WHERE price_config_id = $1',
      [id]
    );
    
    if (parseInt(usageResult.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该配置正在被订单使用，无法删除'
      });
      return;
    }
    
    // 删除价格配置
    await query('DELETE FROM price_configs WHERE id = $1', [id]);
    
    res.status(200).json({
      success: true,
      message: '价格配置删除成功'
    });
    
  } catch (error) {
    console.error('删除价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取特定机器人的价格配置
 * GET /api/price-configs/bot/:botId
 */
router.get('/bot/:botId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { botId } = req.params;
    
    // 查找机器人专用配置
    const botConfigResult = await query(
      `SELECT pc.*, pt.template_name
      FROM price_configs pc
      LEFT JOIN price_templates pt ON pc.template_id = pt.id
      WHERE pc.config_type = 'bot' AND pc.target_id = $1 AND pc.is_active = true
      ORDER BY pc.created_at DESC
      LIMIT 1`,
      [botId]
    );
    
    let config = null;
    
    if (botConfigResult.rows.length > 0) {
      // 使用机器人专用配置
      config = botConfigResult.rows[0];
    } else {
      // 使用默认配置
      const defaultConfigResult = await query(
        `SELECT pc.*, pt.template_name
        FROM price_configs pc
        LEFT JOIN price_templates pt ON pc.template_id = pt.id
        WHERE pc.config_type = 'default' AND pc.is_active = true
        ORDER BY pc.created_at DESC
        LIMIT 1`
      );
      
      if (defaultConfigResult.rows.length > 0) {
        config = defaultConfigResult.rows[0];
      }
    }
    
    if (!config) {
      res.status(404).json({
        success: false,
        message: '未找到可用的价格配置'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: '获取机器人价格配置成功',
      data: {
        config: {
          ...config,
          price_data: JSON.parse(config.price_data)
        }
      }
    });
    
  } catch (error) {
    console.error('获取机器人价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取特定代理商的价格配置
 * GET /api/price-configs/agent/:agentId
 */
router.get('/agent/:agentId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    
    // 查找代理商专用配置
    const agentConfigResult = await query(
      `SELECT pc.*, pt.template_name
      FROM price_configs pc
      LEFT JOIN price_templates pt ON pc.template_id = pt.id
      WHERE pc.config_type = 'agent' AND pc.target_id = $1 AND pc.is_active = true
      ORDER BY pc.created_at DESC
      LIMIT 1`,
      [agentId]
    );
    
    let config = null;
    
    if (agentConfigResult.rows.length > 0) {
      // 使用代理商专用配置
      config = agentConfigResult.rows[0];
    } else {
      // 使用默认配置
      const defaultConfigResult = await query(
        `SELECT pc.*, pt.template_name
        FROM price_configs pc
        LEFT JOIN price_templates pt ON pc.template_id = pt.id
        WHERE pc.config_type = 'default' AND pc.is_active = true
        ORDER BY pc.created_at DESC
        LIMIT 1`
      );
      
      if (defaultConfigResult.rows.length > 0) {
        config = defaultConfigResult.rows[0];
      }
    }
    
    if (!config) {
      res.status(404).json({
        success: false,
        message: '未找到可用的价格配置'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: '获取代理商价格配置成功',
      data: {
        config: {
          ...config,
          price_data: JSON.parse(config.price_data)
        }
      }
    });
    
  } catch (error) {
    console.error('获取代理商价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;