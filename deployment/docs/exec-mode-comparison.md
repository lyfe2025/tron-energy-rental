# PM2 执行模式详细对比

## 🔄 并发处理能力

### Fork 模式
```
请求处理流程：
客户端请求 → 单个进程 → 处理队列 → 响应

优点：
✅ 进程隔离安全
✅ 内存占用可控
✅ 错误影响范围小
✅ 适合I/O密集型任务

缺点：
❌ 单进程处理瓶颈
❌ 无法充分利用多核CPU
❌ 需要外部负载均衡
```

### Cluster 模式
```
请求处理流程：
客户端请求 → 主进程负载均衡 → 分发到工作进程 → 并行处理 → 响应

优点：
✅ 内置负载均衡
✅ 多核CPU充分利用
✅ 高并发处理能力
✅ 零停机重启

缺点：
❌ 总内存占用更大
❌ 不适合有状态应用
❌ 配置相对复杂
```

## 📈 性能基准测试

### 测试场景：API并发请求

| 执行模式 | 实例数 | RPS (请求/秒) | 平均响应时间 | 内存占用 | CPU利用率 |
|---------|--------|---------------|-------------|----------|-----------|
| Fork | 1 | 100 | 150ms | 40MB | 25% (单核) |
| Fork | 2 | 180 | 120ms | 80MB | 25% (单核) |
| Fork | 4 | 320 | 100ms | 160MB | 25% (单核) |
| Cluster | 4 | 450 | 80ms | 140MB | 85% (四核) |

### 结论
- **Cluster模式在高并发下性能更优**
- **Fork模式内存使用更可控**
- **Cluster模式CPU利用率更高**

## 🎯 使用场景推荐

### Fork 模式适合：
```javascript
// 1. 静态文件服务器
{
  name: 'static-server',
  exec_mode: 'fork',
  instances: 1
}

// 2. 定时任务
{
  name: 'cron-job',
  exec_mode: 'fork',
  instances: 1,
  cron_restart: '0 */6 * * *'
}

// 3. 数据处理服务
{
  name: 'data-processor',
  exec_mode: 'fork',
  instances: 2
}

// 4. 微服务中的单一职责服务
{
  name: 'notification-service',
  exec_mode: 'fork',
  instances: 1
}
```

### Cluster 模式适合：
```javascript
// 1. 高并发API服务
{
  name: 'api-server',
  exec_mode: 'cluster',
  instances: 'max'
}

// 2. Web应用服务器
{
  name: 'web-server',
  exec_mode: 'cluster',
  instances: 4
}

// 3. RESTful服务
{
  name: 'rest-api',
  exec_mode: 'cluster',
  instances: 'max'
}
```

## ⚙️ 模式切换指南

### 从 Fork 切换到 Cluster
```bash
# 1. 停止当前服务
pm2 stop all

# 2. 修改配置文件
# 将 exec_mode: 'fork' 改为 exec_mode: 'cluster'
# 将 instances: 1 改为 instances: 'max' 或具体数字

# 3. 重新启动
pm2 start ecosystem.config.js --env production

# 4. 验证状态
pm2 list
```

### 性能测试验证
```bash
# 使用 ab 工具测试
apt install apache2-utils  # Ubuntu/Debian
brew install apache2-utils # macOS

# 测试命令
ab -n 1000 -c 10 http://localhost:3001/api/health

# 对比不同模式下的结果：
# - Requests per second
# - Time per request
# - Failed requests
```

## 🔧 配置优化建议

### Fork 模式优化
```javascript
{
  exec_mode: 'fork',
  instances: 2,                    // 适中的实例数
  max_memory_restart: '512M',      // 合理的内存限制
  min_uptime: '10s',              // 防止频繁重启
  max_restarts: 10,               // 限制重启次数
  merge_logs: false,              // 独立日志便于调试
  watch: false                    // 生产环境关闭文件监控
}
```

### Cluster 模式优化
```javascript
{
  exec_mode: 'cluster',
  instances: 'max',               // 或 os.cpus().length
  max_memory_restart: '1G',       // 更大的内存限制
  instance_var: 'INSTANCE_ID',   // 实例标识
  merge_logs: true,               // 合并日志
  wait_ready: true,               // 等待ready信号
  listen_timeout: 3000,           // 监听超时
  kill_timeout: 5000,             // 杀死超时
  reload_delay: 1000              // 重载延迟
}
```

## 🚨 常见问题

### 1. Cluster模式下的状态管理
```javascript
// ❌ 错误：进程内存状态共享
let userSessions = {};  // 这在cluster模式下不工作

// ✅ 正确：使用外部存储
const redis = require('redis');
const client = redis.createClient();
```

### 2. WebSocket 在 Cluster 模式下的问题
```javascript
// ❌ 问题：WebSocket连接可能分散到不同进程
// ✅ 解决：使用 Redis Adapter 或 sticky sessions
```

### 3. 日志处理
```javascript
// Fork模式：每个进程独立日志
merge_logs: false,
out_file: './logs/app-${instance}.log'

// Cluster模式：合并日志
merge_logs: true,
out_file: './logs/app-combined.log'
```
