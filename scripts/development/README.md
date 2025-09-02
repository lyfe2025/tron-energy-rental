# ngrok 管理工具

## 🚀 快速使用

### 方法一：使用快捷脚本 (推荐)
```bash
# 在项目根目录执行
./ngrok.sh
```

### 方法二：直接执行
```bash
# 在项目根目录执行
scripts/development/ngrok-manager.sh
```

## 📋 功能列表

### 1. 检查环境状态
- 检查必要命令 (ngrok, curl, jq)
- 检查端口占用情况
- 检查本地服务状态

### 2. 检查代理设置
- 检测代理环境变量
- 识别可能导致 ERR_NGROK_9009 的配置

### 3. 启动 ngrok
- 自动清除代理环境变量
- 后台启动 ngrok 服务
- 等待启动完成并显示状态

### 4. 停止 ngrok
- 安全停止 ngrok 进程
- 确认进程完全停止

### 5. 查看 ngrok 状态
- 显示隧道信息
- 显示公网地址和本地地址
- 显示管理界面地址

### 6. 测试连接
- 测试本地服务连接
- 测试 ngrok 公网连接
- 验证响应内容

### 7. 获取 ngrok URL
- 获取当前公网地址
- 显示各种用途的URL
- 可选复制到剪贴板

### 8. 设置 Telegram Webhook
- 交互式输入 Bot Token
- 自动设置 Webhook URL
- 验证设置结果

### 9. 打开 ngrok 管理界面
- 提供管理界面地址
- 可选在浏览器中打开

### 10. 故障排除
- 全面的环境诊断
- 常见问题检查
- 详细的状态报告

## 🎯 使用场景

### 开发调试
1. 启动本地服务：`npm run restart`
2. 运行脚本：`./ngrok.sh`
3. 选择 "3) 启动 ngrok"
4. 选择 "6) 测试连接" 验证

### Telegram 机器人测试
1. 确保 ngrok 运行
2. 选择 "8) 设置 Telegram Webhook"
3. 输入 Bot Token
4. 在 Telegram 中测试机器人

### 故障排除
1. 选择 "10) 故障排除"
2. 查看详细诊断信息
3. 根据提示解决问题

## ⚠️ 注意事项

- 脚本会自动处理代理环境变量问题
- 确保本地服务在 3001 端口运行
- 需要安装 jq 命令来解析 JSON
- Telegram Webhook 功能需要有效的 Bot Token

## 🔧 依赖要求

- bash shell
- ngrok 命令
- curl 命令  
- jq 命令
- 可选：pbcopy (用于复制URL)
- 可选：open (用于打开浏览器)

## 📝 日志位置

脚本运行时的 ngrok 输出被重定向到后台，如需查看详细日志可通过：
- ngrok 管理界面: http://localhost:4040
- 选择 "9) 打开 ngrok 管理界面"
