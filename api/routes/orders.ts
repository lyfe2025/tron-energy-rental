/**
 * 订单管理API路由
 * 处理订单创建、查询、更新、统计等功能
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = Router();

/**
 * 订单状态枚举
 */
const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

/**
 * 价格计算函数
 * 根据机器人ID和能量包ID计算订单价格
 */
async function calculateOrderPrice(botId: string, packageId: string, quantity: number = 1): Promise<{ price: number; unit_price: number }> {
  try {
    // 查询能量包信息
    const packageResult = await query(
      'SELECT price, energy_amount FROM energy_packages WHERE id = $1',
      [packageId]
    );
    
    if (packageResult.rows.length === 0) {
      throw new Error('未找到对应的能量包');
    }
    
    const packageInfo = packageResult.rows[0];
    const unitPrice = parseFloat(packageInfo.price);
    const totalPrice = unitPrice * quantity;
    
    return {
      price: totalPrice,
      unit_price: unitPrice
    };
  } catch (error) {
    console.error('价格计算错误:', error);
    throw new Error('价格计算失败');
  }
}

/**
 * 创建订单
 * POST /api/orders
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user_id,
      bot_id,
      package_id,
      target_address,
      duration_hours,
      notes
    } = req.body;
    
    // 验证必填字段
    if (!user_id || !bot_id || !package_id || !target_address) {
      res.status(400).json({
        success: false,
        message: '缺少必填字段：user_id, bot_id, package_id, target_address'
      });
      return;
    }
    
    // 验证用户是否存在
    const userResult = await query('SELECT id, status FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }
    
    if (userResult.rows[0].status !== 'active') {
      res.status(400).json({
        success: false,
        message: '用户状态异常，无法创建订单'
      });
      return;
    }
    
    // 验证机器人是否存在且可用
    const botResult = await query('SELECT id, status FROM bots WHERE id = $1', [bot_id]);
    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    if (botResult.rows[0].status !== 'active') {
      res.status(400).json({
        success: false,
        message: '机器人状态异常，无法创建订单'
      });
      return;
    }
    
    // 验证能量包是否存在且可用
    const packageResult = await query('SELECT id, is_active FROM energy_packages WHERE id = $1', [package_id]);
    if (packageResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量包不存在'
      });
      return;
    }
    
    if (!packageResult.rows[0].is_active) {
      res.status(400).json({
        success: false,
        message: '能量包状态异常，无法创建订单'
      });
      return;
    }
    
    // 获取能量包信息计算价格
    const packageInfo = await query('SELECT energy_amount, price, duration_hours FROM energy_packages WHERE id = $1', [package_id]);
    const { energy_amount, price, duration_hours: packageDuration } = packageInfo.rows[0];
    
    // 生成订单号
    const orderNumber = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // 创建订单
    const orderResult = await query(
      `INSERT INTO orders (
        order_number, user_id, bot_id, package_id, 
        energy_amount, price, target_address, 
        status, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        orderNumber, user_id, bot_id, package_id,
        energy_amount, price, target_address,
        ORDER_STATUS.PENDING, new Date(Date.now() + (duration_hours || packageDuration || 24) * 60 * 60 * 1000)
      ]
    );
    
    const order = orderResult.rows[0];
    
    res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: {
        order
      }
    });
    
  } catch (error) {
    console.error('创建订单错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取订单列表（支持搜索和筛选）
 * GET /api/orders
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      user_id,
      bot_id,
      start_date,
      end_date,
      order_number,
      target_address
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (status) {
      whereConditions.push(`o.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (user_id) {
      whereConditions.push(`o.user_id = $${paramIndex}`);
      queryParams.push(user_id);
      paramIndex++;
    }
    
    if (bot_id) {
      whereConditions.push(`o.bot_id = $${paramIndex}`);
      queryParams.push(bot_id);
      paramIndex++;
    }
    
    if (start_date) {
      whereConditions.push(`o.created_at >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      whereConditions.push(`o.created_at <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }
    
    if (order_number) {
      whereConditions.push(`o.order_number ILIKE $${paramIndex}`);
      queryParams.push(`%${order_number}%`);
      paramIndex++;
    }
    
    if (target_address) {
      whereConditions.push(`o.target_address ILIKE $${paramIndex}`);
      queryParams.push(`%${target_address}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 查询订单列表
    const ordersQuery = `
      SELECT 
        o.*,
        u.username as user_name,
        u.email as user_email,
        b.name as bot_name,
        ep.name as package_name,
        ep.energy_amount
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN bots b ON o.bot_id = b.id
      LEFT JOIN energy_packages ep ON o.package_id = ep.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const ordersResult = await query(ordersQuery, queryParams);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '获取订单列表成功',
      data: {
        orders: ordersResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取单个订单详情
 * GET /api/orders/:id
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const orderResult = await query(
      `SELECT 
        o.*,
        u.username as user_name,
        u.email as user_email,
        u.telegram_id,
        b.name as bot_name,
        b.username as bot_username,
        ep.name as package_name,
        ep.energy_amount,
        ep.description as package_description
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN bots b ON o.bot_id = b.id
      LEFT JOIN energy_packages ep ON o.package_id = ep.id
      WHERE o.id = $1`,
      [id]
    );
    
    if (orderResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '订单不存在'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: '获取订单详情成功',
      data: {
        order: orderResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('获取订单详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新订单状态
 * PUT /api/orders/:id/status
 */
