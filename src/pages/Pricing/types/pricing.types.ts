export interface PriceStats {
  label: string
  value: string
  change?: string
  changeColor?: string
  icon: any
  iconColor: string
  bgColor: string
}

// 价格策略相关类型
export interface PricingStrategy {
  id: string
  name: string
  description: string
  resourceType: 'energy' | 'bandwidth' | 'mixed'
  priority: number
  status: 'active' | 'inactive' | 'draft'
  effectiveFrom: string
  effectiveTo?: string
  conditions: StrategyCondition[]
  actions: StrategyAction[]
  createdAt: string
  updatedAt: string
  createdBy: string
  usageCount: number
}

export interface StrategyCondition {
  id: string
  type: 'amount_range' | 'user_level' | 'time_range' | 'emergency' | 'custom'
  operator: 'gte' | 'lte' | 'eq' | 'between' | 'in'
  value: any
  unit?: string
  description: string
}

export interface StrategyAction {
  id: string
  type: 'price_multiply' | 'price_add' | 'price_set' | 'discount' | 'fee'
  value: number
  unit?: string
  description: string
}

// 定价模式相关类型
export interface PricingMode {
  id: string
  name: string
  description: string
  type: 'fixed' | 'dynamic' | 'tiered' | 'auction'
  config: PricingModeConfig
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface PricingModeConfig {
  basePrice?: number
  currency?: string
  tiers?: PricingTier[]
  dynamicFactors?: DynamicFactor[]
  auctionSettings?: AuctionSettings
}

export interface PricingTier {
  id: string
  minAmount: number
  maxAmount?: number
  price: number
  description: string
}

export interface DynamicFactor {
  id: string
  name: string
  type: 'supply_demand' | 'time_based' | 'market_price' | 'custom'
  weight: number
  config: any
}

export interface AuctionSettings {
  startPrice: number
  reservePrice?: number
  duration: number
  bidIncrement: number
}

export interface PriceTemplate {
  id: string
  name: string
  description: string
  type: 'energy' | 'bandwidth' | 'mixed'
  basePrice: number
  currency: string
  rules: PriceRule[]
  status: 'active' | 'inactive' | 'draft'
  createdAt: string
  updatedAt: string
  usageCount: number
}

export interface PriceRule {
  id: string
  type: 'volume' | 'time' | 'user_level' | 'emergency'
  condition: {
    operator: 'gte' | 'lte' | 'eq' | 'between'
    value: number | number[]
    unit?: string
  }
  action: {
    type: 'multiply' | 'add' | 'subtract' | 'set'
    value: number
  }
  description: string
  enabled: boolean
}

export interface PriceCalculation {
  baseAmount: number
  basePrice: number
  subtotal: number
  discounts: PriceAdjustment[]
  fees: PriceAdjustment[]
  total: number
  currency: string
}

export interface PriceAdjustment {
  id: string
  name: string
  type: 'discount' | 'fee'
  amount: number
  percentage?: number
  description: string
}

export interface PriceHistory {
  id: string
  resourceType: 'energy' | 'bandwidth' | 'mixed'
  action: 'purchase' | 'rental' | 'refund' | 'adjustment'
  amount: number
  price: number
  currency: string
  strategyId?: string
  strategyName?: string
  modeId?: string
  modeName?: string
  userId: string
  userName?: string
  createdAt: string
  metadata?: any
}

export interface PricingFilters {
  type: 'all' | 'energy' | 'bandwidth' | 'mixed'
  status: 'all' | 'active' | 'inactive' | 'draft'
  searchQuery: string
  sortBy: 'name' | 'price' | 'usage' | 'updated'
  sortOrder: 'asc' | 'desc'
}

export interface PricingState {
  strategies: PricingStrategy[]
  pricingModes: PricingMode[]
  templates: PriceTemplate[]
  priceHistory: PriceHistory[]
  stats: {
    totalStrategies: number
    activeStrategies: number
    totalModes: number
    enabledModes: number
    totalTemplates: number
    activeTemplates: number
    averagePrice: number
    priceChangeToday: number
  }
  filters: PricingFilters
  isLoading: boolean
  isSaving: boolean
}

export interface TemplateForm {
  name: string
  description: string
  type: PriceTemplate['type']
  basePrice: number
  currency: string
  rules: PriceRule[]
}

export interface PriceCalculatorInput {
  resourceType: 'energy' | 'bandwidth'
  amount: number
  userLevel: 'regular' | 'premium' | 'vip'
  isEmergency: boolean
  strategyId?: string
  pricingModeId?: string
}
