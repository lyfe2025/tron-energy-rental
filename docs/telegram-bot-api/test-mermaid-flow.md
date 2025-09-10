# 测试修复后的 Mermaid 流程图

## 🔄 Polling 模式流程图测试

```mermaid
sequenceDiagram
    participant U as 用户
    participant T as Telegram API
    participant B as Bot服务器
    participant H as CommandHandler
    
    Note over B,T: 🔄 持续轮询状态
    loop 每1秒轮询
        B->>T: getUpdates API 调用
        Note over T: 检查消息队列
        T-->>B: 返回空（无消息）
    end
    
    Note over U: 👤 用户发送消息
    U->>T: 发送 "/help" 到 @NLZLceshi003bot
    T->>T: 消息存储到更新队列
    
    Note over B,T: 🎯 轮询获取消息
    B->>T: getUpdates API 调用
    T->>B: 返回用户消息更新
    Note over T: JSON响应数据:<br/>update_id: 123456<br/>message.text: "/help"<br/>chat.id: 12345
    
    Note over B,H: 📝 消息处理
    B->>H: 路由到 /help 命令处理器
    H->>H: 生成帮助信息
    H->>B: 返回响应内容
    
    Note over B,T: 📤 发送响应
    B->>T: sendMessage API 调用
    T->>U: 显示帮助信息
    
    Note over B,T: ♻️ 继续轮询
    loop 继续轮询
        B->>T: getUpdates API 调用
        T-->>B: 返回空（无新消息）
    end
```

## 🔗 Webhook 模式流程图测试

```mermaid
sequenceDiagram
    participant U as 用户
    participant T as Telegram API
    participant B as Bot服务器
    participant W as Webhook处理器
    participant H as CommandHandler
    
    Note over B,T: 🌐 Webhook 已注册
    B->>T: setWebhook API 调用
    Note over T: webhook_url:<br/>https://domain.com/api/telegram/webhook/cadc6941...
    T-->>B: Webhook 注册成功
    
    Note over U: 👤 用户发送消息
    U->>T: 发送 "/help" 到 @tron_energy_bot
    
    Note over T,W: ⚡ 实时推送（无延迟）
    T->>W: POST /api/telegram/webhook/cadc6941-fa3a-4c2c-9ace-6723c9ae9b83
    Note over W: 接收JSON数据:<br/>update_id: 789012<br/>message.text: "/help"<br/>chat.id: 67890
    
    Note over W,T: 🚀 快速响应（关键！）
    W-->>T: 200 OK 状态码
    Note over T: Telegram 确认消息已接收
    
    Note over W,H: 🔀 异步处理
    W->>H: 异步调用命令处理器
    H->>H: 生成帮助信息
    H->>W: 返回响应内容
    
    Note over W,T: 📤 发送响应
    W->>T: sendMessage API 调用
    T->>U: 显示帮助信息
```

## 修复说明

### 🔧 问题原因
原流程图中包含的 JSON 对象格式：
```json
{
  "update_id": 123456,
  "message": {
    "chat": {"id": 12345},
    "text": "/help"
  }
}
```

这种格式在 Mermaid sequenceDiagram 中会导致语法错误。

### ✅ 解决方案
将 JSON 数据转换为 Mermaid 兼容的格式：
```
Note over T: JSON响应数据:<br/>update_id: 123456<br/>message.text: "/help"<br/>chat.id: 12345
```

使用 `<br/>` 标签进行换行，避免复杂的对象结构。
