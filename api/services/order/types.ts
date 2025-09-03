/**
 * 订单服务相关类型定义
 */

export interface CreateOrderRequest {
  userId: number;
  packageId: number;
  energyAmount: number;
  durationHours: number;
  priceTrx: number;
  recipientAddress: string;
}

export interface Order {
  id: number;
  user_id: number;
  package_id: number;
  energy_amount: number;
  duration_hours: number;
  price_trx: number;
  recipient_address: string;
  status: 'pending' | 'paid' | 'processing' | 'active' | 'completed' | 'failed' | 'cancelled' | 'expired';
  payment_address?: string;
  payment_amount?: number;
  payment_tx_hash?: string;
  delegation_tx_hash?: string;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface OrderStats {
  total: number;
  pending: number;
  paid: number;
  processing: number;
  active: number;
  completed: number;
  failed: number;
  cancelled: number;
  expired: number;
  totalRevenue: number;
  averageOrderValue: number;
}
