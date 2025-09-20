/**
 * PM2 生产环境配置文件
 * 用于宝塔面板部署的TRON能量租赁系统
 */

module.exports = {
  apps: [
    {
      name: 'tron-energy-api',
      script: './api/server.ts',
      interpreter: 'tsx',
      instances: 1, // 先用1个实例测试
      exec_mode: 'fork', // 先用fork模式
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NODE_OPTIONS: '--max-old-space-size=2048'
      },
      env_file: '.env.production',
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      
      // 重启配置
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '2G',
      
      // 监控配置
      watch: false,
      ignore_watch: [
        'logs',
        'node_modules',
        'uploads',
        'public',
        'dist',
        '.git'
      ],
      
      // 健康检查
      health_check_grace_period: 3000,
      health_check_interval: 30000,
      
      // 其他配置
      instance_var: 'INSTANCE_ID',
      combine_logs: true,
      merge_logs: true
    },
    
    // 前端静态文件服务器
    {
      name: 'tron-energy-frontend',
      script: 'npx',
      args: 'serve -s dist -l 5173',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production'
      },
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      
      // 重启配置
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      max_memory_restart: '512M',
      
      // 监控配置
      watch: false,
      ignore_watch: [
        'logs',
        'node_modules',
        'api',
        '.git'
      ]
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'root',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/tron-energy-rental.git',
      path: '/www/wwwroot/tron-energy-rental',
      
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
