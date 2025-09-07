/**
 * 用户认证服务类
 * 从 UserCRUDService.ts 中安全分离的认证相关操作
 * 负责用户的Telegram注册等认证相关功能
 */

import pool from '../../../config/database.js';
import type { User } from '../UserService.js';
import { UserQueryService } from './UserQueryService.js';

export class UserAuthService {
  /**
   * 注册 Telegram 用户
   */
  static async registerTelegramUser(telegramData: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  }): Promise<User> {
    const { telegram_id, username, first_name, last_name } = telegramData;

    // 检查用户是否已存在
    const existingUser = await UserQueryService.getUserByTelegramId(telegram_id);
    if (existingUser) {
      return existingUser;
    }

    // 生成用户名
    let displayName = username || first_name || 'User';
    if (first_name && last_name) {
      displayName = `${first_name} ${last_name}`;
    } else if (first_name) {
      displayName = first_name;
    }

    // 确保用户名唯一
    let finalUsername = displayName;
    let counter = 1;
    while (true) {
      const existingUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [finalUsername]
      );
      if (existingUsername.rows.length === 0) {
        break;
      }
      finalUsername = `${displayName}_${counter}`;
      counter++;
    }

    const query = `
      INSERT INTO users (
        username, telegram_id, telegram_username, login_type, 
        type, user_type, status, balance, frozen_balance
      )
      VALUES ($1, $2, $3, 'telegram', 'user', 'regular', 'active', 0, 0)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      finalUsername, telegram_id, username
    ]);

    return UserQueryService.getUserById(result.rows[0].id);
  }
}
