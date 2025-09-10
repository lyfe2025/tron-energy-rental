/**
 * Telegram机器人通知验证器
 * 提供各种通知数据的验证函数
 */

/**
 * 验证通知类型是否支持
 */
export function isValidNotificationType(type: string): boolean {
  const validTypes = [
    // 系统通知
    'maintenance_notice',
    'maintenance_start', 
    'maintenance_complete',
    'system_alert',
    'security_warning',
    
    // 业务通知
    'order_created',
    'payment_success',
    'payment_failed',
    'energy_delegation_complete',
    'energy_delegation_failed',
    'order_status_update',
    
    // 代理通知
    'application_submitted',
    'application_approved',
    'application_rejected',
    'commission_earned',
    'level_upgrade',
    'withdrawal_completed',
    
    // 价格通知
    'price_increase',
    'price_decrease',
    'new_package',
    'limited_offer',
    
    // 营销通知
    'important_announcement',
    'policy_change',
    'holiday_greeting',
    'new_feature',
    'user_reactivation'
  ];
  
  return validTypes.includes(type);
}

/**
 * 验证目标用户类型
 */
export function isValidTargetUserType(targetType: string): boolean {
  const validTargetTypes = [
    'all',           // 所有用户
    'active_only',   // 仅活跃用户
    'agents_only',   // 仅代理用户
    'vip_only',      // 仅VIP用户
    'custom'         // 自定义用户群体
  ];
  
  return validTargetTypes.includes(targetType);
}

/**
 * 验证通知紧急程度
 */
export function isValidUrgencyLevel(urgency: string): boolean {
  const validUrgencyLevels = ['low', 'normal', 'high'];
  return validUrgencyLevels.includes(urgency);
}

/**
 * 验证语言代码
 */
export function isValidLanguageCode(language: string): boolean {
  const validLanguages = [
    'zh',    // 中文
    'en',    // 英文
    'es',    // 西班牙文
    'fr',    // 法文
    'de',    // 德文
    'ja',    // 日文
    'ko',    // 韩文
    'ru',    // 俄文
    'ar',    // 阿拉伯文
    'th'     // 泰文
  ];
  
  return validLanguages.includes(language);
}

/**
 * 验证模板解析模式
 */
export function isValidParseMode(parseMode: string): boolean {
  const validParseModes = ['Markdown', 'HTML', 'MarkdownV2'];
  return validParseModes.includes(parseMode);
}

/**
 * 验证模板分类
 */
export function isValidTemplateCategory(category: string): boolean {
  const validCategories = [
    'business',    // 业务类
    'system',      // 系统类
    'marketing',   // 营销类
    'agent',       // 代理类
    'notification', // 通知类
    'custom'       // 自定义类
  ];
  
  return validCategories.includes(category);
}

/**
 * 验证按钮配置
 */
export function validateButtonConfig(buttons: any[]): { valid: boolean; error?: string } {
  if (!Array.isArray(buttons)) {
    return { valid: false, error: '按钮配置必须是数组格式' };
  }

  for (let i = 0; i < buttons.length; i++) {
    const row = buttons[i];
    
    if (!Array.isArray(row)) {
      return { valid: false, error: `第${i + 1}行按钮配置必须是数组格式` };
    }

    for (let j = 0; j < row.length; j++) {
      const button = row[j];
      
      if (!button.text || typeof button.text !== 'string') {
        return { valid: false, error: `第${i + 1}行第${j + 1}个按钮缺少文本` };
      }

      if (!button.type || !['callback_data', 'url', 'switch_inline_query'].includes(button.type)) {
        return { valid: false, error: `第${i + 1}行第${j + 1}个按钮类型无效` };
      }

      if (!button.value || typeof button.value !== 'string') {
        return { valid: false, error: `第${i + 1}行第${j + 1}个按钮缺少值` };
      }

      // 验证URL格式
      if (button.type === 'url') {
        try {
          new URL(button.value);
        } catch {
          return { valid: false, error: `第${i + 1}行第${j + 1}个按钮的URL格式无效` };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * 验证模板变量配置
 */
export function validateVariableConfig(variables: any[]): { valid: boolean; error?: string } {
  if (!Array.isArray(variables)) {
    return { valid: false, error: '变量配置必须是数组格式' };
  }

  for (let i = 0; i < variables.length; i++) {
    const variable = variables[i];
    
    if (!variable.name || typeof variable.name !== 'string') {
      return { valid: false, error: `第${i + 1}个变量缺少名称` };
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
      return { valid: false, error: `第${i + 1}个变量名称格式无效，只能包含字母、数字和下划线，且不能以数字开头` };
    }

    if (variable.type && !['string', 'number', 'boolean', 'date'].includes(variable.type)) {
      return { valid: false, error: `第${i + 1}个变量类型无效` };
    }
  }

  return { valid: true };
}

/**
 * 验证时间格式 (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * 验证静默时段配置
 */
export function validateQuietHoursConfig(quietHours: any): { valid: boolean; error?: string } {
  if (typeof quietHours !== 'object' || quietHours === null) {
    return { valid: false, error: '静默时段配置必须是对象格式' };
  }

  if (quietHours.enabled && typeof quietHours.enabled !== 'boolean') {
    return { valid: false, error: '静默时段启用状态必须是布尔值' };
  }

  if (quietHours.start_time && !isValidTimeFormat(quietHours.start_time)) {
    return { valid: false, error: '开始时间格式无效，应为 HH:MM 格式' };
  }

  if (quietHours.end_time && !isValidTimeFormat(quietHours.end_time)) {
    return { valid: false, error: '结束时间格式无效，应为 HH:MM 格式' };
  }

  return { valid: true };
}
