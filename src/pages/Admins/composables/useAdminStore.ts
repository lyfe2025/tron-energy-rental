/**
 * 管理员管理状态管理
 * 使用 Vue 组合式 API 进行状态管理
 */
import { ref } from 'vue';
import { AdminService } from '../../../services/adminService';
import type {
  Admin,
  AdminQuery,
  CreateAdminRequest,
  UpdateAdminRequest,
  UpdateAdminStatusRequest,
  AssignRoleRequest,
  AdminRoleInfo,
  AdminPagination
} from '../types';

// 管理员统计数据接口
interface AdminStats {
  total: number;
  active: number;
  inactive: number;
  by_role: {
    super_admin: number;
    admin: number;
    operator: number;
    [key: string]: number;
  };
  new_admins_today: number;
  new_admins_this_week: number;
  new_admins_this_month: number;
  recent_logins: number;
}

export function useAdminStore() {
  // 状态数据
  const admins = ref<Admin[]>([]);
  const currentAdmin = ref<Admin | null>(null);
  const roles = ref<AdminRoleInfo[]>([]);
  const pagination = ref<AdminPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // 统计数据
  const stats = ref<AdminStats>({
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
  });

  // Actions
  const fetchAdmins = async (params?: AdminQuery) => {
    try {
      loading.value = true;
      error.value = null;
      const response = await AdminService.getAdmins(params);
      admins.value = response.admins;
      pagination.value = response.pagination;
    } catch (err) {
      console.error('获取管理员列表失败:', err);
      error.value = err instanceof Error ? err.message : '获取管理员列表失败';
    } finally {
      loading.value = false;
    }
  };
  
  const fetchAdmin = async (id: string) => {
    try {
      loading.value = true;
      error.value = null;
      const admin = await AdminService.getAdmin(id);
      currentAdmin.value = admin;
    } catch (err) {
      console.error('获取管理员详情失败:', err);
      error.value = err instanceof Error ? err.message : '获取管理员详情失败';
    } finally {
      loading.value = false;
    }
  };

  const fetchAdminDetail = async (id: string) => {
    return fetchAdmin(id);
  };
  
  const createAdmin = async (data: CreateAdminRequest): Promise<Admin> => {
    try {
      loading.value = true;
      error.value = null;
      const newAdmin = await AdminService.createAdmin(data);
      
      // 更新列表
      admins.value = [newAdmin, ...admins.value];
      
      return newAdmin;
    } catch (err) {
      console.error('创建管理员失败:', err);
      error.value = err instanceof Error ? err.message : '创建管理员失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const updateAdmin = async (id: string, data: UpdateAdminRequest): Promise<Admin> => {
    try {
      loading.value = true;
      error.value = null;
      const updatedAdmin = await AdminService.updateAdmin(id, data);
      
      // 更新列表中的管理员
      const index = admins.value.findIndex(admin => admin.id === id);
      if (index !== -1) {
        admins.value[index] = updatedAdmin;
      }
      
      if (currentAdmin.value?.id === id) {
        currentAdmin.value = updatedAdmin;
      }
      
      return updatedAdmin;
    } catch (err) {
      console.error('更新管理员失败:', err);
      error.value = err instanceof Error ? err.message : '更新管理员失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const updateAdminStatus = async (id: string, status: 'active' | 'inactive') => {
    try {
      loading.value = true;
      error.value = null;
      await AdminService.updateAdminStatus(id, { status });
      
      // 更新列表中的管理员状态
      const index = admins.value.findIndex(admin => admin.id === id);
      if (index !== -1) {
        admins.value[index] = { ...admins.value[index], status };
      }
    } catch (err) {
      console.error('更新管理员状态失败:', err);
      error.value = err instanceof Error ? err.message : '更新管理员状态失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const deleteAdmin = async (id: string) => {
    try {
      loading.value = true;
      error.value = null;
      await AdminService.deleteAdmin(id);
      
      // 从列表中移除管理员
      admins.value = admins.value.filter(admin => admin.id !== id);
      
      if (currentAdmin.value?.id === id) {
        currentAdmin.value = null;
      }
    } catch (err) {
      console.error('删除管理员失败:', err);
      error.value = err instanceof Error ? err.message : '删除管理员失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const batchUpdateStatus = async (ids: string[], status: 'active' | 'inactive') => {
    try {
      loading.value = true;
      error.value = null;
      await AdminService.batchUpdateStatus(ids, status);
      
      // 更新列表中的管理员状态
      admins.value = admins.value.map(admin => 
        ids.includes(admin.id) ? { ...admin, status } : admin
      );
    } catch (err) {
      console.error('批量更新状态失败:', err);
      error.value = err instanceof Error ? err.message : '批量更新状态失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const batchDelete = async (ids: string[]) => {
    try {
      loading.value = true;
      error.value = null;
      await AdminService.batchDelete(ids);
      
      // 从列表中移除管理员
      admins.value = admins.value.filter(admin => !ids.includes(admin.id));
    } catch (err) {
      console.error('批量删除失败:', err);
      error.value = err instanceof Error ? err.message : '批量删除失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const bulkAction = async (action: string, adminIds: string[]) => {
    try {
      loading.value = true;
      error.value = null;
      
      switch (action) {
        case 'activate':
          await batchUpdateStatus(adminIds, 'active');
          break;
        case 'deactivate':
          await batchUpdateStatus(adminIds, 'inactive');
          break;
        case 'delete':
          await batchDelete(adminIds);
          break;
        default:
          throw new Error(`未知的批量操作: ${action}`);
      }
    } catch (err) {
      console.error('批量操作失败:', err);
      error.value = err instanceof Error ? err.message : '批量操作失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const fetchRoles = async () => {
    try {
      loading.value = true;
      error.value = null;
      const response = await AdminService.getAdminRoles();
      roles.value = response.roles;
    } catch (err) {
      console.error('获取角色列表失败:', err);
      error.value = err instanceof Error ? err.message : '获取角色列表失败';
    } finally {
      loading.value = false;
    }
  };
  
  const assignRole = async (adminId: string, roleId: string) => {
    try {
      loading.value = true;
      error.value = null;
      await AdminService.assignRole(adminId, { role_id: roleId });
      
      // 重新获取管理员详情以更新权限信息
      if (currentAdmin.value?.id === adminId) {
        await fetchAdmin(adminId);
      }
    } catch (err) {
      console.error('分配角色失败:', err);
      error.value = err instanceof Error ? err.message : '分配角色失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const assignPermissions = async (adminId: string, permissionIds: string[]) => {
    try {
      loading.value = true;
      error.value = null;
      await AdminService.assignPermissions(adminId, { permission_ids: permissionIds });
      
      // 重新获取管理员详情以更新权限信息
      if (currentAdmin.value?.id === adminId) {
        await fetchAdmin(adminId);
      }
    } catch (err) {
      console.error('分配权限失败:', err);
      error.value = err instanceof Error ? err.message : '分配权限失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const revokeRole = async (adminId: string, permissionId: string) => {
    try {
      loading.value = true;
      error.value = null;
      await AdminService.revokeRole(adminId, permissionId);
      
      // 重新获取管理员详情以更新权限信息
      if (currentAdmin.value?.id === adminId) {
        await fetchAdmin(adminId);
      }
    } catch (err) {
      console.error('撤销角色失败:', err);
      error.value = err instanceof Error ? err.message : '撤销角色失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const fetchStats = async () => {
    try {
      const statsData = await AdminService.getAdminStats();
      stats.value = statsData;
    } catch (err) {
      console.error('获取统计数据失败:', err);
    }
  };
  
  // 工具方法
  const setLoading = (loadingState: boolean) => {
    loading.value = loadingState;
  };
  
  const setError = (errorMessage: string | null) => {
    error.value = errorMessage;
  };
  
  const clearCurrentAdmin = () => {
    currentAdmin.value = null;
  };
  
  const reset = () => {
    admins.value = [];
    currentAdmin.value = null;
    roles.value = [];
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    };
    loading.value = false;
    error.value = null;
    stats.value = {
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
  };

  return {
    // 状态数据
    admins,
    currentAdmin,
    roles,
    pagination,
    loading,
    error,
    stats,
    
    // Actions
    fetchAdmins,
    fetchAdmin,
    fetchAdminDetail,
    createAdmin,
    updateAdmin,
    updateAdminStatus,
    deleteAdmin,
    batchUpdateStatus,
    batchDelete,
    bulkAction,
    
    // 角色权限相关
    fetchRoles,
    assignRole,
    assignPermissions,
    revokeRole,
    
    // 统计数据
    fetchStats,
    
    // 工具方法
    setLoading,
    setError,
    clearCurrentAdmin,
    reset
  };
}