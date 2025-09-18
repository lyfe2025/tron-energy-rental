// vite.config.ts
import vue from "file:///Volumes/wwx/dev/TronResourceDev/tron-energy-rental/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vite@5.4.19_@types+node@22.18.0__vue@3.5.20_typescript@5.3.3_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import path from "path";
import { defineConfig, loadEnv } from "file:///Volumes/wwx/dev/TronResourceDev/tron-energy-rental/node_modules/.pnpm/vite@5.4.19_@types+node@22.18.0/node_modules/vite/dist/node/index.js";
import traeBadgePlugin from "file:///Volumes/wwx/dev/TronResourceDev/tron-energy-rental/node_modules/.pnpm/vite-plugin-trae-solo-badge@1.0.0_vite@5.4.19_@types+node@22.18.0_/node_modules/vite-plugin-trae-solo-badge/dist/vite-plugin.esm.js";
import VueDevTools from "file:///Volumes/wwx/dev/TronResourceDev/tron-energy-rental/node_modules/.pnpm/vite-plugin-vue-devtools@7.7.7_rollup@4.48.1_vite@5.4.19_@types+node@22.18.0__vue@3.5.20_typescript@5.3.3_/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
var __vite_injected_original_dirname = "/Volumes/wwx/dev/TronResourceDev/tron-energy-rental";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const enableDevTools = mode === "development" && env.VITE_VUE_DEVTOOLS !== "false";
  return {
    build: {
      sourcemap: mode === "development" ? true : "hidden"
    },
    plugins: [
      vue({
        // 官方推荐的 Vue 配置，支持 DevTools
        template: {
          compilerOptions: {
            // 开发模式下保留组件名称和调试信息
            isCustomElement: () => false
          }
        }
      }),
      // 根据环境变量控制 Vue DevTools 启用状态
      ...enableDevTools ? [VueDevTools({
        launchEditor: "code"
      })] : [],
      traeBadgePlugin({
        variant: "dark",
        position: "bottom-right",
        prodOnly: true,
        clickable: true,
        clickUrl: "https://www.trae.ai/solo?showJoin=1",
        autoTheme: true,
        autoThemeTarget: "#app"
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        // ✅ 定义 @ = src
        crypto: "crypto-browserify",
        stream: "stream-browserify",
        buffer: "buffer"
      }
    },
    define: {
      global: "globalThis"
    },
    optimizeDeps: {
      include: ["buffer", "crypto-browserify", "stream-browserify"]
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.log("proxy error", err);
            });
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log("Sending Request to the Target:", req.method, req.url);
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("Received Response from the Target:", proxyRes.statusCode, req.url);
            });
          }
        },
        "/uploads": {
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVm9sdW1lcy93d3gvZGV2L1Ryb25SZXNvdXJjZURldi90cm9uLWVuZXJneS1yZW50YWxcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Wb2x1bWVzL3d3eC9kZXYvVHJvblJlc291cmNlRGV2L3Ryb24tZW5lcmd5LXJlbnRhbC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVm9sdW1lcy93d3gvZGV2L1Ryb25SZXNvdXJjZURldi90cm9uLWVuZXJneS1yZW50YWwvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHRyYWVCYWRnZVBsdWdpbiBmcm9tICd2aXRlLXBsdWdpbi10cmFlLXNvbG8tYmFkZ2UnXG5pbXBvcnQgVnVlRGV2VG9vbHMgZnJvbSAndml0ZS1wbHVnaW4tdnVlLWRldnRvb2xzJ1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbi8vIFx1NjgzOVx1NjM2RSBWdWUgXHU1Qjk4XHU2NUI5XHU2NTg3XHU2ODYzXHU3Njg0XHU2M0E4XHU4MzUwXHU5MTREXHU3RjZFXHVGRjBDXHU2NTJGXHU2MzAxXHU3M0FGXHU1ODgzXHU1M0Q4XHU5MUNGXHU2M0E3XHU1MjM2XG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIC8vIFx1NTJBMFx1OEY3RFx1NzNBRlx1NTg4M1x1NTNEOFx1OTFDRlxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKVxuICBcbiAgLy8gXHU2OEMwXHU2N0U1XHU2NjJGXHU1NDI2XHU1NDJGXHU3NTI4IFZ1ZSBEZXZUb29sc1xuICBjb25zdCBlbmFibGVEZXZUb29scyA9IG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiYgZW52LlZJVEVfVlVFX0RFVlRPT0xTICE9PSAnZmFsc2UnXG4gIFxuICByZXR1cm4ge1xuICAgIGJ1aWxkOiB7XG4gICAgICBzb3VyY2VtYXA6IG1vZGUgPT09ICdkZXZlbG9wbWVudCcgPyB0cnVlIDogJ2hpZGRlbicsXG4gICAgfSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICB2dWUoe1xuICAgICAgICAvLyBcdTVCOThcdTY1QjlcdTYzQThcdTgzNTBcdTc2ODQgVnVlIFx1OTE0RFx1N0Y2RVx1RkYwQ1x1NjUyRlx1NjMwMSBEZXZUb29sc1xuICAgICAgICB0ZW1wbGF0ZToge1xuICAgICAgICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgICAgICAgLy8gXHU1RjAwXHU1M0QxXHU2QTIxXHU1RjBGXHU0RTBCXHU0RkREXHU3NTU5XHU3RUM0XHU0RUY2XHU1NDBEXHU3OUYwXHU1NDhDXHU4QzAzXHU4QkQ1XHU0RkUxXHU2MDZGXG4gICAgICAgICAgICBpc0N1c3RvbUVsZW1lbnQ6ICgpID0+IGZhbHNlLFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICAvLyBcdTY4MzlcdTYzNkVcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0ZcdTYzQTdcdTUyMzYgVnVlIERldlRvb2xzIFx1NTQyRlx1NzUyOFx1NzJCNlx1NjAwMVxuICAgICAgLi4uKGVuYWJsZURldlRvb2xzID8gW1Z1ZURldlRvb2xzKHtcbiAgICAgICAgbGF1bmNoRWRpdG9yOiAnY29kZSdcbiAgICAgIH0pXSA6IFtdKSxcbiAgICAgIHRyYWVCYWRnZVBsdWdpbih7XG4gICAgICAgIHZhcmlhbnQ6ICdkYXJrJyxcbiAgICAgICAgcG9zaXRpb246ICdib3R0b20tcmlnaHQnLFxuICAgICAgICBwcm9kT25seTogdHJ1ZSxcbiAgICAgICAgY2xpY2thYmxlOiB0cnVlLFxuICAgICAgICBjbGlja1VybDogJ2h0dHBzOi8vd3d3LnRyYWUuYWkvc29sbz9zaG93Sm9pbj0xJyxcbiAgICAgICAgYXV0b1RoZW1lOiB0cnVlLFxuICAgICAgICBhdXRvVGhlbWVUYXJnZXQ6ICcjYXBwJyxcbiAgICAgIH0pLFxuICAgIF0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSwgLy8gXHUyNzA1IFx1NUI5QVx1NEU0OSBAID0gc3JjXG4gICAgICAgIGNyeXB0bzogJ2NyeXB0by1icm93c2VyaWZ5JyxcbiAgICAgICAgc3RyZWFtOiAnc3RyZWFtLWJyb3dzZXJpZnknLFxuICAgICAgICBidWZmZXI6ICdidWZmZXInLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGRlZmluZToge1xuICAgICAgZ2xvYmFsOiAnZ2xvYmFsVGhpcycsXG4gICAgfSxcbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgIGluY2x1ZGU6IFsnYnVmZmVyJywgJ2NyeXB0by1icm93c2VyaWZ5JywgJ3N0cmVhbS1icm93c2VyaWZ5J10sXG4gICAgfSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIHByb3h5OiB7XG4gICAgICAgICcvYXBpJzoge1xuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgY29uZmlndXJlOiAocHJveHkpID0+IHtcbiAgICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Byb3h5IGVycm9yJywgZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKHByb3h5UmVxLCByZXEpID0+IHtcbiAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NlbmRpbmcgUmVxdWVzdCB0byB0aGUgVGFyZ2V0OicsIHJlcS5tZXRob2QsIHJlcS51cmwpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXMsIHJlcSkgPT4ge1xuICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUmVjZWl2ZWQgUmVzcG9uc2UgZnJvbSB0aGUgVGFyZ2V0OicsIHByb3h5UmVzLnN0YXR1c0NvZGUsIHJlcS51cmwpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgJy91cGxvYWRzJzoge1xuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTJVLE9BQU8sU0FBUztBQUMzVixPQUFPLFVBQVU7QUFDakIsU0FBUyxjQUFjLGVBQWU7QUFDdEMsT0FBTyxxQkFBcUI7QUFDNUIsT0FBTyxpQkFBaUI7QUFKeEIsSUFBTSxtQ0FBbUM7QUFRekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFFeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBRzNDLFFBQU0saUJBQWlCLFNBQVMsaUJBQWlCLElBQUksc0JBQXNCO0FBRTNFLFNBQU87QUFBQSxJQUNMLE9BQU87QUFBQSxNQUNMLFdBQVcsU0FBUyxnQkFBZ0IsT0FBTztBQUFBLElBQzdDO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxJQUFJO0FBQUE7QUFBQSxRQUVGLFVBQVU7QUFBQSxVQUNSLGlCQUFpQjtBQUFBO0FBQUEsWUFFZixpQkFBaUIsTUFBTTtBQUFBLFVBQ3pCO0FBQUEsUUFDRjtBQUFBLE1BQ0YsQ0FBQztBQUFBO0FBQUEsTUFFRCxHQUFJLGlCQUFpQixDQUFDLFlBQVk7QUFBQSxRQUNoQyxjQUFjO0FBQUEsTUFDaEIsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUFBLE1BQ1AsZ0JBQWdCO0FBQUEsUUFDZCxTQUFTO0FBQUEsUUFDVCxVQUFVO0FBQUEsUUFDVixVQUFVO0FBQUEsUUFDVixXQUFXO0FBQUEsUUFDWCxVQUFVO0FBQUEsUUFDVixXQUFXO0FBQUEsUUFDWCxpQkFBaUI7QUFBQSxNQUNuQixDQUFDO0FBQUEsSUFDSDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBO0FBQUEsUUFDcEMsUUFBUTtBQUFBLFFBQ1IsUUFBUTtBQUFBLFFBQ1IsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLFVBQVUscUJBQXFCLG1CQUFtQjtBQUFBLElBQzlEO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsVUFDUixXQUFXLENBQUMsVUFBVTtBQUNwQixrQkFBTSxHQUFHLFNBQVMsQ0FBQyxRQUFRO0FBRXpCLHNCQUFRLElBQUksZUFBZSxHQUFHO0FBQUEsWUFDaEMsQ0FBQztBQUNELGtCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsUUFBUTtBQUV0QyxzQkFBUSxJQUFJLGtDQUFrQyxJQUFJLFFBQVEsSUFBSSxHQUFHO0FBQUEsWUFDbkUsQ0FBQztBQUNELGtCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsUUFBUTtBQUV0QyxzQkFBUSxJQUFJLHNDQUFzQyxTQUFTLFlBQVksSUFBSSxHQUFHO0FBQUEsWUFDaEYsQ0FBQztBQUFBLFVBQ0g7QUFBQSxRQUNGO0FBQUEsUUFDQSxZQUFZO0FBQUEsVUFDVixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsUUFDVjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
