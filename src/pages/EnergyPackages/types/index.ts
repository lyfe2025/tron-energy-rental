// 能量包相关类型定义

export interface EnergyPackageStats {
  total: number
  active: number
  today_sales: number
  total_sales: number
}

export interface EnergyPackageForm {
  id?: string
  name: string
  type: 'energy' | 'bandwidth' | 'mixed'
  description: string
  energy_amount: number
  bandwidth_amount: number
  price: number
  original_price: number
  discount_percentage: number
  status: 'active' | 'inactive'
}

export interface EnergyPackageFilters {
  searchQuery: string
  statusFilter: 'all' | 'active' | 'inactive'
  typeFilter: 'all' | 'energy' | 'bandwidth' | 'mixed'
}

export interface EnergyPackagePagination {
  currentPage: number
  pageSize: number
  totalPages: number
}

export type ModalMode = 'view' | 'edit' | 'create'

export type PackageType = 'energy' | 'bandwidth' | 'mixed'
export type PackageStatus = 'active' | 'inactive'