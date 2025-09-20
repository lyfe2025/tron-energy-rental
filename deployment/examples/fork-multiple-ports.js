// Fork模式多实例配置示例 - 需要多个端口
module.exports = {
  apps: [
    {
      name: 'api-instance-1',
      script: './api/server.ts',
      interpreter: 'tsx',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001  // 第一个实例端口
      }
    },
    {
      name: 'api-instance-2', 
      script: './api/server.ts',
      interpreter: 'tsx',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3002  // 第二个实例端口
      }
    },
    {
      name: 'api-instance-3',
      script: './api/server.ts', 
      interpreter: 'tsx',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3003  // 第三个实例端口
      }
    }
  ]
};

/*
Fork模式架构：
Client → Nginx (负载均衡器) → API实例1 (3001)
                            → API实例2 (3002)  
                            → API实例3 (3003)

需要配置Nginx负载均衡：
upstream api_servers {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    listen 80;
    location /api/ {
        proxy_pass http://api_servers;
    }
}
*/
