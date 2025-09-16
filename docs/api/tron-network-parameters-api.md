# TRON网络参数API接口说明

## 概述

基于[TRON官方资源模型文档](https://developers.tron.network/docs/resource-model)的要求，需要实现正确的资源计算逻辑。

## 接口定义

### 获取网络参数

**接口路径**: `GET /api/tron-networks/{networkId}/parameters`

**返回数据结构**:

```typescript
interface NetworkParameters {
  networkId: string
  networkName: string
  networkType: string
  network: 'mainnet' | 'shasta' | 'nile'
  unlockPeriod: number // 解锁期（毫秒）
  unlockPeriodDays: number // 解锁期（天）
  unlockPeriodText: string // 解锁期文本，如"14天"
  minStakeAmount: number // 最小质押金额（sun）
  minStakeAmountTrx: number // 最小质押金额（TRX）
  lastUpdated: string // 最后更新时间
  
  // TRON网络资源参数 - 基于官方文档
  totalDailyEnergy: number // 全网每日固定能量总量：180,000,000,000
  totalDailyBandwidth: number // 全网每日固定带宽总量：43,200,000,000
  totalStakedForEnergy: number // 全网用于获取Energy的TRX总量（实时数据）
  totalStakedForBandwidth: number // 全网用于获取Bandwidth的TRX总量（实时数据）
  energyUnitPrice: number // Energy单价：100 sun
  bandwidthUnitPrice: number // Bandwidth单价：1000 sun
  freeBandwidthPerDay: number // 每日免费带宽：600
}
```

## 数据获取方法

### 1. 固定参数（来自TRON官方文档）

```javascript
// 这些是TRON网络的固定参数
const TRON_CONSTANTS = {
  totalDailyEnergy: 180_000_000_000, // 全网每日固定能量总量
  totalDailyBandwidth: 43_200_000_000, // 全网每日固定带宽总量
  energyUnitPrice: 100, // Energy单价（sun）
  bandwidthUnitPrice: 1000, // Bandwidth单价（sun）
  freeBandwidthPerDay: 600 // 每日免费带宽
}
```

### 2. 实时数据获取

需要通过TRON节点API获取实时的全网质押数据：

**获取全网质押信息的API**：
```bash
# 通过wallet/getaccountresource接口可以查询全网质押数据
curl -X POST https://api.trongrid.io/wallet/getaccountresource
```

**关键字段**：
- `totalStakedForEnergy`: 全网用于获取Energy的TRX总量
- `totalStakedForBandwidth`: 全网用于获取Bandwidth的TRX总量

## 资源计算公式

### Energy计算公式
```
Amount of Energy obtained = Amount of TRX staked for obtaining Energy / Total amount of TRX staked for obtaining Energy on the whole network * 180_000_000_000
```

### Bandwidth计算公式
```
Amount of Bandwidth obtained = Amount of TRX staked for obtaining Bandwidth / Total amount of TRX staked for obtaining Bandwidth on the whole network * 43_200_000_000
```

## 示例返回数据

```json
{
  "success": true,
  "data": {
    "networkId": "mainnet_001",
    "networkName": "TRON Mainnet",
    "networkType": "mainnet",
    "network": "mainnet",
    "unlockPeriod": 1209600000,
    "unlockPeriodDays": 14,
    "unlockPeriodText": "14天",
    "minStakeAmount": 1000000,
    "minStakeAmountTrx": 1,
    "lastUpdated": "2025-01-17T10:30:00Z",
    "totalDailyEnergy": 180000000000,
    "totalDailyBandwidth": 43200000000,
    "totalStakedForEnergy": 50000000000000,
    "totalStakedForBandwidth": 20000000000000,
    "energyUnitPrice": 100,
    "bandwidthUnitPrice": 1000,
    "freeBandwidthPerDay": 600
  }
}
```

## 实现注意事项

1. **实时性要求**: `totalStakedForEnergy`和`totalStakedForBandwidth`需要实时或准实时更新
2. **缓存策略**: 建议缓存5-10分钟，因为全网质押量变化相对较慢
3. **错误处理**: 当无法获取实时数据时，应该返回错误而不是使用过期数据
4. **单位统一**: 所有TRX金额使用sun作为基本单位（1 TRX = 1,000,000 sun）

## API调用示例

### 前端调用示例
```typescript
// 获取网络参数
const params = await networkParametersService.getNetworkParameters('mainnet_001')

// 计算资源数量
const energyAmount = networkParametersService.calculateResourceAmount(
  1000, // 质押1000 TRX
  'ENERGY',
  params
)

// 格式化显示
const formattedEnergy = networkParametersService.formatResourceAmount(energyAmount, 'ENERGY')
console.log(`质押1000 TRX可获得: ${formattedEnergy} 能量`)
```

## 参考资源

- [TRON官方资源模型文档](https://developers.tron.network/docs/resource-model)
- [TRON节点API文档](https://developers.tron.network/docs/http-api)
- [TRON Network Parameters](https://tronscan.org/#/data/charts2/network/overview)
