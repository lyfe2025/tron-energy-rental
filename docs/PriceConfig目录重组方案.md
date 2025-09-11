# PriceConfig 目录重组方案

## 目标结构

```
src/pages/PriceConfig/
├── index.vue                    # 主页面配置
├── types/                       # 通用类型定义
│   └── index.ts
├── composables/                 # 通用composables
│   └── usePriceConfig.ts
├── EnergyFlash/                 # 能量闪租模式
│   ├── index.vue               # 主配置组件 
│   ├── components/             # 子组件
│   │   ├── TelegramPreview.vue
│   │   ├── ImageConfig.vue
│   │   ├── BasicConfig.vue
│   │   ├── DisplayTextConfig.vue
│   │   ├── LineBreakConfig.vue
│   │   └── NotesConfig.vue
│   ├── composables/           # 专用逻辑
│   │   ├── useEnergyFlashConfig.ts
│   │   ├── useTemplateFormatter.ts
│   │   └── usePreviewLogic.ts
│   └── types/                 # 专用类型
│       └── energy-flash.types.ts
├── TransactionPackage/         # 交易包模式
│   ├── index.vue              # 主配置组件
│   ├── components/            # 子组件
│   │   ├── TelegramPreview.vue
│   │   ├── BasicConfig.vue
│   │   ├── DisplayTextConfig.vue
│   │   ├── PackagesList.vue
│   │   ├── InlineKeyboardConfig.vue
│   │   ├── UsageRulesConfig.vue
│   │   └── NotesConfig.vue
│   ├── composables/          # 专用逻辑
│   │   └── usePackageConfig.ts
│   └── types/                # 专用类型
│       └── transaction-package.types.ts
└── TrxExchange/              # TRX闪兑模式
    ├── index.vue             # 主配置组件
    ├── components/           # 子组件
    │   ├── TelegramPreview.vue
    │   ├── BaseConfiguration.vue
    │   ├── DisplayTextConfiguration.vue
    │   └── NotesConfiguration.vue
    ├── composables/         # 专用逻辑
    │   └── useTrxExchangeConfig.ts
    └── types/               # 专用类型
        └── trx-exchange.types.ts
```

## 重组计划

### Phase 1: 重组 EnergyFlash
- [x] 已完成，结构良好
- [x] 移动到新位置: `./EnergyFlash/`

### Phase 2: 重组 TransactionPackage  
- [ ] 合并重复的目录结构
- [ ] 整理组件命名
- [ ] 统一composables
- [ ] 移动到: `./TransactionPackage/`

### Phase 3: 重组 TrxExchange
- [ ] 移动现有组件
- [ ] 保持现有结构 
- [ ] 移动到: `./TrxExchange/`

### Phase 4: 更新导入路径
- [ ] 更新 index.vue 中的导入
- [ ] 更新所有内部导入路径
- [ ] 验证TypeScript编译

### Phase 5: 清理
- [ ] 删除重复文件
- [ ] 删除backup文件
- [ ] 删除空目录

## 优势

1. **统一性**: 三个模式有相同的内部结构
2. **清晰性**: 每个模式独立，职责明确
3. **可维护性**: 易于找到和修改对应功能
4. **扩展性**: 添加新模式时有明确模板

## 风险控制

1. **备份**: 已完成数据库备份
2. **渐进式**: 逐个模式重组，每步验证
3. **回滚**: 保持git版本控制
4. **测试**: 每个阶段完成后验证功能

## 导入路径变化

### Before
```typescript
import EnergyFlashConfig from './components/EnergyFlashConfig.vue'
import TransactionPackageConfig from './components/TransactionPackageConfig.vue'  
import TrxExchangeConfig from './components/TrxExchangeConfig.vue'
```

### After  
```typescript
import EnergyFlashConfig from './EnergyFlash/index.vue'
import TransactionPackageConfig from './TransactionPackage/index.vue'
import TrxExchangeConfig from './TrxExchange/index.vue'
```
