/**
 * Telegram 同步服务
 * 负责与 Telegram API 的数据同步功能
 */
import TelegramBot from 'node-telegram-bot-api';
import { DatabaseAdapter } from '../integrated/adapters/DatabaseAdapter.js';

export interface SyncData {
  name: string | null;
  description: string | null;
  commands: any[] | null;
  botInfo: any;
}

export interface SyncResult {
  success: boolean;
  data?: SyncData;
  error?: string;
  timestamp: string;
}

export interface CommandSyncResult {
  success: boolean;
  commands?: any[];
  error?: string;
}

export class TelegramSyncService {
  private bot: TelegramBot;
  private databaseAdapter: DatabaseAdapter;
  private botId: string | null = null;

  constructor(bot: TelegramBot, botId?: string) {
    this.bot = bot;
    this.databaseAdapter = DatabaseAdapter.getInstance();
    this.botId = botId || null;
  }

  /**
   * 设置机器人 ID
   */
  setBotId(botId: string): void {
    this.botId = botId;
  }

  /**
   * 从 Telegram 同步完整的机器人信息
   */
  async syncFromTelegram(): Promise<SyncResult> {
    try {
      console.log('🔄 开始从 Telegram 同步机器人信息...');

      // 并行获取所有信息
      const [botInfo, name, description, commands] = await Promise.all([
        this.getBotInfo(),
        this.getBotName(),
        this.getBotDescription(),
        this.getBotCommands()
      ]);

      const syncData: SyncData = {
        name,
        description,
        commands,
        botInfo
      };

      console.log('✅ 从 Telegram 同步完成');

      return {
        success: true,
        data: syncData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 从 Telegram 同步失败:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '同步失败',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取机器人基本信息
   */
  async getBotInfo(): Promise<any> {
    try {
      return await this.bot.getMe();
    } catch (error) {
      console.error('获取机器人信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取机器人名称
   */
  async getBotName(): Promise<string | null> {
    try {
      // 直接调用 Telegram Bot API
      const response = await fetch(`https://api.telegram.org/bot${this.getToken()}/getMyName`);
      const data = await response.json();
      return data.ok ? data.result?.name || null : null;
    } catch (error) {
      console.error('获取机器人名称失败:', error);
      return null;
    }
  }

  /**
   * 获取机器人描述
   */
  async getBotDescription(): Promise<string | null> {
    try {
      // 直接调用 Telegram Bot API
      const response = await fetch(`https://api.telegram.org/bot${this.getToken()}/getMyDescription`);
      const data = await response.json();
      return data.ok ? data.result?.description || null : null;
    } catch (error) {
      console.error('获取机器人描述失败:', error);
      return null;
    }
  }

  /**
   * 获取机器人命令列表
   */
  async getBotCommands(): Promise<any[] | null> {
    try {
      return await this.bot.getMyCommands();
    } catch (error) {
      console.error('获取机器人命令失败:', error);
      return null;
    }
  }

  /**
   * 设置机器人名称
   */
  async setBotName(name: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.getToken()}/setMyName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await response.json();
      
      if (data.ok) {
        await this.updateActivity();
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.description || '设置名称失败' 
        };
      }
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置名称失败'
      };
    }
  }

  /**
   * 设置机器人描述
   */
  async setBotDescription(description: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.getToken()}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      const data = await response.json();
      
      if (data.ok) {
        await this.updateActivity();
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.description || '设置描述失败' 
        };
      }
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置描述失败'
      };
    }
  }

  /**
   * 设置机器人命令
   */
  async setBotCommands(commands: any[]): Promise<CommandSyncResult> {
    try {
      const result = await this.bot.setMyCommands(commands);
      
      if (result) {
        await this.updateActivity();
        return {
          success: true,
          commands
        };
      } else {
        return {
          success: false,
          error: '设置命令失败'
        };
      }
    } catch (error) {
      await this.recordError();
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置命令失败'
      };
    }
  }

  /**
   * 验证机器人 token
   */
  async validateToken(token?: string): Promise<{ valid: boolean; botInfo?: any; error?: string }> {
    try {
      const testToken = token || this.getToken();
      
      // 创建临时的 bot 实例进行验证
      const tempBot = new TelegramBot(testToken, { polling: false });
      const botInfo = await tempBot.getMe();
      
      return {
        valid: true,
        botInfo
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '无效的 token'
      };
    }
  }

  /**
   * 比较本地和远程数据的差异
   */
  async compareWithLocal(localData: any): Promise<{
    hasChanges: boolean;
    changes: string[];
    remoteData: SyncData;
  }> {
    try {
      const remoteResult = await this.syncFromTelegram();
      
      if (!remoteResult.success || !remoteResult.data) {
        throw new Error('无法获取远程数据');
      }

      const remoteData = remoteResult.data;
      const changes: string[] = [];

      // 比较名称
      if (localData.name !== remoteData.name) {
        changes.push(`名称: ${localData.name} -> ${remoteData.name}`);
      }

      // 比较描述
      if (localData.description !== remoteData.description) {
        changes.push(`描述: ${localData.description} -> ${remoteData.description}`);
      }

      // 比较命令
      const localCommands = JSON.stringify(localData.commands || []);
      const remoteCommands = JSON.stringify(remoteData.commands || []);
      if (localCommands !== remoteCommands) {
        changes.push('命令列表有变更');
      }

      return {
        hasChanges: changes.length > 0,
        changes,
        remoteData
      };
    } catch (error) {
      throw new Error(`比较数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 推送本地数据到 Telegram
   */
  async pushToTelegram(localData: {
    name?: string;
    description?: string;
    commands?: any[];
  }): Promise<{ success: boolean; results: any[]; errors: string[] }> {
    const results: any[] = [];
    const errors: string[] = [];

    try {
      // 设置名称
      if (localData.name) {
        const nameResult = await this.setBotName(localData.name);
        results.push({ type: 'name', ...nameResult });
        if (!nameResult.success && nameResult.error) {
          errors.push(`设置名称失败: ${nameResult.error}`);
        }
      }

      // 设置描述
      if (localData.description) {
        const descResult = await this.setBotDescription(localData.description);
        results.push({ type: 'description', ...descResult });
        if (!descResult.success && descResult.error) {
          errors.push(`设置描述失败: ${descResult.error}`);
        }
      }

      // 设置命令
      if (localData.commands) {
        const cmdResult = await this.setBotCommands(localData.commands);
        results.push({ type: 'commands', ...cmdResult });
        if (!cmdResult.success && cmdResult.error) {
          errors.push(`设置命令失败: ${cmdResult.error}`);
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : '推送失败');
      return {
        success: false,
        results,
        errors
      };
    }
  }

  /**
   * 获取同步统计信息
   */
  async getSyncStats(): Promise<any> {
    try {
      const syncResult = await this.syncFromTelegram();
      
      return {
        lastSync: syncResult.timestamp,
        success: syncResult.success,
        hasName: !!syncResult.data?.name,
        hasDescription: !!syncResult.data?.description,
        commandCount: syncResult.data?.commands?.length || 0,
        botUsername: syncResult.data?.botInfo?.username,
        error: syncResult.error
      };
    } catch (error) {
      return {
        lastSync: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : '获取统计失败'
      };
    }
  }

  /**
   * 获取机器人 token（从 bot 实例中提取）
   */
  private getToken(): string {
    // 这里需要从 bot 实例中获取 token
    // 由于 node-telegram-bot-api 可能没有直接暴露 token，我们需要其他方式
    // 这是一个占位符实现
    return (this.bot as any).token || '';
  }

  /**
   * 更新活动记录
   */
  private async updateActivity(): Promise<void> {
    if (this.botId) {
      try {
        await this.databaseAdapter.updateLastActivity(this.botId);
      } catch (error) {
        console.error('更新活动记录失败:', error);
      }
    }
  }

  /**
   * 记录错误
   */
  private async recordError(): Promise<void> {
    if (this.botId) {
      try {
        await this.databaseAdapter.incrementErrorCount(this.botId);
      } catch (error) {
        console.error('记录错误失败:', error);
      }
    }
  }
}
