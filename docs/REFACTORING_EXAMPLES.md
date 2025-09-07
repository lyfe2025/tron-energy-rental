# 代码重构实施示例

本文档提供具体的代码重构示例，展示如何将大文件拆分为多个小而专注的模块。

## 示例1: 能量池路由重构

### 重构前：`api/routes/energy-pool.ts` (1288行)

**问题：**
- 单个文件包含20个路由端点
- 业务逻辑直接写在路由处理器中
- 缺乏模块化设计

### 重构后的文件结构：

```
api/routes/energy-pool/
├── index.ts                    # 主路由入口
├── accounts.ts                 # 账户管理路由
├── statistics.ts               # 统计相关路由
├── operations.ts               # 能量池操作路由
├── network-config.ts           # 网络配置路由
└── middleware/
    ├── validation.ts           # 请求验证中间件
    └── auth.ts                # 权限检查中间件
```

### 重构示例代码：

#### `api/routes/energy-pool/index.ts`
```typescript
import { Router } from 'express';
import accountsRouter from './accounts';
import statisticsRouter from './statistics';
import operationsRouter from './operations';
import networkConfigRouter from './network-config';

const router = Router();

// 挂载子路由
router.use('/accounts', accountsRouter);
router.use('/statistics', statisticsRouter);
router.use('/operations', operationsRouter);
router.use('/network-config', networkConfigRouter);

export default router;
```

#### `api/routes/energy-pool/accounts.ts`
```typescript
import { Router } from 'express';
import { AccountController } from '../controllers/AccountController';
import { validateAccountData } from './middleware/validation';
import { requirePermission } from './middleware/auth';

const router = Router();
const accountController = new AccountController();

// 获取账户列表
router.get('/', 
  requirePermission('energy_pool.view'),
  accountController.getAccounts
);

// 创建账户
router.post('/', 
  requirePermission('energy_pool.create'),
  validateAccountData,
  accountController.createAccount
);

// 更新账户
router.put('/:id', 
  requirePermission('energy_pool.update'),
  validateAccountData,
  accountController.updateAccount
);

// 删除账户
router.delete('/:id', 
  requirePermission('energy_pool.delete'),
  accountController.deleteAccount
);

export default router;
```

#### `api/controllers/AccountController.ts`
```typescript
import { Request, Response } from 'express';
import { AccountService } from '../services/AccountService';
import { handleServiceError } from '../utils/errorHandler';

export class AccountController {
  private accountService = new AccountService();

  getAccounts = async (req: Request, res: Response) => {
    try {
      const result = await this.accountService.getAccounts(req.query);
      res.json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  };

  createAccount = async (req: Request, res: Response) => {
    try {
      const result = await this.accountService.createAccount(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  };

  // ... 其他方法
}
```

---

## 示例2: 质押服务重构

### 重构前：`api/services/tron/services/StakingService.ts` (1148行)

**问题：**
- 单个类承担过多职责
- 方法过长，可读性差
- 网络配置和业务逻辑耦合

### 重构后的文件结构：

```
api/services/tron/staking/
├── StakingService.ts               # 主服务协调器
├── operations/
│   ├── FreezeOperation.ts         # 质押操作
│   ├── UnfreezeOperation.ts       # 解质押操作
│   └── DelegateOperation.ts       # 委托操作
├── providers/
│   ├── TronGridProvider.ts        # TronGrid API封装
│   └── NetworkConfigProvider.ts   # 网络配置管理
├── validators/
│   └── StakeValidator.ts          # 质押参数验证
└── types/
    └── staking.types.ts           # 类型定义
```

### 重构示例代码：

#### `api/services/tron/staking/StakingService.ts`
```typescript
import { FreezeOperation } from './operations/FreezeOperation';
import { UnfreezeOperation } from './operations/UnfreezeOperation';
import { DelegateOperation } from './operations/DelegateOperation';
import { TronGridProvider } from './providers/TronGridProvider';
import { NetworkConfigProvider } from './providers/NetworkConfigProvider';
import type { StakeParams, ServiceResponse } from './types/staking.types';

export class StakingService {
  private freezeOperation: FreezeOperation;
  private unfreezeOperation: UnfreezeOperation;
  private delegateOperation: DelegateOperation;

  constructor(
    private tronWeb: any,
    private networkConfig?: any
  ) {
    const tronGridProvider = new TronGridProvider(networkConfig);
    const configProvider = new NetworkConfigProvider(networkConfig);

    this.freezeOperation = new FreezeOperation(tronWeb, tronGridProvider);
    this.unfreezeOperation = new UnfreezeOperation(tronWeb, tronGridProvider);
    this.delegateOperation = new DelegateOperation(tronWeb, tronGridProvider);
  }

  async stake(params: StakeParams): Promise<ServiceResponse> {
    return this.freezeOperation.execute(params);
  }

  async unstake(params: UnstakeParams): Promise<ServiceResponse> {
    return this.unfreezeOperation.execute(params);
  }

  async delegate(params: DelegateParams): Promise<ServiceResponse> {
    return this.delegateOperation.execute(params);
  }
}
```

