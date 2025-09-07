import { Router } from 'express';

// 导入所有分离的子路由模块
import overviewStatisticsRouter from './energy-pool/overview-statistics';
import accountsQueryRouter from './energy-pool/accounts-query';
import poolOperationsRouter from './energy-pool/pool-operations';
import accountsManagementRouter from './energy-pool/accounts-management';

const router: Router = Router();

// === 安全分离后的路由挂载 ===
// 保持原有的路由结构和行为完全不变

// 1. 概览和统计相关路由 - 挂载到根路径
router.use('/', overviewStatisticsRouter);

// 2. 账户查询相关路由 - 挂载到 /accounts 路径
router.use('/accounts', accountsQueryRouter);

// 3. 能量池操作相关路由 - 挂载到根路径
router.use('/', poolOperationsRouter);

// 4. 账户管理相关路由 - 挂载到 /accounts 路径
router.use('/accounts', accountsManagementRouter);

// === 保持原有导出方式，确保外部调用兼容性 ===
export default router;
