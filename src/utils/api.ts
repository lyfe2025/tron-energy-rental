import axios from 'axios';

// 获取API基础URL - 与apiClient.ts保持一致
const getApiBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // 始终使用完整地址，除非明确设置为使用代理
  if (apiUrl) {
    return apiUrl + '/api';
  }
  
  // 默认地址
  return 'http://localhost:3001/api';
};

// 创建 axios 实例
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    

    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {

    
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // 未授权，清除 token 并跳转到登录页
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export { api };

