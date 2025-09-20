/**
 * TRON官方代理资源API处理器
 * 用于获取更精确的代理给他人和他人代理给自己数据
 */

import { TronGridApiClient } from '../../../providers/tron-grid/TronGridApiClient';
import { TronGridErrorHandler } from '../../../providers/tron-grid/TronGridErrorHandler';
import { TronGridValidator } from '../../../providers/tron-grid/TronGridValidator';
import type { ServiceResponse } from '../../../types/staking.types';

export interface DelegatedResourceRecord {
  from: string;           // 发送方地址
  to: string;            // 接收方地址
  balance: number;       // 代理数量（单位：sun）
  resource: string;      // 资源类型（ENERGY/BANDWIDTH）
  expireTime: number;    // 到期时间
}

export interface DelegatedResourceResponse {
  delegatedResource: DelegatedResourceRecord[];
  total: number;
}

export interface DelegatedResourceAccountIndex {
  account: string;       // 账户地址
  fromAccounts: string[]; // 代理方账户列表
  toAccounts: string[];   // 接收方账户列表
}

export class DelegateResourceAPIHandler {
  constructor(
    private readonly apiClient: TronGridApiClient,
    private readonly errorHandler: TronGridErrorHandler,
    private readonly validator: TronGridValidator
  ) {}

