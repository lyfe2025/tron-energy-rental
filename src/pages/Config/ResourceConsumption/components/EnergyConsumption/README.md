# EnergyConsumption 组件安全分离

## 📁 分离后的目录结构

```
src/pages/Config/ResourceConsumption/components/EnergyConsumption/
├── index.vue                       # 主组件 (保持原有接口)
├── components/                      # 子组件
│   ├── ConfigurationPanel.vue      # USDT转账配置面板
│   ├── PresetManager.vue          # 预设值管理
│   └── EnergyCalculator.vue       # 能量消耗计算器
├── composables/                    # 逻辑复用
│   ├── useEnergyConfig.ts         # 配置管理逻辑
│   ├── useEnergyCalculator.ts     # 计算器逻辑
│   └── usePresetManager.ts       # 预设值管理逻辑
└── types/                         # 类型定义
    └── energy-calculator.types.ts # 计算器相关类型
```

## 🎯 分离原则

### ✅ 安全分离 (不是重构)
- **保持外部接口不变**：主组件的props和emits完全一致
- **功能实现不变**：所有原有功能都保持原样工作
- **API调用不变**：所有与外部的交互方式保持一致

### 📦 组件职责分离
1. **ConfigurationPanel**: USDT转账配置参数设置
2. **PresetManager**: 官方推荐值和自定义预设值管理
3. **EnergyCalculator**: 静态计算和API实时查询功能

### 🔧 逻辑分离
1. **useEnergyConfig**: 配置管理、验证逻辑
2. **usePresetManager**: 预设值增删改查
3. **useEnergyCalculator**: 计算器状态和方法

### 📋 类型分离
- **energy-calculator.types.ts**: 计算器相关的TypeScript类型定义

## 🚀 优势

### 1. 可维护性提升
- 每个组件职责单一，易于理解和修改
- 逻辑分离使得代码结构更清晰
- 类型定义集中管理，避免重复

### 2. 可复用性增强
- Composables可以在其他组件中复用
- 子组件可以独立使用
- 类型定义可以跨组件共享

### 3. 可测试性改善
- 每个composable可以独立测试
- 组件逻辑简化，降低测试复杂度
- 更容易进行单元测试

### 4. 开发效率
- 团队成员可以并行开发不同组件
- 问题定位更精确
- 代码审查更容易

## 📝 注意事项

### 保持原有功能
- ✅ USDT转账配置
- ✅ 预设值管理
- ✅ 官方推荐预设值
- ✅ 静态能量计算
- ✅ TRON API实时查询
- ✅ 表单验证
- ✅ 错误处理
- ✅ 成本预估和建议

### 接口兼容性
- Props接口：`{ config: EnergyConfig }`
- Emits接口：`update` 和 `save` 事件
- 所有原有的回调和事件处理保持不变

## 🔧 使用方式

分离后的使用方式与原组件完全相同：

```vue
<template>
  <EnergyConsumption
    :config="energyConfig"
    @update="handleConfigUpdate"
    @save="handleSave"
  />
</template>
```

这确保了现有代码无需任何修改即可正常工作。
