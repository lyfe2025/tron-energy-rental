/**
 * Polling模式键盘处理器
 * 处理Polling模式特有的键盘同步逻辑
 */
import { KeyboardSyncService } from '../shared/KeyboardSyncService.js';

export class PollingKeyboardHandler {
  /**
   * 同步回复键盘 (Polling模式专用)
   */
  static async syncReplyKeyboard(
    botToken: string, 
    formData: any, 
    logs: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logs.push(`🎯 [Polling] 开始同步回复键盘`);
      
      const keyboardConfig = formData.keyboard_config;
      if (!keyboardConfig || !keyboardConfig.main_menu) {
        logs.push(`⏭️ [Polling] 跳过回复键盘同步（未配置主菜单）`);
        return { success: true };
      }

      logs.push(`🔄 [Polling模式] 使用getUpdates获取chat_id`);

      // Polling模式：使用getUpdates获取chat_id
      const chatId = await KeyboardSyncService.getChatIdFromUpdates(botToken);
      
      if (chatId) {
        logs.push(`📱 [Polling] 获取到有效的chat_id: ${chatId}`);
      } else {
        logs.push(`⚠️ [Polling] 获取chat_id失败，将使用配置验证模式`);
      }

      // 构建回复键盘
      const keyboard = KeyboardSyncService.buildReplyKeyboard(keyboardConfig);

      if (keyboard.length === 0) {
        logs.push(`⏭️ [Polling] 跳过回复键盘同步（没有可用的按钮）`);
        return { success: true };
      }

      // 尝试发送带回复键盘的消息
      if (chatId) {
        const sendResult = await KeyboardSyncService.sendReplyKeyboard(
          botToken,
          chatId,
          keyboard
        );
        
        if (sendResult.success) {
          logs.push(`✅ [Polling] 回复键盘同步成功（${keyboard.length}行按钮）`);
          logs.push(`📨 [Polling] 已发送到chat: ${chatId}`);
          return { success: true };
        } else {
          logs.push(`❌ [Polling] ${sendResult.error}`);
          return { success: false, error: sendResult.error };
        }
      } else {
        // 没有chat_id时，只验证配置
        logs.push(`✅ [Polling] 回复键盘配置验证通过（${keyboard.length}行按钮）`);
        logs.push(`ℹ️ [Polling] 无可用chat_id，未实际发送消息`);
        logs.push(`💡 提示：让用户先与机器人对话以获取chat_id`);
        return { success: true };
      }
      
    } catch (error: any) {
      const errorMsg = `回复键盘同步失败: ${error.message}`;
      logs.push(`❌ [Polling] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 同步内嵌键盘 (Polling模式专用)
   */
  static async syncInlineKeyboard(
    botToken: string, 
    formData: any, 
    logs: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logs.push(`🎯 [Polling] 开始同步内嵌键盘`);
      
      const keyboardConfig = formData.keyboard_config;
      if (!keyboardConfig || !keyboardConfig.main_menu) {
        logs.push(`⏭️ [Polling] 跳过内嵌键盘同步（未配置主菜单）`);
        return { success: true };
      }

      logs.push(`🔄 [Polling模式] 使用getUpdates获取chat_id`);

      // Polling模式：使用getUpdates获取chat_id
      const chatId = await KeyboardSyncService.getChatIdFromUpdates(botToken);
      
      if (chatId) {
        logs.push(`📱 [Polling] 获取到有效的chat_id: ${chatId}`);
      } else {
        logs.push(`⚠️ [Polling] 获取chat_id失败，将使用配置验证模式`);
      }

      // 构建内嵌键盘
      const inlineKeyboard = KeyboardSyncService.buildInlineKeyboard(keyboardConfig);

      if (inlineKeyboard.length === 0) {
        logs.push(`⏭️ [Polling] 跳过内嵌键盘同步（没有可用的按钮）`);
        return { success: true };
      }

      // 尝试发送带内嵌键盘的消息
      if (chatId) {
        const sendResult = await KeyboardSyncService.sendInlineKeyboard(
          botToken,
          chatId,
          inlineKeyboard
        );
        
        if (sendResult.success) {
          logs.push(`✅ [Polling] 内嵌键盘同步成功（${inlineKeyboard.length}行按钮）`);
          logs.push(`📨 [Polling] 已发送到chat: ${chatId}`);
          return { success: true };
        } else {
          logs.push(`❌ [Polling] ${sendResult.error}`);
          return { success: false, error: sendResult.error };
        }
      } else {
        // 没有chat_id时，只验证配置
        logs.push(`✅ [Polling] 内嵌键盘配置验证通过（${inlineKeyboard.length}行按钮）`);
        logs.push(`ℹ️ [Polling] 无可用chat_id，未实际发送消息`);
        logs.push(`💡 提示：让用户先与机器人对话以获取chat_id`);
        return { success: true };
      }
      
    } catch (error: any) {
      const errorMsg = `内嵌键盘同步失败: ${error.message}`;
      logs.push(`❌ [Polling] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}
