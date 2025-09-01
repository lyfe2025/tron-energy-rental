/**
 * TRON能量租赁系统 - PM2进程管理配置
 * 作者: 系统管理员
 * 描述: PM2进程管理器配置，用于生产环境进程管理
 */

module.exports = {
  apps: [
    {
      // API服务配置
      name: 'tron-energy-api',
      script: 'api/server.ts',
      interpreter: 'tsx',
      cwd: '/var/www/tron-energy-rental',
      
      // 实例配置
      instances: 'max', // 根据CPU核心数自动调整
      exec_mode: 'cluster',
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        TZ: 'Asia/Shanghai'
      },
      
      // 开发环境变量
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        TZ: 'Asia/Shanghai'
      },
      
      // 测试环境变量
      env_test: {
        NODE_ENV: 'test',
        PORT: 3001,
        TZ: 'Asia/Shanghai'
      },
      
      // 日志配置
      log_file: '/var/log/tron-energy-rental/combined.log',
      out_file: '/var/log/tron-energy-rental/out.log',
      error_file: '/var/log/tron-energy-rental/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 进程管理
      autorestart: true,
      watch: false, // 生产环境关闭文件监听
      max_memory_restart: '1G',
      restart_delay: 4000,
      
      // 健康检查
      health_check_http_url: 'http://localhost:3001/api/health',
      health_check_grace_period: 3000,
      
      // 性能监控
      pmx: true,
      
      // 进程信号处理
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // 源码映射支持
      source_map_support: true,
      
      // 忽略文件
      ignore_watch: [
        'node_modules',
        'logs',
        '*.log',
        'dist',
        'coverage'
      ],
      
      // 高级配置
      node_args: [
        '--max-old-space-size=2048'
      ],
      
      // 集群配置
      instance_var: 'INSTANCE_ID',
      
      // 错误处理
      min_uptime: '10s',
      max_restarts: 10,
      
      // 启动等待时间
      wait_ready: true,
      listen_timeout: 8000,
      
      // 进程间通信
      disable_source_map_support: false
    },
    
    {
      // Telegram机器人服务 (可选)
      name: 'tron-energy-bot',
      script: 'api/services/telegram-bot.ts',
      interpreter: 'tsx',
      cwd: '/var/www/tron-energy-rental',
      
      // 单实例运行
      instances: 1,
      exec_mode: 'fork',
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Shanghai'
      },
      
      env_development: {
        NODE_ENV: 'development',
        TZ: 'Asia/Shanghai'
      },
      
      // 日志配置
      log_file: '/var/log/tron-energy-rental/bot-combined.log',
      out_file: '/var/log/tron-energy-rental/bot-out.log',
      error_file: '/var/log/tron-energy-rental/bot-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 进程管理
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 2000,
      
      // 错误处理
      min_uptime: '10s',
      max_restarts: 15,
      
      // 依赖API服务
      wait_ready: false,
      
      // 启用/禁用 (可通过环境变量控制)
      disable_source_map_support: false
    },
    
    {
      // 定时任务服务
      name: 'tron-energy-scheduler',
      script: 'api/services/scheduler.ts',
      interpreter: 'tsx',
      cwd: '/var/www/tron-energy-rental',
      
      // 单实例运行
      instances: 1,
      exec_mode: 'fork',
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Shanghai'
      },
      
      env_development: {
        NODE_ENV: 'development',
        TZ: 'Asia/Shanghai'
      },
      
      // 日志配置
      log_file: '/var/log/tron-energy-rental/scheduler-combined.log',
      out_file: '/var/log/tron-energy-rental/scheduler-out.log',
      error_file: '/var/log/tron-energy-rental/scheduler-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 进程管理
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      restart_delay: 5000,
      
      // 错误处理
      min_uptime: '30s',
      max_restarts: 10,
      
      // 启动延迟 (等待主服务启动)
      wait_ready: false,
      
      // 仅在生产环境启用
      env_production: {
        NODE_ENV: 'production',
        TZ: 'Asia/Shanghai',
        SCHEDULER_ENABLED: 'true'
      }
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/tron-energy-rental.git',
      path: '/var/www/tron-energy-rental',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      
      // SSH配置
      ssh_options: 'StrictHostKeyChecking=no',
      
      // 环境变量
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/tron-energy-rental.git',
      path: '/var/www/tron-energy-rental-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
      
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};

/**
 * PM2使用说明:
 * 
 * 启动应用:
 * pm2 start ecosystem.config.js
 * 
 * 启动特定环境:
 * pm2 start ecosystem.config.js --env production
 * 
 * 重启应用:
 * pm2 restart all
 * pm2 restart tron-energy-api
 * 
 * 停止应用:
 * pm2 stop all
 * pm2 stop tron-energy-api
 * 
 * 删除应用:
 * pm2 delete all
 * pm2 delete tron-energy-api
 * 
 * 查看状态:
 * pm2 status
 * pm2 list
 * 
 * 查看日志:
 * pm2 logs
 * pm2 logs tron-energy-api
 * 
 * 监控:
 * pm2 monit
 * 
 * 保存配置:
 * pm2 save
 * 
 * 开机自启:
 * pm2 startup
 * pm2 save
 * 
 * 部署:
 * pm2 deploy production setup
 * pm2 deploy production
 */
