import axios, { type AxiosInstance } from 'axios';

// API基础配置 - 支持同服务器部署
const getApiBaseUrl = () => {
  // 使用window对象来获取环境变量，避免TypeScript编译错误
  if (typeof window !== 'undefined' && (window as any).__VITE_ENV__) {
    return (window as any).__VITE_ENV__.VITE_API_URL || '';
  }
  
  // 优化：支持同服务器部署
  // 如果 VITE_API_URL 明确设置为localhost，说明是同服务器部署，使用相对路径
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.includes('localhost')) {
    return ''; // 使用相对路径，由nginx代理
  }
  
  // 默认配置：开发环境用相对路径，生产环境用localhost（向后兼容）
  return process.env.NODE_ENV === 'development' ? '' : 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 增加前端请求超时时间到60秒，给后端更多时间处理
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
      data: error.response?.data,
      code: error.code,
      message: error.message
    });
    
    // 超时错误处理
    if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) {
      console.error('🔍 [API Client] 请求超时:', {
        code: error.code,
        message: error.message,
        url: error.config?.url,
        timeout: error.config?.timeout
      });
      
      // 添加友好的错误信息，针对机器人更新操作给出更具体的指导
      if (error.config?.url?.includes('/api/bots/')) {
        error.friendlyMessage = '机器人更新操作超时。数据库更新可能已完成，但与Telegram的同步可能因网络问题失败。请刷新页面查看最新状态或检查Telegram API连接。';
        
        // 触发建议检查连接的事件
        window.dispatchEvent(new CustomEvent('api:suggest_connectivity_check', {
          detail: {
            reason: 'bot_update_timeout',
            message: '建议检查Telegram API连接状态'
          }
        }));
      } else {
        error.friendlyMessage = '请求超时，操作可能需要更长时间完成。请稍后再试或检查网络连接。';
      }
      
      // 触发超时事件
      window.dispatchEvent(new CustomEvent('api:request_timeout', {
        detail: {
          code: error.code,
          message: '请求超时，请稍后重试',
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        }
      }));
      
      return Promise.reject(error);
    }

    // 网络连接错误处理（后端服务未启动或无法连接）
    if (!error.response && (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error'))) {
      console.error('🔍 [API Client] 后端服务连接失败:', {
        code: error.code,
        message: error.message,
        url: error.config?.url
      });
      
      // 添加友好的错误信息
      error.friendlyMessage = '无法连接到后端服务，请检查服务是否正常运行';
      
      // 触发后端服务不可用事件
      window.dispatchEvent(new CustomEvent('api:backend_unavailable', {
        detail: {
          code: error.code,
          message: '后端服务暂时不可用，请稍后重试',
          url: error.config?.url,
          method: error.config?.method
        }
      }));
      
      return Promise.reject(error);
    }
    
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
    } else if (error.response?.status === 400) {
      // 客户端请求错误（业务逻辑错误）
      const clientMessage = error.response?.data?.message || error.response?.data?.error || error.response?.data?.details || '请求参数错误';
      console.warn('🔍 [API Client] 客户端错误:', {
        url: error.config?.url,
        method: error.config?.method,
        message: clientMessage,
        data: error.response?.data
      });
      
      // 为错误对象添加友好的错误信息
      error.friendlyMessage = clientMessage;
    } else if (error.response?.status === 500) {
      // 服务器内部错误处理
      const serverMessage = error.response?.data?.details || error.response?.data?.message || error.response?.data?.error || '服务器内部错误';
      console.error('🔍 [API Client] 服务器错误:', {
        url: error.config?.url,
        method: error.config?.method,
        message: serverMessage,
        data: error.response?.data
      });
      
      // 为错误对象添加友好的错误信息
      error.friendlyMessage = serverMessage;
      
      // 触发服务器错误事件，供全局错误处理使用
      window.dispatchEvent(new CustomEvent('api:server_error', {
        detail: {
          status: 500,
          message: serverMessage,
          url: error.config?.url,
          method: error.config?.method
        }
      }));
    }
    
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
