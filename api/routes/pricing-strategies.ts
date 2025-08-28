import { Router, type Request, type Response } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router: Router = Router();

// 价格策略配置验证模式
const energyFlashConfigSchema = z.object({
  unit_price: z.number().min(0.1).max(10),
  max_quantity: z.number().int().min(1).max(10),
  expiry_hours: z.number().int().min(1).max(24),
  double_energy_for_no_usdt: z.boolean().optional().default(true),
  collection_address: z.string().regex(/^T[A-Za-z1-9]{33}$/)
});

const transactionPackageConfigSchema = z.object({
  packages: z.array(z.object({
    transactions: z.number().int().min(1),
    price: z.number().min(0.1)
  })).min(1),
  occupation_fee_hours: z.number().int().min(1).max(168),
  occupation_fee_amount: z.number().int().min(1).max(10),
  transfer_enabled: z.boolean().optional().default(true)
});

const createStrategySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['energy_flash', 'transaction_package']),
  config: z.union([energyFlashConfigSchema, transactionPackageConfigSchema]),
  template_id: z.string().uuid().optional()
});

const updateStrategySchema = createStrategySchema.partial().omit({ type: true });

// 获取价格策略列表
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      is_active,
      search
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (type) {
      whereConditions.push(`ps.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (is_active !== undefined) {
      whereConditions.push(`ps.is_active = $${paramIndex}`);
      queryParams.push(is_active === 'true');
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`ps.name ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        ps.*,
        pt.name as template_name,
        u.username as created_by_name,
        COUNT(*) OVER() as total_count
      FROM pricing_strategies ps
      LEFT JOIN pricing_templates pt ON ps.template_id = pt.id
      LEFT JOIN users u ON ps.created_by = u.id
      ${whereClause}
      ORDER BY ps.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(Number(limit), offset);

    const result = await pool.query(query, queryParams);
    const strategies = result.rows;
    const totalCount = strategies.length > 0 ? strategies[0].total_count : 0;

    // 移除total_count字段
    strategies.forEach(strategy => delete strategy.total_count);

    res.json({
      success: true,
      data: {
        strategies,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          pages: Math.ceil(Number(totalCount) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取价格策略列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取价格策略列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取单个价格策略
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        ps.*,
        pt.name as template_name,
        u.username as created_by_name
      FROM pricing_strategies ps
      LEFT JOIN pricing_templates pt ON ps.template_id = pt.id
      LEFT JOIN users u ON ps.created_by = u.id
      WHERE ps.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '价格策略不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取价格策略失败:', error);
    res.status(500).json({
      success: false,
      message: '获取价格策略失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 创建价格策略
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const validatedData = createStrategySchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 验证配置数据格式
    if (validatedData.type === 'energy_flash') {
      energyFlashConfigSchema.parse(validatedData.config);
    } else {
      transactionPackageConfigSchema.parse(validatedData.config);
    }

    // 检查策略名称是否重复
    const nameCheckQuery = 'SELECT id FROM pricing_strategies WHERE name = $1';
    const nameCheckResult = await pool.query(nameCheckQuery, [validatedData.name]);
    
    if (nameCheckResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '策略名称已存在'
      });
    }

    // 如果指定了模板ID，验证模板是否存在且类型匹配
    if (validatedData.template_id) {
      const templateQuery = 'SELECT type FROM pricing_templates WHERE id = $1';
      const templateResult = await pool.query(templateQuery, [validatedData.template_id]);
      
      if (templateResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: '指定的模板不存在'
        });
      }

      if (templateResult.rows[0].type !== validatedData.type) {
        return res.status(400).json({
          success: false,
          message: '模板类型与策略类型不匹配'
        });
      }
    }

    const insertQuery = `
      INSERT INTO pricing_strategies (name, type, config, template_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      validatedData.name,
      validatedData.type,
      JSON.stringify(validatedData.config),
      validatedData.template_id || null,
      userId
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '价格策略创建成功'
    });
  } catch (error) {
    console.error('创建价格策略失败:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.issues
      });
    }

    res.status(500).json({
      success: false,
      message: '创建价格策略失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 更新价格策略
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateStrategySchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 检查策略是否存在
    const existingQuery = 'SELECT * FROM pricing_strategies WHERE id = $1';
    const existingResult = await pool.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '价格策略不存在'
      });
    }

    const existingStrategy = existingResult.rows[0];

    // 如果更新配置，验证配置数据格式
    if (validatedData.config) {
      if (existingStrategy.type === 'energy_flash') {
        energyFlashConfigSchema.parse(validatedData.config);
      } else {
        transactionPackageConfigSchema.parse(validatedData.config);
      }
    }

    // 检查策略名称是否重复（排除当前策略）
    if (validatedData.name) {
      const nameCheckQuery = 'SELECT id FROM pricing_strategies WHERE name = $1 AND id != $2';
      const nameCheckResult = await pool.query(nameCheckQuery, [validatedData.name, id]);
      
      if (nameCheckResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: '策略名称已存在'
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

    if (validatedData.config !== undefined) {
      updateFields.push(`config = $${paramIndex}`);
      updateValues.push(JSON.stringify(validatedData.config));
      paramIndex++;
    }

    if (validatedData.template_id !== undefined) {
      updateFields.push(`template_id = $${paramIndex}`);
      updateValues.push(validatedData.template_id);
      paramIndex++;
    }



    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE pricing_strategies 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      data: result.rows[0],
      message: '价格策略更新成功'
    });
  } catch (error) {
    console.error('更新价格策略失败:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.issues
      });
    }

    res.status(500).json({
      success: false,
      message: '更新价格策略失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 删除价格策略
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查策略是否存在
    const existingQuery = 'SELECT id FROM pricing_strategies WHERE id = $1';
    const existingResult = await pool.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '价格策略不存在'
      });
    }

    // 注意：由于已移除旧的机器人价格配置表，此处不再检查使用情况
    // 如果需要检查策略使用情况，请根据新的架构实现相应逻辑

    const deleteQuery = 'DELETE FROM pricing_strategies WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: '价格策略删除成功'
    });
  } catch (error) {
    console.error('删除价格策略失败:', error);
    res.status(500).json({
      success: false,
      message: '删除价格策略失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 切换策略状态
router.patch('/:id/toggle', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const toggleQuery = `
      UPDATE pricing_strategies 
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(toggleQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '价格策略不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `价格策略已${result.rows[0].is_active ? '启用' : '禁用'}`
    });
  } catch (error) {
    console.error('切换策略状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换策略状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 复制价格策略
router.post('/:id/copy', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供新策略名称'
      });
    }

    // 获取原策略
    const originalQuery = 'SELECT * FROM pricing_strategies WHERE id = $1';
    const originalResult = await pool.query(originalQuery, [id]);
    
    if (originalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '原价格策略不存在'
      });
    }

    const original = originalResult.rows[0];

    // 检查新名称是否重复
    const nameCheckQuery = 'SELECT id FROM pricing_strategies WHERE name = $1';
    const nameCheckResult = await pool.query(nameCheckQuery, [name]);
    
    if (nameCheckResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '策略名称已存在'
      });
    }

    // 创建副本
    const copyQuery = `
      INSERT INTO pricing_strategies (name, type, config, template_id, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(copyQuery, [
      name,
      original.type,
      original.config,
      original.template_id,
      `${original.description || ''} (副本)`.trim(),
      userId
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '价格策略复制成功'
    });
  } catch (error) {
    console.error('复制价格策略失败:', error);
    res.status(500).json({
      success: false,
      message: '复制价格策略失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;