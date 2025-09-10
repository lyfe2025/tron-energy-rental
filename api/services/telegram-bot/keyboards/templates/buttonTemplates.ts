/**
 * 按钮模板
 * 定义各种标准按钮配置模板
 */
import TelegramBot from 'node-telegram-bot-api';

/**
 * 通用按钮模板
 */
export const COMMON_BUTTONS = {
  // 导航按钮
  BACK_TO_MENU: { text: '🔙 返回主菜单', callback_data: 'refresh_menu' },
  BACK: { text: '🔙 返回', callback_data: 'back' },
  CANCEL: { text: '❌ 取消', callback_data: 'cancel' },
  REFRESH: { text: '🔄 刷新', callback_data: 'refresh' },

  // 确认按钮
  CONFIRM: { text: '✅ 确认', callback_data: 'confirm' },
  YES: { text: '✅ 是', callback_data: 'yes' },
  NO: { text: '❌ 否', callback_data: 'no' },

  // 操作按钮
  EDIT: { text: '✏️ 编辑', callback_data: 'edit' },
  DELETE: { text: '🗑️ 删除', callback_data: 'delete' },
  VIEW: { text: '👁️ 查看', callback_data: 'view' },
  DOWNLOAD: { text: '📥 下载', callback_data: 'download' },

  // 分页按钮
  PREV_PAGE: { text: '⬅️ 上一页', callback_data: 'prev_page' },
  NEXT_PAGE: { text: '下一页 ➡️', callback_data: 'next_page' },
  FIRST_PAGE: { text: '⏮️ 首页', callback_data: 'first_page' },
  LAST_PAGE: { text: '⏭️ 末页', callback_data: 'last_page' },

  // 帮助和支持
  HELP: { text: '❓ 帮助', callback_data: 'help' },
  CONTACT_SUPPORT: { text: '📞 联系客服', callback_data: 'contact_support' },
  FAQ: { text: '💡 常见问题', callback_data: 'faq' },
  FEEDBACK: { text: '📝 反馈', callback_data: 'feedback' }
};

/**
 * 业务相关按钮模板
 */
export const BUSINESS_BUTTONS = {
  // 能量相关
  BUY_ENERGY: { text: '🔋 购买能量', callback_data: 'buy_energy' },
  ENERGY_FLASH: { text: '⚡ 能量闪租', callback_data: 'energy_flash' },
  ENERGY_PACKAGE: { text: '📦 能量套餐', callback_data: 'energy_package' },

  // 订单相关
  MY_ORDERS: { text: '📋 我的订单', callback_data: 'my_orders' },
  ORDER_HISTORY: { text: '📜 订单历史', callback_data: 'order_history' },
  ORDER_STATUS: { text: '📊 订单状态', callback_data: 'order_status' },

  // 账户相关
  CHECK_BALANCE: { text: '💰 账户余额', callback_data: 'check_balance' },
  RECHARGE: { text: '💳 充值', callback_data: 'recharge' },
  WITHDRAW: { text: '💸 提现', callback_data: 'withdraw' },

  // 交易相关
  TRX_EXCHANGE: { text: '🔄 TRX闪兑', callback_data: 'trx_exchange' },
  TRANSACTION_PACKAGE: { text: '📦 笔数套餐', callback_data: 'transaction_package' },

  // 统计相关
  STATISTICS: { text: '📊 统计查询', callback_data: 'statistics' },
  MY_STATS: { text: '📈 我的统计', callback_data: 'my_stats' },
  REVENUE: { text: '💰 收益统计', callback_data: 'revenue' }
};

/**
 * 管理相关按钮模板
 */
