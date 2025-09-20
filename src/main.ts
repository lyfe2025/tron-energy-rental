import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

// 全局错误处理 - 忽略 Chrome 扩展相关错误
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message.includes('runtime.lastError') || 
        event.message.includes('message channel closed')) {
      event.preventDefault()
      console.warn('忽略浏览器扩展相关错误:', event.message)
      return false
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('runtime.lastError') ||
        event.reason?.message?.includes('message channel closed')) {
      event.preventDefault()
      console.warn('忽略浏览器扩展相关Promise错误:', event.reason?.message)
      return false
    }
  })
}

const app = createApp(App)
const pinia = createPinia()

// Vue 应用级错误处理
app.config.errorHandler = (err, instance, info) => {
  const errorMessage = err?.toString() || ''
  if (errorMessage.includes('runtime.lastError') || 
      errorMessage.includes('message channel closed')) {
    console.warn('忽略Vue中的浏览器扩展错误:', err)
    return
  }
  console.error('Vue错误:', err, info)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
