/**
 * 机器人路由模块主入口
 * 聚合所有分离的机器人路由模块
 * 保持对外接口完全一致
 */
import { Router } from 'express';

// 导入各个功能模块路由
import configRoutes from './config.js';
import crudRoutes from './crud.js';
import extendedConfigRoutes from './extended-config.js';
import logsRoutes from './logs.js';
import networkConfigRoutes from './network-config.js';
import statsRoutes from './stats.js';
import statusRoutes from './status.js';
import testRoutes from './test.js';
import usersRoutes from './users.js';
// 初始化Telegram机器人服务 - 临时禁用以减少日志噪音
// initializeTelegramBotService();

const router: Router = Router();

// 添加请求日志中间件来调试路由问题
router.use((req, res, next) => {
  console.log(`\n🔍 机器人路由请求: ${req.method} ${req.path}`);
  console.log(`📋 请求体大小: ${JSON.stringify(req.body).length} 字符`);
  console.log(`🕐 时间: ${new Date().toLocaleString()}`);
  next();
});

/**
 * 注册各个功能模块的路由
 * 
 * 路由映射说明：
 * - CRUD操作: GET /, GET /:id, POST /, PUT /:id, DELETE /:id
 * - 状态管理: GET /available, PATCH /:id/status  
 * - 配置管理: PUT /:id/config
 * - 扩展配置: GET/PUT /:id/extended-config, POST /:id/health-check, GET /:id/config-history
 * - 网络配置: GET/POST /:id/networks, PUT/DELETE /:id/networks/:networkId, PATCH /:id/networks/:networkId/primary
 * - 用户管理: GET /:id/users
 * - 统计监控: GET /stats/overview
 * - 测试功能: POST /:id/test
 * - 日志管理: GET /:id/logs, POST /:id/logs
 */

// 注册统计路由（需要在CRUD路由之前，避免路径冲突）
router.use('/', statsRoutes);

// 注册状态管理路由（包含 /available 路径）
router.use('/', statusRoutes);

// 注册CRUD操作路由
router.use('/', crudRoutes);

// 注册配置管理路由
router.use('/', configRoutes);

// 注册扩展配置管理路由
router.use('/', extendedConfigRoutes);

// 注册网络配置管理路由
router.use('/', networkConfigRoutes);

// 注册用户管理路由
router.use('/', usersRoutes);

// 注册测试功能路由
router.use('/', testRoutes);

// 注册日志管理路由
router.use('/', logsRoutes);

export default router;
