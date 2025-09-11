# Telegram Bot API 调用限制详解

## 概述

根据Telegram官方文档（https://core.telegram.org/bots/api），Telegram Bot API对所有请求都实施了严格的速率限制，以确保平台稳定性并防止滥用。本文档详细说明了这些限制及其对机器人开发的影响。

## 主要限制

### 1. 消息发送频率限制

#### 私聊（Private Chats）
- **限制**: 每秒最多 30 条消息
- **适用范围**: 与单个用户的私聊
- **触发条件**: 在1秒内向同一用户发送超过30条消息

#### 群组（Groups）
- **限制**: 每分钟最多 20 条消息
- **适用范围**: 普通群组和超级群组
- **触发条件**: 在1分钟内向同一群组发送超过20条消息

#### 频道（Channels）
- **限制**: 每小时约 50-100 条消息
- **变动因素**:
  - 频道类型（公开/私有）
  - 频道历史记录
  - 订阅者数量
  - 频道活跃度

### 2. API调用频率限制

- **全局限制**: 每秒最多 30 次 API 调用
- **适用范围**: 所有API方法（包括sendMessage、getUpdates、setWebhook等）
- **计算方式**: 按机器人Token计算，不区分方法类型

### 3. 群发限制

- **新聊天限制**: 每天最多可与 30-50 个新用户开始对话
- **定义**: "新聊天"指用户首次主动联系机器人，或机器人首次向用户发送消息

### 4. 文件大小限制

#### 普通文件上传
- **限制**: 最大 50MB
- **适用方法**: sendDocument, sendPhoto, sendVideo等

#### 大文件API
- **限制**: 最大 2GB
- **需要**: 特殊权限和配置

## Webhook vs Polling 模式对比

### Webhook 模式（推荐）

#### 优势
- **实时性**: 消息立即推送，无延迟
- **效率**: 不占用API调用限额
- **资源节约**: 服务器不需要持续轮询
- **稳定性**: 减少网络请求，降低被限制风险

#### 限制和要求
- **HTTPS必需**: Webhook URL必须使用HTTPS协议
- **端口限制**: 仅支持 443, 80, 88, 8443 端口
- **响应时间**: 必须在10秒内返回HTTP状态码
- **推荐响应**: 立即返回204状态码，异步处理消息
- **唯一性**: 每个机器人只能设置一个Webhook URL

#### 相关API方法
```
setWebhook - 设置Webhook URL
getWebhookInfo - 获取当前Webhook信息  
deleteWebhook - 删除Webhook设置
```

### Polling 模式（getUpdates）

#### 特点
- **主动拉取**: 机器人主动请求获取消息更新
- **占用配额**: 每次调用都计入API调用限制
- **延迟**: 存在轮询间隔导致的延迟
- **资源消耗**: 持续占用服务器和网络资源

#### 参数说明
- **timeout**: 长轮询超时时间（0-50秒，推荐25-30秒）
- **limit**: 单次获取消息数量（1-100条，默认100）
- **offset**: 消息偏移量，确保不重复处理

#### 调用频率建议
- **高频轮询**: 间隔1-2秒（快速响应，但消耗配额）
- **中频轮询**: 间隔5-10秒（平衡响应速度和配额）
- **低频轮询**: 间隔30秒以上（节约配额，但响应慢）

## 错误处理

### 429 Too Many Requests

当超过速率限制时，API会返回HTTP状态码429，响应头包含：

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 10

{
  "ok": false,
  "error_code": 429,
  "description": "Too Many Requests: retry after 10",
  "parameters": {
    "retry_after": 10
  }
}
```

#### 处理策略
1. **解析Retry-After**: 从响应头或JSON中获取等待时间
2. **指数退避**: 实现逐步增加的重试间隔
3. **队列管理**: 将失败的请求加入重试队列
4. **日志记录**: 记录限制触发情况，用于优化

### 其他常见错误

- **400 Bad Request**: 请求参数错误
- **401 Unauthorized**: Token无效或过期
- **403 Forbidden**: 机器人被阻止或权限不足
- **404 Not Found**: 找不到指定资源
- **500 Internal Server Error**: Telegram服务器内部错误

## 针对新机器人的额外限制

### 初始限制
- **新创建的机器人**: 前几天会有更严格的限制
- **信任度积累**: 需要一段时间的良好使用记录
- **逐步放宽**: 限制会随着机器人信誉度提升而放宽

### 建议措施
1. **渐进式部署**: 新机器人先小范围测试
2. **监控指标**: 密切关注API响应和错误率
3. **优化请求**: 减少不必要的API调用

## 最佳实践

### 1. 请求频率控制

```javascript
// 示例：实现请求队列和速率限制
class TelegramRateLimiter {
  constructor() {
    this.messageQueue = [];
    this.apiQueue = [];
    this.lastMessageTime = 0;
    this.lastApiTime = 0;
  }
  
