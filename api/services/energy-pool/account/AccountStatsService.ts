import { query } from '../../../database/index.ts';
import type { AccountRealTimeData, PoolStatisticsResult } from '../types/account.types.ts';

/**
 * 账户统计数据服务
 * 负责获取能量池统计信息和实时数据分析
 */
export class AccountStatsService {
  /**
   * 获取能量池统计信息（实时数据）
   */
  async getPoolStatistics(networkId?: string): Promise<PoolStatisticsResult> {
    try {
      console.log('📊 [PoolStatistics] 开始获取实时统计信息:', { networkId });
      
      // 1. 获取所有启用状态的账户的基本信息（只统计启用的账户，不包含维护中或停用的账户）
      const accountsResult = await query(`
        SELECT id, name, tron_address, status, cost_per_energy
        FROM energy_pools
        WHERE status = 'active'
        ORDER BY created_at DESC
      `);
      
      const accounts = accountsResult.rows;
      const totalAccounts = accounts.length;  // 只统计启用的账户
      const activeAccounts = accounts.length;  // 由于已经过滤了，所以活跃账户数等于总账户数
      
      console.log('📊 [PoolStatistics] 数据库账户信息:', {
        totalAccounts,
        activeAccounts,
        accounts: accounts.map(acc => ({ id: acc.id, name: acc.name, status: acc.status }))
      });
      
      // 2. 获取网络配置
      let tronApiUrl = 'https://api.trongrid.io';
      if (networkId) {
        const networkResult = await query(
          'SELECT name, network_type, rpc_url FROM tron_networks WHERE id = $1',
          [networkId]
        );
        if (networkResult.rows.length > 0) {
          tronApiUrl = networkResult.rows[0].rpc_url;
          console.log('📊 [PoolStatistics] 使用指定网络:', {
            networkId,
            name: networkResult.rows[0].name,
            rpcUrl: tronApiUrl
          });
        }
      }

      // 3. 直接从TRON官方API获取所有账户的实时数据
      const realTimeDataPromises = accounts.map(async (account) => {
        return this.fetchAccountRealTimeData(account, tronApiUrl);
      });
      
      // 4. 等待所有实时数据获取完成
      const realTimeData = await Promise.all(realTimeDataPromises);
      const validData = realTimeData.filter(data => data !== null) as AccountRealTimeData[];
      
      console.log('📊 [PoolStatistics] 实时数据获取结果:', {
        totalAccounts,
        validDataCount: validData.length,
        failedCount: totalAccounts - validData.length
      });
      
      // 5. 计算统计信息
      const statistics = this.calculateStatistics(validData, totalAccounts, activeAccounts);
      
      console.log('📊 [PoolStatistics] 实时统计信息计算完成:', statistics);
      
      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      console.error('Failed to get pool statistics:', error);
      return { success: false, message: 'Failed to get pool statistics' };
    }
  }

