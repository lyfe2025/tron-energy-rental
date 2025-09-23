/**
 * 管理员服务类主文件
 * 整合所有分离的管理员服务模块，保持原有API接口不变
 */

import { AdminService as AdminServiceCore } from './admin/AdminService.ts';
import { AdminStatsService } from './admin/AdminStatsService.ts';
import { AdminRoleService } from './admin/AdminRoleService.ts';
import { AdminLogService } from './admin/AdminLogService.ts';

// 导出所有类型定义
export type {
  Admin,
  AdminSearchParams,
  AdminCreateData,
  AdminUpdateData
} from './admin/AdminService.ts';

export type {
  AdminStats
} from './admin/AdminStatsService.ts';

export type {
  Role,
  Permission
} from './admin/AdminRoleService.ts';

/**
 * 管理员服务类 - 主入口
 * 保持与原文件完全一致的API接口
 */
export class AdminServiceMain {
  // ========== 基础CRUD操作 (来自AdminService) ==========
  
  /**
   * 获取管理员列表
   */
  static async getAdmins(params: any) {
    return AdminServiceCore.getAdmins(params);
  }

  /**
   * 根据ID获取管理员详情
   */
  static async getAdminById(id: string) {
    return AdminServiceCore.getAdminById(id);
  }

  /**
   * 创建管理员
   */
  static async createAdmin(data: any) {
    return AdminServiceCore.createAdmin(data);
  }

  /**
   * 更新管理员信息
   */
  static async updateAdmin(id: string, data: any) {
    return AdminServiceCore.updateAdmin(id, data);
  }

  /**
   * 更新管理员状态
   */
  static async updateAdminStatus(id: string, status: string) {
    return AdminServiceCore.updateAdminStatus(id, status);
  }

  /**
   * 重置管理员密码
   */
  static async resetAdminPassword(id: string, password: string) {
    return AdminServiceCore.resetAdminPassword(id, password);
  }

  /**
   * 删除管理员
   */
  static async deleteAdmin(id: string) {
    return AdminServiceCore.deleteAdmin(id);
  }

  /**
   * 更新管理员最后登录时间
   */
  static async updateLastLogin(id: string) {
    return AdminServiceCore.updateLastLogin(id);
  }

  // ========== 统计分析功能 (来自AdminStatsService) ==========

  /**
   * 获取管理员统计数据
   */
  static async getAdminStats() {
    return AdminStatsService.getAdminStats();
  }

  /**
   * 获取管理员活动统计（按天）
   */
  static async getActivityStatsByDays(days: number = 30) {
    return AdminStatsService.getAdminActivityStats(days);
  }

  /**
   * 获取管理员登录频率统计
   */
  static async getLoginFrequencyStats() {
    return AdminStatsService.getLoginFrequencyStats();
  }

  /**
   * 获取管理员部门分布统计
   */
  static async getDepartmentStats() {
    return AdminStatsService.getDepartmentAdminStats();
  }

  /**
   * 获取管理员岗位分布统计
   */
  static async getPositionStats() {
    return AdminStatsService.getPositionAdminStats();
  }

  /**
   * 获取权限分布统计
   */
  static async getPermissionStats() {
    return AdminStatsService.getPermissionStats();
  }

  /**
   * 获取管理员个人统计
   */
  static async getAdminPersonalStats(adminId: string) {
    return AdminStatsService.getAdminPersonalStats(adminId);
  }

  // ========== 角色权限管理 (来自AdminRoleService) ==========

  /**
   * 获取角色列表
   */
  static async getRoles() {
    return AdminRoleService.getRoles();
  }

  /**
   * 获取权限列表
   */
  static async getPermissions() {
    return AdminRoleService.getPermissions();
  }

  /**
   * 获取用户的角色和权限信息
   */
  static async getUserRolesAndPermissions(userId: string) {
    return AdminRoleService.getUserRolesAndPermissions(userId);
  }

  /**
   * 检查用户是否具有指定权限
   */
  static async hasPermission(userId: string, permission: string) {
    return AdminRoleService.hasPermission(userId, permission);
  }

  /**
   * 为管理员分配角色
   */
  static async assignRole(adminId: string, roleId: string) {
    return AdminRoleService.assignRole(adminId, roleId);
  }

