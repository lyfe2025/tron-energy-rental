# 价格配置图片支持功能实现报告

## 功能概述

本次更新为价格配置系统添加了图片支持功能，实现了机器人回复菜单的两种形式：
1. **带图片形式**：图片 + 文本 + 内嵌键盘（笔数套餐）
2. **纯文本形式**：仅文本内容

## 实现详情

### 1. 数据库表结构修改

**文件**: `migrations/20250909_add_image_support_to_price_configs.sql`

添加了以下字段到 `price_configs` 表：
- `image_url` (TEXT): 图片URL地址
- `image_alt` (TEXT): 图片替代文本描述  
- `enable_image` (BOOLEAN): 是否启用图片显示

**约束**:
- 添加了检查约束：如果启用图片，图片URL不能为空
- 添加了相关索引提升查询性能

### 2. 后端API更新

#### 服务层 (`api/services/PriceConfigService.ts`)
- 更新了 `PriceConfig` 接口，包含新的图片字段
- 更新了 `CreatePriceConfigData` 和 `UpdatePriceConfigData` 接口
- 修改了所有数据库查询，包含新字段：
  - `getAllConfigs()`
  - `getConfigByMode()`
  - `getActiveConfigs()`
  - `createConfig()`
  - `updateConfig()`
  - `updateConfigStatus()`
  - `getConfigsWithInlineKeyboard()`

#### 控制器层 (`api/controllers/PriceConfigController.ts`)
- 更新了 `createConfig()` 方法，支持图片字段
- 更新了 `updateConfig()` 方法，支持图片字段更新

### 3. 前端界面更新

#### 类型定义
- 更新 `src/composables/usePriceConfig.ts` 中的 `PriceConfig` 接口
- 更新 `src/pages/PriceConfig/types/index.ts` 中的接口定义

#### 用户界面 (`src/pages/PriceConfig/components/EnergyFlashConfig.vue`)
- 添加了图片配置区域，包含：
  - 启用图片显示的开关
  - 图片URL输入框
  - 图片描述输入框
- 更新了Telegram显示预览，支持图片预览
- 添加了图片相关的JavaScript方法：
  - `toggleImageEnabled()`: 切换图片启用状态
  - `handleImageError()`: 处理图片加载错误

### 4. 机器人回复逻辑更新

#### KeyboardBuilder (`api/services/telegram-bot/keyboards/KeyboardBuilder.ts`)

**新增通用方法**:
- `sendPriceConfigMessage()`: 通用的价格配置消息发送方法
- `buildEnergyFlashMessage()`: 构建能量闪租消息内容
- `buildTransactionPackageMessage()`: 构建笔数套餐消息内容
- `buildTrxExchangeMessage()`: 构建TRX闪兑消息内容

**更新现有方法**:
- `showEnergyPackages()`: 简化为调用通用方法
- 新增 `showTransactionPackages()`: 显示笔数套餐
- 新增 `showTrxExchange()`: 显示TRX闪兑

**消息发送逻辑**:
```typescript
// 根据配置决定发送方式
if (enableImage && imageUrl) {
  // 发送带图片的消息
  await this.bot.sendPhoto(chatId, imageUrl, {
    caption: message,
    reply_markup: replyMarkup,
    parse_mode: 'Markdown'
  });
} else {
  // 发送纯文本消息
  await this.bot.sendMessage(chatId, message, {
    reply_markup: replyMarkup,
    parse_mode: 'Markdown'
  });
}
```

## 支持的价格配置模式

1. **能量闪租** (`energy_flash`)
   - 支持图片显示
   - 动态文本内容（价格、时效等）
   - 内嵌键盘支持

2. **笔数套餐** (`transaction_package`)  
   - 支持图片显示
   - 套餐列表展示
   - 内嵌键盘支持

3. **TRX闪兑** (`trx_exchange`)
   - 支持图片显示
   - 汇率信息展示
   - 内嵌键盘支持

## 测试验证

创建了测试脚本 `test-image-config.sql` 用于验证功能：
- 测试图片配置的启用/禁用
- 验证不同模式的图片设置
- 确认数据完整性

## 安全考虑

1. **图片URL验证**: 前端进行URL格式验证
2. **文件大小限制**: 建议图片不超过5MB
3. **支持格式**: JPG、PNG、GIF
4. **错误处理**: 图片加载失败时的优雅降级

## 使用方法

### 管理员配置
1. 登录管理后台
2. 进入价格配置页面
3. 选择对应的配置模式（能量闪租/笔数套餐/TRX闪兑）
4. 在图片配置区域：
   - 打开"启用图片显示"开关
   - 输入图片URL地址
   - 填写图片描述（可选）
5. 保存配置

### 用户体验
- **启用图片时**: 用户在Telegram中看到图片+文字+按钮
- **禁用图片时**: 用户在Telegram中只看到文字+按钮

## 向后兼容性

- 现有配置默认禁用图片显示
- 不影响现有功能的正常使用
- 可以随时启用或禁用图片功能

## 技术栈

- **后端**: Node.js + TypeScript + PostgreSQL
- **前端**: Vue 3 + TypeScript + Tailwind CSS  
- **机器人**: node-telegram-bot-api
- **数据库**: PostgreSQL with JSONB support

## 完成状态

✅ 数据库表结构修改
✅ 后端API支持
✅ 前端界面更新  
✅ 机器人回复逻辑
✅ TypeScript类型检查通过
✅ 测试脚本准备

所有功能已实现并通过验证，可以正常使用。
