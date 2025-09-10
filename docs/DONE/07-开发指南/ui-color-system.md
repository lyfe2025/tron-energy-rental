# UI 颜色系统规范

## 项目主色调系统

### 主色调 (Primary Colors)
- **主蓝色**: `#3B82F6` (bg-blue-600, text-blue-600)
  - 用于：主要按钮、开关激活状态、链接、重要操作
  - Hover: `#2563EB` (bg-blue-700)
  - Light: `#3B82F6` with opacity variations

### 辅助色调 (Secondary Colors)
- **成功绿色**: `#10B981` (bg-emerald-600)
  - 用于：成功状态、确认操作、积极反馈
- **警告橙色**: `#F59E0B` (bg-amber-500)
  - 用于：警告信息、待处理状态
- **错误红色**: `#EF4444` (bg-red-500)
  - 用于：错误状态、危险操作、删除按钮

### 中性色调 (Neutral Colors)
- **深灰色**: `#374151` (text-gray-700) - 主要文本
- **中灰色**: `#6B7280` (text-gray-500) - 次要文本
- **浅灰色**: `#9CA3AF` (text-gray-400) - 辅助文本
- **边框色**: `#E5E7EB` (border-gray-300) - 边框、分割线

### 背景色调 (Background Colors)
- **主背景**: `#FFFFFF` (bg-white) - 页面主背景
- **卡片背景**: `#FFFFFF` (bg-white) - 卡片、面板背景
- **浅背景**: `#F9FAFB` (bg-gray-50) - 页面背景、禁用状态
- **蓝色背景**: `#EFF6FF` (bg-blue-50) - 激活状态背景
- **蓝色渐变**: `from-blue-50 to-indigo-50` - 特殊强调区域

## 开关组件颜色规范

### 统一开关配色
```vue
<el-switch 
  active-color="#3B82F6"
  inactive-color="#E5E7EB"
/>
```

### 禁止使用的颜色
- ❌ `#00ff88` (过于鲜艳的绿色)
- ❌ `#000000` (纯黑色，除了遮罩层)
- ❌ 不一致的自定义颜色

## 组件设计规范

### 卡片设计
- 背景：白色 `bg-white`
- 边框：`border-gray-200`
- 阴影：`shadow-sm` (默认) → `shadow-md` (hover)
- 圆角：`rounded-lg` 或 `rounded-xl`

### 按钮设计
```css
/* 主要按钮 */
.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700;
  @apply rounded-lg font-medium transition-all duration-200;
  @apply shadow-sm hover:shadow-md;
}

/* 次要按钮 */
.btn-secondary {
  @apply bg-white hover:bg-gray-50 text-gray-700 border-gray-300;
  @apply rounded-lg font-medium transition-all duration-200;
}
```

### 表单元素
```css
/* 输入框 */
.form-input {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg;
  @apply focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

/* 复选框 */
.checkbox-checked {
  @apply bg-blue-600 border-blue-600;
}
```

## 无障碍性 (Accessibility)

### 颜色对比度
- 主文本对白色背景：4.5:1 以上
- 次要文本对白色背景：3:1 以上
- 链接和按钮：4.5:1 以上

### 状态指示
- 不仅依赖颜色，还使用图标和文字
- 提供足够的视觉反馈
- 支持色盲用户的使用

## 实施检查清单

### 新组件开发
- [ ] 使用项目标准颜色
- [ ] 开关组件使用蓝色主题
- [ ] 背景使用白色而非黑色/深色
- [ ] 按钮使用标准样式
- [ ] 测试无障碍性

### 现有组件更新
- [ ] 替换 `#00ff88` 为 `#3B82F6`
- [ ] 添加 `inactive-color="#E5E7EB"`
- [ ] 更新深色背景为白色主题
- [ ] 统一卡片设计风格
- [ ] 优化视觉层次

## 更新记录

- **2024-09-10**: 建立初始颜色系统规范
- **2024-09-10**: 更新通知配置页面UI，统一蓝色主题
