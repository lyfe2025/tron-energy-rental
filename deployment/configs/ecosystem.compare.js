/**
 * PM2 执行模式对比示例
 * 展示不同模式的配置和使用场景
 */

module.exports = {
  apps: [
    // ====== Fork 模式示例 ======
    {
      name: 'tron-api-fork',
      script: './api/server.ts',
      interpreter: 'tsx',
      exec_mode: 'fork',
      instances: 2,
      
      // Fork模式配置
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        INSTANCE_TYPE: 'fork'
      },
      
      // 独立进程配置
      max_memory_restart: '512M',    // 单进程内存限制
      min_uptime: '10s',
      max_restarts: 10,
      
      // 日志配置
      error_file: './logs/fork-error.log',
      out_file: './logs/fork-out.log',
      merge_logs: false,             // 每个进程独立日志文件
      
      // 监控配置
      watch: false,
      ignore_watch: ['logs', 'node_modules']
    },
    
    // ====== Cluster 模式示例 ======
    {
      name: 'tron-api-cluster',
      script: './api/server.ts',
      interpreter: 'tsx',
      exec_mode: 'cluster',
      instances: 'max',              // 自动检测CPU核心数
      
      // Cluster模式配置
      env: {
        NODE_ENV: 'production',
        PORT: 3002,                  // 使用不同端口避免冲突
        INSTANCE_TYPE: 'cluster'
      },
      
      // 集群配置
      max_memory_restart: '1G',      // 集群可以使用更多内存
      instance_var: 'INSTANCE_ID',  // 实例ID环境变量
      
      // 负载均衡配置
      listen_timeout: 3000,         // 监听超时
      kill_timeout: 5000,           // 进程杀死超时
      
      // 日志配置
      error_file: './logs/cluster-error.log',
      out_file: './logs/cluster-out.log',
      merge_logs: true,              // 合并所有实例日志
      
      // 零停机配置
      wait_ready: true,              // 等待ready信号
      reload_delay: 1000,            // 重载延迟
      
      // 监控配置
      watch: false
    },
    
    // ====== 静态文件服务器 (Fork模式适合) ======
    {
      name: 'static-server',
      script: 'npx',
      args: ['serve', '-s', 'dist', '-l', '5173'],
      exec_mode: 'fork',             // 静态服务器用Fork模式
      instances: 1,                  // 通常只需要一个实例
      
      env: {
        NODE_ENV: 'production'
      },
      
      max_memory_restart: '200M',    // 静态服务器内存需求小
      error_file: './logs/static-error.log',
      out_file: './logs/static-out.log'
    },
    
    // ====== 数据处理任务 (Fork模式适合) ======
    {
      name: 'data-processor',
      script: './scripts/data-processor.js',
      exec_mode: 'fork',             // 后台任务用Fork模式
      instances: 1,                  // 避免重复处理
      
      // 定时任务配置
      cron_restart: '0 2 * * *',     // 每天凌晨2点重启
      
      env: {
        NODE_ENV: 'production',
        TASK_TYPE: 'data_processing'
      },
      
      // 资源配置
      max_memory_restart: '2G',      // 数据处理可能需要更多内存
      min_uptime: '60s',             // 最小运行时间长一些
      max_restarts: 3                // 限制重启次数
    }
  ]
};
