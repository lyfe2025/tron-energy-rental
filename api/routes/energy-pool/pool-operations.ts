import { Router } from 'express';
import { query } from '../../database';
import { energyPoolService } from '../../services/energy-pool';
import { tronService } from '../../services/tron/TronService';
import { getNetworkUSDTContract, getUSDTBalanceFromDatabase } from './overview-statistics';

const router: Router = Router();

/**
 * 刷新能量池状态
 */
router.post('/refresh', async (req, res) => {
  try {
    await energyPoolService.refreshPoolStatus();
    res.json({
      success: true,
      message: 'Pool status refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh pool status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh pool status'
    });
  }
});

/**
 * 优化能量分配
 */
router.post('/optimize', async (req, res) => {
  try {
    const { requiredEnergy } = req.body;
    
    if (!requiredEnergy || requiredEnergy <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid required energy amount'
      });
    }
    
    const result = await energyPoolService.optimizeEnergyAllocation(requiredEnergy);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Optimize energy allocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize energy allocation'
    });
  }
});

/**
 * 预留能量资源
 */
router.post('/reserve', async (req, res) => {
  try {
    const { accountId, energyAmount } = req.body;
    
    if (!accountId || !energyAmount || energyAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid accountId or energyAmount'
      });
    }
    
    // 生成交易ID
    const transactionId = `reserve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await energyPoolService.reserveEnergy(accountId, energyAmount, transactionId);
    
    res.json({
      success: true,
      message: 'Energy reserved successfully',
      transactionId
    });
  } catch (error) {
    console.error('Reserve energy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reserve energy'
    });
  }
});

/**
 * 释放预留的能量资源
 */
router.post('/release', async (req, res) => {
  try {
    const { accountId, energyAmount } = req.body;
    
    if (!accountId || !energyAmount || energyAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid accountId or energyAmount'
      });
    }
    
    // 生成交易ID
    const transactionId = `release_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await energyPoolService.releaseReservedEnergy(accountId, energyAmount, transactionId);
    
    res.json({
      success: true,
      message: 'Reserved energy released successfully',
      transactionId
    });
  } catch (error) {
    console.error('Release energy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release reserved energy'
    });
  }
});

/**
 * 确认能量使用
 */
