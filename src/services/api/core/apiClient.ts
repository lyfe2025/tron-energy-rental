import axios, { type AxiosInstance } from 'axios';

// API基础配置 - 兼容TypeScript编译
const getApiBaseUrl = () => {
  // 使用window对象来获取环境变量，避免TypeScript编译错误
  if (typeof window !== 'undefined' && (window as any).__VITE_ENV__) {
    return (window as any).__VITE_ENV__.VITE_API_BASE_URL || '';
  }
  // 默认配置
  return process.env.NODE_ENV === 'development' ? '' : 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
});

console.log('🔍 [API Client] 初始化配置:', {
  baseURL: API_BASE_URL,
  isDev: process.env.NODE_ENV === 'development',
  nodeEnv: process.env.NODE_ENV
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    console.log('🔍 [API Client] 请求拦截器:', {
      url: config.url,
      token: token ? '存在' : '不存在',
      method: config.method,
      baseURL: config.baseURL
    });
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('🔍 [API Client] 请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误和token过期
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('🔍 [API Client] 响应拦截器错误:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      
      // 触发自定义事件，让应用知道需要处理认证问题
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    } else if (error.response?.status === 403) {
      // 检查是否是会话失效（被强制下线）
      const message = error.response?.data?.message || '';
      if (message.includes('会话已失效') || message.includes('请重新登录')) {
        // 被强制下线，清除本地存储
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        
        // 触发被强制下线事件
        window.dispatchEvent(new CustomEvent('auth:forced_logout', {
          detail: {
            message: message,
            reason: 'forced_logout'
          }
        }));
      }
    }
    
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
