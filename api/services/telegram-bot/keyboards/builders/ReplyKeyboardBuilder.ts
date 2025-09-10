/**
 * 回复键盘构建器
 * 负责构建各种回复键盘（ReplyKeyboard）
 */
import TelegramBot from 'node-telegram-bot-api';

export class ReplyKeyboardBuilder {
  /**
   * 构建主菜单回复键盘
   */
  static buildMainMenuKeyboard(): TelegramBot.ReplyKeyboardMarkup {
    return {
      keyboard: [
        [
          { text: '🔋 购买能量' },
          { text: '📋 我的订单' }
        ],
        [
          { text: '💰 账户余额' },
          { text: '❓ 帮助支持' }
        ],
        [
          { text: '🔄 刷新菜单' }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: false
    };
  }

  /**
   * 从配置构建回复键盘
   */
  static buildReplyKeyboardFromConfig(config: any): TelegramBot.ReplyKeyboardMarkup {
    const keyboardRows: TelegramBot.KeyboardButton[][] = [];
    
    if (config.main_menu && config.main_menu.rows) {
      config.main_menu.rows.forEach((row: any) => {
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
   * 构建联系人请求键盘
   */
  static buildContactRequestKeyboard(requestText: string = '📱 分享联系人'): TelegramBot.ReplyKeyboardMarkup {
    return {
      keyboard: [
        [
          { text: requestText, request_contact: true }
        ],
        [
          { text: '❌ 取消' }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
      selective: false
    };
  }

  /**
   * 构建位置请求键盘
   */
  static buildLocationRequestKeyboard(requestText: string = '📍 分享位置'): TelegramBot.ReplyKeyboardMarkup {
    return {
      keyboard: [
        [
          { text: requestText, request_location: true }
        ],
        [
          { text: '❌ 取消' }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
      selective: false
    };
  }

  /**
   * 构建是/否选择键盘
   */
  static buildYesNoKeyboard(
    yesText: string = '✅ 是',
    noText: string = '❌ 否'
  ): TelegramBot.ReplyKeyboardMarkup {
    return {
      keyboard: [
        [
          { text: yesText },
          { text: noText }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
      selective: false
    };
  }

  /**
   * 构建数字选择键盘
   */
  static buildNumberKeyboard(
    min: number,
    max: number,
    buttonsPerRow: number = 3
  ): TelegramBot.ReplyKeyboardMarkup {
    const buttons: TelegramBot.KeyboardButton[][] = [];
    let currentRow: TelegramBot.KeyboardButton[] = [];

    for (let i = min; i <= max; i++) {
      currentRow.push({
        text: i.toString()
      });

      if (currentRow.length === buttonsPerRow || i === max) {
        buttons.push([...currentRow]);
        currentRow = [];
      }
    }

    // 添加取消按钮
    buttons.push([{ text: '❌ 取消' }]);

    return {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: true,
      selective: false
    };
  }

  /**
   * 构建自定义选项键盘
   */
  static buildCustomOptionsKeyboard(
    options: string[],
    buttonsPerRow: number = 2,
    addCancelButton: boolean = true
  ): TelegramBot.ReplyKeyboardMarkup {
    const buttons: TelegramBot.KeyboardButton[][] = [];
    let currentRow: TelegramBot.KeyboardButton[] = [];

    options.forEach((option, index) => {
      currentRow.push({
        text: option
      });

      if (currentRow.length === buttonsPerRow || index === options.length - 1) {
        buttons.push([...currentRow]);
        currentRow = [];
      }
    });

    // 添加取消按钮
    if (addCancelButton) {
      buttons.push([{ text: '❌ 取消' }]);
    }

    return {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: true,
      selective: false
    };
  }

  /**
   * 构建快速回复键盘
   */
  static buildQuickReplyKeyboard(
    quickReplies: string[],
    persistent: boolean = false
  ): TelegramBot.ReplyKeyboardMarkup {
    const buttons: TelegramBot.KeyboardButton[][] = quickReplies.map(reply => [
      { text: reply }
    ]);

    return {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: !persistent,
      selective: false
    };
  }

  /**
   * 移除键盘
   */
  static removeKeyboard(selective: boolean = false): TelegramBot.ReplyKeyboardRemove {
    return {
      remove_keyboard: true,
      selective
    };
  }

  /**
   * 构建分类选择键盘
   */
  static buildCategoryKeyboard(
    categories: { name: string; emoji?: string }[],
    buttonsPerRow: number = 2
  ): TelegramBot.ReplyKeyboardMarkup {
    const buttons: TelegramBot.KeyboardButton[][] = [];
    let currentRow: TelegramBot.KeyboardButton[] = [];

    categories.forEach((category, index) => {
      const text = category.emoji ? `${category.emoji} ${category.name}` : category.name;
      currentRow.push({
        text
      });

      if (currentRow.length === buttonsPerRow || index === categories.length - 1) {
        buttons.push([...currentRow]);
        currentRow = [];
      }
    });

    // 添加返回按钮
    buttons.push([{ text: '🔙 返回主菜单' }]);

    return {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: false
    };
  }

  /**
   * 构建语言选择键盘
   */
  static buildLanguageKeyboard(): TelegramBot.ReplyKeyboardMarkup {
    return {
      keyboard: [
        [
          { text: '🇨🇳 中文' },
          { text: '🇺🇸 English' }
        ],
        [
          { text: '🇯🇵 日本語' },
          { text: '🇰🇷 한국어' }
        ],
        [
          { text: '🔙 返回' }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
      selective: false
    };
  }

  /**
   * 构建设置键盘
   */
  static buildSettingsKeyboard(): TelegramBot.ReplyKeyboardMarkup {
    return {
      keyboard: [
        [
          { text: '🌐 语言设置' },
          { text: '🔔 通知设置' }
        ],
        [
          { text: '🔐 安全设置' },
          { text: '💳 支付设置' }
        ],
        [
          { text: '❓ 帮助' },
          { text: '🔙 返回主菜单' }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: false
    };
  }
}
