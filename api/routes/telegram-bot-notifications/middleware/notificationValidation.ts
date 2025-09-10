/**
 * Telegram机器人通知验证中间件
 * 提供通知数据的验证功能
 */

import { type NextFunction, type Request, type Response } from 'express';

/**
 * 验证手动通知请求数据
 */
export function validateManualNotificationRequest(req: Request, res: Response, next: NextFunction): void {
  const { notification_data } = req.body;

  if (!notification_data) {
    res.status(400).json({
      success: false,
      message: '缺少通知数据'
    });
    return;
  }

  if (!notification_data.type) {
    res.status(400).json({
      success: false,
      message: '通知类型为必填项'
    });
    return;
  }

  if (!notification_data.title) {
    res.status(400).json({
      success: false,
      message: '通知标题为必填项'
    });
    return;
  }

  if (!notification_data.content) {
    res.status(400).json({
      success: false,
      message: '通知内容为必填项'
    });
    return;
  }

  // 验证目标用户
  const validTargetTypes = ['all', 'active_only', 'agents_only', 'vip_only'];
  if (notification_data.target_users && !validTargetTypes.includes(notification_data.target_users)) {
    res.status(400).json({
      success: false,
      message: '无效的目标用户类型'
    });
    return;
  }

  // 验证紧急程度
  const validUrgencyLevels = ['low', 'normal', 'high'];
  if (notification_data.urgency && !validUrgencyLevels.includes(notification_data.urgency)) {
    res.status(400).json({
      success: false,
      message: '无效的紧急程度'
    });
    return;
  }

  next();
}

/**
 * 验证模板创建请求数据
 */
export function validateTemplateRequest(req: Request, res: Response, next: NextFunction): void {
  const { template } = req.body;

  if (!template) {
    res.status(400).json({
      success: false,
      message: '缺少模板数据'
    });
    return;
  }

  if (!template.name || template.name.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: '模板名称为必填项'
    });
    return;
  }

  if (!template.type) {
    res.status(400).json({
      success: false,
      message: '模板类型为必填项'
    });
    return;
  }

  if (!template.content || template.content.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: '模板内容为必填项'
    });
    return;
  }

  // 验证语言代码
  const validLanguages = ['zh', 'en', 'es', 'fr', 'de', 'ja', 'ko'];
  if (template.language && !validLanguages.includes(template.language)) {
    res.status(400).json({
      success: false,
      message: '不支持的语言代码'
    });
    return;
  }

  // 验证解析模式
  const validParseModes = ['Markdown', 'HTML', 'MarkdownV2'];
  if (template.parse_mode && !validParseModes.includes(template.parse_mode)) {
    res.status(400).json({
      success: false,
      message: '不支持的解析模式'
    });
    return;
  }

  next();
}

/**
 * 验证配置更新请求数据
 */
export function validateConfigRequest(req: Request, res: Response, next: NextFunction): void {
  const { config } = req.body;

  if (!config) {
    res.status(400).json({
      success: false,
      message: '缺少配置数据'
    });
    return;
  }

  // 验证时区
  if (config.timezone && typeof config.timezone !== 'string') {
    res.status(400).json({
      success: false,
      message: '时区必须是字符串类型'
    });
    return;
  }

  // 验证语言
  if (config.default_language && typeof config.default_language !== 'string') {
    res.status(400).json({
      success: false,
      message: '默认语言必须是字符串类型'
    });
    return;
  }

  // 验证布尔值字段
  const booleanFields = ['enabled', 'analytics_enabled', 'performance_monitoring'];
  for (const field of booleanFields) {
    if (config[field] !== undefined && typeof config[field] !== 'boolean') {
      res.status(400).json({
        success: false,
        message: `${field} 必须是布尔值类型`
      });
      return;
    }
  }

  next();
}
