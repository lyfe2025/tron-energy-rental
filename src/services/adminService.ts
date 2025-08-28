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
    const response = await apiClient.get<ApiResponse<AdminListResponse>>('/api/admins', {
      params
    });
    return response.data.data;
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
    const response = await apiClient.put<ApiResponse<AdminDetailResponse>>(`/api/admins/${id}`, data);
    return response.data.data.admin;
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
   * 获取管理员角色列表
   */
  static async getAdminRoles(): Promise<AdminRoleListResponse> {
    const response = await apiClient.get<ApiResponse<AdminRoleListResponse>>('/api/admins/roles');
    return response.data.data;
  }

  /**
   * 获取所有可用权限列表
   */
  static async getAllPermissions(): Promise<{ permissions: AdminPermission[] }> {
    const response = await apiClient.get<ApiResponse<{ permissions: AdminPermission[] }>>('/api/admins/permissions');
    return response.data.data;
  }

  /**
   * 为管理员分配角色权限
   */
  static async assignRole(adminId: string, data: AssignRoleRequest): Promise<void> {
    await apiClient.post(`/api/admins/${adminId}/permissions`, data);
  }

  /**
   * 为管理员分配权限
   */
  static async assignPermissions(adminId: string, data: AssignPermissionsRequest): Promise<void> {
    await apiClient.post(`/api/admins/${adminId}/permissions/batch`, data);
  }

  /**
   * 撤销管理员角色权限
   */
  static async revokeRole(adminId: string, permissionId: string): Promise<void> {
    await apiClient.delete(`/api/admins/${adminId}/permissions/${permissionId}`);
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
    superAdmins: number;
    admins: number;
    operators: number;
    customerService: number;
  }> {
    // 获取所有管理员数据进行统计
    const { admins } = await this.getAdmins({ limit: 1000 });
    
    const stats = {
      total: admins.length,
      active: admins.filter(admin => admin.status === 'active').length,
      inactive: admins.filter(admin => admin.status === 'inactive').length,
      superAdmins: admins.filter(admin => admin.role === 'super_admin').length,
      admins: admins.filter(admin => admin.role === 'admin').length,
      operators: admins.filter(admin => admin.role === 'operator').length,
      customerService: admins.filter(admin => admin.role === 'customer_service').length
    };
    
    return stats;
  }
}

export default AdminService;