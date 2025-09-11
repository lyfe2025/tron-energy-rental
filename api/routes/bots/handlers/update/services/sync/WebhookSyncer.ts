/**
 * Webhook 同步器
 * 负责管理机器人的 Webhook 设置
 */
import { TelegramApiClient } from './TelegramApiClient';

export class WebhookSyncer {
  /**
   * 设置Webhook
   */
  static async setWebhook(token: string, webhookUrl: string, secret?: string): Promise<boolean> {
    try {
      const webhookData: any = {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'inline_query'],
        drop_pending_updates: true
      };

      if (secret) {
        webhookData.secret_token = secret;
      }

      await TelegramApiClient.callTelegramAPI(token, 'setWebhook', webhookData);
      console.log(`✅ Webhook设置成功: ${webhookUrl}`);
      return true;
    } catch (error) {
      console.error('❌ 设置Webhook失败:', error);
      
      // 如果是网络错误，返回false而不是抛出错误，允许其他步骤继续
      if ((error as any).isNetworkError) {
        console.warn('⚠️ 网络连接问题，跳过Webhook设置');
        return false;
      }
      
      // 其他错误（如Token无效、URL格式错误）仍然抛出
      throw error;
    }
  }

  /**
   * 删除Webhook
   */
  static async deleteWebhook(token: string): Promise<boolean> {
    try {
      await TelegramApiClient.callTelegramAPI(token, 'deleteWebhook', { 
        drop_pending_updates: true 
      });
      console.log('✅ Webhook删除成功');
      return true;
    } catch (error) {
      console.error('❌ 删除Webhook失败:', error);
      
      // 如果是网络错误，返回false而不是抛出错误，允许其他步骤继续
      if ((error as any).isNetworkError) {
        console.warn('⚠️ 网络连接问题，跳过Webhook删除');
        return false;
      }
      
      // 其他错误（如Token无效）仍然抛出
      throw error;
    }
  }
}
