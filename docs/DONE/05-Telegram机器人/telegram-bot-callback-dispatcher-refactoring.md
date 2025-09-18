# Telegram Bot 回调调度系统重构

## 问题背景

原有的 Telegram Bot 处理系统存在以下问题：

1. **硬编码的按钮映射**：在 `TelegramBotProcessor.ts` 中的 `handleReplyKeyboardButtons` 方法中，按钮文本到动作类型的映射是硬编码的
2. **难以维护**：新增或修改按钮需要修改代码
3. **缺乏灵活性**：无法动态配置按钮行为
4. **代码耦合度高**：处理逻辑分散在不同的方法中

## 解决方案

### 1. 核心组件

#### CallbackDispatcher（回调调度器）
- **文件位置**：`api/services/telegram-bot/core/CallbackDispatcher.ts`
- **功能**：基于回调数据的方法调度系统
- **特性**：
  - 支持多种回调数据格式
  - 动态注册和管理处理器
  - 统一的错误处理机制
  - 向后兼容旧格式

#### DynamicButtonMapper（动态按钮映射器）
- **文件位置**：`api/services/telegram-bot/core/DynamicButtonMapper.ts`
- **功能**：从数据库读取按钮配置，支持动态映射
- **特性**：
  - 数据库驱动的配置
  - 缓存机制
  - 默认配置回退
  - 支持回复键盘和内联键盘

#### 专门的回调处理器
- **MenuCallbackHandler**：处理菜单相关回调
- **PriceCallbackHandler**：处理价格配置相关回调
- 支持扩展更多处理器

### 2. 回调数据格式

新系统支持多种回调数据格式：

```typescript
// 1. 简单格式：action:method
'menu:showMainMenu'

// 2. 带单个参数：action:method:param
'order:confirmOrder:12345'

// 3. 带多个参数：action:method:param1,param2,param3
'package:selectPackage:1,energy_flash,basic'

// 4. 带JSON参数：action:method:{"key":"value"}
'order:confirmOrder:{"orderId":"12345","type":"confirm"}'

// 5. 兼容旧格式（自动转换）
'confirm_order_12345' // 会转换为 order:confirmOrder:12345
```

### 3. 数据库配置

#### 按钮配置表
```sql
CREATE TABLE keyboard_button_configs (
    id SERIAL PRIMARY KEY,
    text VARCHAR(100) NOT NULL UNIQUE,
    callback_data VARCHAR(200) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    button_type VARCHAR(20) DEFAULT 'reply',
    description TEXT,
    params JSONB,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 默认配置
系统自动初始化以下默认按钮配置：
- ⚡ 能量闪租 → `price:showEnergyFlash`
- 🔥 笔数套餐 → `price:showTransactionPackage`
- 🔄 TRX闪兑 → `price:showTrxExchange`
- 📋 我的订单 → `order:showUserOrders`
- 💰 账户余额 → `user:showBalance`
- ❓ 帮助支持 → `help:showHelp`
- 🔄 刷新菜单 → `menu:showMainMenu`

## 使用方式

### 1. 初始化调度系统

```typescript
// 创建重构后的处理器
const processor = new TelegramBotProcessorRefactored(
  bot,
  botId,  // 🔥 新增：机器人ID，用于获取正确的webhook URL
  commandHandler,
  keyboardBuilder,
  logger
);

// 处理回调查询
bot.on('callback_query', async (callbackQuery) => {
  await processor.processCallbackQuery(callbackQuery);
});

// 处理文本消息（支持动态按钮映射）
bot.on('message', async (message) => {
  await processor.processMessage(message);
});
```

### 2. 注册自定义处理器

```typescript
// 创建自定义处理器 (推荐继承BaseCallbackHandler)
class CustomOrderHandler extends BaseCallbackHandler {
  async showUserOrders(context: CallbackContext, params?: any): Promise<void> {
    // 可以使用基类提供的方法
    const baseUrl = await this.getWebhookBaseUrl();
    await this.sendSuccessMessage(context.chatId, '订单加载完成');
  }
  
  async confirmOrder(context: CallbackContext, orderId?: string): Promise<void> {
    // 处理逻辑
  }
}

