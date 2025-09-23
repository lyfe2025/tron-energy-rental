import { query } from '../database';

/**
 * 数据库API Key获取工具
 * 统一从数据库获取TRON网络的API Key，替代环境变量方式
 */
export class DatabaseApiKeyService {
  private static instance: DatabaseApiKeyService;
  private apiKeyCache: Map<string, { apiKey: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1分钟缓存

  private constructor() {
    // 私有构造函数，使用单例模式
  }

  public static getInstance(): DatabaseApiKeyService {
    if (!DatabaseApiKeyService.instance) {
      DatabaseApiKeyService.instance = new DatabaseApiKeyService();
    }
    return DatabaseApiKeyService.instance;
  }

  /**
   * 根据RPC URL获取对应网络的API Key
   */
  async getApiKeyByRpcUrl(rpcUrl: string): Promise<string | null> {
    const cacheKey = `rpc_${rpcUrl}`;
    
    // 检查缓存
    const cached = this.apiKeyCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.apiKey;
    }

    try {
      const queryStr = `
        SELECT api_key 
        FROM tron_networks 
        WHERE rpc_url = $1 AND is_active = true
        LIMIT 1
      `;
      
      const result = await query(queryStr, [rpcUrl]);
      
      if (result.rows.length > 0 && result.rows[0].api_key) {
        const apiKey = result.rows[0].api_key;
        
        // 缓存结果
        this.apiKeyCache.set(cacheKey, {
          apiKey,
          timestamp: Date.now()
        });
        
        return apiKey;
      }
      
      return null;
    } catch (error) {
      console.error('[DatabaseApiKeyService] 获取API Key失败:', error);
      return null;
    }
  }

  /**
   * 获取主网API Key
   */
  async getMainnetApiKey(): Promise<string | null> {
    return this.getApiKeyByRpcUrl('https://api.trongrid.io');
  }

  /**
   * 获取Shasta测试网API Key
   */
  async getShastaApiKey(): Promise<string | null> {
    return this.getApiKeyByRpcUrl('https://api.shasta.trongrid.io');
  }

  /**
   * 获取Nile测试网API Key
   */
  async getNileApiKey(): Promise<string | null> {
    return this.getApiKeyByRpcUrl('https://nile.trongrid.io');
  }

  /**
   * 根据网络类型获取API Key
   */
  async getApiKeyByNetworkType(networkType: 'mainnet' | 'testnet' = 'mainnet'): Promise<string | null> {
    const cacheKey = `type_${networkType}`;
    
    // 检查缓存
    const cached = this.apiKeyCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.apiKey;
    }

    try {
      const queryStr = `
        SELECT api_key 
        FROM tron_networks 
        WHERE network_type = $1 AND is_active = true
        ORDER BY priority DESC
        LIMIT 1
      `;
      
      const result = await query(queryStr, [networkType]);
      
      if (result.rows.length > 0 && result.rows[0].api_key) {
        const apiKey = result.rows[0].api_key;
        
        // 缓存结果
        this.apiKeyCache.set(cacheKey, {
          apiKey,
          timestamp: Date.now()
        });
        
        return apiKey;
      }
      
      return null;
    } catch (error) {
      console.error('[DatabaseApiKeyService] 根据网络类型获取API Key失败:', error);
      return null;
    }
  }

  /**
   * 获取默认API Key（优先级最高的激活网络）
   */
  async getDefaultApiKey(): Promise<string | null> {
    const cacheKey = 'default';
    
    // 检查缓存
    const cached = this.apiKeyCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.apiKey;
    }

    try {
      const queryStr = `
        SELECT api_key 
        FROM tron_networks 
        WHERE is_active = true AND api_key IS NOT NULL
        ORDER BY priority DESC, is_default DESC
        LIMIT 1
      `;
      
      const result = await query(queryStr);
      
      if (result.rows.length > 0 && result.rows[0].api_key) {
        const apiKey = result.rows[0].api_key;
        
        // 缓存结果
        this.apiKeyCache.set(cacheKey, {
          apiKey,
          timestamp: Date.now()
        });
        
        console.log('[DatabaseApiKeyService] ✅ 成功获取默认API Key:', apiKey.slice(0, 8) + '...' + apiKey.slice(-4));
        return apiKey;
      }
      
      console.warn('[DatabaseApiKeyService] ⚠️ 未找到可用的API Key');
      return null;
    } catch (error) {
      console.error('[DatabaseApiKeyService] 获取默认API Key失败:', error);
      return null;
    }
  }

  /**
   * 根据地址推断网络并获取对应API Key
   */
  async getApiKeyByAddress(address: string): Promise<string | null> {
    // 简单的网络推断逻辑，可以根据实际需求扩展
    // 这里默认返回主网API Key
    return this.getMainnetApiKey();
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.apiKeyCache.clear();
    console.log('[DatabaseApiKeyService] 缓存已清除');
  }

  /**
   * 获取TronGrid请求头（包含API Key）
   */
  async getTronGridHeaders(rpcUrl?: string): Promise<Record<string, string>> {
    let apiKey: string | null;
    
    if (rpcUrl) {
      apiKey = await this.getApiKeyByRpcUrl(rpcUrl);
    } else {
      apiKey = await this.getDefaultApiKey();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['TRON-PRO-API-KEY'] = apiKey;
      console.log('[DatabaseApiKeyService] 🔑 使用API Key:', apiKey.slice(0, 8) + '...' + apiKey.slice(-4), '发送到:', rpcUrl || '默认网络');
    } else {
      console.warn('[DatabaseApiKeyService] ⚠️ 未找到API Key，可能会触发速率限制');
    }

    return headers;
  }
}

// 导出单例实例
export const databaseApiKeyService = DatabaseApiKeyService.getInstance();

// 便捷函数
export async function getTronGridApiKey(rpcUrl?: string): Promise<string | null> {
  if (rpcUrl) {
    return databaseApiKeyService.getApiKeyByRpcUrl(rpcUrl);
  }
  return databaseApiKeyService.getDefaultApiKey();
}

export async function getTronGridHeaders(rpcUrl?: string): Promise<Record<string, string>> {
  return databaseApiKeyService.getTronGridHeaders(rpcUrl);
}
