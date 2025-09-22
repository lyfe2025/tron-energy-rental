import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import VueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
// 根据 Vue 官方文档的推荐配置，支持环境变量控制
export default defineConfig(({ mode }) => {
  // 加载环境变量，但排除NODE_ENV让Vite自己管理
  const env = loadEnv(mode, process.cwd(), '')
  
  // 检查是否启用 Vue DevTools
  const enableDevTools = mode === 'development' && env.VITE_VUE_DEVTOOLS !== 'false'
  
  // 确定实际的NODE_ENV值：开发模式用development，否则用production
  const nodeEnv = mode === 'development' ? 'development' : 'production'
  
  return {
    // 修复 Vite NODE_ENV 冲突问题：明确设置 process.env.NODE_ENV
    define: {
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    },
    build: {
      sourcemap: mode === 'development' ? true : 'hidden',
    },
    plugins: [
      vue({
        // 官方推荐的 Vue 配置，支持 DevTools
        template: {
          compilerOptions: {
            // 开发模式下保留组件名称和调试信息
            isCustomElement: () => false,
          }
        }
      }),
      // 根据环境变量控制 Vue DevTools 启用状态
      ...(enableDevTools ? [VueDevTools({
        launchEditor: 'code',
        componentInspector: false, // 禁用组件检查器以减少错误
      })] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'), // ✅ 定义 @ = src
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        buffer: 'buffer',
      },
    },
    optimizeDeps: {
      include: ['buffer', 'crypto-browserify', 'stream-browserify'],
    },
    server: {
      host: process.env.VITE_HOST || '0.0.0.0',
      port: parseInt(process.env.VITE_PORT || '5173'),
      // 完全通过环境变量 VITE_ALLOWED_HOSTS 控制允许访问的主机
      allowedHosts: process.env.VITE_ALLOWED_HOSTS 
        ? process.env.VITE_ALLOWED_HOSTS.split(',').map(host => host.trim())
        : ['localhost', '127.0.0.1'], // 默认只允许本地访问
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, req, _res) => {
              // 只记录错误，不记录正常请求
              console.error(`[Proxy Error] ${req.method} ${req.url}:`, err.message);
            });
            
            // 开发环境可以通过环境变量启用详细日志
            if (process.env.VITE_PROXY_VERBOSE === 'true') {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                console.log(`[Proxy Request] ${req.method} ${req.url}`);
              });
              proxy.on('proxyRes', (proxyRes, req, _res) => {
                const status = proxyRes.statusCode || 0;
                const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'log';
                console[level](`[Proxy Response] ${req.method} ${req.url} - ${status}`);
              });
            }
          },
        },
        '/uploads': {
          target: process.env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
