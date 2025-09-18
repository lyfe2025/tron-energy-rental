import { appendFileSync } from 'fs';
import type { ServiceResponse } from '../../types/staking.types.ts';

/**
 * TronGrid错误处理服务
 * 负责统一处理API错误和异常情况
 */
export class TronGridErrorHandler {
  /**
   * 处理HTTP响应错误
   */
  handleResponseError<T>(
    response: Response, 
    operation: string,
    fallbackData?: T
  ): ServiceResponse<T> {
    const error = `${operation}失败: ${response.status} ${response.statusText}`;
    console.warn(`[TronGridErrorHandler] ${error}`);
    
    return {
      success: false,
      error,
      ...(fallbackData !== undefined && { data: fallbackData })
    };
  }

  /**
   * 处理网络或其他异常错误
   */
  handleException<T>(
    error: any, 
    operation: string,
    fallbackData?: T
  ): ServiceResponse<T> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[TronGridErrorHandler] ${operation}失败:`, error);
    
    return {
      success: false,
      error: errorMessage,
      ...(fallbackData !== undefined && { data: fallbackData })
    };
  }

  /**
   * 处理API调用的通用错误包装
   */
  async handleApiCall<T>(
    apiCall: () => Promise<Response>,
    operation: string,
    processor: (response: Response) => Promise<T>,
    fallbackData?: T
  ): Promise<ServiceResponse<T>> {
    try {
      const response = await apiCall();
      
      if (response.ok) {
        const data = await processor(response);
        console.log(`[TronGridErrorHandler] ${operation}成功`);
        return {
          success: true,
          data
        };
      } else {
        return this.handleResponseError(response, operation, fallbackData);
      }
    } catch (error) {
      return this.handleException(error, operation, fallbackData);
    }
  }

  /**
   * 验证地址格式
   */
  validateTronAddress(address: string): { isValid: boolean; error?: string } {
    if (!address) {
      return { isValid: false, error: 'Address is required' };
    }
    
    // 检查Base58格式
    if (address.startsWith('T') && address.length === 34) {
      return { isValid: true };
    }
    
    // 检查Hex格式
    if (address.startsWith('41') && address.length === 42) {
      return { isValid: true };
    }
    
    return { 
      isValid: false, 
      error: 'Invalid TRON address format. Expected Base58 (34 chars starting with T) or Hex (42 chars starting with 41)' 
    };
  }

  /**
   * 验证网络配置
   */
  validateNetworkConfig(config: any): { isValid: boolean; error?: string } {
    if (!config) {
      return { isValid: false, error: 'Network configuration is required' };
    }
    
    if (!config.rpc_url) {
      return { isValid: false, error: 'RPC URL is required in network configuration' };
    }
    
    try {
      new URL(config.rpc_url);
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid RPC URL format' };
    }
  }

  /**
   * 记录调试信息到文件
   */
  writeDebugLog(content: string): void {
    try {
      const timestamp = new Date().toISOString();
      appendFileSync('/tmp/tron-debug.log', `[${timestamp}] ${content}\n`);
    } catch (error) {
      console.warn('[TronGridErrorHandler] 写入调试日志失败:', error);
    }
  }

  /**
   * 创建标准的空数据响应
   */
  createEmptyResponse<T>(fallbackData: T): ServiceResponse<T> {
    return {
      success: true,
      data: fallbackData
    };
  }

  /**
   * 检查响应数据的有效性
   */
  validateResponseData(data: any, requiredFields: string[] = []): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    return requiredFields.every(field => {
      const hasField = data.hasOwnProperty(field);
      if (!hasField) {
        console.warn(`[TronGridErrorHandler] 响应数据缺少必需字段: ${field}`);
      }
      return hasField;
    });
  }
}
