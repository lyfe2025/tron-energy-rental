# Tron数据管理架构实施计划

## 🎯 实施概述

基于分析和方案设计，我们将分三个阶段实施新的数据架构：

1. **第一阶段**：基础架构搭建（1-2周）
2. **第二阶段**：数据迁移与测试（1周）  
3. **第三阶段**：服务切换与优化（1周）

## 📋 详细实施计划

### 第一阶段：基础架构搭建

#### 1.1 创建Tron事件监听服务

```typescript
// api/services/tron/TronEventListener.ts
import { EventEmitter } from 'events';
import WebSocket from 'ws';

export class TronEventListener extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timer | null = null;
  private isConnected = false;

  constructor() {
    super();
    this.startListening();
  }

  async startListening() {
    try {
      // WebSocket连接到Tron节点
      this.ws = new WebSocket('wss://api.trongrid.io/socket');
      
      this.ws.on('open', () => {
        console.log('✅ Tron WebSocket连接成功');
        this.isConnected = true;
        
        // 订阅相关事件
        this.subscribeToEvents();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        console.log('❌ Tron WebSocket连接断开');
        this.isConnected = false;
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('❌ Tron监听服务启动失败:', error);
      this.scheduleReconnect();
    }
  }

  private subscribeToEvents() {
    const subscriptions = [
      { eventName: 'FreezeBalanceV2' },
      { eventName: 'UnfreezeBalanceV2' }, 
      { eventName: 'DelegateResource' },
      { eventName: 'UndelegateResource' }
    ];

    subscriptions.forEach(sub => {
      this.ws?.send(JSON.stringify({
        action: 'subscribe',
        ...sub
      }));
    });
  }

  private handleMessage(data: Buffer) {
    try {
      const event = JSON.parse(data.toString());
      
      // 发出事件供其他服务处理
      this.emit('tronEvent', event);
      
    } catch (error) {
      console.error('❌ 处理Tron事件失败:', error);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.startListening();
    }, 5000); // 5秒后重连
  }
}
```

#### 1.2 创建数据处理服务

