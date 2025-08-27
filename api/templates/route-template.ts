/**
 * 路由文件模板
 * 复制此文件并重命名，然后修改相应的路由逻辑
 */

import { Router, type Request, type Response } from 'express';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth';
import pool from '../config/database';

const router: Router = Router();

// ==================== GET 路由 ====================

/**
 * 获取列表
 * GET /api/your-route
 * 权限：认证用户
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      // 添加其他查询参数
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereConditions = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // 构建查询条件
    if (search) {
      whereConditions.push(`name ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // 非管理员只能查看自己的数据
    if (req.user?.role !== 'admin') {
      whereConditions.push(`user_id = $${paramIndex}`);
      queryParams.push(req.user?.userId);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 查询列表
    const listQuery = `
      SELECT * FROM your_table 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(Number(limit), offset);

    // 查询总数
    const countQuery = `SELECT COUNT(*) FROM your_table ${whereClause}`;
    const countParams = queryParams.slice(0, -2);

    const [listResult, countResult] = await Promise.all([
      pool.query(listQuery, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        items: listResult.rows,
        pagination: {
          current_page: Number(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('获取列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取单个项目
 * GET /api/your-route/:id
 * 权限：认证用户
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let query = `
      SELECT * FROM your_table 
      WHERE id = $1
    `;
    const queryParams = [id];

    // 非管理员只能查看自己的数据
    if (req.user?.role !== 'admin') {
      query += ' AND user_id = $2';
      queryParams.push(req.user?.userId);
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权访问'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取项目失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ==================== POST 路由 ====================

/**
 * 创建新项目
 * POST /api/your-route
 * 权限：认证用户
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      // 添加其他字段
    } = req.body;

    // 验证必填字段
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '名称是必填字段'
      });
    }

    // 插入数据
    const result = await pool.query(
      `INSERT INTO your_table 
       (name, description, user_id, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        description,
        req.user?.userId,
        req.user?.userId,
        req.user?.userId
      ]
    );

    res.status(201).json({
      success: true,
      message: '创建成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('创建失败:', error);
    res.status(500).json({
      success: false,
      message: '创建失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ==================== PUT 路由 ====================

/**
 * 更新项目
 * PUT /api/your-route/:id
 * 权限：认证用户（自己的数据）或管理员
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      // 添加其他字段
    } = req.body;

    // 检查项目是否存在
    const existingItem = await pool.query(
      'SELECT * FROM your_table WHERE id = $1',
      [id]
    );

    if (existingItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    const currentItem = existingItem.rows[0];

    // 检查权限：非管理员只能编辑自己的数据
    if (req.user?.role !== 'admin' && currentItem.user_id !== req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: '无权编辑此项目'
      });
    }

    // 构建更新字段
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
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

    updateValues.push(id); // WHERE 条件的参数

    // 更新数据
    const updateQuery = `
      UPDATE your_table 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      message: '更新成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('更新失败:', error);
    res.status(500).json({
      success: false,
      message: '更新失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ==================== DELETE 路由 ====================

/**
 * 删除项目
 * DELETE /api/your-route/:id
 * 权限：认证用户（自己的数据）或管理员
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查项目是否存在
    const existingItem = await pool.query(
      'SELECT * FROM your_table WHERE id = $1',
      [id]
    );

    if (existingItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    const currentItem = existingItem.rows[0];

    // 检查权限：非管理员只能删除自己的数据
    if (req.user?.role !== 'admin' && currentItem.user_id !== req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: '无权删除此项目'
      });
    }

    // 删除数据
    await pool.query('DELETE FROM your_table WHERE id = $1', [id]);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除失败:', error);
    res.status(500).json({
      success: false,
      message: '删除失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ==================== 批量操作路由 ====================

/**
 * 批量更新
 * PUT /api/your-route/batch/update
 * 权限：管理员
 */
router.put('/batch/update', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '项目列表不能为空'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      const errors = [];

      for (const item of items) {
        try {
          const { id, name, description } = item;

          if (!id) {
            errors.push({ id, error: 'ID不能为空' });
            continue;
          }

          // 检查项目是否存在
          const existingItem = await client.query(
            'SELECT * FROM your_table WHERE id = $1',
            [id]
          );

          if (existingItem.rows.length === 0) {
            errors.push({ id, error: '项目不存在' });
            continue;
          }

          // 更新项目
          const result = await client.query(
            `UPDATE your_table 
             SET name = $1, description = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [name, description, req.user?.userId, id]
          );

          results.push(result.rows[0]);
        } catch (error) {
          errors.push({ 
            id: item.id, 
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
    console.error('批量更新失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
