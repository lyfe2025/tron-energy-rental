/**
 * 价格模板管理API路由
 * 处理价格模板的创建、查询、更新、删除等功能
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = Router();

/**
 * 创建价格模板
 * POST /api/price-templates
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      template_name,
      description,
      config_data,
      is_default = false
    } = req.body;
    
    // 验证必填字段
    if (!template_name || !config_data) {
      res.status(400).json({
        success: false,
        message: '缺少必填字段：template_name, config_data'
      });
      return;
    }
    
    // 验证config_data格式
    if (typeof config_data !== 'object') {
      res.status(400).json({
        success: false,
        message: 'config_data必须是有效的JSON对象'
      });
      return;
    }
    
    // 检查模板名称是否已存在
    const existingTemplate = await query(
      'SELECT id FROM price_templates WHERE template_name = $1',
      [template_name]
    );
    
    if (existingTemplate.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: '模板名称已存在'
      });
      return;
    }
    
    // 如果设置为默认模板，先取消其他默认模板
    if (is_default) {
      await query(
        'UPDATE price_templates SET is_default = false WHERE is_default = true'
      );
    }
    
    // 创建价格模板
    const templateResult = await query(
      `INSERT INTO price_templates (
        template_name, description, config_data, is_default, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        template_name,
        description,
        JSON.stringify(config_data),
        is_default,
        req.user?.userId
      ]
    );
    
    const template = templateResult.rows[0];
    
    res.status(201).json({
      success: true,
      message: '价格模板创建成功',
      data: {
        template: {
          ...template,
          config_data: JSON.parse(template.config_data)
        }
      }
    });
    
  } catch (error) {
    console.error('创建价格模板错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取价格模板列表（支持搜索和筛选）
 * GET /api/price-templates
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      template_name,
      is_default,
      created_by
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (template_name) {
      whereConditions.push(`pt.template_name ILIKE $${paramIndex}`);
      queryParams.push(`%${template_name}%`);
      paramIndex++;
    }
    
    if (is_default !== undefined) {
      whereConditions.push(`pt.is_default = $${paramIndex}`);
      queryParams.push(is_default === 'true');
      paramIndex++;
    }
    
    if (created_by) {
      whereConditions.push(`pt.created_by = $${paramIndex}`);
      queryParams.push(created_by);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 查询价格模板列表
    const templatesQuery = `
      SELECT 
        pt.*,
        u.username as creator_name,
        u.email as creator_email
      FROM price_templates pt
      LEFT JOIN users u ON pt.created_by = u.id
      ${whereClause}
      ORDER BY pt.is_default DESC, pt.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const templatesResult = await query(templatesQuery, queryParams);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM price_templates pt
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    // 解析config_data
    const templates = templatesResult.rows.map(template => ({
      ...template,
      config_data: JSON.parse(template.config_data)
    }));
    
    res.status(200).json({
      success: true,
      message: '获取价格模板列表成功',
      data: {
        templates,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取价格模板列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取单个价格模板详情
 * GET /api/price-templates/:id
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const templateResult = await query(
      `SELECT 
        pt.*,
        u.username as creator_name,
        u.email as creator_email
      FROM price_templates pt
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.id = $1`,
      [id]
    );
    
    if (templateResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '价格模板不存在'
      });
      return;
    }
    
    const template = templateResult.rows[0];
    
    res.status(200).json({
      success: true,
      message: '获取价格模板详情成功',
      data: {
        template: {
          ...template,
          config_data: JSON.parse(template.config_data)
        }
      }
    });
    
  } catch (error) {
    console.error('获取价格模板详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新价格模板
 * PUT /api/price-templates/:id
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      template_name,
      description,
      config_data,
      is_default
    } = req.body;
    
    // 检查模板是否存在
    const templateResult = await query(
      'SELECT id, template_name FROM price_templates WHERE id = $1',
      [id]
    );
    
    if (templateResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '价格模板不存在'
      });
      return;
    }
    
    // 如果更新模板名称，检查是否与其他模板重复
    if (template_name && template_name !== templateResult.rows[0].template_name) {
      const existingTemplate = await query(
        'SELECT id FROM price_templates WHERE template_name = $1 AND id != $2',
        [template_name, id]
      );
      
      if (existingTemplate.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: '模板名称已存在'
        });
        return;
      }
    }
    
    // 如果设置为默认模板，先取消其他默认模板
    if (is_default === true) {
      await query(
        'UPDATE price_templates SET is_default = false WHERE is_default = true AND id != $1',
        [id]
      );
    }
    
    // 构建更新字段
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;
    
    if (template_name !== undefined) {
      updateFields.push(`template_name = $${paramIndex}`);
      updateParams.push(template_name);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateParams.push(description);
      paramIndex++;
    }
    
    if (config_data !== undefined) {
      if (typeof config_data !== 'object') {
        res.status(400).json({
          success: false,
          message: 'config_data必须是有效的JSON对象'
        });
        return;
      }
      updateFields.push(`config_data = $${paramIndex}`);
      updateParams.push(JSON.stringify(config_data));
      paramIndex++;
    }
    
    if (is_default !== undefined) {
      updateFields.push(`is_default = $${paramIndex}`);
      updateParams.push(is_default);
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
    
    // 更新价格模板
    const updateQuery = `
      UPDATE price_templates 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const updatedResult = await query(updateQuery, updateParams);
    const updatedTemplate = updatedResult.rows[0];
    
    res.status(200).json({
      success: true,
      message: '价格模板更新成功',
      data: {
        template: {
          ...updatedTemplate,
          config_data: JSON.parse(updatedTemplate.config_data)
        }
      }
    });
    
  } catch (error) {
    console.error('更新价格模板错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除价格模板
 * DELETE /api/price-templates/:id
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 检查模板是否存在
    const templateResult = await query(
      'SELECT id, is_default FROM price_templates WHERE id = $1',
      [id]
    );
    
    if (templateResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '价格模板不存在'
      });
      return;
    }
    
    const template = templateResult.rows[0];
    
    // 检查是否为默认模板
    if (template.is_default) {
      res.status(400).json({
        success: false,
        message: '不能删除默认模板'
      });
      return;
    }
    
    // 检查是否有价格配置正在使用此模板
    const usageResult = await query(
      'SELECT COUNT(*) as count FROM price_configs WHERE template_id = $1',
      [id]
    );
    
    if (parseInt(usageResult.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该模板正在被使用，无法删除'
      });
      return;
    }
    
    // 删除价格模板
    await query('DELETE FROM price_templates WHERE id = $1', [id]);
    
    res.status(200).json({
      success: true,
      message: '价格模板删除成功'
    });
    
  } catch (error) {
    console.error('删除价格模板错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 复制价格模板
 * POST /api/price-templates/:id/copy
 */