  /**
   * 获取单个账户的实时数据
   */
  private async fetchAccountRealTimeData(account: any, tronApiUrl: string): Promise<AccountRealTimeData | null> {
    try {
      console.log(`📊 [PoolStatistics] 从TRON官方API获取账户数据: ${account.name} (${account.tron_address})`);
      
      // 同时调用两个TRON官方API获取完整账户信息
      const [resourceResponse, accountResponse] = await Promise.all([
        fetch(`${tronApiUrl}/wallet/getaccountresource`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: account.tron_address, visible: true })
        }),
        fetch(`${tronApiUrl}/wallet/getaccount`, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: account.tron_address, visible: true })
        })
      ]);
      
      if (!resourceResponse.ok || !accountResponse.ok) {
        console.warn(`⚠️ [PoolStatistics] TRON API调用失败: ${account.name}`, {
          resourceStatus: resourceResponse.status,
          accountStatus: accountResponse.status
        });
        return null;
      }
      
      const [tronResourceData, tronAccountData] = await Promise.all([
        resourceResponse.json(),
        accountResponse.json()
      ]);
      
      console.log(`✅ [PoolStatistics] 获取TRON数据成功: ${account.name}`, {
        resource: tronResourceData,
        account: tronAccountData
      });
      
      return this.parseAccountResourceData(account, tronResourceData, tronAccountData);
    } catch (error) {
      console.error(`❌ [PoolStatistics] 获取账户 ${account.name} 数据失败:`, error);
      return null;
    }
  }

  /**
   * 解析账户资源数据
   */
  private parseAccountResourceData(account: any, tronResourceData: any, tronAccountData: any): AccountRealTimeData {
    // 解析账户资源数据
    const energyLimit = tronResourceData.EnergyLimit || 0; // TRON API返回的净可用能量
    const energyUsed = tronResourceData.EnergyUsed || 0; // 已使用的能量
    const currentAvailableEnergy = energyLimit - energyUsed; // 当前可用能量
    
    // 带宽计算
    const freeNetLimit = tronResourceData.freeNetLimit || 600; // 免费带宽
    const netLimit = tronResourceData.NetLimit || 0; // 质押获得的带宽
    const totalBandwidth = freeNetLimit + netLimit; // 总带宽
    const netUsed = tronResourceData.NetUsed || 0; // 已使用带宽
    const currentAvailableBandwidth = totalBandwidth - netUsed; // 当前可用带宽
    
    // 获取质押和代理信息（从account数据中）
    const accountResource = tronAccountData.account_resource || {};
    const frozenV2 = tronAccountData.frozenV2 || [];
    
    // 分别找到能量和带宽质押信息
    const energyFrozen = frozenV2.find((item: any) => item.type === 'ENERGY');
    const bandwidthFrozen = frozenV2.find((item: any) => item.type === 'BANDWIDTH');
    const stakedTrxForEnergy = energyFrozen ? (energyFrozen.amount || 0) : 0; // 质押的TRX数量（单位：sun）
    const stakedTrxForBandwidth = bandwidthFrozen ? (bandwidthFrozen.amount || 0) : 0; // 质押的TRX数量（单位：sun）
    
    // 获取代理信息
    const delegatedEnergyOut = accountResource.delegated_frozenV2_balance_for_energy || 0; // 代理给别人的TRX
    const delegatedBandwidthOut = accountResource.delegated_frozenV2_balance_for_bandwidth || 0; // 代理给别人的TRX
    const delegatedEnergyIn = accountResource.acquired_delegated_frozenV2_balance_for_energy || 0; // 从别人获得的TRX
    const delegatedBandwidthIn = accountResource.acquired_delegated_frozenV2_balance_for_bandwidth || 0; // 从别人获得的TRX
    
    // 转换为TRX单位
    const stakedTrxForEnergyInTrx = stakedTrxForEnergy / 1000000; 
    const stakedTrxForBandwidthInTrx = stakedTrxForBandwidth / 1000000;
    const delegatedEnergyInTrx = delegatedEnergyIn / 1000000;
    const delegatedEnergyOutTrx = delegatedEnergyOut / 1000000;
    const delegatedBandwidthInTrx = delegatedBandwidthIn / 1000000;
    const delegatedBandwidthOutTrx = delegatedBandwidthOut / 1000000;
    
    // === 能量计算 ===
    // 理论总能量 = 净可用能量 + 代理给他人的能量
    let theoreticalTotalEnergy = energyLimit;
    
    if (delegatedEnergyOutTrx > 0) {
      // 根据你提供的数据：27 TRX代理 ≈ 2,057能量，比率约为76.2能量/TRX
      const energyPerTrx = 76.2; 
      const delegatedOutEnergy = delegatedEnergyOutTrx * energyPerTrx;
      theoreticalTotalEnergy = energyLimit + delegatedOutEnergy;
    }
    
    // === 带宽计算（关键修复） ===
    // 1. 免费带宽 = 600
    // 2. 质押获得的带宽 = netLimit（TRON API已返回）
    // 3. 代理给他人的带宽需要从理论总带宽中计算
    // 4. 理论总带宽 = 免费带宽 + 质押带宽 + 代理给他人的带宽
    
    let theoreticalTotalBandwidth = freeNetLimit + netLimit; // 基础带宽
    
    if (delegatedBandwidthOutTrx > 0) {
      // 假设1 TRX ≈ 1000 带宽（这是一个估算值，具体需要根据TRON网络状态）
      const bandwidthPerTrx = 1000; 
      const delegatedOutBandwidth = delegatedBandwidthOutTrx * bandwidthPerTrx;
      theoreticalTotalBandwidth = freeNetLimit + netLimit + delegatedOutBandwidth;
    }
    
    // 实际可用于出租的资源
    const rentableEnergy = Math.max(0, currentAvailableEnergy);
    const rentableBandwidth = Math.max(0, currentAvailableBandwidth);
    
    // 包含代理影响的总资源
    const totalEnergyWithDelegation = theoreticalTotalEnergy + (delegatedEnergyInTrx * 76.2);
    const totalBandwidthWithDelegation = theoreticalTotalBandwidth + (delegatedBandwidthInTrx * 1000);
    
    console.log(`📊 [PoolStatistics] 账户 ${account.name} 详细分析:`, {
      stakes: {
        energyTrx: stakedTrxForEnergyInTrx,
        bandwidthTrx: stakedTrxForBandwidthInTrx
      },
      delegations: {
        energyOutTrx: delegatedEnergyOutTrx,
        energyInTrx: delegatedEnergyInTrx,
        bandwidthOutTrx: delegatedBandwidthOutTrx,
        bandwidthInTrx: delegatedBandwidthInTrx
      },
      energy: {
        theoretical: theoreticalTotalEnergy,
        current: energyLimit,
        available: rentableEnergy,
        used: energyUsed
      },
      bandwidth: {
        theoretical: theoreticalTotalBandwidth,
        current: totalBandwidth,
        available: rentableBandwidth,
        used: netUsed
      }
    });
    
    return {
      id: account.id,
      name: account.name,
      status: account.status,
      energy: {
        fromStaking: theoreticalTotalEnergy, // 理论总能量（包含代理还原）
        total: theoreticalTotalEnergy, // 理论总能量
        available: rentableEnergy, // 实际可用于出租的能量（净能量）
        used: energyUsed,
        delegatedOut: delegatedEnergyOut, // 代理给别人的TRX数量
        delegatedIn: delegatedEnergyIn // 从别人获得的TRX数量
      },
      bandwidth: {
        fromStaking: theoreticalTotalBandwidth, // 理论总带宽（包含代理还原）
        total: theoreticalTotalBandwidth, // 理论总带宽
        available: rentableBandwidth, // 实际可用于出租的带宽
        used: netUsed,
        delegatedOut: delegatedBandwidthOut, // 代理给别人的TRX数量
        delegatedIn: delegatedBandwidthIn // 从别人获得的TRX数量
      },
      costPerEnergy: account.cost_per_energy || 0.0001
    };
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(validData: AccountRealTimeData[], totalAccounts: number, activeAccounts: number) {
    // 5. 计算统计信息 - 使用修正后的数据结构
    let totalEnergyFromStaking = 0; // 仅质押获得的能量总和
    let totalEnergyWithDelegation = 0; // 包含代理的能量总和
    let availableEnergy = 0; // 实际可用于出租的能量
    let totalBandwidthFromStaking = 0; // 仅质押获得的带宽总和
    let totalBandwidthWithDelegation = 0; // 包含代理的带宽总和
    let availableBandwidth = 0; // 实际可用于出租的带宽
    let totalCostPerEnergy = 0;
    let totalDelegatedEnergyOut = 0; // 总的对外代理能量
    let totalDelegatedBandwidthOut = 0; // 总的对外代理带宽
    
    console.log('📊 [PoolStatistics] 开始计算统计信息，有效数据:', validData.length);
    
    validData.forEach((data, index) => {
      console.log(`📊 [PoolStatistics] 账户 ${index + 1}: ${data.name}`, {
        energy: data.energy,
        bandwidth: data.bandwidth,
        costPerEnergy: data.costPerEnergy
      });
      
      // 累加能量统计 - 使用正确的业务逻辑
      totalEnergyFromStaking += data.energy.fromStaking || 0; // 质押获得的能量
      totalEnergyWithDelegation += data.energy.total || 0; // 包含代理的总能量
      availableEnergy += data.energy.available || 0; // 实际可用能量
      totalDelegatedEnergyOut += data.energy.delegatedOut || 0; // 对外代理的能量
      
      // 累加带宽统计
      totalBandwidthFromStaking += data.bandwidth.fromStaking || 0; // 质押获得的带宽
      totalBandwidthWithDelegation += data.bandwidth.total || 0; // 包含代理的总带宽
      availableBandwidth += data.bandwidth.available || 0; // 实际可用带宽
      totalDelegatedBandwidthOut += data.bandwidth.delegatedOut || 0; // 对外代理的带宽
      
      totalCostPerEnergy += data.costPerEnergy || 0.0001;
    });
    
    console.log('📊 [PoolStatistics] 累计统计:', {
      totalEnergyFromStaking,
      totalEnergyWithDelegation,
      availableEnergy,
      totalBandwidthFromStaking,
      totalBandwidthWithDelegation,
      availableBandwidth,
      totalDelegatedEnergyOut,
      totalDelegatedBandwidthOut,
      totalCostPerEnergy
    });
    
    // 使用包含代理的总能量来计算利用率
    const utilizationRate = totalEnergyWithDelegation > 0 
      ? ((totalEnergyWithDelegation - availableEnergy) / totalEnergyWithDelegation) * 100 
      : 0;
      
    const bandwidthUtilizationRate = totalBandwidthWithDelegation > 0 
      ? ((totalBandwidthWithDelegation - availableBandwidth) / totalBandwidthWithDelegation) * 100 
      : 0;
    
    // 计算平均成本（基于TRON官方定价）
    const ENERGY_COST_PER_UNIT = 100; // 100 sun per energy unit
    const BANDWIDTH_COST_PER_UNIT = 1000; // 1000 sun per bandwidth unit
    const SUN_TO_TRX = 1000000; // 1 TRX = 1,000,000 sun
    
    const averageCostPerEnergy = ENERGY_COST_PER_UNIT / SUN_TO_TRX; // 0.0001 TRX
    const averageCostPerBandwidth = BANDWIDTH_COST_PER_UNIT / SUN_TO_TRX; // 0.001 TRX
    
    return {
      totalAccounts,
      activeAccounts,
      totalEnergy: totalEnergyWithDelegation, // 使用包含代理的总能量
      availableEnergy, // 实际可用于出租的能量
      totalBandwidth: totalBandwidthWithDelegation, // 使用包含代理的总带宽
      availableBandwidth, // 实际可用于出租的带宽
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      bandwidthUtilizationRate: Math.round(bandwidthUtilizationRate * 100) / 100,
      averageCostPerEnergy,
      averageCostPerBandwidth,
      // 添加额外的统计信息
      totalEnergyFromStaking, // 仅质押获得的能量
      totalBandwidthFromStaking, // 仅质押获得的带宽
      totalDelegatedEnergyOut, // 总的对外代理能量
      totalDelegatedBandwidthOut // 总的对外代理带宽
    };
  }
}

// 创建默认实例
export const accountStatsService = new AccountStatsService();