router.put('/:id/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // 验证状态值
    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `无效的状态值，允许的状态: ${validStatuses.join(', ')}`
      });
      return;
    }
    
    // 检查订单是否存在
    const orderResult = await query('SELECT id, status FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '订单不存在'
      });
      return;
    }
    
    const currentStatus = orderResult.rows[0].status;
    
    // 验证状态流转规则
    const statusTransitions: Record<string, string[]> = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.FAILED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.COMPLETED]: [], // 已完成的订单不能再变更
      [ORDER_STATUS.FAILED]: [ORDER_STATUS.PROCESSING], // 失败的订单可以重新处理
      [ORDER_STATUS.CANCELLED]: [] // 已取消的订单不能再变更
    };
    
    if (!statusTransitions[currentStatus].includes(status)) {
      res.status(400).json({
        success: false,
        message: `订单状态不能从 ${currentStatus} 变更为 ${status}`
      });
      return;
    }
    
    // 更新订单状态
    const updateFields = ['status = $2'];
    const updateParams = [id, status];
    let paramIndex = 3;
    
    if (notes) {
      updateFields.push(`notes = $${paramIndex}`);
      updateParams.push(notes);
      paramIndex++;
    }
    
    // 如果状态变为已完成，更新完成时间
    if (status === ORDER_STATUS.COMPLETED) {
      updateFields.push('completed_at = CURRENT_TIMESTAMP');
    }
    
    const updateQuery = `
      UPDATE orders 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const updatedOrder = await query(updateQuery, updateParams);
    
    res.status(200).json({
      success: true,
      message: '订单状态更新成功',
      data: {
        order: updatedOrder.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新订单状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 取消订单
 * PUT /api/orders/:id/cancel
 */
router.put('/:id/cancel', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // 检查订单是否存在
    const orderResult = await query('SELECT id, status FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '订单不存在'
      });
      return;
    }
    
    const currentStatus = orderResult.rows[0].status;
    
    // 只有待处理和处理中的订单可以取消
    if (![ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING].includes(currentStatus)) {
      res.status(400).json({
        success: false,
        message: '只有待处理或处理中的订单可以取消'
      });
      return;
    }
    
    // 取消订单
    const cancelledOrder = await query(
      `UPDATE orders 
       SET status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, ORDER_STATUS.CANCELLED]
    );
    
    res.status(200).json({
      success: true,
      message: '订单取消成功',
      data: {
        order: cancelledOrder.rows[0]
      }
    });
    
  } catch (error) {
    console.error('取消订单错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取订单统计信息
 * GET /api/orders/statistics
 */
router.get('/statistics/summary', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { start_date, end_date, bot_id } = req.query;
    
    // 构建时间范围条件
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (start_date) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }
    
    if (bot_id) {
      whereConditions.push(`bot_id = $${paramIndex}`);
      queryParams.push(bot_id);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 获取订单统计
    const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
        COALESCE(SUM(price), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as completed_amount,
        COALESCE(AVG(price), 0) as average_order_value
      FROM orders
      ${whereClause}
    `;
    
    const statsResult = await query(statsQuery, queryParams);
    const stats = statsResult.rows[0];
    
    // 计算成功率
    const totalOrders = parseInt(stats.total_orders);
    const completedOrders = parseInt(stats.completed_orders);
    const successRate = totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(2) : '0.00';
    
    // 获取每日订单统计（最近30天）
    const dailyStatsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders_count,
        COALESCE(SUM(price), 0) as daily_amount
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ${bot_id ? `AND bot_id = $${queryParams.length + 1}` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;
    
    const dailyParams = bot_id ? [...queryParams, bot_id] : queryParams;
    const dailyStatsResult = await query(dailyStatsQuery, dailyParams);
    
    res.status(200).json({
      success: true,
      message: '获取订单统计成功',
      data: {
        summary: {
          total_orders: parseInt(stats.total_orders),
          completed_orders: parseInt(stats.completed_orders),
          failed_orders: parseInt(stats.failed_orders),
          cancelled_orders: parseInt(stats.cancelled_orders),
          pending_orders: parseInt(stats.pending_orders),
          processing_orders: parseInt(stats.processing_orders),
          total_amount: parseFloat(stats.total_amount),
          completed_amount: parseFloat(stats.completed_amount),
          average_order_value: parseFloat(stats.average_order_value),
          success_rate: parseFloat(successRate)
        },
        daily_stats: dailyStatsResult.rows
      }
    });
    
  } catch (error) {
    console.error('获取订单统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;