export const ADMIN_BUTTONS = {
  // 用户管理
  USER_MANAGEMENT: { text: '👥 用户管理', callback_data: 'admin_users' },
  USER_LIST: { text: '📝 用户列表', callback_data: 'user_list' },
  USER_SEARCH: { text: '🔍 搜索用户', callback_data: 'user_search' },

  // 订单管理
  ORDER_MANAGEMENT: { text: '📋 订单管理', callback_data: 'admin_orders' },
  ORDER_LIST: { text: '📝 订单列表', callback_data: 'order_list' },
  ORDER_SEARCH: { text: '🔍 搜索订单', callback_data: 'order_search' },

  // 系统管理
  SYSTEM_SETTINGS: { text: '⚙️ 系统设置', callback_data: 'admin_settings' },
  BOT_MANAGEMENT: { text: '🤖 机器人管理', callback_data: 'bot_management' },
  PRICE_CONFIG: { text: '💰 价格配置', callback_data: 'price_config' },

  // 数据统计
  DATA_STATS: { text: '📊 数据统计', callback_data: 'admin_stats' },
  GLOBAL_STATS: { text: '🌍 全站统计', callback_data: 'global_stats' },
  REPORTS: { text: '📊 数据报表', callback_data: 'reports' }
};

/**
 * 设置相关按钮模板
 */
export const SETTINGS_BUTTONS = {
  // 语言设置
  LANGUAGE_SETTINGS: { text: '🌐 语言设置', callback_data: 'settings_language' },
  CHINESE_SIMPLIFIED: { text: '🇨🇳 简体中文', callback_data: 'lang_zh_cn' },
  CHINESE_TRADITIONAL: { text: '🇹🇼 繁體中文', callback_data: 'lang_zh_tw' },
  ENGLISH: { text: '🇺🇸 English', callback_data: 'lang_en' },
  JAPANESE: { text: '🇯🇵 日本語', callback_data: 'lang_ja' },
  KOREAN: { text: '🇰🇷 한국어', callback_data: 'lang_ko' },

  // 通知设置
  NOTIFICATION_SETTINGS: { text: '🔔 通知设置', callback_data: 'settings_notifications' },
  ORDER_NOTIFICATIONS: { text: '📧 订单通知', callback_data: 'notif_orders' },
  BALANCE_NOTIFICATIONS: { text: '💰 余额通知', callback_data: 'notif_balance' },
  MARKETING_NOTIFICATIONS: { text: '🎯 营销通知', callback_data: 'notif_marketing' },
  SYSTEM_NOTIFICATIONS: { text: '🔔 系统通知', callback_data: 'notif_system' },

  // 安全设置
  SECURITY_SETTINGS: { text: '🔐 安全设置', callback_data: 'settings_security' },
  CHANGE_PASSWORD: { text: '🔑 修改密码', callback_data: 'change_password' },
  TWO_FA: { text: '🛡️ 两步验证', callback_data: 'two_fa' },

  // 支付设置
  PAYMENT_SETTINGS: { text: '💳 支付设置', callback_data: 'settings_payment' },
  PAYMENT_METHODS: { text: '💳 支付方式', callback_data: 'payment_methods' },
  AUTO_RECHARGE: { text: '🔄 自动充值', callback_data: 'auto_recharge' }
};

/**
 * 状态切换按钮模板
 */
export const TOGGLE_BUTTONS = {
  ENABLE: { text: '✅ 启用', callback_data: 'enable' },
  DISABLE: { text: '❌ 禁用', callback_data: 'disable' },
  ON: { text: '🟢 开启', callback_data: 'on' },
  OFF: { text: '🔴 关闭', callback_data: 'off' },
  ACTIVE: { text: '✅ 激活', callback_data: 'active' },
  INACTIVE: { text: '⏸️ 暂停', callback_data: 'inactive' }
};

/**
 * 创建按钮组合
 */
