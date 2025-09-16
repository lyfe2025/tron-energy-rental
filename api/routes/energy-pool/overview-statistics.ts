import { Router } from 'express';
import { query } from '../../database';
import { energyPoolService } from '../../services/energy-pool';

const router: Router = Router();

/**
 * 使用TronGrid API获取USDT余额（备选方案）
 */
async function getUSDTBalanceFromTronGrid(address: string, rpcUrl: string, contractAddress: string): Promise<{ success: boolean; balance: number; error?: string }> {
  try {
    const axios = (await import('axios')).default;
    
    // 构建TronGrid API端点
    let gridApiUrl;
    if (rpcUrl.includes('shasta')) {
      gridApiUrl = 'https://api.shasta.trongrid.io';
    } else if (rpcUrl.includes('nile')) {
      gridApiUrl = 'https://nile.trongrid.io';
    } else {
      gridApiUrl = 'https://api.trongrid.io';
    }
    
    console.log('🌐 [TronGrid] 使用TronGrid API查询USDT余额:', { address, contractAddress, gridApiUrl });
    
    // 使用v1 API获取账户完整信息，包含TRC20余额  
    const response = await axios.get(`${gridApiUrl}/v1/accounts/${address}`, {
      headers: {
        'TRON-PRO-API-KEY': process.env.TRON_API_KEY || ''
      },
      timeout: 10000
    });
    
    console.log('📊 [TronGrid] TronGrid v1 API响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.success && response.data.data && response.data.data.length > 0) {
      const accountData = response.data.data[0];
      
      // 查找TRC20余额
      if (accountData.trc20 && Array.isArray(accountData.trc20)) {
        for (const trc20Token of accountData.trc20) {
          // trc20Token是对象，键是合约地址，值是余额
          if (trc20Token[contractAddress]) {
            const balance = Number(trc20Token[contractAddress]) / Math.pow(10, 6); // USDT 6位小数
            console.log('✅ [TronGrid] 找到USDT余额:', balance);
            return { success: true, balance: balance };
          }
        }
      }
      
      console.log('ℹ️ [TronGrid] 未找到指定USDT合约的余额');
      return { success: true, balance: 0 };
    }
    
    console.log('⚠️ [TronGrid] TronGrid API响应格式异常');
    return { success: false, balance: 0, error: 'TronGrid API response invalid' };
    
  } catch (error) {
    console.error('❌ [TronGrid] TronGrid API调用失败:', error.message);
    return { success: false, balance: 0, error: error.message };
  }
}

/**
 * 从数据库获取指定网络的USDT合约地址配置
 * @param networkId - 网络ID
 * @returns 合约地址信息
 */
async function getNetworkUSDTContract(networkId: string): Promise<{ 
  address: string | null; 
  decimals: number;
  symbol?: string;
  type?: string;
  name?: string;
}> {
  try {
    console.log('🔍 [Contract] 获取网络合约地址:', networkId);
    
    const contractResult = await query(
      'SELECT * FROM get_network_contract_address($1, $2)',
      [networkId, 'USDT']
    );
    
    if (contractResult.rows.length > 0) {
      const contract = contractResult.rows[0];
      console.log('✅ [Contract] 找到USDT合约:', {
        address: contract.address,
        decimals: contract.decimals,
        symbol: contract.symbol,
        type: contract.type,
        name: contract.name
      });
      return {
        address: contract.address,
        decimals: contract.decimals || 6,
        symbol: contract.symbol || 'USDT',
        type: contract.type || 'TRC20',
        name: contract.name || 'USDT'
      };
    }
    
    console.warn('⚠️ [Contract] 未找到网络USDT合约地址:', networkId);
    return { address: null, decimals: 6, symbol: 'USDT', type: 'TRC20', name: 'USDT' };
  } catch (error) {
    console.error('❌ [Contract] 获取网络合约地址失败:', error);
    return { address: null, decimals: 6, symbol: 'USDT', type: 'TRC20', name: 'USDT' };
  }
}

/**
 * 新版USDT余额获取函数 - 从数据库获取合约地址配置
 * @param address - TRON账户地址
 * @param networkId - 网络ID
 */
