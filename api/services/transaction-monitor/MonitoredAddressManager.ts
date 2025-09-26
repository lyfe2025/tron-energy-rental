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
      this.logger.info('📋 开始加载监听地址配置...');
      
      // 清空现有地址
      this.monitoredAddresses.clear();
      this.logger.debug('🧹 已清空现有监听地址');

      // 从数据库获取所有激活的配置（包括能量闪租和笔数套餐，同时要求网络也激活）
      const query = `
        SELECT 
          CASE 
            WHEN pc.mode_type = 'energy_flash' THEN pc.config->>'payment_address'
            WHEN pc.mode_type = 'transaction_package' THEN pc.config->'order_config'->>'payment_address'
            ELSE NULL
          END as payment_address,
          pc.network_id,
          pc.mode_type,
          tn.name as network_name,
          tn.rpc_url,
          tn.api_key,
          tn.config,
          pc.is_active as config_active,
          tn.is_active as network_active
        FROM price_configs pc
        JOIN tron_networks tn ON pc.network_id = tn.id
        WHERE pc.mode_type IN ('energy_flash', 'transaction_package') 
          AND pc.is_active = true
          AND tn.is_active = true
          AND (
            (pc.mode_type = 'energy_flash' AND pc.config->>'payment_address' IS NOT NULL)
            OR 
            (pc.mode_type = 'transaction_package' AND pc.config->'order_config'->>'payment_address' IS NOT NULL)
          )
      `;

      this.logger.debug('🔍 执行数据库查询获取监听地址配置...');
      const result = await this.databaseService.query(query);
      this.logger.info(`📊 数据库查询完成，找到 ${result.rows.length} 条配置记录`);

      if (result.rows.length === 0) {
        this.logger.warn('⚠️ 数据库中没有找到任何激活的监听地址配置');
        this.logger.info('💡 请检查 price_configs 表中是否有激活的配置，以及对应的网络是否激活');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const row of result.rows) {
        const address = row.payment_address;
        const networkId = row.network_id;
        const modeType = row.mode_type;
        const networkName = row.network_name;
        const rpcUrl = row.rpc_url;
        const apiKey = row.api_key;
        const typeLabel = modeType === 'energy_flash' ? '能量闪租' : '笔数套餐';

        this.logger.debug(`🔧 处理配置: [${networkName}] [${typeLabel}] ${address}`, {
          networkId,
          modeType,
          configActive: row.config_active,
          networkActive: row.network_active,
          hasRpcUrl: !!rpcUrl,
          hasApiKey: !!apiKey
        });

        if (!address || !networkId) {
          this.logger.warn(`⚠️ 跳过无效配置: address=${address}, networkId=${networkId}, mode_type=${modeType}`);
          failCount++;
          continue;
        }

        try {
          const monitoredAddress = await this.createMonitoredAddress({
            address,
            networkId,
            networkName,
            rpcUrl,
            apiKey,
            modeType
          });

          if (monitoredAddress) {
            // 使用唯一键存储，避免同一地址被重复添加
            const key = `${networkId}_${address}_${modeType}`;
            this.monitoredAddresses.set(key, monitoredAddress);
            this.logger.info(`✅ [${networkName}] [${typeLabel}] 成功添加监听地址: ${address}`);
            successCount++;
          } else {
            this.logger.warn(`⚠️ [${networkName}] [${typeLabel}] 创建监听地址对象失败: ${address}`);
            failCount++;
          }
        } catch (error) {
          this.logger.error(`❌ [${networkName}] [${typeLabel}] 创建监听地址失败: ${address}`, {
            error: error.message,
            address,
            networkId,
            modeType
          });
          failCount++;
        }
      }

      this.logger.info(`🎉 监听地址加载完成: ${successCount} 成功, ${failCount} 失败`);
      if (successCount > 0) {
        this.logger.info(`📡 当前监听地址列表:`);
        for (const [key, addr] of this.monitoredAddresses.entries()) {
          const typeLabel = addr.modeType === 'energy_flash' ? '能量闪租' : '笔数套餐';
          this.logger.info(`  - [${addr.networkName}] [${typeLabel}] ${addr.address}`);
        }
      }
    } catch (error) {
      this.logger.error('❌ 加载监听地址失败:', error);
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
    modeType?: string;
  }): Promise<MonitoredAddress | null> {
    try {
      const { address, networkId, networkName, rpcUrl, apiKey, modeType } = config;

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
        modeType,
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
