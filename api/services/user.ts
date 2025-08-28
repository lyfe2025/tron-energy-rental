/**
 * 用户服务
 * 实现用户注册、认证和管理功能
 * 注意：这是临时简化版本，主要为了确保服务启动
 */

import { query } from '../config/database.js';

export interface TelegramUserData {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

export interface User {
  id: number;
  telegram_id?: number;
  username?: string;
  email?: string;
  tron_address?: string;
  usdt_balance?: number;
  trx_balance?: number;
  total_orders?: number;
  total_spent?: number;
  total_energy_used?: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface BotUser {
  id: number;
  user_id: number;
  bot_id: number;
  telegram_user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class UserService {
  /**
   * 通过Telegram ID获取用户
   */
  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const result = await query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [telegramId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error) {
      console.error('Error getting user by telegram ID:', error);
      throw error;
    }
  }

  /**
   * 通过用户ID获取用户
   */
  async getUserById(userId: number): Promise<User | null> {
    try {
      const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * 注册Telegram用户
   */
  async registerTelegramUser(userData: TelegramUserData): Promise<User> {
    try {
      // 检查用户是否已存在
      const existingUser = await this.getUserByTelegramId(userData.telegram_id);
      if (existingUser) {
        // 更新用户信息
        await this.updateTelegramUser(existingUser.id, userData);
        return await this.getUserById(existingUser.id) as User;
      }

      // 创建新用户
      const result = await query(
        `INSERT INTO users (
          telegram_id, username, status, created_at, updated_at
        ) VALUES ($1, $2, 'active', NOW(), NOW()) RETURNING id`,
        [userData.telegram_id, userData.username]
      );

      const userId = result.rows[0].id;

      // 创建bot_users记录
      await this.createBotUser(userId, userData);

      return await this.getUserById(userId) as User;
    } catch (error) {
      console.error('Error registering telegram user:', error);
      throw error;
    }
  }

  /**
   * 更新Telegram用户信息
   */
  async updateTelegramUser(userId: number, userData: TelegramUserData): Promise<void> {
    try {
      await query(
        `UPDATE users SET 
          username = $1, 
          updated_at = NOW() 
        WHERE id = $2`,
        [userData.username, userId]
      );

      // 更新bot_users记录
      await query(
        `UPDATE bot_users SET 
          username = $1, 
          first_name = $2, 
          last_name = $3, 
          language_code = $4, 
          updated_at = NOW() 
        WHERE user_id = $5 AND telegram_user_id = $6`,
        [
          userData.username,
          userData.first_name,
          userData.last_name,
          userData.language_code,
          userId,
          userData.telegram_id
        ]
      );
    } catch (error) {
      console.error('Error updating telegram user:', error);
      throw error;
    }
  }

  /**
   * 创建bot_users记录
   */
  async createBotUser(userId: number, userData: TelegramUserData): Promise<void> {
    try {
      // 获取默认机器人ID（假设为1）
      const botId = 1;

      await query(
        `INSERT INTO bot_users (
          user_id, bot_id, telegram_user_id, username, 
          first_name, last_name, language_code, 
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())`,
        [
          userId,
          botId,
          userData.telegram_id,
          userData.username,
          userData.first_name,
          userData.last_name,
          userData.language_code
        ]
      );
    } catch (error) {
      console.error('Error creating bot user:', error);
      throw error;
    }
  }

  /**
   * 获取用户的bot信息
   */
  async getUserBotInfo(userId: number): Promise<BotUser | null> {
    try {
      const result = await query(
        'SELECT * FROM bot_users WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as BotUser;
    } catch (error) {
      console.error('Error getting user bot info:', error);
      throw error;
    }
  }

  /**
   * 其他方法暂时简化实现，确保服务可以启动
   */
  async updateUserBalance(userId: number, usdtBalance?: number, trxBalance?: number): Promise<void> {
    console.log('updateUserBalance - 临时实现');
  }

  async addUserBalance(userId: number, usdtAmount?: number, trxAmount?: number): Promise<void> {
    console.log('addUserBalance - 临时实现');
  }

  async deductUserBalance(userId: number, usdtAmount?: number, trxAmount?: number): Promise<boolean> {
    console.log('deductUserBalance - 临时实现');
    return true;
  }

  async updateUserStats(userId: number, orderCount?: number, totalSpent?: number, energyUsed?: number): Promise<void> {
    console.log('updateUserStats - 临时实现');
  }

  async setUserTronAddress(userId: number, tronAddress: string): Promise<void> {
    console.log('setUserTronAddress - 临时实现');
  }

  async getUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
    console.log('getUsers - 临时实现');
    return [];
  }

  async getUserCount(): Promise<number> {
    console.log('getUserCount - 临时实现');
    return 0;
  }
}