/**
 * PM2 优化配置 - 针对12核CPU系统
 * 基于TRON能量租赁系统的特点优化
 */

module.exports = {
  apps: [
    // ====== 后端API服务 - 推荐Cluster模式 ======
    {
      name: 'tron-energy-api',
      script: './api/server.ts',
      interpreter: 'tsx',
      exec_mode: 'cluster',      // 🔄 改为cluster模式
      instances: 8,              // 🎯 12核系统建议8个实例 (留4核给系统和其他服务)
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NODE_OPTIONS: '--max-old-space-size=2048'
      },
      env_file: '.env.production',
      
      // Cluster模式优化配置
      instance_var: 'INSTANCE_ID',    // 实例ID环境变量
      max_memory_restart: '1G',       // 每个实例1G内存限制
      listen_timeout: 3000,           // 监听超时
      kill_timeout: 5000,             // 进程终止超时
      wait_ready: true,               // 等待应用准备就绪
      reload_delay: 1000,             // 重载延迟，避免同时重启
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      merge_logs: true,               // cluster模式合并日志
      time: true,
      
      // 重启配置
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // 监控配置
      watch: false,
      ignore_watch: [
        'logs',
        'node_modules',
        'uploads',
        'public',
        'dist',
        '.git'
      ]
    },
    
    // ====== 前端静态服务器 - Fork模式更适合 ======
    {
      name: 'tron-energy-frontend',
      script: 'npx',
      args: ['serve', '-s', 'dist', '-l', '5173'],
      exec_mode: 'fork',             // 静态服务器用fork模式
      instances: 1,                  // 一个实例足够
      
      env: {
        NODE_ENV: 'production'
      },
      
      // 资源配置
      max_memory_restart: '256M',    // 静态服务器内存需求小
      min_uptime: '10s',
      max_restarts: 5,
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      
      // 重启配置
      autorestart: true,
      watch: false,
      ignore_watch: [
        'logs',
        'node_modules',
        'api',
        '.git'
      ]
    }
  ]
};
