/**
 * 键盘构建器
 * 从PriceConfigMessageHandler中分离出的键盘构建逻辑
 */
import { CallbackDataBuilder } from './CallbackDataBuilder.ts';

export class KeyboardBuilder {
  /**
   * 将按钮数组按照每行按钮数分组，并处理特殊按钮（全宽）
   */
  static groupButtonsIntoRows(buttons: any[], buttonsPerRow: number = 2): any[][] {
    const rows: any[][] = [];
    
    // 识别特殊按钮（标记为isSpecial或者是最后一个按钮）
    let regularButtons = [];
    let specialButtons = [];
    
    buttons.forEach((button, index) => {
      if (button.isSpecial || (index === buttons.length - 1 && buttons.length > 4)) {
        // 特殊按钮：明确标记的或者是最后一个按钮且总数大于4个
        specialButtons.push({
          text: button.text,
          callback_data: button.callback_data
        });
      } else {
        regularButtons.push({
          text: button.text,
          callback_data: button.callback_data
        });
      }
    });
    
    // 先处理常规按钮，按照每行指定数量分组
    for (let i = 0; i < regularButtons.length; i += buttonsPerRow) {
      const row = regularButtons.slice(i, i + buttonsPerRow);
      rows.push(row);
    }
    
    // 然后处理特殊按钮，每个单独一行
    specialButtons.forEach(button => {
      rows.push([button]);
    });
    
    return rows;
  }

  /**
   * 构建订单确认内嵌键盘
   */
  static buildConfirmationInlineKeyboard(keyboardConfig: any, contextData: any): any[] {
    if (!keyboardConfig?.buttons || !Array.isArray(keyboardConfig.buttons)) {
      return [];
    }

    const keyboard: any[] = [];
    const buttonsPerRow = keyboardConfig.buttons_per_row || 2;
    
    for (let i = 0; i < keyboardConfig.buttons.length; i += buttonsPerRow) {
      const row: any[] = [];
      
      for (let j = 0; j < buttonsPerRow && (i + j) < keyboardConfig.buttons.length; j++) {
        const buttonConfig = keyboardConfig.buttons[i + j];
        
        // 构建callback_data，添加用户和订单信息
        const callbackData = CallbackDataBuilder.buildCallbackData(buttonConfig.callback_data, contextData);
        
        row.push({
          text: buttonConfig.text,
          callback_data: callbackData
        });
      }
      
      keyboard.push(row);
    }

    return keyboard;
  }
}
