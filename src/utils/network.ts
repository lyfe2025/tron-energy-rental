/**
 * 网络相关工具函数
 */

/**
 * 网络类型枚举
 */
export enum NetworkType {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  SHASTA = 'shasta',
  NILE = 'nile',
  PRIVATE = 'private'
}

/**
 * 网络类型中文映射
 */
export const NETWORK_TYPE_MAP: Record<string, string> = {
  mainnet: '主网',
  testnet: '测试网',
  shasta: 'Shasta测试网',
  nile: 'Nile测试网',
  private: '私有网络'
}

/**
 * 网络图标映射
 */
export const NETWORK_ICON_MAP: Record<string, string> = {
  mainnet: 'M',
  testnet: 'T',
  shasta: 'S',
  nile: 'N',
  private: 'P'
}

/**
 * 网络图标样式映射
 */
export const NETWORK_ICON_CLASS_MAP: Record<string, string> = {
  mainnet: 'bg-green-500',
  testnet: 'bg-blue-500',
  shasta: 'bg-purple-500',
  nile: 'bg-orange-500',
  private: 'bg-gray-500'
}

/**
 * 获取网络类型的中文显示名称
 * @param type 网络类型（英文）
 * @returns 中文显示名称
 */
export function getNetworkTypeText(type: string): string {
  const lowerType = type.toLowerCase()
  return NETWORK_TYPE_MAP[lowerType] || type
}

/**
 * 获取网络图标
 * @param type 网络类型
 * @returns 图标字符
 */
export function getNetworkIcon(type: string): string {
  const lowerType = type.toLowerCase()
  return NETWORK_ICON_MAP[lowerType] || 'N'
}

/**
 * 获取网络图标样式类
 * @param type 网络类型
 * @returns CSS类名
 */
export function getNetworkIconClass(type: string): string {
  const lowerType = type.toLowerCase()
  return NETWORK_ICON_CLASS_MAP[lowerType] || 'bg-gray-500'
}

/**
 * 获取网络状态的中文显示
 * @param isActive 是否活跃
 * @returns 状态文本
 */
export function getNetworkStatusText(isActive: boolean): string {
  return isActive ? '活跃' : '停用'
}

/**
 * 获取网络状态的样式类
 * @param isActive 是否活跃
 * @returns CSS类名
 */
export function getNetworkStatusClass(isActive: boolean): string {
  return isActive 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800'
}
