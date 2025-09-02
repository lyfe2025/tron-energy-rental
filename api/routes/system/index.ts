/**
 * 系统管理模块主路由
 * 整合部门、岗位、角色、菜单等子模块路由
 */

import { Router } from 'express';
import adminRoleRoutes from './admin-roles.js';
import departmentRoutes from './departments.js';
import logRoutes from './logs.js';
import menuRoutes from './menus.js';
import permissionRoutes from './permissions.js';
import positionRoutes from './positions.js';
import roleRoutes from './roles.js';

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

export default router;