#### `api/services/tron/staking/operations/FreezeOperation.ts`
```typescript
import { StakeValidator } from '../validators/StakeValidator';
import { TronGridProvider } from '../providers/TronGridProvider';
import type { StakeParams, ServiceResponse } from '../types/staking.types';

export class FreezeOperation {
  private validator = new StakeValidator();

  constructor(
    private tronWeb: any,
    private tronGridProvider: TronGridProvider
  ) {}

  async execute(params: StakeParams): Promise<ServiceResponse> {
    // 1. 参数验证
    const validationResult = this.validator.validateStakeParams(params);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error
      };
    }

    try {
      // 2. 构建交易
      const transaction = await this.buildStakeTransaction(params);
      
      // 3. 签名交易
      const signedTransaction = await this.signTransaction(transaction, params.privateKey);
      
      // 4. 广播交易
      const result = await this.broadcastTransaction(signedTransaction);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async buildStakeTransaction(params: StakeParams) {
    // 质押交易构建逻辑
    return this.tronWeb.transactionBuilder.freezeBalanceV2(
      params.amount,
      params.resourceType,
      params.fromAddress
    );
  }

  private async signTransaction(transaction: any, privateKey: string) {
    // 交易签名逻辑
    return this.tronWeb.trx.sign(transaction, privateKey);
  }

  private async broadcastTransaction(signedTransaction: any) {
    // 交易广播逻辑
    return this.tronWeb.trx.sendRawTransaction(signedTransaction);
  }
}
```

---

## 示例3: Vue组件重构

### 重构前：`src/pages/EnergyPool/components/AccountModal.vue` (803行)

**问题：**
- 组件功能过于复杂
- template模板过长
- 逻辑和UI混合

### 重构后的文件结构：

```
src/pages/EnergyPool/components/AccountModal/
├── AccountModal.vue                # 主模态组件
├── components/
│   ├── AccountForm.vue            # 账户信息表单
│   ├── PrivateKeyInput.vue        # 私钥输入组件
│   ├── MnemonicInput.vue          # 助记词输入组件
│   └── ValidationDisplay.vue      # 验证结果显示
├── composables/
│   ├── useAccountForm.ts          # 表单状态管理
│   ├── useAccountValidation.ts    # 验证逻辑
│   └── usePrivateKeyGeneration.ts # 私钥生成逻辑
└── types/
    └── account-modal.types.ts     # 类型定义
```

### 重构示例代码：

#### `src/pages/EnergyPool/components/AccountModal/AccountModal.vue`
```vue
<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h2>{{ isEdit ? '编辑账户' : '添加账户' }}</h2>
        <button @click="handleClose" class="close-button">
          <X class="w-6 h-6" />
        </button>
      </div>

      <div class="modal-body">
        <AccountForm
          v-model="formData"
          :errors="validationErrors"
          :is-edit="isEdit"
          @submit="handleSubmit"
          @cancel="handleClose"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import AccountForm from './components/AccountForm.vue';
import { useAccountForm } from './composables/useAccountForm';
import type { AccountFormData } from './types/account-modal.types';

interface Props {
  visible: boolean;
  isEdit?: boolean;
  initialData?: AccountFormData;
}

interface Emits {
  (e: 'close'): void;
  (e: 'submit', data: AccountFormData): void;
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false
});

const emit = defineEmits<Emits>();

const {
  formData,
  validationErrors,
  validateForm,
  resetForm
} = useAccountForm(props.initialData);

const handleSubmit = async () => {
  if (await validateForm()) {
    emit('submit', formData.value);
    handleClose();
  }
};

const handleClose = () => {
  resetForm();
  emit('close');
};
</script>
```

