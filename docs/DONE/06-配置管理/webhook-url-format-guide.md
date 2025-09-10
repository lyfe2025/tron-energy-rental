# Webhook URL 格式说明

## 📐 标准格式

```
https://您的域名.com/api/telegram/webhook/机器人ID
```

### 格式组成部分

| 部分 | 示例 | 说明 | 可修改 |
|------|------|------|--------|
| 协议 | `https://` | 必须使用HTTPS | ❌ 固定 |
| 域名 | `your-domain.com` | 您的服务器域名 | ✅ 可自定义 |
| API路径 | `/api/telegram/webhook` | 系统固定路径 | ❌ 不可变 |
| 机器人ID | `/abc123-def456` | 系统自动生成 | ❌ 自动添加 |

## ✅ 可自定义部分

### 域名配置选项
- **主域名**: `https://yourdomain.com/api/telegram/webhook`
- **子域名**: `https://api.yourdomain.com/api/telegram/webhook`
- **ngrok地址**: `https://abc123.ngrok-free.app/api/telegram/webhook`
- **自定义端口**: `https://domain.com:8443/api/telegram/webhook`

### 支持的端口
- 443 (推荐，HTTPS默认端口)
- 80 (HTTP，但Telegram要求HTTPS)
- 88
- 8443

## ❌ 不可修改部分

### 固定的API路径
```
/api/telegram/webhook
```

**错误示例**:
- ❌ `/webhook`
- ❌ `/api/bot/webhook`
- ❌ `/my-custom-webhook`
- ❌ `/telegram/webhook`

### 机器人ID部分
- 系统自动生成UUID格式
- 创建时自动添加到基础URL末尾
- 用于区分不同机器人的消息

## 💡 配置流程

### 1. 用户输入
```
https://your-domain.com/api/telegram/webhook
```

### 2. 系统处理
```
基础URL + 机器人ID
= https://your-domain.com/api/telegram/webhook/abc123-def456
```

### 3. 最终结果
- **数据库存储**: 完整URL（包含机器人ID）
- **Telegram配置**: 使用完整URL接收消息
- **系统路由**: 根据机器人ID自动路由消息

## 🚨 常见错误

### 路径格式错误
```bash
❌ https://domain.com/webhook/my-bot
   → 404 Not Found (路径不匹配)

❌ https://domain.com/api/custom/webhook
   → 404 Not Found (API路径不存在)

✅ https://domain.com/api/telegram/webhook
   → 200 OK (正确格式)
```

### 协议错误
```bash
❌ http://domain.com/api/telegram/webhook
   → Telegram拒绝HTTP协议

✅ https://domain.com/api/telegram/webhook
   → Telegram接受HTTPS协议
```

## 🔧 技术实现

### Express路由匹配
```typescript
// 系统中的路由定义
app.use('/api/telegram', telegramRoutes);

router.post('/webhook/:botId', (req, res) => {
  const botId = req.params.botId;  // 提取机器人ID
  // 路由到对应的机器人实例
});
```

### URL解析流程
```
https://domain.com/api/telegram/webhook/abc123-def456
                    ↓
Express Router: /api/telegram/webhook/:botId
                    ↓
提取参数: botId = "abc123-def456"
                    ↓
查找机器人实例: getBotInstance(botId)
                    ↓
处理消息: bot.processWebhookUpdate(message)
```

## 📋 验证清单

配置Webhook时请确认：

- [ ] 使用HTTPS协议
- [ ] 域名可以公网访问
- [ ] 路径严格按照 `/api/telegram/webhook` 格式
- [ ] 不手动添加机器人ID
- [ ] SSL证书有效
- [ ] 服务器正常运行

---

> 💡 **重要提醒**: 路径格式是系统架构的一部分，不支持自定义。只有域名部分可以根据您的服务器配置进行调整。
