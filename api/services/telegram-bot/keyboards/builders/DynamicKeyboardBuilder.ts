/**
 * 动态键盘构建器
 * 负责根据数据库配置和用户状态动态构建键盘
 */
import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../../../config/database.ts';
import type { InlineKeyboard } from '../../types/bot.types.ts';

export class DynamicKeyboardBuilder {
  /**
   * 根据机器人配置动态构建主菜单
   */
  static async buildDynamicMainMenu(botId: string): Promise<{
    keyboard: InlineKeyboard | TelegramBot.ReplyKeyboardMarkup;
    type: 'inline' | 'reply';
    message: string;
  } | null> {
    try {
      // 从数据库获取机器人键盘配置
      const result = await query(
        'SELECT keyboard_config FROM telegram_bots WHERE id = $1',
        [botId]
      );
      
      if (result.rows.length === 0 || !result.rows[0].keyboard_config) {
        return null;
      }

      const keyboardConfig = result.rows[0].keyboard_config;
      
      if (!keyboardConfig.main_menu || !keyboardConfig.main_menu.is_enabled) {
        return null;
      }

      const menuConfig = keyboardConfig.main_menu;
      const menuTitle = menuConfig.title || '🏠 主菜单';
      const menuDescription = menuConfig.description || '请选择您需要的服务：';
      const menuMessage = `${menuTitle}\n\n${menuDescription}`;

      if (menuConfig.type === 'reply') {
        // 构建回复键盘
        const replyKeyboard = this.buildReplyKeyboardFromConfig(menuConfig);
        return {
          keyboard: replyKeyboard,
          type: 'reply',
          message: menuMessage
        };
      } else {
        // 构建内嵌键盘
        const inlineKeyboard = this.buildInlineKeyboardFromConfig(menuConfig);
        return {
          keyboard: inlineKeyboard,
          type: 'inline',
          message: menuMessage
        };
      }
    } catch (error) {
      console.error('构建动态主菜单失败:', error);
      return null;
    }
  }

  /**
   * 根据用户状态构建上下文相关键盘
   */
  static buildContextualKeyboard(
    userState: string,
    contextData: Record<string, any> = {}
  ): InlineKeyboard | null {
    switch (userState) {
      case 'awaiting_address':
        return this.buildAddressInputKeyboard();
      
      case 'selecting_package':
        return this.buildPackageSelectionKeyboard(contextData.packages || []);
      
      case 'confirming_order':
        return this.buildOrderConfirmationKeyboard(contextData.orderId);
      
      case 'payment_pending':
        return this.buildPaymentKeyboard(contextData.orderId);
      
      case 'browsing_history':
        return this.buildHistoryBrowsingKeyboard(contextData.currentPage || 1, contextData.totalPages || 1);
      
      default:
        return null;
    }
  }

