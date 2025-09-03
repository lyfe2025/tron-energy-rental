# 📨 消息发送 API 详细文档

> Telegram Bot 消息发送相关 API 的完整指南和项目实际使用示例

## 📋 目录

- [基础消息发送](#基础消息发送)
- [多媒体消息](#多媒体消息)
- [消息编辑和删除](#消息编辑和删除)
- [消息格式化](#消息格式化)
- [错误处理](#错误处理)
- [性能优化](#性能优化)
- [项目实际示例](#项目实际示例)

## 📤 基础消息发送

### sendMessage

发送文本消息，这是最基础也是最常用的 API。

#### 接口定义

```typescript
async sendMessage(
  chatId: number, 
  message: string, 
  options?: TelegramBot.SendMessageOptions
): Promise<TelegramBot.Message>
```

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `chatId` | `number` | ✅ | 目标聊天 ID |
| `message` | `string` | ✅ | 消息文本内容 (1-4096 字符) |
| `options` | `SendMessageOptions` | ❌ | 消息选项配置 |

#### 消息选项 (SendMessageOptions)

```typescript
interface SendMessageOptions {
  // 消息格式化
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  entities?: MessageEntity[];
  
  // 消息行为
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  
  // 回复设置
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  
  // 键盘设置
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;
}
```

#### 项目中的使用示例

```typescript
// 1. 基础文本消息
await botService.sendMessage(chatId, '🎉 欢迎使用TRON能量租赁机器人！');

// 2. 带格式的消息（Markdown）
const welcomeMessage = `🎉 欢迎使用TRON能量租赁机器人！

👋 你好，${user.firstName}！

🔋 我们提供快速、安全的TRON能量租赁服务：
• 💰 超低价格，性价比最高
• ⚡ 秒级到账，即买即用
• 🛡️ 安全可靠，无需私钥
• 🎯 多种套餐，满足不同需求

📱 使用 /menu 查看主菜单
❓ 使用 /help 获取帮助`;

await botService.sendMessage(chatId, welcomeMessage, {
  parse_mode: 'Markdown'
});

// 3. 带内联键盘的消息
const balanceMessage = `💰 账户余额信息

💵 USDT余额: ${user.usdt_balance || 0} USDT
🔴 TRX余额: ${user.trx_balance || 0} TRX
📊 总订单数: ${user.total_orders || 0}
💸 总消费: ${user.total_spent || 0} USDT
⚡ 总能量使用: ${user.total_energy_used || 0} Energy`;

await botService.sendMessage(chatId, balanceMessage, {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🔄 刷新余额', callback_data: 'refresh_balance' },
        { text: '💰 充值', callback_data: 'recharge' }
      ],
      [
        { text: '🔙 返回主菜单', callback_data: 'main_menu' }
      ]
    ]
  }
});

// 4. 静默消息（不发送通知）
await botService.sendMessage(chatId, '⏳ 正在处理您的订单...', {
  disable_notification: true
});
```

## 🖼️ 多媒体消息

### sendPhoto

发送图片消息，支持本地文件、URL 或 Buffer。

#### 接口定义

```typescript
async sendPhoto(
  chatId: number, 
  photo: string | Buffer, 
  options?: TelegramBot.SendPhotoOptions
): Promise<TelegramBot.Message>
```

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `chatId` | `number` | ✅ | 目标聊天 ID |
| `photo` | `string \| Buffer` | ✅ | 图片文件路径、URL 或 Buffer |
| `options` | `SendPhotoOptions` | ❌ | 图片选项配置 |

#### 项目中的使用示例

```typescript
// 1. 发送二维码图片
await botService.sendPhoto(chatId, qrCodeBuffer, {
  caption: `💳 请扫描二维码完成支付
  
💰 金额: ${order.price_trx} TRX
📍 地址: \`${paymentAddress}\`
⏰ 有效期: 30分钟`,
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: [
      [
        { text: '✅ 我已支付', callback_data: `confirm_payment_${order.id}` },
        { text: '❌ 取消订单', callback_data: `cancel_order_${order.id}` }
      ]
    ]
  }
});

// 2. 发送截图或状态图片
await botService.sendPhoto(chatId, 'https://example.com/energy-status.png', {
  caption: '📊 当前能量委托状态图表',
  disable_notification: true
});
```

### sendDocument

发送文档文件，支持多种格式。

#### 接口定义

```typescript
async sendDocument(
  chatId: number, 
  document: string | Buffer, 
  options?: TelegramBot.SendDocumentOptions
): Promise<TelegramBot.Message>
```

#### 项目中的使用示例

```typescript
// 发送订单详情 PDF
const orderPDF = await generateOrderPDF(order);
await botService.sendDocument(chatId, orderPDF, {
  caption: `📋 订单 #${order.id} 详情文档`,
  filename: `order-${order.id}.pdf`,
  reply_markup: {
    inline_keyboard: [
      [{ text: '🔙 返回订单列表', callback_data: 'my_orders' }]
    ]
  }
});

// 发送交易记录 Excel
const transactionExcel = await generateTransactionExcel(userId);
await botService.sendDocument(chatId, transactionExcel, {
  caption: '📊 您的交易记录表格',
  filename: `transactions-${Date.now()}.xlsx`
});
```

## ✏️ 消息编辑和删除

### editMessageText

编辑已发送的消息文本。

#### 接口定义

```typescript
async editMessageText(
  text: string, 
  options: TelegramBot.EditMessageTextOptions
): Promise<TelegramBot.Message | boolean>
```

#### 项目中的使用示例

```typescript
// 更新订单状态消息
const originalMessage = await botService.sendMessage(chatId, '⏳ 正在处理订单...');

// 处理完成后更新消息
await botService.editMessageText('✅ 订单处理完成！', {
  chat_id: chatId,
  message_id: originalMessage.message_id,
  reply_markup: {
    inline_keyboard: [
      [{ text: '📊 查看详情', callback_data: `order_detail_${order.id}` }]
    ]
  }
});

// 更新支付倒计时
let countdown = 1800; // 30分钟
const updateCountdown = async () => {
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  
  await botService.editMessageText(
    `⏰ 支付倒计时: ${minutes}:${seconds.toString().padStart(2, '0')}`,
    {
      chat_id: chatId,
      message_id: messageId
    }
  );
  
  countdown--;
  if (countdown >= 0) {
    setTimeout(updateCountdown, 1000);
  }
};
```

### deleteMessage

删除指定消息。

#### 接口定义

```typescript
async deleteMessage(chatId: number, messageId: number): Promise<boolean>
```

#### 项目中的使用示例

```typescript
// 删除敏感信息消息
const sensitiveMessage = await botService.sendMessage(chatId, 
  `🔑 您的私钥: ${privateKey}`
);

// 5秒后自动删除
setTimeout(async () => {
  await botService.deleteMessage(chatId, sensitiveMessage.message_id);
}, 5000);

// 清理过期的支付消息
const paymentMessage = await botService.sendMessage(chatId, paymentInfo);
setTimeout(async () => {
  try {
    await botService.deleteMessage(chatId, paymentMessage.message_id);
    await botService.sendMessage(chatId, '⏰ 支付时间已过期，请重新下单。');
  } catch (error) {
    console.log('Message already deleted or not found');
  }
}, 30 * 60 * 1000); // 30分钟后删除
```

## 🎨 消息格式化

### Markdown 格式

Telegram 支持基础的 Markdown 格式：

```typescript
const markdownMessage = `
*粗体文本*
_斜体文本_
\`等宽字体\`
\`\`\`
代码块
\`\`\`
[链接文本](https://example.com)
`;

await botService.sendMessage(chatId, markdownMessage, {
  parse_mode: 'Markdown'
});
```

### HTML 格式

更强大的 HTML 格式支持：

```typescript
const htmlMessage = `
<b>粗体文本</b>
<i>斜体文本</i>
<u>下划线</u>
<s>删除线</s>
<code>等宽字体</code>
<pre>代码块</pre>
<a href="https://example.com">链接文本</a>
`;

await botService.sendMessage(chatId, htmlMessage, {
  parse_mode: 'HTML'
});
```

### 项目中的格式化示例

```typescript
// 订单详情格式化
const orderDetails = `
<b>📋 订单详情</b>

<b>订单号:</b> <code>#${order.id}</code>
<b>套餐:</b> ${packageInfo.name}
<b>能量:</b> <code>${order.energy_amount.toLocaleString()}</code> Energy
<b>价格:</b> <code>${order.price_trx}</code> TRX
<b>状态:</b> ${getStatusEmoji(order.status)} ${getStatusText(order.status)}
<b>创建时间:</b> ${new Date(order.created_at).toLocaleString('zh-CN')}

<b>接收地址:</b>
<code>${order.recipient_address}</code>

${order.tx_hash ? `<b>交易哈希:</b>\n<code>${order.tx_hash}</code>` : ''}
`;

await botService.sendMessage(chatId, orderDetails, {
  parse_mode: 'HTML',
  disable_web_page_preview: true
});
```

## 🚨 错误处理

### 常见错误类型

```typescript
interface TelegramError {
  error_code: number;
  description: string;
  parameters?: {
    retry_after?: number;
    migrate_to_chat_id?: number;
  };
}
```

### 错误处理示例

```typescript
async function sendMessageWithRetry(
  chatId: number, 
  message: string, 
  options?: any,
  maxRetries: number = 3
): Promise<TelegramBot.Message | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await botService.sendMessage(chatId, message, options);
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      // 处理特定错误
      switch (error.response?.body?.error_code) {
        case 400:
          // 错误的请求参数
          console.error('Bad request:', error.response.body.description);
          return null; // 不重试
          
        case 403:
          // 用户阻止了机器人
          console.log('User blocked the bot');
          return null; // 不重试
          
        case 429:
          // 请求频率限制
          const retryAfter = error.response.body.parameters?.retry_after || 1;
          console.log(`Rate limited, retrying after ${retryAfter} seconds`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue; // 重试
          
        case 500:
        case 502:
        case 503:
          // 服务器错误，可以重试
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          break;
          
        default:
          console.error('Unknown error:', error);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
      }
    }
  }
  
  return null;
}
```

### 项目中的错误处理

```typescript
// 在项目的 BotUtils 类中的错误处理
export class BotUtils {
  async sendErrorMessage(chatId: number, error?: BotError): Promise<void> {
    const errorMessage = error?.message || '❌ 系统暂时繁忙，请稍后再试。';
    
    try {
      await this.bot.sendMessage(chatId, errorMessage);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
      
      // 如果发送错误消息也失败，尝试发送最基础的错误提示
      try {
        await this.bot.sendMessage(chatId, '❌ 系统错误');
      } catch (finalError) {
        console.error('Failed to send basic error message:', finalError);
      }
    }
  }
}
```

## 🚀 性能优化

### 批量消息发送

```typescript
// 避免短时间内大量发送消息
class MessageQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private readonly delay = 100; // 100ms 间隔

  async addMessage(fn: () => Promise<void>) {
    this.queue.push(fn);
    this.processQueue();
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        try {
          await fn();
        } catch (error) {
          console.error('Message send failed:', error);
        }
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    this.processing = false;
  }
}

// 使用示例
const messageQueue = new MessageQueue();

// 批量发送通知
users.forEach(user => {
  messageQueue.addMessage(async () => {
    await botService.sendMessage(user.chat_id, '📢 系统维护通知...');
  });
});
```

### 消息缓存

```typescript
// 缓存常用消息内容
class MessageCache {
  private cache = new Map<string, string>();
  private readonly TTL = 5 * 60 * 1000; // 5分钟缓存

  set(key: string, message: string) {
    this.cache.set(key, message);
    setTimeout(() => this.cache.delete(key), this.TTL);
  }

  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  // 获取或生成消息
  async getOrGenerate(key: string, generator: () => Promise<string>): Promise<string> {
    let message = this.get(key);
    if (!message) {
      message = await generator();
      this.set(key, message);
    }
    return message;
  }
}

// 使用示例
const messageCache = new MessageCache();

const helpMessage = await messageCache.getOrGenerate('help_message', async () => {
  return generateHelpMessage(); // 耗时的消息生成函数
});

await botService.sendMessage(chatId, helpMessage);
```

## 📊 项目实际示例

### 完整的订单流程消息

```typescript
// 1. 订单创建消息
async function sendOrderCreatedMessage(chatId: number, order: Order, packageInfo: EnergyPackage) {
  const message = `✅ 订单创建成功！

📋 <b>订单信息</b>
订单号: <code>#${order.id}</code>
套餐: ${packageInfo.name}
能量: <code>${order.energy_amount.toLocaleString()}</code> Energy
金额: <code>${order.price_trx}</code> TRX
接收地址: <code>${order.recipient_address}</code>

💳 <b>支付信息</b>
请转账到以下地址完成支付：
<code>${process.env.TRON_PAYMENT_ADDRESS}</code>

⏰ 请在30分钟内完成支付，逾期订单将自动取消。`;

  return await botService.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ 我已支付', callback_data: `confirm_payment_${order.id}` },
          { text: '❌ 取消订单', callback_data: `cancel_order_${order.id}` }
        ],
        [
          { text: '📋 查看详情', callback_data: `order_detail_${order.id}` }
        ]
      ]
    }
  });
}

