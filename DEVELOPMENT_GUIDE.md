# 开发规范指南

## 快速开始

### 1. 环境检查
```bash
# 检查项目状态
./scripts/dev-check.sh

# 仅检查API代码
./scripts/api-check.sh

# 仅检查前端代码
./scripts/frontend-check.sh

# 快速检测常见问题
./scripts/quick-fix.sh
```

### 2. 启动开发环境
```bash
# 启动API服务器
pnpm dev:api

# 启动前端服务器
pnpm dev:frontend

# 同时启动（新终端）
pnpm dev
```

## 代码标准

### TypeScript 导入规范
```typescript
// ✅ 正确：使用 type 导入类型
import { Router, type Request, type Response } from 'express'
import type { User, CreateUserData } from '@/types/api'

// ❌ 错误：直接导入类型
import { Router, Request, Response } from 'express'
```

### 接口定义规范
```typescript
// ✅ 正确：明确的状态值
export interface Bot {
  status: 'online' | 'offline' | 'error' | 'maintenance'
}

// ❌ 错误：使用 string 类型
export interface Bot {
  status: string
}
```

### 路由模板规范
```typescript
import { Router, type Request, type Response } from 'express'
import pool from '../config/database'

const router: Router = Router()

// 使用 req.user?.userId 而不是 req.user?.id
router.get('/profile', auth, async (req: Request, res: Response) => {
  const userId = req.user?.userId
  // ... 其他代码
})
```

## 数据库操作规范

### 连接池使用
```typescript
// ✅ 正确：使用默认导出
import pool from '../config/database'

// ❌ 错误：使用命名导出
import { pool } from '../config/database'
```

### 查询参数类型
```typescript
// ✅ 正确：明确类型
let queryParams: (string | number)[] = [id]

// ❌ 错误：隐式 any 类型
let queryParams = [id]
```

## 工具配置

### ESLint 配置
- 禁止使用 `any` 类型
- 要求使用 `type` 导入类型
- 禁止使用 `console.log`（API代码）
- 警告使用 `console.log`（前端代码）

### TypeScript 配置
- 启用 `verbatimModuleSyntax`
- 支持 `import.meta.env`
- 使用 ESNext 模块系统

## 常见错误和解决方案

### 错误 1: 类型导入问题 (TS1484)
**错误信息**: `"Request"是一种类型，必须在启用 "verbatimModuleSyntax" 时使用仅类型导入进行导入。`

**解决方案**: 使用 `type` 关键字导入类型
```typescript
// 修复前
import { Router, Request, Response } from 'express'

// 修复后
import { Router, type Request, type Response } from 'express'
```

### 错误 2: 模块导出问题 (TS2614)
**错误信息**: `模块 ""../config/database"" 没有导出的成员 "pool"。你是想改用 "import pool from ""../config/database"" 吗?`

**解决方案**: 使用默认导入
```typescript
// 修复前
import { pool } from '../config/database'

// 修复后
import pool from '../config/database'
```

### 错误 3: 类型推断问题 (TS2742)
**错误信息**: `如果没有引用 ".pnpm/@types+express-serve-static-core@4.19.6/node_modules/@types/express-serve-static-core"，则无法命名 "router" 的推断类型。这很可能不可移植。需要类型注释。`

**解决方案**: 明确指定类型
```typescript
// 修复前
const router = Router()

// 修复后
const router: Router = Router()
```

### 错误 4: 属性不存在问题 (TS2339)
**错误信息**: `类型"JWTPayload"上不存在属性"id"。`

**解决方案**: 使用正确的属性名
```typescript
// 修复前
const userId = req.user?.id

// 修复后
const userId = req.user?.userId
```

### 错误 5: 类型不匹配问题 (TS2345)
**错误信息**: `Argument of type 'number' is not assignable to parameter of type 'string'.`

**解决方案**: 明确指定数组类型
```typescript
// 修复前
let queryParams = [id]

// 修复后
let queryParams: (string | number)[] = [id]
```

### 错误 6: 项目路径问题 (TS5058)
**错误信息**: `error TS5058: The specified path does not exist: 'api/tsconfig.json'.`

**解决方案**: 使用正确的路径模式
```json
// 修复前
"type-check:api": "tsc --noEmit --project api"

// 修复后
"type-check:api": "tsc --noEmit api/**/*.ts"
```

### 错误 7: import.meta 类型问题 (TS1343, TS2339)
**错误信息**: 
- `error TS1343: The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', or 'nodenext'.`
- `error TS2339: Property 'env' does not exist on type 'ImportMeta'.`

