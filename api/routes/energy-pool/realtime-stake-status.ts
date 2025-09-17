import { Router } from 'express';
import { query } from '../../database';
import { TronGridProvider } from '../../services/tron/staking/providers/TronGridProvider';

const router: Router = Router();


/**
 * 获取账户实时质押状态
 * GET /api/energy-pool/accounts/:address/stake-status
 */
router.get('/:address/stake-status', async (req, res) => {
  try {
    const { address } = req.params;
    const { network_id } = req.query;

    console.log('🔍 [RealtimeStakeStatus] 获取账户质押状态:', {
      address,
      networkId: network_id
    });

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    console.log('🔍 [RealtimeStakeStatus] 获取账户质押状态:', {
      address,
      networkId: network_id
    });

    // 获取网络配置
    let networkConfig = null;
    if (network_id) {
      const networkResult = await query(
        'SELECT id, name, network_type, rpc_url, config FROM tron_networks WHERE id = $1 AND is_active = true',
        [network_id]
      );
      
      if (networkResult.rows.length > 0) {
        const network = networkResult.rows[0];
        networkConfig = {
          id: network.id,
          name: network.name,
          type: network.network_type,
          rpcUrl: network.rpc_url,
          isMainnet: network.network_type === 'mainnet',
          config: network.config || {}
        };
        
        console.log('🌐 [RealtimeStakeStatus] 使用网络配置:', networkConfig);
      }
    }

    // 创建 TronGrid Provider
    const tronGridProvider = new TronGridProvider(networkConfig);

    // 获取账户质押状态
    const stakeStatusResponse = await tronGridProvider.getAccountStakeStatus(address);

    if (stakeStatusResponse.success) {
      console.log('✅ [RealtimeStakeStatus] 成功获取质押状态:', stakeStatusResponse.data);
      
      res.json({
        success: true,
        data: {
          address,
          stakeStatus: stakeStatusResponse.data,
          networkInfo: networkConfig ? {
            id: networkConfig.id,
            name: networkConfig.name,
            type: networkConfig.type
          } : null,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.warn('⚠️ [RealtimeStakeStatus] 获取质押状态失败:', stakeStatusResponse.error);
      
      res.status(500).json({
        success: false,
        message: stakeStatusResponse.error || 'Failed to get stake status',
        data: {
          address,
          stakeStatus: {
            unlockingTrx: 0,
            withdrawableTrx: 0,
            stakedEnergy: 0,
            stakedBandwidth: 0,
            delegatedEnergy: 0,
            delegatedBandwidth: 0
          },
          networkInfo: networkConfig ? {
            id: networkConfig.id,
            name: networkConfig.name,
            type: networkConfig.type
          } : null,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('❌ [RealtimeStakeStatus] 获取质押状态异常:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while getting stake status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 批量获取多个账户的实时质押状态
 * POST /api/energy-pool/accounts/batch-stake-status
 */
router.post('/batch-stake-status', async (req, res) => {
  try {
    const { addresses, network_id } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Addresses array is required'
      });
    }

    if (addresses.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 addresses allowed per batch request'
      });
    }

    console.log('🔍 [RealtimeStakeStatus] 批量获取质押状态:', {
      addressCount: addresses.length,
      networkId: network_id
    });

    // 获取网络配置
    let networkConfig = null;
    if (network_id) {
      const networkResult = await query(
        'SELECT id, name, network_type, rpc_url, config FROM tron_networks WHERE id = $1 AND is_active = true',
        [network_id]
      );
      
      if (networkResult.rows.length > 0) {
        const network = networkResult.rows[0];
        networkConfig = {
          id: network.id,
          name: network.name,
          type: network.network_type,
          rpcUrl: network.rpc_url,
          isMainnet: network.network_type === 'mainnet',
          config: network.config || {}
        };
      }
    }

    // 创建 TronGrid Provider
    const tronGridProvider = new TronGridProvider(networkConfig);

    // 并行获取所有账户的质押状态
    const stakeStatusPromises = addresses.map(async (address: string) => {
      try {
        const result = await tronGridProvider.getAccountStakeStatus(address);
        return {
          address,
          success: result.success,
          data: result.data,
          error: result.error
        };
      } catch (error) {
        return {
          address,
          success: false,
          data: {
            unlockingTrx: 0,
            withdrawableTrx: 0,
            stakedEnergy: 0,
            stakedBandwidth: 0,
            delegatedEnergy: 0,
            delegatedBandwidth: 0
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const results = await Promise.all(stakeStatusPromises);

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ [RealtimeStakeStatus] 批量获取完成: ${successCount}/${addresses.length} 成功`);

    res.json({
      success: true,
      data: {
        results,
        networkInfo: networkConfig ? {
          id: networkConfig.id,
          name: networkConfig.name,
          type: networkConfig.type
        } : null,
        summary: {
          total: addresses.length,
          success: successCount,
          failed: addresses.length - successCount
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ [RealtimeStakeStatus] 批量获取质押状态异常:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while getting batch stake status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
