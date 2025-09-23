/**
 * 能量闪租相关类型定义
 */

export interface FlashRentTransaction {
  txID: string;
  from: string;
  to: string;
  amount: number;
  confirmed: boolean;
  timestamp: number;
  _existingOrderId?: string;
  _existingOrderNumber?: string;
  _isInitialCreation?: boolean;
  _isOrderUpdate?: boolean;
  _orderNumber?: string;
  _updateType?: string;
  _failureReason?: string;
}

export interface ExistingOrder {
  id: string;
  order_number: string;
  status: string;
}

export interface OrderCalculation {
  calculatedUnits: number;
  totalEnergy: number;
  orderPrice: number;
  singlePrice: number;
  energyPerUnit: number;
}

export interface FlashRentConfig {
  single_price?: number;
  price_per_unit?: number;
  energy_per_unit?: number;
  max_amount?: number;
  max_transactions?: number;
  expiry_hours?: number;
  payment_address?: string;
}

export interface EnergyConfig {
  standard_energy: number;
  buffer_percentage: number;
}

export interface ProcessingLockResult {
  success: boolean;
  lockKey: string;
  lockValue?: string;
}