async function getUSDTBalanceFromDatabase(address: string, networkId: string): Promise<{ success: boolean; balance: number; error?: string }> {
  try {
    console.log('🔍 [USDT Balance New] 开始获取USDT余额:', { address, networkId });
    
    // 获取网络信息
    const networkResult = await query(
      'SELECT name, network_type, rpc_url FROM tron_networks WHERE id = $1 AND is_active = true',
      [networkId]
    );
    
    if (networkResult.rows.length === 0) {
      return {
        success: false,
        balance: 0,
        error: 'Network not found or inactive'
      };
    }
    
    const network = networkResult.rows[0];
    
    // 获取USDT合约地址配置
    const usdtContract = await getNetworkUSDTContract(networkId);
    if (!usdtContract.address) {
      console.warn('⚠️ [USDT Balance New] USDT合约地址未配置，返回0余额');
      return {
        success: true,
        balance: 0,
        error: `USDT contract not configured for network: ${network.name}`
      };
    }
    
    console.log('✅ [USDT Balance New] 使用数据库配置:', {
      networkName: network.name,
      contractAddress: usdtContract.address,
      decimals: usdtContract.decimals
    });
    
    // 使用TronGrid API获取余额
    const gridResult = await getUSDTBalanceFromTronGrid(address, network.rpc_url, usdtContract.address);
    
    if (gridResult.success && gridResult.balance > 0) {
      console.log('✅ [USDT Balance New] TronGrid API成功获取USDT余额:', gridResult.balance);
      return gridResult;
    }
    
    // 如果TronGrid API失败或返回0余额，尝试使用TronWeb
    console.log('🔄 [USDT Balance New] TronGrid API未获取到余额，尝试TronWeb方法');
    const tronWebResult = await getUSDTBalance(address, network.rpc_url, usdtContract.address);
    
    if (tronWebResult.success) {
      console.log('✅ [USDT Balance New] TronWeb成功获取USDT余额:', tronWebResult.balance);
      return tronWebResult;
    }
    
    // 如果两种方法都失败，返回TronGrid的结果（可能是0余额）
    console.log('⚠️ [USDT Balance New] 所有方法都失败，返回TronGrid结果');
    return gridResult;
    
  } catch (error) {
    console.error('❌ [USDT Balance New] 获取USDT余额失败:', error);
    return {
      success: false,
      balance: 0,
      error: error.message
    };
  }
}

/**
 * 获取USDT余额的函数
 */
async function getUSDTBalance(address: string, rpcUrl: string, contractAddress?: string): Promise<{ success: boolean; balance: number; error?: string }> {
  try {
    console.log('🔍 [USDT Balance] 开始获取USDT余额:', { address, rpcUrl });
    
    // 使用ES模块方式导入TronWeb
    const tronWebModule = await import('tronweb');
    
    // 获取正确的TronWeb构造函数
    let TronWeb;
    if (typeof tronWebModule.default === 'function') {
      TronWeb = tronWebModule.default;
    } else if (typeof tronWebModule.TronWeb === 'function') {
      TronWeb = tronWebModule.TronWeb;
    } else {
      console.error('❌ [USDT Balance] TronWeb导入失败:', {
        defaultType: typeof tronWebModule.default,
        TronWebType: typeof tronWebModule.TronWeb,
        keys: Object.keys(tronWebModule)
      });
      return {
        success: true, // 不影响主流程
        balance: 0,
        error: "TronWeb library not available"
      };
    }
    
    console.log('✅ [USDT Balance] TronWeb导入成功');
    
    // 创建TronWeb实例
    const tronWeb = new TronWeb({
      fullHost: rpcUrl,
      headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || '' }
    });
    
    // 验证地址格式
    if (!tronWeb.isAddress(address)) {
      console.error('❌ [USDT Balance] 无效的TRON地址:', address);
      return {
        success: false,
        balance: 0,
        error: 'Invalid TRON address'
      };
    }
    
    // 优先使用传入的合约地址，否则根据网络类型选择USDT合约地址
    let usdtContractAddress;
    if (contractAddress) {
      usdtContractAddress = contractAddress;
      console.log('🌐 [USDT Balance] 使用传入的USDT合约地址:', usdtContractAddress);
    } else if (rpcUrl.includes('shasta')) {
      // Shasta测试网USDT合约 (官方USDT合约地址)
      usdtContractAddress = 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8';
      console.log('🌐 [USDT Balance] 使用Shasta测试网USDT合约');
    } else if (rpcUrl.includes('nile')) {
      // Nile测试网USDT合约 (实际使用的USDT合约地址)
      usdtContractAddress = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf'; 
      console.log('🌐 [USDT Balance] 使用Nile测试网USDT合约');
    } else {
      // 主网USDT合约
      usdtContractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
      console.log('🌐 [USDT Balance] 使用主网USDT合约');
    }
    
    try {
      // 获取合约实例
      const contract = await tronWeb.contract().at(usdtContractAddress);
      console.log('✅ [USDT Balance] 合约实例创建成功');
      
      // 调用 balanceOf 方法获取余额
      const balance = await contract.balanceOf(address).call();
      console.log('📊 [USDT Balance] 原始余额数据:', balance);
      
      // USDT有6位小数，需要除以10^6
      let usdtBalance = 0;
      if (balance) {
        if (typeof balance.toNumber === 'function') {
          usdtBalance = balance.toNumber() / Math.pow(10, 6);
        } else if (typeof balance === 'string' || typeof balance === 'number') {
          usdtBalance = Number(balance) / Math.pow(10, 6);
        } else if (balance._hex) {
          usdtBalance = parseInt(balance._hex, 16) / Math.pow(10, 6);
        } else if (balance.toString) {
          usdtBalance = Number(balance.toString()) / Math.pow(10, 6);
        }
      }
      
      console.log('✅ [USDT Balance] 计算后的USDT余额:', usdtBalance);
      
      return {
        success: true,
        balance: usdtBalance
      };
      
    } catch (contractError) {
      console.error('❌ [USDT Balance] 合约调用失败:', contractError.message);
      
      // 对于测试网络，使用TronGrid API作为备选方案
      if (rpcUrl.includes('shasta') || rpcUrl.includes('nile')) {
        console.log('📝 [USDT Balance] 合约调用失败，尝试使用TronGrid API查询测试网USDT余额');
        try {
          const gridBalance = await getUSDTBalanceFromTronGrid(address, rpcUrl, usdtContractAddress);
          if (gridBalance.success) {
            return gridBalance;
          }
        } catch (gridError) {
          console.error('❌ [USDT Balance] TronGrid API也失败了:', gridError);
        }
        
        // 如果所有方法都失败，返回0余额但不显示错误（测试网络可能确实没有USDT余额）
        console.log('📝 [USDT Balance] 测试网络USDT查询失败，返回0余额');
        return {
          success: true,
          balance: 0
        };
      }
      
      throw contractError;
    }
    
  } catch (error) {
    console.error('❌ [USDT Balance] 获取USDT余额失败:', {
      address,
      rpcUrl,
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: true, // 不影响主流程
      balance: 0,
      error: `USDT balance unavailable: ${error.message}`
    };
  }
}

