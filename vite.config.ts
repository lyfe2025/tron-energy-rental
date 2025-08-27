import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import traeBadgePlugin from 'vite-plugin-trae-solo-badge'
import VueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
// 根据 Vue 官方文档的推荐配置，支持环境变量控制
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  // 检查是否启用 Vue DevTools
  const enableDevTools = mode === 'development' && env.VITE_VUE_DEVTOOLS !== 'false'
  
  return {
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
        launchEditor: 'code'
      })] : []),
      traeBadgePlugin({
        variant: 'dark',
        position: 'bottom-right',
        prodOnly: true,
        clickable: true,
        clickUrl: 'https://www.trae.ai/solo?showJoin=1',
        autoTheme: true,
        autoThemeTarget: '#app',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'), // ✅ 定义 @ = src
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        }
      }
    }
  }
})
