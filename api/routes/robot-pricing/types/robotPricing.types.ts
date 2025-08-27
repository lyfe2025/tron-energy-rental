/**
 * 机器人价格配置相关类型定义
 */

export interface RobotPricingConfig {
  id?: string;
  bot_id: string;
  package_id: string;
  template_id?: string;
  price?: number;
  discount_percentage?: number;
  min_price?: number;
  max_price?: number;
  quantity_discounts?: QuantityDiscount[];
  status: 'active' | 'inactive';
  notes?: string;
  created_by?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface QuantityDiscount {
  min_quantity: number;
  max_quantity?: number;
  discount_percentage: number;
}

export interface RobotPricingQuery {
  page?: number;
  limit?: number;
  bot_id?: string;
  package_id?: string;
  status?: 'active' | 'inactive';
  search?: string;
}

export interface RobotPricingWithDetails extends RobotPricingConfig {
  bot_name?: string;
  bot_type?: string;
  bot_status?: string;
  package_name?: string;
  energy_amount?: number;
  duration_hours?: number;
  template_name?: string;
  template_base_price?: number;
  created_by_name?: string;
  calculated_price?: number;
  discount_applied?: boolean;
  price_breakdown?: any;
}

export interface BatchConfigRequest {
  configs: RobotPricingConfig[];
}

export interface BatchOperationResult {
  successful: number;
  failed: number;
  results: Array<{
    index: number;
    action: 'created' | 'updated';
    config: RobotPricingConfig;
  }>;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

export interface PriceCalculationResult {
  finalPrice: number;
  discount: number;
  breakdown: any;
}

export interface CreateRobotPricingRequest {
  bot_id: string;
  package_id: string;
  template_id?: string;
  price?: number;
  discount_percentage?: number;
  min_price?: number;
  max_price?: number;
  quantity_discounts?: QuantityDiscount[];
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface UpdateRobotPricingRequest {
  template_id?: string;
  price?: number;
  discount_percentage?: number;
  min_price?: number;
  max_price?: number;
  quantity_discounts?: QuantityDiscount[];
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface RobotPricingPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface RobotPricingListResponse {
  configs: RobotPricingWithDetails[];
  pagination: RobotPricingPagination;
}

export interface CopyConfigRequest {
  target_bot_ids: string[];
  target_package_ids?: string[];
}

export interface CopyConfigResult {
  successful: number;
  failed: number;
  results: Array<{
    bot_id: string;
    package_id: string;
    config: RobotPricingConfig;
  }>;
  errors: Array<{
    bot_id: string;
    package_id: string;
    error: string;
  }>;
}
