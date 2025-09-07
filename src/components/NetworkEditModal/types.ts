export interface ContractAddress {
  symbol: string
  name: string
  address: string
  decimals: number
  type: string
  is_active: boolean
  description?: string
  source?: string
}

export interface BasicNetworkFormData {
  name: string
  chain_id: string
  network_type: 'mainnet' | 'testnet' | 'private'
  is_active: boolean
}

export interface ConnectionConfigData {
  rpc_url: string
  api_key: string
  timeout_ms: number
  retry_count: number
  priority: number
}

export interface AdvancedConfigData {
  explorer_url: string
  health_check_url: string
  rate_limit: number
  is_default: boolean
}

export interface NetworkFormData extends BasicNetworkFormData, ConnectionConfigData, AdvancedConfigData {
  description: string
}

export interface TestResult {
  success: boolean
  response_time_ms?: number
  network_name?: string
  status?: string
  error?: string
}
