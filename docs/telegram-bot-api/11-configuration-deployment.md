# ⚙️ 配置管理和部署指南

> Telegram Bot 配置管理、环境部署和运维监控的完整指南

## 📋 目录

- [配置管理系统](#配置管理系统)
- [环境配置](#环境配置)
- [Docker 容器化](#docker-容器化)
- [CI/CD 自动化](#cicd-自动化)
- [负载均衡和扩展](#负载均衡和扩展)
- [监控和告警](#监控和告警)
- [备份和恢复](#备份和恢复)
- [运维最佳实践](#运维最佳实践)

## 🎯 配置管理系统

### 动态配置架构

```mermaid
graph TB
    A[环境变量] --> B[配置服务]
    C[数据库配置] --> B
    D[Redis缓存] --> B
    B --> E[Bot配置]
    B --> F[网络配置]
    B --> G[支付配置]
    E --> H[TelegramBotService]
    F --> I[TronService]
    G --> J[PaymentService]
    
    K[管理面板] --> B
    L[配置热更新] --> B
```

### 项目配置系统

```typescript
// config/ConfigManager.ts
export class ConfigManager {
  private static instance: ConfigManager;
  private config: Map<string, any> = new Map();
  private watchers: Map<string, Function[]> = new Map();

  static getInstance(): ConfigManager {
    if (!this.instance) {
      this.instance = new ConfigManager();
    }
    return this.instance;
  }

  /**
   * 初始化配置系统
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing configuration system...');

      // 加载环境配置
      await this.loadEnvironmentConfig();
      
      // 加载数据库配置
      await this.loadDatabaseConfig();
      
      // 设置配置监听
      await this.setupConfigWatcher();
      
      // 验证必要配置
      await this.validateRequiredConfig();

      console.log('✅ Configuration system initialized successfully');
    } catch (error) {
      console.error('❌ Configuration initialization failed:', error);
      throw error;
    }
  }

  /**
   * 加载环境配置
   */
  private async loadEnvironmentConfig(): Promise<void> {
    const envConfig = {
      // 应用基础配置
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: parseInt(process.env.PORT || '3001'),
      API_VERSION: process.env.API_VERSION || 'v1',
      
      // 数据库配置
      DATABASE_URL: process.env.DATABASE_URL,
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: parseInt(process.env.DB_PORT || '5432'),
      DB_NAME: process.env.DB_NAME || 'tron_energy_rental',
      DB_USER: process.env.DB_USER || 'postgres',
      DB_PASSWORD: process.env.DB_PASSWORD,
      
      // Redis 配置
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      
      // Telegram 配置
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL,
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
      
      // TRON 配置
      TRON_NETWORK: process.env.TRON_NETWORK || 'mainnet',
      TRON_API_KEY: process.env.TRON_API_KEY,
      TRON_PRIVATE_KEY: process.env.TRON_PRIVATE_KEY,
      TRON_PAYMENT_ADDRESS: process.env.TRON_PAYMENT_ADDRESS,
      
      // 安全配置
      JWT_SECRET: process.env.JWT_SECRET,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      
      // 日志配置
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      LOG_FILE: process.env.LOG_FILE || 'logs/app.log',
      
      // 服务配置
      RATE_LIMIT: parseInt(process.env.RATE_LIMIT || '100'),
      SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || '1800000'),
      
      // 业务配置
      DEFAULT_ENERGY_PRICE: parseFloat(process.env.DEFAULT_ENERGY_PRICE || '0.00001'),
      MIN_ORDER_AMOUNT: parseFloat(process.env.MIN_ORDER_AMOUNT || '1'),
      MAX_ORDER_AMOUNT: parseFloat(process.env.MAX_ORDER_AMOUNT || '10000'),
      
      // 监控配置
      HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'),
      METRICS_ENABLED: process.env.METRICS_ENABLED === 'true'
    };

    // 存储环境配置
    for (const [key, value] of Object.entries(envConfig)) {
      this.config.set(key, value);
    }
  }

  /**
   * 加载数据库配置
   */
  private async loadDatabaseConfig(): Promise<void> {
    try {
      // 加载系统配置表中的配置
      const dbConfigs = await db.systemConfig.findMany({
        where: { is_active: true }
      });

      for (const config of dbConfigs) {
        this.config.set(config.config_key, JSON.parse(config.config_value));
      }

      // 加载 Telegram Bot 配置
      const botConfigs = await db.telegramBot.findMany({
        where: { is_active: true },
        include: { networks: true }
      });

      this.config.set('telegram_bots', botConfigs);

      // 加载 TRON 网络配置
      const networkConfigs = await db.tronNetwork.findMany({
        where: { is_active: true }
      });

      this.config.set('tron_networks', networkConfigs);

    } catch (error) {
      console.error('Failed to load database config:', error);
      // 在数据库不可用时使用默认配置
    }
  }

  /**
   * 设置配置监听
   */
  private async setupConfigWatcher(): Promise<void> {
    // 监听数据库配置变更
    setInterval(async () => {
      try {
        const changes = await this.detectConfigChanges();
        if (changes.length > 0) {
          await this.applyConfigChanges(changes);
        }
      } catch (error) {
        console.error('Config watcher error:', error);
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 验证必要配置
   */
  private async validateRequiredConfig(): Promise<void> {
    const required = [
      'TELEGRAM_BOT_TOKEN',
      'DATABASE_URL',
      'TRON_API_KEY',
      'JWT_SECRET'
    ];

    const missing = required.filter(key => !this.config.get(key));
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * 获取配置值
   */
  get<T>(key: string, defaultValue?: T): T {
    return this.config.get(key) ?? defaultValue;
  }

  /**
   * 设置配置值
   */
  set(key: string, value: any): void {
    this.config.set(key, value);
    this.notifyWatchers(key, value);
  }

  /**
   * 监听配置变更
   */
  watch(key: string, callback: (value: any) => void): void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, []);
    }
    this.watchers.get(key)!.push(callback);
  }

  /**
   * 通知监听者
   */
  private notifyWatchers(key: string, value: any): void {
    const callbacks = this.watchers.get(key) || [];
    callbacks.forEach(callback => {
      try {
        callback(value);
      } catch (error) {
        console.error(`Config watcher error for ${key}:`, error);
      }
    });
  }

  /**
   * 热更新配置
   */
  async hotReload(configKey: string, newValue: any): Promise<void> {
    try {
      // 更新数据库
      await db.systemConfig.upsert({
        where: { config_key: configKey },
        update: {
          config_value: JSON.stringify(newValue),
          updated_at: new Date()
        },
        create: {
          config_key: configKey,
          config_value: JSON.stringify(newValue),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // 更新内存配置
      this.set(configKey, newValue);

      console.log(`✅ Config hot reloaded: ${configKey}`);
    } catch (error) {
      console.error(`❌ Config hot reload failed for ${configKey}:`, error);
      throw error;
    }
  }
}
```

### 配置文件模板

```yaml
# config/production.yml
server:
  port: 3001
  host: 0.0.0.0
  cors:
    enabled: true
    origins: 
      - "https://your-domain.com"

database:
  pool:
    min: 2
    max: 20
    idle_timeout: 30000
    acquire_timeout: 60000
  ssl:
    enabled: true
    reject_unauthorized: true

redis:
  cluster:
    enabled: false
  sentinel:
    enabled: false
  retry_attempts: 3
  retry_delay: 1000

telegram:
  webhook:
    enabled: true
    url: "https://your-domain.com/api/telegram/webhook"
    secret_token: "${TELEGRAM_WEBHOOK_SECRET}"
    max_connections: 100
    allowed_updates:
      - "message"
      - "callback_query"
      - "inline_query"
  
  rate_limit:
    messages_per_second: 30
    messages_per_minute: 20

tron:
  network: "mainnet"
  endpoints:
    primary: "https://api.trongrid.io"
    fallback: "https://api.tronstack.io"
  fee_limit: 150000000
  retry_attempts: 3

monitoring:
  health_check:
    interval: 60000
    timeout: 5000
  metrics:
    enabled: true
    port: 3002
  alerts:
    enabled: true
    webhook: "https://your-monitoring.com/webhook"

logging:
  level: "info"
  format: "json"
  rotation:
    max_size: "100m"
    max_files: 5
  destinations:
    - type: "file"
      path: "/var/log/app/app.log"
    - type: "console"
      format: "pretty"
```

## 🐳 Docker 容器化

### Docker 配置

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制包配置文件
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装 pnpm 并安装依赖
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 生产环境镜像
FROM node:18-alpine AS production

# 创建应用用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 复制构建结果
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# 创建日志目录
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# 切换到应用用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js

# 启动应用
CMD ["node", "dist/index.js"]
```

### Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      target: production
    container_name: tron-energy-bot
    restart: unless-stopped
    ports:
      - "3001:3001"
      - "3002:3002"  # metrics port
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/tron_energy_rental
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs:rw
      - ./backups:/app/backups:rw
    networks:
      - app-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  postgres:
    image: postgres:15-alpine
    container_name: tron-energy-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=tron_energy_rental
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data:rw
      - ./migrations:/docker-entrypoint-initdb.d:ro
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d tron_energy_rental"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  redis:
    image: redis:7-alpine
    container_name: tron-energy-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data:rw
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'

  nginx:
    image: nginx:alpine
    container_name: tron-energy-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx:rw
    depends_on:
      - app
    networks:
      - app-network

  prometheus:
    image: prom/prometheus:latest
    container_name: tron-energy-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus:rw
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    container_name: tron-energy-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana:rw
      - ./monitoring/grafana:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  app-network:
    driver: bridge
```

### Nginx 配置

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3001;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=conn:10m;

    # SSL 配置
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS;

    # HTTP 重定向到 HTTPS
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS 主服务器
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # 安全头
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # API 路由
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            limit_conn conn 10;
            
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # 超时设置
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # 健康检查
        location /health {
            proxy_pass http://app/health;
            access_log off;
        }

        # 静态文件
        location /static/ {
            alias /var/www/static/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## 🚀 CI/CD 自动化

### GitHub Actions 配置

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lints
        run: npm run lint

      - name: Run tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.image.outputs.image }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha

      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

      - name: Output image
        id: image
        run: echo "image=${{ steps.meta.outputs.tags }}" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            # 备份当前版本
            cd /opt/tron-energy-rental
            ./scripts/backup.sh

            # 更新代码
            git pull origin main

            # 更新环境变量
            echo "IMAGE_TAG=${{ needs.build.outputs.image }}" > .env.deploy

            # 部署新版本
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d

            # 健康检查
            sleep 30
            curl -f http://localhost:3001/health || exit 1

            # 清理旧镜像
            docker image prune -f

      - name: Notify deployment
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 部署脚本

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Starting deployment..."

# 配置
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
HEALTH_CHECK_URL="http://localhost:3001/health"
MAX_RETRY=30
RETRY_INTERVAL=10

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
echo "📊 Creating database backup..."
docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump \
  -U postgres tron_energy_rental > "$BACKUP_DIR/database.sql"

# 备份配置文件
echo "⚙️ Backing up configuration..."
cp .env "$BACKUP_DIR/.env.backup"
cp docker-compose.prod.yml "$BACKUP_DIR/docker-compose.backup.yml"

# 拉取最新镜像
echo "📥 Pulling latest images..."
docker-compose -f $COMPOSE_FILE pull

# 停止服务（保持数据库运行）
echo "🛑 Stopping application services..."
docker-compose -f $COMPOSE_FILE stop app nginx

# 运行数据库迁移
echo "🗄️ Running database migrations..."
docker-compose -f $COMPOSE_FILE run --rm app npm run db:migrate

# 启动新版本
echo "🚀 Starting new version..."
docker-compose -f $COMPOSE_FILE up -d

# 健康检查
echo "🏥 Performing health check..."
for i in $(seq 1 $MAX_RETRY); do
  if curl -f $HEALTH_CHECK_URL > /dev/null 2>&1; then
    echo "✅ Health check passed!"
    break
  fi
  
  if [ $i -eq $MAX_RETRY ]; then
    echo "❌ Health check failed after $MAX_RETRY attempts"
    
    # 回滚
    echo "🔄 Rolling back..."
    docker-compose -f $COMPOSE_FILE down
    
    # 恢复数据库
    docker-compose -f $COMPOSE_FILE exec -T postgres psql \
      -U postgres -d tron_energy_rental < "$BACKUP_DIR/database.sql"
    
    exit 1
  fi
  
  echo "⏳ Health check attempt $i/$MAX_RETRY failed, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

# 清理
echo "🧹 Cleaning up old images..."
docker image prune -f

# 发送通知
echo "📧 Sending deployment notification..."
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  --data "{\"text\":\"✅ Deployment completed successfully at $(date)\"}"

echo "🎉 Deployment completed successfully!"
```

## ⚖️ 负载均衡和扩展

### 负载均衡配置

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  app:
    build: .
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
      restart_policy:
        condition: on-failure
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
    environment:
      - NODE_ENV=production
      - INSTANCE_ID={{.Task.Slot}}
    volumes:
      - ./logs:/app/logs:rw
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx-lb.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
    networks:
      - app-network
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 128M
          cpus: '0.25'
```

### Nginx 负载均衡配置

```nginx
# nginx/nginx-lb.conf
upstream app_servers {
    # 负载均衡策略
    least_conn;
    
    # 应用服务器
    server app_1:3001 weight=1 max_fails=3 fail_timeout=30s;
    server app_2:3001 weight=1 max_fails=3 fail_timeout=30s;
    server app_3:3001 weight=1 max_fails=3 fail_timeout=30s;
    
    # 健康检查
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    location / {
        proxy_pass http://app_servers;
        
        # 负载均衡配置
        proxy_next_upstream error timeout http_500 http_502 http_503;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 10s;
        
        # 连接配置
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 会话保持（如果需要）
        # ip_hash;
    }
}
```

### 水平扩展脚本

```bash
#!/bin/bash
# scripts/scale.sh

COMPOSE_FILE="docker-compose.scale.yml"
SERVICE_NAME="app"

# 获取当前副本数
current_replicas=$(docker service ls --filter name=${SERVICE_NAME} --format "{{.Replicas}}" | cut -d'/' -f2)

echo "📊 Current replicas: $current_replicas"

# 检查系统负载
load_avg=$(uptime | awk '{print $(NF-2)}' | sed 's/,//')
cpu_threshold=0.8
memory_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2}')
memory_threshold=0.8

echo "💻 Load average: $load_avg"
echo "🧠 Memory usage: $memory_usage"

# 自动扩展逻辑
if (( $(echo "$load_avg > $cpu_threshold" | bc -l) )) || 
   (( $(echo "$memory_usage > $memory_threshold" | bc -l) )); then
    
    new_replicas=$((current_replicas + 1))
    max_replicas=5
    
    if [ $new_replicas -le $max_replicas ]; then
        echo "📈 Scaling up to $new_replicas replicas..."
        docker service scale ${SERVICE_NAME}=$new_replicas
        
        # 等待扩展完成
        sleep 30
        
        # 验证扩展结果
        ./scripts/health-check.sh
        
        echo "✅ Scale up completed!"
    else
        echo "⚠️ Maximum replicas ($max_replicas) reached"
    fi
    
elif (( $(echo "$load_avg < 0.3" | bc -l) )) && 
     (( $(echo "$memory_usage < 0.4" | bc -l) )) && 
     [ $current_replicas -gt 1 ]; then
    
    new_replicas=$((current_replicas - 1))
    
    echo "📉 Scaling down to $new_replicas replicas..."
    docker service scale ${SERVICE_NAME}=$new_replicas
    
    sleep 30
    ./scripts/health-check.sh
    
    echo "✅ Scale down completed!"
else
    echo "👌 No scaling needed"
fi
```

## 📊 监控和告警

### Prometheus 配置

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts/*.yml"

scrape_configs:
  # 应用指标
  - job_name: 'tron-energy-bot'
    static_configs:
      - targets: ['app:3002']
    metrics_path: /metrics
    scrape_interval: 10s

  # 系统指标
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # 数据库指标
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis 指标
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Nginx 指标
  - job_name: 'nginx-exporter'
    static_configs:
      - targets: ['nginx-exporter:9113']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

### 告警规则

```yaml
# monitoring/alerts/app.yml
groups:
  - name: application
    rules:
      # 应用健康状态
      - alert: ApplicationDown
        expr: up{job="tron-energy-bot"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Application instance is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"

      # 高错误率
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests per second"

      # 响应时间过长
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }} seconds"

      # 内存使用过高
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      # CPU 使用过高
      - alert: HighCpuUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}%"

  - name: business
    rules:
      # 支付失败率过高
      - alert: HighPaymentFailureRate
        expr: rate(payment_failures_total[10m]) / rate(payment_attempts_total[10m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High payment failure rate"
          description: "Payment failure rate is {{ $value | humanizePercentage }}"

      # TRON 网络连接异常
      - alert: TronNetworkDown
        expr: tron_network_connection_status == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "TRON network connection is down"
          description: "Cannot connect to TRON network"

      # 队列积压过多
      - alert: HighQueueLength
        expr: queue_length > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High queue length"
          description: "Queue length is {{ $value }}"
```

### Grafana 面板配置

```json
{
  "dashboard": {
    "title": "TRON Energy Bot Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph", 
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users_count",
            "legendFormat": "Active Users"
          }
        ]
      },
      {
        "title": "Orders per Hour",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(orders_total[1h]) * 3600",
            "legendFormat": "Orders/hour"
          }
        ]
      }
    ]
  }
}
```

## 💾 备份和恢复

### 自动备份脚本

```bash
#!/bin/bash
# scripts/backup.sh

set -e

# 配置
BACKUP_DIR="/opt/backups"
DB_NAME="tron_energy_rental"
DB_USER="postgres"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p "$BACKUP_DIR/database"
mkdir -p "$BACKUP_DIR/config"
mkdir -p "$BACKUP_DIR/logs"

echo "🗄️ Starting backup process..."

# 数据库备份
echo "📊 Backing up database..."
docker-compose exec -T postgres pg_dump \
  -U $DB_USER \
  -h localhost \
  --verbose \
  --clean \
  --no-owner \
  --no-privileges \
  $DB_NAME > "$BACKUP_DIR/database/db_backup_${TIMESTAMP}.sql"

# 压缩数据库备份
gzip "$BACKUP_DIR/database/db_backup_${TIMESTAMP}.sql"

# 配置文件备份
echo "⚙️ Backing up configuration..."
cp .env "$BACKUP_DIR/config/env_backup_${TIMESTAMP}.env"
cp docker-compose*.yml "$BACKUP_DIR/config/" 2>/dev/null || true

# 日志备份
echo "📝 Backing up logs..."
if [ -d "logs" ]; then
  tar -czf "$BACKUP_DIR/logs/logs_backup_${TIMESTAMP}.tar.gz" logs/
fi

# 清理旧备份
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.env" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 备份到云存储（可选）
if [ -n "$AWS_S3_BUCKET" ]; then
  echo "☁️ Uploading to S3..."
  aws s3 cp "$BACKUP_DIR/database/db_backup_${TIMESTAMP}.sql.gz" \
    "s3://$AWS_S3_BUCKET/backups/database/"
fi

# 验证备份
echo "✅ Verifying backup..."
gunzip -t "$BACKUP_DIR/database/db_backup_${TIMESTAMP}.sql.gz"

echo "🎉 Backup completed successfully!"
echo "📁 Backup location: $BACKUP_DIR"
echo "📊 Database backup: db_backup_${TIMESTAMP}.sql.gz"
```

### 恢复脚本

```bash
#!/bin/bash
# scripts/restore.sh

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Available backups:"
  ls -la /opt/backups/database/
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="tron_energy_rental"
DB_USER="postgres"

echo "🔄 Starting restore process..."
echo "📁 Backup file: $BACKUP_FILE"

# 确认操作
read -p "⚠️ This will overwrite the current database. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Restore cancelled"
  exit 1
fi

# 停止应用
echo "🛑 Stopping application..."
docker-compose stop app

# 创建当前数据库备份
echo "💾 Creating safety backup..."
SAFETY_BACKUP="/tmp/safety_backup_$(date +%Y%m%d_%H%M%S).sql"
docker-compose exec -T postgres pg_dump \
  -U $DB_USER $DB_NAME > "$SAFETY_BACKUP"

# 解压备份文件（如果需要）
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "📦 Decompressing backup..."
  gunzip -c "$BACKUP_FILE" > "/tmp/restore_temp.sql"
  RESTORE_FILE="/tmp/restore_temp.sql"
else
  RESTORE_FILE="$BACKUP_FILE"
fi

# 恢复数据库
echo "📊 Restoring database..."
docker-compose exec -T postgres psql \
  -U $DB_USER \
  -d $DB_NAME \
  < "$RESTORE_FILE"

# 运行数据库迁移（如果需要）
echo "🗄️ Running migrations..."
docker-compose run --rm app npm run db:migrate

# 启动应用
echo "🚀 Starting application..."
docker-compose start app

# 健康检查
echo "🏥 Performing health check..."
sleep 30
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Restore completed successfully!"
  
  # 清理临时文件
  rm -f "$RESTORE_FILE" 2>/dev/null
  
  echo "💡 Safety backup saved at: $SAFETY_BACKUP"
else
  echo "❌ Health check failed!"
  echo "🔄 Consider rolling back using: $SAFETY_BACKUP"
  exit 1
fi
```

## 💡 运维最佳实践

### 性能优化清单

```typescript
// utils/performance.ts
export class PerformanceOptimizer {
  /**
   * 数据库查询优化
   */
  static async optimizeQueries(): Promise<void> {
    // 添加缺失的索引
    await db.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_telegram_id 
      ON users(telegram_id);
    `;
    
    await db.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status 
      ON orders(user_id, status) WHERE status IN ('pending', 'processing');
    `;
    
    // 分析表统计信息
    await db.$executeRaw`ANALYZE;`;
  }

  /**
   * 连接池优化
   */
  static configureConnectionPool(): void {
    const poolConfig = {
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '60000'),
      idle: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      evict: parseInt(process.env.DB_POOL_EVICT_INTERVAL || '10000')
    };
    
    console.log('Database pool configuration:', poolConfig);
  }

  /**
   * 内存使用优化
   */
  static monitorMemoryUsage(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      const usageInMB = {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024)
      };
      
      if (usageInMB.heapUsed > 400) { // 400MB 阈值
        console.warn('🚨 High memory usage:', usageInMB);
        
        // 触发垃圾回收
        if (global.gc) {
          global.gc();
        }
      }
    }, 60000); // 每分钟检查
  }
}
```

### 安全配置检查

```typescript
// utils/security.ts
export class SecurityValidator {
  /**
   * 安全配置检查
   */
  static async validateSecurityConfig(): Promise<{
    passed: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // 检查必要的环境变量
    const requiredSecrets = [
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'TELEGRAM_WEBHOOK_SECRET',
      'DB_PASSWORD'
    ];

    for (const secret of requiredSecrets) {
      if (!process.env[secret]) {
        issues.push(`Missing required secret: ${secret}`);
      } else if (process.env[secret].length < 32) {
        issues.push(`Weak secret: ${secret} (should be at least 32 characters)`);
      }
    }

    // 检查生产环境配置
    if (process.env.NODE_ENV === 'production') {
      if (process.env.TELEGRAM_WEBHOOK_URL?.startsWith('http://')) {
        issues.push('Webhook URL should use HTTPS in production');
      }

      if (!process.env.SSL_CERT || !process.env.SSL_KEY) {
        issues.push('SSL certificates not configured for production');
      }
    }

    // 检查数据库连接安全性
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.includes('sslmode=require') && process.env.NODE_ENV === 'production') {
      issues.push('Database connection should require SSL in production');
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }

  /**
   * 运行时安全检查
   */
  static async performRuntimeSecurityCheck(): Promise<void> {
    // 检查文件权限
    const sensitiveFiles = ['.env', 'keys/', 'certs/'];
    
    for (const file of sensitiveFiles) {
      if (await this.checkFilePermissions(file)) {
        console.warn(`⚠️ Insecure file permissions: ${file}`);
      }
    }

    // 检查开放端口
    await this.checkOpenPorts();

    // 检查依赖漏洞
    await this.checkDependencyVulnerabilities();
  }

  private static async checkFilePermissions(filepath: string): Promise<boolean> {
    try {
      const stats = require('fs').statSync(filepath);
      const mode = stats.mode & parseInt('777', 8);
      return mode > parseInt('600', 8); // 应该只有所有者可读写
    } catch {
      return false; // 文件不存在
    }
  }
}
```

### 运维任务自动化

```bash
#!/bin/bash
# scripts/maintenance.sh

# 每日维护任务
daily_maintenance() {
  echo "🗓️ Running daily maintenance..."
  
  # 数据库维护
  docker-compose exec postgres psql -U postgres -d tron_energy_rental -c "
    VACUUM ANALYZE;
    REINDEX DATABASE tron_energy_rental;
  "
  
  # 清理过期数据
  docker-compose exec app npm run cleanup:expired-orders
  docker-compose exec app npm run cleanup:old-logs
  
  # 备份
  ./scripts/backup.sh
  
  # 生成报告
  ./scripts/generate-report.sh daily
  
  echo "✅ Daily maintenance completed"
}

# 每周维护任务
weekly_maintenance() {
  echo "📅 Running weekly maintenance..."
  
  # 深度数据库清理
  docker-compose exec postgres psql -U postgres -d tron_energy_rental -c "
    VACUUM FULL;
    CLUSTER;
  "
  
  # 更新依赖
  docker-compose exec app npm audit fix
  
  # 安全扫描
  docker-compose exec app npm audit --audit-level=moderate
  
  # 生成周报
  ./scripts/generate-report.sh weekly
  
  echo "✅ Weekly maintenance completed"
}

# 根据参数执行对应任务
case "$1" in
  "daily")
    daily_maintenance
    ;;
  "weekly")
    weekly_maintenance
    ;;
  *)
    echo "Usage: $0 {daily|weekly}"
    exit 1
    ;;
esac
```

## 🔗 相关文档

- [Error Handling](./10-error-handling.md) - 错误处理和监控
- [Project Examples](./12-project-examples.md) - 完整部署示例
- [README](./README.md) - 完整文档导航

---

> 💡 **运维建议**
> 
> 1. **自动化优先** - 尽可能自动化部署、监控和维护任务
> 2. **监控全覆盖** - 从基础设施到业务指标的全方位监控
> 3. **安全第一** - 定期进行安全审计和漏洞扫描
> 4. **文档同步** - 保持部署文档与实际环境的一致性
> 5. **演练验证** - 定期进行故障恢复演练
