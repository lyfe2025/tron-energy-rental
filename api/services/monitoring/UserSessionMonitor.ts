/**
 * 用户会话监控模块
 * 负责在线用户管理和会话控制
 */
import { query } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import type { OnlineUser, OnlineUsersResponse, PaginationInfo } from './types/monitoring.types.js';

export class UserSessionMonitor {
  /**
   * 获取在线用户总数
   */
  async getOnlineUserCount(): Promise<number> {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM admin_sessions WHERE is_active = true AND last_activity > NOW() - INTERVAL \'30 minutes\''
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('获取在线用户数量失败:', error);
      throw error;
    }
  }

  /**
   * 获取在线管理员列表
   * 基于活跃会话查询真正在线的用户
   */
  async getOnlineUsers(page: number = 1, limit: number = 10): Promise<OnlineUsersResponse> {
    const offset = (page - 1) * limit;
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
      // 基于活跃会话查询在线用户
      const queryStr = `
        SELECT DISTINCT
          a.id,
          a.username,
          a.email,
          a.role,
          s.last_activity,
          s.ip_address,
          s.user_agent,
          s.login_at as login_time,
          EXTRACT(EPOCH FROM (NOW() - s.login_at)) / 60 as online_duration_minutes
        FROM admins a
        JOIN admin_sessions s ON a.id = s.admin_id
        WHERE s.is_active = true 
          AND s.last_activity >= $1 
          AND a.status = 'active'
        ORDER BY s.last_activity DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(DISTINCT a.id) as total
        FROM admins a
        JOIN admin_sessions s ON a.id = s.admin_id
        WHERE s.is_active = true 
          AND s.last_activity >= $1 
          AND a.status = 'active'
      `;

      const [adminsResult, countResult] = await Promise.all([
        query(queryStr, [thirtyMinutesAgo, limit, offset]),
        query(countQuery, [thirtyMinutesAgo])
      ]);

      const users: OnlineUser[] = adminsResult.rows.map(admin => ({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastActivity: admin.last_activity,
        loginTime: admin.login_time,
        ipAddress: admin.ip_address,
        userAgent: admin.user_agent,
        onlineDuration: Math.round(admin.online_duration_minutes)
      }));

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      const pagination: PaginationInfo = {
        page,
        limit,
        total,
        totalPages
      };

      return {
        users,
        pagination
      };
    } catch (error) {
      logger.error('获取在线用户失败:', error);
      throw error;
    }
  }

  /**
   * 强制下线用户（通过会话ID）
   */
  async forceLogoutUser(sessionId: string) {
    try {
      const result = await query(
        'UPDATE admin_sessions SET is_active = false WHERE id = $1 RETURNING *',
        [sessionId]
      );

      if (result.rows.length === 0) {
        throw new Error('会话不存在');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('强制下线用户失败:', error);
      throw error;
    }
  }

  /**
   * 强制下线用户（通过用户ID）
   * 将指定用户的所有活跃会话设为非活跃状态
   */
  async forceLogoutUserById(userId: string) {
    try {
      // 首先检查用户是否存在
      const userCheck = await query(
        'SELECT id, username FROM admins WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        throw new Error('用户不存在');
      }

      const user = userCheck.rows[0];

      // 将该用户的所有活跃会话设为非活跃
      const result = await query(
        `UPDATE admin_sessions 
         SET is_active = false, 
             updated_at = NOW() 
         WHERE admin_id = $1 
           AND is_active = true 
         RETURNING id, admin_id, ip_address, login_at`,
        [userId]
      );

      logger.info(`强制下线用户 ${user.username} (ID: ${userId}), 关闭了 ${result.rows.length} 个会话`);

      return {
        userId: userId,
        username: user.username,
        loggedOutSessions: result.rows.length,
        sessions: result.rows
      };
    } catch (error) {
      logger.error('通过用户ID强制下线失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户会话详情
   */
  async getUserSessions(userId: string) {
    try {
      const result = await query(
        `SELECT 
          id,
          admin_id,
          ip_address,
          user_agent,
          login_at,
          last_activity,
          is_active,
          created_at,
          updated_at
         FROM admin_sessions 
         WHERE admin_id = $1 
         ORDER BY last_activity DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('获取用户会话详情失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期会话
   * 将超过指定时间未活动的会话标记为非活跃
   */
  async cleanupExpiredSessions(hoursAgo: number = 24) {
    try {
      const expiredTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      
      const result = await query(
        `UPDATE admin_sessions 
         SET is_active = false, 
             updated_at = NOW() 
         WHERE is_active = true 
           AND last_activity < $1 
         RETURNING id, admin_id, last_activity`,
        [expiredTime]
      );

      logger.info(`清理了 ${result.rows.length} 个过期会话`);
      
      return {
        cleanedCount: result.rows.length,
        cleanedSessions: result.rows
      };
    } catch (error) {
      logger.error('清理过期会话失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
          COUNT(CASE WHEN is_active = true AND last_activity > NOW() - INTERVAL '30 minutes' THEN 1 END) as online_sessions,
          COUNT(CASE WHEN is_active = true AND last_activity > NOW() - INTERVAL '5 minutes' THEN 1 END) as recent_active_sessions,
          COUNT(DISTINCT admin_id) as unique_users,
          COUNT(DISTINCT CASE WHEN is_active = true THEN admin_id END) as unique_active_users
        FROM admin_sessions
      `;

      const result = await query(statsQuery);
      const stats = result.rows[0];

      return {
        totalSessions: parseInt(stats.total_sessions),
        activeSessions: parseInt(stats.active_sessions),
        onlineSessions: parseInt(stats.online_sessions),
        recentActiveSessions: parseInt(stats.recent_active_sessions),
        uniqueUsers: parseInt(stats.unique_users),
        uniqueActiveUsers: parseInt(stats.unique_active_users)
      };
    } catch (error) {
      logger.error('获取会话统计失败:', error);
      throw error;
    }
  }
}
