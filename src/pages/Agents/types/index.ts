/**
 * 代理商管理模块类型定义
 */

// 代理商基本信息 - 匹配后端返回的数据结构
export interface Agent {
  id: string;
  agent_code: string;
  user_id: string;
  commission_rate: number;
  status: 'pending' | 'active' | 'suspended' | 'rejected' | 'inactive';
  created_at: string;
  updated_at: string;
  // 嵌套的用户信息对象
  user: {
    id: string;
    username: string | null;
    email: string | null;
    phone: string | null;
    telegram_id: string | null;
  };
  // 嵌套的统计信息对象
  stats: {
    total_users: number;
    active_users: number;
    total_commission: number;
  };
  // 可选的扩展字段（用于兼容性）
  user_count?: number;
  pricing?: AgentPricing[];
  agent_level?: number;
  max_discount_rate?: number;
  credit_limit?: number;
  used_credit?: number;
  company_name?: string;
  contact_person?: string;
  address?: string;
  notes?: string;
  last_login_at?: string;
  total_revenue?: number;
  managed_users?: number;
  total_earnings?: number;
  total_orders?: number;
  total_customers?: number;
  // 机器人关联
  bot_id?: string;
  bot_name?: string;
  bot_username?: string;
  // 便利属性（从嵌套对象中提取）
  username?: string;
  email?: string;
  phone?: string;
  telegram_id?: string;
}

// 代理商定价配置
export interface AgentPricing {
  id: string;
  agent_id: string;
  energy_type: string;
  purchase_price: number;
  selling_price: number;
  created_at: string;
  updated_at: string;
}

// 代理商价格配置（新版）
export interface AgentPricingConfig {
  id?: string;
  agent_id: string;
  price_config_id?: number;  // 替换package_id为price_config_id，关联price_configs表
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
  // 添加缺失的属性
  // energy_package_id已移除，使用price_config_id
  agent_price?: number;
  discount_rate?: number;
  is_active?: boolean;
}

export interface QuantityDiscount {
  min_quantity: number;
  max_quantity?: number;
  discount_percentage: number;
  discount_rate?: number; // 添加缺失的属性
}

// 代理商价格配置详情
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

// 代理商查询参数
export interface AgentQuery {
  page?: number;
  limit?: number;
  status?: 'pending' | 'active' | 'suspended' | 'rejected';
  search?: string;
  // 添加缺失的查询参数
  agent_level?: number;
  commission_min?: number;
  commission_max?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// 代理商价格配置查询参数
export interface AgentPricingQuery {
  page?: number;
  limit?: number;
  agent_id?: string;
  package_id?: string;
  status?: 'active' | 'inactive';
  search?: string;
  level?: string;
}

// 创建代理商请求
export interface CreateAgentRequest {
  username: string;
  email: string;
  phone?: string;
  status?: 'pending' | 'active' | 'suspended' | 'rejected';
  agent_level?: number;
  commission_rate?: number;
  max_discount_rate?: number;
  credit_limit?: number;
  company_name?: string;
  contact_person?: string;
  address?: string;
  notes?: string;
  bot_id?: string;
}

// 更新代理商请求
export interface UpdateAgentRequest {
  username?: string;
  email?: string;
  phone?: string;
  status?: 'pending' | 'active' | 'suspended' | 'rejected';
  agent_level?: number;
  commission_rate?: number;
  max_discount_rate?: number;
  credit_limit?: number;
  company_name?: string;
  contact_person?: string;
  address?: string;
  notes?: string;
  bot_id?: string;
}

// 批量配置请求
export interface BatchConfigRequest {
  agent_id?: string;
  configs: AgentPricingConfig[];
  apply_to_level?: string;
}

// 批量操作结果
export interface BatchOperationResult {
  success: boolean;
  message?: string;
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

// 代理商等级统计
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

// 分页信息
export interface AgentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API响应类型
export interface AgentListResponse {
  success: boolean;
  message: string;
  data: {
    agents: Agent[];
    pagination: AgentPagination;
  };
}

export interface AgentDetailResponse {
  success: boolean;
  message: string;
  data: {
    agent: Agent;
  };
}

export interface AgentPricingListResponse {
  success: boolean;
  message: string;
  data: {
    configs: AgentPricingWithDetails[];
    pagination: AgentPagination;
  };
}

// 代理商状态选项
export const AGENT_STATUS_OPTIONS = [
  { value: 'pending', label: '待审核', color: 'orange' },
  { value: 'active', label: '活跃', color: 'green' },
  { value: 'suspended', label: '暂停', color: 'red' },
  { value: 'rejected', label: '已拒绝', color: 'gray' }
] as const;

// 代理商状态类型
export type AgentStatus = typeof AGENT_STATUS_OPTIONS[number]['value'];

// 统计卡片接口
export interface StatCard {
  label: string;
  value: string | number;
  icon: any; // 修复icon类型，支持Vue组件
  bgColor: string;
  iconColor: string;
}