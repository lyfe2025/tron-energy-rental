/**
 * 用户认证服务类
 * 从 UserCRUDService.ts 中安全分离的认证相关操作
 * 负责用户的Telegram注册等认证相关功能
 */

import pool from '../../../config/database.ts';
import type { User } from '../UserService.ts';
import { UserQueryService } from './UserQueryService.ts';

export class UserAuthService {
  /**
   * 注册 Telegram 用户 - 修复版本
   * 确保保存所有必要信息并正确关联机器人ID
   */
  static async registerTelegramUser(telegramData: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
    is_premium?: boolean;  // 新增：Premium用户标识
    bot_id?: string;       // 机器人ID
  }): Promise<User> {
    const { telegram_id, username, first_name, last_name, language_code, is_premium, bot_id } = telegramData;

    // 🔧 智能语言代码处理
    const processedLanguageCode = UserAuthService.processLanguageCode(language_code, first_name, username);

    console.log(`📝 开始注册Telegram用户:`, {
      telegram_id,
      username,
      first_name,
      last_name,
      original_language_code: language_code,
      processed_language_code: processedLanguageCode,
      is_premium: !!is_premium,
      bot_id,
      language_processing: {
        original: language_code,
        processed: processedLanguageCode,
        detection_method: processedLanguageCode.startsWith('detected_') ? 'name_analysis' : 'telegram_provided',
        is_fallback: processedLanguageCode === 'zh'
      },
      has_all_fields: { username: !!username, last_name: !!last_name, language_code: !!processedLanguageCode, is_premium: !!is_premium }
    });

    // 检查用户是否已存在
    const existingUser = await UserQueryService.getUserByTelegramId(telegram_id);
    if (existingUser) {
      console.log(`👤 用户已存在, ID: ${existingUser.id}`);
      
      // 🔧 检查并更新需要补充的字段
      const needsUpdate: string[] = [];
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      // 检查bot_id
      if (!(existingUser as any).bot_id && bot_id) {
        needsUpdate.push('bot_id');
        updateFields.push(`bot_id = $${paramIndex}`);
        updateValues.push(bot_id);
        paramIndex++;
      }

      // 检查language_code - 如果为空或null，更新它
      const currentLanguageCode = (existingUser as any).language_code;
      if (!currentLanguageCode || currentLanguageCode.trim() === '') {
        needsUpdate.push('language_code');
        updateFields.push(`language_code = $${paramIndex}`);
        updateValues.push(processedLanguageCode);
        paramIndex++;
      }

      // 检查is_premium - 如果为null，更新它
      if ((existingUser as any).is_premium === null || (existingUser as any).is_premium === undefined) {
        needsUpdate.push('is_premium');
        updateFields.push(`is_premium = $${paramIndex}`);
        updateValues.push(is_premium || false);
        paramIndex++;
      }

      // 总是更新最后登录时间
      updateFields.push(`last_login_at = CURRENT_TIMESTAMP`);
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      if (needsUpdate.length > 0) {
        console.log(`🔄 更新现有用户缺失字段:`, {
          user_id: existingUser.id,
          updating_fields: needsUpdate,
          language_code: needsUpdate.includes('language_code') ? processedLanguageCode : 'no_update',
          bot_id: needsUpdate.includes('bot_id') ? bot_id : 'no_update',
          is_premium: needsUpdate.includes('is_premium') ? (is_premium || false) : 'no_update'
        });

        const updateQuery = `
          UPDATE users SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `;
        updateValues.push(existingUser.id);

        await pool.query(updateQuery, updateValues);
        
        // 获取更新后的用户数据
        const updatedUser = await UserQueryService.getUserById(existingUser.id);
        console.log(`✅ 现有用户字段更新成功`, {
          updated_fields: needsUpdate,
          new_language_code: processedLanguageCode
        });
        return updatedUser!;
      } else {
        // 只更新登录时间
        await pool.query(
          'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [existingUser.id]
        );
        console.log(`✅ 现有用户登录时间更新完成`);
        return existingUser;
      }
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

    console.log(`🏗️ 创建新用户: ${finalUsername}`);

    // 🔍 SQL执行前的参数检查
    const sqlParams = [
      finalUsername, telegram_id, first_name, last_name, processedLanguageCode, is_premium || false, bot_id
    ];
    
    console.log(`🔍 SQL参数详细检查:`, {
      sql_params: sqlParams,
      param_details: {
        '$1_username': { value: sqlParams[0], type: typeof sqlParams[0] },
        '$2_telegram_id': { value: sqlParams[1], type: typeof sqlParams[1] },
        '$3_first_name': { value: sqlParams[2], type: typeof sqlParams[2] },
        '$4_last_name': { value: sqlParams[3], type: typeof sqlParams[3] },
        '$5_language_code': { 
          value: sqlParams[4], 
          type: typeof sqlParams[4],
          is_null: sqlParams[4] === null,
          is_undefined: sqlParams[4] === undefined,
          is_empty: sqlParams[4] === ''
        },
        '$6_is_premium': { value: sqlParams[5], type: typeof sqlParams[5] },
        '$7_bot_id': { value: sqlParams[6], type: typeof sqlParams[6] }
      }
    });

    // 完整的SQL语句 - 保存所有Telegram用户信息
    const query = `
      INSERT INTO users (
        username, telegram_id, first_name, last_name, language_code, is_premium,
        login_type, user_type, status, balance,
        bot_id, usdt_balance, trx_balance, last_login_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'telegram', 'normal', 'active', 0, $7, 0, 0, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const result = await pool.query(query, sqlParams);

    const newUser = result.rows[0];
    
    // 记录成功注册日志
    console.log(`✅ Telegram用户注册成功:`, {
      user_id: newUser.id,
      telegram_id,
      username: finalUsername,
      first_name,
      last_name,
      original_language_code: language_code,
      saved_language_code: processedLanguageCode,
      is_premium: is_premium || false,
      bot_id,
      login_type: 'telegram',
      user_type: 'normal',
      status: 'active',
      balances: {
        usdt: 0,
        trx: 0,
        legacy: 0
      }
    });

    return UserQueryService.getUserById(newUser.id);
  }

  /**
   * 验证Telegram用户注册数据完整性
   */
  static async validateTelegramUserRegistration(userId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    try {
      const user = await UserQueryService.getUserById(userId);
      const issues: string[] = [];

      if (!user) {
        return { isValid: false, issues: ['用户不存在'] };
      }

      // 检查必要字段
      if (!user.telegram_id) issues.push('缺少telegram_id');
      if (user.login_type !== 'telegram') issues.push(`登录类型错误: ${user.login_type}, 应为 telegram`);
      if ((user as any).user_type !== 'normal') issues.push(`用户类型错误: ${(user as any).user_type}, 应为 normal`);
      if (!(user as any).bot_id) issues.push('缺少bot_id关联');
      if (user.status !== 'active') issues.push(`用户状态异常: ${user.status}, 应为 active`);
      
      // 检查Telegram用户信息完整性
      if (!user.first_name) issues.push('缺少first_name');
      if ((user as any).language_code === null) issues.push('language_code未保存（可为空但不应为null）');
      if ((user as any).is_premium === null || (user as any).is_premium === undefined) issues.push('is_premium字段未初始化');
      
      // 检查余额初始化
      if (user.usdt_balance === undefined || user.usdt_balance === null) issues.push('USDT余额未初始化');
      if (user.trx_balance === undefined || user.trx_balance === null) issues.push('TRX余额未初始化');

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('验证用户注册数据时出错:', error);
      return {
        isValid: false,
        issues: ['验证过程出错: ' + (error instanceof Error ? error.message : '未知错误')]
      };
    }
  }

  /**
   * 智能处理语言代码
   * 如果Telegram没有提供language_code，尝试从用户名字中推断
   */
  private static processLanguageCode(
    originalLanguageCode?: string,
    firstName?: string,
    username?: string
  ): string {
    // 如果有原始language_code且不为空，直接使用
    if (originalLanguageCode && originalLanguageCode.trim()) {
      return originalLanguageCode.trim().toLowerCase();
    }

    console.log(`🔍 语言代码为空，尝试智能检测:`, {
      original: originalLanguageCode,
      first_name: firstName,
      username: username
    });

    // 尝试从姓名中检测中文字符
    if (firstName || username) {
      const textToCheck = `${firstName || ''} ${username || ''}`.trim();
      
      // 检测中文字符（包括繁体和简体）
      const chineseRegex = /[\u4e00-\u9fff]/;
      if (chineseRegex.test(textToCheck)) {
        console.log(`🔍 检测到中文字符，设置语言为 zh`);
        return 'zh';
      }

      // 检测俄文字符
      const russianRegex = /[\u0400-\u04FF]/;
      if (russianRegex.test(textToCheck)) {
        console.log(`🔍 检测到俄文字符，设置语言为 ru`);
        return 'ru';
      }

      // 检测阿拉伯文字符
      const arabicRegex = /[\u0600-\u06FF]/;
      if (arabicRegex.test(textToCheck)) {
        console.log(`🔍 检测到阿拉伯文字符，设置语言为 ar`);
        return 'ar';
      }

      // 检测日文字符
      const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
      if (japaneseRegex.test(textToCheck)) {
        console.log(`🔍 检测到日文字符，设置语言为 ja`);
        return 'ja';
      }

      // 检测韩文字符
      const koreanRegex = /[\uAC00-\uD7AF]/;
      if (koreanRegex.test(textToCheck)) {
        console.log(`🔍 检测到韩文字符，设置语言为 ko`);
        return 'ko';
      }

      // 如果都是英文字符，默认为英文
      const englishOnlyRegex = /^[a-zA-Z\s\d\-_.]*$/;
      if (englishOnlyRegex.test(textToCheck)) {
        console.log(`🔍 检测到英文字符，设置语言为 en`);
        return 'en';
      }
    }

    // 如果无法检测，默认使用中文（因为这是中文项目）
    console.log(`🔍 无法检测语言，使用默认值 zh`);
    return 'zh';
  }
}
