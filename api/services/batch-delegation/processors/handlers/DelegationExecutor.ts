/**
 * 代理执行器
 * 从 SingleDelegationProcessor.ts 分离出的核心代理执行逻辑
 */

import { query } from '../../../../database'
import { logger } from '../../../../utils/logger'
import { TronService as TronServiceLegacy } from '../../../tron'
import { RecordLogger } from '../../utils/RecordLogger'
import type { DelegationParams, DelegationResult, EnergyPoolAccount } from '../types/delegation.types'

export class DelegationExecutor {
  private tronService: TronServiceLegacy
  private recordLogger: RecordLogger

  constructor(tronService: TronServiceLegacy) {
    this.tronService = tronService
    this.recordLogger = new RecordLogger()
  }

  /**
   * 执行能量代理操作
   */
  async executeDelegation(
    orderId: string,
    userAddress: string,
    energyPerTransaction: number,
    energyAccount: EnergyPoolAccount,
    order: any,
    transactionHash?: string
  ): Promise<DelegationResult> {
    try {
      // 1. 构建代理参数
      const delegationParams = this.buildDelegationParams(
        order,
        energyPerTransaction,
        energyAccount,
        userAddress
      )

      // 2. 记录使用的能量池账户到订单中
      await this.recordEnergyPoolUsage(orderId, energyAccount)

      // 3. 设置能量池账户私钥
      await this.setupEnergyPoolAccount(orderId, energyAccount)

      // 4. 代理前最终验证可代理余额
      logger.info(`🔍 [代理前验证] 对选中账户进行最终余额验证: ${energyAccount.tron_address}`, {
        orderId,
        需要能量: energyPerTransaction,
        网络ID: order.network_id
      });
      
      const finalDelegatableEnergy = await this.checkAccountDelegatableEnergy(
        energyAccount.tron_address, 
        order.network_id
      );
      
      if (finalDelegatableEnergy < energyPerTransaction) {
        logger.error(`❌ [代理前验证] 能量池余额不足`, {
          orderId,
          账户地址: energyAccount.tron_address,
          可代理能量: finalDelegatableEnergy,
          需要能量: energyPerTransaction,
          缺少能量: energyPerTransaction - finalDelegatableEnergy
        });
        
        return {
          success: false,
          message: `能量池可用余额不足: ${energyAccount.tron_address} 可代理${finalDelegatableEnergy}能量，需要${energyPerTransaction}能量`
        };
      }
      
      logger.info(`✅ [代理前验证] 余额验证通过`, {
        orderId,
        账户地址: energyAccount.tron_address,
        可代理能量: finalDelegatableEnergy,
        需要能量: energyPerTransaction,
        剩余能量: finalDelegatableEnergy - energyPerTransaction
      });

      let delegationResult: any
      try {
        // 5. 执行能量代理
        logger.info(`开始执行能量代理`, {
          orderId,
          delegationParams,
          energyAccount: energyAccount.tron_address
        })
        
        delegationResult = await this.tronService.delegateResource(delegationParams)
        
        logger.info(`能量代理执行完成`, {
          orderId,
          success: delegationResult?.success,
          txid: delegationResult?.txid,
          error: delegationResult?.error
        })

        if (!delegationResult?.success) {
          return {
            success: false,
            message: `Energy delegation failed: ${delegationResult?.error || 'Unknown delegation error'}`,
            details: delegationResult
          }
        }

        // 5. 记录能量使用日志（代理成功）
        if (delegationResult?.txid) {
          await this.recordLogger.recordEnergyUsage(
            orderId,
            userAddress,
            energyPerTransaction,
            delegationResult.txid
          )
          logger.info(`📝 [笔数套餐] 能量使用记录已保存`, {
            orderId,
            userAddress: userAddress.substring(0, 15) + '...',
            energyAmount: energyPerTransaction,
            delegationTxHash: delegationResult.txid.substring(0, 12) + '...',
            说明: '首次代理成功，已记录到energy_usage_logs表'
          })
        }

        return {
          success: true,
          message: 'Energy delegation completed successfully',
          orderId,
          delegationTxHash: delegationResult.txid,
          energyDelegated: energyPerTransaction
        }

      } catch (delegationError: any) {
        logger.error(`能量代理执行异常`, {
          orderId,
          userAddress,
          energyAccount: energyAccount.tron_address,
          error: delegationError.message,
          errorStack: delegationError.stack,
          errorName: delegationError.name,
          delegationParams,
          timestamp: new Date().toISOString()
        })
        
        return {
          success: false,
          message: `Energy delegation exception: ${delegationError.message}`,
          details: {
            error: delegationError.message,
            stack: delegationError.stack,
            params: delegationParams
          }
        }
      } finally {
        // 🔧 关键修复：确保无论成功失败都恢复默认私钥
        logger.info(`恢复默认私钥`, { orderId })
        await this.tronService.restoreDefaultPrivateKey()
      }

    } catch (error: any) {
      logger.error(`代理执行异常`, {
        orderId,
        userAddress,
        error: error.message
      })
      return {
        success: false,
        message: `Delegation execution error: ${error.message}`
      }
    }
  }

