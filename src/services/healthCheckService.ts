/**
 * 后端服务健康检查服务
 * 用于检测后端服务的可用性和响应状态
 */
import { apiClient } from './api/core/apiClient';

export interface HealthCheckResult {
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
  timestamp: number;
}

export interface HealthCheckOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * 检查后端服务健康状态
 */
export async function checkBackendHealth(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
  const {
    timeout = 5000,
    retries = 3,
    retryDelay = 1000
  } = options;

  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🏥 [Health Check] 第${attempt}次健康检查开始...`);
      
      // 使用一个简单的健康检查端点
      // 如果没有专门的健康检查端点，使用一个轻量级的API作为替代
      let response;
      try {
        // 首先尝试专门的健康检查端点
        response = await apiClient.get('/api/health', {
          timeout,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
      } catch (healthError: any) {
        console.log('🏥 [Health Check] /api/health 端点不可用，尝试备用端点...');
        
        // 如果健康检查端点不存在，尝试使用认证状态检查作为备用
        response = await apiClient.get('/api/auth/status', {
          timeout,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
      }
      
      const responseTime = Date.now() - startTime;
      
      console.log('🏥 [Health Check] 健康检查成功:', {
        status: response.status,
        responseTime: `${responseTime}ms`,
        attempt
      });
      
      return {
        isHealthy: true,
        responseTime,
        timestamp: Date.now()
      };
      
    } catch (error: any) {
      console.warn(`🏥 [Health Check] 第${attempt}次检查失败:`, {
        error: error.message,
        code: error.code,
        attempt,
        retriesLeft: retries - attempt
      });
      
      // 如果是最后一次尝试，返回失败结果
      if (attempt === retries) {
        const responseTime = Date.now() - startTime;
        
        return {
          isHealthy: false,
          responseTime,
          error: error.friendlyMessage || error.message || '后端服务连接失败',
          timestamp: Date.now()
        };
      }
      
      // 等待后重试
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // 这里不应该执行到，但为了类型安全
  return {
    isHealthy: false,
    error: '健康检查超时',
    timestamp: Date.now()
  };
}

/**
 * 快速健康检查（用于定期检查）
 */
export async function quickHealthCheck(): Promise<boolean> {
  try {
    const result = await checkBackendHealth({
      timeout: 3000,
      retries: 1
    });
    return result.isHealthy;
  } catch (error) {
    console.warn('🏥 [Quick Health Check] 快速检查失败:', error);
    return false;
  }
}

/**
 * 启动定期健康检查
 */
export function startPeriodicHealthCheck(
  callback: (result: HealthCheckResult) => void,
  interval: number = 30000 // 默认30秒检查一次
): () => void {
  console.log('🏥 [Health Check] 启动定期健康检查, 间隔:', interval + 'ms');
  
  let isActive = true;
  
  const performCheck = async () => {
    if (!isActive) return;
    
    try {
      const result = await checkBackendHealth({
        timeout: 5000,
        retries: 2,
        retryDelay: 1000
      });
      
      if (isActive) {
        callback(result);
      }
    } catch (error) {
      console.error('🏥 [Health Check] 定期检查异常:', error);
      
      if (isActive) {
        callback({
          isHealthy: false,
          error: '健康检查异常',
          timestamp: Date.now()
        });
      }
    }
    
    // 安排下次检查
    if (isActive) {
      setTimeout(performCheck, interval);
    }
  };
  
  // 立即执行第一次检查
  performCheck();
  
  // 返回停止函数
  return () => {
    console.log('🏥 [Health Check] 停止定期健康检查');
    isActive = false;
  };
}

/**
 * 等待后端服务可用
 */
export async function waitForBackendReady(
  maxWaitTime: number = 60000, // 最大等待时间 60秒
  checkInterval: number = 2000  // 检查间隔 2秒
): Promise<boolean> {
  console.log('🏥 [Health Check] 等待后端服务就绪...');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const isHealthy = await quickHealthCheck();
    
    if (isHealthy) {
      console.log('🏥 [Health Check] 后端服务已就绪');
      return true;
    }
    
    console.log('🏥 [Health Check] 后端服务未就绪，等待中...');
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  console.warn('🏥 [Health Check] 等待后端服务超时');
  return false;
}

export default {
  checkBackendHealth,
  quickHealthCheck,
  startPeriodicHealthCheck,
  waitForBackendReady
};
