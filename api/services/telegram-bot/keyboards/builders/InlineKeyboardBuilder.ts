/**
 * 内嵌键盘构建器
 * 负责构建各种内嵌键盘（InlineKeyboard）
 */
import TelegramBot from 'node-telegram-bot-api';
import type { EnergyPackage, InlineKeyboard } from '../../types/bot.types.ts';

export class InlineKeyboardBuilder {
  /**
   * 构建主菜单内嵌键盘
   */
  static buildMainMenuKeyboard(): InlineKeyboard {
    return {
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
  }

  /**
   * 构建能量套餐选择内嵌键盘
   */
  static buildEnergyPackagesKeyboard(packages: EnergyPackage[]): InlineKeyboard {
    const keyboard = packages.map(pkg => [{
      text: `${pkg.name} - ${pkg.energy.toLocaleString()} 能量 - ${pkg.price} TRX`,
      callback_data: `package_${pkg.id}`
    }]);

    // 添加返回主菜单按钮
    keyboard.push([
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]);

    return {
      inline_keyboard: keyboard
    };
  }

  /**
   * 构建套餐确认内嵌键盘
   */
  static buildPackageConfirmationKeyboard(packageId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '✅ 确认订单', callback_data: `confirm_package_${packageId}` },
          { text: '❌ 取消订单', callback_data: `cancel_package_${packageId}` }
        ],
        [
          { text: '🔙 返回套餐选择', callback_data: 'buy_energy' }
        ]
      ]
    };
  }

  /**
   * 构建订单确认内嵌键盘
   */
  static buildOrderConfirmationKeyboard(orderId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '✅ 确认支付', callback_data: `confirm_order_${orderId}` },
          { text: '❌ 取消订单', callback_data: `cancel_order_${orderId}` }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]
    };
  }

  /**
   * 构建委托状态查看内嵌键盘
   */
  static buildDelegationStatusKeyboard(delegationId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '📊 查看状态', callback_data: `delegation_status_${delegationId}` },
          { text: '🔄 刷新状态', callback_data: `delegation_status_${delegationId}` }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]
    };
  }

  /**
   * 从配置构建内嵌键盘
   */
  static buildInlineKeyboardFromConfig(config: any): InlineKeyboard {
    const keyboardRows: TelegramBot.InlineKeyboardButton[][] = [];
    
    if (config.main_menu && config.main_menu.rows) {
      config.main_menu.rows.forEach((row: any) => {
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
   * 构建分页内嵌键盘
   */
  static buildPaginationKeyboard(
    currentPage: number,
    totalPages: number,
    callbackPrefix: string = 'page'
  ): InlineKeyboard {
    const buttons: TelegramBot.InlineKeyboardButton[] = [];

    // 添加上一页按钮
    if (currentPage > 1) {
      buttons.push({
        text: '⬅️ 上一页',
        callback_data: `${callbackPrefix}_${currentPage - 1}`
      });
    }

    // 添加页码信息
    buttons.push({
      text: `${currentPage} / ${totalPages}`,
      callback_data: 'page_info'
    });

    // 添加下一页按钮
    if (currentPage < totalPages) {
      buttons.push({
        text: '下一页 ➡️',
        callback_data: `${callbackPrefix}_${currentPage + 1}`
      });
    }

    return {
      inline_keyboard: [buttons]
    };
  }

  /**
   * 构建确认/取消内嵌键盘
   */
  static buildConfirmCancelKeyboard(
    confirmData: string,
    cancelData: string,
    confirmText: string = '✅ 确认',
    cancelText: string = '❌ 取消'
  ): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: confirmText, callback_data: confirmData },
          { text: cancelText, callback_data: cancelData }
        ]
      ]
    };
  }

  /**
   * 构建数字选择内嵌键盘
   */
  static buildNumberSelectionKeyboard(
    min: number,
    max: number,
    callbackPrefix: string = 'select'
  ): InlineKeyboard {
    const buttons: TelegramBot.InlineKeyboardButton[][] = [];
    const buttonsPerRow = 3;
    let currentRow: TelegramBot.InlineKeyboardButton[] = [];

    for (let i = min; i <= max; i++) {
      currentRow.push({
        text: i.toString(),
        callback_data: `${callbackPrefix}_${i}`
      });

      if (currentRow.length === buttonsPerRow || i === max) {
        buttons.push([...currentRow]);
        currentRow = [];
      }
    }

    return {
      inline_keyboard: buttons
    };
  }

  /**
   * 构建URL按钮内嵌键盘
   */
  static buildUrlKeyboard(
    urlButtons: { text: string; url: string }[],
    additionalButtons?: TelegramBot.InlineKeyboardButton[][]
  ): InlineKeyboard {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

    // 添加URL按钮
    urlButtons.forEach(button => {
      keyboard.push([{
        text: button.text,
        url: button.url
      }]);
    });

    // 添加额外的按钮
    if (additionalButtons) {
      keyboard.push(...additionalButtons);
    }

    return {
      inline_keyboard: keyboard
    };
  }
}
