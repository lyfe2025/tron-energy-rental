/**
 * 用户服务门面类（安全分离后的主入口）
 * 保持原有API接口不变，内部调用分离后的专门服务
 * 确保向后兼容性，外部调用无需修改
 */

// 导出类型定义，保持向后兼容
export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  telegram_id?: number;
  telegram_username?: string;
  wallet_address?: string;
  tron_address?: string;
  balance: number;
  usdt_balance?: number;
  trx_balance?: number;
  frozen_balance: number;
  status: 'active' | 'inactive' | 'banned';
  login_type: 'telegram' | 'email';
  type: 'user' | 'agent';
  user_type: 'regular' | 'vip' | 'premium';
  agent_id?: string;
  total_orders?: number;
  total_spent?: number;
  total_energy_used?: number;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  // 关联的代理商信息
  agent?: {
    id: string;
    agent_code: string;
    username?: string;
  };
}

export interface UserSearchParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  login_type?: string;
  type?: string;
  user_type?: string;
  agent_id?: string;
  bot_filter?: string;  // 新增：机器人筛选
  date_range?: {
    start?: string;
    end?: string;
  };
}

export interface UserCreateData {
  username: string;
  email?: string;
  phone?: string;
  telegram_id?: number;
  telegram_username?: string;
  wallet_address?: string;
  password?: string;
  login_type: 'telegram' | 'email';
  type?: 'user' | 'agent';
  user_type?: 'regular' | 'vip' | 'premium';
  agent_id?: string;
  status?: 'active' | 'inactive' | 'banned';
  bot_id?: string;
}

export interface UserUpdateData {
  username?: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  tron_address?: string;
  status?: 'active' | 'inactive' | 'banned';
  user_type?: 'regular' | 'vip' | 'premium';
  agent_id?: string;
  bot_id?: string;
  balance?: number;
  usdt_balance?: number;
  trx_balance?: number;
  referral_code?: string;
  referred_by?: string;
  password?: string;
}

// 导入分离后的服务
import { UserAuthService } from './UserAuthService.js';
import { UserBalanceService } from './UserBalanceService.js';
import { UserCRUDService } from './UserCRUDService.js';
import { UserStatsService } from './UserStatsService.js';

/**
 * 用户服务门面类
 * 提供统一的接口，内部调用分离后的专门服务
 */
export class UserService {
  // =================== CRUD 操作 ===================
  
  /**
   * 获取用户列表
   */
  static async getUsers(params: UserSearchParams) {
    return await UserCRUDService.getUsers(params);
  }

  /**
   * 根据ID获取用户详情
   */
  static async getUserById(id: string): Promise<User | null> {
    return await UserCRUDService.getUserById(id);
  }

  /**
   * 根据Telegram ID获取用户
   */
  static async getUserByTelegramId(telegramId: number): Promise<User | null> {
    return await UserCRUDService.getUserByTelegramId(telegramId);
  }

  /**
   * 根据邮箱获取用户
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    return await UserCRUDService.getUserByEmail(email);
  }

  /**
   * 创建用户
   */
  static async createUser(data: UserCreateData): Promise<User> {
    return await UserCRUDService.createUser(data);
  }

  /**
   * 更新用户信息
   */
  static async updateUser(id: string, data: UserUpdateData): Promise<User | null> {
    return await UserCRUDService.updateUser(id, data);
  }

  /**
   * 更新用户状态
   */
  static async updateUserStatus(id: string, status: string): Promise<User | null> {
    return await UserCRUDService.updateUserStatus(id, status);
  }

  /**
   * 删除用户
   */
  static async deleteUser(id: string): Promise<boolean> {
    return await UserCRUDService.deleteUser(id);
  }

  // =================== 余额操作 ===================

  /**
   * 更新用户余额
   */
  static async updateUserBalance(id: string, balance: number, frozenBalance: number = 0): Promise<User | null> {
    return await UserBalanceService.updateUserBalance(id, balance, frozenBalance);
  }

  /**
   * 增加用户余额
   */
  static async addUserBalance(id: string, amount: number): Promise<User | null> {
    return await UserBalanceService.addUserBalance(id, amount);
  }

  /**
   * 扣减用户余额
   */
  static async deductUserBalance(id: string, amount: number): Promise<User | null> {
    return await UserBalanceService.deductUserBalance(id, amount);
  }

  // =================== 认证操作 ===================

  /**
   * 验证用户密码
   */
  static async verifyPassword(id: string, password: string): Promise<boolean> {
    return await UserAuthService.verifyPassword(id, password);
  }

  /**
   * 重置用户密码
   */
  static async resetUserPassword(id: string, password: string): Promise<boolean> {
    return await UserAuthService.resetUserPassword(id, password);
  }

  /**
   * 更新用户最后登录时间
   */
  static async updateLastLogin(id: string): Promise<void> {
    return await UserAuthService.updateLastLogin(id);
  }

  // =================== 统计功能 ===================

  /**
   * 获取用户统计数据
   */
  static async getUserStats() {
    return await UserStatsService.getUserStats();
  }

  /**
   * 获取用户增长趋势数据
   */
  static async getUserGrowthStats(days: number = 30) {
    return await UserStatsService.getUserGrowthStats(days);
  }

  // =================== 扩展功能 ===================

  /**
   * 检查用户余额是否充足
   */
  static async checkSufficientBalance(id: string, requiredAmount: number): Promise<boolean> {
    return await UserBalanceService.checkSufficientBalance(id, requiredAmount);
  }

  /**
   * 获取用户余额信息
   */
  static async getUserBalance(id: string) {
    return await UserBalanceService.getUserBalance(id);
  }

  /**
   * 冻结用户余额
   */
  static async freezeBalance(id: string, amount: number): Promise<User | null> {
    return await UserBalanceService.freezeBalance(id, amount);
  }

  /**
   * 解冻用户余额
   */
  static async unfreezeBalance(id: string, amount: number): Promise<User | null> {
    return await UserBalanceService.unfreezeBalance(id, amount);
  }

  /**
   * 验证用户邮箱和密码（用于登录）
   */
  static async validateEmailLogin(email: string, password: string) {
    return await UserAuthService.validateEmailLogin(email, password);
  }

  /**
   * 检查用户是否存在密码
   */
  static async hasPassword(id: string): Promise<boolean> {
    return await UserAuthService.hasPassword(id);
  }

  /**
   * 设置用户密码（首次设置）
   */
  static async setPassword(id: string, password: string): Promise<boolean> {
    return await UserAuthService.setPassword(id, password);
  }

  /**
   * 修改用户密码（需要验证旧密码）
   */
  static async changePassword(id: string, oldPassword: string, newPassword: string): Promise<boolean> {
    return await UserAuthService.changePassword(id, oldPassword, newPassword);
  }

  /**
   * 检查用户状态是否允许登录
   */
  static async canLogin(id: string): Promise<boolean> {
    return await UserAuthService.canLogin(id);
  }

  /**
   * 获取代理商用户分布统计
   */
  static async getAgentUserStats() {
    return await UserStatsService.getAgentUserStats();
  }

  /**
   * 获取用户余额分布统计
   */
  static async getBalanceDistributionStats() {
    return await UserStatsService.getBalanceDistributionStats();
  }

  /**
   * 获取用户活跃度统计
   */
  static async getActivityStats() {
    return await UserStatsService.getActivityStats();
  }

  /**
   * 获取特定用户的统计信息
   */
  static async getUserPersonalStats(userId: string) {
    return await UserStatsService.getUserPersonalStats(userId);
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
  }): Promise<User> {
    return await UserCRUDService.registerTelegramUser(telegramData);
  }
}