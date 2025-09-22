/**
 * 订单管理服务相关类型定义
 */

// 重新导出现有的类型，保持向后兼容
export type { CreateOrderRequest, Order, OrderStats } from '../order/types.js';

// 闪租订单特有类型
export interface FlashRentConfig {
  price_per_unit: number;
  energy_per_unit: number;
  max_units: number;
  payment_address: string;
  expiry_hours: number;
  single_price?: number; // 兼容字段
  max_amount?: number;   // 兼容字段
}

export interface OrderCalculationResult {
  calculatedUnits: number;
  totalEnergy: number;
  isValid: boolean;
  reason?: string;
}

export interface FlashRentOrderParams {
  fromAddress: string;
  trxAmount: number;
  networkId: string;
  txId: string;
  existingOrderId?: string;
}

export interface OrderUpdateDetails {
  step: string;
  config?: any;
  calculation?: any;
  delegation_info?: any;
  error_info?: any;
  updated_at?: string;
  [key: string]: any;
}
