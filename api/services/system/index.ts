/**
 * 系统管理服务模块主入口
 * 导出所有系统管理相关的服务
 */

export { DepartmentService } from './department.js';
export { PositionService } from './position.js';
export { RoleService } from './role.js';
export { MenuService } from './menu.js';

export type {
  Department,
  CreateDepartmentData,
  UpdateDepartmentData,
  DepartmentQuery
} from './department.js';

export type {
  Position,
  CreatePositionData,
  UpdatePositionData,
  PositionQuery
} from './position.js';

export type {
  Role,
  Permission,
  CreateRoleData,
  UpdateRoleData,
  RoleQuery
} from './role.js';

export type {
  Menu,
  CreateMenuData,
  UpdateMenuData,
  MenuQuery
} from './menu.js';