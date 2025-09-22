export interface PaymentMonitorConfig {
  checkInterval: number; // 检查间隔（毫秒）
  timeout: number; // 超时时间（毫秒）
  minConfirmations: number; // 最小确认数
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  txid?: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  confirmations: number;
  createdAt: string;
  confirmedAt?: string;
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  factors: string[];
  recommendation: 'approve' | 'review' | 'reject';
}

export interface PaymentCheckResult {
  found: boolean;
  txid?: string;
  amount?: number;
  confirmations?: number;
}

export interface PaymentStatistics {
  total: number;
  confirmed: number;
  pending: number;
  failed: number;
  expired: number;
  totalAmount: number;
  confirmedAmount: number;
  successRate: number;
}

export interface RecentOrder {
  id: string;
  created_at: string;
}

export interface PaymentStatusResult {
  status: string;
  txid?: string;
  amount?: number;
  confirmations?: number;
  created_at?: string;
  confirmed_at?: string;
  message?: string;
}

export interface UserStats {
  total_orders: number;
  failed_orders: number;
}