  /**
   * 获取代理给他人的资源（当前账户作为代理方）
   * 对应TRON官方API: getDelegatedResourceV2
   */
  async getDelegatedResourcesOut(
    fromAddress: string,
    toAddress?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResponse<DelegatedResourceResponse>> {
    try {
      console.log(`[DelegateResourceAPI] 🔍 获取代理给他人资源: ${fromAddress}${toAddress ? ` → ${toAddress}` : ''}`);
      
      // 验证地址
      const addressValidation = this.errorHandler.validateTronAddress(fromAddress);
      if (!addressValidation.isValid) {
        return {
          success: false,
          error: `Invalid from address: ${fromAddress}`,
          data: { delegatedResource: [], total: 0 }
        };
      }

      // 使用TRON官方API格式: POST /wallet/getdelegatedresourcev2
      const requestBody: any = {
        fromAddress: fromAddress,
        visible: true
      };
      
      if (toAddress) {
        requestBody.toAddress = toAddress;
      }

      console.log(`[DelegateResourceAPI] 🔍 调用TRON官方API:`, {
        endpoint: '/wallet/getdelegatedresourcev2',
        requestBody
      });

      return this.errorHandler.handleApiCall(
        () => this.apiClient.postRequest('/wallet/getdelegatedresourcev2', requestBody),
        '获取代理给他人资源',
        async (response) => {
          const data = await response.json();
          
          console.log(`[DelegateResourceAPI] 🔍 代理给他人API响应:`, {
            success: data.success !== false,
            dataType: typeof data.delegatedResource,
            hasData: !!data.delegatedResource,
            arrayLength: Array.isArray(data.delegatedResource) ? data.delegatedResource.length : 'N/A',
            rawResponse: data
          });

          // TRON官方API返回格式: { delegatedResource: [...], total: number }
          const delegatedResource = this.parseDelegatedResources(data.delegatedResource || []);
          
          return {
            delegatedResource: delegatedResource.slice(offset, offset + limit),
            total: data.total || delegatedResource.length
          };
        },
        { delegatedResource: [], total: 0 }
      );
    } catch (error: any) {
      return this.errorHandler.handleException(error, '获取代理给他人资源', { delegatedResource: [], total: 0 });
    }
  }

  /**
   * 获取他人代理给自己的资源（当前账户作为接收方）
   * 对应TRON官方API: getDelegatedResourceAccountIndexV2
   */
  async getDelegatedResourcesIn(
    toAddress: string,
    fromAddress?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ServiceResponse<DelegatedResourceResponse>> {
    try {
      console.log(`[DelegateResourceAPI] 🔍 获取他人代理给自己资源: ${toAddress}${fromAddress ? ` ← ${fromAddress}` : ''}`);
      
      // 验证地址
      const addressValidation = this.errorHandler.validateTronAddress(toAddress);
      if (!addressValidation.isValid) {
        return {
          success: false,
          error: `Invalid to address: ${toAddress}`,
          data: { delegatedResource: [], total: 0 }
        };
      }

      // 首先获取账户索引
      const indexResult = await this.getDelegatedResourceAccountIndex(toAddress);
      if (!indexResult.success || !indexResult.data) {
        return {
          success: true,
          data: { delegatedResource: [], total: 0 }
        };
      }

      // 获取详细的代理资源信息
      const delegatedResources: DelegatedResourceRecord[] = [];
      const fromAccounts = fromAddress ? [fromAddress] : indexResult.data.fromAccounts;

      for (const from of fromAccounts.slice(0, Math.min(fromAccounts.length, 10))) {
        const resourceResult = await this.getDelegatedResourcesOut(from, toAddress, 200);
        if (resourceResult.success && resourceResult.data) {
          delegatedResources.push(...resourceResult.data.delegatedResource);
        }
      }

      console.log(`[DelegateResourceAPI] 🔍 他人代理给自己汇总: ${delegatedResources.length} 条记录`);

      return {
        success: true,
        data: {
          delegatedResource: delegatedResources.slice(offset, offset + limit),
          total: delegatedResources.length
        }
      };
    } catch (error: any) {
      return this.errorHandler.handleException(error, '获取他人代理给自己资源', { delegatedResource: [], total: 0 });
    }
  }

  /**
   * 获取账户的代理资源索引
   * 返回该账户的所有代理方和接收方列表
   */
  private async getDelegatedResourceAccountIndex(
    address: string
  ): Promise<ServiceResponse<DelegatedResourceAccountIndex>> {
    try {
      // 使用TRON官方API格式: POST /wallet/getdelegatedresourceaccountindexv2
      const requestBody: any = {
        value: address,
        visible: true
      };

      console.log(`[DelegateResourceAPI] 🔍 调用TRON官方索引API:`, {
        endpoint: '/wallet/getdelegatedresourceaccountindexv2',
        requestBody
      });
      
      return this.errorHandler.handleApiCall(
        () => this.apiClient.postRequest('/wallet/getdelegatedresourceaccountindexv2', requestBody),
        '获取代理资源账户索引',
        async (response) => {
          const data = await response.json();
          
          console.log(`[DelegateResourceAPI] 🔍 代理索引API响应:`, {
            success: data.success !== false,
            hasAccount: !!data.account,
            fromLength: data.fromAccounts?.length || 0,
            toLength: data.toAccounts?.length || 0,
            rawResponse: data
          });
          
          return {
            account: data.account || address,
            fromAccounts: data.fromAccounts || [],
            toAccounts: data.toAccounts || []
          };
        },
        { account: address, fromAccounts: [], toAccounts: [] }
      );
    } catch (error: any) {
      return this.errorHandler.handleException(
        error, 
        '获取代理资源账户索引', 
        { account: address, fromAccounts: [], toAccounts: [] }
      );
    }
  }

  /**
   * 解析代理资源数据
   */
  private parseDelegatedResources(rawData: any[]): DelegatedResourceRecord[] {
    if (!Array.isArray(rawData)) {
      console.warn(`[DelegateResourceAPI] ⚠️ 期望数组格式，实际获得:`, typeof rawData);
      return [];
    }

    return rawData.map(item => ({
      from: item.from || '',
      to: item.to || '',
      balance: parseInt(item.balance) || 0,
      resource: item.resource === 0 ? 'BANDWIDTH' : 'ENERGY', // TRON中0=BANDWIDTH, 1=ENERGY
      expireTime: item.expire_time || 0
    }));
  }

  /**
   * 转换为标准的代理记录格式
   */
  convertToStandardFormat(
    resources: DelegatedResourceRecord[], 
    direction: 'in' | 'out'
  ): any[] {
    return resources.map(resource => ({
      id: `${resource.from}-${resource.to}-${resource.balance}-${resource.resource}`,
      operation_type: 'delegate',
      amount: Math.floor(resource.balance / 1000000), // 转换SUN到TRX
      resource_type: resource.resource,
      status: 'success', // 通过API获取的都是已成功的代理
      created_at: new Date(resource.expireTime * 1000).toISOString(),
      transaction_id: '', // API方式无法获取具体交易ID
      from_address: resource.from,
      to_address: resource.to,
      pool_id: '',
      address: direction === 'out' ? resource.from : resource.to,
      block_number: 0,
      fee: 0
    }));
  }
}
