/**
 * 代理商代码服务类
 * 从 AgentService.ts 中安全分离的代码生成和验证操作
 * 负责代理商代码的生成、验证和管理
 */

import pool from '../../config/database.ts';

export class AgentCodeService {
  /**
   * 检查代理商代码是否存在
   */
  static async checkAgentCodeExists(agentCode: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT id FROM agents WHERE agent_code = $1';
    const values = [agentCode];

    if (excludeId) {
      query += ' AND id != $2';
      values.push(excludeId);
    }

    const result = await pool.query(query, values);
    return result.rows.length > 0;
  }

  /**
   * 生成唯一的代理商代码
   */
  static async generateAgentCode(): Promise<string> {
    const generateRandomCode = (): string => {
      // 生成格式为 AGENT + 6位随机数字
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      return `AGENT${randomNum}`;
    };

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = generateRandomCode();
      const exists = await this.checkAgentCodeExists(code);
      
      if (!exists) {
        return code;
      }
      
      attempts++;
    }

    // 如果10次尝试都失败，使用时间戳确保唯一性
    const timestamp = Date.now().toString().slice(-6);
    const fallbackCode = `AGENT${timestamp}`;
    
    const exists = await this.checkAgentCodeExists(fallbackCode);
    if (!exists) {
      return fallbackCode;
    }

    // 最终备用方案：使用UUID后6位
    const uuid = require('crypto').randomUUID();
    const uuidSuffix = uuid.replace('-', '').slice(-6).toUpperCase();
    return `AGENT${uuidSuffix}`;
  }

  /**
   * 根据用户名生成个性化代理商代码
   */
  static async generatePersonalizedAgentCode(username: string): Promise<string> {
    // 清理用户名，只保留字母和数字
    const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (cleanUsername.length >= 3) {
      // 使用用户名前缀 + 随机数字
      const prefix = cleanUsername.slice(0, Math.min(6, cleanUsername.length));
      const randomNum = Math.floor(100 + Math.random() * 900);
      const personalizedCode = `${prefix}${randomNum}`;
      
      const exists = await this.checkAgentCodeExists(personalizedCode);
      if (!exists) {
        return personalizedCode;
      }
    }

    // 如果个性化代码已存在或用户名不适合，回退到标准生成
    return await this.generateAgentCode();
  }

  /**
   * 批量生成代理商代码
   */
  static async generateBatchAgentCodes(count: number): Promise<string[]> {
    const codes: string[] = [];
    const maxAttempts = count * 2; // 防止无限循环
    let attempts = 0;

    while (codes.length < count && attempts < maxAttempts) {
      const code = await this.generateAgentCode();
      if (!codes.includes(code)) {
        codes.push(code);
      }
      attempts++;
    }

    return codes;
  }

  /**
   * 验证代理商代码格式
   */
  static validateAgentCodeFormat(agentCode: string): { valid: boolean; message?: string } {
    // 基本格式验证
    if (!agentCode || agentCode.trim().length === 0) {
      return { valid: false, message: '代理商代码不能为空' };
    }

    // 长度验证
    if (agentCode.length < 3 || agentCode.length > 20) {
      return { valid: false, message: '代理商代码长度必须在3-20个字符之间' };
    }

    // 字符验证 - 只允许字母、数字和下划线
    const validPattern = /^[A-Za-z0-9_]+$/;
    if (!validPattern.test(agentCode)) {
      return { valid: false, message: '代理商代码只能包含字母、数字和下划线' };
    }

    // 不能以数字开头
    if (/^\d/.test(agentCode)) {
      return { valid: false, message: '代理商代码不能以数字开头' };
    }

    return { valid: true };
  }

  /**
   * 获取代理商代码使用统计
   */
  static async getAgentCodeStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    prefixStats: { prefix: string; count: number }[];
  }> {
    // 基础统计
    const basicStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended
      FROM agents
    `;
    
    const basicResult = await pool.query(basicStatsQuery);
    const basicStats = basicResult.rows[0];

    // 前缀统计（取代码前3个字符）
    const prefixStatsQuery = `
      SELECT 
        LEFT(agent_code, 3) as prefix,
        COUNT(*) as count
      FROM agents
      GROUP BY LEFT(agent_code, 3)
      ORDER BY count DESC
      LIMIT 10
    `;
    
    const prefixResult = await pool.query(prefixStatsQuery);
    const prefixStats = prefixResult.rows.map(row => ({
      prefix: row.prefix,
      count: parseInt(row.count)
    }));

    return {
      total: parseInt(basicStats.total),
      active: parseInt(basicStats.active),
      inactive: parseInt(basicStats.inactive),
      suspended: parseInt(basicStats.suspended),
      prefixStats
    };
  }

  /**
   * 检查代理商代码是否为系统保留
   */
  static isReservedAgentCode(agentCode: string): boolean {
    const reservedCodes = [
      'ADMIN', 'SYSTEM', 'ROOT', 'SUPER', 'MASTER',
      'API', 'BOT', 'SERVICE', 'DEFAULT', 'TEST'
    ];

    const upperCode = agentCode.toUpperCase();
    return reservedCodes.some(reserved => upperCode.includes(reserved));
  }

  /**
   * 获取代理商代码建议
   */
  static async suggestAgentCodes(baseName: string, count: number = 5): Promise<string[]> {
    const suggestions: string[] = [];
    const cleanBase = baseName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (cleanBase.length >= 3) {
      const basePrefix = cleanBase.slice(0, Math.min(6, cleanBase.length));
      
      // 生成不同变体的建议
      for (let i = 1; i <= count; i++) {
        const randomSuffix = Math.floor(10 + Math.random() * 90);
        const suggestion = `${basePrefix}${randomSuffix}`;
        
        const exists = await this.checkAgentCodeExists(suggestion);
        if (!exists && !this.isReservedAgentCode(suggestion)) {
          suggestions.push(suggestion);
        }
      }
    }

    // 如果建议不够，补充标准代码
    while (suggestions.length < count) {
      const standardCode = await this.generateAgentCode();
      if (!suggestions.includes(standardCode)) {
        suggestions.push(standardCode);
      }
    }

    return suggestions.slice(0, count);
  }
}
