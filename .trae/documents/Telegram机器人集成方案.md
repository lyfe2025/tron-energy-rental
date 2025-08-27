# Telegram机器人集成方案

## 1. 机器人架构设计

### 1.1 整体架构

```mermaid
graph TD
    A[Telegram用户] --> B[Telegram Bot API]
    B --> C[Webhook接收器]
    C --> D[消息路由器]
    D --> E[命令处理器]
    D --> F[回调处理器]
    D --> G[消息处理器]
    
    E --> H[业务逻辑层]
    F --> H
    G --> H
    
    H --> I[数据库操作]
    H --> J[TRON区块链操作]
    H --> K[支付处理]
    
    L[管理后台] --> M[机器人管理API]
    M --> N[机器人配置]
    M --> O[消息模板]
    M --> P[用户管理]
    
    subgraph "机器人服务层"
        C
        D
        E
        F
        G
    end
    
    subgraph "业务处理层"
        H
        I
        J
        K
    end
    
    subgraph "管理层"
        L
        M
        N
        O
        P
    end
```

### 1.2 技术栈

- **机器人框架**: node-telegram-bot-api
- **消息处理**: Express.js + Webhook
- **状态管理**: Redis Session
- **消息队列**: Bull Queue (Redis)
- **模板引擎**: 自定义消息模板系统

## 2. 机器人功能模块

### 2.1 核心命令

| 命令 | 功能 | 权限 |
|------|------|------|
| /start | 启动机器人，显示欢迎界面 | 所有用户 |
| /help | 显示帮助信息和联系方式 | 所有用户 |
| /menu | 显示主菜单 | 所有用户 |
| /orders | 查看我的订单 | 注册用户 |
| /balance | 查看账户余额 | 注册用户 |
| /agent | 代理相关功能 | 代理用户 |
| /admin | 管理员功能 | 管理员 |

### 2.2 交互式菜单

#### 主菜单 (Inline Keyboard)
```
⚡ 能量闪租    📦 笔数套餐
👥 申请代理    📋 我的订单
💰 账户余额    ❓ 帮助支持
```

#### 能量闪租菜单
```
🔥 32,000能量 - ¥1.5   ⭐ 推荐
⚡ 65,000能量 - ¥2.8   🔥 热门
💎 131,000能量 - ¥5.2  💼 企业
🚀 262,000能量 - ¥9.8  🎯 定制

🔙 返回主菜单
```

#### 笔数套餐菜单
```
📦 10笔套餐 - ¥5.0    💰 经济
📦 50笔套餐 - ¥20.0   ⭐ 推荐
📦 100笔套餐 - ¥35.0  🔥 热门
📦 500笔套餐 - ¥150.0 💼 企业

🔙 返回主菜单
```

## 3. 消息处理流程

### 3.1 用户交互流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant T as Telegram
    participant B as 机器人服务
    participant D as 数据库
    participant TR as TRON网络
    
    U->>T: 发送 /start
    T->>B: Webhook通知
    B->>D: 查询/创建用户
    B->>T: 发送欢迎消息+主菜单
    T->>U: 显示界面
    
    U->>T: 点击"能量闪租"
    T->>B: 回调查询
    B->>D: 获取套餐列表
    B->>T: 发送套餐选择菜单
    T->>U: 显示套餐选项
    
    U->>T: 选择套餐
    T->>B: 回调查询
    B->>T: 请求TRON地址
    T->>U: 提示输入地址
    
    U->>T: 输入TRON地址
    T->>B: 消息通知
    B->>D: 创建订单
    B->>T: 发送支付信息
    T->>U: 显示支付二维码
    
    Note over B,TR: 监控支付状态
    B->>TR: 检查交易
    TR->>B: 交易确认
    B->>TR: 委托能量
    B->>T: 发送完成通知
    T->>U: 显示成功消息
```

### 3.2 状态管理

```javascript
// 用户会话状态
const UserState = {
  IDLE: 'idle',                    // 空闲状态
  SELECTING_PACKAGE: 'selecting_package',  // 选择套餐
  ENTERING_ADDRESS: 'entering_address',    // 输入地址
  CONFIRMING_ORDER: 'confirming_order',    // 确认订单
  WAITING_PAYMENT: 'waiting_payment',      // 等待支付
  APPLYING_AGENT: 'applying_agent',        // 申请代理
  VIEWING_ORDERS: 'viewing_orders'         // 查看订单
};

