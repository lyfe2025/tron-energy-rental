# ngrok 本地开发测试指南

## 📋 目录
- [概述](#概述)
- [安装配置](#安装配置)
- [快速开始](#快速开始)
- [Telegram 机器人测试](#telegram-机器人测试)
- [TRON 区块链测试](#tron-区块链测试)
- [开发工作流](#开发工作流)
- [故障排除](#故障排除)
- [安全注意事项](#安全注意事项)

## 🎯 概述

本项目使用 ngrok 进行本地开发测试，主要解决以下问题：

- **Telegram 机器人 webhook 回调**：本地 localhost 无法接收 Telegram 的回调消息
- **TRON 区块链 API 测试**：需要公网可访问的地址进行区块链交互测试
- **第三方服务集成测试**：需要公网地址进行 OAuth 等认证流程测试

## 🛠️ 安装配置

### 1. 安装 ngrok

#### 方法一：npm 全局安装
```bash
npm install -g ngrok
```

#### 方法二：Homebrew 安装 (macOS)
```bash
brew install ngrok
```

#### 方法三：官方下载
1. 访问 [ngrok.com](https://ngrok.com)
2. 注册免费账户
3. 下载对应系统的二进制文件
4. 解压并添加到 PATH

### 2. 配置 ngrok

#### 获取 authtoken
```bash
# 登录 ngrok 账户获取 token
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

#### 验证安装
```bash
ngrok version
```

### 3. 环境检查

#### 检查代理设置
```bash
# 检查是否有代理环境变量（这些可能导致ngrok错误）
echo "HTTP_PROXY: $HTTP_PROXY"
echo "HTTPS_PROXY: $HTTPS_PROXY" 
echo "http_proxy: $http_proxy"
echo "https_proxy: $https_proxy"

# 如果有输出，说明设置了代理，可能需要清除
```

#### 检查端口占用
```bash
# 检查3001端口是否被占用
lsof -i :3001

# 检查4040端口（ngrok管理界面）
lsof -i :4040
```

## 🚀 快速开始

### 1. 启动本地服务
```bash
# 按照项目规则启动服务
npm run restart
# 或
pnpm run restart

# 确认服务运行在 3001 端口
curl http://localhost:3001/api/health
```

### 2. 启动 ngrok

#### ⚠️ 重要：正确的启动语法
```bash
# ✅ 正确语法：只使用端口号
ngrok http 3001

# ❌ 错误语法：不要使用完整URL
# ngrok http http://localhost:3001  # 这会导致代理错误！
```

#### 如果遇到代理错误
如果出现 `ERR_NGROK_9009` 代理相关错误，使用以下命令：
```bash
# 临时清除代理环境变量启动
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok http 3001
```

### 3. 获取公网地址
启动成功后，你会看到类似输出：
```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                       United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3001
```

**重要**：记录下 `https://abc123.ngrok.io` 这个地址，后续测试需要使用。

## 🤖 Telegram 机器人测试

### 1. 设置 Webhook

#### 使用 curl 设置
```bash
# 替换为你的 bot token 和 ngrok 地址
BOT_TOKEN="YOUR_BOT_TOKEN"
NGROK_URL="https://abc123.ngrok.io"

curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$NGROK_URL/api/telegram/webhook\"}"
```

#### 使用项目脚本设置
```bash
# 运行测试脚本
chmod +x scripts/development/test-telegram.sh
./scripts/development/test-telegram.sh
```

### 2. 验证 Webhook 状态
```bash
# 检查 webhook 是否设置成功
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

### 3. 测试机器人
1. 在 Telegram 中找到你的机器人
2. 发送 `/start` 命令
3. 检查本地控制台日志
4. 验证数据库中的用户记录

### 4. 查看 ngrok 请求日志
```bash
# 在另一个终端运行，查看所有请求
ngrok http 3001 --log=stdout
```

## ⚡ TRON 区块链测试

### 1. 配置 TRON 网络

#### 测试网配置
```typescript
// 在 .env 文件中配置
TRON_NETWORK=shasta
TRON_RPC_URL=https://api.shasta.trongrid.io
TRON_EXPLORER_URL=https://shasta.trongrid.io
```

#### 主网配置
```typescript
TRON_NETWORK=mainnet
TRON_RPC_URL=https://api.trongrid.io
TRON_EXPLORER_URL=https://tronscan.org
```

### 2. 测试 TRON API 连接
```bash
# 测试 TRON 网络连接
curl -X POST "$TRON_RPC_URL/wallet/getnowblock" \
  -H "Content-Type: application/json"
```

### 3. 测试能量委托功能
1. 使用 ngrok 地址访问前端页面
2. 测试能量委托的创建、查询、取消等操作
3. 检查本地日志和数据库记录

## 🔄 开发工作流

### 1. 日常开发流程

#### 启动开发环境
```bash
# 1. 启动本地服务
npm run restart

# 2. 检查是否有代理设置（可选）
env | grep -i proxy

# 3. 启动 ngrok (新终端)
# 如果有代理设置，使用清理命令：
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok http 3001
# 如果没有代理，直接使用：
# ngrok http 3001

# 4. 复制 ngrok 地址
# 5. 设置 Telegram webhook
# 6. 开始开发和测试
```

#### 代码修改后
```bash
# 修改代码后重启服务
npm run restart

# ngrok 会自动转发到新服务
# 无需重启 ngrok
```

### 2. 测试流程

#### 功能测试
```bash
# 1. 验证本地服务状态
echo "=== 检查本地服务 ==="
curl -s http://localhost:3001/api/health | jq .
if [ $? -eq 0 ]; then
    echo "✅ 本地服务正常"
else
    echo "❌ 本地服务异常，请检查"
    exit 1
fi

# 2. 获取 ngrok 公网地址
echo "=== 获取 ngrok 地址 ==="
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "ngrok 地址: $NGROK_URL"

# 3. 测试公网访问
echo "=== 测试公网访问 ==="
curl -s "$NGROK_URL/api/health" | jq .
if [ $? -eq 0 ]; then
    echo "✅ 公网访问正常"
else
    echo "❌ 公网访问失败"
fi

# 4. 前端页面测试
echo "=== 前端访问地址 ==="
echo "在浏览器中访问: $NGROK_URL"
echo "管理界面访问: http://localhost:4040"
```

#### 集成测试
```bash
# 1. Telegram 机器人测试
# 发送消息到机器人，检查响应

# 2. TRON 区块链测试
# 测试能量委托、支付等区块链操作

# 3. 数据库操作测试
# 检查数据是否正确保存和查询
```

## ⚠️ 常见错误和解决方案

### 1. 语法错误

#### ❌ 错误的启动方式
```bash
# 这些都是错误的！
ngrok http http://localhost:3001
ngrok http localhost:3001
ngrok http 127.0.0.1:3001
```

#### ✅ 正确的启动方式
```bash
# 只需要端口号
ngrok http 3001
```

### 2. 环境变量冲突

#### 检查代理设置
```bash
# 快速检查是否有代理设置
env | grep -i proxy
```

#### 清理方案选择
- **临时使用**：`env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok http 3001`
- **长期使用**：设置别名 `alias ngrok-clean='env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok'`

### 3. 端口冲突

#### 检查端口占用
```bash
# 检查应用端口
lsof -i :3001

# 检查ngrok管理端口
lsof -i :4040
```

#### 解决方案
```bash
# 杀死占用进程（谨慎使用）
kill -9 $(lsof -ti:3001)

# 或使用其他端口
ngrok http 3002
```

### 4. 验证连接

#### 完整测试流程
```bash
# 1. 测试本地服务
curl -s http://localhost:3001/api/health

# 2. 检查ngrok状态
curl -s http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'

# 3. 测试公网访问
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
curl -s "$NGROK_URL/api/health"
```

## 🚨 故障排除

### 1. 常见问题

#### 🚨 代理相关错误 (ERR_NGROK_9009)

如果遇到以下错误：
```
ERROR: authentication failed: Running the agent with an http/s proxy is an enterprise feature.
ERROR: ERR_NGROK_9009
```

**原因**：系统设置了HTTP代理环境变量，ngrok误认为需要企业版功能。

**解决方案**：

1. **方法一：临时清除代理变量启动**
```bash
# 一次性清除代理变量启动ngrok
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok http 3001
```

2. **方法二：设置便捷别名**
```bash
# 在 ~/.zshrc 或 ~/.bashrc 中添加
alias ngrok-clean='env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok'

# 重新加载配置
source ~/.zshrc

# 使用别名
ngrok-clean http 3001
```

3. **方法三：检查并临时取消代理设置**
```bash
# 检查当前代理设置
env | grep -i proxy

# 临时取消代理（仅当前终端会话）
unset HTTP_PROXY
unset HTTPS_PROXY  
unset http_proxy
unset https_proxy

# 启动ngrok
ngrok http 3001
```

#### ngrok 无法启动
```bash
# 检查端口是否被占用
lsof -i :3001

# 检查 ngrok 配置
ngrok config check

# 重新安装 ngrok
npm uninstall -g ngrok
npm install -g ngrok
```

#### Telegram webhook 设置失败
```bash
# 检查 bot token 是否正确
curl "https://api.telegram.org/bot$BOT_TOKEN/getMe"

# 检查 ngrok 地址是否可访问
curl -I "https://abc123.ngrok.io/api/health"

# 检查本地服务是否运行
curl http://localhost:3001/api/health
```

#### TRON API 连接失败
```bash
# 检查网络连接
ping api.trongrid.io

# 检查防火墙设置
# 确保 443 端口未被阻止

# 尝试使用不同的 RPC 节点
```

### 2. 日志调试

#### 查看 ngrok 日志
```bash
# 启动时显示详细日志
ngrok http 3001 --log=stdout

# 查看 ngrok 状态页面
# 访问 http://localhost:4040
```

#### 查看应用日志
```bash
# 查看 API 服务日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log
```

### 3. 网络诊断

#### 检查端口状态
```bash
# 检查本地服务端口
netstat -an | grep 3001

# 检查 ngrok 状态
curl http://localhost:4040/api/tunnels
```

#### 测试网络连通性
```bash
# 测试本地服务
curl http://localhost:3001/api/health

# 测试 ngrok 转发
curl https://abc123.ngrok.io/api/health

# 测试外部服务
curl https://api.telegram.org
```

## 🔒 安全注意事项

### 1. 环境变量管理

#### 代理设置最佳实践
```bash
# 方法一：为ngrok创建专用别名（推荐）
echo 'alias ngrok-clean="env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok"' >> ~/.zshrc
source ~/.zshrc

# 方法二：创建ngrok启动脚本
cat > ~/bin/ngrok-start.sh << 'EOF'
#!/bin/bash
echo "正在启动 ngrok (清除代理设置)..."
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok "$@"
EOF
chmod +x ~/bin/ngrok-start.sh

# 方法三：仅在ngrok会话中临时清除代理
function start-ngrok() {
    local port=${1:-3001}
    echo "启动 ngrok on port $port (无代理)"
    env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok http $port
}
```

#### 环境隔离检查
```bash
# 检查当前shell的代理设置
echo "当前代理设置："
echo "HTTP_PROXY: $HTTP_PROXY"
echo "HTTPS_PROXY: $HTTPS_PROXY"

# 验证ngrok是否能正常启动
ngrok-clean version && echo "✅ ngrok-clean 别名工作正常" || echo "❌ 需要设置别名"
```

### 2. 网络安全

#### 临时性使用
- ngrok 地址是临时的，每次重启都会变化
- 仅用于开发测试，不要用于生产环境
- 测试完成后及时关闭 ngrok

#### 访问控制
```bash
# 设置 IP 白名单 (付费版功能)
ngrok http 3001 --allow-header="X-Forwarded-For" --allow="192.168.1.0/24"
```

### 2. 数据安全

#### 敏感信息保护
- 不要在 ngrok 地址中暴露敏感信息
- 使用环境变量管理 API 密钥
- 定期轮换测试用的 API 密钥

#### 数据库安全
```bash
# 使用测试数据库
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tron_energy_rental_test

# 定期备份测试数据
scripts/database/backup-database.sh
```

### 3. 监控和日志

#### 请求监控
```bash
# 监控 ngrok 请求
curl http://localhost:4040/api/requests/http

# 查看请求统计
curl http://localhost:4040/api/requests/http/statistics
```

#### 异常检测
```bash
# 检查异常请求
grep "ERROR" logs/app.log

# 监控数据库连接
grep "database connection" logs/app.log
```

## 📚 相关资源

### 1. 项目脚本
- `scripts/development/test-telegram.sh` - Telegram 测试脚本
- `scripts/development/restart-with-ngrok.sh` - 快速重启脚本
- `scripts/database/backup-database.sh` - 数据库备份脚本

### 2. 配置文件
- `.env` - 环境变量配置
- `nodemon.json` - 开发环境配置
- `tsconfig.json` - TypeScript 配置

### 3. 外部资源
- [ngrok 官方文档](https://ngrok.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [TRON 开发者文档](https://developers.tron.network/)

## 🎉 总结

使用 ngrok 进行本地开发测试的优势：

✅ **快速配置**：几分钟内即可开始测试  
✅ **实时反馈**：代码修改后立即生效  
✅ **真实环境**：模拟真实的网络环境  
✅ **成本低廉**：免费版足够开发测试使用  
✅ **易于调试**：可以查看所有请求和响应  

## 🆕 本次更新重点

### 解决代理相关问题
- ✅ **ERR_NGROK_9009 错误**：详细的代理环境变量解决方案
- ✅ **环境检查**：启动前检查代理设置
- ✅ **清理脚本**：便捷的代理清理别名和脚本
- ✅ **语法强化**：明确错误和正确的启动语法

### 增强故障排除能力
- 🔧 **常见错误大全**：覆盖语法、环境、端口等问题
- 🔧 **完整测试流程**：自动化验证脚本
- 🔧 **最佳实践**：长期使用的配置建议

通过本指南，你可以：
1. **快速配置** ngrok 环境
2. **避免常见陷阱**：代理冲突、语法错误等
3. **测试 Telegram 机器人**功能
4. **验证 TRON 区块链**集成
5. **建立高效的开发工作流**
6. **解决各种技术问题**

### 💡 关键提醒
- 🚨 **使用正确语法**：`ngrok http 3001`（不是 `ngrok http http://localhost:3001`）
- 🚨 **检查代理设置**：有代理时使用 `env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok http 3001`
- 🚨 **设置便捷别名**：`alias ngrok-clean='env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok'`

记住：ngrok 是开发测试的利器，但生产环境请使用专业的服务器部署！

