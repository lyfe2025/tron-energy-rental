/**
 * 订单服务相关类型定义
 */

export interface CreateOrderRequest {
  userId: string;  // UUID类型
  priceConfigId: number;  // 替换packageId为priceConfigId，关联price_configs表
  energyAmount: number;
  durationHours: number;
  price: number;  // 订单价格（TRX）
  targetAddress: string;  // 目标地址
}

export interface Order {
  id: string;  // UUID类型
  order_number: string;
  user_id: string;  // UUID类型
  price_config_id?: number;  // 替换package_id为price_config_id，关联price_configs表
  energy_amount: number;
  duration_hours?: number;   // 可选，因为闪租订单可能不需要
  price: number;  // 订单价格（TRX）
  target_address: string;  // 目标地址
  status: 'pending' | 'paid' | 'processing' | 'active' | 'completed' | 'manually_completed' | 'failed' | 'cancelled' | 'expired' | 'pending_delegation';
  payment_status?: 'unpaid' | 'paid' | 'refunded'; // 支付状态，与数据库约束一致
  payment_address?: string;
  payment_amount?: number;
  payment_tx_hash?: string;
  delegation_tx_hash?: string;
  calculated_units?: number;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
  // 新增字段，与数据库结构保持一致
  network_id: string;        // 网络ID
  order_type?: 'energy_flash' | 'transaction_package' | 'trx_exchange';  // 订单类型：能量闪租、笔数套餐、TRX闪兑
  payment_trx_amount?: number;   // 支付的TRX数量
  delegated_energy_amount?: number;  // 已委托的能量数量
  delegate_tx_hash?: string;     // 委托交易哈希（与前端字段名保持一致）
  source_address?: string;       // 支付来源地址
  flash_rent_duration?: number;  // 闪租持续时间（小时）
  energy_pool_account_used?: string;  // 使用的能量池账户
  error_message?: string;        // 错误信息
  processing_details?: object;   // 处理详情（JSON）
  retry_count?: number;          // 重试次数
  processing_started_at?: Date;  // 处理开始时间
  delegation_started_at?: Date;  // 委托开始时间
  // 笔数套餐相关字段
  transaction_count?: number;    // 交易笔数
  used_transactions?: number;    // 已使用交易笔数
  remaining_transactions?: number; // 剩余交易笔数
  last_energy_usage_time?: Date; // 最后能量使用时间
  next_delegation_time?: Date;   // 下次代理时间
  daily_fee_last_check?: Date;   // 占费最后检查时间
  payment_currency: 'USDT' | 'TRX'; // 支付货币类型（必填）
}

export interface OrderStats {
  total: number;
  pending: number;
  paid: number;
  processing: number;
  active: number;
  completed: number;
  manually_completed: number;
  failed: number;
  cancelled: number;
  expired: number;
  totalRevenue: number;
  averageOrderValue: number;
}
