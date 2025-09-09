/**
 * 机器人键盘配置模块
 * 负责默认键盘配置的管理
 */
import type { KeyboardConfig } from './botTypes'

/**
 * 获取默认键盘配置
 */
export const getDefaultKeyboardConfig = (): KeyboardConfig => ({
  main_menu: {
    type: 'inline',
    title: 'TRON资源租赁主菜单',
    description: '选择您需要的服务',
    is_enabled: true,
    rows: [
      {
        is_enabled: true,
        buttons: [
          {
            text: '⚡ 能量闪租',
            callback_data: 'energy_flash',
            is_enabled: true,
            price_config_dependency: 'energy_flash'
          },
          {
            text: '🔥 笔数套餐',
            callback_data: 'transaction_package',
            is_enabled: true,
            price_config_dependency: 'transaction_package'
          }
        ]
      },
      {
        is_enabled: true,
        buttons: [
          {
            text: '🔄 TRX闪兑',
            callback_data: 'trx_exchange',
            is_enabled: true,
            price_config_dependency: 'trx_exchange'
          }
        ]
      },
      {
        is_enabled: true,
        buttons: [
          {
            text: '📋 我的订单',
            callback_data: 'my_orders',
            is_enabled: true,
            price_config_dependency: undefined
          },
          {
            text: '💰 账户余额',
            callback_data: 'check_balance',
            is_enabled: true,
            price_config_dependency: undefined
          }
        ]
      },
      {
        is_enabled: true,
        buttons: [
          {
            text: '❓ 帮助支持',
            callback_data: 'help_support',
            is_enabled: true,
            price_config_dependency: undefined
          },
          {
            text: '🔄 刷新菜单',
            callback_data: 'refresh_menu',
            is_enabled: true,
            price_config_dependency: undefined
          }
        ]
      }
    ]
  },
  inline_keyboards: {},
  reply_keyboards: {},
  quick_actions: []
})

/**
 * 验证键盘配置的有效性
 */
export const validateKeyboardConfig = (config: KeyboardConfig): boolean => {
  try {
    // 检查主菜单是否存在
    if (!config.main_menu) {
      return false
    }

    // 检查主菜单的基本属性
    if (!config.main_menu.title || !config.main_menu.type) {
      return false
    }

    // 检查行配置
    if (!Array.isArray(config.main_menu.rows)) {
      return false
    }

    // 检查每行的按钮配置
    for (const row of config.main_menu.rows) {
      if (!Array.isArray(row.buttons)) {
        return false
      }

      for (const button of row.buttons) {
        if (!button.text || !button.callback_data) {
          return false
        }
      }
    }

    return true
  } catch (error) {
    console.error('键盘配置验证失败:', error)
    return false
  }
}

/**
 * 获取启用的按钮数量
 */
export const getEnabledButtonsCount = (config: KeyboardConfig): number => {
  if (!config.main_menu || !config.main_menu.rows) {
    return 0
  }

  let count = 0
  for (const row of config.main_menu.rows) {
    if (row.is_enabled) {
      for (const button of row.buttons) {
        if (button.is_enabled) {
          count++
        }
      }
    }
  }

  return count
}

/**
 * 克隆键盘配置（深拷贝）
 */
export const cloneKeyboardConfig = (config: KeyboardConfig): KeyboardConfig => {
  return JSON.parse(JSON.stringify(config))
}
