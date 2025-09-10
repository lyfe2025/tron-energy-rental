# Webhook URL 设置指南

## 🎯 概述

本系统采用**智能URL处理机制**，自动为每个机器人生成独立的Webhook地址，彻底解决多机器人环境下的消息路由冲突问题。

## 🔧 工作原理

### 用户体验流程

1. **用户输入基础URL**
   ```
   用户填写：https://your-domain.com/api/telegram/webhook
   ```

2. **系统自动处理**
   ```
   系统生成：https://your-domain.com/api/telegram/webhook/[机器人ID]
   ```

3. **Telegram接收配置**
   ```
   Telegram使用：https://your-domain.com/api/telegram/webhook/abc123-def456
   ```

### 核心优势

- ✅ **防止冲突**：每个机器人都有独立的接收地址
- ✅ **自动管理**：无需手动管理机器人ID
- ✅ **完全隔离**：消息路由到正确的机器人实例
- ✅ **用户友好**：简化配置流程

## 📋 设置步骤

### 1. 创建机器人时

1. 选择 **Webhook模式**
2. 填写 **基础URL**（不需要包含机器人ID）
   ```
   示例：https://your-ngrok-domain.ngrok-free.app/api/telegram/webhook
   ```
3. 系统会自动显示**最终URL预览**
4. 创建完成后，系统自动：
   - 生成最终URL
   - 向Telegram注册Webhook
   - 更新数据库配置

### 2. 编辑机器人时

1. 在Webhook配置区域可以看到：
   - **基础URL**：您输入的原始地址
   - **最终URL**：系统生成的完整地址
   - **Telegram中的URL**：当前在Telegram注册的地址
2. 修改基础URL时，系统会自动重新生成最终URL
3. 点击"应用设置"同步到Telegram

## 🔍 URL格式说明

### 标准格式

```
基础URL/机器人ID
```

### 示例对比

| 场景 | 用户输入 | 系统生成 |
|------|----------|----------|
| 创建机器人 | `https://domain.com/api/telegram/webhook` | `https://domain.com/api/telegram/webhook/abc123-def456` |
| 编辑机器人 | `https://new-domain.com/api/telegram/webhook` | `https://new-domain.com/api/telegram/webhook/abc123-def456` |
| 带斜杠输入 | `https://domain.com/api/telegram/webhook/` | `https://domain.com/api/telegram/webhook/abc123-def456` |

## ⚠️ 重要要求

### Telegram官方要求

- ✅ **HTTPS协议**：必须使用SSL加密
- ✅ **有效证书**：SSL证书必须有效且未过期
- ✅ **指定端口**：443、80、88、8443之一
- ✅ **响应时间**：必须在30秒内响应
- ✅ **状态码**：返回200状态码表示成功

### 域名要求

- ✅ **可公网访问**：域名必须能从互联网访问
- ✅ **DNS解析正常**：域名能正确解析到您的服务器
- ✅ **防火墙配置**：允许HTTPS入站流量

## 🧪 测试验证

### 自动测试脚本

运行内置测试脚本验证配置：

```bash
node scripts/test-webhook-setup.js
```

测试内容包括：
- Telegram API连接测试
- Webhook状态检查
- 端点可达性测试
- 路由配置验证

### 手动测试

1. **检查Webhook状态**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
   ```

2. **测试端点响应**
   ```bash
   curl -X POST "https://your-domain.com/api/telegram/webhook/机器人ID" \
   -H "Content-Type: application/json" \
   -d '{"update_id":1,"message":{"message_id":1,"from":{"id":123},"chat":{"id":123},"text":"/test"}}'
   ```

## 🔄 迁移现有机器人

### 自动迁移脚本

```bash
node scripts/migrate-webhook-urls.js
```

该脚本会：
- 检查所有Webhook模式的机器人
- 分析URL格式是否需要迁移
- 自动更新为新格式
- 显示迁移前后对比

### 手动迁移步骤

1. 登录管理后台
2. 进入机器人管理页面
3. 编辑需要迁移的机器人
4. 重新保存Webhook配置
5. 系统会自动应用新格式

## 🚨 故障排除

### 常见问题

1. **消息接收不到**
   - 检查服务器是否运行
   - 验证SSL证书是否有效
   - 确认防火墙配置

2. **URL不匹配警告**
   - 点击"应用设置"重新同步
   - 检查基础URL是否正确

3. **503错误**
   - 服务器可能临时不可用
   - 检查服务器负载情况

### 日志查看

```bash
# 查看机器人日志
tail -f logs/bots/[机器人ID]/bot.log

# 查看服务器日志
tail -f logs/app-$(date +%Y-%m-%d).log
```

## 📞 技术支持

如遇到问题，请提供以下信息：
- 机器人名称和ID
- 配置的基础URL
- 错误信息截图
- 相关日志片段

---

> 💡 **提示**：使用ngrok等内网穿透工具时，请注意URL会在重启后发生变化，需要及时更新Webhook配置。