  /**
   * 构建代理参数
   */
  private buildDelegationParams(
    order: any,
    energyPerTransaction: number,
    energyAccount: EnergyPoolAccount,
    userAddress: string
  ): DelegationParams {
    if (order.order_type === 'transaction_package') {
      // 笔数套餐：使用永久代理（无期限）
      logger.info(`[笔数套餐] 使用永久代理模式`, {
        orderId: order.id,
        orderType: order.order_type,
        delegationType: '永久代理（无期限）'
      });
      
      // 🔧 修复：精确的能量到SUN单位换算，避免向上取整导致余额不足
      const energyPerTrx = 76.2; // 76.2 ENERGY per TRX
      const requiredTrx = energyPerTransaction / energyPerTrx; // 能量 → TRX
      // 使用精确的TRX数量，而不是向上取整，避免超出可代理余额
      const balanceInSun = Math.floor(requiredTrx * 1000000); // 精确转换为SUN，向下取整
      
      logger.info(`[笔数套餐] 能量单位换算`, {
        orderId: order.id,
        换算详情: {
          '能量数量': energyPerTransaction,
          '换算比例': `${energyPerTrx} ENERGY/TRX`,
          '理论需要TRX': requiredTrx.toFixed(6),
          '实际使用TRX': (balanceInSun / 1000000).toFixed(6) + ' (精确转换)',
          '转换为SUN': balanceInSun,
          '公式': `floor(${requiredTrx.toFixed(6)} × 1,000,000) = ${balanceInSun} SUN`,
          '修复说明': '🔧 避免向上取整导致余额不足'
        }
      });
      
      return {
        ownerAddress: energyAccount.tron_address,
        receiverAddress: userAddress,
        balance: balanceInSun,  // 🔧 修复：使用正确的SUN单位
        resource: 'ENERGY',
        lock: false,           // 永久代理：不锁定
        lockPeriod: undefined  // 永久代理：无期限
      };
    } else {
      // 能量闪租：使用限期代理（3天）
      const lockPeriod = 3; // 代理3天
      logger.info(`[能量闪租] 使用限期代理模式`, {
        orderId: order.id,
        orderType: order.order_type,
        delegationType: '限期代理',
        lockPeriod: `${lockPeriod}天`
      });
      
      // 🔧 修复：能量闪租也需要正确的单位换算，确保整数TRX
      const energyPerTrx = 76.2; // 76.2 ENERGY per TRX
      const requiredTrx = energyPerTransaction / energyPerTrx; // 能量 → TRX
      const wholeTrx = Math.ceil(requiredTrx); // 向上取整为整数TRX
      const balanceInSun = wholeTrx * 1000000; // 整数TRX → SUN
      
      logger.info(`[能量闪租] 能量单位换算`, {
        orderId: order.id,
        换算详情: {
          '能量数量': energyPerTransaction,
          '换算比例': `${energyPerTrx} ENERGY/TRX`,
          '理论需要TRX': requiredTrx.toFixed(6),
          '实际使用TRX': wholeTrx + ' (向上取整)',
          '转换为SUN': balanceInSun,
          '公式': `ceil(${requiredTrx.toFixed(3)}) × 1,000,000 = ${balanceInSun} SUN`,
          '整数TRX要求': '✅ 满足TRON协议要求'
        }
      });
      
      return {
        ownerAddress: energyAccount.tron_address,
        receiverAddress: userAddress,
        balance: balanceInSun,  // 🔧 修复：使用正确的SUN单位
        resource: 'ENERGY',
        lock: true,        // 限期代理：锁定
        lockPeriod: lockPeriod * 24  // 转换为小时数
      };
    }
  }

