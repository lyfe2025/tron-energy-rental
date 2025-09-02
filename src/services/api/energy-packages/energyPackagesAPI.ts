/**
 * 能量包管理API
 */
import type { CreateEnergyPackageData, EnergyPackage, UpdateEnergyPackageData } from '../../../types/api';
import { apiClient } from '../core/apiClient';
import type { ApiResponse, PaginatedResponse, QueryParams } from '../core/types';

export interface EnergyPackageQueryParams extends QueryParams {
  is_active?: boolean
}

export const energyPackagesAPI = {
  /**
   * 获取能量包列表
   */
  getEnergyPackages: (params?: EnergyPackageQueryParams) => 
    apiClient.get<PaginatedResponse<EnergyPackage>>('/api/energy-packages', { params }),
  
  /**
   * 获取能量包详情
   */
  getEnergyPackage: (id: string) => 
    apiClient.get<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}`),
  
  /**
   * 创建能量包
   */
  createEnergyPackage: (data: CreateEnergyPackageData) => 
    apiClient.post<ApiResponse<EnergyPackage>>('/api/energy-packages', data),
  
  /**
   * 更新能量包
   */
  updateEnergyPackage: (id: string, data: UpdateEnergyPackageData) => 
    apiClient.put<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}`, data),
  
  /**
   * 更新能量包状态
   */
  updateEnergyPackageStatus: (id: string, is_active: boolean) => 
    apiClient.patch<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}/status`, { is_active }),
  
  /**
   * 删除能量包
   */
  deleteEnergyPackage: (id: string) => 
    apiClient.delete<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}`),
  
  /**
   * 批量更新能量包状态
   */
  batchUpdateStatus: (packageIds: string[], is_active: boolean) => 
    apiClient.post<ApiResponse<void>>('/api/energy-packages/batch/status', { packageIds, is_active }),

  /**
   * 复制能量包
   */
  duplicateEnergyPackage: (id: string, data?: { name?: string }) => 
    apiClient.post<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}/duplicate`, data),

  // 方法别名（为了兼容页面中的调用）
  createPackage: (data: CreateEnergyPackageData) => 
    apiClient.post<ApiResponse<EnergyPackage>>('/api/energy-packages', data),
  
  updatePackage: (id: string, data: UpdateEnergyPackageData) => 
    apiClient.put<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}`, data),
  
  deletePackage: (id: string) => 
    apiClient.delete<ApiResponse<EnergyPackage>>(`/api/energy-packages/${id}`)
};

export default energyPackagesAPI;
