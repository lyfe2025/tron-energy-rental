import { Router, type Request, type Response } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router: Router = Router();

// 价格模板验证模式
const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['energy_flash', 'transaction_package']),
  config_schema: z.record(z.string(), z.any()),
  default_config: z.record(z.string(), z.any()),
  is_system: z.boolean().default(false)
});

const updateTemplateSchema = createTemplateSchema.partial().omit({ is_system: true });

// 获取价格模板列表
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      search
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`name ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        *,
        COUNT(*) OVER() as total_count
      FROM pricing_templates
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(Number(limit), offset);

    const result = await pool.query(query, queryParams);
    const templates = result.rows;
    const totalCount = templates.length > 0 ? templates[0].total_count : 0;

    // 移除total_count字段
    templates.forEach(template => delete template.total_count);

    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          pages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取价格模板列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取价格模板列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取单个价格模板
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM pricing_templates WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '价格模板不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取价格模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取价格模板失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 创建价格模板
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const validatedData = createTemplateSchema.parse(req.body);

    // 检查模板名称是否重复
    const nameCheckQuery = 'SELECT id FROM pricing_templates WHERE name = $1';
    const nameCheckResult = await pool.query(nameCheckQuery, [validatedData.name]);
    
    if (nameCheckResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '模板名称已存在'
      });
    }

    const insertQuery = `
      INSERT INTO pricing_templates (name, description, type, config_schema, default_config, is_system)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      validatedData.name,
      validatedData.description || '',
      validatedData.type,
      JSON.stringify(validatedData.config_schema),
      JSON.stringify(validatedData.default_config),
      validatedData.is_system
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '价格模板创建成功'
    });
  } catch (error) {
    console.error('创建价格模板失败:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.issues
      });
    }

    res.status(500).json({
      success: false,
      message: '创建价格模板失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 更新价格模板
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateTemplateSchema.parse(req.body);

    // 检查模板是否存在
    const existingQuery = 'SELECT * FROM pricing_templates WHERE id = $1';
    const existingResult = await pool.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '价格模板不存在'
      });
    }

    // 检查模板名称是否重复（排除当前模板）
    if (validatedData.name) {
      const nameCheckQuery = 'SELECT id FROM pricing_templates WHERE name = $1 AND id != $2';
      const nameCheckResult = await pool.query(nameCheckQuery, [validatedData.name, id]);
      
      if (nameCheckResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: '模板名称已存在'
        });
      }
    }

    // 构建更新查询
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (validatedData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(validatedData.name);
      paramIndex++;
    }

    if (validatedData.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(validatedData.description);
      paramIndex++;
    }

    if (validatedData.type !== undefined) {
      updateFields.push(`type = $${paramIndex}`);
      updateValues.push(validatedData.type);
      paramIndex++;
    }

    if (validatedData.config_schema !== undefined) {
      updateFields.push(`config_schema = $${paramIndex}`);
      updateValues.push(JSON.stringify(validatedData.config_schema));
      paramIndex++;
    }

    if (validatedData.default_config !== undefined) {
      updateFields.push(`default_config = $${paramIndex}`);
      updateValues.push(JSON.stringify(validatedData.default_config));
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE pricing_templates 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      data: result.rows[0],
      message: '价格模板更新成功'
    });
  } catch (error) {
    console.error('更新价格模板失败:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.issues
      });
    }

    res.status(500).json({
      success: false,
      message: '更新价格模板失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 删除价格模板
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查模板是否存在
    const existingQuery = 'SELECT id, is_system FROM pricing_templates WHERE id = $1';
    const existingResult = await pool.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '价格模板不存在'
      });
    }

    // 系统模板不允许删除
    if (existingResult.rows[0].is_system) {
      return res.status(400).json({
        success: false,
        message: '系统模板不允许删除'
      });
    }

    // 检查是否有策略在使用此模板
    const usageCheckQuery = 'SELECT id FROM pricing_strategies WHERE template_id = $1';
    const usageCheckResult = await pool.query(usageCheckQuery, [id]);
    
    if (usageCheckResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该模板正在被策略使用，无法删除'
      });
    }

    const deleteQuery = 'DELETE FROM pricing_templates WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: '价格模板删除成功'
    });
  } catch (error) {
    console.error('删除价格模板失败:', error);
    res.status(500).json({
      success: false,
      message: '删除价格模板失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
