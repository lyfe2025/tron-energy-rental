export interface PriceStats {
  label: string
  value: string
  change?: string
  changeColor?: string
  icon: any
  iconColor: string
  bgColor: string
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
  templateId: string
  templateName: string
  oldPrice: number
  newPrice: number
  changeReason: string
  changedBy: string
  changedAt: string
}

export interface PricingFilters {
  type: 'all' | 'energy' | 'bandwidth' | 'mixed'
  status: 'all' | 'active' | 'inactive' | 'draft'
  searchQuery: string
  sortBy: 'name' | 'price' | 'usage' | 'updated'
  sortOrder: 'asc' | 'desc'
}

export interface PricingState {
  templates: PriceTemplate[]
  priceHistory: PriceHistory[]
  stats: {
    totalTemplates: number
    activeTemplates: number
    averagePrice: number
    priceChangeToday: number
  }
  filters: PricingFilters
  isLoading: boolean
  isSaving: boolean
  showTemplateModal: boolean
  selectedTemplate: PriceTemplate | null
  modalMode: 'create' | 'edit' | 'view'
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
  type: 'energy' | 'bandwidth'
  amount: number
  userLevel: 'regular' | 'premium' | 'vip'
  isEmergency: boolean
  templateId?: string
}
