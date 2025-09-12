/**
 * 手动同步相关类型定义
 */

// 同步选项接口
export interface SyncOptions {
  name: boolean
  description: boolean
  shortDescription: boolean
  commands: boolean
  workMode: boolean
  webhookUrl: boolean
  menuButton: boolean
  replyKeyboard: boolean
  inlineKeyboard: boolean
  keyboardType: boolean
  priceConfig: boolean
}

// 同步结果接口
export interface SyncResult {
  success: boolean
  hasPartialSuccess: boolean
  results: Record<string, boolean | null>
  errors?: string[]
  logs?: string[]
}

// 同步数据接口
export interface SyncData {
  options: SyncOptions
  formData: any
}

// Props 接口
export interface ManualSyncDialogProps {
  modelValue: boolean
  botData?: any | null
  currentFormData?: any | null
}

// Emits 接口
export interface ManualSyncDialogEmits {
  'update:modelValue': [value: boolean]
  'sync-success': [result?: any]
}

// 同步项目名称映射
export const SYNC_ITEM_NAMES: Record<string, string> = {
  name: '机器人名称',
  description: '机器人描述',
  shortDescription: '短描述',
  commands: '命令列表',
  workMode: '工作模式',
  webhookUrl: 'Webhook URL',
  menuButton: '菜单按钮',
  replyKeyboard: '回复键盘',
  inlineKeyboard: '内嵌键盘',
  keyboardType: '键盘类型验证',
  priceConfig: '价格配置验证'
}
