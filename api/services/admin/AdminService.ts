/**
 * 管理员服务门面类（安全分离后的主入口）
 * 保持原有API接口不变，内部调用分离后的专门服务
 * 确保向后兼容性，外部调用无需修改
 */

// 导出类型定义，保持向后兼容
export interface Admin {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  department_id?: number;
  position_id?: number;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  last_login_at?: Date;
}

export interface AdminSearchParams {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface AdminCreateData {
  username: string;
  email: string;
  password: string;
  role: string;
  status?: string;
  department_id?: number;
  position_id?: number;
}

export interface AdminUpdateData {
  username?: string;
  email?: string;
  role?: string;
  status?: string;
  department_id?: number;
  position_id?: number;
}

// 导入分离后的服务
import { AdminAuthService } from './AdminAuthService.js';
import { AdminCRUDService } from './AdminCRUDService.js';
import { AdminStatsService } from './AdminStatsService.js';

/**
 * 管理员服务门面类
 * 提供统一的接口，内部调用分离后的专门服务
 */
export class AdminService {
  // =================== CRUD 操作 ===================
  
  /**
   * 获取管理员列表
   */
  static async getAdmins(params: AdminSearchParams) {
    return await AdminCRUDService.getAdmins(params);
  }

  /**
   * 根据ID获取管理员详情
   */
  static async getAdminById(id: string): Promise<Admin | null> {
    return await AdminCRUDService.getAdminById(id);
  }

  /**
   * 创建管理员
   */
  static async createAdmin(data: AdminCreateData): Promise<Admin> {
    return await AdminCRUDService.createAdmin(data);
  }

  /**
   * 更新管理员信息
   */
  static async updateAdmin(id: string, data: AdminUpdateData): Promise<Admin | null> {
    return await AdminCRUDService.updateAdmin(id, data);
  }

  /**
   * 更新管理员状态
   */
  static async updateAdminStatus(id: string, status: string): Promise<Admin | null> {
    return await AdminCRUDService.updateAdminStatus(id, status);
  }

  /**
   * 删除管理员
   */
  static async deleteAdmin(id: string): Promise<boolean> {
    return await AdminCRUDService.deleteAdmin(id);
  }

  // =================== 认证操作 ===================

  /**
   * 重置管理员密码
   */
  static async resetAdminPassword(id: string, password: string): Promise<boolean> {
    return await AdminAuthService.resetAdminPassword(id, password);
  }

  /**
   * 更新管理员最后登录时间
   */
  static async updateLastLogin(id: string): Promise<void> {
    return await AdminAuthService.updateLastLogin(id);
  }

  /**
   * 验证管理员密码
   */
  static async verifyPassword(id: string, password: string): Promise<boolean> {
    return await AdminAuthService.verifyPassword(id, password);
  }

  /**
   * 验证管理员邮箱和密码（用于登录）
   */
  static async validateEmailLogin(email: string, password: string) {
    return await AdminAuthService.validateEmailLogin(email, password);
  }

  /**
   * 检查管理员是否存在密码
   */
  static async hasPassword(id: string): Promise<boolean> {
    return await AdminAuthService.hasPassword(id);
  }

  /**
   * 设置管理员密码（首次设置）
   */
  static async setPassword(id: string, password: string): Promise<boolean> {
    return await AdminAuthService.setPassword(id, password);
  }

  /**
   * 修改管理员密码（需要验证旧密码）
   */
  static async changePassword(id: string, oldPassword: string, newPassword: string): Promise<boolean> {
    return await AdminAuthService.changePassword(id, oldPassword, newPassword);
  }

  /**
   * 检查管理员状态是否允许登录
   */
  static async canLogin(id: string): Promise<boolean> {
    return await AdminAuthService.canLogin(id);
  }

  /**
   * 获取管理员权限信息
   */
  static async getAdminPermissions(id: string): Promise<string[]> {
    return await AdminAuthService.getAdminPermissions(id);
  }

  /**
   * 获取管理员登录历史统计
   */
  static async getLoginStats(id: string) {
    return await AdminAuthService.getLoginStats(id);
  }

  // =================== 统计功能 ===================

  /**
   * 获取管理员统计数据
   */
  static async getAdminStats() {
    return await AdminStatsService.getAdminStats();
  }

  /**
   * 获取管理员活动趋势数据
   */
  static async getAdminActivityStats(days: number = 30) {
    return await AdminStatsService.getAdminActivityStats(days);
  }

  /**
   * 获取部门管理员分布统计
   */
  static async getDepartmentAdminStats() {
    return await AdminStatsService.getDepartmentAdminStats();
  }

  /**
   * 获取岗位管理员分布统计
   */
  static async getPositionAdminStats() {
    return await AdminStatsService.getPositionAdminStats();
  }

  /**
   * 获取管理员登录频率统计
   */
  static async getLoginFrequencyStats() {
    return await AdminStatsService.getLoginFrequencyStats();
  }

  /**
   * 获取管理员权限分配统计
   */
  static async getPermissionStats() {
    return await AdminStatsService.getPermissionStats();
  }

  /**
   * 获取特定管理员的统计信息
   */
  static async getAdminPersonalStats(adminId: string) {
    return await AdminStatsService.getAdminPersonalStats(adminId);
  }

  // =================== 扩展功能（兼容性方法） ===================

  /**
   * 获取角色列表（为兼容现有路由）
   */
  static async getRoles() {
    // 这可能需要根据实际的角色管理实现来调整
    const query = `
      SELECT DISTINCT role as id, role as name, role as code
      FROM admins
      WHERE status = 'active'
      ORDER BY role
    `;
    
    const pool = (await import('../../config/database.js')).default;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * 获取权限列表（为兼容现有路由）
   */
  static async getPermissions() {
    const query = `
      SELECT DISTINCT permission as id, permission as name, permission as code
      FROM menus
      WHERE permission IS NOT NULL
      ORDER BY permission
    `;
    
    const pool = (await import('../../config/database.js')).default;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * 获取统计数据（为兼容现有路由）
   * @deprecated 请使用 getAdminStats() 方法
   */
  static async getStats() {
    return await this.getAdminStats();
  }
}