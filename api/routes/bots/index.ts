/**
 * 机器人路由模块主入口
 * 聚合所有分离的机器人路由模块
 * 保持对外接口完全一致
 */
import { Router } from 'express';
import { initializeTelegramBotService } from './middleware.js';

// 导入各个功能模块路由
import crudRoutes from './crud.js';
import statusRoutes from './status.js';
import configRoutes from './config.js';
import usersRoutes from './users.js';
import statsRoutes from './stats.js';
import testRoutes from './test.js';

// 初始化Telegram机器人服务
initializeTelegramBotService();

const router: Router = Router();

/**
 * 注册各个功能模块的路由
 * 
 * 路由映射说明：
 * - CRUD操作: GET /, GET /:id, POST /, PUT /:id, DELETE /:id
 * - 状态管理: GET /available, PATCH /:id/status  
 * - 配置管理: PUT /:id/config
 * - 用户管理: GET /:id/users
 * - 统计监控: GET /stats/overview
 * - 测试功能: POST /:id/test
 */

// 注册统计路由（需要在CRUD路由之前，避免路径冲突）
router.use('/', statsRoutes);

// 注册状态管理路由（包含 /available 路径）
router.use('/', statusRoutes);

// 注册CRUD操作路由
router.use('/', crudRoutes);

// 注册配置管理路由
router.use('/', configRoutes);

// 注册用户管理路由
router.use('/', usersRoutes);

// 注册测试功能路由
router.use('/', testRoutes);

export default router;
