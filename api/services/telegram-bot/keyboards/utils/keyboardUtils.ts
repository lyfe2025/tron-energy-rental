/**
 * 键盘工具类
 * 提供键盘相关的实用工具函数
 */
import TelegramBot from 'node-telegram-bot-api';
import type { InlineKeyboard } from '../../types/bot.types.js';

/**
 * 键盘验证工具
 */
export class KeyboardValidator {
  /**
   * 验证内嵌键盘配置
   */
  static validateInlineKeyboard(keyboard: InlineKeyboard): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!keyboard || !keyboard.inline_keyboard) {
      errors.push('缺少 inline_keyboard 属性');
      return { isValid: false, errors };
    }

    if (!Array.isArray(keyboard.inline_keyboard)) {
      errors.push('inline_keyboard 必须是数组');
      return { isValid: false, errors };
    }

    keyboard.inline_keyboard.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        errors.push(`第${rowIndex + 1}行不是数组`);
        return;
      }

      if (row.length === 0) {
        errors.push(`第${rowIndex + 1}行为空`);
        return;
      }

      if (row.length > 8) {
        errors.push(`第${rowIndex + 1}行按钮数量超过8个`);
      }

      row.forEach((button, buttonIndex) => {
        if (!button.text) {
          errors.push(`第${rowIndex + 1}行第${buttonIndex + 1}个按钮缺少文本`);
        }

        if (button.text && button.text.length > 64) {
          errors.push(`第${rowIndex + 1}行第${buttonIndex + 1}个按钮文本过长`);
        }

        // 检查按钮类型
        const hasCallback = !!button.callback_data;
        const hasUrl = !!button.url;
        const hasWebApp = !!(button as any).web_app;
        const hasLoginUrl = !!(button as any).login_url;

        const actionCount = [hasCallback, hasUrl, hasWebApp, hasLoginUrl].filter(Boolean).length;

        if (actionCount === 0) {
          errors.push(`第${rowIndex + 1}行第${buttonIndex + 1}个按钮缺少操作定义`);
        }

        if (actionCount > 1) {
          errors.push(`第${rowIndex + 1}行第${buttonIndex + 1}个按钮有多个操作定义`);
        }

        if (button.callback_data && button.callback_data.length > 64) {
          errors.push(`第${rowIndex + 1}行第${buttonIndex + 1}个按钮回调数据过长`);
        }
      });
    });

    if (keyboard.inline_keyboard.length > 100) {
      errors.push('键盘行数超过100行');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证回复键盘配置
   */
  static validateReplyKeyboard(keyboard: TelegramBot.ReplyKeyboardMarkup): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!keyboard || !keyboard.keyboard) {
      errors.push('缺少 keyboard 属性');
      return { isValid: false, errors };
    }

    if (!Array.isArray(keyboard.keyboard)) {
      errors.push('keyboard 必须是数组');
      return { isValid: false, errors };
    }

    keyboard.keyboard.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        errors.push(`第${rowIndex + 1}行不是数组`);
        return;
      }

      if (row.length === 0) {
        errors.push(`第${rowIndex + 1}行为空`);
        return;
      }

      if (row.length > 12) {
        errors.push(`第${rowIndex + 1}行按钮数量超过12个`);
      }

      row.forEach((button, buttonIndex) => {
        if (!button.text) {
          errors.push(`第${rowIndex + 1}行第${buttonIndex + 1}个按钮缺少文本`);
        }

        if (button.text && button.text.length > 64) {
          errors.push(`第${rowIndex + 1}行第${buttonIndex + 1}个按钮文本过长`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * 键盘优化工具
 */
export class KeyboardOptimizer {
  /**
   * 优化按钮排列
   */
  static optimizeButtonLayout(
    buttons: TelegramBot.InlineKeyboardButton[],
    maxButtonsPerRow: number = 2
  ): TelegramBot.InlineKeyboardButton[][] {
    const optimizedRows: TelegramBot.InlineKeyboardButton[][] = [];
    let currentRow: TelegramBot.InlineKeyboardButton[] = [];

    buttons.forEach((button, index) => {
      currentRow.push(button);

      // 根据按钮文本长度动态调整每行按钮数
      const avgTextLength = currentRow.reduce((sum, btn) => sum + btn.text.length, 0) / currentRow.length;
      let buttonsPerRow = maxButtonsPerRow;

      if (avgTextLength > 20) {
        buttonsPerRow = 1;
      } else if (avgTextLength > 15) {
        buttonsPerRow = Math.min(2, maxButtonsPerRow);
      }

      if (currentRow.length >= buttonsPerRow || index === buttons.length - 1) {
        optimizedRows.push([...currentRow]);
        currentRow = [];
      }
    });

    return optimizedRows;
  }

  /**
   * 压缩键盘空间
   */
  static compactKeyboard(keyboard: InlineKeyboard): InlineKeyboard {
    const compactedRows = keyboard.inline_keyboard.filter(row => row.length > 0);
    
    // 合并短行
    const optimizedRows: TelegramBot.InlineKeyboardButton[][] = [];
    let pendingButtons: TelegramBot.InlineKeyboardButton[] = [];

    compactedRows.forEach(row => {
      if (row.length === 1 && pendingButtons.length < 3) {
        pendingButtons.push(...row);
      } else {
        if (pendingButtons.length > 0) {
          optimizedRows.push([...pendingButtons]);
          pendingButtons = [];
        }
        optimizedRows.push(row);
      }
    });

    if (pendingButtons.length > 0) {
      optimizedRows.push(pendingButtons);
    }

    return {
      inline_keyboard: optimizedRows
    };
  }
}

/**
 * 键盘转换工具
 */
export class KeyboardConverter {
  /**
   * 将回复键盘转换为内嵌键盘
   */
  static replyToInlineKeyboard(
    replyKeyboard: TelegramBot.ReplyKeyboardMarkup,
    callbackPrefix: string = 'action'
  ): InlineKeyboard {
    const inlineRows: TelegramBot.InlineKeyboardButton[][] = [];

    replyKeyboard.keyboard.forEach(row => {
      const inlineRow: TelegramBot.InlineKeyboardButton[] = [];
      
      row.forEach(button => {
        inlineRow.push({
          text: button.text,
          callback_data: `${callbackPrefix}_${button.text.toLowerCase().replace(/\s+/g, '_')}`
        });
      });

      if (inlineRow.length > 0) {
        inlineRows.push(inlineRow);
      }
    });

    return {
      inline_keyboard: inlineRows
    };
  }

  /**
   * 将内嵌键盘转换为回复键盘（仅限回调按钮）
   */
  static inlineToReplyKeyboard(inlineKeyboard: InlineKeyboard): TelegramBot.ReplyKeyboardMarkup {
    const replyRows: TelegramBot.KeyboardButton[][] = [];

    inlineKeyboard.inline_keyboard.forEach(row => {
      const replyRow: TelegramBot.KeyboardButton[] = [];
      
      row.forEach(button => {
        if (button.callback_data) { // 只转换回调按钮
          replyRow.push({
            text: button.text
          });
        }
      });

      if (replyRow.length > 0) {
        replyRows.push(replyRow);
      }
    });

    return {
      keyboard: replyRows,
      resize_keyboard: true,
      one_time_keyboard: false
    };
  }
}

/**
 * 键盘分析工具
 */
export class KeyboardAnalyzer {
  /**
   * 分析键盘复杂度
   */
  static analyzeComplexity(keyboard: InlineKeyboard): {
    totalButtons: number;
    totalRows: number;
    avgButtonsPerRow: number;
    maxButtonsInRow: number;
    avgTextLength: number;
    hasUrlButtons: boolean;
    hasCallbackButtons: boolean;
    complexity: 'simple' | 'medium' | 'complex';
  } {
    const rows = keyboard.inline_keyboard;
    const totalRows = rows.length;
    let totalButtons = 0;
    let totalTextLength = 0;
    let maxButtonsInRow = 0;
    let hasUrlButtons = false;
    let hasCallbackButtons = false;

    rows.forEach(row => {
      totalButtons += row.length;
      maxButtonsInRow = Math.max(maxButtonsInRow, row.length);

      row.forEach(button => {
        totalTextLength += button.text.length;
        
        if (button.url) hasUrlButtons = true;
        if (button.callback_data) hasCallbackButtons = true;
      });
    });

    const avgButtonsPerRow = totalButtons / totalRows;
    const avgTextLength = totalTextLength / totalButtons;

    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    
    if (totalButtons > 20 || totalRows > 8 || avgTextLength > 15) {
      complexity = 'complex';
    } else if (totalButtons > 10 || totalRows > 4 || avgTextLength > 10) {
      complexity = 'medium';
    }

    return {
      totalButtons,
      totalRows,
      avgButtonsPerRow: Math.round(avgButtonsPerRow * 100) / 100,
      maxButtonsInRow,
      avgTextLength: Math.round(avgTextLength * 100) / 100,
      hasUrlButtons,
      hasCallbackButtons,
      complexity
    };
  }

  /**
   * 提取键盘中的所有回调数据
   */
  static extractCallbackData(keyboard: InlineKeyboard): string[] {
    const callbackData: string[] = [];

    keyboard.inline_keyboard.forEach(row => {
      row.forEach(button => {
        if (button.callback_data) {
          callbackData.push(button.callback_data);
        }
      });
    });

    return callbackData;
  }

  /**
   * 检查是否有重复的回调数据
   */
  static findDuplicateCallbacks(keyboard: InlineKeyboard): string[] {
    const callbackData = this.extractCallbackData(keyboard);
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    callbackData.forEach(callback => {
      if (seen.has(callback)) {
        duplicates.add(callback);
      } else {
        seen.add(callback);
      }
    });

    return Array.from(duplicates);
  }
}

/**
 * 键盘工具函数
 */
export const KeyboardUtils = {
  /**
   * 创建空的内嵌键盘
   */
  createEmptyInlineKeyboard(): InlineKeyboard {
    return { inline_keyboard: [] };
  },

  /**
   * 创建空的回复键盘
   */
  createEmptyReplyKeyboard(): TelegramBot.ReplyKeyboardMarkup {
    return {
      keyboard: [],
      resize_keyboard: true,
      one_time_keyboard: false
    };
  },

  /**
   * 移除键盘
   */
  createRemoveKeyboard(selective: boolean = false): TelegramBot.ReplyKeyboardRemove {
    return {
      remove_keyboard: true,
      selective
    };
  },

  /**
   * 合并多个内嵌键盘
   */
  mergeInlineKeyboards(...keyboards: InlineKeyboard[]): InlineKeyboard {
    const mergedRows: TelegramBot.InlineKeyboardButton[][] = [];

    keyboards.forEach(keyboard => {
      if (keyboard && keyboard.inline_keyboard) {
        mergedRows.push(...keyboard.inline_keyboard);
      }
    });

    return {
      inline_keyboard: mergedRows
    };
  },

  /**
   * 添加导航按钮到键盘底部
   */
  addNavigationButtons(
    keyboard: InlineKeyboard,
    backButton?: TelegramBot.InlineKeyboardButton,
    cancelButton?: TelegramBot.InlineKeyboardButton
  ): InlineKeyboard {
    const newKeyboard = JSON.parse(JSON.stringify(keyboard)) as InlineKeyboard;
    const navigationRow: TelegramBot.InlineKeyboardButton[] = [];

    if (backButton) navigationRow.push(backButton);
    if (cancelButton) navigationRow.push(cancelButton);

    if (navigationRow.length > 0) {
      newKeyboard.inline_keyboard.push(navigationRow);
    }

    return newKeyboard;
  }
};
