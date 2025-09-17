# DelegateRecords 组件分离文档

## 概述

DelegateRecords.vue 组件已成功进行安全分离，将原来的单一组件拆分为多个专门的子组件，提高了代码的可维护性和复用性。

## 目录结构

```
DelegateRecords/
├── components/                    # 子组件
│   ├── DelegateOutRecords.vue    # 代理出去记录组件
│   ├── DelegateInRecords.vue     # 代理获得记录组件
│   ├── AllDelegateRecords.vue    # 所有记录组件（不区分方向）
│   └── index.ts                  # 组件导出文件
├── composables/                  # 组合式函数
│   └── useDelegateRecordsCommon.ts # 公共逻辑
├── types/                        # 类型定义
│   └── delegate-records.types.ts # 相关类型定义
├── index.ts                      # 模块总导出文件
└── README.md                     # 本文档
```

## 组件说明

### 1. DelegateRecords.vue (主组件 - 路由器)

主入口组件，保持原有的 API 接口，根据 `delegateDirection` 属性选择渲染对应的子组件。

```vue
<DelegateRecords
  :pool-id="poolId"
  :network-id="networkId"
  :account-id="accountId"
  :delegate-direction="'out'"  // 可选: 'out' | 'in' | undefined
/>
```

**Props:**
- `poolId: string` - 实际上是网络ID
- `networkId: string` - 网络ID  
- `accountId: string` - 能量池账户ID
- `delegateDirection?: 'out' | 'in'` - 代理方向，可选

**行为:**
- 如果指定了 `delegateDirection`，直接渲染对应的子组件
- 如果未指定，显示标签页切换界面（代理出去/代理获得/所有记录）

### 2. DelegateOutRecords.vue (代理出去记录)

专门处理代理出去记录的组件。

**特点:**
- 只显示当前账户代理给其他地址的记录
- 地址标签显示为"接收方地址"
- 操作文本为"代理出去"/"取消代理出去"

### 3. DelegateInRecords.vue (代理获得记录)

专门处理代理获得记录的组件。

**特点:**
- 只显示其他地址代理给当前账户的记录
- 地址标签显示为"代理方地址"
- 操作文本为"代理获得"/"取消代理获得"
- 代理图标使用绿色主题

### 4. AllDelegateRecords.vue (所有记录)

显示所有代理记录，不区分方向。

**特点:**
- 显示所有代理记录
- 每条记录都有方向标识（"获得"/"出去"）
- 动态计算地址标签和操作文本
- 适合需要查看完整代理历史的场景

## 公共逻辑 (useDelegateRecordsCommon)

提取了所有子组件的公共逻辑，包括：

**数据管理:**
- 记录加载和筛选
- 分页处理
- 错误处理

**操作功能:**
- 查看交易
- 取消代理
- 复制到剪贴板

**格式化工具:**
- 金额格式化
- 地址格式化
- 日期格式化
- 状态格式化

**用法:**
```typescript
import { useDelegateRecordsCommon } from '../composables/useDelegateRecordsCommon'

// 在组件中使用
const {
  loading,
  error,
  filteredDelegateRecords,
  // ... 其他返回值
} = useDelegateRecordsCommon(props, 'out') // 第二个参数指定方向
```

## 类型定义

### DelegateDirection
```typescript
type DelegateDirection = 'out' | 'in'
```

### DelegateRecordsBaseProps
```typescript
interface DelegateRecordsBaseProps {
  poolId: string      // 实际上是网络ID
  networkId: string   // 网络ID
  accountId: string   // 能量池账户ID
}
```

### DelegateRecordsTextConfig
```typescript
interface DelegateRecordsTextConfig {
  delegateText: string
  undelegateText: string
  addressLabel: string
  emptyTitle: string
  emptyMessage: string
  undelegateDialogTitle: string
  undelegateDialogMessage: (record: DelegateRecord, formatTrx: (amount: number) => string, formatAddress: (address: string) => string) => string
  undelegateButtonText: string
}
```

## 使用示例

### 1. 使用主组件（向后兼容）

```vue
<!-- 原有用法，保持不变 -->
<DelegateRecords
  :pool-id="poolId"
  :network-id="networkId"
  :account-id="accountId"
/>

<!-- 指定方向 -->
<DelegateRecords
  :pool-id="poolId"
  :network-id="networkId"
  :account-id="accountId"
  delegate-direction="out"
/>
```

### 2. 直接使用子组件

```vue
<template>
  <div>
    <!-- 代理出去记录 -->
    <DelegateOutRecords
      :pool-id="poolId"
      :network-id="networkId"
      :account-id="accountId"
    />
    
    <!-- 代理获得记录 -->
    <DelegateInRecords
      :pool-id="poolId"
      :network-id="networkId"
      :account-id="accountId"
    />
  </div>
</template>

<script setup>
import { DelegateOutRecords, DelegateInRecords } from '@/pages/EnergyPool/components/DelegateRecords'
</script>
```

### 3. 使用公共逻辑

```vue
<script setup>
import { useDelegateRecordsCommon } from '@/pages/EnergyPool/components/DelegateRecords/composables/useDelegateRecordsCommon'

const props = defineProps<DelegateRecordsBaseProps>()

const {
  loading,
  filteredDelegateRecords,
  loadRecords,
  // ... 其他功能
} = useDelegateRecordsCommon(props, 'out')
</script>
```

## 迁移指南

**对于现有代码:**
- 无需修改，原有的 `DelegateRecords` 组件接口保持不变
- 所有原有功能完全保持，包括筛选、分页、取消代理等

**对于新开发:**
- 如果明确知道需要显示特定方向的记录，推荐直接使用子组件
- 如果需要自定义界面，可以使用 `useDelegateRecordsCommon` 组合式函数

## 优势

1. **职责明确**: 每个组件都有明确的职责范围
2. **代码复用**: 公共逻辑抽取为组合式函数，避免重复
3. **类型安全**: 完整的 TypeScript 类型定义
4. **向后兼容**: 保持原有 API 不变，确保平滑迁移
5. **易于维护**: 目录结构清晰，便于后续修改和维护
6. **按需加载**: 可以根据需要选择使用特定的子组件

## 注意事项

1. **导入路径**: 使用新的导入路径时，注意相对路径的正确性
2. **类型导入**: 需要类型时，从对应的 types 文件导入
3. **函数调用**: `useDelegateRecordsCommon` 的第二个参数用于指定记录方向
4. **样式继承**: 所有子组件都继承了原有的样式设计
5. **事件处理**: 所有原有的事件处理逻辑都被保留
