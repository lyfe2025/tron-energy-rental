/**
 * 能量池选择器
 * 从 SingleDelegationProcessor.ts 分离出的能量池选择逻辑
 */

import { DatabaseService } from '../../../../database/DatabaseService'
import { logger } from '../../../../utils/logger'
import type { EnergyPoolAccount } from '../types/delegation.types'

export class EnergyPoolSelector {
  private databaseService: DatabaseService

  constructor() {
    this.databaseService = DatabaseService.getInstance()
  }

  /**
   * 使用智能选择逻辑选择能量池账户（参考能量闪兑的实现）
   * 检查实际可代理余额而不是数据库字段
   */
  async selectEnergyPoolAccountWithDelegationCheck(
    requiredEnergy: number, 
    networkId: string
  ): Promise<EnergyPoolAccount | null> {
    try {
      logger.info(`🔍 [能量池] 选择账户`, {
        需要能量: requiredEnergy,
        网络ID: networkId
      });

      // 按优先级查询能量池账户
      const result = await this.databaseService.query(
        `SELECT id, name, tron_address, private_key_encrypted, 
                status, priority, cost_per_energy
         FROM energy_pools
         WHERE status = 'active'
         ORDER BY priority DESC`,
        []
      );

      if (!result.rows || result.rows.length === 0) {
        logger.error(`❌ [智能选择] 未找到活跃的能量池账户`);
        return null;
      }

      logger.info(`📋 [能量池] 检查 ${result.rows.length} 个活跃账户`);

      // 依次检查每个账户的实际可代理余额
      for (const account of result.rows) {
        try {
          const delegatableEnergy = await this.checkDelegatableEnergy(
            account.tron_address, 
            networkId
          );
          
          if (delegatableEnergy >= requiredEnergy) {
            logger.info(`✅ [能量池] 选中账户: ${account.name || '未命名'}`, {
              '可代理能量': delegatableEnergy,
              '需要能量': requiredEnergy,
              '剩余': delegatableEnergy - requiredEnergy
            });
            
            return {
              ...account,
              address: account.tron_address,
              private_key: account.private_key_encrypted,
              delegatable_energy: delegatableEnergy
            };
          }
        } catch (error: any) {
          logger.error(`❌ [智能选择] 检查账户 ${account.tron_address} 可代理余额失败`, {
            错误: error.message,
            账户名称: account.name || '未命名'
          });
          continue;
        }
      }

      logger.error(`❌ [能量池] 所有账户余额不足`, {
        需要能量: requiredEnergy,
        检查账户数: result.rows.length
      });
      return null;
    } catch (error: any) {
      logger.error('❌ [智能选择] 选择能量池账户失败', { error: error.message });
      return null;
    }
  }

  /**
   * 检查账户可代理能量（与能量闪兑使用相同逻辑）
   */
  private async checkDelegatableEnergy(address: string, networkId: string): Promise<number> {
    try {
      // 1. 获取网络配置
      const networkResult = await this.databaseService.query(`
        SELECT id, name, rpc_url, network_type, is_active 
        FROM tron_networks 
        WHERE id = $1 AND is_active = true
      `, [networkId]);
      
      if (networkResult.rows.length === 0) {
        logger.error(`❌ [可代理余额] 网络不存在或未激活: ${networkId}`);
        return 0;
      }
      
      const network = networkResult.rows[0];
      
      // 2. 创建网络专用的TronService实例
      let networkTronService;
      try {
        const { TronService } = await import('../../../tron/TronService');
        networkTronService = new TronService({
          fullHost: network.rpc_url,
          privateKey: undefined,
          solidityNode: network.rpc_url,
          eventServer: network.rpc_url
        });
      } catch (error) {
        logger.error('❌ [可代理余额] 创建TronService失败:', error);
        return 0;
      }
      
      // 3. 获取账户资源信息
      const resourceResult = await networkTronService.getAccountResources(address);
      
      if (!resourceResult.success) {
        logger.error(`❌ [可代理余额] 获取账户资源失败: ${address}`, {
          错误: resourceResult.error,
          网络ID: networkId
        });
        return 0;
      }

      const resourceData = resourceResult.data;
      const energyInfo = resourceData.energy || {};
      
      // 🔥 重大修复：净可用能量就是可以代理出去的能量！
      const totalEnergyLimit = energyInfo.limit || 0;
      const usedEnergy = energyInfo.used || 0;
      const availableEnergy = Math.max(0, totalEnergyLimit - usedEnergy);
      
      // 获取质押信息（用于调试显示）
      const delegatedEnergyOut = energyInfo.delegatedOut || 0;
      const directEnergyStaked = energyInfo.directEnergyStaked_SUN || 0;
      const availableDelegateBalance = Math.max(0, directEnergyStaked - delegatedEnergyOut);
      const availableDelegateTrx = availableDelegateBalance / 1000000;

      logger.info(`✅ [能量池] 账户代理能力`, {
        '账户': `${address.substring(0, 8)}...`,
        '净可用能量': availableEnergy,
        '质押TRX': availableDelegateTrx.toFixed(2),
        网络ID: networkId
      });

      // 🔥 核心修复：直接返回净可用能量，这才是真正可以代理的！
      // 用户确认：净可用能量就是可以代理出去的能量
      return availableEnergy;
    } catch (error: any) {
      logger.error(`❌ [可代理余额] 检查地址 ${address} 可代理余额失败`, {
        错误: error.message,
        网络ID: networkId
      });
      return 0;
    }
  }
}
