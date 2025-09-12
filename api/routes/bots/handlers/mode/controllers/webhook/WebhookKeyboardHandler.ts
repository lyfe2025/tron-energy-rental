/**
 * Webhook模式键盘处理器
 * 处理Webhook模式特有的键盘同步逻辑（只验证，不发送）
 */
import { KeyboardSyncService } from '../shared/KeyboardSyncService.js';

export class WebhookKeyboardHandler {
  /**
   * 同步回复键盘 (Webhook模式) - 不使用getUpdates，只验证配置
   */
  static async syncReplyKeyboard(
    botToken: string, 
    formData: any, 
    logs: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logs.push(`🎯 [Webhook] 开始验证回复键盘配置`);
      
      const keyboardConfig = formData.keyboard_config;
      if (!keyboardConfig || !keyboardConfig.main_menu) {
        logs.push(`⏭️ [Webhook] 跳过回复键盘（未配置主菜单）`);
        return { success: true };
      }

      logs.push(`🌐 [Webhook模式] 验证回复键盘配置`);

      // 构建回复键盘 (只验证，不发送)
      const keyboard = KeyboardSyncService.buildReplyKeyboard(keyboardConfig);

      if (keyboard.length === 0) {
        logs.push(`⏭️ [Webhook] 跳过回复键盘（没有可用的按钮）`);
        return { success: true };
      }

      // Webhook模式：只验证配置，不发送消息（避免与webhook冲突）
      logs.push(`✅ [Webhook] 回复键盘配置验证通过（${keyboard.length}行按钮）`);
      logs.push(`ℹ️ [Webhook] 配置已验证，用户与机器人对话时将看到回复键盘`);
      logs.push(`💡 提示：Webhook模式下，回复键盘将在用户发送消息时自动显示`);
      return { success: true };
      
    } catch (error: any) {
      const errorMsg = `回复键盘配置验证失败: ${error.message}`;
      logs.push(`❌ [Webhook] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 同步内嵌键盘 (Webhook模式) - 不使用getUpdates，只验证配置
   */
  static async syncInlineKeyboard(
    botToken: string, 
    formData: any, 
    logs: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logs.push(`🎯 [Webhook] 开始验证内嵌键盘配置`);
      
      const keyboardConfig = formData.keyboard_config;
      if (!keyboardConfig || !keyboardConfig.main_menu) {
        logs.push(`⏭️ [Webhook] 跳过内嵌键盘（未配置主菜单）`);
        return { success: true };
      }

      logs.push(`🌐 [Webhook模式] 验证内嵌键盘配置`);

      // 构建内嵌键盘 (只验证，不发送)
      const inlineKeyboard = KeyboardSyncService.buildInlineKeyboard(keyboardConfig);

      if (inlineKeyboard.length === 0) {
        logs.push(`⏭️ [Webhook] 跳过内嵌键盘（没有可用的按钮）`);
        return { success: true };
      }

      // Webhook模式：只验证配置，不发送消息（避免与webhook冲突）
      logs.push(`✅ [Webhook] 内嵌键盘配置验证通过（${inlineKeyboard.length}行按钮）`);
      logs.push(`ℹ️ [Webhook] 配置已验证，将在相关消息中显示内嵌键盘`);
      logs.push(`💡 提示：Webhook模式下，内嵌键盘将通过业务逻辑正常显示`);
      return { success: true };
      
    } catch (error: any) {
      const errorMsg = `内嵌键盘配置验证失败: ${error.message}`;
      logs.push(`❌ [Webhook] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}