export const BUTTON_COMBINATIONS = {
  /** 确认/取消组合 */
  CONFIRM_CANCEL: [
    COMMON_BUTTONS.CONFIRM,
    COMMON_BUTTONS.CANCEL
  ],

  /** 是/否组合 */
  YES_NO: [
    COMMON_BUTTONS.YES,
    COMMON_BUTTONS.NO
  ],

  /** 编辑/删除组合 */
  EDIT_DELETE: [
    COMMON_BUTTONS.EDIT,
    COMMON_BUTTONS.DELETE
  ],

  /** 启用/禁用组合 */
  ENABLE_DISABLE: [
    TOGGLE_BUTTONS.ENABLE,
    TOGGLE_BUTTONS.DISABLE
  ],

  /** 分页导航组合 */
  PAGINATION: [
    COMMON_BUTTONS.PREV_PAGE,
    COMMON_BUTTONS.NEXT_PAGE
  ],

  /** 完整分页组合 */
  FULL_PAGINATION: [
    COMMON_BUTTONS.FIRST_PAGE,
    COMMON_BUTTONS.PREV_PAGE,
    COMMON_BUTTONS.NEXT_PAGE,
    COMMON_BUTTONS.LAST_PAGE
  ]
};

/**
 * 动态按钮工厂函数
 */
export class ButtonFactory {
  /**
   * 创建带数据的按钮
   */
  static createButton(text: string, action: string, data?: string): TelegramBot.InlineKeyboardButton {
    const callback_data = data ? `${action}_${data}` : action;
    return { text, callback_data };
  }

  /**
   * 创建URL按钮
   */
  static createUrlButton(text: string, url: string): TelegramBot.InlineKeyboardButton {
    return { text, url };
  }

  /**
   * 创建分页按钮
   */
  static createPaginationButton(
    currentPage: number,
    totalPages: number,
    action: string = 'page'
  ): TelegramBot.InlineKeyboardButton[] {
    const buttons: TelegramBot.InlineKeyboardButton[] = [];

    if (currentPage > 1) {
      buttons.push({
        text: '⬅️ 上一页',
        callback_data: `${action}_${currentPage - 1}`
      });
    }

    buttons.push({
      text: `${currentPage} / ${totalPages}`,
      callback_data: 'page_info'
    });

    if (currentPage < totalPages) {
      buttons.push({
        text: '下一页 ➡️',
        callback_data: `${action}_${currentPage + 1}`
      });
    }

    return buttons;
  }

  /**
   * 创建数字选择按钮
   */
  static createNumberButtons(
    min: number,
    max: number,
    action: string = 'select',
    buttonsPerRow: number = 3
  ): TelegramBot.InlineKeyboardButton[][] {
    const buttons: TelegramBot.InlineKeyboardButton[][] = [];
    let currentRow: TelegramBot.InlineKeyboardButton[] = [];

    for (let i = min; i <= max; i++) {
      currentRow.push({
        text: i.toString(),
        callback_data: `${action}_${i}`
      });

      if (currentRow.length === buttonsPerRow || i === max) {
        buttons.push([...currentRow]);
        currentRow = [];
      }
    }

    return buttons;
  }

  /**
   * 创建选项按钮
   */
  static createOptionButtons(
    options: { text: string; value: string }[],
    action: string = 'option',
    buttonsPerRow: number = 2
  ): TelegramBot.InlineKeyboardButton[][] {
    const buttons: TelegramBot.InlineKeyboardButton[][] = [];
    let currentRow: TelegramBot.InlineKeyboardButton[] = [];

    options.forEach((option, index) => {
      currentRow.push({
        text: option.text,
        callback_data: `${action}_${option.value}`
      });

      if (currentRow.length === buttonsPerRow || index === options.length - 1) {
        buttons.push([...currentRow]);
        currentRow = [];
      }
    });

    return buttons;
  }
}

/**
 * 获取按钮模板
 */
export function getButton(category: string, buttonName: string): TelegramBot.InlineKeyboardButton | null {
  const categories: Record<string, Record<string, TelegramBot.InlineKeyboardButton>> = {
    common: COMMON_BUTTONS,
    business: BUSINESS_BUTTONS,
    admin: ADMIN_BUTTONS,
    settings: SETTINGS_BUTTONS,
    toggle: TOGGLE_BUTTONS
  };

  return categories[category]?.[buttonName] || null;
}
