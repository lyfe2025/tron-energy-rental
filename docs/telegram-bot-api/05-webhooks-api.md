# 🌐 Webhook 管理 API 详细文档

> Telegram Bot Webhook 配置和管理的完整指南和项目实际使用示例

## 📋 目录

- [Webhook 概述](#webhook-概述)
- [Webhook 设置和管理](#webhook-设置和管理)
- [项目中的 Webhook 实现](#项目中的-webhook-实现)
- [安全性配置](#安全性配置)
- [错误处理和监控](#错误处理和监控)
- [性能优化](#性能优化)
- [故障排除](#故障排除)
- [最佳实践](#最佳实践)

## 🎯 Webhook 概述

### 什么是 Webhook？

Webhook 是一种让 Telegram 服务器主动向您的服务器发送更新的方式，而不是让您的机器人持续轮询 Telegram API。

### Webhook vs Polling 对比

| 特性 | Webhook | Polling |
|------|---------|---------|
| **实时性** | ✅ 即时推送 | ⚠️ 取决于轮询间隔 |
| **服务器负载** | ✅ 低负载 | ❌ 持续轮询 |
| **网络流量** | ✅ 仅在有更新时 | ❌ 定期请求 |
| **部署复杂度** | ⚠️ 需要公网 HTTPS | ✅ 简单 |
| **开发调试** | ⚠️ 需要外网访问 | ✅ 本地即可 |
| **可靠性** | ⚠️ 需要处理失败重试 | ✅ 稳定 |

### 项目中的 Webhook 架构

```mermaid
graph TB
    A[Telegram 服务器] --> B[HTTPS请求]
    B --> C[Nginx 反向代理]
    C --> D[Express 服务器]
    D --> E[/api/telegram/webhook]
    E --> F[TelegramBotService]
    F --> G[消息处理]
    F --> H[回调处理]
    F --> I[错误处理]
    
    J[SSL 证书] --> C
    K[安全验证] --> E
    L[日志记录] --> E
```

## 🔧 Webhook 设置和管理

### setWebHook

设置机器人的 Webhook URL。

#### 接口定义

```typescript
async setWebhook(url: string, options?: TelegramBot.SetWebHookOptions): Promise<boolean>
```

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `url` | `string` | ✅ | Webhook URL（必须是 HTTPS） |
| `options` | `SetWebHookOptions` | ❌ | Webhook 配置选项 |

#### SetWebHookOptions

```typescript
interface SetWebHookOptions {
  certificate?: string | Buffer;     // SSL 证书文件
  ip_address?: string;              // 固定 IP 地址
  max_connections?: number;         // 最大并发连接数（1-100）
  allowed_updates?: string[];       // 允许的更新类型
  drop_pending_updates?: boolean;   // 是否丢弃待处理的更新
  secret_token?: string;           // 用于验证请求的密钥
}
```

### getWebHookInfo

获取当前 Webhook 配置信息。

#### 接口定义

```typescript
async getWebhookInfo(): Promise<TelegramBot.WebhookInfo>
```

#### WebhookInfo 结构

```typescript
interface WebhookInfo {
  url: string;                     // Webhook URL
  has_custom_certificate: boolean; // 是否使用自定义证书
  pending_update_count: number;    // 待处理更新数量
  ip_address?: string;             // IP 地址
  last_error_date?: number;        // 最后错误时间戳
  last_error_message?: string;     // 最后错误消息
  last_synchronization_error_date?: number;
  max_connections?: number;        // 最大连接数
  allowed_updates?: string[];      // 允许的更新类型
}
```

### deleteWebHook

删除 Webhook 配置。

#### 接口定义

```typescript
async deleteWebhook(dropPendingUpdates?: boolean): Promise<boolean>
```

## 🏗️ 项目中的 Webhook 实现

### Express 路由配置

```typescript
// api/routes/telegram.ts
import { Router } from 'express';
import telegramBotService from '../services/telegram-bot';
import { validateWebhookRequest } from '../middleware/webhook-validation';

const router: Router = Router();

/**
 * Telegram Bot Webhook
 * 接收Telegram发送的更新消息
 */
router.post('/webhook', validateWebhookRequest, async (req, res) => {
  try {
    const update = req.body;
    
    // 记录 Webhook 请求
    console.log('Received webhook update:', {
      updateId: update.update_id,
      type: getUpdateType(update),
      timestamp: new Date().toISOString()
    });
    
    // 处理更新
    await processWebhookUpdate(update);
    
    // 快速响应 Telegram（必须在30秒内）
    res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('Telegram webhook error:', error);
    
    // 即使出错也要返回200，避免 Telegram 重试
    res.status(200).json({ 
      ok: false, 
      error: 'Internal processing error' 
    });
  }
});

/**
 * 设置Webhook
 */
router.post('/set-webhook', async (req, res) => {
  try {
    const { url, secret_token, max_connections = 40 } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    // 验证URL格式
    if (!isValidWebhookUrl(url)) {
      return res.status(400).json({ error: 'Invalid webhook URL' });
    }
    
    const options: TelegramBot.SetWebHookOptions = {
      max_connections,
      allowed_updates: [
        'message',
        'callback_query',
        'inline_query',
        'chosen_inline_result'
      ],
      drop_pending_updates: true
    };

    if (secret_token) {
      options.secret_token = secret_token;
    }

    const success = await telegramBotService.setWebhook(url, options);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Webhook set successfully',
        url: url,
        config: options
      });
    } else {
      res.status(500).json({ error: 'Failed to set webhook' });
    }
  } catch (error) {
    console.error('Set webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 获取Webhook信息
 */
router.get('/webhook-info', async (req, res) => {
  try {
    const info = await telegramBotService.getWebhookInfo();
    res.json({
      success: true,
      webhook_info: info,
      status: info.url ? 'active' : 'inactive',
      health: {
        pending_updates: info.pending_update_count,
        last_error: info.last_error_message,
        last_error_date: info.last_error_date ? 
          new Date(info.last_error_date * 1000).toISOString() : null
      }
    });
  } catch (error) {
    console.error('Get webhook info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 删除Webhook
 */
router.delete('/webhook', async (req, res) => {
  try {
    const { drop_pending_updates = true } = req.query;
    
    const success = await telegramBotService.deleteWebhook(
      drop_pending_updates === 'true'
    );
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Webhook deleted successfully' 
      });
    } else {
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Webhook 更新处理

```typescript
// services/webhook/WebhookProcessor.ts
import TelegramBot from 'node-telegram-bot-api';
import { telegramBotService } from '../telegram-bot';

export class WebhookProcessor {
  /**
   * 处理 Webhook 更新
   */
  static async processUpdate(update: TelegramBot.Update): Promise<void> {
    try {
      // 根据更新类型分发处理
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      } else if (update.inline_query) {
        await this.handleInlineQuery(update.inline_query);
      } else if (update.chosen_inline_result) {
        await this.handleChosenInlineResult(update.chosen_inline_result);
      } else if (update.pre_checkout_query) {
        await this.handlePreCheckoutQuery(update.pre_checkout_query);
      } else if (update.successful_payment) {
        await this.handleSuccessfulPayment(update.successful_payment);
      } else {
        console.log('Unhandled update type:', Object.keys(update));
      }
    } catch (error) {
      console.error('Error processing webhook update:', error);
      
      // 记录错误但不抛出，避免影响其他更新的处理
      await this.logProcessingError(update, error);
    }
  }

  /**
   * 处理文本消息
   */
  private static async handleMessage(message: TelegramBot.Message): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from?.id;
    
    // 记录消息
    console.log(`Message from ${userId} in chat ${chatId}:`, message.text);
    
    // 检查消息类型
    if (message.text?.startsWith('/')) {
      // 命令消息 - 委托给命令处理器
      const commandHandler = telegramBotService.getCommandHandler();
      await commandHandler.handleCommand(message);
    } else if (message.text) {
      // 普通文本消息
      await this.handleTextMessage(message);
    } else if (message.contact) {
      // 联系人消息
      await this.handleContactMessage(message);
    } else if (message.location) {
      // 位置消息
      await this.handleLocationMessage(message);
    }
  }

  /**
   * 处理回调查询
   */
  private static async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const callbackHandler = telegramBotService.getCallbackHandler();
    await callbackHandler.handleCallbackQuery(callbackQuery);
  }

  /**
   * 处理内联查询
   */
  private static async handleInlineQuery(inlineQuery: TelegramBot.InlineQuery): Promise<void> {
    const queryId = inlineQuery.id;
    const query = inlineQuery.query;
    
    // 简单的内联查询处理示例
    const results: TelegramBot.InlineQueryResult[] = [];
    
    if (query.includes('能量')) {
      results.push({
        type: 'article',
        id: '1',
        title: '🔋 TRON能量租赁',
        description: '快速、安全的TRON能量租赁服务',
        input_message_content: {
          message_text: '🔋 点击购买TRON能量：/start'
        },
        thumb_url: 'https://example.com/energy-icon.png'
      });
    }
    
    await telegramBotService.getBotInstance().answerInlineQuery(queryId, results, {
      cache_time: 300,
      is_personal: true
    });
  }

  /**
   * 处理文本消息
   */
  private static async handleTextMessage(message: TelegramBot.Message): Promise<void> {
    const text = message.text!;
    const chatId = message.chat.id;
    const userId = message.from?.id;
    
    // 检查用户是否在特定状态（如输入TRON地址）
    const userState = await UserStateManager.getState(userId!);
    
    if (userState?.currentAction === 'setting_address') {
      await this.handleAddressInput(chatId, text, userId!);
    } else if (userState?.currentAction === 'custom_amount') {
      await this.handleCustomAmountInput(chatId, text, userId!);
    } else {
      // 默认处理 - 显示帮助信息
      await telegramBotService.sendMessage(chatId, 
        '💡 请使用 /menu 查看可用功能，或使用 /help 获取帮助。'
      );
    }
  }

  /**
   * 处理地址输入
   */
  private static async handleAddressInput(chatId: number, address: string, userId: number): Promise<void> {
    // 验证TRON地址格式
    if (!BotUtils.isValidTronAddress(address)) {
      await telegramBotService.sendMessage(chatId, 
        '❌ TRON地址格式错误\n\n' +
        '正确格式: 以T开头的34位字符串\n' +
        '示例: TExample123456789abcdef\n\n' +
        '请重新输入正确的地址:'
      );
      return;
    }

    try {
      // 保存地址
      await UserService.updateUserAddress(userId, address);
      
      // 清除状态
      UserStateManager.clearState(userId);
      
      await telegramBotService.sendMessage(chatId, 
        `✅ TRON地址设置成功！\n\n` +
        `📍 您的地址: \`${address}\`\n\n` +
        `🔋 现在可以购买能量了！`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔋 立即购买', callback_data: 'buy_energy' }],
              [{ text: '🏠 返回主菜单', callback_data: 'refresh_menu' }]
            ]
          }
        }
      );
    } catch (error) {
      console.error('Failed to save address:', error);
      await telegramBotService.sendMessage(chatId, '❌ 保存地址失败，请重试');
    }
  }

  /**
   * 记录处理错误
   */
  private static async logProcessingError(update: TelegramBot.Update, error: any): Promise<void> {
    const errorLog = {
      timestamp: new Date().toISOString(),
      updateId: update.update_id,
      updateType: getUpdateType(update),
      error: {
        message: error.message,
        stack: error.stack
      },
      update: update
    };

    console.error('Webhook processing error:', errorLog);
    
    // 可以发送到错误监控服务
    // await ErrorMonitoring.logError(errorLog);
  }
}

/**
 * 获取更新类型
 */
function getUpdateType(update: TelegramBot.Update): string {
  if (update.message) return 'message';
  if (update.callback_query) return 'callback_query';
  if (update.inline_query) return 'inline_query';
  if (update.chosen_inline_result) return 'chosen_inline_result';
  if (update.pre_checkout_query) return 'pre_checkout_query';
  if (update.successful_payment) return 'successful_payment';
  return 'unknown';
}
```

## 🔐 安全性配置

### Webhook 请求验证

```typescript
// middleware/webhook-validation.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function validateWebhookRequest(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. 验证请求方法
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. 验证 Content-Type
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // 3. 验证 Secret Token（如果配置了）
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secretToken) {
      const providedToken = req.headers['x-telegram-bot-api-secret-token'];
      if (providedToken !== secretToken) {
        return res.status(401).json({ error: 'Invalid secret token' });
      }
    }

    // 4. 验证请求来源IP（可选）
    const allowedIPs = process.env.TELEGRAM_ALLOWED_IPS?.split(',') || [];
    if (allowedIPs.length > 0) {
      const clientIP = getClientIP(req);
      if (!allowedIPs.includes(clientIP)) {
        console.warn(`Unauthorized webhook request from IP: ${clientIP}`);
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    // 5. 验证请求体大小
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB限制
      return res.status(413).json({ error: 'Request too large' });
    }

    // 6. 验证更新结构
    if (!isValidUpdate(req.body)) {
      return res.status(400).json({ error: 'Invalid update format' });
    }

    next();
  } catch (error) {
    console.error('Webhook validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * 获取客户端真实IP
 */
function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    '0.0.0.0'
  ).split(',')[0].trim();
}

/**
 * 验证更新格式
 */
function isValidUpdate(update: any): boolean {
  if (!update || typeof update !== 'object') return false;
  if (typeof update.update_id !== 'number') return false;
  
  // 至少包含一种更新类型
  const updateTypes = [
    'message', 'callback_query', 'inline_query', 
    'chosen_inline_result', 'pre_checkout_query', 'successful_payment'
  ];
  
  return updateTypes.some(type => update[type]);
}

/**
 * URL 验证
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // 必须是 HTTPS
    if (parsedUrl.protocol !== 'https:') return false;
    
    // 不能是本地地址
    const hostname = parsedUrl.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return false;
    }
    
    // 端口必须是 443, 80, 88, 8443
    const allowedPorts = [443, 80, 88, 8443];
    const port = parseInt(parsedUrl.port) || 443;
    if (!allowedPorts.includes(port)) return false;
    
    return true;
  } catch {
    return false;
  }
}
```

### SSL 证书配置

```typescript
// config/ssl.ts
import fs from 'fs';
import path from 'path';

export class SSLConfig {
  /**
   * 生成自签名证书（仅用于开发环境）
   */
  static generateSelfSignedCert(): { cert: string; key: string } {
    // 注意：生产环境应使用有效的SSL证书
    const certPath = path.join(__dirname, '../ssl/cert.pem');
    const keyPath = path.join(__dirname, '../ssl/key.pem');
    
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      throw new Error('SSL certificate files not found');
    }
    
    return {
      cert: fs.readFileSync(certPath, 'utf8'),
      key: fs.readFileSync(keyPath, 'utf8')
    };
  }

  /**
   * 验证证书有效性
   */
  static validateCertificate(certPath: string): boolean {
    try {
      const cert = fs.readFileSync(certPath, 'utf8');
      // 简单验证证书格式
      return cert.includes('BEGIN CERTIFICATE') && cert.includes('END CERTIFICATE');
    } catch {
      return false;
    }
  }

  /**
   * 获取证书信息
   */
  static getCertificateInfo(certPath: string): any {
    try {
      const cert = fs.readFileSync(certPath, 'utf8');
      // 这里可以使用 node-forge 或其他库解析证书
      // 返回证书的详细信息
      return {
        valid: true,
        subject: 'CN=example.com',
        issuer: 'CN=Let\'s Encrypt',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90天后
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}
```

## 📊 错误处理和监控

### Webhook 健康检查

```typescript
// services/webhook/WebhookMonitor.ts
export class WebhookMonitor {
  private static stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastRequestTime: null as Date | null,
    averageResponseTime: 0,
    responseTimes: [] as number[]
  };

  /**
   * 记录请求统计
   */
  static recordRequest(success: boolean, responseTime: number): void {
    this.stats.totalRequests++;
    this.stats.lastRequestTime = new Date();
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    // 记录响应时间（保持最近100个记录）
    this.stats.responseTimes.push(responseTime);
    if (this.stats.responseTimes.length > 100) {
      this.stats.responseTimes.shift();
    }
    
    // 计算平均响应时间
    this.stats.averageResponseTime = 
      this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;
  }

  /**
   * 获取监控统计
   */
  static getStats() {
    const successRate = this.stats.totalRequests > 0 
      ? (this.stats.successfulRequests / this.stats.totalRequests) * 100 
      : 0;

    return {
      ...this.stats,
      successRate: Math.round(successRate * 100) / 100,
      status: this.getHealthStatus()
    };
  }

  /**
   * 获取健康状态
   */
  static getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const stats = this.stats;
    const successRate = stats.totalRequests > 0 
      ? (stats.successfulRequests / stats.totalRequests) * 100 
      : 100;

    // 检查最后请求时间
    if (stats.lastRequestTime) {
      const minutesSinceLastRequest = 
        (Date.now() - stats.lastRequestTime.getTime()) / (1000 * 60);
      
      if (minutesSinceLastRequest > 30) {
        return 'warning'; // 30分钟没有请求
      }
    }

    // 检查成功率
    if (successRate < 95) {
      return 'critical'; // 成功率低于95%
    } else if (successRate < 98) {
      return 'warning';  // 成功率低于98%
    }

    // 检查平均响应时间
    if (stats.averageResponseTime > 5000) {
      return 'warning'; // 平均响应时间超过5秒
    }

    return 'healthy';
  }

  /**
   * 重置统计
   */
  static resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastRequestTime: null,
      averageResponseTime: 0,
      responseTimes: []
    };
  }

  /**
   * 检查 Webhook 状态
   */
  static async checkWebhookStatus(): Promise<{
    active: boolean;
    info: TelegramBot.WebhookInfo;
    health: any;
  }> {
    try {
      const info = await telegramBotService.getWebhookInfo();
      const health = this.getStats();
      
      return {
        active: !!info.url,
        info,
        health
      };
    } catch (error) {
      console.error('Failed to check webhook status:', error);
      return {
        active: false,
        info: {} as TelegramBot.WebhookInfo,
        health: { status: 'critical', error: error.message }
      };
    }
  }
}