  /**
   * 构建地址输入键盘
   */
  private static buildAddressInputKeyboard(): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '📝 手动输入地址', callback_data: 'input_address_manual' },
          { text: '📋 从历史选择', callback_data: 'input_address_history' }
        ],
        [
          { text: '❌ 取消', callback_data: 'cancel_address_input' }
        ]
      ]
    };
  }

  /**
   * 构建套餐选择键盘
   */
  private static buildPackageSelectionKeyboard(packages: any[]): InlineKeyboard {
    const buttons = packages.map(pkg => [{
      text: `${pkg.name} - ${pkg.price} TRX`,
      callback_data: `select_package_${pkg.id}`
    }]);

    buttons.push([
      { text: '🔙 返回', callback_data: 'back_to_menu' }
    ]);

    return {
      inline_keyboard: buttons
    };
  }

  /**
   * 构建订单确认键盘
   */
  private static buildOrderConfirmationKeyboard(orderId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '✅ 确认下单', callback_data: `confirm_order_${orderId}` },
          { text: '✏️ 修改订单', callback_data: `edit_order_${orderId}` }
        ],
        [
          { text: '❌ 取消订单', callback_data: `cancel_order_${orderId}` }
        ]
      ]
    };
  }

  /**
   * 构建支付键盘
   */
  private static buildPaymentKeyboard(orderId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '💳 已完成支付', callback_data: `payment_completed_${orderId}` },
          { text: '📊 查看订单', callback_data: `view_order_${orderId}` }
        ],
        [
          { text: '❓ 支付帮助', callback_data: 'payment_help' },
          { text: '❌ 取消支付', callback_data: `cancel_payment_${orderId}` }
        ]
      ]
    };
  }

  /**
   * 构建历史浏览键盘
   */
  private static buildHistoryBrowsingKeyboard(currentPage: number, totalPages: number): InlineKeyboard {
    const buttons: TelegramBot.InlineKeyboardButton[][] = [];

    // 分页按钮
    const paginationButtons: TelegramBot.InlineKeyboardButton[] = [];
    
    if (currentPage > 1) {
      paginationButtons.push({
        text: '⬅️ 上一页',
        callback_data: `history_page_${currentPage - 1}`
      });
    }

    paginationButtons.push({
      text: `${currentPage}/${totalPages}`,
      callback_data: 'page_info'
    });

    if (currentPage < totalPages) {
      paginationButtons.push({
        text: '下一页 ➡️',
        callback_data: `history_page_${currentPage + 1}`
      });
    }

    if (paginationButtons.length > 0) {
      buttons.push(paginationButtons);
    }

    // 操作按钮
    buttons.push([
      { text: '🔄 刷新', callback_data: 'refresh_history' },
      { text: '🔙 返回', callback_data: 'back_to_menu' }
    ]);

    return {
      inline_keyboard: buttons
    };
  }

  /**
   * 根据用户权限动态构建管理键盘
   */
  static buildPermissionBasedKeyboard(
    userRole: 'user' | 'agent' | 'admin',
    section: string
  ): InlineKeyboard | null {
    switch (section) {
      case 'management':
        return this.buildManagementKeyboard(userRole);
      
      case 'statistics':
        return this.buildStatisticsKeyboard(userRole);
      
      case 'settings':
        return this.buildSettingsKeyboard(userRole);
      
      default:
        return null;
    }
  }

  /**
   * 构建管理键盘
   */
  private static buildManagementKeyboard(userRole: string): InlineKeyboard {
    const buttons: TelegramBot.InlineKeyboardButton[][] = [];

    // 所有用户都有的基础管理功能
    buttons.push([
      { text: '📋 我的订单', callback_data: 'manage_my_orders' },
      { text: '💰 我的余额', callback_data: 'manage_my_balance' }
    ]);

    // 代理及以上权限
    if (userRole === 'agent' || userRole === 'admin') {
      buttons.push([
        { text: '👥 下级管理', callback_data: 'manage_subordinates' },
        { text: '📊 佣金统计', callback_data: 'manage_commissions' }
      ]);
    }

    // 管理员专属功能
    if (userRole === 'admin') {
      buttons.push([
        { text: '⚙️ 系统设置', callback_data: 'manage_system' },
        { text: '🤖 机器人管理', callback_data: 'manage_bots' }
      ]);
    }

    buttons.push([
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]);

    return {
      inline_keyboard: buttons
    };
  }

  /**
   * 构建统计键盘
   */
  private static buildStatisticsKeyboard(userRole: string): InlineKeyboard {
    const buttons: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '📊 个人统计', callback_data: 'stats_personal' },
        { text: '📈 订单统计', callback_data: 'stats_orders' }
      ]
    ];

    if (userRole === 'agent' || userRole === 'admin') {
      buttons.push([
        { text: '👥 团队统计', callback_data: 'stats_team' },
        { text: '💰 收益统计', callback_data: 'stats_revenue' }
      ]);
    }

    if (userRole === 'admin') {
      buttons.push([
        { text: '🌍 全站统计', callback_data: 'stats_global' },
        { text: '📊 数据报表', callback_data: 'stats_reports' }
      ]);
    }

    buttons.push([
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]);

    return {
      inline_keyboard: buttons
    };
  }

  /**
   * 构建设置键盘
   */
  private static buildSettingsKeyboard(userRole: string): InlineKeyboard {
    const buttons: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🌐 语言设置', callback_data: 'settings_language' },
        { text: '🔔 通知设置', callback_data: 'settings_notifications' }
      ],
      [
        { text: '🔐 安全设置', callback_data: 'settings_security' },
        { text: '💳 支付设置', callback_data: 'settings_payment' }
      ]
    ];

    if (userRole === 'admin') {
      buttons.push([
        { text: '⚙️ 系统配置', callback_data: 'settings_system' },
        { text: '🤖 机器人配置', callback_data: 'settings_bots' }
      ]);
    }

    buttons.push([
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]);

    return {
      inline_keyboard: buttons
    };
  }

  /**
   * 从配置构建回复键盘
   */
  private static buildReplyKeyboardFromConfig(config: any): TelegramBot.ReplyKeyboardMarkup {
    const keyboardRows: TelegramBot.KeyboardButton[][] = [];
    
    if (config.rows) {
      config.rows.forEach((row: any) => {
        if (row.is_enabled && row.buttons) {
          const buttonRow: TelegramBot.KeyboardButton[] = [];
          
          row.buttons.forEach((button: any) => {
            if (button.is_enabled) {
              buttonRow.push({
                text: button.text
              });
            }
          });
          
          if (buttonRow.length > 0) {
            keyboardRows.push(buttonRow);
          }
        }
      });
    }
    
    return {
      keyboard: keyboardRows,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: false
    };
  }

  /**
   * 从配置构建内嵌键盘
   */
  private static buildInlineKeyboardFromConfig(config: any): InlineKeyboard {
    const keyboardRows: TelegramBot.InlineKeyboardButton[][] = [];
    
    if (config.rows) {
      config.rows.forEach((row: any) => {
        if (row.is_enabled && row.buttons) {
          const buttonRow: TelegramBot.InlineKeyboardButton[] = [];
          
          row.buttons.forEach((button: any) => {
            if (button.is_enabled) {
              buttonRow.push({
                text: button.text,
                callback_data: button.callback_data || `action_${Date.now()}`
              });
            }
          });
          
          if (buttonRow.length > 0) {
            keyboardRows.push(buttonRow);
          }
        }
      });
    }
    
    return {
      inline_keyboard: keyboardRows
    };
  }

  /**
   * 构建自适应键盘（根据屏幕大小和按钮数量）
   */
  static buildAdaptiveKeyboard(
    buttons: { text: string; callback_data: string }[],
    maxButtonsPerRow: number = 2
  ): InlineKeyboard {
    const keyboardRows: TelegramBot.InlineKeyboardButton[][] = [];
    let currentRow: TelegramBot.InlineKeyboardButton[] = [];

    buttons.forEach((button, index) => {
      currentRow.push({
        text: button.text,
        callback_data: button.callback_data
      });

      // 根据按钮文本长度决定每行按钮数量
      const avgTextLength = currentRow.reduce((sum, btn) => sum + btn.text.length, 0) / currentRow.length;
      const buttonsPerRow = avgTextLength > 15 ? 1 : maxButtonsPerRow;

      if (currentRow.length >= buttonsPerRow || index === buttons.length - 1) {
        keyboardRows.push([...currentRow]);
        currentRow = [];
      }
    });

    return {
      inline_keyboard: keyboardRows
    };
  }
}