  /**
   * 记录能量池账户使用
   */
  private async recordEnergyPoolUsage(orderId: string, energyAccount: EnergyPoolAccount): Promise<void> {
    try {
      await query(
        `UPDATE orders SET 
           energy_pool_account_used = $1,
           updated_at = NOW()
         WHERE id = $2`,
        [energyAccount.tron_address, orderId]
      );
      
      logger.info(`📝 [笔数套餐] 已记录能量池账户使用`, {
        orderId,
        energyPoolAccount: energyAccount.tron_address,
        energyPoolId: energyAccount.id
      });
    } catch (updateError: any) {
      logger.warn(`⚠️ [笔数套餐] 无法记录能量池账户使用`, {
        orderId,
        energyPoolAccount: energyAccount.tron_address,
        updateError: updateError.message
      });
      // 继续执行，不因为记录失败而中断代理
    }
  }

  /**
   * 设置能量池账户私钥
   */
  private async setupEnergyPoolAccount(orderId: string, energyAccount: EnergyPoolAccount): Promise<void> {
    logger.info(`设置能量池账户私钥进行代理`, {
      orderId,
      energyAccountId: energyAccount.id,
      energyAccountAddress: energyAccount.tron_address
    })
    
    // 🔧 关键修复：设置正确的能量池账户私钥
    await this.tronService.setPoolAccountPrivateKey(energyAccount.id)
  }

  /**
   * 检查账户可代理能量（与FlashRentHandler使用相同逻辑）
   */
  private async checkAccountDelegatableEnergy(address: string, networkId: string): Promise<number> {
    try {
      // 1. 获取网络配置
      const networkResult = await query(`
        SELECT id, name, rpc_url, network_type, is_active 
        FROM tron_networks 
        WHERE id = $1 AND is_active = true
      `, [networkId]);
      
      if (networkResult.rows.length === 0) {
        logger.error(`❌ [可代理余额检查] 网络不存在或未激活: ${networkId}`);
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
        logger.error('❌ [可代理余额检查] 创建TronService失败:', error);
        return 0;
      }
      
      // 3. 获取账户资源信息
      const resourceResult = await networkTronService.getAccountResources(address);
      
      if (!resourceResult.success) {
        logger.error(`❌ [可代理余额检查] 获取账户资源失败: ${address}`, {
          错误: resourceResult.error,
          网络ID: networkId
        });
        return 0;
      }

      const resourceData = resourceResult.data;
      const energyInfo = resourceData.energy || {};
      
      // 🔧 关键：计算可代理余额（FreezeEnergyV2 balance）
      const delegatedEnergyOut = energyInfo.delegatedOut || 0;
      const totalStaked = energyInfo.totalStaked || 0;
      const availableDelegateBalance = Math.max(0, totalStaked - delegatedEnergyOut);
      const availableDelegateTrx = availableDelegateBalance / 1000000;

      // 转换为能量单位
      const energyPerTrx = 76.2;
      const maxDelegatableEnergy = Math.floor(availableDelegateTrx * energyPerTrx);
      
      logger.info(`🎯 [可代理余额检查] 账户 ${address} 代理能力分析`, {
        '可代理TRX余额': availableDelegateTrx.toFixed(6),
        '对应最大可代理能量': maxDelegatableEnergy,
        '总质押TRX': (totalStaked / 1000000).toFixed(6),
        '已代理TRX': (delegatedEnergyOut / 1000000).toFixed(6),
        '🔧 修复': '现在返回可代理余额限制，不是可用能量'
      });

      // 🔧 修复：直接返回可代理余额对应的能量，这才是真正能代理的数量
      return maxDelegatableEnergy;
    } catch (error: any) {
      logger.error(`❌ [可代理余额检查] 检查地址 ${address} 可代理余额失败`, {
        错误: error.message,
        网络ID: networkId
      });
      return 0;
    }
  }
}
