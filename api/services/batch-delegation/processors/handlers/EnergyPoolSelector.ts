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
      logger.info(`🔍 [智能选择] 查找可代理余额充足的能量池账户`, {
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

      logger.info(`📋 [智能选择] 找到 ${result.rows.length} 个活跃能量池，开始检查可代理余额`);

      // 依次检查每个账户的实际可代理余额
      for (const account of result.rows) {
        logger.info(`🔍 [智能选择] 检查账户: ${account.name || '未命名'} (${account.tron_address})`);
        
        try {
          const delegatableEnergy = await this.checkDelegatableEnergy(
            account.tron_address, 
            networkId
          );
          
          logger.info(`📊 [智能选择] 账户代理能力检查结果`, {
            '账户名称': account.name || '未命名',
            '地址': account.tron_address,
            '需要能量': requiredEnergy,
            '可代理能量': delegatableEnergy,
            '是否足够': delegatableEnergy >= requiredEnergy ? '✅ 足够' : '❌ 不足',
            '差额': delegatableEnergy - requiredEnergy
          });
          
          if (delegatableEnergy >= requiredEnergy) {
            logger.info(`✅ [智能选择] 选中具有足够可代理余额的账户: ${account.name || '未命名'}`);
            
            return {
              ...account,
              address: account.tron_address,
              private_key: account.private_key_encrypted,
              delegatable_energy: delegatableEnergy
            };
          } else {
            logger.warn(`⚠️ [智能选择] 账户可代理余额不足`, {
              需要: requiredEnergy,
              可代理: delegatableEnergy,
              缺少: requiredEnergy - delegatableEnergy
            });
          }
        } catch (error: any) {
          logger.error(`❌ [智能选择] 检查账户 ${account.tron_address} 可代理余额失败`, {
            错误: error.message,
            账户名称: account.name || '未命名'
          });
          continue;
        }
      }

      logger.error(`❌ [智能选择] 所有能量池账户的可代理余额都不足`, {
        需要能量: requiredEnergy,
        检查了账户数: result.rows.length
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
      
      // 获取能量相关数据
      const totalEnergyLimit = energyInfo.limit || 0;
      const usedEnergy = energyInfo.used || 0;
      const availableEnergy = Math.max(0, totalEnergyLimit - usedEnergy);
      
      // 🔧 关键：计算可代理余额（FreezeEnergyV2 balance）
      const delegatedEnergyOut = energyInfo.delegatedOut || 0;
      const totalStaked = energyInfo.totalStaked || 0;
      const availableDelegateBalance = Math.max(0, totalStaked - delegatedEnergyOut);
      const availableDelegateTrx = availableDelegateBalance / 1000000;

      // 转换为能量单位
      const energyPerTrx = 76.2;
      const maxDelegatableEnergy = Math.floor(availableDelegateTrx * energyPerTrx);
      
      logger.info(`🎯 [可代理余额] 账户 ${address} 代理能力分析`, {
        '可代理TRX余额': availableDelegateTrx.toFixed(6),
        '对应最大可代理能量': maxDelegatableEnergy,
        '当前可用能量': availableEnergy,
        '实际可代理能量': Math.min(availableEnergy, maxDelegatableEnergy)
      });

      // 🔧 修复：返回可代理余额对应的能量，这才是真正能代理的数量
      // 代理操作检查的是FreezeEnergyV2余额，不是可用能量
      return maxDelegatableEnergy;
    } catch (error: any) {
      logger.error(`❌ [可代理余额] 检查地址 ${address} 可代理余额失败`, {
        错误: error.message,
        网络ID: networkId
      });
      return 0;
    }
  }
}
