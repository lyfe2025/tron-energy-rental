import { Router } from 'express';
import { query } from '../config/database.js';

const router = Router();

// 在文件顶部添加新的合约地址获取函数
/**
 * 从数据库获取指定网络的USDT合约地址
 * @param networkId - 网络ID
 * @returns 合约地址信息
 */
async function getNetworkUSDTContract(networkId: string): Promise<{ address: string | null; decimals: number }> {
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
        type: contract.type
      });
      return {
        address: contract.address,
        decimals: contract.decimals || 6
      };
    }
    
    console.warn('⚠️ [Contract] 未找到网络USDT合约地址:', networkId);
    return { address: null, decimals: 6 };
  } catch (error) {
    console.error('❌ [Contract] 获取网络合约地址失败:', error);
    return { address: null, decimals: 6 };
  }
}

/**
 * 修改后的getUSDTBalance函数 - 从数据库读取合约地址
 * @param address - TRON账户地址
 * @param networkId - 网络ID (而不是rpcUrl)
 */
async function getUSDTBalance(address: string, networkId: string): Promise<{ success: boolean; balance: number; error?: string }> {
  try {
    console.log('🔍 [USDT Balance] 开始获取USDT余额:', { address, networkId });
    
    // 从数据库获取网络信息
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
    const rpcUrl = network.rpc_url;
    
    // 获取USDT合约地址配置
    const usdtContract = await getNetworkUSDTContract(networkId);
    if (!usdtContract.address) {
      return {
        success: false,
        balance: 0,
        error: `USDT contract address not configured for network: ${network.name}`
      };
    }
    
    console.log('✅ [USDT Balance] 获取到网络配置:', {
      networkName: network.name,
      networkType: network.network_type,
      rpcUrl: rpcUrl,
      contractAddress: usdtContract.address,
      decimals: usdtContract.decimals
    });
    
    // 尝试直接通过合约调用获取余额
    try {
      const tronWebModule = await import('tronweb');
      let TronWeb;
      if (typeof tronWebModule.default === 'function') {
        TronWeb = tronWebModule.default;
      } else if (typeof tronWebModule.TronWeb === 'function') {
        TronWeb = tronWebModule.TronWeb;
      } else {
        throw new Error('TronWeb library not available');
      }
      
      const tronWeb = new TronWeb({
        fullHost: rpcUrl,
        headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || '' }
      });
      
      // 验证地址格式
      if (!tronWeb.isAddress(address)) {
        return {
          success: false,
          balance: 0,
          error: 'Invalid TRON address'
        };
      }
      
      console.log('📞 [USDT Balance] 尝试通过TronWeb合约调用获取余额');
      
      // 尝试调用合约获取余额
      const contract = await tronWeb.contract().at(usdtContract.address);
      const result = await contract.balanceOf(address).call();
      const balance = Number(result) / Math.pow(10, usdtContract.decimals);
      
      console.log('✅ [USDT Balance] TronWeb调用成功:', { balance });
      return {
        success: true,
        balance: balance
      };
      
    } catch (contractError) {
      console.log('⚠️ [USDT Balance] TronWeb合约调用失败，尝试TronGrid API:', contractError.message);
      
      // 如果合约调用失败，回退到TronGrid API
      return await getUSDTBalanceFromTronGrid(address, rpcUrl, usdtContract.address);
    }
    
  } catch (error) {
    console.error('❌ [USDT Balance] 获取USDT余额失败:', error);
    return {
      success: false,
      balance: 0,
      error: error.message
    };
  }
}

// 其余函数保持不变...
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
    
    console.log('🌐 [TronGrid] 使用TronGrid v1 API查询USDT余额:', { address, contractAddress, gridApiUrl });
    
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

export default router;
