/**
 * 能量包模块类型定义
 * 
 * 定义了能量包相关的所有TypeScript接口和类型
 * 包括能量包信息、查询参数、请求体和响应格式
 */

// 能量包基础接口
export interface EnergyPackage {
  id: number;
  name: string;
  description?: string;
  energy_amount: number;
  price: number;
  duration_hours: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// 能量包查询参数接口
export interface EnergyPackageQuery {
  page?: number;
  limit?: number;
  is_active?: boolean;
  min_energy?: number;
  max_energy?: number;
  min_price?: number;
  max_price?: number;
  search?: string;
}

// 创建能量包请求接口
export interface CreateEnergyPackageRequest {
  name: string;
  description?: string;
  energy_amount: number;
  price: number;
  duration_hours?: number;
  is_active?: boolean;
}

// 更新能量包请求接口
export interface UpdateEnergyPackageRequest {
  name?: string;
  description?: string;
  energy_amount?: number;
  price?: number;
  duration_hours?: number;
}

// 能量包状态更新请求接口
export interface UpdatePackageStatusRequest {
  is_active: boolean;
}

// 批量价格更新接口
export interface BatchPriceUpdateRequest {
  updates: BatchPriceUpdateItem[];
}

export interface BatchPriceUpdateItem {
  id: number;
  price: number;
}

// 复制能量包请求接口
export interface DuplicatePackageRequest {
  name_suffix?: string;
}

// 能量包统计信息接口
export interface EnergyPackageStats {
  total_packages: number;
  active_packages: number;
  inactive_packages: number;
  average_price: number;
  min_price: number;
  max_price: number;
  average_energy: number;
  total_energy_available: number;
  new_packages_week: number;
  new_packages_month: number;
}

// 受欢迎的能量包接口
export interface PopularEnergyPackage {
  id: number;
  name: string;
  energy_amount: number;
  price: number;
  order_count: number;
  total_revenue: number;
}

// 能量包订单统计接口
export interface PackageOrderStats {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  orders_week: number;
  orders_month: number;
  total_revenue: number;
}

// 能量包详情扩展接口
export interface EnergyPackageWithStats extends EnergyPackage {
  stats: {
    orders: PackageOrderStats;
  };
}

// 分页查询结果接口
export interface PaginatedEnergyPackages {
  packages: EnergyPackage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 批量操作结果接口
export interface BatchOperationResult {
  results: BatchOperationItem[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

export interface BatchOperationItem {
  id: number;
  success: boolean;
  package?: EnergyPackage;
  error?: string;
}

// 能量包统计概览接口
export interface EnergyPackageOverview {
  stats: EnergyPackageStats;
  popular_packages: PopularEnergyPackage[];
}

// API响应包装接口
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// 数据库查询构建参数接口
export interface QueryBuilderParams {
  whereConditions: string[];
  queryParams: any[];
  paramIndex: number;
}

// 能量包验证结果接口
export interface PackageValidationResult {
  valid: boolean;
  errors: string[];
}

// 能量包存在性检查结果接口
export interface PackageExistenceCheck {
  exists: boolean;
  package?: EnergyPackage;
}

// 能量包名称冲突检查结果接口
export interface NameConflictCheck {
  hasConflict: boolean;
  conflictingId?: number;
}