  /**
   * 移除管理员角色
   */
  static async removeRole(adminId: string, roleId: string) {
    return AdminRoleService.removeRole(adminId, roleId);
  }

  /**
   * 获取管理员的所有角色
   */
  static async getAdminRoles(adminId: string) {
    return AdminRoleService.getAdminRoles(adminId);
  }

  /**
   * 批量更新管理员角色
   */
  static async updateAdminRoles(adminId: string, roleIds: string[]) {
    return AdminRoleService.updateAdminRoles(adminId, roleIds);
  }

  /**
   * 获取角色的权限列表
   */
  static async getRolePermissions(roleId: string) {
    return AdminRoleService.getRolePermissions(roleId);
  }

  // ========== 操作日志功能 (来自AdminLogService) ==========

  /**
   * 记录操作日志
   */
  static async logOperation(data: {
    user_id: string;
    action: string;
    resource: string;
    resource_id?: string;
    details?: any;
    ip_address?: string;
    user_agent?: string;
  }) {
    return AdminLogService.logOperation(data);
  }

  /**
   * 获取操作日志列表
   */
  static async getOperationLogs(params: any) {
    return AdminLogService.getOperationLogs(params);
  }

  /**
   * 获取用户操作统计
   */
  static async getUserOperationStats(userId: string, days: number = 30) {
    return AdminLogService.getUserOperationStats(userId, days);
  }

  /**
   * 获取系统操作统计（按天）
   */
  static async getSystemOperationStats(days: number = 7) {
    return AdminLogService.getSystemOperationStats(days);
  }

  /**
   * 获取热门操作排行
   */
  static async getTopOperations(limit: number = 10, days: number = 30) {
    return AdminLogService.getTopOperations(limit, days);
  }

  /**
   * 获取异常操作记录
   */
  static async getSuspiciousOperations(days: number = 7) {
    return AdminLogService.getSuspiciousOperations(days);
  }

  /**
   * 清理过期日志
   */
  static async cleanupExpiredLogs(retentionDays: number = 90) {
    return AdminLogService.cleanupExpiredLogs(retentionDays);
  }

  /**
   * 导出操作日志
   */
  static async exportLogs(params: any) {
    return AdminLogService.exportLogs(params);
  }

  // ========== 批量操作功能 ==========

  /**
   * 批量操作管理员
   */
  static async bulkAction(action: string, adminIds: string[]): Promise<boolean> {
    try {
      const promises = adminIds.map(adminId => {
        switch (action) {
          case 'enable':
            return this.updateAdminStatus(adminId, 'active');
          case 'disable':
            return this.updateAdminStatus(adminId, 'inactive');
          case 'delete':
            return this.deleteAdmin(adminId);
          default:
            throw new Error(`不支持的批量操作: ${action}`);
        }
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('批量操作失败:', error);
      throw error;
    }
  }
}

// 为了保持向后兼容性，创建类型别名
interface AdminServiceMainInterface {
  getAdmins: typeof AdminServiceCore.getAdmins;
  getAdminById: typeof AdminServiceCore.getAdminById;
  createAdmin: typeof AdminServiceCore.createAdmin;
  updateAdmin: typeof AdminServiceCore.updateAdmin;
  updateAdminStatus: typeof AdminServiceCore.updateAdminStatus;
  resetAdminPassword: typeof AdminServiceCore.resetAdminPassword;
  deleteAdmin: typeof AdminServiceCore.deleteAdmin;
  updateLastLogin: typeof AdminServiceCore.updateLastLogin;
  getAdminStats: typeof AdminStatsService.getAdminStats;
  getRoles: typeof AdminRoleService.getRoles;
  getPermissions: typeof AdminRoleService.getPermissions;
  getUserRolesAndPermissions: typeof AdminRoleService.getUserRolesAndPermissions;
  hasPermission: typeof AdminRoleService.hasPermission;
  logOperation: typeof AdminLogService.logOperation;
  bulkAction: (action: string, adminIds: string[]) => Promise<boolean>;
}

// 导出分离的服务类供高级用法使用
export {
  AdminServiceCore as AdminBasicService,
  AdminStatsService,
  AdminRoleService,
  AdminLogService
};

// 导出主服务类作为默认的 AdminService
export { AdminServiceMain as AdminService };