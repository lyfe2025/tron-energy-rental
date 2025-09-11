/**
 * 命令同步器
 * 负责同步机器人命令
 */
import { TelegramApiClient } from './TelegramApiClient';

export class CommandSyncer {
  /**
   * 同步机器人命令
   */
  static async syncBotCommands(token: string, commands: any[]): Promise<boolean> {
    try {
      await TelegramApiClient.callTelegramAPI(token, 'setMyCommands', { commands });
      console.log(`✅ 机器人命令同步成功，共 ${commands.length} 个命令`);
      return true;
    } catch (error) {
      console.error('❌ 同步机器人命令失败:', error);
      
      // 如果是网络错误，返回false而不是抛出错误，允许其他步骤继续
      if ((error as any).isNetworkError) {
        console.warn('⚠️ 网络连接问题，跳过命令同步');
        return false;
      }
      
      // 其他错误（如Token无效）仍然抛出
      throw error;
    }
  }
}
