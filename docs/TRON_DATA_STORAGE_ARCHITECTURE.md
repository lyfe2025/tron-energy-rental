# TRON数据存储架构优化方案

## 📊 现状问题
1. **性能瓶颈**：每次查询都调用TRON API，响应时间500ms-2s
2. **资源浪费**：重复的API调用消耗大量网络资源
3. **扩展性差**：用户增长会导致API调用频率超限
4. **数据一致性**：实时查询可能出现数据不一致

## 🎯 优化目标
- **性能提升**：查询响应时间 < 100ms
- **数据准确性**：确保数据的实时性和准确性
- **系统稳定性**：降低对外部API的依赖
- **可扩展性**：支持大量并发查询

## 🏗️ 架构方案

### 方案一：数据库优先 + Redis缓存（推荐）

#### 数据流向
```
TRON网络事件 → 监听服务 → PostgreSQL（持久化） → Redis（缓存） → API响应
```

#### 核心组件

1. **TRON事件监听器**
   - 监听区块变化
   - 解析质押/委托/解质押交易
   - 实时更新数据库

2. **数据分层存储**
   - **PostgreSQL**: 完整历史数据，支持复杂查询
   - **Redis**: 热点数据缓存，快速响应

3. **数据同步策略**
   - 新交易：实时写入DB + 更新Redis
   - 查询：优先Redis，miss时查DB并回写Redis
   - 定期同步：每5分钟全量同步一次

#### 优势
- ✅ 数据持久化，不会丢失
- ✅ 支持复杂查询和统计分析  
- ✅ Redis缓存提供极快响应
- ✅ 可扩展性强，支持读写分离

#### 劣势
- ❌ 实现复杂度较高
- ❌ 需要维护数据同步逻辑

### 方案二：Redis为主 + 定期持久化

#### 数据流向
```
TRON网络事件 → 监听服务 → Redis（主存储） → 定期备份到PostgreSQL
```

#### 优势
- ✅ 性能最优，毫秒级响应
- ✅ 实现相对简单

#### 劣势  
- ❌ 数据安全性较低
- ❌ 复杂查询能力有限
- ❌ 内存占用较大

## 🔧 实施方案（推荐方案一）

### 1. 数据库优化

#### 表结构优化
```sql
-- 添加索引优化查询性能
CREATE INDEX CONCURRENTLY idx_stake_records_address_time ON stake_records(pool_account_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_delegate_records_address_time ON delegate_records(pool_account_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_unfreeze_records_address_time ON unfreeze_records(pool_account_id, created_at DESC);

-- 分区表（可选，数据量大时使用）
CREATE TABLE stake_records_2024 PARTITION OF stake_records
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

#### 数据清理策略
```sql
-- 定期清理超过1年的历史数据
DELETE FROM stake_records WHERE created_at < NOW() - INTERVAL '1 year';
```

### 2. Redis缓存策略

#### 缓存键设计
```
stake:records:{address}:{page}:{limit} - 质押记录
delegate:records:{address}:{page}:{limit} - 委托记录  
unfreeze:records:{address}:{page}:{limit} - 解质押记录
stake:summary:{address} - 统计摘要
```

#### 缓存时间
- 实时数据：5分钟
- 统计数据：30分钟
- 历史数据：24小时

### 3. 事件监听服务

#### 监听策略
- **WebSocket连接**：实时监听最新区块
- **轮询备份**：每30秒轮询一次，防止WebSocket断连
- **批量处理**：累积多个交易批量写入，提高效率

#### 数据解析
```typescript
interface TronTransactionEvent {
  blockNumber: number;
  transactionHash: string;
  contractAddress: string;
  eventType: 'FreezeBalanceV2' | 'UnfreezeBalanceV2' | 'DelegateResource';
  parameters: {
    owner: string;
    amount: number;
    resource: 'ENERGY' | 'BANDWIDTH';
  };
}
```

## 📊 性能对比

| 指标 | 当前方案 | 优化后 | 提升 |
|------|----------|--------|------|
| 查询响应时间 | 500-2000ms | 50-100ms | **90%+** |
| 并发支持 | 10 QPS | 1000+ QPS | **100倍** |
| 数据一致性 | 中等 | 高 | **大幅提升** |
| 系统稳定性 | 依赖外部API | 自主可控 | **大幅提升** |

## 🚀 实施路径

### 第一阶段：基础架构搭建（1-2周）
1. 设计事件监听服务
2. 优化数据库表结构和索引
3. 实现Redis缓存层

### 第二阶段：数据迁移（1周）
1. 历史数据同步到数据库
2. 建立初始缓存
3. 测试数据一致性

### 第三阶段：服务切换（1周）  
1. 修改API层，优先查询缓存/数据库
2. 保留TRON API作为备用
3. 性能测试和优化

## 🔍 监控指标

### 关键指标
- **数据延迟**：TRON事件到数据库的时间差
- **缓存命中率**：Redis命中率 > 90%
- **同步成功率**：数据同步成功率 > 99.9%
- **API响应时间**：平均响应时间 < 100ms

### 告警机制
- 数据延迟 > 5分钟
- 缓存命中率 < 80%  
- 同步失败率 > 1%
- API响应时间 > 500ms

## 💰 成本收益

### 成本
- **开发成本**：2-3人周
- **运维成本**：Redis内存费用（估计100-500MB）
- **维护成本**：监听服务维护

### 收益
- **用户体验**：查询速度提升10倍以上
- **系统稳定性**：降低对外部API依赖
- **业务扩展**：支持更多数据分析功能
- **成本节约**：减少TRON API调用费用

## 🛡️ 风险控制

### 数据一致性保障
1. **双写机制**：同时更新DB和Redis
2. **定期校验**：每小时对比TRON API数据
3. **故障恢复**：监听服务故障时自动回退到API查询

### 服务可用性
1. **降级策略**：缓存/数据库不可用时回退到TRON API
2. **熔断机制**：API异常时暂时使用缓存数据
3. **监控告警**：关键指标异常时及时通知

