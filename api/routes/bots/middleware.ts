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
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      telegramBotService = new TelegramBotService();
      telegramBotService.start();
      console.log('✅ Telegram机器人服务已启动');
    } catch (error) {
      console.error('❌ Telegram机器人服务启动失败:', error);
    }
  } else {
    console.warn('⚠️ 未配置TELEGRAM_BOT_TOKEN，Telegram机器人服务未启动');
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
          whereConditions.push(`status = $${paramIndex}`);
          queryParams.push(String(value));
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
