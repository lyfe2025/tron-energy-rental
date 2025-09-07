/**
 * 用户CRUD服务类（安全分离版本）
 * 主入口类，委托调用各个子服务模块
 * 保持原有API接口完全不变，确保外部调用兼容性
 */

import type { User, UserCreateData, UserSearchParams, UserUpdateData } from './UserService.js';

// 导入分离后的子服务模块
import { UserAuthService } from './modules/UserAuthService.js';
import { UserOperationService } from './modules/UserOperationService.js';
import { UserQueryService } from './modules/UserQueryService.js';

export class UserCRUDService {
  /**
   * 获取用户列表
   * 委托给 UserQueryService
   */
  static async getUsers(params: UserSearchParams) {
    return UserQueryService.getUsers(params);
  }

  /**
   * 根据ID获取用户详情
   * 委托给 UserQueryService
   */
  static async getUserById(id: string): Promise<User | null> {
    return UserQueryService.getUserById(id);
  }

  /**
   * 根据Telegram ID获取用户
   * 委托给 UserQueryService
   */
  static async getUserByTelegramId(telegramId: number): Promise<User | null> {
    return UserQueryService.getUserByTelegramId(telegramId);
  }

  /**
   * 根据邮箱获取用户
   * 委托给 UserQueryService
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    return UserQueryService.getUserByEmail(email);
  }

  /**
   * 创建用户
   * 委托给 UserOperationService
   */
  static async createUser(data: UserCreateData): Promise<User> {
    return UserOperationService.createUser(data);
  }

  /**
   * 更新用户信息
   * 委托给 UserOperationService
   */
  static async updateUser(id: string, data: UserUpdateData): Promise<User | null> {
    return UserOperationService.updateUser(id, data);
  }

  /**
   * 更新用户状态
   * 委托给 UserOperationService
   */
  static async updateUserStatus(id: string, status: string): Promise<User | null> {
    return UserOperationService.updateUserStatus(id, status);
  }

  /**
   * 删除用户
   * 委托给 UserOperationService
   */
  static async deleteUser(id: string): Promise<boolean> {
    return UserOperationService.deleteUser(id);
  }

  /**
   * 注册 Telegram 用户
   * 委托给 UserAuthService
   */
  static async registerTelegramUser(telegramData: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  }): Promise<User> {
    return UserAuthService.registerTelegramUser(telegramData);
  }
}