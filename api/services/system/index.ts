/**
 * 系统管理服务模块主入口
 * 导出所有系统管理相关的服务
 */

export { DepartmentService } from './department.ts';
export { PositionService } from './position.ts';
export { RoleService } from './role.ts';
export { MenuService } from './menu.ts';

export type {
  Department,
  CreateDepartmentData,
  UpdateDepartmentData,
  DepartmentQuery
} from './department.ts';

export type {
  Position,
  CreatePositionData,
  UpdatePositionData,
  PositionQuery
} from './position.ts';

export type {
  Role,
  Permission,
  CreateRoleData,
  UpdateRoleData,
  RoleQuery
} from './role.ts';

export type {
  Menu,
  CreateMenuData,
  UpdateMenuData,
  MenuQuery
} from './menu.ts';