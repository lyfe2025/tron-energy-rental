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
      logger.info(`🚀 [DelegationExecutor] 开始执行代理操作`, {
        orderId,
        energyAccount: energyAccount.tron_address,
        需要能量: energyPerTransaction,
        用户地址: userAddress,
        调试标记: 'executeDelegation_entry'
      });

      // 1. 构建代理参数
      logger.info(`📋 [DelegationExecutor] 步骤1: 构建代理参数`, { orderId });
      const delegationParams = this.buildDelegationParams(
        order,
        energyPerTransaction,
        energyAccount,
        userAddress
      )
      logger.info(`✅ [DelegationExecutor] 步骤1: 代理参数构建完成`, { orderId });

      // 2. 记录使用的能量池账户到订单中
      logger.info(`📋 [DelegationExecutor] 步骤2: 记录能量池账户`, { orderId });
      await this.recordEnergyPoolUsage(orderId, energyAccount)
      logger.info(`✅ [DelegationExecutor] 步骤2: 能量池账户记录完成`, { orderId });

      // 3. 🔧 网络一致性修复：使用订单指定网络的TronService实例
      logger.info(`🔍 [代理前验证] 设置私钥前验证余额: ${energyAccount.tron_address}`, {
        orderId,
        需要能量: energyPerTransaction,
        网络ID: order.network_id,
        修复标记: '确保使用订单指定的网络'
      });
      
      // 🔥 关键修复：创建网络专用的TronService实例，与EnergyPoolSelector保持一致
      let networkTronService;
      try {
        // 获取网络配置
        const networkResult = await query(`
          SELECT id, name, rpc_url, network_type, is_active 
          FROM tron_networks 
          WHERE id = $1 AND is_active = true
        `, [order.network_id]);
        
        if (networkResult.rows.length === 0) {
          logger.error(`❌ [代理前验证] 网络不存在或未激活: ${order.network_id}`);
          return {
            success: false,
            message: `网络配置错误: ${order.network_id}`
          };
        }
        
        const network = networkResult.rows[0];
        
        // 创建网络专用的TronService实例
        const { TronService } = await import('../../../tron/TronService');
        networkTronService = new TronService({
          fullHost: network.rpc_url,
          privateKey: undefined,
          solidityNode: network.rpc_url,
          eventServer: network.rpc_url
        });
        
        logger.info(`✅ [代理前验证] 创建网络专用TronService`, {
          网络名称: network.name,
          网络RPC: network.rpc_url,
          网络ID: order.network_id
        });
      } catch (error) {
        logger.error('❌ [代理前验证] 创建网络TronService失败:', error);
        return {
          success: false,
          message: `网络配置失败: ${error.message}`
        };
      }
      
      // 使用网络专用实例查询（确保网络一致性）
      const resourceResult = await networkTronService.getAccountResources(energyAccount.tron_address);
      
      if (!resourceResult.success) {
        logger.error(`❌ [代理前验证] 获取账户资源失败`, {
          orderId,
          账户地址: energyAccount.tron_address,
          错误: resourceResult.error
        });
        return {
          success: false,
          message: `获取账户资源失败: ${resourceResult.error}`
        };
      }
      
      // 🔥 核心修复：与EnergyPoolSelector保持一致，使用净可用能量
      const energyInfo = resourceResult.data.energy || {};
      
      // 获取净可用能量（这就是真正可代理的！）
      const totalEnergyLimit = energyInfo.limit || 0;
      const usedEnergy = energyInfo.used || 0;
      const finalDelegatableEnergy = Math.max(0, totalEnergyLimit - usedEnergy);
      
      // 获取质押信息（用于调试显示）
      const delegatedEnergyOut = (energyInfo as any)?.delegatedEnergyOut || 0;
      const directEnergyStaked = (energyInfo as any)?.directEnergyStaked_SUN || 0;
      const availableDelegateBalance = Math.max(0, directEnergyStaked - delegatedEnergyOut);
      const availableDelegateTrx = availableDelegateBalance / 1000000;
      const oldCalculation = Math.floor(availableDelegateTrx * 76.2);
      
      logger.info(`🎯 [代理前验证] 余额验证详情`, {
        orderId,
        账户地址: energyAccount.tron_address,
        '🔥 核心修复': '与EnergyPoolSelector保持一致',
        '净可用能量(正确)': finalDelegatableEnergy,
        '错误计算值': oldCalculation,
        '直接能量质押TRX': (directEnergyStaked / 1000000).toFixed(6),
        '已代理能量TRX': (delegatedEnergyOut / 1000000).toFixed(6),
        '需要能量': energyPerTransaction,
        '✅ 验证结果': finalDelegatableEnergy >= energyPerTransaction ? '充足' : '不足'
      });
      
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
      
      logger.info(`✅ [代理前验证] 余额验证通过，开始设置私钥`, {
        orderId,
        账户地址: energyAccount.tron_address,
        可代理能量: finalDelegatableEnergy,
        需要能量: energyPerTransaction,
        剩余能量: finalDelegatableEnergy - energyPerTransaction
      });

      // 4. 🔧 网络一致性修复：直接设置能量池私钥到网络专用实例
      logger.info(`🔑 [代理执行] 为网络专用实例设置能量池私钥`, {
        orderId,
        网络ID: order.network_id,
        能量池ID: energyAccount.id,
        能量池地址: energyAccount.tron_address
      });
      
      // 获取能量池私钥并设置到网络专用实例
      try {
        const privateKeyResult = await query(
          'SELECT private_key_encrypted FROM energy_pools WHERE id = $1',
          [energyAccount.id]
        );
        
        if (privateKeyResult.rows.length === 0) {
          throw new Error(`能量池账户不存在: ${energyAccount.id}`);
        }
        
        const privateKey = privateKeyResult.rows[0].private_key_encrypted;
        
        if (!privateKey || privateKey.length !== 64) {
          throw new Error(`能量池账户私钥格式无效: ${energyAccount.id}`);
        }
        
        // 设置私钥到网络专用TronWeb实例
        networkTronService.tronWeb.setPrivateKey(privateKey);
        
        logger.info(`✅ [代理执行] 网络专用实例私钥设置成功`, {
          能量池ID: energyAccount.id,
          能量池地址: energyAccount.tron_address,
          网络ID: order.network_id
        });
      } catch (keyError) {
        logger.error(`❌ [代理执行] 设置私钥失败`, {
          错误: keyError.message,
          能量池ID: energyAccount.id
        });
        return {
          success: false,
          message: `设置能量池私钥失败: ${keyError.message}`
        };
      }

      let delegationResult: any
      try {
        // 5. 🔧 网络一致性修复：使用网络专用实例执行代理
        logger.info(`🚀 [代理执行] 使用网络专用实例开始执行能量代理`, {
          orderId,
          网络ID: order.network_id,
          delegationParams,
          energyAccount: energyAccount.tron_address,
          修复标记: '确保使用相同网络实例'
        })
        
        delegationResult = await networkTronService.delegateResource(delegationParams)
        
        logger.info(`能量代理执行完成`, {
          orderId,
          success: delegationResult?.success,
          txid: delegationResult?.txid,
          error: delegationResult?.error
        })

        if (!delegationResult?.success) {
          // 🔧 增强错误诊断：详细分析失败原因
          logger.error(`🚨 [代理失败诊断] 开始详细分析失败原因`, {
            orderId,
            原始错误: delegationResult?.error,
            能量池地址: energyAccount.tron_address
          });
          
          let detailedErrorMessage = '';
          let diagnostics = {};
          
          try {
            // 检查错误类型和消息
            const errorMsg = delegationResult?.error || '';
            const isResourceError = errorMsg.includes('resource insufficient') || errorMsg.includes('BANDWITH_ERROR');
            
            if (isResourceError) {
              // 获取能量池账户的详细资源状态
              logger.info(`🔍 [代理失败诊断] 获取能量池账户详细资源状态`, { 账户: energyAccount.tron_address });
              
              const accountResources = await networkTronService.getAccountResources(energyAccount.tron_address);
              const accountInfo = await networkTronService.getAccount(energyAccount.tron_address);
              
              if (accountResources.success && accountInfo.success) {
                const trxBalance = accountInfo.data.balance || 0;
                const trxBalanceReadable = (trxBalance / 1000000).toFixed(6);
                const bandwidthInfo = accountResources.data.bandwidth || {};
                const energyInfo = accountResources.data.energy || {};
                
                // 计算各种资源状态
                const availableBandwidth = bandwidthInfo.available || 0;
                const availableEnergy = energyInfo.available || 0;
                const delegationFeeEstimate = 1.1; // TRX，代理交易预估手续费
                
                diagnostics = {
                  账户余额: {
                    'TRX余额': trxBalanceReadable,
                    '最低需要TRX': delegationFeeEstimate + ' (预估交易费)',
                    'TRX是否充足': trxBalance >= (delegationFeeEstimate * 1000000) ? '✅ 充足' : '❌ 不足'
                  },
                  带宽资源: {
                    '可用带宽': availableBandwidth,
                    '预估需要带宽': '250-350 (代理交易)',
                    '带宽是否充足': availableBandwidth >= 250 ? '✅ 充足' : '❌ 不足'
                  },
                  能量资源: {
                    '可用能量': availableEnergy,
                    '需要代理能量': energyPerTransaction,
                    '能量是否充足': availableEnergy >= energyPerTransaction ? '✅ 充足' : '❌ 不足'
                  }
                };
                
                // 分析具体失败原因
                const issues = [];
                if (trxBalance < (delegationFeeEstimate * 1000000)) {
                  issues.push(`TRX余额不足 (当前: ${trxBalanceReadable} TRX，需要: ${delegationFeeEstimate} TRX)`);
                }
                if (availableBandwidth < 250) {
                  issues.push(`带宽资源不足 (当前: ${availableBandwidth}，需要: 250+)`);
                }
                if (availableEnergy < energyPerTransaction) {
                  issues.push(`能量余额不足 (当前: ${availableEnergy}，需要: ${energyPerTransaction})`);
                }
                
                if (issues.length > 0) {
                  detailedErrorMessage = `能量池账户资源不足: ${issues.join('; ')}`;
                } else {
                  detailedErrorMessage = `代理交易失败，但资源检查显示充足，可能是网络问题或其他原因`;
                }
                
                logger.error(`📊 [代理失败诊断] 资源状态详情`, {
                  orderId,
                  能量池地址: energyAccount.tron_address,
                  诊断结果: diagnostics,
                  问题列表: issues,
                  建议处理方式: issues.length > 0 ? '请为能量池账户充值相应资源' : '请检查网络状态或重试'
                });
              }
            } else {
              detailedErrorMessage = `代理交易失败: ${delegationResult?.error}`;
            }
          } catch (diagnosisError) {
            logger.warn(`⚠️ [代理失败诊断] 诊断过程出错: ${diagnosisError.message}`);
            detailedErrorMessage = `Energy delegation failed: ${delegationResult?.error || 'Unknown delegation error'}`;
          }
          
          return {
            success: false,
            message: detailedErrorMessage || `Energy delegation failed: ${delegationResult?.error || 'Unknown delegation error'}`,
            details: {
              原始错误: delegationResult,
              诊断信息: diagnostics,
              建议处理: detailedErrorMessage.includes('TRX余额不足') ? '请为能量池账户转入TRX' : 
                       detailedErrorMessage.includes('带宽资源不足') ? '请为能量池账户质押TRX获取带宽' :
                       detailedErrorMessage.includes('能量余额不足') ? '请为能量池账户质押TRX获取能量' : '请检查网络状态'
            }
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

  // setupEnergyPoolAccount方法已移除
  // 现在直接在executeDelegation中使用网络专用实例设置私钥

}
