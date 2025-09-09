/**
 * 机器人管理相关的类型定义
 */

// 机器人网络接口
export interface BotNetwork {
  id: string
  name: string
  chain_id: string
}

// 当前网络接口
export interface CurrentNetwork {
  id: string
  name: string
  type: string
  chain_id: string
  status: string
  rpc_url: string
  is_primary: boolean
  created_at?: string
  updated_at?: string
}

// 机器人配置接口
export interface BotConfig {
  id: string
  name: string
  username: string
  token: string
  is_active: boolean
  description?: string
  short_description?: string
  network_id?: string
  networks?: BotNetwork[]
  current_network?: CurrentNetwork | null
  template?: string
  created_at: string
  updated_at: string
  updating?: boolean
  showMenu?: boolean
  total_users?: number
  total_orders?: number
}

// 网络接口
export interface Network {
  id: string
  name: string
  chain_id: string
}

// 搜索表单接口
export interface SearchForm {
  keyword: string
  status: string
  network: string
  template: string
}

// 确认弹窗配置接口
export interface ConfirmDialogConfig {
  title: string
  message: string
  details: string
  warning: string
  type: 'info' | 'success' | 'warning' | 'danger'
  confirmText: string
  cancelText: string
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

// 键盘按钮接口
export interface KeyboardButton {
  text: string
  callback_data: string
  is_enabled: boolean
  price_config_dependency?: string
}

// 键盘行接口
export interface KeyboardRow {
  is_enabled: boolean
  buttons: KeyboardButton[]
}

// 主菜单配置接口
export interface MainMenuConfig {
  type: string
  title: string
  description: string
  is_enabled: boolean
  rows: KeyboardRow[]
}

// 键盘配置接口
export interface KeyboardConfig {
  main_menu: MainMenuConfig
  inline_keyboards: Record<string, any>
  reply_keyboards: Record<string, any>
  quick_actions: any[]
}