**解决方案**: 更新 tsconfig.json 配置
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client"]
  }
}
```

### 错误 8: API 函数参数不匹配 (TS2345)
**错误信息**: `类型"{ status: string; note: string; }"的参数不能赋给类型"string"的参数。`

**解决方案**: 更新函数签名以匹配使用方式
```typescript
// 修复前
updateOrderStatus: (id: string, status: string) =>

// 修复后
updateOrderStatus: (id: string, data: { status: string; note?: string }) =>
```

### 错误 9: 模块导出缺失 (TS2339)
**错误信息**: `模块 ""@/services/api"" 没有导出的成员 "pricingAPI"。你是想改用 "import pricingAPI from "@/services/api"" 吗?`

**解决方案**: 在 API 服务中添加缺失的导出
```typescript
export const pricingAPI = {
  getTemplates: (params) => apiClient.get('/api/price-templates', { params }),
  createTemplate: (data) => apiClient.post('/api/price-templates', data),
  // ... 其他方法
}
```

### 错误 10: ESLint 配置问题
**错误信息**: `ESLint couldn't find the config "@typescript-eslint/recommended" to extend from.`

**解决方案**: 简化 ESLint 配置
```json
{
  "extends": ["eslint:recommended"],
  "rules": {
    "consistent-type-imports": "error",
    "no-unused-vars": "warn"
  }
}
```

### 错误 11: Vue 文件解析错误
**错误信息**: `Parsing error: '>' expected`

**解决方案**: 在 ESLint 配置中排除 Vue 文件或使用专门的 Vue 解析器
```json
{
  "overrides": [
    {
      "files": ["src/**/*.ts"],
      "extends": ["eslint:recommended"]
    }
  ]
}
```

### 错误 12: any 类型警告 (@typescript-eslint/no-explicit-any)
**错误信息**: `Unexpected any. Specify a different type @typescript-eslint/no-explicit-any`

**解决方案**: 创建具体的类型定义替换 any
```typescript
// 修复前
createUser: (data: any) => apiClient.post('/api/users', data)

// 修复后
createUser: (data: CreateUserData) => apiClient.post('/api/users', data)

// 在 src/types/api.ts 中定义类型
export interface CreateUserData {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
  role: 'admin' | 'agent' | 'user'
}
```

### 错误 13: API 返回类型不匹配 (TS2322)
**错误信息**: `不能将类型"{ items: any[]; total: number; page: number; limit: number; totalPages: number }"分配给类型"any[]"`

**解决方案**: 正确处理分页响应结构
```typescript
// 修复前
if (response.data.success) {
  bots.value = response.data.data || []
}

// 修复后
if (response.data.success) {
  bots.value = response.data.data?.items || []
}
```

## 最佳实践

### 1. 类型安全
- 避免使用 `any` 类型
- 为所有 API 响应创建具体类型
- 使用联合类型定义状态值

### 2. 错误处理
- 使用 try-catch 包装异步操作
- 提供有意义的错误信息
- 实现适当的回退值

### 3. 代码组织
- 将类型定义放在 `src/types/` 目录
- 使用一致的命名约定
- 保持函数职责单一

### 4. 测试和验证
- 运行类型检查：`pnpm type-check`
- 运行 ESLint 检查：`pnpm lint`
- 使用开发检查脚本：`./scripts/dev-check.sh`

## 快速修复脚本

项目提供了多个脚本来帮助快速检测和修复常见问题：

### `./scripts/quick-fix.sh`
检测常见问题并提供修复建议：
- 类型导入问题
- API 调用不匹配
- import.meta.env 使用
- 缺失的 API 导出

### `./scripts/api-check.sh`
专门检查 API 代码质量

### `./scripts/frontend-check.sh`
专门检查前端代码质量

### `./scripts/dev-check.sh`
完整的项目开发检查

## VS Code 配置

项目包含预配置的 VS Code 设置和任务：

### 设置 (`.vscode/settings.json`)
- TypeScript 偏好设置
- 自动保存和格式化
- ESLint 集成

### 任务 (`.vscode/tasks.json`)
- 开发检查任务
- TypeScript 类型检查
- ESLint 检查和修复
- 快速修复任务

## 总结

遵循这些规范可以：
1. 减少 TypeScript 错误
2. 提高代码质量
3. 改善开发体验
4. 减少调试时间

记住：**类型安全是 TypeScript 的核心价值，避免使用 `any` 类型，为所有数据创建具体的接口定义。**
