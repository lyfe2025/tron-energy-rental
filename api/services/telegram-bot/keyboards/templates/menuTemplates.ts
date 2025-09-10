/**
 * 菜单模板
 * 定义各种标准菜单配置模板
 */
import type { InlineKeyboard } from '../../types/bot.types.js';

/**
 * 主菜单模板
 */
export const MAIN_MENU_TEMPLATE: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '🔋 购买能量', callback_data: 'buy_energy' },
      { text: '📋 我的订单', callback_data: 'my_orders' }
    ],
    [
      { text: '💰 账户余额', callback_data: 'check_balance' },
      { text: '❓ 帮助支持', callback_data: 'help_support' }
    ],
    [
      { text: '🔄 刷新菜单', callback_data: 'refresh_menu' }
    ]
  ]
};

/**
 * 服务选择菜单模板
 */
export const SERVICE_MENU_TEMPLATE: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '⚡ 能量闪租', callback_data: 'service_energy_flash' },
      { text: '📦 笔数套餐', callback_data: 'service_transaction_package' }
    ],
    [
      { text: '🔄 TRX闪兑', callback_data: 'service_trx_exchange' },
      { text: '📊 统计查询', callback_data: 'service_statistics' }
    ],
    [
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]
  ]
};

/**
 * 管理员菜单模板
 */
export const ADMIN_MENU_TEMPLATE: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '👥 用户管理', callback_data: 'admin_users' },
      { text: '📋 订单管理', callback_data: 'admin_orders' }
    ],
    [
      { text: '💰 价格配置', callback_data: 'admin_prices' },
      { text: '🤖 机器人配置', callback_data: 'admin_bots' }
    ],
    [
      { text: '📊 数据统计', callback_data: 'admin_stats' },
      { text: '⚙️ 系统设置', callback_data: 'admin_settings' }
    ],
    [
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]
  ]
};

/**
 * 代理菜单模板
 */
export const AGENT_MENU_TEMPLATE: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '🔋 购买能量', callback_data: 'buy_energy' },
      { text: '📋 我的订单', callback_data: 'my_orders' }
    ],
    [
      { text: '💰 账户余额', callback_data: 'check_balance' },
      { text: '📊 代理统计', callback_data: 'agent_stats' }
    ],
    [
      { text: '👥 下级管理', callback_data: 'agent_subordinates' },
      { text: '❓ 帮助支持', callback_data: 'help_support' }
    ],
    [
      { text: '🔄 刷新菜单', callback_data: 'refresh_menu' }
    ]
  ]
};

/**
 * 帮助菜单模板
 */
export const HELP_MENU_TEMPLATE: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '❓ 使用说明', callback_data: 'help_usage' },
      { text: '💡 常见问题', callback_data: 'help_faq' }
    ],
    [
      { text: '📞 联系客服', callback_data: 'help_contact' },
      { text: '🆘 问题反馈', callback_data: 'help_feedback' }
    ],
    [
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]
  ]
};

/**
 * 设置菜单模板
 */
export const SETTINGS_MENU_TEMPLATE: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '🌐 语言设置', callback_data: 'settings_language' },
      { text: '🔔 通知设置', callback_data: 'settings_notifications' }
    ],
    [
      { text: '🔐 安全设置', callback_data: 'settings_security' },
      { text: '💳 支付设置', callback_data: 'settings_payment' }
    ],
    [
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]
  ]
};

/**
 * 语言选择菜单模板
 */
export const LANGUAGE_MENU_TEMPLATE: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '🇨🇳 简体中文', callback_data: 'lang_zh_cn' },
      { text: '🇹🇼 繁體中文', callback_data: 'lang_zh_tw' }
    ],
    [
      { text: '🇺🇸 English', callback_data: 'lang_en' },
      { text: '🇯🇵 日本語', callback_data: 'lang_ja' }
    ],
    [
      { text: '🇰🇷 한국어', callback_data: 'lang_ko' },
      { text: '🇷🇺 Русский', callback_data: 'lang_ru' }
    ],
    [
      { text: '🔙 返回设置', callback_data: 'settings_menu' }
    ]
  ]
};