// 状态转换
const stateTransitions = {
  [UserState.IDLE]: [UserState.SELECTING_PACKAGE, UserState.APPLYING_AGENT],
  [UserState.SELECTING_PACKAGE]: [UserState.ENTERING_ADDRESS, UserState.IDLE],
  [UserState.ENTERING_ADDRESS]: [UserState.CONFIRMING_ORDER, UserState.SELECTING_PACKAGE],
  [UserState.CONFIRMING_ORDER]: [UserState.WAITING_PAYMENT, UserState.ENTERING_ADDRESS],
  [UserState.WAITING_PAYMENT]: [UserState.IDLE]
};
```

## 4. 消息模板系统

### 4.1 模板结构

```javascript
// 消息模板配置
const messageTemplates = {
  welcome: {
    text: `🎉 欢迎使用TRON能量租赁服务！

⚡ 快速解决TRC20转账能量不足问题
💰 超低价格，秒级到账
🔒 安全可靠，7x24小时服务

请选择您需要的服务：`,
    keyboard: 'main_menu'
  },
  
  energy_packages: {
    text: `⚡ 能量闪租套餐

选择适合您的能量套餐：
🔥 32,000能量 - ¥1.5 (约1-2笔转账)
⚡ 65,000能量 - ¥2.8 (约3-4笔转账)
💎 131,000能量 - ¥5.2 (约6-8笔转账)
🚀 262,000能量 - ¥9.8 (约12-15笔转账)

💡 能量有效期：1小时`,
    keyboard: 'energy_packages'
  },
  
  order_created: {
    text: `📋 订单创建成功！

订单号：{orderId}
套餐：{packageName}
金额：¥{amount}
目标地址：{targetAddress}

💳 请扫描下方二维码支付：`,
    keyboard: 'payment_options'
  },
  
  order_completed: {
    text: `✅ 能量委托成功！

订单号：{orderId}
能量数量：{energyAmount}
目标地址：{targetAddress}
交易哈希：{txHash}

⚡ 能量已成功委托到您的地址，现在可以进行TRC20转账了！`,
    keyboard: 'main_menu'
  }
};
```

### 4.2 键盘布局配置

```javascript
// 键盘布局配置
const keyboards = {
  main_menu: {
    inline_keyboard: [
      [
        { text: '⚡ 能量闪租', callback_data: 'energy_rent' },
        { text: '📦 笔数套餐', callback_data: 'package_buy' }
      ],
      [
        { text: '👥 申请代理', callback_data: 'apply_agent' },
        { text: '📋 我的订单', callback_data: 'my_orders' }
      ],
      [
        { text: '💰 账户余额', callback_data: 'balance' },
        { text: '❓ 帮助支持', callback_data: 'help' }
      ]
    ]
  },
  
  energy_packages: {
    inline_keyboard: [
      [
        { text: '🔥 32,000能量 - ¥1.5', callback_data: 'package_1' },
        { text: '⚡ 65,000能量 - ¥2.8', callback_data: 'package_2' }
      ],
      [
        { text: '💎 131,000能量 - ¥5.2', callback_data: 'package_3' },
        { text: '🚀 262,000能量 - ¥9.8', callback_data: 'package_4' }
      ],
      [
        { text: '🔙 返回主菜单', callback_data: 'main_menu' }
      ]
    ]
  }
};
```

## 5. 机器人管理后台集成

### 5.1 机器人配置管理

```javascript
// 机器人配置API
class BotManager {
  // 添加新机器人
  async addBot(config) {
    const bot = await Bot.create({
      name: config.name,
      token: config.token,
      webhook_url: config.webhookUrl,
      is_active: true
    });
    
    // 设置Webhook
    await this.setWebhook(bot.token, bot.webhook_url);
    
    return bot;
  }
  
  // 更新机器人状态
  async updateBotStatus(botId, isActive) {
    const bot = await Bot.findByPk(botId);
    bot.is_active = isActive;
    await bot.save();
    
    if (isActive) {
      await this.startBot(bot.token);
    } else {
      await this.stopBot(bot.token);
    }
  }
  
