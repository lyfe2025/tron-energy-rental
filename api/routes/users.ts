import { Router, type Request, type Response } from 'express';
import { body, param, query } from 'express-validator';
import { UserService } from '../services/user.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = Router();

/**
 * 获取用户列表
 * GET /api/users
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('status').optional().isIn(['active', 'banned']).withMessage('状态筛选无效'),
  query('user_type').optional().isIn(['normal', 'vip', 'premium']).withMessage('用户类型筛选无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const userType = req.query.user_type as string;

    const result = await UserService.getUsers({
      page,
      limit,
      search,
      status,
      userType
    });

    res.json({
      success: true,
      data: result.users,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败'
    });
  }
});

/**
 * 获取用户统计数据
 * GET /api/users/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await UserService.getUserStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取用户统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户统计数据失败'
    });
  }
});

/**
 * 获取用户详情
 * GET /api/users/:id
 */
router.get('/:id', [
  param('id').isUUID().withMessage('用户ID必须是有效的UUID'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await UserService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户详情失败'
    });
  }
});

/**
 * 创建用户
 * POST /api/users
 */
router.post('/', [
  body('login_type').isIn(['telegram', 'admin', 'both']).withMessage('登录类型无效'),
  body('telegram_id').optional().custom((value, { req }) => {
    const loginType = req.body.login_type;
    if (loginType === 'telegram' || loginType === 'both') {
      if (!value || !Number.isInteger(Number(value))) {
        throw new Error('Telegram登录类型需要提供有效的Telegram ID');
      }
    }
    return true;
  }),
  body('username').optional().isString().withMessage('用户名必须是字符串'),
  body('email').optional().isEmail().withMessage('邮箱格式无效'),
  body('password').optional().isLength({ min: 6 }).withMessage('密码至少6位'),
  body('user_type').isIn(['normal', 'vip', 'premium']).withMessage('用户类型无效'),
  body('usdt_balance').optional().isFloat({ min: 0 }).withMessage('USDT余额必须是非负数'),
  body('trx_balance').optional().isFloat({ min: 0 }).withMessage('TRX余额必须是非负数'),
  body('agent_id').optional().isUUID().withMessage('代理商ID必须是有效的UUID'),
  body('commission_rate').optional().isFloat({ min: 0, max: 1 }).withMessage('佣金比例必须在0-1之间'),
  body('status').optional().isIn(['active', 'banned']).withMessage('状态无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    const user = await UserService.createUser(userData);

    res.status(201).json({
      success: true,
      data: user,
      message: '用户创建成功'
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({
      success: false,
      error: '创建用户失败'
    });
  }
});

/**
 * 更新用户
 * PUT /api/users/:id
 */
router.put('/:id', [
  param('id').isUUID().withMessage('用户ID必须是有效的UUID'),
  body('login_type').optional().isIn(['telegram', 'admin', 'both']).withMessage('登录类型无效'),
  body('telegram_id').optional().isInt().withMessage('Telegram ID必须是整数'),
  body('username').optional().isString().withMessage('用户名必须是字符串'),
  body('email').optional().isEmail().withMessage('邮箱格式无效'),
  body('user_type').optional().isIn(['normal', 'vip', 'premium']).withMessage('用户类型无效'),
  body('usdt_balance').optional().isFloat({ min: 0 }).withMessage('USDT余额必须是非负数'),
  body('trx_balance').optional().isFloat({ min: 0 }).withMessage('TRX余额必须是非负数'),
  body('agent_id').optional().isUUID().withMessage('代理商ID必须是有效的UUID'),
  body('commission_rate').optional().isFloat({ min: 0, max: 1 }).withMessage('佣金比例必须在0-1之间'),
  body('status').optional().isIn(['active', 'banned']).withMessage('状态无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const user = await UserService.updateUser(id, updateData);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user,
      message: '用户更新成功'
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({
      success: false,
      error: '更新用户失败'
    });
  }
});

/**
 * 更新用户状态
 * PATCH /api/users/:id/status
 */
router.patch('/:id/status', [
  param('id').isUUID().withMessage('用户ID必须是有效的UUID'),
  body('status').isIn(['active', 'banned']).withMessage('状态无效'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const user = await UserService.updateUserStatus(id, status);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user,
      message: `用户状态已更新为${status}`
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新用户状态失败'
    });
  }
});

/**
 * 删除用户
 * DELETE /api/users/:id
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('用户ID必须是有效的UUID'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await UserService.deleteUser(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      error: '删除用户失败'
    });
  }
});

export default router;