router.post('/confirm-usage', async (req, res) => {
  try {
    const { accountId, energyAmount } = req.body;
    
    if (!accountId || !energyAmount || energyAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid accountId or energyAmount'
      });
    }
    
    // 生成交易ID
    const transactionId = `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await energyPoolService.confirmEnergyUsage(accountId, energyAmount, transactionId);
    
    res.json({
      success: true,
      message: 'Energy usage confirmed successfully',
      transactionId
    });
  } catch (error) {
    console.error('Confirm energy usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm energy usage'
    });
  }
});

/**
 * 验证TRON地址并获取账户信息
 */
router.post('/accounts/validate-address', async (req, res) => {
  try {
    const { address, private_key, network_id } = req.body;
    
    console.log('🔍 [ValidateAddress] 接收到验证请求:', {
      address,
      private_key: private_key ? `${private_key.substring(0, 8)}...` : 'undefined',
      network_id,
      timestamp: new Date().toISOString()
    });
    
    if (!address) {
      console.log('❌ [ValidateAddress] 地址为空');
      return res.status(400).json({
        success: false,
        message: 'TRON地址不能为空'
      });
    }

    if (!network_id) {
      console.log('❌ [ValidateAddress] 网络ID为空');
      return res.status(400).json({
        success: false,
        message: '请先选择TRON网络'
      });
    }
    
    // 获取网络配置
    console.log('🔍 [ValidateAddress] 查询网络配置:', network_id);
    const networkResult = await query(
      'SELECT name, network_type, rpc_url, is_active, health_status FROM tron_networks WHERE id = $1',
      [network_id]
    );
    
    console.log('🔍 [ValidateAddress] 网络查询结果:', {
      found: networkResult.rows.length > 0,
      network: networkResult.rows[0] || null
    });
    
    if (networkResult.rows.length === 0) {
      console.log('❌ [ValidateAddress] 网络不存在');
      return res.status(400).json({
        success: false,
        message: '指定的网络不存在'
      });
    }
    
    const network = networkResult.rows[0];
    
    if (!network.is_active) {
      console.log('❌ [ValidateAddress] 网络未激活:', network.name);
      return res.status(400).json({
        success: false,
        message: `网络 ${network.name} 当前不可用`
      });
    }
    
    // 验证地址格式
    console.log('🔍 [ValidateAddress] 开始验证地址格式:', address);
    try {
      const isValidAddress = tronService.isValidAddress(address);
      console.log('🔍 [ValidateAddress] 地址验证结果:', isValidAddress);
      
      if (!isValidAddress) {
        console.log('❌ [ValidateAddress] 地址格式无效');
        return res.status(400).json({
          success: false,
          message: '无效的TRON地址格式'
        });
      }
    } catch (error) {
      console.error('❌ [ValidateAddress] 地址验证抛出异常:', error);
      return res.status(400).json({
        success: false,
        message: `地址验证失败: ${error.message}`
      });
    }
    
    // 验证私钥格式（如果提供）
    if (private_key) {
      console.log('🔍 [ValidateAddress] 验证私钥格式:', `${private_key.substring(0, 8)}...`);
      if (!/^[0-9a-fA-F]{64}$/.test(private_key)) {
        console.log('❌ [ValidateAddress] 私钥格式无效');
        return res.status(400).json({
          success: false,
          message: '无效的私钥格式（需要64位十六进制字符）'
        });
      }
      console.log('✅ [ValidateAddress] 私钥格式验证通过');
    }
    
    // 创建基于指定网络的TronService实例
    console.log('🔍 [ValidateAddress] 创建网络专用TronService实例:', {
      rpcUrl: network.rpc_url,
      networkName: network.name,
      hasPrivateKey: !!private_key
    });
    
    let networkTronService;
    try {
      const { TronService } = await import('../../services/tron/TronService');
      networkTronService = new TronService({
        fullHost: network.rpc_url,
        privateKey: private_key,
        solidityNode: network.rpc_url,
        eventServer: network.rpc_url
      });
      console.log('✅ [ValidateAddress] TronService实例创建成功');
    } catch (error) {
      console.error('❌ [ValidateAddress] 创建TronService失败:', error);
      return res.status(400).json({
        success: false,
        message: `初始化TRON服务失败: ${error.message}`
      });
    }
    
    // 获取账户资源信息
    console.log('🔍 [ValidateAddress] 开始获取账户信息...');
    const [accountInfo, resourceInfo, usdtBalance] = await Promise.all([
      networkTronService.getAccount(address),
      networkTronService.getAccountResources(address),
      getUSDTBalanceFromDatabase(address, network_id)
    ]);
    
    console.log('🔍 [ValidateAddress] 账户信息获取结果:', {
      accountSuccess: accountInfo?.success,
      resourceSuccess: resourceInfo?.success,
      usdtSuccess: usdtBalance?.success
    });
    
    if (!accountInfo.success) {
      return res.status(400).json({
        success: false,
        message: `获取账户信息失败: ${accountInfo.error}`
      });
    }
    
    if (!resourceInfo.success) {
      return res.status(400).json({
        success: false,
        message: `获取账户资源信息失败: ${resourceInfo.error}`
      });
    }
    
    // 获取合约地址信息
    const contractInfo = await getNetworkUSDTContract(network_id);
    console.log('🔍 [ValidateAddress] 获取合约地址信息:', contractInfo);
    console.log('🔍 [ValidateAddress] 即将返回的contractInfo:', contractInfo.address ? {
      address: contractInfo.address,
      decimals: contractInfo.decimals,
      type: contractInfo.type || 'TRC20',
      symbol: contractInfo.symbol || 'USDT',
      name: contractInfo.name || 'USDT'
    } : null);
    
    // 计算单位成本（基于TRON官方定价）
    // 1 TRX = 1,000,000 sun
    // 能量单价 = 100 sun = 0.0001 TRX
    // 带宽单价 = 1,000 sun = 0.001 TRX
    const ENERGY_COST_PER_UNIT = 100; // 100 sun per energy unit
    const BANDWIDTH_COST_PER_UNIT = 1000; // 1000 sun per bandwidth unit
    const SUN_TO_TRX = 1000000; // 1 TRX = 1,000,000 sun
    
    const costPerEnergy = ENERGY_COST_PER_UNIT / SUN_TO_TRX; // 0.0001 TRX per energy
    const costPerBandwidth = BANDWIDTH_COST_PER_UNIT / SUN_TO_TRX; // 0.001 TRX per bandwidth
    
    const result = {
      address: address,
      balance: accountInfo.data.balance || 0,
      usdtBalance: Number((usdtBalance.balance || 0).toFixed(6)), // 保证六位小数，与USDT合约精度一致
      energy: {
        total: resourceInfo.data.energy.limit || 0,
        available: resourceInfo.data.energy.available,
        used: resourceInfo.data.energy.used
      },
      bandwidth: {
        total: resourceInfo.data.bandwidth.limit || 0,
        available: resourceInfo.data.bandwidth.available || 0,
        used: resourceInfo.data.bandwidth.used || 0
      },
      frozenInfo: accountInfo.data.frozen || [],
      estimatedCostPerEnergy: Number(costPerEnergy.toFixed(6)), // 保证六位小数精度
      estimatedCostPerBandwidth: Number(costPerBandwidth.toFixed(6)), // 带宽单位成本
      contractInfo: contractInfo.address ? {
        address: contractInfo.address,
        decimals: contractInfo.decimals,
        type: contractInfo.type || 'TRC20',
        symbol: contractInfo.symbol || 'USDT',
        name: contractInfo.name || 'USDT'
      } : null,
      networkInfo: {
        id: network_id,
        name: network.name,
        type: network.network_type,
        rpcUrl: network.rpc_url
      },
      isValid: true,
      usdtInfo: usdtBalance.error ? { error: usdtBalance.error } : null // 添加USDT错误信息
    };
    
    res.json({
      success: true,
      data: result,
      message: '账户验证成功'
    });
    
  } catch (error) {
    console.error('❌ [ValidateAddress] 验证TRON地址出现未捕获异常:', error);
    console.error('❌ [ValidateAddress] 异常详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({
      success: false,
      message: `验证TRON地址失败: ${error.message}`
    });
  }
});

export default router;