/**
 * 通知设置菜单模板
 */
export const NOTIFICATION_MENU_TEMPLATE: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '📧 订单通知', callback_data: 'notif_orders' },
      { text: '💰 余额通知', callback_data: 'notif_balance' }
    ],
    [
      { text: '🎯 营销通知', callback_data: 'notif_marketing' },
      { text: '🔔 系统通知', callback_data: 'notif_system' }
    ],
    [
      { text: '🔕 全部关闭', callback_data: 'notif_disable_all' },
      { text: '🔔 全部开启', callback_data: 'notif_enable_all' }
    ],
    [
      { text: '🔙 返回设置', callback_data: 'settings_menu' }
    ]
  ]
};

/**
 * 统计菜单模板
 */
export const STATS_MENU_TEMPLATE: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '📊 今日统计', callback_data: 'stats_today' },
      { text: '📈 本周统计', callback_data: 'stats_week' }
    ],
    [
      { text: '📉 本月统计', callback_data: 'stats_month' },
      { text: '📋 历史统计', callback_data: 'stats_history' }
    ],
    [
      { text: '💰 收入统计', callback_data: 'stats_revenue' },
      { text: '👥 用户统计', callback_data: 'stats_users' }
    ],
    [
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]
  ]
};

/**
 * 菜单配置预设
 */
export const MENU_PRESETS = {
  /** 简化菜单 - 适合新用户 */
  SIMPLE: {
    inline_keyboard: [
      [
        { text: '🔋 购买能量', callback_data: 'buy_energy' }
      ],
      [
        { text: '💰 查看余额', callback_data: 'check_balance' }
      ],
      [
        { text: '❓ 获取帮助', callback_data: 'help_support' }
      ]
    ]
  },

  /** 完整菜单 - 适合熟练用户 */
  FULL: MAIN_MENU_TEMPLATE,

  /** 专业菜单 - 适合代理商 */
  PROFESSIONAL: AGENT_MENU_TEMPLATE,

  /** 管理菜单 - 适合管理员 */
  MANAGEMENT: ADMIN_MENU_TEMPLATE
};

/**
 * 获取菜单模板
 */
export function getMenuTemplate(templateName: string): InlineKeyboard | null {
  const templates: Record<string, InlineKeyboard> = {
    'main': MAIN_MENU_TEMPLATE,
    'service': SERVICE_MENU_TEMPLATE,
    'admin': ADMIN_MENU_TEMPLATE,
    'agent': AGENT_MENU_TEMPLATE,
    'help': HELP_MENU_TEMPLATE,
    'settings': SETTINGS_MENU_TEMPLATE,
    'language': LANGUAGE_MENU_TEMPLATE,
    'notification': NOTIFICATION_MENU_TEMPLATE,
    'stats': STATS_MENU_TEMPLATE
  };

  return templates[templateName] || null;
}

/**
 * 获取预设菜单
 */
export function getMenuPreset(presetName: keyof typeof MENU_PRESETS): InlineKeyboard {
  return MENU_PRESETS[presetName];
}

/**
 * 菜单模板元数据
 */
export const MENU_METADATA = {
  main: {
    title: '🏠 主菜单',
    description: '请选择您需要的服务',
    level: 'primary'
  },
  service: {
    title: '🛍️ 服务选择',
    description: '选择您需要的服务类型',
    level: 'secondary'
  },
  admin: {
    title: '⚙️ 管理面板',
    description: '系统管理功能',
    level: 'admin'
  },
  agent: {
    title: '👥 代理面板',
    description: '代理商专用功能',
    level: 'agent'
  },
  help: {
    title: '❓ 帮助中心',
    description: '获取帮助和支持',
    level: 'secondary'
  },
  settings: {
    title: '⚙️ 设置中心',
    description: '个人设置和偏好',
    level: 'secondary'
  }
};
