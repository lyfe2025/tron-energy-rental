/**
 * 能量包管理API路由
 * 处理能量包的创建、更新、启用/禁用、价格调整等功能
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth.js';

const router: Router = Router();

/**
 * 获取能量包列表
 * GET /api/energy-packages
 * 权限：所有用户（公开接口）
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      is_active,
      min_energy,
      max_energy,
      min_price,
      max_price,
      search 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    if (is_active !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(is_active === 'true');
      paramIndex++;
    }
    
    if (min_energy) {
      whereConditions.push(`energy_amount >= $${paramIndex}`);
      queryParams.push(Number(min_energy));
      paramIndex++;
    }
    
    if (max_energy) {
      whereConditions.push(`energy_amount <= $${paramIndex}`);
      queryParams.push(Number(max_energy));
      paramIndex++;
    }
    
    if (min_price) {
      whereConditions.push(`price >= $${paramIndex}`);
      queryParams.push(Number(min_price));
      paramIndex++;
    }
    
    if (max_price) {
      whereConditions.push(`price <= $${paramIndex}`);
      queryParams.push(Number(max_price));
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(
        name ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';
    
    // 查询能量包列表
    const packagesQuery = `
      SELECT 
        id, name, description, energy_amount, price, 
        duration_hours, is_active, created_at, updated_at
      FROM energy_packages 
      ${whereClause}
      ORDER BY is_active DESC, energy_amount ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const packagesResult = await query(packagesQuery, queryParams);
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM energy_packages ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '能量包列表获取成功',
      data: {
        packages: packagesResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取能量包列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取单个能量包详情
 * GET /api/energy-packages/:id
 * 权限：所有用户（公开接口）
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const packageResult = await query(
      `SELECT 
        id, name, description, energy_amount, price, 
        duration_hours, is_active, created_at, updated_at
       FROM energy_packages 
       WHERE id = $1`,
      [id]
    );
    
    if (packageResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量包不存在'
      });
      return;
    }
    
    // 获取该能量包的订单统计
    const orderStatsResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as orders_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as orders_month,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price END), 0) as total_revenue
       FROM orders 
       WHERE package_id = $1`,
      [id]
    );
    
    const energyPackage = packageResult.rows[0];
    const orderStats = orderStatsResult.rows[0];
    
    res.status(200).json({
      success: true,
      message: '能量包信息获取成功',
      data: {
        package: energyPackage,
        stats: {
          orders: orderStats
        }
      }
    });
    
  } catch (error) {
    console.error('获取能量包详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 创建新能量包
 * POST /api/energy-packages
 * 权限：管理员
 */
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      energy_amount,
      price,
      duration_hours = 24,
      is_active = true
    } = req.body;
    
    // 验证必填字段
    if (!name || !energy_amount || !price) {
      res.status(400).json({
        success: false,
        message: '能量包名称、能量数量和价格为必填项'
      });
      return;
    }
    
    // 验证数值字段
    if (Number(energy_amount) <= 0) {
      res.status(400).json({
        success: false,
        message: '能量数量必须大于0'
      });
      return;
    }
    
    if (Number(price) <= 0) {
      res.status(400).json({
        success: false,
        message: '价格必须大于0'
      });
      return;
    }
    
    if (Number(duration_hours) <= 0) {
      res.status(400).json({
        success: false,
        message: '持续时间必须大于0小时'
      });
      return;
    }
    
    // 检查名称是否已存在
    const existingPackage = await query(
      'SELECT id FROM energy_packages WHERE name = $1',
      [name]
    );
    
    if (existingPackage.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '该能量包名称已存在'
      });
      return;
    }
    
    // 创建能量包
    const newPackage = await query(
      `INSERT INTO energy_packages (
        name, description, energy_amount, price, duration_hours, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, name, description, energy_amount, price, 
        duration_hours, is_active, created_at`,
      [name, description, Number(energy_amount), Number(price), Number(duration_hours), is_active]
    );
    
    res.status(201).json({
      success: true,
      message: '能量包创建成功',
      data: {
        package: newPackage.rows[0]
      }
    });
    
  } catch (error) {
    console.error('创建能量包错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新能量包信息
 * PUT /api/energy-packages/:id
 * 权限：管理员
 */
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      energy_amount,
      price,
      duration_hours
    } = req.body;
    
    // 检查能量包是否存在
    const existingPackage = await query(
      'SELECT id FROM energy_packages WHERE id = $1',
      [id]
    );
    
    if (existingPackage.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量包不存在'
      });
      return;
    }
    
    // 检查名称是否被其他能量包使用
    if (name) {
      const nameCheck = await query(
        'SELECT id FROM energy_packages WHERE name = $1 AND id != $2',
        [name, id]
      );
      
      if (nameCheck.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该名称已被其他能量包使用'
        });
        return;
      }
    }
    
    // 验证数值字段
    if (energy_amount !== undefined && Number(energy_amount) <= 0) {
      res.status(400).json({
        success: false,
        message: '能量数量必须大于0'
      });
      return;
    }
    
    if (price !== undefined && Number(price) <= 0) {
      res.status(400).json({
        success: false,
        message: '价格必须大于0'
      });
      return;
    }
    
    if (duration_hours !== undefined && Number(duration_hours) <= 0) {
      res.status(400).json({
        success: false,
        message: '持续时间必须大于0小时'
      });
      return;
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
    
    if (energy_amount !== undefined) {
      updateFields.push(`energy_amount = $${paramIndex}`);
      updateValues.push(Number(energy_amount));
      paramIndex++;
    }
    
    if (price !== undefined) {
      updateFields.push(`price = $${paramIndex}`);
      updateValues.push(Number(price));
      paramIndex++;
    }
    
    if (duration_hours !== undefined) {
      updateFields.push(`duration_hours = $${paramIndex}`);
      updateValues.push(Number(duration_hours));
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
      return;
    }
    
    // 添加更新时间
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    
    // 执行更新
    const updateQuery = `
      UPDATE energy_packages 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, name, description, energy_amount, price, 
        duration_hours, is_active, updated_at
    `;
    
    const updatedPackage = await query(updateQuery, updateValues);
    
    res.status(200).json({
      success: true,
      message: '能量包信息更新成功',
      data: {
        package: updatedPackage.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新能量包信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新能量包状态（启用/禁用）
 * PATCH /api/energy-packages/:id/status
 * 权限：管理员
 */
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    // 验证状态值
    if (typeof is_active !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'is_active字段必须是布尔值'
      });
      return;
    }
    
    // 检查能量包是否存在
    const existingPackage = await query(
      'SELECT id, is_active FROM energy_packages WHERE id = $1',
      [id]
    );
    
    if (existingPackage.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量包不存在'
      });
      return;
    }
    
    // 更新状态
    const updatedPackage = await query(
      `UPDATE energy_packages 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, is_active, updated_at`,
      [is_active, id]
    );
    
    res.status(200).json({
      success: true,
      message: `能量包已${is_active ? '启用' : '禁用'}`,
      data: {
        package: updatedPackage.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新能量包状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 批量更新能量包价格
 * PATCH /api/energy-packages/batch/price
 * 权限：管理员
 */
router.patch('/batch/price', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { updates } = req.body;
    
    // 验证请求格式
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'updates字段必须是非空数组'
      });
      return;
    }
    
    // 验证每个更新项
    for (const update of updates) {
      if (!update.id || !update.price || Number(update.price) <= 0) {
        res.status(400).json({
          success: false,
          message: '每个更新项必须包含有效的id和price字段'
        });
        return;
      }
    }
    
    const results = [];
    
    // 逐个更新价格
    for (const update of updates) {
      try {
        const updatedPackage = await query(
          `UPDATE energy_packages 
           SET price = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 
           RETURNING id, name, price, updated_at`,
          [Number(update.price), update.id]
        );
        
        if (updatedPackage.rows.length > 0) {
          results.push({
            id: update.id,
            success: true,
            package: updatedPackage.rows[0]
          });
        } else {
          results.push({
            id: update.id,
            success: false,
            error: '能量包不存在'
          });
        }
      } catch (error) {
        results.push({
          id: update.id,
          success: false,
          error: '更新失败'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.status(200).json({
      success: true,
      message: `批量价格更新完成，成功更新${successCount}个能量包`,
      data: {
        results,
        summary: {
          total: updates.length,
          success: successCount,
          failed: updates.length - successCount
        }
      }
    });
    
  } catch (error) {
    console.error('批量更新能量包价格错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除能量包
 * DELETE /api/energy-packages/:id
 * 权限：管理员
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 检查能量包是否存在
    const existingPackage = await query(
      'SELECT id FROM energy_packages WHERE id = $1',
      [id]
    );
    
    if (existingPackage.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量包不存在'
      });
      return;
    }
    
    // 检查能量包是否有关联的订单
    const orderCheck = await query(
      'SELECT COUNT(*) as count FROM orders WHERE package_id = $1',
      [id]
    );
    
    if (parseInt(orderCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该能量包有关联的订单，不能删除。请先处理相关订单或将能量包设为禁用状态。'
      });
      return;
    }
    
    // 删除能量包
    await query('DELETE FROM energy_packages WHERE id = $1', [id]);
    
    res.status(200).json({
      success: true,
      message: '能量包删除成功'
    });
    
  } catch (error) {
    console.error('删除能量包错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取能量包统计信息
 * GET /api/energy-packages/stats/overview
 * 权限：管理员
 */
router.get('/stats/overview', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取能量包统计
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_packages,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_packages,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_packages,
        COALESCE(AVG(price), 0) as average_price,
        COALESCE(MIN(price), 0) as min_price,
        COALESCE(MAX(price), 0) as max_price,
        COALESCE(AVG(energy_amount), 0) as average_energy,
        COALESCE(SUM(energy_amount), 0) as total_energy_available,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_packages_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_packages_month
      FROM energy_packages
    `);
    
    // 获取最受欢迎的能量包（按订单数量）
    const popularPackagesResult = await query(`
      SELECT 
        ep.id, ep.name, ep.energy_amount, ep.price,
        COUNT(o.id) as order_count,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price END), 0) as total_revenue
      FROM energy_packages ep
      LEFT JOIN orders o ON ep.id = o.package_id
      WHERE ep.is_active = true
      GROUP BY ep.id, ep.name, ep.energy_amount, ep.price
      ORDER BY order_count DESC
      LIMIT 5
    `);
    
    res.status(200).json({
      success: true,
      message: '能量包统计信息获取成功',
      data: {
        stats: statsResult.rows[0],
        popular_packages: popularPackagesResult.rows
      }
    });
    
  } catch (error) {
    console.error('获取能量包统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 复制能量包
 * POST /api/energy-packages/:id/duplicate
 * 权限：管理员
 */
router.post('/:id/duplicate', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name_suffix = '_副本' } = req.body;
    
    // 获取原能量包信息
    const originalPackage = await query(
      `SELECT name, description, energy_amount, price, duration_hours 
       FROM energy_packages 
       WHERE id = $1`,
      [id]
    );
    
    if (originalPackage.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '原能量包不存在'
      });
      return;
    }
    
    const original = originalPackage.rows[0];
    const newName = original.name + name_suffix;
    
    // 检查新名称是否已存在
    const nameCheck = await query(
      'SELECT id FROM energy_packages WHERE name = $1',
      [newName]
    );
    
    if (nameCheck.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '复制后的名称已存在，请使用不同的后缀'
      });
      return;
    }
    
    // 创建复制的能量包
    const duplicatedPackage = await query(
      `INSERT INTO energy_packages (
        name, description, energy_amount, price, duration_hours, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, name, description, energy_amount, price, 
        duration_hours, is_active, created_at`,
      [
        newName,
        original.description,
        original.energy_amount,
        original.price,
        original.duration_hours,
        false // 默认设为禁用状态
      ]
    );
    
    res.status(201).json({
      success: true,
      message: '能量包复制成功',
      data: {
        package: duplicatedPackage.rows[0]
      }
    });
    
  } catch (error) {
    console.error('复制能量包错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;