// 注册处理器
const orderHandler = new CustomOrderHandler(bot, botId);
processor.registerCallbackHandler('order', orderHandler);
```

### 3. 创建内联键盘

```typescript
const keyboard = {
  inline_keyboard: [
    [
      { text: '📋 我的订单', callback_data: 'order:showUserOrders' },
      { text: '💰 账户余额', callback_data: 'user:showBalance' }
    ],
    [
      { text: '✅ 确认订单', callback_data: 'order:confirmOrder:12345' },
      { text: '❌ 取消订单', callback_data: 'order:cancelOrder:12345' }
    ]
  ]
};
```

## 核心优势

### 1. 动态配置
- ✅ 支持从数据库动态读取按钮配置
- ✅ 无需重启服务即可修改按钮行为
- ✅ 支持A/B测试和灰度发布

### 2. 代码组织
- ✅ 按功能模块组织处理器
- ✅ 统一的回调处理接口
- ✅ 清晰的职责分离

### 3. 扩展性
- ✅ 易于添加新的处理器
- ✅ 支持复杂的参数传递
- ✅ 灵活的回调数据格式

### 4. 兼容性
- ✅ 向后兼容旧的回调格式
- ✅ 渐进式迁移
- ✅ 不破坏现有功能

### 5. 维护性
- ✅ 统一的错误处理
- ✅ 完善的日志记录
- ✅ 易于调试和监控

## 迁移指南

### 旧代码（硬编码方式）
```typescript
const buttonMappings = {
  '⚡ 能量闪租': 'energy_flash',
  '📋 我的订单': 'my_orders',
  // ...
};

if (text === '⚡ 能量闪租') {
  await handleEnergyFlash(message);
} else if (text === '📋 我的订单') {
  await handleMyOrders(message);
}
```

### 新代码（动态调度方式）
```typescript
const buttonMapper = new DynamicButtonMapper();
const callbackData = buttonMapper.getCallbackData(text);

if (callbackData) {
  const mockCallbackQuery = {
    id: `mock_${Date.now()}`,
    from: message.from,
    message: message,
    data: callbackData
  };
  
  await dispatcher.dispatch(mockCallbackQuery);
}
```

## 文件结构

```
api/services/telegram-bot/
├── core/
│   ├── CallbackDispatcher.ts          # 核心调度器
│   └── DynamicButtonMapper.ts         # 动态按钮映射器
├── handlers/
│   ├── MenuCallbackHandler.ts         # 菜单处理器
│   ├── PriceCallbackHandler.ts        # 价格配置处理器
│   └── ...                           # 其他处理器
├── modules/
│   └── TelegramBotProcessorRefactored.ts # 重构后的处理器
├── examples/
│   └── CallbackDispatcherUsage.ts     # 使用示例
└── ...
```

## 数据库迁移

执行以下迁移脚本：
```bash
# 创建按钮配置表和初始数据
psql -d your_database -f migrations/056_create_keyboard_button_configs.sql
```

## Webhook URL 修复

### 问题描述
在多机器人环境中，每个机器人都有自己的 webhook URL，但原有的实现中 `getWebhookBaseUrl` 方法只是简单地返回环境变量，无法正确获取当前机器人的 webhook URL。

### 解决方案

#### 1. 创建 BaseCallbackHandler 基类
```typescript
export abstract class BaseCallbackHandler implements CallbackHandler {
  protected async getWebhookBaseUrl(): Promise<string> {
    // 从数据库查询当前机器人的 webhook_url
    const result = await query(
      'SELECT webhook_url FROM telegram_bots WHERE id = $1 AND is_active = true',
      [this.botId]
    );
    
    // 解析 webhook URL 提取基础域名
    const url = new URL(webhookUrl);
    return `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
  }
}
```

#### 2. 构造函数修改
所有回调处理器现在都需要 `botId` 参数：
```typescript
// 旧方式
new PriceCallbackHandler(bot)

// 新方式  
new PriceCallbackHandler(bot, botId)
```

#### 3. 智能资源URL构建
提供了 `buildResourceUrl` 方法来智能构建完整的资源URL：
```typescript
// 自动处理相对路径和绝对URL
const fullImageUrl = await this.buildResourceUrl('/uploads/image.jpg');
// 结果：https://your-domain.com/uploads/image.jpg
```

### 修复效果

✅ **精确的webhook URL获取** - 每个机器人使用自己的webhook URL  
✅ **资源URL正确构建** - 图片等资源可以正确访问  
✅ **多机器人支持** - 完全支持多机器人部署  
✅ **优雅降级** - 如果数据库查询失败，回退到环境变量

## 总结

此次重构将硬编码的按钮处理系统升级为动态的、可配置的回调调度系统，显著提升了系统的灵活性、可维护性和扩展性。新系统完全向后兼容，可以渐进式迁移，不会影响现有功能的正常运行。

同时修复了webhook URL获取问题，确保在多机器人环境中每个机器人都能正确获取自己的webhook URL，保证了图片等资源的正确访问。

通过数据库配置按钮行为，系统管理员可以轻松调整机器人的交互逻辑，无需修改代码或重启服务，大大提升了运维效率。
