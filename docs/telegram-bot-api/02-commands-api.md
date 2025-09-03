# 🤖 命令处理 API 详细文档

> Telegram Bot 命令系统的完整指南和项目实际使用示例

## 📋 目录

- [命令系统概述](#命令系统概述)
- [命令注册和菜单](#命令注册和菜单)
- [核心命令实现](#核心命令实现)
- [命令权限控制](#命令权限控制)
- [命令参数处理](#命令参数处理)
- [错误处理和反馈](#错误处理和反馈)
- [项目具体实现](#项目具体实现)

## 🎯 命令系统概述

### 什么是 Telegram Bot 命令？

Telegram Bot 命令是以 `/` 开头的特殊消息，为用户提供快速访问机器人功能的方式。命令具有以下特点：

- **快速识别**: 在聊天中高亮显示
- **自动补全**: 用户可以从列表中选择
- **跨平台**: 在所有 Telegram 客户端中一致工作
- **深度链接**: 支持外部应用直接调用

### 项目中的命令架构

```mermaid
graph TB
    A[用户输入命令] --> B[CommandHandler]
    B --> C[权限验证]
    C --> D{命令路由}
    D --> E[/start - 启动注册]
    D --> F[/menu - 主菜单]
    D --> G[/help - 帮助信息]
    D --> H[/balance - 余额查询]
    D --> I[/orders - 订单历史]
    
    E --> J[用户注册服务]
    F --> K[键盘构建器]
    G --> L[帮助文档]
    H --> M[用户服务]
    I --> N[订单服务]
```

## 📜 命令注册和菜单

### setMyCommands

设置机器人的命令菜单，让用户可以快速选择可用命令。

#### 接口定义

```typescript
async setMyCommands(commands: TelegramBot.BotCommand[]): Promise<boolean>
```

#### BotCommand 接口

```typescript
interface BotCommand {
  command: string;    // 命令名称（不包含 /）
  description: string; // 命令描述（1-256 字符）
}
```

#### 项目中的实现

```typescript
// 在 TelegramBotService.ts 中设置命令菜单
async start(): Promise<void> {
  try {
    // 等待初始化完成
    await this.waitForInitialization();
    
    // 检查机器人是否正确初始化
    if (!this.bot) {
      console.warn('⚠️ 机器人未正确初始化，跳过启动');
      return;
    }
    
    const botInfo = await this.getBotInfo();
    const botName = this.botConfig?.botName || 'Unknown';
    console.log(`Telegram Bot started: @${botInfo.username} (${botName})`);

    // 设置机器人命令菜单
    await this.setMyCommands([
      { command: 'start', description: '启动机器人' },
      { command: 'menu', description: '显示主菜单' },
      { command: 'help', description: '获取帮助' },
      { command: 'balance', description: '查询余额' },
      { command: 'orders', description: '查看订单' }
    ]);

    console.log('Telegram Bot commands menu set successfully');
  } catch (error) {
    console.error('Failed to start Telegram Bot:', error);
    console.warn('⚠️ 机器人启动失败，但应用将继续运行。请检查机器人配置。');
  }
}
```

### 高级命令配置

```typescript
// 为不同范围设置不同的命令菜单
interface BotCommandScope {
  type: 'default' | 'all_private_chats' | 'all_group_chats' | 'all_chat_administrators' | 'chat' | 'chat_administrators' | 'chat_member';
  chat_id?: number;
  user_id?: number;
}

// 为私聊设置完整命令菜单
await bot.setMyCommands([
  { command: 'start', description: '🚀 启动机器人' },
  { command: 'menu', description: '📱 显示主菜单' },
  { command: 'help', description: '❓ 获取帮助' },
  { command: 'balance', description: '💰 查询余额' },
  { command: 'orders', description: '📋 查看订单' },
  { command: 'settings', description: '⚙️ 个人设置' },
  { command: 'cancel', description: '❌ 取消当前操作' }
], {
  scope: { type: 'all_private_chats' }
});

// 为群组设置简化命令菜单
await bot.setMyCommands([
  { command: 'help', description: '❓ 获取帮助' },
  { command: 'status', description: '📊 查看状态' }
], {
  scope: { type: 'all_group_chats' }
});
```

## 🔧 核心命令实现

### /start 命令 - 用户注册和欢迎

```typescript
async handleStartCommand(msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const telegramUser = msg.from;
  
  if (!telegramUser) {
    await this.bot.sendMessage(chatId, '❌ 无法获取用户信息，请重试。');
    return;
  }

  try {
    // 注册或获取用户
    const user = await UserService.registerTelegramUser({
      telegram_id: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      language_code: telegramUser.language_code
    });

    // 发送欢迎消息
    const welcomeMessage = `🎉 欢迎使用TRON能量租赁机器人！

👋 你好，${telegramUser.first_name}！

🔋 我们提供快速、安全的TRON能量租赁服务：
• 💰 超低价格，性价比最高
• ⚡ 秒级到账，即买即用
• 🛡️ 安全可靠，无需私钥
• 🎯 多种套餐，满足不同需求

📱 使用 /menu 查看主菜单
❓ 使用 /help 获取帮助`;

    await this.bot.sendMessage(chatId, welcomeMessage);
    
    // 显示主菜单需要通过回调调用外部方法
    return;
  } catch (error) {
    console.error('Error in handleStartCommand:', error);
    await this.bot.sendMessage(chatId, '❌ 注册失败，请重试。');
  }
}
```

### /menu 命令 - 主菜单显示

```typescript
async handleMenuCommand(msg: TelegramBot.Message): Promise<void> {
  // 这个方法在主服务中会被重写，以便调用键盘构建器
  const chatId = msg.chat.id;
  await this.bot.sendMessage(chatId, '📱 主菜单正在加载...');
}

// 在 TelegramBotService 中的重写实现
private overrideCommandHandlerMethods(): void {
  // 重写 /menu 命令处理
  this.commandHandler.handleMenuCommand = async (msg: TelegramBot.Message) => {
    await this.keyboardBuilder.showMainMenu(msg.chat.id);
  };
}
```

### /help 命令 - 帮助信息

```typescript
async handleHelpCommand(msg: TelegramBot.Message): Promise<void> {
  const helpMessage = `📖 TRON能量租赁机器人使用指南

🤖 基础命令：
• /start - 启动机器人
• /menu - 显示主菜单
• /help - 显示帮助信息
• /balance - 查询账户余额
• /orders - 查看订单历史

🔋 能量租赁流程：
1️⃣ 选择能量套餐
2️⃣ 输入接收地址
3️⃣ 确认订单信息
4️⃣ 完成支付
5️⃣ 等待能量到账

💡 注意事项：
• 请确保TRON地址正确
• 支付后请耐心等待确认
• 能量有效期为24小时

🆘 如需帮助，请联系客服`;

  await this.bot.sendMessage(msg.chat.id, helpMessage);
}
```

### /balance 命令 - 余额查询

```typescript
async handleBalanceCommand(msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  
  if (!telegramId) {
    await this.bot.sendMessage(chatId, '❌ 无法获取用户信息');
    return;
  }

  try {
    const user = await UserService.getUserByTelegramId(telegramId);
    if (!user) {
      await this.bot.sendMessage(chatId, '❌ 用户不存在，请先使用 /start 注册');
      return;
    }

    const balanceMessage = `💰 账户余额信息

💵 USDT余额: ${user.usdt_balance || 0} USDT
🔴 TRX余额: ${user.trx_balance || 0} TRX
📊 总订单数: ${user.total_orders || 0}
💸 总消费: ${user.total_spent || 0} USDT
⚡ 总能量使用: ${user.total_energy_used || 0} Energy`;

    await this.bot.sendMessage(chatId, balanceMessage);
  } catch (error) {
    console.error('Error in handleBalanceCommand:', error);
    await this.bot.sendMessage(chatId, '❌ 获取余额信息失败，请重试。');
  }
}
```

### /orders 命令 - 订单历史

```typescript
async handleOrdersCommand(msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  
  if (!telegramId) {
    await this.bot.sendMessage(chatId, '❌ 无法获取用户信息');
    return;
  }

  try {
    const user = await UserService.getUserByTelegramId(telegramId);
    if (!user) {
      await this.bot.sendMessage(chatId, '❌ 用户不存在，请先使用 /start 注册');
      return;
    }

    const orders = await this.orderService.getUserOrders(parseInt(user.id), 5); // 获取最近5个订单
    
    if (!orders || orders.length === 0) {
      await this.bot.sendMessage(chatId, '📋 暂无订单记录');
      return;
    }

    let ordersMessage = '📋 最近订单记录\n\n';
    
    orders.forEach((order, index) => {
      const statusEmoji = this.getOrderStatusEmoji(order.status);
      
      ordersMessage += `${index + 1}️⃣ 订单 #${order.id}\n` +
        `⚡ 能量: ${order.energy_amount} Energy\n` +
        `💰 金额: ${order.price_trx} TRX\n` +
        `${statusEmoji} 状态: ${order.status}\n` +
        `📅 时间: ${new Date(order.created_at).toLocaleString('zh-CN')}\n\n`;
    });

    await this.bot.sendMessage(chatId, ordersMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in handleOrdersCommand:', error);
    await this.bot.sendMessage(chatId, '❌ 获取订单信息失败，请重试。');
  }
}
```

## 🔐 命令权限控制

### 用户状态检查

```typescript
class PermissionManager {
  // 检查用户是否有权限执行命令
  static async checkCommandPermission(
    userId: number, 
    command: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const user = await UserService.getUserByTelegramId(userId);
      
      if (!user) {
        return { 
          allowed: false, 
          reason: '用户未注册，请先使用 /start 命令注册' 
        };
      }

      // 检查用户状态
      if (user.status === 'banned') {
        return { 
          allowed: false, 
          reason: '您的账户已被限制使用' 
        };
      }

      if (user.status === 'inactive') {
        return { 
          allowed: false, 
          reason: '您的账户未激活，请联系客服' 
        };
      }

      // 某些命令需要特殊权限
      const restrictedCommands = ['admin', 'broadcast', 'stats'];
      if (restrictedCommands.includes(command)) {
        if (user.role !== 'admin') {
          return { 
            allowed: false, 
            reason: '您没有权限执行此命令' 
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Permission check failed:', error);
      return { 
        allowed: false, 
        reason: '权限验证失败，请重试' 
      };
    }
  }
}

// 在命令处理器中使用权限检查
async handleProtectedCommand(msg: TelegramBot.Message, command: string): Promise<void> {
  const userId = msg.from?.id;
  if (!userId) {
    await this.bot.sendMessage(msg.chat.id, '❌ 无法获取用户信息');
    return;
  }

  const permission = await PermissionManager.checkCommandPermission(userId, command);
  if (!permission.allowed) {
    await this.bot.sendMessage(msg.chat.id, `❌ ${permission.reason}`);
    return;
  }

  // 执行实际的命令逻辑
  await this.executeCommand(msg, command);
}
```

### 速率限制

```typescript
class RateLimiter {
  private static userLastCommand = new Map<number, number>();
  private static readonly COMMAND_COOLDOWN = 2000; // 2秒冷却时间

  static async checkRateLimit(userId: number): Promise<boolean> {
    const now = Date.now();
    const lastCommand = this.userLastCommand.get(userId) || 0;
    
    if (now - lastCommand < this.COMMAND_COOLDOWN) {
      return false; // 超出速率限制
    }

    this.userLastCommand.set(userId, now);
    return true;
  }

  static getRemainingCooldown(userId: number): number {
    const now = Date.now();
    const lastCommand = this.userLastCommand.get(userId) || 0;
    const remaining = this.COMMAND_COOLDOWN - (now - lastCommand);
    return Math.max(0, Math.ceil(remaining / 1000));
  }
}

// 在命令处理器中使用速率限制
async handleRateLimitedCommand(msg: TelegramBot.Message): Promise<void> {
  const userId = msg.from?.id;
  if (!userId) return;

  if (!await RateLimiter.checkRateLimit(userId)) {
    const remaining = RateLimiter.getRemainingCooldown(userId);
    await this.bot.sendMessage(
      msg.chat.id, 
      `⏱️ 请稍等 ${remaining} 秒后再使用命令`
    );
    return;
  }

  // 执行命令逻辑
  await this.executeActualCommand(msg);
}
```

## 📝 命令参数处理

### 基础参数解析

```typescript
class CommandParser {
  // 解析命令和参数
  static parseCommand(text: string): { command: string; args: string[]; rawArgs: string } {
    const parts = text.trim().split(' ');
    const command = parts[0].toLowerCase().replace('/', '');
    const args = parts.slice(1);
    const rawArgs = text.substring(text.indexOf(' ') + 1).trim();
    
    return { command, args, rawArgs };
  }

  // 验证参数数量
  static validateArgCount(args: string[], min: number, max?: number): boolean {
    if (args.length < min) return false;
    if (max !== undefined && args.length > max) return false;
    return true;
  }

  // 解析特定类型的参数
  static parseAmount(arg: string): number | null {
    const amount = parseFloat(arg);
    return isNaN(amount) || amount <= 0 ? null : amount;
  }

  static parseTronAddress(arg: string): string | null {
    const tronAddressRegex = /^T[A-Za-z1-9]{33}$/;
    return tronAddressRegex.test(arg) ? arg : null;
  }
}
```

### 带参数的命令示例

```typescript
// /setaddress 命令 - 设置 TRON 地址
async handleSetAddressCommand(msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  
  if (!userId) {
    await this.bot.sendMessage(chatId, '❌ 无法获取用户信息');
    return;
  }

  const { args } = CommandParser.parseCommand(msg.text || '');
  
  // 验证参数
  if (!CommandParser.validateArgCount(args, 1, 1)) {
    await this.bot.sendMessage(chatId, 
      `❌ 使用方法: /setaddress <TRON地址>
      
示例: /setaddress TExample123456789abcdef`);
    return;
  }

  const address = CommandParser.parseTronAddress(args[0]);
  if (!address) {
    await this.bot.sendMessage(chatId, 
      '❌ TRON地址格式错误\n\n' +
      '正确格式: 以T开头的34位字符串\n' +
      '示例: TExample123456789abcdef'
    );
    return;
  }

  try {
    // 更新用户地址
    await UserService.updateUserAddress(userId, address);
    
    await this.bot.sendMessage(chatId, 
      `✅ TRON地址设置成功！
      
📍 您的地址: \`${address}\`
🔋 现在可以购买能量了！`, 
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error updating user address:', error);
    await this.bot.sendMessage(chatId, '❌ 设置地址失败，请重试');
  }
}

// /transfer 命令 - 内部转账
async handleTransferCommand(msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  
  if (!userId) return;

  const { args } = CommandParser.parseCommand(msg.text || '');
  
  // 验证参数数量
  if (!CommandParser.validateArgCount(args, 2, 2)) {
    await this.bot.sendMessage(chatId, 
      `❌ 使用方法: /transfer <金额> <接收用户ID>
      
示例: /transfer 100 123456789`);
    return;
  }

  const amount = CommandParser.parseAmount(args[0]);
  const recipientId = parseInt(args[1]);

  if (!amount) {
    await this.bot.sendMessage(chatId, '❌ 金额格式错误，请输入有效的数字');
    return;
  }

  if (isNaN(recipientId)) {
    await this.bot.sendMessage(chatId, '❌ 接收用户ID格式错误');
    return;
  }

  try {
    // 执行转账逻辑
    const result = await TransferService.executeTransfer(userId, recipientId, amount);
    
    if (result.success) {
      await this.bot.sendMessage(chatId, 
        `✅ 转账成功！
        
💰 金额: ${amount} USDT
👤 接收方: ${recipientId}
🆔 交易ID: ${result.transactionId}`
      );
    } else {
      await this.bot.sendMessage(chatId, `❌ 转账失败: ${result.error}`);
    }
  } catch (error) {
    console.error('Transfer failed:', error);
    await this.bot.sendMessage(chatId, '❌ 转账处理失败，请重试');
  }
}
```

## ⚠️ 错误处理和反馈

### 统一错误处理

```typescript
class CommandErrorHandler {
  static async handleCommandError(
    bot: TelegramBot,
    chatId: number,
    error: any,
    command: string
  ): Promise<void> {
    console.error(`Command ${command} failed:`, error);

    // 根据错误类型提供不同的用户反馈
    let userMessage = '';

    if (error.code === 'INVALID_PARAMETERS') {
      userMessage = '❌ 命令参数错误，请检查输入格式';
    } else if (error.code === 'PERMISSION_DENIED') {
      userMessage = '❌ 您没有权限执行此命令';
    } else if (error.code === 'USER_NOT_FOUND') {
      userMessage = '❌ 用户不存在，请先使用 /start 注册';
    } else if (error.code === 'RATE_LIMITED') {
      userMessage = '❌ 操作过于频繁，请稍后再试';
    } else if (error.code === 'INSUFFICIENT_BALANCE') {
      userMessage = '❌ 余额不足，请先充值';
    } else {
      userMessage = '❌ 处理命令时发生错误，请重试或联系客服';
    }

    await bot.sendMessage(chatId, userMessage);

    // 记录错误日志
    await this.logCommandError(chatId, command, error);
  }

  private static async logCommandError(
    chatId: number,
    command: string,
    error: any
  ): Promise<void> {
    try {
      // 记录到数据库或日志文件
      console.log(`Command Error Log:`, {
        chatId,
        command,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log command error:', logError);
    }
  }
}
```

### 命令使用统计

```typescript
class CommandStats {
  private static stats = new Map<string, { count: number; lastUsed: Date }>();

  static recordCommandUsage(command: string): void {
    const current = this.stats.get(command) || { count: 0, lastUsed: new Date() };
    current.count++;
    current.lastUsed = new Date();
    this.stats.set(command, current);
  }

  static getStats(): Record<string, { count: number; lastUsed: Date }> {
    return Object.fromEntries(this.stats);
  }

  static getMostUsedCommands(limit: number = 5): Array<{ command: string; count: number }> {
    return Array.from(this.stats.entries())
      .map(([command, stats]) => ({ command, count: stats.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
```

## 🔨 项目具体实现

### 完整的命令注册流程

```typescript
export class CommandHandler {
  private bot: TelegramBot;
  private userService: UserService;
  private orderService: typeof orderService;

  constructor(bot: TelegramBot) {
    this.bot = bot;
    this.userService = new UserService();
    this.orderService = orderService;
  }

  /**
   * 注册所有命令处理器
   */
  registerCommands(): void {
    // 基础命令
    this.registerCommand(/\/start/, this.handleStartCommand.bind(this));
    this.registerCommand(/\/menu/, this.handleMenuCommand.bind(this));
    this.registerCommand(/\/help/, this.handleHelpCommand.bind(this));
    this.registerCommand(/\/balance/, this.handleBalanceCommand.bind(this));
    this.registerCommand(/\/orders/, this.handleOrdersCommand.bind(this));
    
    // 带参数的命令
    this.registerCommand(/\/setaddress/, this.handleSetAddressCommand.bind(this));
    this.registerCommand(/\/transfer/, this.handleTransferCommand.bind(this));
    
    // 管理员命令
    this.registerCommand(/\/admin/, this.handleAdminCommand.bind(this));
    this.registerCommand(/\/broadcast/, this.handleBroadcastCommand.bind(this));
    
    // 取消命令
    this.registerCommand(/\/cancel/, this.handleCancelCommand.bind(this));
  }

  private registerCommand(pattern: RegExp, handler: (msg: TelegramBot.Message) => Promise<void>): void {
    this.bot.onText(pattern, async (msg) => {
      const command = CommandParser.parseCommand(msg.text || '').command;
      
      try {
        // 记录命令使用
        CommandStats.recordCommandUsage(command);
        
        // 权限检查
        const permission = await PermissionManager.checkCommandPermission(
          msg.from?.id || 0, 
          command
        );
        
        if (!permission.allowed) {
          await this.bot.sendMessage(msg.chat.id, `❌ ${permission.reason}`);
          return;
        }

        // 速率限制检查
        if (!await RateLimiter.checkRateLimit(msg.from?.id || 0)) {
          const remaining = RateLimiter.getRemainingCooldown(msg.from?.id || 0);
          await this.bot.sendMessage(
            msg.chat.id, 
            `⏱️ 请稍等 ${remaining} 秒后再使用命令`
          );
          return;
        }

        // 执行命令处理器
        await handler(msg);
        
      } catch (error) {
        await CommandErrorHandler.handleCommandError(
          this.bot,
          msg.chat.id,
          error,
          command
        );
      }
    });
  }

  // 取消当前操作命令
  async handleCancelCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    
    if (!userId) return;

    try {
      // 清除用户的临时状态
      await UserStateManager.clearUserState(userId);
      
      await this.bot.sendMessage(chatId, 
        '❌ 当前操作已取消\n\n' +
        '使用 /menu 返回主菜单'
      );
    } catch (error) {
      console.error('Cancel command failed:', error);
      await this.bot.sendMessage(chatId, '❌ 取消操作失败');
    }
  }

  // 管理员命令
  async handleAdminCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const { args } = CommandParser.parseCommand(msg.text || '');
    
    if (args.length === 0) {
      // 显示管理员菜单
      const adminMenu = `🔧 管理员面板

可用命令:
• /admin stats - 查看统计信息
• /admin users - 用户管理
• /admin orders - 订单管理
• /admin config - 系统配置
• /broadcast <消息> - 广播消息`;

      await this.bot.sendMessage(chatId, adminMenu);
      return;
    }

    const subCommand = args[0];
    
    switch (subCommand) {
      case 'stats':
        await this.handleAdminStats(chatId);
        break;
      case 'users':
        await this.handleAdminUsers(chatId, args.slice(1));
        break;
      case 'orders':
        await this.handleAdminOrders(chatId, args.slice(1));
        break;
      default:
        await this.bot.sendMessage(chatId, '❌ 未知的管理员命令');
    }
  }

  private async handleAdminStats(chatId: number): Promise<void> {
    try {
      const stats = await AdminService.getSystemStats();
      const commandStats = CommandStats.getMostUsedCommands();
      
      const statsMessage = `📊 系统统计信息

👥 用户统计:
• 总用户数: ${stats.totalUsers}
• 活跃用户: ${stats.activeUsers}
• 今日新增: ${stats.newUsersToday}

📋 订单统计:
• 总订单数: ${stats.totalOrders}
• 今日订单: ${stats.ordersToday}
• 成功率: ${stats.successRate}%

🤖 命令使用统计:
${commandStats.map(cmd => `• /${cmd.command}: ${cmd.count} 次`).join('\n')}`;

      await this.bot.sendMessage(chatId, statsMessage);
    } catch (error) {
      console.error('Failed to get admin stats:', error);
      await this.bot.sendMessage(chatId, '❌ 获取统计信息失败');
    }
  }
}
```

### 命令别名和快捷方式

```typescript
// 命令别名映射
const COMMAND_ALIASES = {
  'm': 'menu',
  'h': 'help',
  'b': 'balance',
  'o': 'orders',
  'buy': 'menu', // 直接跳转到购买菜单
  'my': 'orders'
};

// 处理命令别名
function resolveCommandAlias(command: string): string {
  return COMMAND_ALIASES[command] || command;
}

// 在命令解析中使用别名
static parseCommand(text: string): { command: string; args: string[]; rawArgs: string } {
  const parts = text.trim().split(' ');
  let command = parts[0].toLowerCase().replace('/', '');
  
  // 解析别名
  command = resolveCommandAlias(command);
  
  const args = parts.slice(1);
  const rawArgs = text.substring(text.indexOf(' ') + 1).trim();
  
  return { command, args, rawArgs };
}
```

## 🔗 相关文档

- [Messaging API](./01-messaging-api.md) - 消息发送功能
- [Callbacks API](./03-callbacks-api.md) - 回调查询处理
- [User Management API](./06-user-management-api.md) - 用户管理
- [Error Handling](./10-error-handling.md) - 错误处理指南

---

> 💡 **最佳实践提示**
> 1. 始终验证用户权限和参数格式
> 2. 提供清晰的错误提示和使用说明
> 3. 实现合理的速率限制防止滥用
> 4. 记录命令使用统计便于优化
> 5. 为常用操作提供快捷命令或别名
