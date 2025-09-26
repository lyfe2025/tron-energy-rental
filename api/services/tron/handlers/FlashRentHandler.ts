/**
 * 闪租功能处理器
 * 专门处理闪租相关的能量池选择、能量检查、能量代理等功能
 */
import { query } from '../../../database/index.ts';

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

      // 🔧 关键修复：参考质押管理成功实现，添加网络切换
      console.log(`🌐 [闪租代理] 切换到目标网络: ${networkId}`);
      await this.tronService.switchToNetwork(networkId);
      console.log(`✅ [闪租代理] 网络切换完成`);

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
        // 3. 代理前最终验证可代理余额
        console.log(`🔍 [代理前验证] 对选中账户进行最终余额验证: ${selectedAccount.address}`);
        const finalDelegateBalance = await this.checkAvailableEnergy(selectedAccount.address, networkId);
        
        if (finalDelegateBalance < totalEnergy) {
          throw new Error(`能量池可用余额不足: ${selectedAccount.address} 可代理${finalDelegateBalance}能量，需要${totalEnergy}能量`);
        }

        // 4. 执行能量代理
          // 🔧 正确的能量到TRX换算逻辑（参考能量池管理-质押管理-代理资源实现）
          // 公式：能量数量 → TRX数量 → SUN单位
          const energyPerTrx = 76.2; // 系统固定比例：76.2 ENERGY per TRX
          const requiredTrx = totalEnergy / energyPerTrx; // ENERGY → TRX
          const balanceInSun = Math.floor(requiredTrx * 1000000); // TRX → SUN (1 TRX = 1,000,000 SUN)
          
          const delegationParams = {
            ownerAddress: selectedAccount.address,
            receiverAddress: toAddress,
            balance: balanceInSun, // 正确的SUN单位
            resource: 'ENERGY' as 'ENERGY',
            lock: durationHours > 0,
            lockPeriod: durationHours > 0 ? durationHours : undefined // 🔧 修正：直接传递小时数，让DelegationService处理转换
        };

        console.log(`⚡ [闪租代理] 开始执行能量代理`, {
          委托方地址: delegationParams.ownerAddress,
          接收方地址: delegationParams.receiverAddress,
          代理能量: totalEnergy,
          换算详情: {
            '能量数量': totalEnergy,
            '换算比例': `${energyPerTrx} ENERGY/TRX`,
            '需要TRX': requiredTrx.toFixed(6),
            '转换为SUN': balanceInSun,
            '公式': `${totalEnergy} ÷ ${energyPerTrx} × 1,000,000 = ${balanceInSun} SUN`
          },
          资源类型: delegationParams.resource,
          是否锁定: delegationParams.lock,
          锁定期: delegationParams.lockPeriod ? `${delegationParams.lockPeriod} 小时` : '无',
          持续时间: durationHours + '小时'
        });

        // 🔧 修复：使用和质押管理相同的调用方式（封装方法，包含waitForInitialization等关键步骤）
        const delegationResult = await this.tronService.delegateResource(delegationParams);

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
        // 5. 恢复默认私钥
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
      
      // 提供更友好的错误信息
      if (error.message.includes('能量池可用余额不足')) {
        throw new Error(`能量池可用余额不足\n${error.message}\n\n建议处理方式：\n• 能量池账户需要有足够的质押TRX余额\n• 请检查并补充能量池资源\n• 或等待其他订单释放能量后重试`);
      }
      
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
      console.log(`🔍 [能量池选择] 查找合适能量池 (需要: ${requiredEnergy} 能量)`);

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
          console.log(`    📊 实时TRON数据: { '实时可用能量': ${realTimeEnergy}, '数据源': 'TRON官方API', '备注': '数据库中已不存储能量字段' }`);
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
            '账户名称': account.name || '未命名',
            '地址': account.tron_address,
            '需要能量': requiredEnergy,
            '实时可用能量': realTimeAvailableEnergy,
            '是否足够': realTimeAvailableEnergy >= requiredEnergy ? '✅ 足够' : '❌ 不足',
            '差额': realTimeAvailableEnergy - requiredEnergy,
            '检查模式': '最终决策检查（仅使用实时数据）'
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
   * 检查账户可用能量（按网络获取实时数据）
   */
  private async checkAvailableEnergy(address: string, networkId: string): Promise<number> {
    try {
      console.log(`🔍 [能量检查] 开始检查账户能量: ${address}`, {
        '网络ID': networkId,
        '检查模式': '按网络配置获取实时数据'
      });
      
      // 1. 获取网络配置
      const networkResult = await query(`
        SELECT id, name, rpc_url, network_type, is_active 
        FROM tron_networks 
        WHERE id = $1 AND is_active = true
      `, [networkId]);
      
      if (networkResult.rows.length === 0) {
        console.error(`❌ [能量检查] 网络不存在或未激活: ${networkId}`);
        return 0;
      }
      
      const network = networkResult.rows[0];
      
      // 2. 创建基于指定网络的TronService实例
      let networkTronService;
      try {
        const { TronService } = await import('../../tron/TronService');
        networkTronService = new TronService({
          fullHost: network.rpc_url,
          privateKey: undefined, // 不需要私钥，只获取公开信息
          solidityNode: network.rpc_url,
          eventServer: network.rpc_url
        });
      } catch (error) {
        console.error('❌ [能量检查] 创建TronService失败:', error);
        return 0;
      }
      
      // 3. 获取账户资源信息
      const resourceResult = await networkTronService.getAccountResources(address);
      
      if (!resourceResult.success) {
        console.error(`❌ [能量检查] 获取账户资源失败: ${address}`, {
          错误: resourceResult.error,
          网络ID: networkId,
          网络名称: network.name
        });
        return 0;
      }

      const resourceData = resourceResult.data;
      
      // 从实时数据中获取可用能量
      const energyInfo = resourceData.energy || {};
      const totalEnergyLimit = energyInfo.limit || 0;
      const usedEnergy = energyInfo.used || 0;
      const availableEnergy = energyInfo.available || (totalEnergyLimit - usedEnergy);
      const finalAvailableEnergy = Math.max(0, availableEnergy);
      
      // 🔧 关键：检查可代理余额（FreezeEnergyV2 balance）
      // 计算账户的真实可代理TRX余额
      const delegatedEnergyOut = energyInfo.delegatedOut || 0; // 已代理给别人的SUN
      const directStaked = energyInfo.directStaked || 0; // 直接质押的SUN
      const totalStaked = energyInfo.totalStaked || 0; // 总质押SUN
      
      // 可代理余额 = 总质押 - 已代理出去
      const availableDelegateBalance = Math.max(0, totalStaked - delegatedEnergyOut); // SUN单位
      const availableDelegateTrx = availableDelegateBalance / 1000000; // 转为TRX

      console.log(`📊 [能量检查] 账户 ${address} 在网络 ${network.name} 的能量详情:`, {
        '账户地址': address,
        '网络信息': {
          ID: network.id,
          '名称': network.name,
          '类型': network.network_type,
          RPC: network.rpc_url
        },
        '总能量限制': totalEnergyLimit,
        '已使用能量': usedEnergy,
        '可用能量': finalAvailableEnergy,
        '能量使用率': totalEnergyLimit > 0 ? `${((usedEnergy / totalEnergyLimit) * 100).toFixed(1)}%` : '0%',
        '🔑 代理余额分析': {
          '总质押TRX': (totalStaked / 1000000).toFixed(6),
          '已代理TRX': (delegatedEnergyOut / 1000000).toFixed(6),
          '可代理TRX': availableDelegateTrx.toFixed(6),
          '可代理SUN': availableDelegateBalance,
          '说明': '可代理余额 = 总质押 - 已代理'
        },
        '资源详情': {
          '🔋 能量': energyInfo,
          '📶 带宽': resourceData.bandwidth || {}
        }
      });

      // 🔧 关键修复：返回可代理余额对应的能量（而不是账户可用能量）
      // 因为TRON代理检查的是FreezeEnergyV2余额，不是可用能量
      const energyPerTrx = 76.2; // 能量换算比例
      const maxDelegatableEnergy = Math.floor(availableDelegateTrx * energyPerTrx);
      
      console.log(`🎯 [代理限制] 账户 ${address} 代理能力分析:`, {
        '可代理TRX余额': availableDelegateTrx.toFixed(6),
        '对应最大可代理能量': maxDelegatableEnergy,
        '当前可用能量': finalAvailableEnergy,
        '🔧 修复': '现在返回可代理余额限制，不是可用能量',
        '限制因素': maxDelegatableEnergy < finalAvailableEnergy ? '代理余额不足' : '能量余额充足'
      });

      // 🔧 修复：直接返回可代理余额对应的能量，这才是真正能代理的数量
      // 不再取最小值，因为代理操作检查的是FreezeEnergyV2余额，不是可用能量
      return maxDelegatableEnergy;
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