/**
 * 获取能量池概览信息
 * GET /api/energy-pool
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, network_id } = req.query;
    
    // 获取能量池统计信息
    const statistics = await energyPoolService.getPoolStatistics(network_id as string);
    
    // 获取账户列表（支持分页和网络过滤）
    const accounts = await energyPoolService.getAllPoolAccounts();
    
    // 由于已移除network_id字段，不再进行网络过滤
    let filteredAccounts = accounts;
    
    // 分页处理
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;
    const paginatedAccounts = filteredAccounts.slice(offset, offset + limitNum);
    
    // 隐藏私钥信息
    const safeAccounts = paginatedAccounts.map(account => ({
      ...account,
      private_key_encrypted: '***'
    }));
    
    res.json({
      success: true,
      data: {
        statistics: statistics.success ? statistics.data : null,
        accounts: safeAccounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredAccounts.length,
          totalPages: Math.ceil(filteredAccounts.length / limitNum)
        }
      },
      message: 'Energy pool data retrieved successfully'
    });
  } catch (error) {
    console.error('Get energy pool overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get energy pool overview'
    });
  }
});

/**
 * 获取能量池统计信息
 */
router.get('/statistics', async (req, res) => {
  try {
    const { network_id } = req.query;
    const result = await energyPoolService.getPoolStatistics(network_id as string);
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Failed to get pool statistics'
      });
    }
  } catch (error) {
    console.error('Get pool statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pool statistics'
    });
  }
});

/**
 * 获取今日消耗统计
 * 注意：此接口已被移除，因为消耗统计功能已改为基于 TRON 实时数据
 */
router.get('/today-consumption', async (req, res) => {
  res.status(410).json({
    success: false,
    message: '此接口已被移除。消耗统计功能现在基于 TRON 实时数据，请使用相关的 TRON 数据接口。'
  });
});

/**
 * 获取可用的TRON网络列表
 */
router.get('/networks', async (req, res) => {
  try {
    console.log('🌐 [EnergyPool] 获取可用网络列表');
    
    const sql = `
      SELECT id, name, network_type, rpc_url, is_active, health_status, config
      FROM tron_networks 
      WHERE is_active = true 
      ORDER BY 
        CASE WHEN network_type = 'mainnet' THEN 1 ELSE 2 END,
        name
    `;
    
    const result = await query(sql);
    const networks = result.rows.map(network => ({
      id: network.id,
      name: network.name,
      type: network.network_type,
      rpc_url: network.rpc_url,
      is_active: network.is_active,
      health_status: network.health_status,
      config: network.config // 包含合约地址配置信息
    }));
    
    console.log(`🌐 [EnergyPool] 返回 ${networks.length} 个可用网络`);
    
    res.json({
      success: true,
      data: networks
    });
  } catch (error) {
    console.error('Get networks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get networks'
    });
  }
});

// 导出辅助函数供其他模块使用
export {
  getNetworkUSDTContract, getUSDTBalance, getUSDTBalanceFromDatabase, getUSDTBalanceFromTronGrid
};

export default router;
