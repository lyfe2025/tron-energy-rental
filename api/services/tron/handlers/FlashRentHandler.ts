/**
 * 闪租功能处理器
 * 专门处理闪租相关的能量池选择、能量检查、能量代理等功能
 */
import { query } from '../../../database/index.js';

export class FlashRentHandler {
  private tronService: any;

  constructor(tronService: any) {
    this.tronService = tronService;
  }

  /**
   * 为闪租业务代理能量
   * @param toAddress - 接收能量的地址
   * @param totalEnergy - 需要代理的总能量
   * @param durationHours - 代理持续时间（小时）
   * @param networkId - 网络ID
   */
  async delegateEnergyForFlashRent(
    toAddress: string,
    totalEnergy: number,
    durationHours: number,
    networkId: string
  ): Promise<string> {
    await this.tronService.waitForInitialization();
    
    try {
      console.log(`🚀 [闪租代理] 开始为闪租业务代理能量`, {
        目标地址: toAddress,
        需要能量: totalEnergy,
        持续时间: durationHours + '小时',
        网络ID: networkId
      });

      // 1. 选择合适的能量池账户
      const selectedAccount = await this.selectEnergyPoolAccount(totalEnergy, networkId);
      if (!selectedAccount) {
        throw new Error('没有找到有足够能量的池账户');
      }

      console.log(`✅ [闪租代理] 成功选中能量池账户: ${selectedAccount.name || '未命名'} (${selectedAccount.address})`, {
        账户名称: selectedAccount.name || '未命名',
        TRON地址: selectedAccount.address,
        优先级: selectedAccount.priority,
        实时可用能量: '从TRON网络获取',
        需要能量: totalEnergy,
        剩余能量: '需实时计算',
        成本: selectedAccount.cost_per_energy
      });

      // 2. 设置能量池账户私钥
      console.log(`🔑 [闪租代理] 设置能量池账户私钥: ${selectedAccount.address}`);
      await this.tronService.setPoolAccountPrivateKey(selectedAccount.id);

      try {
        // 3. 执行能量代理
        const delegationParams = {
          ownerAddress: selectedAccount.address,
          receiverAddress: toAddress,
          balance: Math.ceil(totalEnergy / 1000), // 转换为TRX sun units 
          resource: 'ENERGY' as 'ENERGY',
          lock: durationHours > 0,
          lockPeriod: durationHours > 0 ? Math.ceil(durationHours * 3600 / 3) : undefined // TRON锁定期以3秒为单位
        };

        console.log(`⚡ [闪租代理] 开始执行能量代理`, {
          委托方地址: delegationParams.ownerAddress,
          接收方地址: delegationParams.receiverAddress,
          代理能量: totalEnergy,
          转换后TRX_Sun: delegationParams.balance,
          资源类型: delegationParams.resource,
          是否锁定: delegationParams.lock,
          锁定期: delegationParams.lockPeriod ? `${delegationParams.lockPeriod} 个3秒单位` : '无',
          持续时间: durationHours + '小时'
        });

        const delegationResult = await this.tronService.delegationService.delegateResource(delegationParams);

        if (!delegationResult.success) {
          console.error(`❌ [闪租代理] 能量代理失败`, {
            错误: delegationResult.error,
            委托方: selectedAccount.address,
            接收方: toAddress,
            能量: totalEnergy
          });
          throw new Error(`能量代理失败: ${delegationResult.error}`);
        }

        console.log(`✅ [闪租代理] 能量代理成功!`, {
          交易ID: delegationResult.txid,
          委托方: selectedAccount.address,
          接收方: toAddress,
          代理能量: totalEnergy,
          持续时间: durationHours + '小时'
        });
        
        return delegationResult.txid!;

      } finally {
        // 4. 恢复默认私钥
        console.log(`🔄 [闪租代理] 恢复默认私钥`);
        await this.tronService.restoreDefaultPrivateKey();
      }
    } catch (error) {
      console.error('❌ [闪租代理] 闪租能量代理失败:', {
        错误消息: error.message,
        目标地址: toAddress,
        需要能量: totalEnergy,
        持续时间: durationHours + '小时',
        网络ID: networkId,
        错误栈: error.stack
      });
      throw error;
    }
  }

