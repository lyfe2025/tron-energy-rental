/**
 * 菜单键盘构建器
 * 负责构建各种菜单相关的键盘
 */
import { query } from '../../../../config/database.ts';
import type { InlineKeyboard } from '../../types/bot.types.ts';

export class MenuKeyboardBuilder {
  /**
   * 根据价格配置构建菜单键盘
   */
  static async buildPriceConfigKeyboard(modeType: string): Promise<InlineKeyboard | null> {
    try {
      // 从价格配置表获取配置
      const priceConfigResult = await query(
        'SELECT config, inline_keyboard_config FROM price_configs WHERE mode_type = $1 AND is_active = true',
        [modeType]
      );

      if (priceConfigResult.rows.length === 0) {
        return null;
      }

      const priceConfig = priceConfigResult.rows[0];
      const inlineKeyboardConfig = priceConfig.inline_keyboard_config;

      // 构建内嵌键盘（如果有配置）
      if (inlineKeyboardConfig && inlineKeyboardConfig.enabled && inlineKeyboardConfig.buttons) {
        return {
          inline_keyboard: inlineKeyboardConfig.buttons
        };
      }

      return null;
    } catch (error) {
      console.error(`构建价格配置键盘失败 (${modeType}):`, error);
      return null;
    }
  }

  /**
   * 构建能量闪租菜单键盘
   */
  static async buildEnergyFlashKeyboard(): Promise<InlineKeyboard | null> {
    return await this.buildPriceConfigKeyboard('energy_flash');
  }

  /**
   * 构建笔数套餐菜单键盘
   */
  static async buildTransactionPackageKeyboard(): Promise<InlineKeyboard | null> {
    return await this.buildPriceConfigKeyboard('transaction_package');
  }

  /**
   * 构建TRX闪兑菜单键盘
   */
  static async buildTrxExchangeKeyboard(): Promise<InlineKeyboard | null> {
    return await this.buildPriceConfigKeyboard('trx_exchange');
  }

  /**
   * 构建服务类型选择键盘
   */
  static buildServiceTypeKeyboard(): InlineKeyboard {
    return {
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
  }

  /**
   * 构建管理员菜单键盘
   */
  static buildAdminMenuKeyboard(): InlineKeyboard {
    return {
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
  }

  /**
   * 构建用户操作菜单键盘
   */
  static buildUserActionsKeyboard(userId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '👤 用户详情', callback_data: `user_details_${userId}` },
          { text: '📋 用户订单', callback_data: `user_orders_${userId}` }
        ],
        [
          { text: '💰 余额操作', callback_data: `user_balance_${userId}` },
          { text: '🚫 封禁用户', callback_data: `user_ban_${userId}` }
        ],
        [
          { text: '🔙 返回用户列表', callback_data: 'admin_users' }
        ]
      ]
    };
  }

  /**
   * 构建订单操作菜单键盘
   */
  static buildOrderActionsKeyboard(orderId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '📋 订单详情', callback_data: `order_details_${orderId}` },
          { text: '✅ 完成订单', callback_data: `order_complete_${orderId}` }
        ],
        [
          { text: '❌ 取消订单', callback_data: `order_cancel_${orderId}` },
          { text: '🔄 退款订单', callback_data: `order_refund_${orderId}` }
        ],
        [
          { text: '🔙 返回订单列表', callback_data: 'admin_orders' }
        ]
      ]
    };
  }

  /**
   * 构建帮助菜单键盘
   */
  static buildHelpMenuKeyboard(): InlineKeyboard {
    return {
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
  }

  /**
   * 构建设置菜单键盘
   */
  static buildSettingsMenuKeyboard(): InlineKeyboard {
    return {
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
  }

  /**
   * 构建语言选择菜单键盘
   */
  static buildLanguageMenuKeyboard(): InlineKeyboard {
    return {
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
  }

  /**
   * 构建通知设置菜单键盘
   */
  static buildNotificationMenuKeyboard(): InlineKeyboard {
    return {
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
  }

  /**
   * 构建统计查询菜单键盘
   */
  static buildStatsMenuKeyboard(): InlineKeyboard {
    return {
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
  }

  /**
   * 构建动态菜单（根据用户权限）
   */
  static buildDynamicMenuKeyboard(userRole: 'user' | 'agent' | 'admin'): InlineKeyboard {
    const baseButtons = [
      [
        { text: '🔋 购买能量', callback_data: 'buy_energy' },
        { text: '📋 我的订单', callback_data: 'my_orders' }
      ],
      [
        { text: '💰 账户余额', callback_data: 'check_balance' },
        { text: '❓ 帮助支持', callback_data: 'help_support' }
      ]
    ];

    // 根据用户角色添加额外按钮
    if (userRole === 'agent' || userRole === 'admin') {
      baseButtons.push([
        { text: '📊 代理统计', callback_data: 'agent_stats' },
        { text: '👥 下级管理', callback_data: 'agent_subordinates' }
      ]);
    }

    if (userRole === 'admin') {
      baseButtons.push([
        { text: '⚙️ 系统管理', callback_data: 'admin_menu' },
        { text: '🤖 机器人管理', callback_data: 'bot_management' }
      ]);
    }

    baseButtons.push([
      { text: '🔄 刷新菜单', callback_data: 'refresh_menu' }
    ]);

    return {
      inline_keyboard: baseButtons
    };
  }
}