#### `src/pages/EnergyPool/components/AccountModal/components/AccountForm.vue`
```vue
<template>
  <form @submit.prevent="$emit('submit')" class="account-form">
    <!-- 基础信息 -->
    <div class="form-section">
      <h3>基础信息</h3>
      <div class="form-group">
        <label for="name">账户名称 *</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          required
          :class="{ error: errors.name }"
        />
        <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
      </div>

      <div class="form-group">
        <label for="address">钱包地址 *</label>
        <input
          id="address"
          v-model="formData.address"
          type="text"
          required
          :class="{ error: errors.address }"
        />
        <span v-if="errors.address" class="error-text">{{ errors.address }}</span>
      </div>
    </div>

    <!-- 私钥配置 -->
    <div class="form-section">
      <h3>私钥配置</h3>
      <PrivateKeyInput
        v-model="formData.privateKey"
        :error="errors.privateKey"
      />
    </div>

    <!-- 操作按钮 -->
    <div class="form-actions">
      <button type="button" @click="$emit('cancel')" class="btn-cancel">
        取消
      </button>
      <button type="submit" class="btn-submit">
        {{ isEdit ? '更新' : '创建' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import PrivateKeyInput from './PrivateKeyInput.vue';
import type { AccountFormData, FormErrors } from '../types/account-modal.types';

interface Props {
  modelValue: AccountFormData;
  errors: FormErrors;
  isEdit: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: AccountFormData): void;
  (e: 'submit'): void;
  (e: 'cancel'): void;
}

defineProps<Props>();
defineEmits<Emits>();

const formData = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});
</script>
```

#### `src/pages/EnergyPool/components/AccountModal/composables/useAccountForm.ts`
```typescript
import { ref, reactive, computed } from 'vue';
import { useAccountValidation } from './useAccountValidation';
import type { AccountFormData, FormErrors } from '../types/account-modal.types';

export function useAccountForm(initialData?: AccountFormData) {
  const formData = ref<AccountFormData>({
    name: '',
    address: '',
    privateKey: '',
    ...initialData
  });

  const { validateForm: runValidation, errors } = useAccountValidation();

  const validationErrors = computed(() => errors.value);

  const validateForm = async (): Promise<boolean> => {
    return runValidation(formData.value);
  };

  const resetForm = () => {
    formData.value = {
      name: '',
      address: '',
      privateKey: '',
      ...initialData
    };
  };

  return {
    formData,
    validationErrors,
    validateForm,
    resetForm
  };
}
```

---

## 重构实施步骤

### 1. 准备阶段
- [ ] 为目标文件创建完整的测试覆盖
- [ ] 备份当前代码分支
- [ ] 创建重构专用分支

### 2. 重构阶段
- [ ] 按计划分离模块
- [ ] 逐步移动代码到新文件
- [ ] 更新导入和引用
- [ ] 运行测试确保功能正常

### 3. 验证阶段
- [ ] 执行完整的测试套件
- [ ] 进行代码审查
- [ ] 性能测试验证
- [ ] 用户验收测试

### 4. 部署阶段
- [ ] 合并到主分支
- [ ] 部署到测试环境
- [ ] 监控系统指标
- [ ] 部署到生产环境

---

## 工具和辅助脚本

### 文件大小监控脚本
```bash
#!/bin/bash
# scripts/monitor-file-size.sh

echo "检查超过300行的文件..."
find . -name "*.ts" -o -name "*.vue" -o -name "*.js" | \
  grep -v node_modules | \
  xargs wc -l | \
  awk '$1 > 300 {print $1, $2}' | \
  sort -nr > large-files.txt

echo "发现 $(wc -l < large-files.txt) 个大文件"
echo "详细列表已保存到 large-files.txt"
```

### 依赖分析脚本
```bash
#!/bin/bash
# scripts/analyze-dependencies.sh

echo "分析文件依赖关系..."
npx madge --extensions ts,vue --image dependency-graph.svg src/
echo "依赖关系图已生成：dependency-graph.svg"
```

---

## 最佳实践

### 1. 渐进式重构
- 每次只重构一个模块
- 保持功能的向后兼容
- 及时进行回归测试

### 2. 代码审查
- 重构代码必须经过同行审查
- 检查是否遵循了设计原则
- 验证测试覆盖率

### 3. 文档更新
- 及时更新API文档
- 更新架构图和设计文档
- 记录重构决策和原因

---

通过以上示例和指导，开发团队可以有序地进行代码重构，提高代码质量和可维护性。
