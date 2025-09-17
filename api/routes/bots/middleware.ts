/**
 * 机器人路由中间件和服务初始化
 */
import { TelegramBotService } from '../../services/telegram-bot.js';

// Telegram机器人服务实例
let telegramBotService: TelegramBotService | null = null;

/**
 * 初始化Telegram机器人服务
 */
export function initializeTelegramBotService(): void {
  try {
    telegramBotService = new TelegramBotService();
    
    // 异步启动机器人服务，不阻塞应用启动
    telegramBotService.start().then(() => {
      console.log('✅ Telegram机器人服务已启动');
    }).catch((error) => {
      console.error('❌ Telegram机器人服务启动失败:', error);
      console.warn('⚠️ 机器人服务启动失败，但应用将继续运行。请检查机器人配置。');
      // 不抛出错误，让应用继续运行
    });
    
  } catch (error) {
    console.error('❌ Telegram机器人服务初始化失败:', error);
    console.warn('⚠️ 机器人服务初始化失败，但应用将继续运行。请检查机器人配置。');
    // 不抛出错误，让应用继续运行
  }
}

/**
 * 获取Telegram机器人服务实例
 */
export function getTelegramBotService(): TelegramBotService | null {
  return telegramBotService;
}

/**
 * 验证机器人Token格式
 */
export function isValidBotToken(token: string): boolean {
  return token.match(/^\d+:[A-Za-z0-9_-]+$/) !== null;
}

/**
 * 验证机器人状态值
 */
export function isValidBotStatus(status: string): boolean {
  const validStatuses = ['active', 'inactive', 'maintenance'];
  return validStatuses.includes(status);
}

/**
 * 构建查询条件和参数
 */
export function buildWhereClause(
  conditions: Record<string, any>,
  baseConditions: string[] = []
): { whereClause: string; queryParams: any[]; paramIndex: number } {
  const whereConditions = [...baseConditions];
  const queryParams: any[] = [];
  let paramIndex = queryParams.length + 1;

  Object.entries(conditions).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      switch (key) {
        case 'status':
          // 根据状态值构建正确的查询条件
          if (value === 'active') {
            whereConditions.push(`is_active = true`);
          } else if (value === 'inactive') {
            whereConditions.push(`is_active = false`);
          }
          // 不增加参数，因为直接使用布尔值
          paramIndex--; // 回退参数索引
          break;
        case 'search':
          whereConditions.push(`(
            bot_name ILIKE $${paramIndex} OR 
            bot_username ILIKE $${paramIndex}
          )`);
          queryParams.push(`%${String(value)}%`);
          break;
        default:
          // 自定义条件处理
          break;
      }
      paramIndex++;
    }
  });

  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';

  return { whereClause, queryParams, paramIndex };
}

/**
 * 构建更新字段和参数
 */
export function buildUpdateFields(
  data: Record<string, any>,
  excludeFields: string[] = []
): { updateFields: string[]; updateValues: any[]; paramIndex: number } {
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && !excludeFields.includes(key)) {
      switch (key) {
        case 'name':
          updateFields.push(`bot_name = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'username':
          updateFields.push(`bot_username = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'token':
          updateFields.push(`bot_token = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'settings':
          updateFields.push(`config = $${paramIndex}`);
          updateValues.push(JSON.stringify(value));
          break;
        case 'commands':
          updateFields.push(`allowed_updates = $${paramIndex}`);
          updateValues.push(JSON.stringify(value));
          break;
        case 'is_active':
          updateFields.push(`is_active = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'work_mode':
          updateFields.push(`work_mode = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'webhook_url':
          updateFields.push(`webhook_url = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'webhook_secret':
          updateFields.push(`webhook_secret = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'max_connections':
          updateFields.push(`max_connections = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'keyboard_config':
          updateFields.push(`keyboard_config = $${paramIndex}`);
          updateValues.push(value ? JSON.stringify(value) : null);
          break;
        case 'custom_commands':
          updateFields.push(`custom_commands = $${paramIndex}`);
          updateValues.push(value ? JSON.stringify(value) : null);
          break;
        case 'menu_button_enabled':
          updateFields.push(`menu_button_enabled = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'menu_button_text':
          updateFields.push(`menu_button_text = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'menu_type':
          updateFields.push(`menu_type = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'web_app_url':
          updateFields.push(`web_app_url = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'menu_commands':
          updateFields.push(`menu_commands = $${paramIndex}`);
          updateValues.push(value ? JSON.stringify(value) : null);
          break;
        case 'description':
          updateFields.push(`description = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'short_description':
          updateFields.push(`short_description = $${paramIndex}`);
          updateValues.push(value);
          break;
        case 'network_id':
          updateFields.push(`network_id = $${paramIndex}`);
          updateValues.push(value);
          break;
        default:
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(value);
          break;
      }
      paramIndex++;
    }
  });

  return { updateFields, updateValues, paramIndex };
}
