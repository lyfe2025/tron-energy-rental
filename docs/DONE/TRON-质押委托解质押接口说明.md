# TRON质押委托解质押接口说明文档

## 目录
- [概述](#概述)
- [TRON官方API接口](#tron官方api接口)
- [项目封装API接口](#项目封装api接口)
- [数据类型定义](#数据类型定义)
- [使用示例](#使用示例)
- [技术实现](#技术实现)
- [错误处理](#错误处理)

## 概述

本文档详细说明了TRON网络中质押(Stake)、委托(Delegate)、解质押(Unfreeze)记录查询的API接口。包含TRON官方API和项目中的封装API接口。

### 核心功能
- **质押记录查询** - 查看账户的TRX质押操作历史
- **委托记录查询** - 查看资源委托给其他账户的历史
- **解质押记录查询** - 查看解质押操作和资金提取状态
- **账户资源概览** - 获取账户当前资源状态

---

## TRON官方API接口

### 1. 获取账户资源信息 (GetAccountResource)

**基础信息：**
- **接口地址：** `POST https://api.trongrid.io/wallet/getaccountresource`
- **功能：** 查询账户的资源信息(带宽、能量等)
- **官方文档：** [GetAccountResource API](https://developers.tron.network/reference/getaccountresource)
- **相关文档：** [Account Resources API](https://developers.tron.network/docs/account-resource)
- **测试地址：** [Shasta测试网](https://api.shasta.trongrid.io/wallet/getaccountresource)

**请求参数：**
```json
{
  "address": "TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy"
}
```

**响应字段说明：**
| 字段 | 类型 | 描述 |
|------|------|------|
| freeNetUsed | int64 | 已使用的免费带宽 |
| freeNetLimit | int64 | 免费带宽总额 |
| NetUsed | int64 | 质押获得的带宽已使用量 |
| NetLimit | int64 | 质押获得的带宽总额 |
| TotalNetLimit | int64 | 全网可通过质押获得的带宽总额 |
| TotalNetWeight | int64 | 全网质押获得带宽的TRX总数 |
| EnergyUsed | int64 | 已使用的能量 |
| EnergyLimit | int64 | 质押获得的能量总额 |
| TotalEnergyLimit | int64 | 全网可通过质押获得的能量总额 |
| TotalEnergyWeight | int64 | 全网质押获得能量的TRX总数 |
| tronPowerLimit | int64 | 投票权总数 |
| tronPowerUsed | int64 | 已使用的投票权 |

### 2. TronGrid交易查询API

**基础信息：**
- **接口地址：** `GET https://api.trongrid.io/v1/accounts/{address}/transactions`
- **功能：** 查询账户的交易记录
- **官方文档：** [TronGrid API v1](https://developers.tron.network/reference/account-transaction-info)
- **相关文档：** [Transaction Query Guide](https://developers.tron.network/docs/trongrid-api)
- **测试地址：** [Shasta测试网](https://api.shasta.trongrid.io/v1/accounts/{address}/transactions)

**查询参数：**
- `address` - 账户地址
- `limit` - 返回记录数量 (最大200)
- `order_by` - 排序方式 (如：`block_timestamp,desc`)
- `contract_type` - 合约类型过滤

**相关合约类型：**
- `FreezeBalanceV2Contract` - Stake 2.0质押
- `UnfreezeBalanceV2Contract` - Stake 2.0解质押
- `DelegateResourceContract` - 资源委托
- `UnDelegateResourceContract` - 取消资源委托
- `WithdrawExpireUnfreezeContract` - 提取解冻资金

---

## 项目封装API接口

### 认证要求
所有API接口都需要Bearer Token认证：
```
Authorization: Bearer {your_jwt_token}
```

### 1. 质押记录查询

**基础信息：**
- **接口地址：** `GET /api/stake/records`
- **功能：** 获取账户的质押操作历史记录(freeze/unfreeze)
- **实现文件：** [RecordsController.ts](../api/routes/stake/controllers/RecordsController.ts)
- **路由定义：** [stake/index.ts](../api/routes/stake/index.ts#L77)
- **类型定义：** [stake.types.ts](../api/routes/stake/types/stake.types.ts)

**查询参数：**
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| address | string | 是* | 账户地址 |
| poolId | string | 是* | 能量池ID |
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| operation_type | string | 否 | 操作类型：freeze/unfreeze |
| resource_type | string | 否 | 资源类型：ENERGY/BANDWIDTH |
| startDate | string | 否 | 开始时间 (ISO格式) |
| endDate | string | 否 | 结束时间 (ISO格式) |

*注：address和poolId至少提供一个

**响应格式：**
```typescript
{
  success: boolean,
  data: StakeRecord[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**StakeRecord格式：**
```typescript
{
  id: string,                    // 记录ID
  transaction_id: string,        // 交易哈希
  pool_id: string,              // 池ID
  address: string,              // 账户地址
  amount: number,               // 操作金额(TRX)
  resource_type: "ENERGY" | "BANDWIDTH",  // 资源类型
  operation_type: "freeze" | "unfreeze",  // 操作类型
  status: "success" | "failed", // 交易状态
  created_at: string,           // 创建时间
  block_number: number,         // 区块高度
  to_address: string,           // 目标地址
  fee: number                   // 手续费
}
```

### 2. 委托记录查询

**基础信息：**
- **接口地址：** `GET /api/stake/delegates`
- **功能：** 获取账户的资源委托历史记录
- **实现文件：** [RecordsController.ts](../api/routes/stake/controllers/RecordsController.ts#L169)
- **路由定义：** [stake/index.ts](../api/routes/stake/index.ts#L80)
- **委托控制器：** [DelegateController.ts](../api/routes/stake/controllers/DelegateController.ts)

**查询参数：** (同质押记录查询)

**DelegateRecord格式：**
```typescript
{
  id: string,                    // 记录ID
  txid: string,                 // 交易哈希
  transaction_id: string,        // 交易哈希
  pool_id: string,              // 池ID
  pool_account_id: string,      // 池账户ID
  receiver_address: string,      // 接收方地址
  amount: number,               // 委托金额(TRX)
  resource_type: "ENERGY" | "BANDWIDTH",     // 资源类型
  operation_type: "delegate" | "undelegate", // 操作类型
  lock_period: number,          // 锁定期(小时)
  is_locked: boolean,           // 是否锁定
  status: string,               // 状态
  created_at: string,           // 创建时间
  updated_at: string            // 更新时间
}
```

### 3. 解质押记录查询

**基础信息：**
- **接口地址：** `GET /api/stake/unfreezes`
- **功能：** 获取账户的解质押操作和资金提取状态
- **实现文件：** [RecordsController.ts](../api/routes/stake/controllers/RecordsController.ts#L310)
- **路由定义：** [stake/index.ts](../api/routes/stake/index.ts#L83)
- **提取控制器：** [WithdrawController.ts](../api/routes/stake/controllers/WithdrawController.ts)

**查询参数：** (同质押记录查询，但无operation_type和resource_type过滤)

**UnfreezeRecord格式：**
```typescript
{
  id: string,                   // 记录ID
  txid: string,                // 交易哈希
  pool_id: string,             // 池ID
  amount: number,              // 解质押金额(TRX)
  resource_type: "ENERGY" | "BANDWIDTH",  // 资源类型
  unfreeze_time: string,       // 解质押时间
  withdrawable_time: string,   // 可提取时间
  status: "unfreezing" | "withdrawable" | "withdrawn",  // 状态
  created_at: string,          // 创建时间
  canWithdraw: boolean,        // 是否可提取
  daysUntilWithdrawable: number // 距离可提取天数
}
```

### 4. 质押概览

**基础信息：**
- **接口地址：** `GET /api/stake/overview`
- **功能：** 获取账户当前质押状态概览
- **实现文件：** [OverviewController.ts](../api/routes/stake/controllers/OverviewController.ts)
- **路由定义：** [stake/index.ts](../api/routes/stake/index.ts#L22)
- **服务层：** [StakingService.ts](../api/services/tron/services/StakingService.ts#L428)

**查询参数：**
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| address | string | 是* | 账户地址 |
| poolId | string | 是* | 能量池ID |

**响应格式：**
```typescript
{
  success: boolean,
  data: {
    // 新增的9个核心统计字段
    totalStakedTrx: number,        // 总质押TRX数量
    unlockingTrx: number,          // 解锁中的TRX数量
    withdrawableTrx: number,       // 可提取的TRX数量
    stakedEnergy: number,          // 自己质押获得的能量
    delegatedToOthersEnergy: number,   // 委托给他人的能量
    delegatedToSelfEnergy: number,     // 接收委托的能量
    stakedBandwidth: number,       // 自己质押获得的带宽
    delegatedToOthersBandwidth: number, // 委托给他人的带宽
    delegatedToSelfBandwidth: number,   // 接收委托的带宽
    
    // 保留的兼容性字段
    totalStaked: number,           // 总质押金额
    totalDelegated: number,        // 总委托金额
    totalUnfreezing: number,       // 解冻中金额
    availableToWithdraw: number,   // 可提取金额
    stakingRewards: number,        // 质押奖励
    delegationRewards: number,     // 委托奖励
    availableEnergy: number,       // 可用能量
    availableBandwidth: number,    // 可用带宽
    pendingUnfreeze: number,       // 待解冻金额
    withdrawableAmount: number     // 可提取金额
  }
}
```

### 5. 记录摘要

**基础信息：**
- **接口地址：** `GET /api/stake/records-summary`
- **功能：** 获取账户的质押、委托、解冻操作统计摘要
- **实现文件：** [RecordsController.ts](../api/routes/stake/controllers/RecordsController.ts#L433)
- **路由定义：** [stake/index.ts](../api/routes/stake/index.ts#L86)
- **数据库查询：** 综合统计多个表的数据

**查询参数：**
- `address` 或 `pool_id` (必选其一)

**响应格式：**
```typescript
{
  success: boolean,
  data: {
    staking: {
      totalOperations: number,     // 总操作数
      freezeOperations: number,    // 质押操作数
      unfreezeOperations: number,  // 解质押操作数
      totalFrozen: number,         // 总质押金额
      totalUnfrozen: number,       // 总解质押金额
      netStaked: number            // 净质押金额
    },
    delegation: {
      totalOperations: number,     // 总委托操作数
      delegateOperations: number,  // 委托操作数
      undelegateOperations: number, // 取消委托操作数
      totalDelegated: number,      // 总委托金额
      totalUndelegated: number,    // 总取消委托金额
      netDelegated: number         // 净委托金额
    },
    withdrawal: {
      totalUnfreezes: number,      // 总解冻次数
      withdrawableCount: number,   // 可提取记录数
      withdrawnCount: number,      // 已提取记录数
      withdrawableAmount: number,  // 可提取金额
      totalWithdrawn: number       // 总已提取金额
    }
  }
}
```

---

## 数据类型定义

### 资源类型 (ResourceType)
```typescript
type ResourceType = 'ENERGY' | 'BANDWIDTH'
```

### 操作类型 (OperationType)
```typescript
type StakeOperationType = 'freeze' | 'unfreeze' | 'withdraw'
type DelegateOperationType = 'delegate' | 'undelegate'
```

### 状态类型 (StatusType)
```typescript
type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'success'
type UnfreezeStatus = 'unfreezing' | 'withdrawable' | 'withdrawn'
```

---

## 使用示例

### 1. 获取质押记录
```bash
# 获取指定地址的质押记录
curl -X GET "http://localhost:3001/api/stake/records?address=TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 获取指定池的能量质押记录
curl -X GET "http://localhost:3001/api/stake/records?poolId=1&resource_type=ENERGY&operation_type=freeze" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. 获取委托记录
```bash
# 获取委托记录
curl -X GET "http://localhost:3001/api/stake/delegates?address=TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 获取解质押记录
```bash
# 获取解质押记录
curl -X GET "http://localhost:3001/api/stake/unfreezes?poolId=1&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. 获取质押概览
```bash
# 获取质押概览
curl -X GET "http://localhost:3001/api/stake/overview?address=TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. JavaScript客户端示例

**参考文档：**
- [Fetch API文档](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [JWT认证实现](../api/middleware/auth.ts)
- [前端API服务](../src/api/)

```javascript
const API_BASE = 'http://localhost:3001/api';
const token = 'YOUR_JWT_TOKEN';

// 获取质押记录
async function getStakeRecords(address, options = {}) {
  const params = new URLSearchParams({
    address,
    ...options
  });
  
  const response = await fetch(`${API_BASE}/stake/records?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}

// 使用示例
const records = await getStakeRecords('TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy', {
  resource_type: 'ENERGY',
  limit: 10
});

console.log('质押记录:', records.data);
```

**完整的前端集成示例：**
- [Vue.js质押组件](../src/pages/EnergyPool/Stake.vue)
- [质押数据获取](../src/pages/EnergyPool/composables/useStakeData.ts)
- [前端API服务目录](../src/api/)

---

## 技术实现

### 1. 数据获取策略

**参考实现：**
- [StakingService实现](../api/services/tron/services/StakingService.ts#L514)
- [网络配置管理](../api/services/tron.ts#L191)

**优先级顺序：**
1. **TronGrid API** - 优先使用官方TronGrid API获取真实交易数据
2. **TronWeb回退** - TronGrid失败时使用TronWeb方法
3. **模拟数据** - 两者都失败时提供模拟数据确保系统可用性

### 2. 交易筛选机制

**参考实现：**
- [交易筛选逻辑](../api/services/tron/services/StakingService.ts#L577)
- [合约类型定义](../api/services/tron/types/tron.types.ts)

**智能合约类型筛选：**
```typescript
// 质押相关合约
const stakeContractTypes = [
  'FreezeBalanceV2Contract',    // Stake 2.0质押
  'UnfreezeBalanceV2Contract',  // Stake 2.0解质押
  'FreezeBalanceContract',      // Stake 1.0质押(向下兼容)
  'UnfreezeBalanceContract',    // Stake 1.0解质押(向下兼容)
  'WithdrawExpireUnfreezeContract' // 提取解冻资金
];

// 委托相关合约
const delegateContractTypes = [
  'DelegateResourceContract',   // 资源委托
  'UnDelegateResourceContract' // 取消资源委托
];
```

### 3. 网络自适应

**参考实现：**
- [网络切换服务](../api/services/tron.ts#L191)
- [网络配置管理](../api/config/database.ts)
- [TronGrid配置](../api/services/tron/services/StakingService.ts#L31)

**支持多网络：**
- 主网 (Mainnet)
- Shasta测试网
- Nile测试网
- 自定义网络

**网络切换：**
```typescript
// 自动切换到池配置的网络
if (networkId) {
  await tronService.switchToNetwork(networkId);
}
```

### 4. 数据转换处理

**参考实现：**
- [数据格式转换](../api/services/tron/services/StakingService.ts#L712)
- [数据类型定义](../api/routes/stake/types/stake.types.ts)
- [前端格式化工具](../src/pages/EnergyPool/composables/useStakeFormatters.ts)

**单位转换：**
```typescript
// TRX单位转换：1 TRX = 1,000,000 SUN
const amount = rawAmount / 1000000;
```

**状态映射：**
```typescript
// 交易状态映射
const status = tx.ret?.[0]?.contractRet === 'SUCCESS' ? 'success' : 'failed';

// 解质押状态判断
const withdrawableTime = new Date(record.withdrawable_time);
const canWithdraw = withdrawableTime <= new Date();
const status = canWithdraw ? 'withdrawable' : 'unfreezing';
```

### 5. 缓存策略

**API调用优化：**
- 批量获取交易后客户端筛选
- 避免重复API调用
- 合理的limit设置 (limit * 2获取更多数据用于筛选)

---

## 错误处理

### 1. 常见错误码

| 状态码 | 错误类型 | 描述 | 解决方案 |
|--------|----------|------|----------|
| 400 | 参数错误 | 缺少必要参数或参数格式错误 | 检查请求参数 |
| 401 | 认证失败 | JWT Token无效或过期 | 重新登录获取Token |
| 404 | 资源不存在 | 指定的poolId不存在 | 检查poolId是否正确 |
| 500 | 服务器错误 | 内部服务错误 | 查看服务器日志 |

### 2. 错误响应格式
```typescript
{
  success: false,
  error: "错误类型",
  details: "详细错误信息"
}
```

### 3. 网络错误处理

**TronGrid API失败：**
```typescript
// 自动回退到TronWeb
try {
  // 使用TronGrid API
} catch (gridError) {
  console.warn('TronGrid API failed, falling back to TronWeb');
  // 使用TronWeb方法
}
```

**完全失败回退：**
```typescript
// 提供模拟数据确保系统可用
if (allMethodsFailed) {
  return getMockStakeTransactions(address, limit);
}
```

### 4. 重试机制

**建议的重试策略：**
- 网络超时：重试3次
- API限流：指数退避重试
- 临时错误：间隔重试

---

## 附录

### A. 相关文档链接

**TRON官方文档：**
- [TRON开发者文档](https://developers.tron.network/)
- [TronGrid API参考](https://developers.tron.network/reference)
- [TronWeb文档](https://tronweb.network/)
- [TRON Stake 2.0说明](https://developers.tron.network/docs/stake20)
- [Resource Delegation指南](https://developers.tron.network/docs/resource-delegation)

**项目技术文档：**
- [TRON服务实现](../api/services/tron.ts)
- [StakingService服务层](../api/services/tron/services/StakingService.ts)
- [TRON类型定义](../api/services/tron/types/tron.types.ts)
- [质押路由模块](../api/routes/stake/)
- [数据库配置](../api/config/database.ts)

**相关技术指南：**
- [TRON质押委托解质押接口说明](./TRON-质押委托解质押接口说明.md)
- [TronGrid与TronWeb技术对比](./tron-api/TronGrid与TronWeb技术对比与使用指南.md)
- [TRON签名机制详解](./tron-api/TRON-签名机制详解.md)

### B. 测试环境
- **主网：** `https://api.trongrid.io`
- **Shasta测试网：** `https://api.shasta.trongrid.io`
- **Nile测试网：** `https://nile.trongrid.io`

### C. API认证获取
```bash
# 登录获取JWT Token
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tronrental.com",
    "password": "admin123456"
  }'
```

---

*文档版本：v1.0*  
*最后更新：2024年1月*  
*维护者：TRON能量租赁系统开发团队*