// 2. 支付确认消息
async function sendPaymentConfirmedMessage(chatId: number, order: Order) {
  const message = `🎉 <b>支付确认成功！</b>

订单号: <code>#${order.id}</code>
能量委托正在处理中...

⚡ 预计3-5分钟内完成委托
📱 您将收到委托完成通知`;

  return await botService.sendMessage(chatId, message, {
    parse_mode: 'HTML'
  });
}

// 3. 委托完成消息
async function sendDelegationCompletedMessage(
  chatId: number, 
  order: Order, 
  delegationResult: DelegationResult
) {
  const message = `🎉 <b>能量委托成功！</b>

⚡ 能量数量: <code>${order.energy_amount.toLocaleString()}</code> Energy
📍 接收地址: <code>${order.recipient_address}</code>
⏰ 委托时长: ${order.duration_hours}小时
🔗 交易ID: <code>${delegationResult.txId}</code>
📋 委托ID: <code>${delegationResult.delegationId}</code>

✨ 能量已成功委托到您的地址，请查看钱包确认。

<b>重要提醒:</b>
• 能量有效期为 ${order.duration_hours} 小时
• 请在有效期内使用完毕
• 如有问题请及时联系客服`;

  return await botService.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 查看委托状态', callback_data: `delegation_status_${delegationResult.delegationId}` }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'main_menu' },
          { text: '🔄 再次购买', callback_data: 'buy_energy' }
        ]
      ]
    }
  });
}
```

### 广播消息功能

```typescript
// 系统广播消息
async function broadcastSystemMessage(message: string, userIds?: number[]) {
  const messageQueue = new MessageQueue();
  let sentCount = 0;
  let failedCount = 0;

  // 如果没有指定用户，获取所有活跃用户
  if (!userIds) {
    const activeUsers = await UserService.getActiveUsers();
    userIds = activeUsers.map(user => user.telegram_id);
  }

  console.log(`开始广播消息给 ${userIds.length} 个用户`);

  // 批量发送
  for (const userId of userIds) {
    messageQueue.addMessage(async () => {
      try {
        await botService.sendMessage(userId, message, {
          disable_web_page_preview: true
        });
        sentCount++;
        
        // 每100个用户报告一次进度
        if (sentCount % 100 === 0) {
          console.log(`已发送 ${sentCount}/${userIds!.length} 条消息`);
        }
      } catch (error) {
        failedCount++;
        console.error(`发送给用户 ${userId} 失败:`, error);
      }
    });
  }

  // 等待所有消息发送完成
  await new Promise(resolve => {
    const checkComplete = () => {
      if (sentCount + failedCount >= userIds!.length) {
        resolve(void 0);
      } else {
        setTimeout(checkComplete, 1000);
      }
    };
    checkComplete();
  });

  console.log(`广播完成: 成功 ${sentCount} 条，失败 ${failedCount} 条`);
  
  return { sentCount, failedCount };
}

// 使用示例
await broadcastSystemMessage(`📢 <b>系统公告</b>

🔧 系统将于今晚 23:00-01:00 进行维护升级
⚡ 维护期间暂停能量委托服务
💰 维护完成后将赠送所有用户 1000 Energy

感谢您的支持和理解！`);
```

## 🔗 相关文档

- [Callbacks API](./03-callbacks-api.md) - 回调查询处理
- [Keyboards API](./04-keyboards-api.md) - 键盘和按钮
- [Error Handling](./10-error-handling.md) - 详细错误处理指南
- [Performance Optimization](./11-performance-optimization.md) - 性能优化技巧

---

> 💡 **最佳实践提示**
> 1. 总是检查消息长度限制（4096字符）
> 2. 使用适当的错误处理和重试机制
> 3. 对于敏感信息，考虑消息的自动删除
> 4. 合理使用消息格式化提升用户体验
> 5. 批量操作时注意 API 频率限制
