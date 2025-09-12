/**
 * 键盘同步服务
 * 提供通用的键盘构建和配置处理方法
 */
export class KeyboardSyncService {
  /**
   * 构建回复键盘
   */
  static buildReplyKeyboard(keyboardConfig: any): string[][] {
    const keyboard: string[][] = [];
    const mainMenu = keyboardConfig.main_menu;
    
    if (mainMenu.rows && Array.isArray(mainMenu.rows)) {
      for (const row of mainMenu.rows) {
        if (row.is_enabled && row.buttons && Array.isArray(row.buttons)) {
          const keyboardRow: string[] = [];
          for (const button of row.buttons) {
            if (button.is_enabled && button.text) {
              keyboardRow.push(button.text);
            }
          }
          if (keyboardRow.length > 0) {
            keyboard.push(keyboardRow);
          }
        }
      }
    }
    
    return keyboard;
  }

  /**
   * 构建内嵌键盘
   */
  static buildInlineKeyboard(keyboardConfig: any): any[][] {
    const inlineKeyboard: any[][] = [];
    const mainMenu = keyboardConfig.main_menu;
    
    if (mainMenu.rows && Array.isArray(mainMenu.rows)) {
      for (const row of mainMenu.rows) {
        if (row.is_enabled && row.buttons && Array.isArray(row.buttons)) {
          const keyboardRow: any[] = [];
          for (const button of row.buttons) {
            if (button.is_enabled && button.text) {
              const inlineButton: any = {
                text: button.text
              };
              
              // 根据按钮配置设置不同的动作
              if (button.callback_data) {
                inlineButton.callback_data = button.callback_data;
              } else if (button.url) {
                inlineButton.url = button.url;
              } else {
                // 默认使用文本作为callback_data
                inlineButton.callback_data = button.text.toLowerCase().replace(/[^a-z0-9]/g, '_');
              }
              
              keyboardRow.push(inlineButton);
            }
          }
          if (keyboardRow.length > 0) {
            inlineKeyboard.push(keyboardRow);
          }
        }
      }
    }
    
    return inlineKeyboard;
  }

  /**
   * 验证键盘配置基本结构
   */
  static validateKeyboardConfig(keyboardConfig: any): {
    isValid: boolean;
    keyboardType: string;
    totalButtons: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let totalButtons = 0;
    
    if (!keyboardConfig || !keyboardConfig.main_menu) {
      return {
        isValid: false,
        keyboardType: 'unknown',
        totalButtons: 0,
        errors: ['键盘配置为空']
      };
    }

    const mainMenu = keyboardConfig.main_menu;
    const keyboardType = mainMenu.type || 'inline';
    
    // 验证键盘类型的有效性
    if (!['reply', 'inline'].includes(keyboardType)) {
      errors.push(`无效的键盘类型: ${keyboardType}，必须是 'reply' 或 'inline'`);
    }
    
    // 验证键盘结构
    if (!mainMenu.rows || !Array.isArray(mainMenu.rows) || mainMenu.rows.length === 0) {
      errors.push('键盘必须包含至少一行按钮');
    } else {
      // 验证每一行的配置
      for (let i = 0; i < mainMenu.rows.length; i++) {
        const row = mainMenu.rows[i];
        
        if (!row.buttons || !Array.isArray(row.buttons)) {
          errors.push(`第${i + 1}行必须包含buttons数组`);
          continue;
        }
        
        let enabledButtonsInRow = 0;
        
        // 验证行中的每个按钮
        for (let j = 0; j < row.buttons.length; j++) {
          const button = row.buttons[j];
          
          if (!button.is_enabled) continue;
          enabledButtonsInRow++;
          totalButtons++;
          
          // 验证按钮文本
          if (!button.text || typeof button.text !== 'string') {
            errors.push(`第${i + 1}行第${j + 1}个按钮必须有文本`);
          } else if (button.text.length > 64) {
            errors.push(`第${i + 1}行第${j + 1}个按钮文本过长（超过64字符）`);
          }
          
          // 根据键盘类型验证按钮配置
          if (keyboardType === 'inline') {
            // 内嵌键盘需要回调数据或URL
            if (!button.callback_data && !button.url) {
              errors.push(`内嵌键盘按钮 "${button.text}" 必须有 callback_data 或 url`);
            }
          }
        }
        
        // 检查每行按钮数量限制
        if (enabledButtonsInRow > 8) {
          errors.push(`第${i + 1}行按钮过多（${enabledButtonsInRow}个），每行最多8个按钮`);
        }
      }
      
      // 检查总按钮数量
      if (totalButtons === 0) {
        errors.push('键盘必须至少包含一个启用的按钮');
      } else if (keyboardType === 'reply' && totalButtons > 100) {
        errors.push(`回复键盘按钮过多（${totalButtons}个），最多100个按钮`);
      }
    }

    return {
      isValid: errors.length === 0,
      keyboardType,
      totalButtons,
      errors
    };
  }

  /**
   * 获取chat_id (通用getUpdates方法)
   */
  static async getChatIdFromUpdates(botToken: string): Promise<string | null> {
    try {
      const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const updatesData = await updatesResponse.json();
      
      if (updatesData.ok && updatesData.result && updatesData.result.length > 0) {
        const lastUpdate = updatesData.result[0];
        if (lastUpdate.message && lastUpdate.message.chat) {
          return lastUpdate.message.chat.id.toString();
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 发送回复键盘消息
   */
  static async sendReplyKeyboard(
    botToken: string,
    chatId: string,
    keyboard: string[][],
    message: string = '🎛️ 回复键盘已更新\n\n使用下方按钮快速操作，或输入 /menu 查看完整功能。'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true,
            one_time_keyboard: false
          }
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        return { success: true };
      } else {
        return { success: false, error: `发送回复键盘失败: ${data.description || '未知错误'}` };
      }
    } catch (error: any) {
      return { success: false, error: `发送回复键盘失败: ${error.message}` };
    }
  }

  /**
   * 发送内嵌键盘消息
   */
  static async sendInlineKeyboard(
    botToken: string,
    chatId: string,
    inlineKeyboard: any[][],
    message: string = '🎯 内嵌键盘已更新\n\n点击下方按钮体验功能，这些按钮将出现在消息下方。'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          reply_markup: {
            inline_keyboard: inlineKeyboard
          }
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        return { success: true };
      } else {
        return { success: false, error: `发送内嵌键盘失败: ${data.description || '未知错误'}` };
      }
    } catch (error: any) {
      return { success: false, error: `发送内嵌键盘失败: ${error.message}` };
    }
  }
}
