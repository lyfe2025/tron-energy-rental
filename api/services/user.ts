/**
 * 用户服务类主文件
 * 整合所有分离的用户服务模块，保持原有API接口不变
 */

import pool from '../config/database.js';
import { UserCRUDService } from './user/UserCRUDService.js';
import { UserService as BaseUserService } from './user/UserService.js';
import { UserStatsService } from './user/UserStatsService.js';

// 导出所有类型定义
export type {
  User, UserCreateData, UserSearchParams, UserUpdateData
} from './user/UserService.js';

export type {
  UserStats
} from './user/UserStatsService.js';

/**
 * 用户服务类 - 主入口
 * 保持与原文件完全一致的API接口
 */
export class UserService {
  // ========== 基础CRUD操作 (来自BaseUserService) ==========
  
  /**
   * 获取用户列表
   */
  static async getUsers(params: any) {
    return BaseUserService.getUsers(params);
  }

  /**
   * 根据ID获取用户详情
   */
  static async getUserById(id: string) {
    return BaseUserService.getUserById(id);
  }

  /**
   * 根据Telegram ID获取用户
   */
  static async getUserByTelegramId(telegramId: number) {
    return BaseUserService.getUserByTelegramId(telegramId);
  }

  /**
   * 根据邮箱获取用户
   */
  static async getUserByEmail(email: string) {
    return BaseUserService.getUserByEmail(email);
  }

  /**
   * 创建用户
   */
  static async createUser(data: any) {
    return BaseUserService.createUser(data);
  }

  /**
   * 更新用户信息
   */
  static async updateUser(id: string, data: any) {
    return BaseUserService.updateUser(id, data);
  }

  /**
   * 更新用户状态
   */
  static async updateUserStatus(id: string, status: string) {
    return BaseUserService.updateUserStatus(id, status);
  }

  /**
   * 更新用户余额
   */
  static async updateUserBalance(id: string, balance: number, frozenBalance: number = 0) {
    return BaseUserService.updateUserBalance(id, balance, frozenBalance);
  }

  /**
   * 增加用户余额
   */
  static async addUserBalance(id: string, amount: number) {
    return BaseUserService.addUserBalance(id, amount);
  }

  /**
   * 扣减用户余额
   */
  static async deductUserBalance(id: string, amount: number) {
    return BaseUserService.deductUserBalance(id, amount);
  }

  /**
   * 重置用户密码
   */
  static async resetUserPassword(id: string, password: string) {
    return BaseUserService.resetUserPassword(id, password);
  }

  /**
   * 删除用户
   */
  static async deleteUser(id: string) {
    return BaseUserService.deleteUser(id);
  }

  /**
   * 更新用户最后登录时间
   */
  static async updateLastLogin(id: string) {
    return BaseUserService.updateLastLogin(id);
  }

  /**
   * 验证用户密码
   */
  static async verifyPassword(id: string, password: string) {
    return BaseUserService.verifyPassword(id, password);
  }

  // ========== 统计分析功能 (来自UserStatsService) ==========

  /**
   * 获取用户统计数据
   */
  static async getUserStats() {
    return UserStatsService.getUserStats();
  }

  /**
   * 获取用户注册趋势
   */
  static async getRegistrationTrend(days: number = 30) {
    return UserStatsService.getUserGrowthStats(days);
  }

  /**
   * 获取用户活跃度统计
   */
  static async getActivityStats() {
    return UserStatsService.getActivityStats();
  }

  /**
   * 获取用户余额分布统计
   */
  static async getBalanceDistribution() {
    return UserStatsService.getBalanceDistributionStats();
  }

  /**
   * 获取代理商用户分布统计
   */
  static async getAgentUserDistribution() {
    return UserStatsService.getAgentUserStats();
  }

  /**
   * 获取用户增长趋势
   */
  static async getGrowthPrediction(days: number = 30) {
    return UserStatsService.getUserGrowthStats(days);
  }

  // ========== 批量操作功能 ==========

  /**
   * 批量操作用户
   */
  static async bulkAction(action: string, userIds: string[]): Promise<boolean> {
    try {
      const promises = userIds.map(userId => {
        switch (action) {
          case 'activate':
            return this.updateUserStatus(userId, 'active');
          case 'deactivate':
            return this.updateUserStatus(userId, 'inactive');
          case 'ban':
            return this.updateUserStatus(userId, 'banned');
          case 'delete':
            return this.deleteUser(userId);
          default:
            throw new Error(`不支持的批量操作: ${action}`);
        }
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('批量操作失败:', error);
      throw error;
    }
  }

  // ========== 业务逻辑扩展 ==========

  /**
   * 获取用户的订单列表
   */
  static async getUserOrders(userId: string, params: any = {}) {
    const { page = 1, limit = 20, status } = params;
    const offset = (page - 1) * limit;

    const conditions = ['o.user_id = $1'];
    const values = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`o.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT 
        o.*
      FROM orders o
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM orders o
      WHERE ${whereClause}
    `;

    values.push(limit.toString(), offset.toString());

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, values.slice(0, -2))
    ]);

    return {
      orders: dataResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * 获取用户余额变动记录
   */
  static async getUserBalanceHistory(userId: string, params: any = {}) {
    const { page = 1, limit = 20, type } = params;
    const offset = (page - 1) * limit;

    const conditions = ['user_id = $1'];
    const values = [userId];
    let paramIndex = 2;

    if (type) {
      conditions.push(`type = $${paramIndex}`);
      values.push(type);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT *
      FROM balance_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM balance_logs
      WHERE ${whereClause}
    `;

    values.push(limit.toString(), offset.toString());

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, values.slice(0, -2))
    ]);

    return {
      balance_history: dataResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * 转换用户为代理商
   */
  static async promoteToAgent(userId: string, agentData: any): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 创建代理商记录
      const { commission_rate } = agentData;
      const agentCode = await this.generateAgentCode();
      
      const agentQuery = `
        INSERT INTO agents (user_id, agent_code, commission_rate, status)
        VALUES ($1, $2, $3, 'active')
        RETURNING id
      `;
      const agentResult = await client.query(agentQuery, [userId, agentCode, commission_rate]);
      const agentId = agentResult.rows[0].id;

      // 更新用户类型
      const userQuery = `
        UPDATE users 
        SET type = 'agent', updated_at = NOW()
        WHERE id = $1
      `;
      await client.query(userQuery, [userId]);

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 注册 Telegram 用户
   */
  static async registerTelegramUser(telegramData: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
    is_premium?: boolean;  // 新增：Premium用户标识
    bot_id?: string;       // 机器人ID
  }) {
    return UserCRUDService.registerTelegramUser(telegramData);
  }

  /**
   * 生成代理商代码（辅助方法）
   */
  private static async generateAgentCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = 'AG' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 5).toUpperCase();
      
      const exists = await pool.query('SELECT id FROM agents WHERE agent_code = $1', [code]);
      if (exists.rows.length === 0) {
        return code;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    throw new Error('无法生成唯一的代理商代码');
  }
}

// 导出分离的服务类供高级用法使用
export {
  BaseUserService,
  UserStatsService
};

