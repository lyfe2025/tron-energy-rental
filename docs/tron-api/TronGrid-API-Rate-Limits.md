# TronGrid API 速率限制详细说明

## 概述

TronGrid 是 TRON 官方提供的 HTTP API 服务，为开发者提供便捷的区块链数据查询接口。为了保证服务稳定和公平使用，TronGrid 实施了严格的速率限制策略。

## 速率限制分类

### 1. 免费用户（无API Key）

| 限制类型 | 数值 | 说明 |
|---------|------|------|
| **请求频率** | 1-5 请求/秒 | 连续请求间隔需大于200-1000ms |
| **每日限制** | 1,000-5,000 次 | 24小时内的总请求数 |
| **并发限制** | 1-2 个 | 同时进行的请求数 |
| **429错误概率** | **很高** | 容易触发速率限制 |
| **适用场景** | 轻量测试、学习 | 不适合生产环境 |

### 2. 免费API Key用户

| 限制类型 | 数值 | 说明 |
|---------|------|------|
| **请求频率** | 10-20 请求/秒 | 显著提升请求频率 |
| **每日限制** | 10,000-50,000 次 | 大幅增加每日配额 |
| **并发限制** | 5-10 个 | 支持更多并发请求 |
| **429错误概率** | 中等 | 偶尔可能遇到限制 |
| **适用场景** | 开发环境、小型应用 | 适合大多数开发需求 |

### 3. 付费用户（Pro API Key）

| 限制类型 | 数值 | 说明 |
|---------|------|------|
| **请求频率** | 50-100+ 请求/秒 | 企业级请求频率 |
| **每日限制** | 100,000+ 次 | 几乎无限制 |
| **并发限制** | 20+ 个 | 高并发支持 |
| **429错误概率** | 很低 | 极少遇到限制 |
| **适用场景** | 生产环境、高并发应用 | 商业级服务保障 |

## 常见HTTP状态码

### 429 Too Many Requests

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded"
  }
}
```

**触发原因：**
- 请求频率超过限制
- 在限制时间窗口内请求次数过多
- 并发请求数超过允许范围

**解决方法：**
1. 等待 `Retry-After` 指定的秒数
2. 实现指数退避重试
3. 降低请求频率
4. 升级API Key等级

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY", 
    "message": "Invalid API key"
  }
}
```

**触发原因：**
- API Key 无效或已过期
- 请求头中缺少API Key
- API Key格式错误

## 最佳实践

### 1. 请求频率控制

```typescript
// 实现请求间隔控制
class RateLimitedClient {
  private lastRequestTime = 0;
  private minInterval = 200; // 最小间隔(ms)
  
  async makeRequest(url: string) {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    if (elapsed < this.minInterval) {
      await this.sleep(this.minInterval - elapsed);
    }
    
    this.lastRequestTime = Date.now();
    return fetch(url);
  }
  
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. 重试机制

```typescript
// 指数退避重试
async function retryRequest(requestFn: () => Promise<Response>, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await requestFn();
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        
        console.warn(`Rate limited, retrying after ${delay}ms (attempt ${attempt})`);
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}
```

### 3. 缓存策略

```typescript
// 请求缓存避免重复调用
class CachedTronGridClient {
  private cache = new Map<string, {data: any, timestamp: number}>();
  private cacheTTL = 30000; // 30秒缓存
  
  async getAccountInfo(address: string) {
    const cacheKey = `account:${address}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached.data;
    }
    
    const data = await this.fetchAccountInfo(address);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }
}
```

### 4. 错误监控

```typescript
// 429错误统计和监控
class TronGridMonitor {
  private rateLimitCount = 0;
  private totalRequests = 0;
  
  onResponse(response: Response) {
    this.totalRequests++;
    
    if (response.status === 429) {
      this.rateLimitCount++;
      console.warn(`Rate limit hit: ${this.rateLimitCount}/${this.totalRequests} (${(this.rateLimitCount/this.totalRequests*100).toFixed(2)}%)`);
    }
  }
  
  getStats() {
    return {
      totalRequests: this.totalRequests,
      rateLimitCount: this.rateLimitCount,
      rateLimitRate: this.rateLimitCount / this.totalRequests
    };
  }
}
```

## API Key管理

### 获取免费API Key

1. 访问 [TronGrid官网](https://www.trongrid.io/)
2. 注册开发者账户
3. 在控制台创建新的API Key
4. 复制API Key并妥善保管

### 配置API Key

```typescript
// 在请求头中添加API Key
const headers = {
  'TRON-PRO-API-KEY': 'your_api_key_here',
  'Content-Type': 'application/json'
};

fetch('https://api.trongrid.io/v1/accounts/address', { headers });
```

### 环境变量配置

```bash
# .env 文件
TRON_API_KEY=your_trongrid_api_key_here
TRON_API_KEY_TESTNET=your_shasta_api_key_here
```

## 网络端点信息

### 主网 (Mainnet)
- **API地址**: `https://api.trongrid.io`
- **浏览器**: `https://tronscan.org`
- **用途**: 生产环境

### Shasta测试网
- **API地址**: `https://api.shasta.trongrid.io`
- **浏览器**: `https://shasta.tronscan.org`
- **用途**: 开发测试

### Nile测试网
- **API地址**: `https://nile.trongrid.io`
- **浏览器**: `https://nile.tronscan.org`
- **用途**: 备用测试

## 故障排除

### 问题诊断清单

1. **检查API Key配置**
   ```bash
   # 检查环境变量
   echo $TRON_API_KEY
   
   # 检查数据库配置
   SELECT name, api_key FROM tron_networks WHERE api_key IS NOT NULL;
   ```

2. **监控请求频率**
   ```javascript
   // 添加请求日志
   console.log(`[${new Date().toISOString()}] API Request: ${url}`);
   ```

3. **分析错误模式**
   - 429错误的时间分布
   - 请求间隔统计
   - 并发请求分析

### 常见解决方案

| 问题 | 解决方案 |
|------|----------|
| 频繁429错误 | 降低请求频率，增加间隔 |
| API Key无效 | 重新生成或检查配置 |
| 达到每日限制 | 等待重置或升级套餐 |
| 并发限制 | 实现请求队列管理 |

## 监控和告警

### 关键指标

- **成功率**: `(总请求数 - 错误请求数) / 总请求数 * 100%`
- **429错误率**: `429错误数 / 总请求数 * 100%`
- **平均响应时间**: `总响应时间 / 总请求数`
- **每小时请求数**: 用于监控是否接近限制

### 告警规则建议

- 429错误率 > 5% 时发出警告
- 连续5分钟429错误率 > 10% 时发出告警
- 每日请求数接近限制的80% 时提前通知

## 升级建议

### 何时考虑付费升级

1. **429错误频繁出现** (>5%的请求)
2. **每日请求数接近免费限制**
3. **需要高并发处理**
4. **生产环境稳定性要求**

### 成本效益分析

| 场景 | 免费API Key | 付费API Key | 建议 |
|------|------------|------------|------|
| 个人学习 | ✅ 足够 | 不必要 | 免费 |
| 开发测试 | ✅ 基本满足 | 更好体验 | 免费 |
| 小型应用 | ⚠️ 可能不够 | ✅ 推荐 | 付费 |
| 商业应用 | ❌ 不适合 | ✅ 必须 | 付费 |

---

**文档版本**: v1.0  
**更新日期**: 2025-09-23  
**维护者**: TRON能量租赁系统团队  

> 本文档基于TronGrid官方文档和实际使用经验编写，如有官方政策变更，请以官方最新文档为准。