// 中间件：记录请求统计
export function webhookStatsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode >= 200 && res.statusCode < 300;
    
    WebhookMonitor.recordRequest(success, responseTime);
  });
  
  next();
}
```

### 错误恢复机制

```typescript
// services/webhook/WebhookRecovery.ts
export class WebhookRecovery {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 5000; // 5秒

  /**
   * 自动恢复 Webhook
   */
  static async autoRecover(): Promise<boolean> {
    try {
      console.log('Starting webhook auto-recovery...');
      
      // 1. 检查当前 Webhook 状态
      const info = await telegramBotService.getWebhookInfo();
      
      if (!info.url) {
        console.log('No webhook configured, setting up...');
        return await this.setupWebhook();
      }

      // 2. 检查是否有错误
      if (info.last_error_message) {
        console.log('Webhook has errors, attempting recovery...');
        return await this.recoverFromError(info);
      }

      // 3. 检查待处理更新数量
      if (info.pending_update_count > 100) {
        console.log('Too many pending updates, resetting webhook...');
        return await this.resetWebhook();
      }

      console.log('Webhook appears healthy');
      return true;
    } catch (error) {
      console.error('Auto-recovery failed:', error);
      return false;
    }
  }

  /**
   * 设置 Webhook
   */
  private static async setupWebhook(): Promise<boolean> {
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('TELEGRAM_WEBHOOK_URL not configured');
      return false;
    }

