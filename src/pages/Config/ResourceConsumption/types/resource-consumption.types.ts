/**
 * 资源消耗配置相关类型定义
 */

// 预设值接口
export interface PresetValue {
  name: string
  value: number
}

// 能量消耗配置
export interface EnergyConfig {
  // USDT转账能量消耗
  usdt_standard_energy: number          // 标准USDT转账能量消耗
  usdt_buffer_percentage: number        // 安全缓冲百分比
  usdt_max_energy: number               // 最大能量上限
  
  // 价格配置
  energy_price_trx_ratio: number        // 能量-TRX兑换比例
  
  // 优化设置
  auto_optimize: boolean                // 自动优化
  preset_values: PresetValue[]          // 预设值
}

// 带宽消耗配置
export interface BandwidthConfig {
  // 转账带宽消耗
  trx_transfer_bandwidth: number        // TRX转账带宽消耗
  trc10_transfer_bandwidth: number      // TRC10转账带宽消耗
  trc20_transfer_bandwidth: number      // TRC20转账带宽消耗
  
  // 特殊操作
  account_create_bandwidth: number      // 账户创建带宽消耗
  
  // 安全配置
  buffer_percentage: number             // 安全缓冲百分比
  max_bandwidth_limit: number           // 最大带宽上限
  
  // 预设值
  preset_values: PresetValue[]          // 预设值
}



// 能量计算结果
export interface EnergyCalculation {
  estimated_energy: number              // 预估能量消耗
  max_energy: number                    // 最大能量消耗
  trx_cost: number                      // TRX成本
  usd_cost: number                      // USD成本
  confidence: number                    // 置信度 (0-1)
}

// 网络状态
export interface NetworkStatus {
  network: 'mainnet' | 'nile' | 'shasta'
  status: 'online' | 'offline' | 'degraded'
  block_height: number
  tps: number                           // 每秒交易数
  energy_price: number
  bandwidth_price: number
  last_check: Date
}

// 配置历史记录
export interface ConfigHistory {
  id: string
  config_type: 'energy'
  changes: Record<string, any>
  operator: string
  operation: 'create' | 'update' | 'delete'
  created_at: Date
  rollback_data?: Record<string, any>
}

// API响应类型
export interface ConfigResponse<T> {
  success: boolean
  data: T
  message: string
  timestamp: Date
}

// 批量配置更新
export interface BatchConfigUpdate {
  energy?: Partial<EnergyConfig>
}

// 配置验证规则
export interface ConfigValidationRule {
  field: string
  rules: {
    required?: boolean
    min?: number
    max?: number
    type?: 'number' | 'boolean' | 'string'
    custom?: (value: any) => boolean | string
  }[]
}

// 导出配置
export interface ConfigExport {
  version: string
  exported_at: Date
  configs: {
    energy: EnergyConfig
  }
  metadata: {
    environment: string
    operator: string
  }
}
