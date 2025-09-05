export interface TronNetwork {
  id: string
  name: string
  network_type: 'mainnet' | 'testnet' | 'private'
  rpc_url: string
  chain_id?: number  // 数据库中是integer类型
  block_explorer_url?: string  // 数据库中的字段名
  api_key?: string
  is_active: boolean
  is_default: boolean
  priority: number
  timeout_ms: number
  retry_count: number
  rate_limit_per_second: number  // 数据库中的字段名
  config?: {
    contract_addresses?: {
      [symbol: string]: {
        address: string
        symbol: string
        name: string
        decimals: number
        type: string
        is_active: boolean
        description?: string
        source?: string
        added_at?: string
      }
    }
    [key: string]: any
  }  // 数据库中的jsonb字段
  health_check_url?: string  // 数据库中的字段名
  last_health_check?: string  // 数据库中的字段名
  health_status: 'unknown' | 'healthy' | 'unhealthy' | 'error'
  description?: string
  created_by?: string
  created_at: string
  updated_at: string
  // 兼容旧字段
  type?: 'mainnet' | 'testnet' | 'private'  // 映射到network_type
  explorer_url?: string  // 映射到block_explorer_url
  rate_limit?: number  // 映射到rate_limit_per_second
  network_name?: string
  display_name?: string
  full_host?: string
  solidity_node?: string
  event_server?: string
  block_time?: number
  energy_price?: number
  bandwidth_price?: number
  contracts?: Record<string, string>
  is_testnet?: boolean
}

export interface NetworkCreateRequest {
  name: string
  network_type: 'mainnet' | 'testnet' | 'private'
  rpc_url: string
  api_key?: string
  chain_id?: number
  block_explorer_url?: string
  description?: string
  is_active?: boolean
  is_default?: boolean
  priority?: number
  timeout_ms?: number
  retry_count?: number
  rate_limit_per_second?: number
  config?: Record<string, any>
  health_check_url?: string
  // 兼容旧字段
  network_name?: string
  display_name?: string
  full_host?: string
  solidity_node?: string
  event_server?: string
  is_testnet?: boolean
  contracts?: Record<string, string>
}

export interface NetworkUpdateRequest extends Partial<NetworkCreateRequest> {
  id?: string
}

export interface NetworkTestResult {
  network_id: string
  network_name: string
  status: 'healthy' | 'unhealthy'
  response_time_ms: number
  block_height?: number
  error_message?: string
  test_time: string
  // 兼容旧字段
  success?: boolean
  message?: string
  latency?: number
}

export interface NetworkStats {
  connected_bots: number
  energy_pools: number
  daily_transactions: number
}