    try {
      const options: TelegramBot.SetWebHookOptions = {
        max_connections: 40,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      };

      if (process.env.TELEGRAM_WEBHOOK_SECRET) {
        options.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
      }

      const success = await telegramBotService.setWebhook(webhookUrl, options);
      
      if (success) {
        console.log('Webhook setup successful');
        return true;
      } else {
        console.error('Failed to setup webhook');
        return false;
      }
    } catch (error) {
      console.error('Webhook setup error:', error);
      return false;
    }
  }

  /**
   * 从错误中恢复
   */
  private static async recoverFromError(info: TelegramBot.WebhookInfo): Promise<boolean> {
    console.log('Webhook error:', info.last_error_message);
    
    // 分析错误类型并采取相应措施
    const errorMessage = info.last_error_message?.toLowerCase() || '';
    
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      // 连接问题 - 重新设置 Webhook
      return await this.resetWebhook();
    } else if (errorMessage.includes('certificate') || errorMessage.includes('ssl')) {
      // SSL证书问题
      console.error('SSL certificate issue detected');
      return false; // 需要手动处理
    } else if (errorMessage.includes('too many requests')) {
      // 请求过多 - 等待后重试
      await this.delay(30000); // 等待30秒
      return await this.resetWebhook();
    }
    
    // 其他错误 - 尝试重新设置
    return await this.resetWebhook();
  }

  /**
   * 重置 Webhook
   */
  private static async resetWebhook(): Promise<boolean> {
    try {
      // 删除现有 Webhook
      await telegramBotService.deleteWebhook(true);
      
      // 等待一段时间
      await this.delay(2000);
      
      // 重新设置 Webhook
      return await this.setupWebhook();
    } catch (error) {
      console.error('Webhook reset failed:', error);
      return false;
    }
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 带重试的操作
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          const delay = this.RETRY_DELAY * attempt; // 指数退避
          console.log(`Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }
    
    throw lastError!;
  }
}
```

## 🚀 性能优化

### 请求处理优化

```typescript
// middleware/webhook-optimization.ts
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

/**
 * Webhook 专用限流器
 */
export const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 1000, // 每分钟最多1000个请求
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 跳过来自 Telegram 的请求
    const userAgent = req.headers['user-agent'] || '';
    return userAgent.includes('TelegramBot');
  }
});

/**
 * 响应压缩
 */
export const webhookCompression = compression({
  filter: (req, res) => {
    // 只压缩响应，不压缩请求
    return compression.filter(req, res);
  },
  level: 6 // 压缩级别
});

/**
 * 请求缓存中间件
 */
export function webhookCache(req: Request, res: Response, next: NextFunction) {
  // 设置缓存头
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  next();
}

/**
 * 异步处理中间件
 */
export function asyncWebhookHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 立即响应 Telegram
    res.status(200).json({ ok: true });
    
    // 异步处理请求
    handler(req, res, next).catch(error => {
      console.error('Async webhook handler error:', error);
      // 记录错误但不影响响应
    });
  };
}
```

### 队列处理系统

```typescript
// services/webhook/WebhookQueue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// 创建更新处理队列
const updateQueue = new Queue('telegram-updates', { 
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    }
  }
});

// 创建工作器
const updateWorker = new Worker('telegram-updates', async (job) => {
  const update = job.data.update;
  await WebhookProcessor.processUpdate(update);
}, { 
  connection: redis,
  concurrency: 10 // 并发处理10个任务
});

export class WebhookQueue {
  /**
   * 添加更新到队列
   */
  static async addUpdate(update: TelegramBot.Update): Promise<void> {
    await updateQueue.add('process-update', 
      { update }, 
      {
        priority: this.getUpdatePriority(update),
        delay: 0
      }
    );
  }

  /**
   * 获取更新优先级
   */
  private static getUpdatePriority(update: TelegramBot.Update): number {
    // 回调查询优先级最高
    if (update.callback_query) return 10;
    
    // 命令消息优先级高
    if (update.message?.text?.startsWith('/')) return 8;
    
    // 普通消息优先级中等
    if (update.message) return 5;
    
    // 其他更新优先级低
    return 1;
  }

  /**
   * 获取队列统计
   */
  static async getQueueStats() {
    const waiting = await updateQueue.getWaiting();
    const active = await updateQueue.getActive();
    const completed = await updateQueue.getCompleted();
    const failed = await updateQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length
    };
  }

  /**
   * 清理队列
   */
  static async cleanQueue(): Promise<void> {
    await updateQueue.clean(24 * 60 * 60 * 1000, 1000); // 清理24小时前的任务
  }
}

// 监听工作器事件
updateWorker.on('completed', (job) => {
  console.log(`Update ${job.data.update.update_id} processed successfully`);
});

updateWorker.on('failed', (job, err) => {
  console.error(`Update ${job?.data?.update?.update_id} failed:`, err);
});
```

## 🔗 相关文档

- [Messaging API](./01-messaging-api.md) - 消息发送功能
- [Commands API](./02-commands-api.md) - 命令处理
- [Callbacks API](./03-callbacks-api.md) - 回调查询处理
- [Error Handling](./10-error-handling.md) - 详细错误处理指南

---

> 💡 **最佳实践提示**
> 1. 始终使用 HTTPS 和有效的 SSL 证书
> 2. 实现请求验证和安全检查
> 3. 快速响应 Telegram 请求（30秒内）
> 4. 使用队列系统处理复杂操作
> 5. 监控 Webhook 健康状态并实现自动恢复
