/**
 * 系统管理模块主路由
 * 整合部门、岗位、角色、菜单等子模块路由
 */

import { Router } from 'express';
import adminRoleRoutes from './admin-roles.ts';
import departmentRoutes from './departments.ts';
import flashRentConfigRoutes from './flash-rent-config.ts';
import logRoutes from './logs/index.ts';
import menuRoutes from './menus.ts';
import permissionRoutes from './permissions.ts';
import positionRoutes from './positions.ts';
import roleRoutes from './roles.ts';

const router: Router = Router();

// 部门管理路由
router.use('/departments', departmentRoutes);

// 岗位管理路由
router.use('/positions', positionRoutes);

// 角色管理路由
router.use('/roles', roleRoutes);

// 菜单管理路由
router.use('/menus', menuRoutes);

// 管理员角色管理路由
router.use('/admin-roles', adminRoleRoutes);

// 日志管理路由
router.use('/logs', logRoutes);

// 权限管理路由
router.use('/permissions', permissionRoutes);

// 能量闪租配置路由
router.use('/flash-rent-config', flashRentConfigRoutes);

export default router;