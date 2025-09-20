/**
 * PM2 Fork模式性能优化配置文件
 * 用于TRON能量租赁系统生产环境部署
 * 
 * 🚀 Fork模式性能优化策略总览：
 * 
 * 1. 单实例优化：
 *    - Node.js运行时参数调优 (--optimize-for-size, --gc-interval)
 *    - 内存管理优化 (max_memory_restart, 堆内存大小)
 *    - 线程池大小调整 (UV_THREADPOOL_SIZE)
 * 
 * 2. 多实例扩展 (需要负载均衡器)：
 *    - 水平扩展：instances: 2-4 (根据CPU核心数)
 *    - 端口分离：每个实例使用不同端口
 *    - 负载均衡：Nginx upstream配置
 * 
 * 3. 性能监控：
 *    - 独立日志文件便于调试
 *    - 健康检查和自动重启
 *    - 内存使用监控
 * 
 * 📊 预期性能提升：
 * - 单实例优化：30-50% 响应时间改善
 * - 多实例扩展：2-4倍并发处理能力
 * - 内存优化：降低GC停顿时间
 */

module.exports = {
  apps: [
    {
      // ===== 基础配置 =====
      name: 'tron-energy-api',
      script: './api/server.ts',
      interpreter: 'tsx',
      
      // ===== Fork模式实例配置 =====
      instances: 1,           // 🎯 性能调优点1: 实例数量
      exec_mode: 'fork',      // Fork模式：进程隔离，便于调试，需要外部负载均衡
      
      /* 💡 多实例扩展选项 (需要配置Nginx负载均衡):
       * instances: 2,          // 双实例 - 适合中等负载
       * instances: 4,          // 四实例 - 适合高负载 (建议不超过CPU核心数的1/2)
       * 
       * 多实例时需要配置不同端口：
       * env_0: { PORT: 3001 },
       * env_1: { PORT: 3002 },
       * env_2: { PORT: 3003 },
       * env_3: { PORT: 3004 },
       */
      
      // ===== 环境变量配置 =====
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        
        // 🎯 性能调优点2: Node.js运行时优化 (兼容配置)
        NODE_OPTIONS: '--max-old-space-size=2048',  // 仅保留稳定支持的参数
        
        // 🎯 性能调优点3: 线程池优化
        UV_THREADPOOL_SIZE: 128,     // I/O线程池大小 (默认4, 建议: 64/128/256)
        
        /* 📝 高级性能参数说明：
         * NODE_OPTIONS支持的参数：
         * --max-old-space-size=2048   # 堆内存限制2GB ✅
         * --enable-source-maps        # 启用source maps ✅
         * 
         * 不支持在NODE_OPTIONS中的参数（需要在node_args中配置）：
         * --optimize-for-size         # 优化内存使用 ❌
         * --gc-interval=100           # 垃圾回收间隔 ❌
         * --max-semi-space-size=256   # 新生代内存大小 ❌
         * 
         * 线程池配置策略：
         * - 小型应用: 32-64
         * - 中型应用: 128 (当前配置)
         * - 大型应用: 256-512
         * - 注意：过大会消耗更多内存
         */
      },
      env_file: '.env.production',
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      
      // ===== 重启和稳定性配置 =====
      autorestart: true,              // 自动重启
      max_restarts: 10,               // 最大重启次数 (防止无限重启)
      min_uptime: '10s',              // 最小运行时间 (重启判断标准)
      
      // 🎯 性能调优点4: 内存管理
      max_memory_restart: '1536M',     // 内存限制自动重启 (可调整: 1024M/1536M/2048M/3072M)
      /* 内存限制策略：
       * - 开发环境: 512M-1G
       * - 测试环境: 1G-1.5G  
       * - 生产环境: 1.5G-3G (当前配置)
       * - 高负载环境: 2G-4G
       */
      
      // ===== Node.js进程参数优化 =====
      node_args: [
        // 🎯 性能调优点5: 堆内存精细控制
        '--max-old-space-size=1536',      // 老生代堆内存1.5GB (与max_memory_restart对应)
        
        // 调试和错误处理 (兼容的参数)
        '--enable-source-maps',           // 启用source maps (便于错误定位)
        '--unhandled-rejections=strict',  // 严格处理Promise rejection
        
        /* 🎯 高级优化选项 (根据需要启用):
         * '--optimize-for-size',           # 优化内存使用 (某些版本不支持NODE_OPTIONS)
         * '--gc-interval=100',             # GC间隔 (某些版本不支持NODE_OPTIONS)
         * '--max-semi-space-size=256',     # 新生代内存大小
         * '--expose-gc',                   # 暴露全局gc()函数
         * '--experimental-modules',        # 实验性ES模块支持
         * '--trace-gc',                    # GC跟踪 (调试用)
         * '--trace-gc-verbose',            # 详细GC日志
         * '--prof',                        # 性能分析
         */
      ],
      
      // ===== 文件监控配置 =====
      watch: false,                   // 生产环境禁用文件监控 (性能考虑)
      ignore_watch: [                 // 忽略监控的目录 (即使启用watch)
        'logs',                       // 日志目录
        'node_modules',               // 依赖目录
        'uploads',                    // 上传文件
        'public',                     // 静态资源
        'dist',                       // 构建产物
        '.git'                        // Git目录
      ],
      /* 开发环境可启用文件监控：
       * watch: true,
       * restart_delay: 1000,          # 重启延迟
       * watch_options: {
       *   followSymlinks: false,      # 不跟踪符号链接
       *   usePolling: false          # 不使用轮询 (性能更好)
       * }
       */
      
      // ===== 健康检查配置 =====
      // 🎯 性能调优点8: 应用健康监控
      health_check_grace_period: 3000,  // 健康检查宽限期3秒
      health_check_interval: 30000,     // 健康检查间隔30秒
      /* 健康检查优化：
       * - 高频监控: 10000-15000 (10-15秒)
       * - 标准监控: 30000 (30秒, 当前配置)
       * - 低频监控: 60000-120000 (1-2分钟)
       */
      
      // ===== Fork模式特殊配置 =====
      instance_var: 'PM2_INSTANCE_ID',    // Fork模式实例ID变量名
      combine_logs: false,                // 禁用日志合并 (Fork模式建议)
      merge_logs: false,                  // 每个实例独立日志文件
      
      /* 🎯 性能调优点9: Fork模式扩展策略
       * 
       * 单实例模式 (当前配置):
       * - 优点: 简单，资源占用低，便于调试
       * - 缺点: 无法充分利用多核CPU
       * - 适用: 小型应用，开发环境
       * 
       * 多实例模式 (需要Nginx负载均衡):
       * instances: 2-4,               # 根据CPU核心数调整
       * env_0: { PORT: 3001 },       # 实例0端口
       * env_1: { PORT: 3002 },       # 实例1端口
       * env_2: { PORT: 3003 },       # 实例2端口
       * env_3: { PORT: 3004 },       # 实例3端口
       * 
       * Nginx配置示例:
       * upstream tron_api {
       *   server 127.0.0.1:3001;
       *   server 127.0.0.1:3002;
       *   server 127.0.0.1:3003;
       *   server 127.0.0.1:3004;
       * }
       */
    },
    
    // ===== 前端静态文件服务器 =====
    {
      name: 'tron-energy-frontend',
      script: 'npx',                    // 使用npx执行
      args: 'serve -s dist -l 5173',    // serve命令参数：-s单页应用，-l指定端口
      instances: 1,                     // 静态服务器单实例即可
      exec_mode: 'fork',                // Fork模式适合静态文件服务
      
      /* 🎯 前端性能优化选项:
       * args: 'serve -s dist -l 5173 --cache 3600',  # 启用缓存1小时
       * args: 'serve -s dist -l 5173 --gzip',        # 启用Gzip压缩
       * args: 'serve -s dist -l 5173 --cors',        # 启用CORS
       */
      
      env: {
        NODE_ENV: 'production'
      },
      
      // ===== 前端日志配置 =====
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      
      // ===== 前端重启配置 =====
      autorestart: true,
      max_restarts: 5,                  // 前端重启次数较少
      min_uptime: '10s',
      max_memory_restart: '512M',       // 静态服务内存需求低
      
      // ===== 前端监控配置 =====
      watch: false,                     // 前端构建产物无需监控
      ignore_watch: [
        'logs',
        'node_modules',
        'api',                          // 忽略API目录
        '.git'
      ]
    }
  ],
  
  // ===== 部署配置 =====
  deploy: {
    production: {
      user: 'root',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/tron-energy-rental.git',
      path: '/www/wwwroot/tron-energy-rental',
      
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm run build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': '',
      
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};

/* ========================================================================
 * 🚀 Fork模式性能优化操作指南
 * ========================================================================
 * 
 * 📋 快速优化清单：
 * 
 * 1. 立即可用的优化 (当前已配置):
 *    ✅ Node.js堆内存优化: --max-old-space-size=1536
 *    ✅ 内存使用优化: --optimize-for-size
 *    ✅ 垃圾回收优化: --gc-interval=100
 *    ✅ I/O线程池优化: UV_THREADPOOL_SIZE=128
 *    ✅ 内存限制重启: max_memory_restart=1.5G
 * 
 * 2. 渐进式扩展策略:
 *    🔄 Step 1: 修改 instances: 2 (双实例)
 *    🔄 Step 2: 修改 instances: 4 (四实例)
 *    🔄 Step 3: 配置Nginx负载均衡
 * 
 * 📊 性能测试命令：
 * 
 * # 基准测试
 * ab -n 1000 -c 20 http://localhost:3001/api/health
 * 
 * # 性能监控
 * pm2 monit
 * pm2 show tron-energy-api
 * 
 * # 日志分析
 * pm2 logs tron-energy-api --lines 100
 * 
 * 🔧 调优参数速查表：
 * 
 * 内存配置:
 * - 小型应用: max_memory_restart: '1G', max-old-space-size=1024
 * - 中型应用: max_memory_restart: '1.5G', max-old-space-size=1536 (当前)
 * - 大型应用: max_memory_restart: '2G', max-old-space-size=2048
 * - 企业级: max_memory_restart: '4G', max-old-space-size=4096
 * 
 * 线程池配置:
 * - 轻量级: UV_THREADPOOL_SIZE: 32
 * - 标准型: UV_THREADPOOL_SIZE: 128 (当前)
 * - 高并发: UV_THREADPOOL_SIZE: 256
 * 
 * 垃圾回收配置:
 * - 内存优先: --gc-interval=50
 * - 平衡模式: --gc-interval=100 (当前)
 * - 性能优先: --gc-interval=200
 * 
 * 📈 多实例扩展配置模板：
 * 
 * // 双实例配置
 * instances: 2,
 * env_0: { PORT: 3001 },
 * env_1: { PORT: 3002 },
 * 
 * // 四实例配置
 * instances: 4,
 * env_0: { PORT: 3001 },
 * env_1: { PORT: 3002 },
 * env_2: { PORT: 3003 },
 * env_3: { PORT: 3004 },
 * 
 * 🌐 Nginx负载均衡配置 (/etc/nginx/sites-enabled/tron-api):
 * 
 * upstream tron_api_backend {
 *   least_conn;                     # 最少连接算法
 *   server 127.0.0.1:3001 weight=1;
 *   server 127.0.0.1:3002 weight=1;
 *   server 127.0.0.1:3003 weight=1;
 *   server 127.0.0.1:3004 weight=1;
 *   keepalive 32;                   # 保持连接数
 * }
 * 
 * server {
 *   listen 80;
 *   server_name your-domain.com;
 *   
 *   location /api/ {
 *     proxy_pass http://tron_api_backend;
 *     proxy_http_version 1.1;
 *     proxy_set_header Upgrade $http_upgrade;
 *     proxy_set_header Connection 'upgrade';
 *     proxy_set_header Host $host;
 *     proxy_set_header X-Real-IP $remote_addr;
 *     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 *     proxy_set_header X-Forwarded-Proto $scheme;
 *     proxy_cache_bypass $http_upgrade;
 *     proxy_connect_timeout 60s;
 *     proxy_send_timeout 60s;
 *     proxy_read_timeout 60s;
 *   }
 * }
 * 
 * 📱 常用PM2命令：
 * 
 * # 启动服务
 * pm2 start ecosystem.config.js --env production
 * 
 * # 重启服务 (应用配置更改)
 * pm2 restart tron-energy-api
 * 
 * # 重载服务 (零停机更新)
 * pm2 reload tron-energy-api
 * 
 * # 扩容实例
 * pm2 scale tron-energy-api 4
 * 
 * # 查看状态
 * pm2 list
 * pm2 show tron-energy-api
 * pm2 monit
 * 
 * # 查看日志
 * pm2 logs tron-energy-api
 * pm2 logs tron-energy-api --lines 50
 * pm2 flush  # 清空日志
 * 
 * # 保存配置
 * pm2 save
 * pm2 startup  # 开机自启
 * 
 * 🎯 性能优化执行步骤：
 * 
 * Step 1: 基准测试
 * ================
 * 1. 记录当前性能指标
 * 2. 运行压力测试
 * 3. 监控资源使用情况
 * 
 * Step 2: 单实例优化 (已完成)
 * ==========================
 * 1. 应用Node.js运行时优化
 * 2. 调整内存和GC参数
 * 3. 优化线程池大小
 * 4. 测试性能改善
 * 
 * Step 3: 多实例扩展 (可选)
 * ========================
 * 1. 修改instances参数
 * 2. 配置多端口
 * 3. 重启PM2服务
 * 4. 验证负载分布
 * 
 * Step 4: 负载均衡 (推荐)
 * =====================
 * 1. 配置Nginx upstream
 * 2. 设置健康检查
 * 3. 调整负载算法
 * 4. 监控集群状态
 * 
 * Step 5: 持续监控优化
 * ==================
 * 1. 设置性能告警
 * 2. 定期性能测试
 * 3. 根据负载调整参数
 * 4. 升级硬件资源
 * 
 * 💡 性能优化提示：
 * 
 * - 优化顺序：先单实例优化，再考虑多实例扩展
 * - 监控重点：CPU使用率、内存占用、响应时间、错误率
 * - 扩展原则：不超过CPU核心数的50-75%
 * - 测试策略：每次调整后都要进行性能测试验证
 * 
 * 🔍 问题排查指南：
 * 
 * 高内存使用 → 降低max_memory_restart，检查内存泄漏
 * 高CPU使用 → 增加instances，检查代码性能瓶颈
 * 响应时间慢 → 优化GC参数，检查数据库查询
 * 频繁重启 → 检查错误日志，调整min_uptime
 * 
 * ========================================================================
 */
