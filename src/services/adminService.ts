/**
 * 管理员管理服务
 * 封装管理员相关的 API 调用
 */
import { apiClient } from './api';
import type {
  Admin,
  AdminQuery,
  CreateAdminRequest,
  UpdateAdminRequest,
  UpdateAdminStatusRequest,
  AssignRoleRequest,
  AssignPermissionsRequest,
  AdminListResponse,
  AdminDetailResponse,
  AdminRoleListResponse,
  AdminPermission
} from '../pages/Admins/types';
import type { ApiResponse } from '../types/api';

export class AdminService {
  /**
   * 获取管理员列表
   */
  static async getAdmins(params?: AdminQuery): Promise<AdminListResponse> {
    const response = await apiClient.get<any>('/api/admins', {
      params
    });
    // 后端返回格式: {success: true, data: [...], pagination: {...}}
    return {
      admins: response.data.data || [],
      pagination: response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  }

  /**
   * 获取管理员详情
   */
  static async getAdmin(id: string): Promise<Admin> {
    const response = await apiClient.get<ApiResponse<AdminDetailResponse>>(`/api/admins/${id}`);
    return response.data.data.admin;
  }

  /**
   * 创建管理员
   */
  static async createAdmin(data: CreateAdminRequest): Promise<Admin> {
    const response = await apiClient.post<ApiResponse<AdminDetailResponse>>('/api/admins', data);
    return response.data.data.admin;
  }

  /**
   * 更新管理员信息
   */
  static async updateAdmin(id: string, data: UpdateAdminRequest): Promise<Admin> {
    console.log('🔍 [AdminService] 更新管理员请求:')
    console.log('  管理员ID:', id)
    console.log('  请求数据:', data)
    console.log('  请求URL:', `/api/admins/${id}`)
    
    try {
      const response = await apiClient.put<ApiResponse<AdminDetailResponse>>(`/api/admins/${id}`, data);
      console.log('✅ [AdminService] 响应成功:', response.data)
      return response.data.data.admin;
    } catch (error) {
      console.error('❌ [AdminService] 请求失败:', error)
      throw error;
    }
  }

  /**
   * 更新管理员状态
   */
  static async updateAdminStatus(id: string, data: UpdateAdminStatusRequest): Promise<Admin> {
    const response = await apiClient.patch<ApiResponse<AdminDetailResponse>>(`/api/admins/${id}/status`, data);
    return response.data.data.admin;
  }

  /**
   * 删除管理员
   */
  static async deleteAdmin(id: string): Promise<void> {
    await apiClient.delete(`/api/admins/${id}`);
  }

  /**
   * 重置管理员密码
   */
  static async resetAdminPassword(id: string, newPassword: string): Promise<void> {
    await apiClient.patch(`/api/admins/${id}/password`, {
      password: newPassword
    });
  }

  /**
   * 生成随机密码
   */
  static generateRandomPassword(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * 获取管理员角色列表
   */
  static async getAdminRoles(): Promise<AdminRoleListResponse> {
    const response = await apiClient.get<ApiResponse<any>>('/api/system/admin-roles');
    // 后端返回的是 {success: true, data: roles}，需要包装成前端期望的格式
    return { roles: response.data.data };
  }

  /**
   * 获取所有可用权限列表
   */
  static async getAllPermissions(): Promise<{ permissions: AdminPermission[] }> {
    const response = await apiClient.get<ApiResponse<{ permissions: AdminPermission[] }>>('/api/system/permissions');
    return response.data.data;
  }

  /**
   * 为管理员分配角色权限
   */
  static async assignRole(adminId: string, data: AssignRoleRequest): Promise<void> {
    await apiClient.post('/api/system/admin-roles', {
      admin_id: adminId,
      operation: 'assign',
      ...data
    });
  }

  /**
   * 为管理员分配权限
   */
  static async assignPermissions(adminId: string, data: AssignPermissionsRequest): Promise<void> {
    await apiClient.post('/api/system/admin-roles/batch', {
      admin_id: adminId,
      operation: 'assign',
      ...data
    });
  }

  /**
   * 撤销管理员角色权限
   */
  static async revokeRole(adminId: string, roleId: string): Promise<void> {
    await apiClient.delete('/api/system/admin-roles', {
      data: {
        admin_id: adminId,
        role_ids: [roleId]
      }
    });
  }

  /**
   * 批量更新管理员状态
   */
  static async batchUpdateStatus(ids: string[], status: 'active' | 'inactive'): Promise<void> {
    const promises = ids.map(id => this.updateAdminStatus(id, { status }));
    await Promise.all(promises);
  }

  /**
   * 批量删除管理员
   */
  static async batchDelete(ids: string[]): Promise<void> {
    const promises = ids.map(id => this.deleteAdmin(id));
    await Promise.all(promises);
  }

  /**
   * 获取管理员统计数据
   */
  static async getAdminStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_role: {
      [key: string]: number;
      super_admin: number;
      admin: number;
      operator: number;
    };
    new_admins_today: number;
    new_admins_this_week: number;
    new_admins_this_month: number;
    recent_logins: number;
  }> {
    const response = await apiClient.get<ApiResponse<any>>('/api/admins/stats');
    // 后端返回格式: {success: true, data: {...}}
    return response.data.data || {
      total: 0,
      active: 0,
      inactive: 0,
      by_role: {
        super_admin: 0,
        admin: 0,
        operator: 0
      },
      new_admins_today: 0,
      new_admins_this_week: 0,
      new_admins_this_month: 0,
      recent_logins: 0
    };
  }
}

export default AdminService;