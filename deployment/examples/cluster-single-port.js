// Cluster模式多实例配置示例 - 共享同一端口
module.exports = {
  apps: [
    {
      name: 'api-cluster',
      script: './api/server.ts',
      interpreter: 'tsx',
      exec_mode: 'cluster',  // 关键：cluster模式
      instances: 4,          // 4个worker进程
      env: {
        NODE_ENV: 'production',
        PORT: 3001           // 所有worker共享端口3001！
      },
      
      // Cluster模式特有配置
      instance_var: 'INSTANCE_ID',
      wait_ready: true,
      listen_timeout: 3000,
      kill_timeout: 5000,
      reload_delay: 1000
    }
  ]
};

/*
Cluster模式架构：
Client → 端口3001 → Master进程 (负载均衡器)
                    ├── Worker 1 (INSTANCE_ID=0)
                    ├── Worker 2 (INSTANCE_ID=1) 
                    ├── Worker 3 (INSTANCE_ID=2)
                    └── Worker 4 (INSTANCE_ID=3)

优势：
✅ 只需要一个端口
✅ 内置负载均衡 
✅ 零停机重启
✅ 充分利用多核CPU
*/