  /**
   * 选择合适的能量池账户
   */
  private async selectEnergyPoolAccount(
    requiredEnergy: number,
    networkId: string
  ): Promise<any> {
    try {
      console.log(`🔍 [能量池选择] 开始选择能量池账户`, {
        需要能量: requiredEnergy,
        网络ID: networkId
      });

      // 按优先级查询能量池账户
      // 注意：total_energy, available_energy 字段已移除，现在从TRON网络实时获取
      const result = await query(
        `SELECT id, name, tron_address, private_key_encrypted, 
                status, priority, cost_per_energy
         FROM energy_pools
         WHERE status = 'active'
         ORDER BY priority DESC`,
        []
      );

      if (!result.rows || result.rows.length === 0) {
        console.error(`❌ [能量池选择] 未找到活跃的能量池账户`);
        return null;
      }

      console.log(`📋 [能量池选择] 找到 ${result.rows.length} 个活跃的能量池账户:`);
      
      // 先显示数据库基础信息，然后获取实时能量数据
      for (let i = 0; i < result.rows.length; i++) {
        const account = result.rows[i];
        console.log(`  ${i + 1}. ${account.name || '未命名'} (${account.tron_address})`, {
          优先级: account.priority,
          状态: account.status,
          单位成本: account.cost_per_energy,
          备注: '能量数据从TRON网络实时获取'
        });

        // 立即获取该账户的实时TRON数据
        try {
          const realTimeEnergy = await this.checkAvailableEnergy(account.tron_address, networkId);
          console.log(`    📊 实时TRON数据:`, {
            实时可用能量: realTimeEnergy,
            数据源: 'TRON官方API',
            备注: '数据库中已不存储能量字段'
          });
        } catch (error) {
          console.warn(`    ⚠️ 获取实时数据失败: ${error.message}`);
        }
      }

      // 依次检查每个账户的可用能量进行最终选择
      let checkedCount = 0;
      for (const account of result.rows) {
        checkedCount++;
        console.log(`🔍 [能量池选择] 最终检查第 ${checkedCount} 个账户: ${account.name || '未命名'} (${account.tron_address})`);
        
        try {
          // 再次获取最新数据进行最终决策（确保数据最新）
          const realTimeAvailableEnergy = await this.checkAvailableEnergy(account.tron_address, networkId);
          
          console.log(`📊 [能量池选择] 账户 ${account.tron_address} 最终选择检查:`, {
            账户名称: account.name || '未命名',
            地址: account.tron_address,
            需要能量: requiredEnergy,
            实时可用能量: realTimeAvailableEnergy,
            是否足够: realTimeAvailableEnergy >= requiredEnergy ? '✅ 足够' : '❌ 不足',
            差额: realTimeAvailableEnergy - requiredEnergy,
            检查模式: '最终决策检查（仅使用实时数据）'
          });
          
          if (realTimeAvailableEnergy >= requiredEnergy) {
            console.log(`✅ [能量池选择] 选中账户: ${account.name || '未命名'} (${account.tron_address})`, {
              优先级: account.priority,
              实时可用能量: realTimeAvailableEnergy,
              需要能量: requiredEnergy,
              剩余能量: realTimeAvailableEnergy - requiredEnergy
            });
            
            return {
              ...account,
              address: account.tron_address, // 保持向后兼容
              private_key: account.private_key_encrypted, // 保持向后兼容
              realtime_available_energy: realTimeAvailableEnergy // 实时获取的能量数据
            };
          } else {
            console.warn(`⚠️ [能量池选择] 账户 ${account.tron_address} 能量不足`, {
              需要: requiredEnergy,
              可用: realTimeAvailableEnergy,
              缺少: requiredEnergy - realTimeAvailableEnergy
            });
          }
        } catch (error) {
          console.error(`❌ [能量池选择] 检查账户 ${account.tron_address} 能量失败:`, {
            错误: error.message,
            账户名称: account.name || '未命名'
          });
          continue;
        }
      }

      console.error(`❌ [能量池选择] 所有 ${result.rows.length} 个能量池账户都无法满足需求`, {
        需要能量: requiredEnergy,
        检查了账户数: checkedCount
      });
      return null;
    } catch (error) {
      console.error('❌ [能量池选择] 选择能量池账户失败:', error);
      return null;
    }
  }

  /**
   * 检查账户可用能量（根据指定网络获取实时数据）
   */
  private async checkAvailableEnergy(address: string, networkId: string): Promise<number> {
    try {
      console.log(`🔍 [能量检查] 开始检查账户能量: ${address}`, {
        网络ID: networkId,
        检查模式: '指定网络实时获取'
      });
      
      // 使用能量池管理中已实现的网络特定实时数据获取接口
      const response = await fetch('/api/energy-pool/accounts/validate-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: address,
          network_id: networkId
        })
      });

      if (!response.ok) {
        console.error(`❌ [能量检查] 网络请求失败: ${response.status} ${response.statusText}`);
        return 0;
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        console.error(`❌ [能量检查] 获取账户资源失败: ${address}`, {
          错误: result.message || '未知错误',
          网络ID: networkId
        });
        return 0;
      }

      const accountData = result.data;
      const energy = accountData.energy;
      
      // 从实时数据中获取可用能量
      const totalEnergyLimit = energy?.total || energy?.limit || 0;
      const usedEnergy = energy?.used || 0;
      const availableEnergy = energy?.available || (totalEnergyLimit - usedEnergy);
      const finalAvailableEnergy = Math.max(0, availableEnergy);

      console.log(`📊 [能量检查] 账户 ${address} 在 ${accountData.networkInfo?.name || '指定网络'} 的能量详情:`, {
        网络信息: {
          ID: accountData.networkInfo?.id,
          名称: accountData.networkInfo?.name,
          类型: accountData.networkInfo?.type,
          RPC: accountData.networkInfo?.rpcUrl
        },
        账户地址: address,
        总能量限制: totalEnergyLimit,
        已使用能量: usedEnergy,
        可用能量: finalAvailableEnergy,
        能量使用率: totalEnergyLimit > 0 ? `${((usedEnergy / totalEnergyLimit) * 100).toFixed(1)}%` : '0%',
        TRX余额: (accountData.balance / 1000000).toFixed(6) + ' TRX',
        USDT余额: accountData.usdtBalance || 0,
        资源详情: {
          '🔋 能量': energy,
          '📶 带宽': accountData.bandwidth
        }
      });

      return finalAvailableEnergy;
    } catch (error) {
      console.error(`❌ [能量检查] 检查地址 ${address} 可用能量失败:`, {
        错误消息: error.message,
        网络ID: networkId,
        错误栈: error.stack
      });
      return 0;
    }
  }
}