  // 获取机器人统计
  async getBotStats(botId) {
    const stats = await BotUser.findAll({
      where: { bot_id: botId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('user_id')), 'total_users'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN last_interaction > NOW() - INTERVAL \'24 hours\' THEN 1 END')), 'active_users']
      ]
    });
    
    return stats;
  }
}
```

### 5.2 消息模板管理

```javascript
// 消息模板管理API
class TemplateManager {
  // 更新消息模板
  async updateTemplate(templateKey, content) {
    await MessageTemplate.upsert({
      key: templateKey,
      content: content,
      updated_at: new Date()
    });
    
    // 重新加载模板缓存
    await this.reloadTemplates();
  }
  
  // 获取模板列表
  async getTemplates() {
    return await MessageTemplate.findAll({
      order: [['key', 'ASC']]
    });
  }
  
  // 预览模板效果
  async previewTemplate(templateKey, variables = {}) {
    const template = await MessageTemplate.findOne({
      where: { key: templateKey }
    });
    
    return this.renderTemplate(template.content, variables);
  }
}
```

## 6. 安全和监控

### 6.1 安全措施

```javascript
// 安全中间件
class SecurityMiddleware {
  // 验证Telegram Webhook
  static verifyTelegramWebhook(req, res, next) {
    const token = req.headers['x-telegram-bot-api-secret-token'];
    if (token !== process.env.TELEGRAM_SECRET_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  }
  
  // 用户频率限制
  static async rateLimitUser(userId) {
    const key = `rate_limit:${userId}`;
    const current = await redis.get(key);
    
    if (current && parseInt(current) > 30) { // 每分钟最多30次请求
      throw new Error('Rate limit exceeded');
    }
    
    await redis.incr(key);
    await redis.expire(key, 60);
  }
  
  // 敏感信息过滤
  static filterSensitiveData(message) {
    // 过滤私钥、助记词等敏感信息
    const sensitivePatterns = [
      /[0-9a-fA-F]{64}/, // 私钥模式
      /\b\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\b/ // 助记词模式
    ];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return '⚠️ 检测到敏感信息，消息已被过滤';
      }
    }
    
    return message;
  }
}
```

### 6.2 监控和日志

```javascript
// 机器人监控
class BotMonitor {
  // 记录用户交互
  static async logUserInteraction(botId, userId, action, data = {}) {
    await UserInteraction.create({
      bot_id: botId,
      user_id: userId,
      action: action,
      data: JSON.stringify(data),
      timestamp: new Date()
    });
  }
  
  // 监控机器人健康状态
  static async checkBotHealth() {
    const bots = await Bot.findAll({ where: { is_active: true } });
    
    for (const bot of bots) {
      try {
        const response = await axios.get(`https://api.telegram.org/bot${bot.token}/getMe`);
        if (!response.data.ok) {
          await this.alertBotDown(bot.id, 'API调用失败');
        }
      } catch (error) {
        await this.alertBotDown(bot.id, error.message);
      }
    }
  }
  
  // 生成使用统计报告
  static async generateUsageReport(botId, startDate, endDate) {
    const stats = await UserInteraction.findAll({
      where: {
        bot_id: botId,
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'unique_users']
      ],
      group: ['action']
    });
    
    return stats;
  }
}
```

## 7. 部署和配置

### 7.1 环境配置

```bash
# .env 配置文件
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_SECRET_TOKEN=your_secret_token_here
WEBHOOK_URL=https://yourdomain.com/webhook/telegram
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:password@localhost:5432/tron_energy
TRON_NETWORK=shasta
TRON_API_KEY=your_tron_api_key
```

### 7.2 Webhook设置

```javascript
// 设置Telegram Webhook
const setupWebhook = async () => {
  const webhookUrl = `${process.env.WEBHOOK_URL}/telegram`;
  const secretToken = process.env.TELEGRAM_SECRET_TOKEN;
  
  const response = await axios.post(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
    {
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query', 'inline_query']
    }
  );
  
  console.log('Webhook设置结果:', response.data);
};
```

### 7.3 启动脚本

```javascript
// app.js - 主启动文件
const express = require('express');
const TelegramBot = require('./services/TelegramBot');
const BotManager = require('./services/BotManager');

const app = express();
app.use(express.json());

// Telegram Webhook路由
app.post('/webhook/telegram', async (req, res) => {
  try {
    await TelegramBot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook处理错误:', error);
    res.status(500).send('Error');
  }
});

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`服务器启动在端口 ${PORT}`);
  
  // 初始化机器人
  await BotManager.initializeBots();
  
  // 设置Webhook
  await setupWebhook();
});
```