router.post('/:id/copy', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { template_name } = req.body;
    
    if (!template_name) {
      res.status(400).json({
        success: false,
        message: '缺少必填字段：template_name'
      });
      return;
    }
    
    // 检查原模板是否存在
    const originalResult = await query(
      'SELECT * FROM price_templates WHERE id = $1',
      [id]
    );
    
    if (originalResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '原价格模板不存在'
      });
      return;
    }
    
    const original = originalResult.rows[0];
    
    // 检查新模板名称是否已存在
    const existingTemplate = await query(
      'SELECT id FROM price_templates WHERE template_name = $1',
      [template_name]
    );
    
    if (existingTemplate.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: '模板名称已存在'
      });
      return;
    }
    
    // 创建复制的模板
    const copyResult = await query(
      `INSERT INTO price_templates (
        template_name, description, config_data, is_default, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        template_name,
        `${original.description} (复制)`,
        original.config_data,
        false, // 复制的模板不设为默认
        req.user?.userId
      ]
    );
    
    const copiedTemplate = copyResult.rows[0];
    
    res.status(201).json({
      success: true,
      message: '价格模板复制成功',
      data: {
        template: {
          ...copiedTemplate,
          config_data: JSON.parse(copiedTemplate.config_data)
        }
      }
    });
    
  } catch (error) {
    console.error('复制价格模板错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;