  async sendMessage(chatId, text, options = {}) {
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;
    
    // 私聊限制：30条/秒
    if (options.chatType === 'private' && timeSinceLastMessage < 1000/30) {
      await this.sleep(1000/30 - timeSinceLastMessage);
    }
    
    // 群组限制：20条/分钟
    if (options.chatType === 'group' && timeSinceLastMessage < 60000/20) {
      await this.sleep(60000/20 - timeSinceLastMessage);
    }
    
    this.lastMessageTime = Date.now();
    return this.makeApiCall('sendMessage', { chat_id: chatId, text, ...options });
  }
  
  async makeApiCall(method, params) {
    const now = Date.now();
    const timeSinceLastApi = now - this.lastApiTime;
    
    // API限制：30次/秒
    if (timeSinceLastApi < 1000/30) {
      await this.sleep(1000/30 - timeSinceLastApi);
    }
    
    this.lastApiTime = Date.now();
    // 实际API调用逻辑
    return this.callTelegramApi(method, params);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. 错误重试机制

```javascript
async function retryApiCall(apiCall, maxRetries = 3) {
  let retries = 0;
  let delay = 1000; // 初始延迟1秒
  
  while (retries < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.statusCode === 429) {
        // 使用服务器指定的重试时间
        const retryAfter = error.retryAfter || delay;
        console.log(`Rate limited, waiting ${retryAfter}ms`);
        await sleep(retryAfter);
        
        // 指数退避
        delay *= 2;
        retries++;
      } else {
        throw error; // 非速率限制错误，直接抛出
      }
    }
  }
  
  throw new Error(`API call failed after ${maxRetries} retries`);
}
```

### 3. Webhook 最佳实践

```javascript
// Express.js Webhook处理示例
app.post('/webhook/:token', (req, res) => {
  // 立即返回200状态码
  res.status(200).send('OK');
  
  // 异步处理消息，避免阻塞响应
  process.nextTick(async () => {
    try {
      await processUpdate(req.body);
    } catch (error) {
      console.error('Error processing update:', error);
    }
  });
});

// 设置Webhook
async function setupWebhook(token, webhookUrl) {
  try {
    const response = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
      url: webhookUrl,
      max_connections: 40, // 最大并发连接数
      drop_pending_updates: true, // 删除待处理的更新
    });
    
    console.log('Webhook设置成功:', response.data);
  } catch (error) {
    console.error('Webhook设置失败:', error.response?.data || error.message);
  }
}
```

## 监控和告警

### 关键指标
1. **API调用成功率**: 监控429错误比例
2. **响应时间**: 跟踪API调用延迟
3. **消息发送量**: 按聊天类型统计
4. **错误率趋势**: 识别异常模式

### 告警设置
- **429错误率 > 5%**: 触发告警
- **平均响应时间 > 5秒**: 性能告警
- **连续API失败**: 立即通知

## 规避限制的技巧

### 1. 消息合并
```javascript
// 将多条短消息合并为一条长消息
const messages = ['消息1', '消息2', '消息3'];
const combinedMessage = messages.join('\n\n');
await bot.sendMessage(chatId, combinedMessage);
```

### 2. 批量处理
```javascript
// 批量处理用户请求，减少API调用
const pendingMessages = [];

function queueMessage(chatId, text) {
  pendingMessages.push({ chatId, text });
}

setInterval(async () => {
  const batch = pendingMessages.splice(0, 30); // 每次处理30条
  for (const msg of batch) {
    await bot.sendMessage(msg.chatId, msg.text);
    await sleep(34); // 确保不超过30条/秒
  }
}, 1000);
```

### 3. 智能缓存
```javascript
// 缓存频繁查询的数据
const cache = new Map();

async function getCachedUserInfo(userId) {
  if (cache.has(userId)) {
    return cache.get(userId);
  }
  
  const userInfo = await bot.getChat(userId);
  cache.set(userId, userInfo);
  
  // 5分钟后清除缓存
  setTimeout(() => cache.delete(userId), 5 * 60 * 1000);
  
  return userInfo;
}
```

## 总结

1. **Webhook优于Polling**: 推荐使用Webhook模式，避免占用API调用配额
2. **严格控制频率**: 实施请求队列和速率限制
3. **智能重试**: 实现指数退避重试机制
4. **监控告警**: 建立完善的监控体系
5. **缓存优化**: 减少重复API调用
6. **批量处理**: 合并相似请求，提高效率

遵守这些限制和最佳实践，可以确保你的Telegram机器人稳定运行，避免被限制或封禁。

## 参考资料

- [Telegram Bot API 官方文档](https://core.telegram.org/bots/api)
- [Telegram Bot FAQ](https://core.telegram.org/bots/faq)
- [Getting updates](https://core.telegram.org/bots/api#getting-updates)
- [Webhooks](https://core.telegram.org/bots/api#setwebhook)

---
*最后更新: 2025年9月11日*

