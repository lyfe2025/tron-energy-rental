/**
 * 代理商价格配置相关类型定义
 */

export interface AgentPricingConfig {
  id?: string;
  agent_id: string;
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

export interface AgentPricingQuery {
  page?: number;
  limit?: number;
  agent_id?: string;
  package_id?: string;
  status?: 'active' | 'inactive';
  search?: string;
  level?: string;
}

export interface AgentPricingWithDetails extends AgentPricingConfig {
  agent_name?: string;
  agent_level?: string;
  agent_status?: string;
  commission_rate?: number;
  package_name?: string;
  energy_amount?: number;
  duration_hours?: number;
  template_name?: string;
  template_base_price?: number;
  created_by_name?: string;
  calculated_price?: number;
  agent_price?: number;
  commission_amount?: number;
  discount_applied?: boolean;
  price_breakdown?: any;
}

export interface BatchConfigRequest {
  configs: AgentPricingConfig[];
  apply_to_level?: string;
}

export interface BatchOperationResult {
  successful: number;
  failed: number;
  results: Array<{
    index: number;
    agent_id: string;
    action: 'created' | 'updated';
    config: AgentPricingConfig;
  }>;
  errors: Array<{
    index: number;
    agent_id?: string;
    error: string;
  }>;
  applied_to_level?: string;
}

export interface AgentLevelStats {
  level: string;
  agent_count: number;
  config_count: number;
  avg_discount: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  recent_changes: number;
  examples: Array<{
    id: string;
    agent_name: string;
    commission_rate: number;
    config_count: number;
  }>;
}

export interface PriceCalculationResult {
  finalPrice: number;
  discount: number;
  breakdown: any;
}

export interface CreateAgentPricingRequest {
  agent_id: string;
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

export interface UpdateAgentPricingRequest {
  template_id?: string;
  price?: number;
  discount_percentage?: number;
  min_price?: number;
  max_price?: number;
  quantity_discounts?: QuantityDiscount[];
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface AgentPricingPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AgentPricingListResponse {
  configs: AgentPricingWithDetails[];
  pagination: AgentPricingPagination;
}
