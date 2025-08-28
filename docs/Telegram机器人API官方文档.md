# 📱 Telegram Bot API 官方文档

> 本文档基于 Telegram Bot API 官方文档整理，为开发者提供完整的机器人开发指南。

## 📋 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [API 基础](#api-基础)
- [核心功能](#核心功能)
- [最新更新](#最新更新)
- [开发资源](#开发资源)
- [最佳实践](#最佳实践)

## 🎯 概述

Telegram Bot API 是一个基于 HTTP 的接口，专为希望在 Telegram 上构建机器人的开发者设计。该平台托管超过 **1000万** 个机器人，对用户和开发者都是**完全免费**的。

### 机器人能做什么？

- 🏪 **替代整个网站** - 通过 Mini Apps 构建灵活界面
- 💼 **管理业务** - 集成现有工具和工作流程
- 💰 **接收支付** - 支持多种支付方式
- 🛠️ **创建自定义工具** - 构建专用应用程序
- 🔗 **集成服务** - 连接各种服务和设备
- 🎮 **托管游戏** - 支持 HTML5 游戏
- 🌐 **构建社交网络** - 创建社区和互动平台
- 💸 **变现服务** - 通过机器人获得收入
- 📢 **推广项目** - 营销和宣传工具

## 🚀 快速开始

### 1. 创建机器人

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 命令
3. 设置机器人名称和用户名
4. 获得唯一的 Bot Token

### 2. 获取认证令牌

每个机器人都会获得一个唯一的认证令牌，格式如下：
```
123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

### 3. 测试 API

在浏览器中测试你的机器人：
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

## 🔧 API 基础

### 请求格式

所有请求必须通过 HTTPS 发送，格式为：
```
https://api.telegram.org/bot<TOKEN>/METHOD_NAME
```

### 支持的 HTTP 方法

- **GET** - 获取信息
- **POST** - 发送数据

### 参数传递方式

1. **URL 查询字符串**
2. **application/x-www-form-urlencoded**
3. **application/json** (文件上传除外)
4. **multipart/form-data** (用于文件上传)

### 响应格式

所有响应都是 JSON 格式，包含以下字段：

```json
{
  "ok": true,
  "result": { ... },
  "description": "可选的描述信息"
}
```

- `ok`: 布尔值，表示请求是否成功
- `result`: 请求结果数据
- `description`: 人类可读的结果描述
- `error_code`: 错误代码（失败时）

## ⭐ 核心功能

### 输入方式

#### 1. 文本输入
- 支持所有类型的消息
- 文件、位置、贴纸、语音消息
- 骰子等特殊内容

#### 2. 命令系统
- 以 `/` 开头的命令
- 在消息中高亮显示
- 可从列表中选择

#### 3. 键盘和按钮
- **ReplyKeyboardMarkup**: 替换用户键盘
- **InlineKeyboardMarkup**: 消息旁边的按钮
- **KeyboardButton**: 各种类型的按钮

#### 4. 聊天和用户选择
- 支持选择特定聊天
- 用户选择功能
- 群组和频道管理

### 交互方式

#### 1. 内联请求
- 在聊天中直接响应
- 支持搜索和选择
- 实时结果展示

#### 2. 深度链接
- 直接跳转到机器人
- 预填充参数
- 分享和推广

#### 3. 附件菜单
- 快速访问常用功能
- 自定义菜单项
- 提升用户体验

### 集成功能

#### 1. Mini Apps
- 基于 JavaScript 构建
- 无限灵活的界面
- 支持在线商店、游戏等

#### 2. 商业机器人
- 连接 Telegram Business 账户
- 处理业务消息
- 提高生产力

#### 3. 支付系统
- 支持多种支付方式
- 安全的交易处理
- 完整的支付流程

#### 4. Web 登录
- 无缝授权
- 通过 Telegram 通知
- 用户身份验证

#### 5. HTML5 游戏
- 直接在 Telegram 中运行
- 支持多人游戏
- 游戏状态同步

#### 6. 贴纸和表情
- 自定义贴纸包
- 动态表情
- 品牌推广

### 变现功能

- **订阅服务** - 定期收费
- **一次性购买** - 单次付费
- **广告集成** - 展示广告
- **会员服务** - 高级功能
- **API 调用** - 按使用量收费

### 多语言支持

- 支持 100+ 种语言
- 自动语言检测
- 本地化内容
- 多语言机器人

### 机器人管理

#### 1. 隐私模式
- 控制消息可见性
- 保护用户隐私
- 合规性设置

#### 2. 测试功能
- 测试环境
- 调试工具
- 错误日志

#### 3. 状态监控
- 实时状态
- 性能指标
- 错误报告

#### 4. 本地 API
- 自托管选项
- 自定义配置
- 扩展功能

## 🔄 最新更新

### Bot API 9.2 (2025年8月15日)

#### 检查清单功能
- 新增 `checklist_task_id` 字段到 `ReplyParameters` 类
- 新增 `reply_to_checklist_task_id` 字段到 `Message` 类
- 允许机器人回复特定的检查清单任务

#### 礼物系统
- 新增 `publisher_chat` 字段到 `Gift` 和 `UniqueGift` 类
- 获取发布礼物的聊天信息

#### 频道直接消息
- 新增 `is_direct_messages` 字段到 `Chat` 和 `ChatFullInfo` 类
- 识别用作频道直接消息聊天的超级群组
- 新增 `parent_chat` 字段到 `ChatFullInfo` 类
- 新增 `DirectMessagesTopic` 类
- 支持 `direct_messages_topic_id` 参数

## 📚 开发资源

### 官方示例

- **C#**: [GitLab 示例](https://gitlab.com/Athamaxy/telegram-bot-tutorial/-/blob/main/TutorialBot.cs)
- **Python**: [GitLab 示例](https://gitlab.com/Athamaxy/telegram-bot-tutorial/-/blob/main/TutorialBot.py)
- **Go**: [GitLab 示例](https://gitlab.com/Athamaxy/telegram-bot-tutorial/-/blob/main/TutorialBot.go)
- **TypeScript**: [GitLab 示例](https://gitlab.com/Athamaxy/telegram-bot-tutorial/-/tree/main/Nodejs)

### 开发库

- **Node.js**: `node-telegram-bot-api`, `telegraf`
- **Python**: `python-telegram-bot`, `aiogram`
- **Java**: `TelegramBots`, `telegrambots`
- **C#**: `Telegram.Bot`
- **Go**: `telebot`, `telegram-bot-api`

### 开发工具

- **BotFather**: 机器人创建和管理
- **Bot API**: 官方 API 接口
- **Webhook**: 实时更新接收
- **Local Bot API**: 本地部署选项

## 💡 最佳实践

### 1. 安全性
- 保护 Bot Token
- 验证用户输入
- 实现速率限制
- 使用 HTTPS

### 2. 用户体验
- 提供清晰的命令说明
- 使用直观的键盘布局
- 实现错误处理
- 支持多语言

### 3. 性能优化
- 使用 Webhook 而非轮询
- 实现缓存机制
- 优化数据库查询
- 监控 API 限制

### 4. 错误处理
- 捕获所有异常
- 提供友好的错误消息
- 记录错误日志
- 实现重试机制

### 5. 测试策略
- 单元测试
- 集成测试
- 用户测试
- 性能测试

## 🔗 相关链接

- **官方文档**: https://core.telegram.org/bots/api
- **Bot 介绍**: https://core.telegram.org/bots
- **功能特性**: https://core.telegram.org/bots/features
- **基础教程**: https://core.telegram.org/bots/tutorial
- **Bot 新闻**: https://t.me/botnews
- **开发者讨论**: https://t.me/bottalk

## 📝 更新日志

- **2025-08-15**: Bot API 9.2 发布
- **2025-07-XX**: Bot API 9.1 发布
- **2025-06-XX**: Bot API 9.0 发布

---

> 💡 **提示**: 本文档会定期更新，建议关注 [@BotNews](https://t.me/botnews) 获取最新信息。

> 🚀 **开始开发**: 准备好开始构建你的第一个 Telegram 机器人了吗？从 [基础教程](https://core.telegram.org/bots/tutorial) 开始吧！