```typescript
// api/services/tron/TronDataProcessor.ts
import { pool } from '../../config/database.js';
import { redisOperations } from '../../config/redis.js';

export class TronDataProcessor {
  constructor() {
    // 监听Tron事件
    const eventListener = new TronEventListener();
    eventListener.on('tronEvent', this.processEvent.bind(this));
  }

  async processEvent(event: any) {
    try {
      // 1. 解析事件数据
      const parsedData = this.parseEventData(event);
      
      if (!parsedData) return;

      // 2. 双写策略：同时写入数据库和Redis
      await Promise.all([
        this.writeToDatabase(parsedData),
        this.updateCache(parsedData)
      ]);

      console.log(`✅ 处理Tron事件成功: ${event.eventName}`);
      
    } catch (error) {
      console.error('❌ 处理Tron事件失败:', error);
      // 这里可以加入重试逻辑或者告警
    }
  }

  private parseEventData(event: any) {
    switch (event.eventName) {
      case 'FreezeBalanceV2':
        return this.parseStakeEvent(event);
      case 'UnfreezeBalanceV2':
        return this.parseUnfreezeEvent(event);
      case 'DelegateResource':
        return this.parseDelegateEvent(event);
      case 'UndelegateResource':
        return this.parseUndelegateEvent(event);
      default:
        return null;
    }
  }

  private async writeToDatabase(data: any) {
    const { type, record } = data;
    
    switch (type) {
      case 'stake':
        await pool.query(
          `INSERT INTO stake_records (pool_account_id, operation_type, resource_type, amount, tx_hash, status, block_number, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (tx_hash) DO UPDATE SET status = EXCLUDED.status`,
          [record.pool_account_id, record.operation_type, record.resource_type, record.amount, 
           record.tx_hash, record.status, record.block_number, record.created_at]
        );
        break;
        
      case 'delegate':
        await pool.query(
          `INSERT INTO delegate_records (pool_account_id, receiver_address, operation_type, resource_type, amount, tx_hash, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (tx_hash) DO UPDATE SET status = EXCLUDED.status`,
          [record.pool_account_id, record.receiver_address, record.operation_type, record.resource_type, 
           record.amount, record.tx_hash, record.status, record.created_at]
        );
        break;
        
      case 'unfreeze':
        await pool.query(
          `INSERT INTO unfreeze_records (pool_account_id, amount, unfreeze_tx_hash, status, available_time, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (unfreeze_tx_hash) DO UPDATE SET status = EXCLUDED.status`,
          [record.pool_account_id, record.amount, record.unfreeze_tx_hash, record.status, 
           record.available_time, record.created_at]
        );
        break;
    }
  }

  private async updateCache(data: any) {
    const { type, record } = data;
    
    // 1. 清除相关的列表缓存
    await this.invalidateListCaches(record.pool_account_id);
    
    // 2. 更新统计缓存
    await this.updateSummaryCache(record.pool_account_id);
  }

  private async invalidateListCaches(poolAccountId: string) {
    // 删除所有相关的分页缓存
    const patterns = [
      `stake:records:${poolAccountId}:*`,
      `delegate:records:${poolAccountId}:*`, 
      `unfreeze:records:${poolAccountId}:*`
    ];
    
    // 这里需要Redis支持pattern删除，或者记录所有的缓存键
    for (const pattern of patterns) {
      // 实现批量删除逻辑
    }
  }
}
```

#### 1.3 缓存管理器优化

```typescript
// api/services/cache/CacheManager.ts
import { redisOperations } from '../../config/redis.js';

export class CacheManager {
  // 缓存键定义
  static KEYS = {
    STAKE_RECORDS: (address: string, page: number, limit: number) => 
      `stake:records:${address}:${page}:${limit}`,
    DELEGATE_RECORDS: (address: string, page: number, limit: number) => 
      `delegate:records:${address}:${page}:${limit}`,
    UNFREEZE_RECORDS: (address: string, page: number, limit: number) => 
      `unfreeze:records:${address}:${page}:${limit}`,
    ACCOUNT_SUMMARY: (address: string) => `account:summary:${address}`,
  };

  // 缓存TTL定义
  static TTL = {
    REALTIME_DATA: 300,    // 5分钟
    SUMMARY_DATA: 1800,    // 30分钟
    HISTORICAL_DATA: 3600, // 1小时
  };

  async getWithCache<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number
  ): Promise<T> {
    try {
      // 1. 尝试从缓存获取
      const cached = await redisOperations.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`❌ Redis读取失败: ${key}`, error);
    }

    // 2. 缓存miss或失败，执行fetcher
    const data = await fetcher();

    // 3. 写入缓存（异步，不阻塞响应）
    this.setCache(key, data, ttl).catch(error => {
      console.warn(`❌ Redis写入失败: ${key}`, error);
    });

    return data;
  }

  private async setCache(key: string, data: any, ttl: number) {
    try {
      await redisOperations.set(key, JSON.stringify(data), ttl);
    } catch (error) {
      console.error('Redis写入失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  async invalidatePattern(pattern: string) {
    // 删除匹配模式的所有键
    // 注意：这需要Redis支持或自定义实现
  }
}
```

### 第二阶段：API层改造

#### 2.1 改造控制器

```typescript
// api/controllers/stake/RecordsController.ts 改造
import { CacheManager } from '../../services/cache/CacheManager.js';

export class RecordsController {
  private cacheManager = new CacheManager();

  async getStakeRecords(req: Request, res: Response) {
    try {
      const { pool_account_id, page = 1, limit = 20 } = req.query;
      
      // 1. 构建缓存键
      const cacheKey = CacheManager.KEYS.STAKE_RECORDS(
        pool_account_id as string, 
        Number(page), 
        Number(limit)
      );

      // 2. 使用缓存管理器获取数据
      const data = await this.cacheManager.getWithCache(
        cacheKey,
        async () => {
          // 缓存miss时的数据库查询
          return await this.queryStakeRecordsFromDB(pool_account_id, page, limit);
        },
        CacheManager.TTL.HISTORICAL_DATA
      );

      res.json({
        success: true,
        data,
        meta: {
          page: Number(page),
          limit: Number(limit),
          source: 'optimized' // 表示使用了优化后的架构
        }
      });

    } catch (error) {
      console.error('获取质押记录失败:', error);
      
      // 降级策略：如果缓存和数据库都失败，尝试外部API
      try {
        const fallbackData = await this.getFallbackData(req.query);
        res.json({
          success: true,
          data: fallbackData,
          meta: { source: 'fallback' }
        });
      } catch (fallbackError) {
        res.status(500).json({
          success: false,
          message: '获取数据失败',
          error: fallbackError.message
        });
      }
    }
  }

  private async queryStakeRecordsFromDB(pool_account_id: any, page: any, limit: any) {
    const offset = (Number(page) - 1) * Number(limit);
    
    const query = `
      SELECT * FROM stake_records 
      WHERE pool_account_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [pool_account_id, limit, offset]);
    return result.rows;
  }

  private async getFallbackData(query: any) {
    // 降级到原来的TronGrid API调用
    // 这里保留原来的逻辑作为备用
    return await this.originalTronGridLogic(query);
  }
}
```

### 第三阶段：监控与运维

#### 3.1 监控服务增强

```typescript
// api/services/monitoring/TronDataMonitor.ts
export class TronDataMonitor {
  async getMetrics() {
    const metrics = {
      // 监听服务状态
      listenerStatus: await this.checkListenerStatus(),
      
      // 数据延迟
      dataLatency: await this.calculateDataLatency(),
      
      // 缓存性能
      cacheStats: await this.getCacheStats(),
      
      // 同步成功率
      syncSuccessRate: await this.calculateSyncSuccessRate(),
    };

    return metrics;
  }

