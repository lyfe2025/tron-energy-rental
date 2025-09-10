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

本项目使用 ngrok 进行本地开发测试，**但并非所有功能都需要ngrok**。请根据开发需求选择：

### 🟢 **需要 ngrok 的场景**
- **Telegram 机器人 webhook 回调**：本地 localhost 无法接收 Telegram 的回调消息
- 需要外部服务主动向你的本地服务发送请求的场景

### 🟡 **不需要 ngrok 的场景**
- **TRON 区块链 API 测试**：这些是出站连接，可直接从本地调用公开的TRON节点API
- **纯后端API开发**：本地数据库操作、业务逻辑测试等
- **前端开发**：UI组件开发、页面交互等

### 💡 **开发建议**
- **日常开发**：大部分时候无需ngrok，直接本地测试即可
- **机器人测试**：只有测试Telegram Bot功能时才启动ngrok
- **集成测试**：需要完整端到端测试时使用ngrok

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

> 💡 **重要提醒**：TRON API 测试**不需要 ngrok**！这些都是出站连接，可以直接从本地调用。

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

### 2. 本地测试 TRON API 连接
```bash
# ✅ 直接本地测试 - 无需ngrok
echo "=== 测试TRON网络连接 ==="

# 测试主网连接
curl -X POST "https://api.trongrid.io/wallet/getnowblock" \
  -H "Content-Type: application/json"

# 测试Shasta测试网连接  
curl -X POST "https://api.shasta.trongrid.io/wallet/getnowblock" \
  -H "Content-Type: application/json"

# 测试账户查询
curl -X POST "https://api.trongrid.io/wallet/getaccount" \
  -H "Content-Type: application/json" \
  -d '{"address": "TRX_ADDRESS_HERE"}'
```

### 3. 本地测试能量委托功能
```bash
# ✅ 全部功能都可以本地测试
npm run restart  # 启动本地服务

# 1. 通过浏览器访问本地前端
open http://localhost:3000

# 2. 测试API端点
curl http://localhost:3001/api/tron/account/{address}
curl http://localhost:3001/api/energy-pools

# 3. 检查本地日志和数据库记录
tail -f logs/backend.log
```

### 4. 何时需要 ngrok？
- **❌ TRON API调用**：不需要ngrok
- **❌ 账户查询、余额查询**：不需要ngrok  
- **❌ 能量委托、交易查询**：不需要ngrok
- **✅ 需要外部访问前端页面时**：才需要ngrok

## 🔄 开发工作流

### 🎯 根据开发任务选择工作流

#### 🟢 **纯后端开发**（无需ngrok）
```bash
# 1. 启动本地服务
npm run restart

# 2. 直接测试API
curl http://localhost:3001/api/health
curl http://localhost:3001/api/tron/account/{address}

# 3. 前端访问
open http://localhost:3000

# ✅ 无需任何额外配置！
```

#### 🟡 **Telegram Bot开发**（需要ngrok）
```bash
# 1. 启动本地服务
npm run restart

# 2. 检查代理设置
env | grep -i proxy

# 3. 启动 ngrok (新终端)
# 有代理设置时：
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok http 3001
# 无代理设置时：
ngrok http 3001

# 4. 复制 ngrok 地址并设置webhook
# 5. 测试机器人功能
```

#### 🔵 **混合开发**（按需启动ngrok）
```bash
# 1. 始终启动本地服务
npm run restart

# 2. 先测试非机器人功能（无需ngrok）
curl http://localhost:3001/api/energy-pools

# 3. 需要测试机器人时才启动ngrok
ngrok http 3001

# 4. 代码修改后只需重启服务
npm run restart
# ngrok保持运行，会自动转发到新服务
```

### 2. 测试流程

