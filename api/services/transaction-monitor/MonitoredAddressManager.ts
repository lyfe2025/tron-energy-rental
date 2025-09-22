/**
 * 监听地址管理器
 * 负责加载、管理和维护需要监听的地址
 */
import TronWeb from 'tronweb';
import { Logger } from 'winston';
import { DatabaseService } from '../../database/DatabaseService';
import { TronGridProvider } from '../tron/staking/providers/TronGridProvider';
import type { MonitoredAddress, NetworkConfig } from './types';

export class MonitoredAddressManager {
  private monitoredAddresses: Map<string, MonitoredAddress> = new Map();

  constructor(
    private logger: Logger,
    private databaseService: DatabaseService
  ) {}

  /**
   * 加载需要监听的地址
   */
  async loadMonitoredAddresses(): Promise<void> {
    try {
      // 清空现有地址
      this.monitoredAddresses.clear();

      // 从数据库获取所有激活的能量闪租配置（同时要求网络也激活）
      const query = `
        SELECT 
          pc.config->>'payment_address' as payment_address,
          pc.network_id,
          tn.name as network_name,
          tn.rpc_url,
          tn.api_key,
          tn.config
        FROM price_configs pc
        JOIN tron_networks tn ON pc.network_id = tn.id
        WHERE pc.mode_type = 'energy_flash' 
          AND pc.is_active = true
          AND tn.is_active = true
          AND pc.config->>'payment_address' IS NOT NULL
      `;

      const result = await this.databaseService.query(query);

      for (const row of result.rows) {
        const address = row.payment_address;
        const networkId = row.network_id;
        const networkName = row.network_name;
        const rpcUrl = row.rpc_url;
        const apiKey = row.api_key;

        if (!address || !networkId) {
          this.logger.warn(`跳过无效配置: address=${address}, networkId=${networkId}`);
          continue;
        }

        try {
          const monitoredAddress = await this.createMonitoredAddress({
            address,
            networkId,
            networkName,
            rpcUrl,
            apiKey
          });

          if (monitoredAddress) {
            this.monitoredAddresses.set(`${networkId}_${address}`, monitoredAddress);
            this.logger.info(`🌐 [${networkName}] 添加监听地址: ${address}`);
          }
        } catch (error) {
          this.logger.error(`❌ [${networkName}] 创建监听地址失败:`, error);
        }
      }
    } catch (error) {
      this.logger.error('加载监听地址失败:', error);
      throw error;
    }
  }

  /**
   * 创建监听地址对象
   */
  private async createMonitoredAddress(config: {
    address: string;
    networkId: string;
    networkName: string;
    rpcUrl: string;
    apiKey: string;
  }): Promise<MonitoredAddress | null> {
    try {
      const { address, networkId, networkName, rpcUrl, apiKey } = config;

      // 创建对应网络的TronWeb实例
      const tronWebInstance = new TronWeb.TronWeb({
        fullHost: rpcUrl,
        headers: { "TRON-PRO-API-KEY": apiKey || '' },
        privateKey: '01' // 临时私钥，仅用于查询
      });

      // 存储网络配置供后续使用
      (tronWebInstance as any)._rpcUrl = rpcUrl;
      (tronWebInstance as any)._apiKey = apiKey;

      // 验证地址格式
      if (!tronWebInstance.isAddress(address)) {
        this.logger.warn(`无效的TRON地址: ${address}`);
        return null;
      }

      // 创建TronGrid提供者用于现代API调用
      const networkConfig: NetworkConfig = {
        networkId,
        networkName,
        rpcUrl,
        apiKey: apiKey || '',
        isTestNet: networkName.toLowerCase().includes('test')
      };
      const tronGridProvider = new TronGridProvider(networkConfig, tronWebInstance);

      return {
        address,
        networkId,
        networkName,
        tronWebInstance,
        tronGridProvider
      };
    } catch (error) {
      this.logger.error(`创建监听地址对象失败:`, error);
      return null;
    }
  }

  /**
   * 重新加载监听地址（当配置更新时调用）
   */
  async reloadAddresses(): Promise<void> {
    this.logger.info('🔄 重新加载监听地址...');
    await this.loadMonitoredAddresses();
    this.logger.info(`✅ 重新加载完成，当前监听 ${this.monitoredAddresses.size} 个地址`);
  }

  /**
   * 获取所有监听地址
   */
  getAllAddresses(): Map<string, MonitoredAddress> {
    return this.monitoredAddresses;
  }

  /**
   * 清空监听地址
   */
  clear(): void {
    this.monitoredAddresses.clear();
  }

  /**
   * 获取监听地址数量
   */
  getAddressCount(): number {
    return this.monitoredAddresses.size;
  }
}
