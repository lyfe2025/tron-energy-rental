/**
 * TRON网络参数API路由
 * 提供不同网络的实时参数信息
 */

import { Router } from 'express';
import { networkParametersService, NetworkParametersService } from '../../services/tron/services/NetworkParametersService';

const router: Router = Router();

/**
 * 获取指定网络的参数 (无需认证，供前端质押功能使用)
 * GET /api/tron-networks/:networkId/parameters
 */
router.get('/:networkId/parameters', async (req, res) => {
  try {
    const { networkId } = req.params;
    
    // 从数据库获取网络信息
    const { pool } = req.app.locals;
    const networkResult = await pool.query(
      'SELECT * FROM tron_networks WHERE id = $1 AND is_active = true',
      [networkId]
    );

    if (networkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '网络未找到或未激活'
      });
    }

    const network = networkResult.rows[0];
    console.log(`[NetworkParameters] 获取网络参数: ${network.name} (${network.network_type})`);

    // 获取网络参数 - 传递完整的网络信息以便准确识别
    const params = await networkParametersService.getNetworkParams(network.network_type, network.rpc_url, network.name);

    res.json({
      success: true,
      data: {
        networkId,
        networkName: network.name,
        networkType: network.network_type,
        network: params.network,
        blockExplorerUrl: network.block_explorer_url,  // 添加区块浏览器URL配置
        unlockPeriod: params.unlockPeriod,
        unlockPeriodDays: Math.floor(params.unlockPeriod / 24),
        unlockPeriodText: params.unlockPeriod >= 24 
          ? `${Math.floor(params.unlockPeriod / 24)}天`
          : `${params.unlockPeriod}小时`,
        minStakeAmount: params.minStakeAmount,
        minStakeAmountTrx: params.minStakeAmount / 1000000, // 转换为TRX
        lastUpdated: params.lastUpdated,
        // TRON网络资源参数 - 基于官方文档
        totalDailyEnergy: params.totalDailyEnergy,
        totalDailyBandwidth: params.totalDailyBandwidth,
        totalStakedForEnergy: params.totalStakedForEnergy,
        totalStakedForBandwidth: params.totalStakedForBandwidth,
        energyUnitPrice: params.energyUnitPrice,
        bandwidthUnitPrice: params.bandwidthUnitPrice,
        freeBandwidthPerDay: params.freeBandwidthPerDay
      }
    });

  } catch (error) {
    console.error('[NetworkParameters] 获取网络参数失败:', error);
    res.status(500).json({
      success: false,
      error: '获取网络参数失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 获取所有活跃网络的参数
 * GET /api/tron-networks/parameters
 */
router.get('/parameters', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    
    // 获取所有活跃网络
    const networksResult = await pool.query(
      'SELECT * FROM tron_networks WHERE is_active = true ORDER BY name'
    );

    const networks = networksResult.rows;
    const allParams = [];

    // 并行获取所有网络参数
    const paramPromises = networks.map(async (network) => {
      try {
        const params = await networkParametersService.getNetworkParams(network.network_type, network.rpc_url, network.name);
        return {
          networkId: network.id,
          networkName: network.name,
          networkType: network.network_type,
          ...params,
          unlockPeriodDays: Math.floor(params.unlockPeriod / 24),
          unlockPeriodText: params.unlockPeriod >= 24 
            ? `${Math.floor(params.unlockPeriod / 24)}天`
            : `${params.unlockPeriod}小时`,
          minStakeAmountTrx: params.minStakeAmount / 1000000
        };
      } catch (error) {
        console.error(`[NetworkParameters] 获取${network.name}参数失败:`, error);
        return null;
      }
    });

    const results = await Promise.all(paramPromises);
    const validResults = results.filter(result => result !== null);

    res.json({
      success: true,
      data: validResults,
      total: validResults.length
    });

  } catch (error) {
    console.error('[NetworkParameters] 获取所有网络参数失败:', error);
    res.status(500).json({
      success: false,
      error: '获取网络参数失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 刷新网络参数缓存
 * POST /api/tron-networks/:networkId/parameters/refresh
 */
router.post('/:networkId/parameters/refresh', async (req, res) => {
  try {
    const { networkId } = req.params;
    
    // 清除缓存
    networkParametersService.clearCache();
    
    // 重新获取参数
    const { pool } = req.app.locals;
    const networkResult = await pool.query(
      'SELECT * FROM tron_networks WHERE id = $1 AND is_active = true',
      [networkId]
    );

    if (networkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '网络未找到或未激活'
      });
    }

    const network = networkResult.rows[0];
    const params = await networkParametersService.getNetworkParams(network.network_type, network.rpc_url, network.name);

    res.json({
      success: true,
      message: '网络参数已刷新',
      data: {
        networkId,
        networkName: network.name,
        ...params
      }
    });

  } catch (error) {
    console.error('[NetworkParameters] 刷新网络参数失败:', error);
    res.status(500).json({
      success: false,
      error: '刷新网络参数失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 估算质押收益
 * POST /api/tron-networks/:networkId/parameters/estimate
 */
router.post('/:networkId/parameters/estimate', async (req, res) => {
  try {
    const { networkId } = req.params;
    const { amount, resourceType } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: '质押金额必须大于0'
      });
    }

    if (!['ENERGY', 'BANDWIDTH'].includes(resourceType)) {
      return res.status(400).json({
        success: false,
        error: '资源类型必须是ENERGY或BANDWIDTH'
      });
    }

    // 获取网络信息
    const { pool } = req.app.locals;
    const networkResult = await pool.query(
      'SELECT * FROM tron_networks WHERE id = $1 AND is_active = true',
      [networkId]
    );

    if (networkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '网络未找到或未激活'
      });
    }

    const network = networkResult.rows[0];
    const params = await networkParametersService.getNetworkParams(network.network_type, network.rpc_url, network.name);

    // 使用TRON官方公式计算预估收益
    const amountInSun = amount * 1000000; // 转换为sun
    const estimatedResource = NetworkParametersService.calculateResourceAmount(
      amountInSun,
      resourceType,
      params
    );

    res.json({
      success: true,
      data: {
        networkId,
        networkName: network.name,
        networkType: network.network_type,
        input: {
          amount,
          resourceType
        },
        estimation: {
          resource: estimatedResource,
          resourceType,
          unlockPeriod: params.unlockPeriod,
          unlockPeriodText: params.unlockPeriod >= 24 
            ? `${Math.floor(params.unlockPeriod / 24)}天`
            : `${params.unlockPeriod}小时`,
          note: '实际获得的资源数量取决于当前质押量与全网质押量的比值，全网质押量时刻变化，因此实际获得的资源数量也将不断变化。'
        }
      }
    });

  } catch (error) {
    console.error('[NetworkParameters] 估算质押收益失败:', error);
    res.status(500).json({
      success: false,
      error: '估算质押收益失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
