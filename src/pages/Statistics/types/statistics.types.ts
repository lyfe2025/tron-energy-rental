export interface StatisticsOverview {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  totalEnergyRented: number
  averageOrderValue: number
  conversionRate: number
  growthRate: number
  activeUsers: number
}

export interface RevenueData {
  date: string
  revenue: number
  orders: number
  energy: number
  bandwidth: number
}

export interface OrderStatusData {
  status: string
  count: number
  percentage: number
  color: string
}

export interface UserGrowthData {
  date: string
  newUsers: number
  totalUsers: number
  activeUsers: number
}

export interface EnergyUsageData {
  date: string
  energy: number
  bandwidth: number
  transactions: number
}

export interface TopUsersData {
  id: string
  username: string
  email: string
  totalSpent: number
  ordersCount: number
  lastOrderDate: string
}

export interface DateRange {
  start: string
  end: string
}

export interface StatisticsFilters {
  timeRange: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  dateRange?: DateRange
  category?: 'all' | 'energy' | 'bandwidth'
  userType?: 'all' | 'premium' | 'regular'
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area'
  title: string
  xAxis?: string
  yAxis?: string
  colors?: string[]
}

export interface StatisticsState {
  overview: StatisticsOverview
  revenueData: RevenueData[]
  orderStatusData: OrderStatusData[]
  userGrowthData: UserGrowthData[]
  energyUsageData: EnergyUsageData[]
  topUsersData: TopUsersData[]
  filters: StatisticsFilters
  isLoading: boolean
  lastUpdated: Date | null
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv'
  includeCharts: boolean
  dateRange: DateRange
  sections: string[]
}
