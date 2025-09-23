/**
 * 管理员统计服务类
 * 从 AdminService.ts 中安全分离的统计相关操作
 * 负责管理员数据统计、分析和报表功能
 */

import pool from '../../config/database.ts';

export interface AdminStats {
  total: number;
  active: number;
  inactive: number;
  by_role: {
    super_admin: number;
    admin: number;
    operator: number;
    [key: string]: number;
  };
  new_admins_today: number;
  new_admins_this_week: number;
  new_admins_this_month: number;
  recent_logins: number;
}

export interface AdminActivityStats {
  date: string;
  new_admins: number;
  active_logins: number;
}

export class AdminStatsService {
  /**
   * 获取管理员统计概览
   */
  static async getAdminStats(): Promise<AdminStats> {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 基础统计查询
    const basicStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as new_admins_today,
        COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_admins_this_week,
        COUNT(CASE WHEN created_at >= $2 THEN 1 END) as new_admins_this_month,
        COUNT(CASE WHEN last_login >= CURRENT_DATE THEN 1 END) as recent_logins
      FROM admins
    `;
    
    const basicStatsResult = await pool.query(basicStatsQuery, [weekAgo, monthAgo]);
    const basicStats = basicStatsResult.rows[0];

    // 角色分布统计
    const roleStatsQuery = `
      SELECT 
        r.code as role_code,
        COUNT(*) as count
      FROM admins a
      INNER JOIN admin_roles ar ON a.id = ar.admin_id
      INNER JOIN roles r ON ar.role_id = r.id
      WHERE a.status = 'active' AND r.status = 1
      GROUP BY r.code
    `;
    const roleStatsResult = await pool.query(roleStatsQuery);
    
    const by_role = {
      super_admin: 0,
      admin: 0,
      operator: 0
    };
    
    // 角色映射：将数据库中的角色映射到前端期望的三个类别
    const roleMapping: { [key: string]: keyof typeof by_role } = {
      'super_admin': 'super_admin',
      'system_admin': 'admin',
      'dept_admin': 'admin',
      'admin': 'admin',
      'operator': 'operator'
    };
    
    roleStatsResult.rows.forEach(row => {
      const mappedRole = roleMapping[row.role_code];
      if (mappedRole) {
        by_role[mappedRole] += parseInt(row.count);
      }
    });

    return {
      total: parseInt(basicStats.total),
      active: parseInt(basicStats.active),
      inactive: parseInt(basicStats.inactive),
      by_role,
      new_admins_today: parseInt(basicStats.new_admins_today),
      new_admins_this_week: parseInt(basicStats.new_admins_this_week),
      new_admins_this_month: parseInt(basicStats.new_admins_this_month),
      recent_logins: parseInt(basicStats.recent_logins)
    };
  }

  /**
   * 获取管理员活动趋势数据
   */
  static async getAdminActivityStats(days: number = 30): Promise<AdminActivityStats[]> {
    const query = `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      )
      SELECT 
        ds.date::text,
        COALESCE(daily_new.new_admins, 0) as new_admins,
        COALESCE(daily_logins.active_logins, 0) as active_logins
      FROM date_series ds
      LEFT JOIN (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_admins
        FROM admins
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
      ) daily_new ON ds.date = daily_new.date
      LEFT JOIN (
        SELECT 
          DATE(last_login) as date,
          COUNT(DISTINCT id) as active_logins
        FROM admins
        WHERE last_login >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(last_login)
      ) daily_logins ON ds.date = daily_logins.date
      ORDER BY ds.date
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      date: row.date,
      new_admins: parseInt(row.new_admins),
      active_logins: parseInt(row.active_logins)
    }));
  }

  /**
   * 获取部门管理员分布统计
   */
  static async getDepartmentAdminStats(): Promise<{ departmentId: number; departmentName: string; adminCount: number }[]> {
    const query = `
      SELECT 
        d.id as department_id,
        d.name as department_name,
        COUNT(a.id) as admin_count
      FROM departments d
      LEFT JOIN admins a ON d.id = a.department_id AND a.status = 'active'
      WHERE d.status = 'active'
      GROUP BY d.id, d.name
      ORDER BY admin_count DESC
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      departmentId: row.department_id,
      departmentName: row.department_name,
      adminCount: parseInt(row.admin_count)
    }));
  }

  /**
   * 获取岗位管理员分布统计
   */
  static async getPositionAdminStats(): Promise<{ positionId: number; positionName: string; adminCount: number }[]> {
    const query = `
      SELECT 
        p.id as position_id,
        p.name as position_name,
        COUNT(a.id) as admin_count
      FROM positions p
      LEFT JOIN admins a ON p.id = a.position_id AND a.status = 'active'
      WHERE p.status = 'active'
      GROUP BY p.id, p.name
      ORDER BY admin_count DESC
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      positionId: row.position_id,
      positionName: row.position_name,
      adminCount: parseInt(row.admin_count)
    }));
  }

  /**
   * 获取管理员登录频率统计
   */
  static async getLoginFrequencyStats(): Promise<{
    daily_active: number;
    weekly_active: number;
    monthly_active: number;
    never_logged_in: number;
    inactive_7_days: number;
    inactive_30_days: number;
  }> {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const query = `
      SELECT 
        COUNT(CASE WHEN DATE(last_login) = CURRENT_DATE THEN 1 END) as daily_active,
        COUNT(CASE WHEN last_login >= $1 THEN 1 END) as weekly_active,
        COUNT(CASE WHEN last_login >= $2 THEN 1 END) as monthly_active,
        COUNT(CASE WHEN last_login IS NULL THEN 1 END) as never_logged_in,
        COUNT(CASE WHEN last_login < $1 AND last_login IS NOT NULL THEN 1 END) as inactive_7_days,
        COUNT(CASE WHEN last_login < $2 AND last_login IS NOT NULL THEN 1 END) as inactive_30_days
      FROM admins
      WHERE status = 'active'
    `;

    const result = await pool.query(query, [weekAgo, monthAgo]);
    const stats = result.rows[0];

    return {
      daily_active: parseInt(stats.daily_active),
      weekly_active: parseInt(stats.weekly_active),
      monthly_active: parseInt(stats.monthly_active),
      never_logged_in: parseInt(stats.never_logged_in),
      inactive_7_days: parseInt(stats.inactive_7_days),
      inactive_30_days: parseInt(stats.inactive_30_days)
    };
  }

  /**
   * 获取管理员权限分配统计
   */
  static async getPermissionStats(): Promise<{ permission: string; admin_count: number }[]> {
    const query = `
      SELECT 
        m.permission,
        COUNT(DISTINCT a.id) as admin_count
      FROM menus m
      JOIN role_permissions rp ON m.id = rp.menu_id
      JOIN admin_roles ar ON rp.role_id = ar.role_id
      JOIN admins a ON ar.admin_id = a.id
      WHERE a.status = 'active' AND m.permission IS NOT NULL
      GROUP BY m.permission
      ORDER BY admin_count DESC
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      permission: row.permission,
      admin_count: parseInt(row.admin_count)
    }));
  }

  /**
   * 获取特定管理员的统计信息
   */
  static async getAdminPersonalStats(adminId: string): Promise<{
    login_count: number;
    registration_days: number;
    last_login_days: number | null;
    permissions_count: number;
    managed_users: number;
  } | null> {
    // 基础信息查询
    const basicQuery = `
      SELECT 
        a.created_at,
        a.last_login,
        COUNT(DISTINCT rp.menu_id) as permissions_count
      FROM admins a
      LEFT JOIN admin_roles ar ON a.id = ar.admin_id
      LEFT JOIN role_permissions rp ON ar.role_id = rp.role_id
      WHERE a.id = $1
      GROUP BY a.id, a.created_at, a.last_login
    `;

    const basicResult = await pool.query(basicQuery, [adminId]);
    if (basicResult.rows.length === 0) {
      return null;
    }

    const data = basicResult.rows[0];
    const now = new Date();
    const registrationDate = new Date(data.created_at);
    const registrationDays = Math.floor((now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let lastLoginDays = null;
    if (data.last_login) {
      const lastLoginDate = new Date(data.last_login);
      lastLoginDays = Math.floor((now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // 获取管理的用户数量（如果适用）
    const managedUsersQuery = `
      SELECT COUNT(*) as managed_users
      FROM users u
      WHERE u.created_by = $1 OR u.updated_by = $1
    `;
    
    let managedUsers = 0;
    try {
      const managedUsersResult = await pool.query(managedUsersQuery, [adminId]);
      managedUsers = parseInt(managedUsersResult.rows[0].managed_users || 0);
    } catch (error) {
      // 如果表结构不支持此查询，则跳过
      managedUsers = 0;
    }

    return {
      login_count: 0, // 可以扩展添加登录次数统计
      registration_days: registrationDays,
      last_login_days: lastLoginDays,
      permissions_count: parseInt(data.permissions_count),
      managed_users: managedUsers
    };
  }
}