#### 🟢 **本地功能测试**（无需ngrok）
```bash
# 1. 验证本地服务状态
echo "=== 检查本地服务 ==="
curl -s http://localhost:3001/api/health | jq .

# 2. 测试TRON功能
echo "=== 测试TRON API ==="
curl -s http://localhost:3001/api/tron/networks
curl -s "http://localhost:3001/api/tron/account/{address}"

# 3. 测试业务API
echo "=== 测试业务功能 ==="
curl -s http://localhost:3001/api/energy-pools
curl -s http://localhost:3001/api/users

# 4. 前端测试
echo "=== 前端访问 ==="
open http://localhost:3000
echo "✅ 大部分功能测试完成，无需ngrok！"
```

#### 🟡 **Telegram Bot测试**（需要ngrok）
```bash
# 1. 启动ngrok（如未启动）
ngrok http 3001

# 2. 获取ngrok地址
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "ngrok 地址: $NGROK_URL"

# 3. 设置机器人webhook
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$NGROK_URL/api/telegram/webhook\"}"

# 4. 测试机器人功能
echo "现在可以在Telegram中测试机器人功能"
echo "监控地址: http://localhost:4040"
```

#### 📊 **完整集成测试**
```bash
# ✅ 本地测试：业务逻辑、TRON API、数据库操作
# ✅ ngrok测试：Telegram Bot交互、外部回调
# ✅ 端到端测试：用户完整流程验证
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

### 📊 **功能测试需求对照表**

| 功能类别 | 需要ngrok | 测试方式 | 说明 |
|---------|----------|---------|------|
| 🟢 **TRON API调用** | ❌ | 本地直接测试 | 出站连接，调用公开API |
| 🟢 **账户查询、余额查询** | ❌ | `curl localhost:3001/api/...` | 本地API测试即可 |
| 🟢 **能量委托、交易操作** | ❌ | 本地数据库+TRON节点 | 业务逻辑本地验证 |
| 🟢 **前端页面开发** | ❌ | `http://localhost:3000` | UI开发无需公网 |
| 🟢 **后端API开发** | ❌ | 本地测试工具 | 数据库操作本地完成 |
| 🟡 **Telegram Bot功能** | ✅ | ngrok + webhook | 需要接收外部回调 |
| 🟡 **外部系统集成** | ✅ | 按需使用ngrok | 第三方需要回调时 |

### 🎯 **开发效率提升**

#### ⚡ **日常开发**（推荐工作流）
```bash
# 90%的开发时间 - 无需ngrok
npm run restart
curl http://localhost:3001/api/health
open http://localhost:3000
```

#### 🤖 **机器人测试**（按需启动）
```bash
# 仅在测试机器人时启动
ngrok http 3001
# 设置webhook并测试
```

### ✅ **核心优势**
- **🚀 开发效率**：大部分功能无需ngrok，启动更快
- **💰 成本节约**：减少不必要的ngrok使用
- **🔒 安全性**：本地测试更安全，减少公网暴露
- **⚡ 调试便利**：本地环境更容易调试和分析

### 🆕 **本次更新重点**

#### 澄清使用场景
- ✅ **TRON API测试不需要ngrok**：出站连接可直接本地调用
- ✅ **明确ngrok使用场景**：仅Telegram Bot等需要外部回调的功能
- ✅ **提供工作流指导**：什么时候需要，什么时候不需要

#### 优化开发体验  
- 🔧 **分类开发流程**：纯后端、机器人、混合开发
- 🔧 **实用测试脚本**：本地测试、机器人测试分离
- 🔧 **清晰的决策表格**：快速判断是否需要ngrok

### 💡 **关键提醒**
- 🚨 **理解连接方向**：出站连接（你→外部）无需ngrok，入站连接（外部→你）才需要
- 🚨 **按需启动ngrok**：只有测试需要外部回调的功能时才启动
- 🚨 **优先本地测试**：能本地验证的功能先在本地完成

### 🎯 **最佳实践总结**
1. **日常开发**：直接本地测试，无需ngrok
2. **TRON功能**：全部本地测试，包括API调用和交易操作  
3. **机器人功能**：才需要启动ngrok进行webhook测试
4. **问题排查**：优先检查本地服务，再考虑网络问题

记住：**ngrok 是特定场景的工具，不是开发必需品**！

