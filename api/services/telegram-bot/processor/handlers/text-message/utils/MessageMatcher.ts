/**
 * 消息匹配工具类
 * 负责动态查找按钮文本对应的callback_data
 */
import { query } from '../../../../../../config/database.js';

export class MessageMatcher {
  private botId: number | string | undefined;

  constructor(botId?: number | string) {
    this.botId = botId;
  }

  /**
   * 根据按钮文本动态查找对应的callback_data
   */
  async findCallbackDataByText(chatId: number, buttonText: string): Promise<string | null> {
    try {
      // 首先获取机器人ID
      if (!this.botId) {
        console.error('❌ 缺少botId，无法查找按钮配置');
        return null;
      }

      // 从数据库查找机器人的键盘配置
      const result = await query(
        'SELECT keyboard_config FROM telegram_bots WHERE id = $1',
        [this.botId]
      );

      if (result.rows.length === 0) {
        console.error('❌ 未找到机器人配置');
        return null;
      }

      const keyboardConfig = result.rows[0].keyboard_config;
      if (!keyboardConfig || !keyboardConfig.main_menu || !keyboardConfig.main_menu.rows) {
        console.error('❌ 机器人键盘配置无效');
        return null;
      }

      // 遍历所有按钮查找匹配的文本
      for (const row of keyboardConfig.main_menu.rows) {
        if (row.buttons) {
          for (const button of row.buttons) {
            if (button.text === buttonText) {
              console.log(`✅ 找到按钮映射: "${buttonText}" -> "${button.callback_data}"`);
              return button.callback_data;
            }
          }
        }
      }

      console.log(`❌ 未找到按钮文本 "${buttonText}" 的callback_data映射`);
      return null;
    } catch (error) {
      console.error('❌ 查找callback_data失败:', error);
      return null;
    }
  }

  /**
   * 更新机器人ID
   */
  updateBotId(botId: number | string): void {
    this.botId = botId;
  }
}
