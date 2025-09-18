/**
 * 资源消耗配置相关类型定义
 */

// 预设值接口
export interface PresetValue {
  name: string
  value: number
}

// 验证规则接口
export interface ValidationRule {
  min: number
  max: number
}

// 能量消耗配置
export interface EnergyConfig {
  // USDT转账能量消耗
  usdt_standard_energy: number          // 标准USDT转账能量消耗
  usdt_buffer_percentage: number        // 安全缓冲百分比
  usdt_max_energy: number               // 最大能量上限
  
  // 预设值
  preset_values: PresetValue[]          // 预设值
  
  // 验证规则
  validation_rules?: Record<string, ValidationRule>  // 配置项验证规则
}

// 带宽消耗配置
export interface BandwidthConfig {
  // 转账带宽消耗
  trx_transfer_bandwidth: number        // TRX转账带宽消耗
  trc20_transfer_bandwidth: number      // TRC20转账带宽消耗
  
  // 特殊操作
  account_create_bandwidth: number      // 账户创建带宽消耗
  
  // 安全配置
  buffer_percentage: number             // 安全缓冲百分比
  max_bandwidth_limit: number           // 最大带宽上限
  
  // 预设值
  preset_values: PresetValue[]          // 预设值
  
  // 验证规则
  validation_rules?: Record<string, ValidationRule>  // 配置项验证规则
}