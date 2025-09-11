/**
 * 机器人信息同步器
 * 负责同步机器人的基本信息，如名称、描述、菜单按钮等
 */
import { TelegramApiClient } from './TelegramApiClient';

export class BotInfoSyncer {
  /**
   * 同步机器人名称
   */
  static async syncBotName(token: string, name: string): Promise<boolean> {
    try {
      await TelegramApiClient.callTelegramAPI(token, 'setMyName', { name });
      console.log(`✅ 机器人名称同步成功: ${name}`);
      return true;
    } catch (error) {
      console.error('❌ 同步机器人名称失败:', error);
      
      // 如果是网络错误，返回false而不是抛出错误，允许其他步骤继续
      if ((error as any).isNetworkError) {
        console.warn('⚠️ 网络连接问题，跳过名称同步');
        return false;
      }
      
      // 其他错误（如Token无效）仍然抛出
      throw error;
    }
  }

  /**
   * 同步机器人描述
   */
  static async syncBotDescription(token: string, description: string): Promise<boolean> {
    try {
      await TelegramApiClient.callTelegramAPI(token, 'setMyDescription', { description });
      console.log('✅ 机器人描述同步成功');
      return true;
    } catch (error) {
      console.error('❌ 同步机器人描述失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 同步机器人短描述
   */
  static async syncBotShortDescription(token: string, shortDescription: string): Promise<boolean> {
    try {
      await TelegramApiClient.callTelegramAPI(token, 'setMyShortDescription', { 
        short_description: shortDescription 
      });
      console.log('✅ 机器人短描述同步成功');
      return true;
    } catch (error) {
      console.error('❌ 同步机器人短描述失败:', error);
      // 重新抛出错误，保留原始错误信息
      throw error;
    }
  }

  /**
   * 同步菜单按钮
   */
  static async syncMenuButton(token: string, menuButtonConfig?: {
    is_enabled: boolean;
    button_text?: string;
    menu_type?: 'commands' | 'web_app';
    web_app_url?: string;
    commands?: any[];
  }): Promise<boolean> {
    try {
      let menuButtonData: any;

      if (!menuButtonConfig || !menuButtonConfig.is_enabled) {
        // 禁用菜单按钮 - 使用default type
        menuButtonData = {
          type: 'default'
        };
        console.log('🔄 禁用菜单按钮');
      } else {
        // 启用菜单按钮
        if (menuButtonConfig.menu_type === 'web_app' && menuButtonConfig.web_app_url) {
          // Web App类型菜单按钮
          menuButtonData = {
            type: 'web_app',
            text: menuButtonConfig.button_text || '菜单',
            web_app: {
              url: menuButtonConfig.web_app_url
            }
          };
          console.log(`🔄 设置Web App菜单按钮: ${menuButtonConfig.button_text} -> ${menuButtonConfig.web_app_url}`);
        } else {
          // 命令类型菜单按钮（注意：commands类型不支持自定义text参数）
          menuButtonData = {
            type: 'commands'
          };
          console.log('🔄 设置命令菜单按钮（文本固定为"Menu"）');
        }
      }

      // 调用Telegram API设置菜单按钮
      // 注意：chat_id参数可选，不提供则设置为所有私聊的默认菜单按钮
      await TelegramApiClient.callTelegramAPI(token, 'setChatMenuButton', {
        menu_button: menuButtonData
      });
      
      console.log('✅ 菜单按钮同步成功');
      return true;
    } catch (error) {
      console.error('❌ 同步菜单按钮失败:', error);
      return false;
    }
  }
}
