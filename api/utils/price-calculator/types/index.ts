/**
 * 价格计算相关类型定义
 */

// 价格计算结果接口
export interface PriceCalculationResult {
  basePrice: number;
  finalPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  appliedRules: string[];
  calculationDetails: CalculationDetails;
}

// 计算详情
export interface CalculationDetails {
  packageInfo?: PackageInfo;
  botInfo?: BotInfo;
  agentInfo?: AgentInfo;
  discountRules?: DiscountRule[];
  fees?: Fee[];
  breakdown: PriceBreakdown;
}

// 价格分解
export interface PriceBreakdown {
  baseAmount: number;
  quantity: number;
  subtotal: number;
  discountAmount: number;
  feeAmount: number;
  taxAmount: number;
  total: number;
}

// 价格验证结果接口
export interface PriceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

// 价格历史记录接口
export interface PriceHistoryRecord {
  id: string;
  entityType: 'bot' | 'agent' | 'package' | 'template';
  entityId: string;
  oldPrice: number;
  newPrice: number;
  changeReason: string;
  changedBy: string;
  changedAt: Date;
  metadata?: Record<string, any>;
}

// 包信息
export interface PackageInfo {
  id: string;
  name: string;
  type: 'energy' | 'bandwidth';
  basePrice: number;
  minQuantity: number;
  maxQuantity: number;
  currency: string;
}

// 机器人信息
export interface BotInfo {
  id: string;
  name: string;
  type: string;
  multiplier: number;
  isActive: boolean;
}

// 代理商信息
export interface AgentInfo {
  id: string;
  name: string;
  level: string;
  commissionRate: number;
  discountRate: number;
}

// 折扣规则
export interface DiscountRule {
  id: string;
  name: string;
  type: 'volume' | 'user_level' | 'time_based' | 'promotional';
  condition: RuleCondition;
  discount: RuleDiscount;
  priority: number;
  isActive: boolean;
}

// 规则条件
export interface RuleCondition {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'in' | 'between';
  value: any;
}

// 规则折扣
export interface RuleDiscount {
  type: 'percentage' | 'fixed' | 'multiplier';
  value: number;
  maxAmount?: number;
}

// 费用
export interface Fee {
  id: string;
  name: string;
  type: 'processing' | 'service' | 'emergency' | 'platform';
  amount: number;
  isPercentage: boolean;
}

// 计算选项
export interface CalculationOptions {
  includeHistory?: boolean;
  validateInput?: boolean;
  applyPromotions?: boolean;
  currency?: string;
  roundingMode?: 'up' | 'down' | 'nearest';
  precision?: number;
}

// 计算输入
export interface CalculationInput {
  packageId?: string;
  botId?: string;
  agentId?: string;
  quantity: number;
  type: 'energy' | 'bandwidth';
  amount: number;
  userLevel?: string;
  isEmergency?: boolean;
  customRules?: DiscountRule[];
  options?: CalculationOptions;
}

// 验证选项
export interface ValidationOptions {
  checkLimits?: boolean;
  checkAvailability?: boolean;
  strictMode?: boolean;
}

// 历史查询选项
export interface HistoryQueryOptions {
  entityType?: string;
  entityId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  orderBy?: 'changedAt' | 'oldPrice' | 'newPrice';
  orderDirection?: 'asc' | 'desc';
}
