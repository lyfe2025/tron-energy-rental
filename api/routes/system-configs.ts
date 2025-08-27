import { Router, type Request, type Response } from 'express';
import { Pool } from 'pg';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import pool from '../config/database';

const router: Router = Router();

// 获取系统配置列表
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      is_public,
      is_editable
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereConditions = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // 构建查询条件
    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(config_key ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (is_public !== undefined) {
      whereConditions.push(`is_public = $${paramIndex}`);
      queryParams.push(is_public === 'true');
      paramIndex++;
    }

    if (is_editable !== undefined) {
      whereConditions.push(`is_editable = $${paramIndex}`);
      queryParams.push(is_editable === 'true');
      paramIndex++;
    }

    // 非管理员只能查看公开配置
    if (req.user?.role !== 'admin') {
      whereConditions.push(`is_public = true`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 查询配置列表
    const configsQuery = `
      SELECT 
        id, config_key, config_value, config_type, category, 
        description, is_public, is_editable, validation_rules, 
        default_value, created_at, updated_at
      FROM system_configs 
      ${whereClause}
      ORDER BY category, config_key
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(Number(limit), offset);

    // 查询总数
    const countQuery = `SELECT COUNT(*) FROM system_configs ${whereClause}`;
    const countParams = queryParams.slice(0, -2); // 移除 limit 和 offset

    const [configsResult, countResult] = await Promise.all([
      pool.query(configsQuery, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        configs: configsResult.rows,
        pagination: {
          current_page: Number(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('获取系统配置列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统配置列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取单个配置
router.get('/:key', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    let query = `
      SELECT 
        id, config_key, config_value, config_type, category, 
        description, is_public, is_editable, validation_rules, 
        default_value, created_at, updated_at
      FROM system_configs 
      WHERE config_key = $1
    `;

    // 非管理员只能查看公开配置
    if (req.user?.role !== 'admin') {
      query += ' AND is_public = true';
    }

    const result = await pool.query(query, [key]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '配置不存在或无权访问'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 创建配置
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      config_key,
      config_value,
      config_type = 'string',
      category = 'general',
      description,
      is_public = false,
      is_editable = true,
      validation_rules,
      default_value
    } = req.body;

    // 验证必填字段
    if (!config_key || config_value === undefined) {
      return res.status(400).json({
        success: false,
        message: '配置键和配置值不能为空'
      });
    }

    // 验证配置类型
    const validTypes = ['string', 'number', 'boolean', 'json', 'array'];
    if (!validTypes.includes(config_type)) {
      return res.status(400).json({
        success: false,
        message: '无效的配置类型'
      });
    }

    // 验证配置值格式
    const validationResult = validateConfigValue(config_value, config_type);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: `配置值格式错误: ${validationResult.error}`
      });
    }

    // 检查配置键是否已存在
    const existingConfig = await pool.query(
      'SELECT id FROM system_configs WHERE config_key = $1',
      [config_key]
    );

    if (existingConfig.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: '配置键已存在'
      });
    }

    // 创建配置
    const result = await pool.query(
      `INSERT INTO system_configs 
       (config_key, config_value, config_type, category, description, 
        is_public, is_editable, validation_rules, default_value, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       RETURNING *`,
      [
        config_key,
        config_value,
        config_type,
        category,
        description,
        is_public,
        is_editable,
        validation_rules ? JSON.stringify(validation_rules) : null,
        default_value,
        req.user?.userId
      ]
    );

    res.status(201).json({
      success: true,
      message: '配置创建成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('创建配置失败:', error);
    res.status(500).json({
      success: false,
      message: '创建配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 更新配置
router.put('/:key', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const {
      config_value,
      config_type,
      category,
      description,
      is_public,
      is_editable,
      validation_rules,
      default_value,
      change_reason
    } = req.body;

    // 检查配置是否存在
    const existingConfig = await pool.query(
      'SELECT * FROM system_configs WHERE config_key = $1',
      [key]
    );

    if (existingConfig.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    const currentConfig = existingConfig.rows[0];

    // 检查配置是否可编辑
    if (!currentConfig.is_editable) {
      return res.status(403).json({
        success: false,
        message: '该配置不允许编辑'
      });
    }

    // 验证配置值格式（如果提供了新值）
    if (config_value !== undefined) {
      const typeToValidate = config_type || currentConfig.config_type;
      const validationResult = validateConfigValue(config_value, typeToValidate);
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: `配置值格式错误: ${validationResult.error}`
        });
      }
    }

    // 构建更新字段
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (config_value !== undefined) {
      updateFields.push(`config_value = $${paramIndex}`);
      updateValues.push(config_value);
      paramIndex++;
    }

    if (config_type !== undefined) {
      updateFields.push(`config_type = $${paramIndex}`);
      updateValues.push(config_type);
      paramIndex++;
    }

    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex}`);
      updateValues.push(category);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (is_public !== undefined) {
      updateFields.push(`is_public = $${paramIndex}`);
      updateValues.push(is_public);
      paramIndex++;
    }

    if (is_editable !== undefined) {
      updateFields.push(`is_editable = $${paramIndex}`);
      updateValues.push(is_editable);
      paramIndex++;
    }

    if (validation_rules !== undefined) {
      updateFields.push(`validation_rules = $${paramIndex}`);
      updateValues.push(validation_rules ? JSON.stringify(validation_rules) : null);
      paramIndex++;
    }

    if (default_value !== undefined) {
      updateFields.push(`default_value = $${paramIndex}`);
      updateValues.push(default_value);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
    }

    updateFields.push(`updated_by = $${paramIndex}`, `updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(req.user?.userId);
    paramIndex++;

    updateValues.push(key); // WHERE 条件的参数

    // 开始事务
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 记录历史
      if (config_value !== undefined && config_value !== currentConfig.config_value) {
        await client.query(
          `INSERT INTO system_config_history 
           (config_id, old_value, new_value, change_reason, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            currentConfig.id,
            currentConfig.config_value,
            config_value,
            change_reason || '配置更新',
            req.user?.userId
          ]
        );
      }

      // 更新配置
      const updateQuery = `
        UPDATE system_configs 
        SET ${updateFields.join(', ')}
        WHERE config_key = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: '配置更新成功',
        data: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 批量更新配置
router.put('/batch/update', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configs, change_reason } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        success: false,
        message: '配置列表不能为空'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      const errors = [];

      for (const config of configs) {
        try {
          const { config_key, config_value } = config;

          if (!config_key || config_value === undefined) {
            errors.push({ config_key, error: '配置键和配置值不能为空' });
            continue;
          }

          // 检查配置是否存在且可编辑
          const existingConfig = await client.query(
            'SELECT * FROM system_configs WHERE config_key = $1',
            [config_key]
          );

          if (existingConfig.rows.length === 0) {
            errors.push({ config_key, error: '配置不存在' });
            continue;
          }

          const currentConfig = existingConfig.rows[0];

          if (!currentConfig.is_editable) {
            errors.push({ config_key, error: '该配置不允许编辑' });
            continue;
          }

          // 验证配置值格式
          const validationResult = validateConfigValue(config_value, currentConfig.config_type);
          if (!validationResult.valid) {
            errors.push({ config_key, error: `配置值格式错误: ${validationResult.error}` });
            continue;
          }

          // 记录历史
          if (config_value !== currentConfig.config_value) {
            await client.query(
              `INSERT INTO system_config_history 
               (config_id, old_value, new_value, change_reason, changed_by)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                currentConfig.id,
                currentConfig.config_value,
                config_value,
                change_reason || '批量更新',
                req.user?.userId
              ]
            );
          }

          // 更新配置
          const result = await client.query(
            `UPDATE system_configs 
             SET config_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
             WHERE config_key = $3
             RETURNING *`,
            [config_value, req.user?.userId, config_key]
          );

          results.push(result.rows[0]);
        } catch (error) {
          errors.push({ 
            config_key: config.config_key, 
            error: error instanceof Error ? error.message : '未知错误' 
          });
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `批量更新完成，成功: ${results.length}，失败: ${errors.length}`,
        data: {
          updated: results,
          errors: errors
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('批量更新配置失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 删除配置
router.delete('/:key', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { change_reason } = req.body;

    // 检查配置是否存在
    const existingConfig = await pool.query(
      'SELECT * FROM system_configs WHERE config_key = $1',
      [key]
    );

    if (existingConfig.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    const currentConfig = existingConfig.rows[0];

    // 检查配置是否可编辑
    if (!currentConfig.is_editable) {
      return res.status(403).json({
        success: false,
        message: '该配置不允许删除'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 记录删除历史
      await client.query(
        `INSERT INTO system_config_history 
         (config_id, old_value, new_value, change_reason, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          currentConfig.id,
          currentConfig.config_value,
          null,
          change_reason || '配置删除',
          req.user?.userId
        ]
      );

      // 删除配置
      await client.query('DELETE FROM system_configs WHERE config_key = $1', [key]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: '配置删除成功'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('删除配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 重置配置为默认值
router.post('/:key/reset', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { change_reason } = req.body;

    // 检查配置是否存在
    const existingConfig = await pool.query(
      'SELECT * FROM system_configs WHERE config_key = $1',
      [key]
    );

    if (existingConfig.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    const currentConfig = existingConfig.rows[0];

    // 检查配置是否可编辑
    if (!currentConfig.is_editable) {
      return res.status(403).json({
        success: false,
        message: '该配置不允许重置'
      });
    }

    // 检查是否有默认值
    if (!currentConfig.default_value) {
      return res.status(400).json({
        success: false,
        message: '该配置没有默认值'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 记录重置历史
      await client.query(
        `INSERT INTO system_config_history 
         (config_id, old_value, new_value, change_reason, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          currentConfig.id,
          currentConfig.config_value,
          currentConfig.default_value,
          change_reason || '重置为默认值',
          req.user?.userId
        ]
      );

      // 重置配置
      const result = await client.query(
        `UPDATE system_configs 
         SET config_value = default_value, updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE config_key = $2
         RETURNING *`,
        [req.user?.userId, key]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: '配置重置成功',
        data: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('重置配置失败:', error);
    res.status(500).json({
      success: false,
      message: '重置配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取配置历史
router.get('/:key/history', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // 检查配置是否存在
    const configResult = await pool.query(
      'SELECT id FROM system_configs WHERE config_key = $1',
      [key]
    );

    if (configResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    const configId = configResult.rows[0].id;

    // 查询历史记录
    const historyQuery = `
      SELECT 
        h.id, h.old_value, h.new_value, h.change_reason, h.created_at,
        u.username as changed_by_username
      FROM system_config_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.config_id = $1
      ORDER BY h.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM system_config_history WHERE config_id = $1
    `;

    const [historyResult, countResult] = await Promise.all([
      pool.query(historyQuery, [configId, Number(limit), offset]),
      pool.query(countQuery, [configId])
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        history: historyResult.rows,
        pagination: {
          current_page: Number(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('获取配置历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置历史失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取配置分类列表
router.get('/categories/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    let query = `
      SELECT 
        category,
        COUNT(*) as config_count,
        COUNT(CASE WHEN is_public = true THEN 1 END) as public_count
      FROM system_configs
    `;

    // 非管理员只能查看公开配置
    if (req.user?.role !== 'admin') {
      query += ' WHERE is_public = true';
    }

    query += `
      GROUP BY category
      ORDER BY category
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取配置分类失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置分类失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 验证配置值格式
function validateConfigValue(value: any, type: string): { valid: boolean; error?: string } {
  try {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: '值必须是字符串类型' };
        }
        break;
      
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          return { valid: false, error: '值必须是有效的数字' };
        }
        break;
      
      case 'boolean':
        if (typeof value === 'string') {
          if (!['true', 'false'].includes(value.toLowerCase())) {
            return { valid: false, error: '布尔值必须是 true 或 false' };
          }
        } else if (typeof value !== 'boolean') {
          return { valid: false, error: '值必须是布尔类型' };
        }
        break;
      
      case 'json':
        if (typeof value === 'string') {
          JSON.parse(value); // 验证是否为有效JSON
        } else if (typeof value !== 'object') {
          return { valid: false, error: '值必须是有效的JSON格式' };
        }
        break;
      
      case 'array':
        if (typeof value === 'string') {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            return { valid: false, error: '值必须是数组格式' };
          }
        } else if (!Array.isArray(value)) {
          return { valid: false, error: '值必须是数组类型' };
        }
        break;
      
      default:
        return { valid: false, error: '不支持的配置类型' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: '值格式验证失败' };
  }
}

export default router;