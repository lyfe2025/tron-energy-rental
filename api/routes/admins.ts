/**
 * 管理员管理API路由
 * 处理管理员的增删改查、状态管理、权限配置等功能
 * 基于admins、admin_roles、admin_permissions表结构
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router: Router = Router();

/**
 * 获取管理员列表
 * GET /api/admins
 * 权限：超级管理员
 */
router.get('/', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      status, 
      search
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    if (role) {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(
        username ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';
    
    // 查询管理员列表
    const adminsQuery = `
      SELECT 
        id, username, email, role, status, 
        last_login, created_at, updated_at
      FROM admins
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const adminsResult = await query(adminsQuery, queryParams);
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM admins ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      message: '管理员列表获取成功',
      data: {
        admins: adminsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取管理员列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取管理员角色列表
 * GET /api/admins/roles
 * 权限：超级管理员
 */
router.get('/roles', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const rolesResult = await query(
      `SELECT id, name, description, permissions, created_at
       FROM admin_roles
       ORDER BY name`
    );
    
    res.status(200).json({
      success: true,
      message: '管理员角色列表获取成功',
      data: {
        roles: rolesResult.rows
      }
    });
    
  } catch (error) {
    console.error('获取管理员角色列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取所有可用权限列表
 * GET /api/admins/permissions
 * 权限：超级管理员
 */
router.get('/permissions', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    // 定义系统中所有可用的权限
    const allPermissions = [
      // 用户管理权限
      { id: 'users:read', name: '查看用户', description: '查看用户列表和详情', resource: 'users' },
      { id: 'users:create', name: '创建用户', description: '创建新用户', resource: 'users' },
      { id: 'users:update', name: '编辑用户', description: '编辑用户信息', resource: 'users' },
      { id: 'users:delete', name: '删除用户', description: '删除用户账户', resource: 'users' },
      { id: 'users:status', name: '用户状态', description: '修改用户状态', resource: 'users' },
      
      // 代理商管理权限
      { id: 'agents:read', name: '查看代理商', description: '查看代理商列表和详情', resource: 'agents' },
      { id: 'agents:create', name: '创建代理商', description: '创建新代理商', resource: 'agents' },
      { id: 'agents:update', name: '编辑代理商', description: '编辑代理商信息', resource: 'agents' },
      { id: 'agents:delete', name: '删除代理商', description: '删除代理商账户', resource: 'agents' },
      
      // 管理员管理权限
      { id: 'admins:read', name: '查看管理员', description: '查看管理员列表和详情', resource: 'admins' },
      { id: 'admins:create', name: '创建管理员', description: '创建新管理员', resource: 'admins' },
      { id: 'admins:update', name: '编辑管理员', description: '编辑管理员信息', resource: 'admins' },
      { id: 'admins:delete', name: '删除管理员', description: '删除管理员账户', resource: 'admins' },
      { id: 'admins:permissions', name: '权限配置', description: '配置管理员权限', resource: 'admins' },
      
      // 订单管理权限
      { id: 'orders:read', name: '查看订单', description: '查看订单列表和详情', resource: 'orders' },
      { id: 'orders:update', name: '处理订单', description: '处理和更新订单', resource: 'orders' },
      { id: 'orders:refund', name: '订单退款', description: '处理订单退款', resource: 'orders' },
      
      // 机器人管理权限
      { id: 'bots:read', name: '查看机器人', description: '查看机器人列表和详情', resource: 'bots' },
      { id: 'bots:create', name: '创建机器人', description: '创建新机器人', resource: 'bots' },
      { id: 'bots:update', name: '编辑机器人', description: '编辑机器人信息', resource: 'bots' },
      { id: 'bots:delete', name: '删除机器人', description: '删除机器人', resource: 'bots' },
      
      // 统计分析权限
      { id: 'statistics:read', name: '查看统计', description: '查看统计数据和报表', resource: 'statistics' },
      
      // 系统配置权限
      { id: 'system:read', name: '查看配置', description: '查看系统配置', resource: 'system' },
      { id: 'system:update', name: '修改配置', description: '修改系统配置', resource: 'system' }
    ];
    
    res.status(200).json({
      success: true,
      message: '权限列表获取成功',
      data: {
        permissions: allPermissions
      }
    });
    
  } catch (error) {
    console.error('获取权限列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取单个管理员详情
 * GET /api/admins/:id
 * 权限：超级管理员
 */
router.get('/:id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 查询管理员基本信息
    const adminResult = await query(
      `SELECT 
        id, username, email, role, status, 
        last_login, created_at, updated_at
       FROM admins 
       WHERE id = $1`,
      [id]
    );
    
    if (adminResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '管理员不存在'
      });
      return;
    }
    
    // 查询管理员权限配置
    const permissionsResult = await query(
      `SELECT 
        ap.id, ap.granted_at,
        ar.id as role_id, ar.name as role_name, 
        ar.description as role_description, ar.permissions
       FROM admin_permissions ap
       JOIN admin_roles ar ON ap.role_id = ar.id
       WHERE ap.admin_id = $1
       ORDER BY ar.name`,
      [id]
    );
    
    const admin = adminResult.rows[0];
    admin.permissions = permissionsResult.rows;
    
    res.status(200).json({
      success: true,
      message: '管理员信息获取成功',
      data: {
        admin
      }
    });
    
  } catch (error) {
    console.error('获取管理员详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 创建新管理员
 * POST /api/admins
 * 权限：超级管理员
 */
router.post('/', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      username,
      email,
      password,
      role = 'admin',
      status = 'active'
    } = req.body;
    
    // 验证必填字段
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码是必填字段'
      });
      return;
    }
    
    // 检查用户名是否已存在
    const existingUsername = await query(
      'SELECT id FROM admins WHERE username = $1',
      [username]
    );
    
    if (existingUsername.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
      return;
    }
    
    // 检查邮箱是否已存在
    const existingEmail = await query(
      'SELECT id FROM admins WHERE email = $1',
      [email]
    );
    
    if (existingEmail.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '邮箱已存在'
      });
      return;
    }
    
    // 加密密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 创建管理员
    const createResult = await query(
      `INSERT INTO admins (username, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role, status, created_at`,
      [username, email, passwordHash, role, status]
    );
    
    res.status(201).json({
      success: true,
      message: '管理员创建成功',
      data: {
        admin: createResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('创建管理员错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新管理员信息
 * PUT /api/admins/:id
 * 权限：超级管理员
 */
router.put('/:id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      username,
      email,
      password,
      role,
      status
    } = req.body;
    
    // 检查管理员是否存在
    const existingAdmin = await query(
      'SELECT id FROM admins WHERE id = $1',
      [id]
    );
    
    if (existingAdmin.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '管理员不存在'
      });
      return;
    }
    
    // 构建更新字段
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (username !== undefined) {
      // 检查用户名是否已被其他管理员使用
      const usernameCheck = await query(
        'SELECT id FROM admins WHERE username = $1 AND id != $2',
        [username, id]
      );
      
      if (usernameCheck.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '用户名已被其他管理员使用'
        });
        return;
      }
      
      updateFields.push(`username = $${paramIndex}`);
      updateValues.push(username);
      paramIndex++;
    }
    
    if (email !== undefined) {
      // 检查邮箱是否已被其他管理员使用
      const emailCheck = await query(
        'SELECT id FROM admins WHERE email = $1 AND id != $2',
        [email, id]
      );
      
      if (emailCheck.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '邮箱已被其他管理员使用'
        });
        return;
      }
      
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(email);
      paramIndex++;
    }
    
    if (password !== undefined) {
      // 加密新密码
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      updateFields.push(`password_hash = $${paramIndex}`);
      updateValues.push(passwordHash);
      paramIndex++;
    }
    
    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex}`);
      updateValues.push(role);
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
    
    // 添加updated_at字段
    updateFields.push(`updated_at = NOW()`);
    
    // 添加WHERE条件的参数
    updateValues.push(id);
    
    const updateQuery = `
      UPDATE admins 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, email, role, status, updated_at
    `;
    
    const updateResult = await query(updateQuery, updateValues);
    
    res.status(200).json({
      success: true,
      message: '管理员信息更新成功',
      data: {
        admin: updateResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新管理员信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新管理员状态
 * PATCH /api/admins/:id/status
 * 权限：超级管理员
 */
router.patch('/:id/status', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      res.status(400).json({
        success: false,
        message: '状态是必填字段'
      });
      return;
    }
    
    // 验证状态值
    if (!['active', 'inactive'].includes(status)) {
      res.status(400).json({
        success: false,
        message: '状态值必须是 active 或 inactive'
      });
      return;
    }
    
    const updateResult = await query(
      `UPDATE admins 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, updated_at`,
      [status, id]
    );
    
    if (updateResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '管理员不存在'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: '管理员状态更新成功',
      data: {
        admin: updateResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('更新管理员状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取管理员角色列表
 * GET /api/admins/roles
 * 权限：超级管理员
 */
router.get('/roles', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const rolesResult = await query(
      `SELECT id, name, description, permissions, created_at
       FROM admin_roles
       ORDER BY name`
    );
    
    res.status(200).json({
      success: true,
      message: '管理员角色列表获取成功',
      data: {
        roles: rolesResult.rows
      }
    });
    
  } catch (error) {
    console.error('获取管理员角色列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 为管理员分配角色权限
 * POST /api/admins/:id/permissions
 * 权限：超级管理员
 */
router.post('/:id/permissions', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;
    
    if (!role_id) {
      res.status(400).json({
        success: false,
        message: '角色ID是必填字段'
      });
      return;
    }
    
    // 检查管理员是否存在
    const adminCheck = await query(
      'SELECT id FROM admins WHERE id = $1',
      [id]
    );
    
    if (adminCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '管理员不存在'
      });
      return;
    }
    
    // 检查角色是否存在
    const roleCheck = await query(
      'SELECT id FROM admin_roles WHERE id = $1',
      [role_id]
    );
    
    if (roleCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '角色不存在'
      });
      return;
    }
    
    // 检查是否已经分配过该角色
    const existingPermission = await query(
      'SELECT id FROM admin_permissions WHERE admin_id = $1 AND role_id = $2',
      [id, role_id]
    );
    
    if (existingPermission.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '该管理员已经拥有此角色权限'
      });
      return;
    }
    
    // 分配角色权限
    const permissionResult = await query(
      `INSERT INTO admin_permissions (admin_id, role_id)
       VALUES ($1, $2)
       RETURNING id, admin_id, role_id, granted_at`,
      [id, role_id]
    );
    
    res.status(201).json({
      success: true,
      message: '角色权限分配成功',
      data: {
        permission: permissionResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('分配角色权限错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 批量分配管理员权限
 * POST /api/admins/:id/permissions/batch
 * 权限：超级管理员
 */
router.post('/:id/permissions/batch', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permission_ids } = req.body;
    
    if (!permission_ids || !Array.isArray(permission_ids)) {
      res.status(400).json({
        success: false,
        message: '权限ID列表是必填字段且必须是数组'
      });
      return;
    }
    
    // 检查管理员是否存在
    const adminCheck = await query(
      'SELECT id FROM admins WHERE id = $1',
      [id]
    );
    
    if (adminCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '管理员不存在'
      });
      return;
    }
    
    // 清除该管理员的所有现有权限
    await query(
      'DELETE FROM admin_permissions WHERE admin_id = $1',
      [id]
    );
    
    // 根据权限ID找到对应的角色并分配
    const results = [];
    
    for (const permissionId of permission_ids) {
      // 根据权限ID确定角色
      let roleId = null;
      
      // 超级管理员权限
      if (permissionId.includes('all') || permission_ids.length > 10) {
        const superAdminRole = await query(
          'SELECT id FROM admin_roles WHERE name = $1',
          ['super_admin']
        );
        if (superAdminRole.rows.length > 0) {
          roleId = superAdminRole.rows[0].id;
        }
      }
      // 普通管理员权限
      else if (permissionId.includes('users:') && permissionId.includes('orders:') && permissionId.includes('statistics:')) {
        const adminRole = await query(
          'SELECT id FROM admin_roles WHERE name = $1',
          ['admin']
        );
        if (adminRole.rows.length > 0) {
          roleId = adminRole.rows[0].id;
        }
      }
      // 客服权限
      else if (permissionId.includes('users:read') || permissionId.includes('orders:')) {
        const customerServiceRole = await query(
          'SELECT id FROM admin_roles WHERE name = $1',
          ['customer_service']
        );
        if (customerServiceRole.rows.length > 0) {
          roleId = customerServiceRole.rows[0].id;
        }
      }
      // 操作员权限
      else if (permissionId.includes('agents:') || permissionId.includes('statistics:')) {
        const operatorRole = await query(
          'SELECT id FROM admin_roles WHERE name = $1',
          ['operator']
        );
        if (operatorRole.rows.length > 0) {
          roleId = operatorRole.rows[0].id;
        }
      }
      
      // 如果找到了对应的角色，则分配权限
      if (roleId) {
        // 检查是否已经分配过该角色
        const existingPermission = await query(
          'SELECT id FROM admin_permissions WHERE admin_id = $1 AND role_id = $2',
          [id, roleId]
        );
        
        if (existingPermission.rows.length === 0) {
          const permissionResult = await query(
            `INSERT INTO admin_permissions (admin_id, role_id)
             VALUES ($1, $2)
             RETURNING id, admin_id, role_id, granted_at`,
            [id, roleId]
          );
          results.push(permissionResult.rows[0]);
        }
      }
    }
    
    res.status(201).json({
      success: true,
      message: '权限批量分配成功',
      data: {
        permissions: results
      }
    });
    
  } catch (error) {
    console.error('批量分配权限错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 撤销管理员角色权限
 * DELETE /api/admins/:id/permissions/:permission_id
 * 权限：超级管理员
 */
router.delete('/:id/permissions/:permission_id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, permission_id } = req.params;
    
    // 检查权限记录是否存在且属于该管理员
    const permissionCheck = await query(
      'SELECT id FROM admin_permissions WHERE id = $1 AND admin_id = $2',
      [permission_id, id]
    );
    
    if (permissionCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '权限记录不存在或不属于该管理员'
      });
      return;
    }
    
    // 删除权限记录
    await query(
      'DELETE FROM admin_permissions WHERE id = $1',
      [permission_id]
    );
    
    res.status(200).json({
      success: true,
      message: '角色权限撤销成功'
    });
    
  } catch (error) {
    console.error('撤销角色权限错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;