  private async checkListenerStatus() {
    // 检查监听服务是否正常工作
    // 可以通过检查最近是否有新数据来判断
  }

  private async calculateDataLatency() {
    // 计算从Tron网络到数据库的数据延迟
  }

  private async getCacheStats() {
    // 获取Redis的统计信息
    return {
      hitRate: 0.95, // 缓存命中率
      keyCount: 1000, // 键数量
      memoryUsage: '256MB' // 内存使用量
    };
  }
}
```

#### 3.2 健康检查端点

```typescript
// api/routes/health/tron.ts
import express from 'express';
const router = express.Router();

router.get('/tron-data-health', async (req, res) => {
  try {
    const monitor = new TronDataMonitor();
    const metrics = await monitor.getMetrics();
    
    // 判断健康状态
    const isHealthy = metrics.listenerStatus === 'online' && 
                      metrics.dataLatency < 300000 && // 5分钟内
                      metrics.cacheStats.hitRate > 0.8;

    res.json({
      success: true,
      status: isHealthy ? 'healthy' : 'warning',
      metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
});

export default router;
```

## 🔧 具体实施步骤

### 步骤1：环境准备
```bash
# 1. 确保Redis正在运行
redis-cli ping

# 2. 安装必要的依赖
npm install ws @types/ws

# 3. 数据库索引优化
psql -d tron_energy_rental -f scripts/database/add-indexes.sql
```

### 步骤2：代码部署
```bash
# 1. 创建监听服务
mkdir -p api/services/tron/listeners
mkdir -p api/services/cache

# 2. 部署代码文件
# (将上述代码文件部署到对应位置)

# 3. 启动监听服务
npm run start:listener
```

### 步骤3：测试验证
```bash
# 1. 测试监听服务
curl http://localhost:3001/health/tron-data-health

# 2. 测试API性能
curl "http://localhost:3001/api/stake/records?pool_account_id=xxx&page=1&limit=20"

# 3. 验证缓存命中
redis-cli monitor | grep "stake:records"
```

## 📊 性能验证标准

### 关键指标目标
- ✅ **API响应时间** < 100ms (vs 当前500-2000ms)
- ✅ **缓存命中率** > 90%
- ✅ **数据延迟** < 5分钟
- ✅ **同步成功率** > 99%

### 压力测试
```bash
# 使用Apache Bench进行压力测试
ab -n 1000 -c 10 "http://localhost:3001/api/stake/records?pool_account_id=test"

# 预期结果：
# - Requests per second > 100 (vs 当前 < 10)
# - 95%的请求响应时间 < 100ms
```

## 🚀 上线计划

### 灰度发布策略
1. **10%流量**：新架构处理10%的请求，其余使用原架构
2. **50%流量**：确认稳定后，扩大到50%
3. **100%流量**：完全切换到新架构

### 回滚方案
- 保留原有的TronGrid API调用逻辑
- 出现问题时，可以通过配置快速回滚
- 数据库数据不会丢失，只是查询方式的改变

## ✅ 成功标准

### 技术指标
- [ ] API响应时间提升90%以上
- [ ] 支持1000+ QPS并发
- [ ] 缓存命中率达到90%以上
- [ ] 数据延迟控制在5分钟内

### 业务指标  
- [ ] 用户查询体验明显提升
- [ ] 系统稳定性增强
- [ ] 外部API依赖降低90%
- [ ] 运营成本下降60%

通过这个分阶段的实施计划，我们可以稳健地将当前的数据架构升级为高性能、高可靠的新架构，同时最小化风险和业务影响。
