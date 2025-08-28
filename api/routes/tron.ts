import { Router } from 'express';
import { energyPoolService } from '../services/energy-pool';
import { tronService } from '../services/tron';

const router = Router();

/**
 * 获取账户信息
 */
router.get('/account/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!tronService.isValidAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid TRON address'
      });
    }
    
    const accountInfo = await tronService.getAccountInfo(address);
    
    res.json({
      success: true,
      data: accountInfo
    });
  } catch (error) {
    console.error('Get account info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account info'
    });
  }
});

/**
 * 获取账户资源信息
 */
router.get('/resources/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!tronService.isValidAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid TRON address'
      });
    }
    
    const resources = await tronService.getAccountResources(address);
    
    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    console.error('Get account resources error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account resources'
    });
  }
});

/**
 * 委托能量资源
 */
router.post('/delegate', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount, duration } = req.body;
    
    // 验证参数
    if (!fromAddress || !toAddress || !amount || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    if (!tronService.isValidAddress(fromAddress) || !tronService.isValidAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid TRON address'
      });
    }
    
    // 执行委托
    const result = await tronService.delegateResource({
      ownerAddress: fromAddress,
      receiverAddress: toAddress,
      balance: amount,
      resource: 'ENERGY',
      lock: true,
      lockPeriod: duration
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          txId: result.txid,
          message: 'Energy delegation successful'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Delegation failed'
      });
    }
  } catch (error) {
    console.error('Delegate energy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delegate energy'
    });
  }
});

/**
 * 取消委托能量资源
 */
router.post('/undelegate', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount } = req.body;
    
    // 验证参数
    if (!fromAddress || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    if (!tronService.isValidAddress(fromAddress) || !tronService.isValidAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid TRON address'
      });
    }
    
    // 执行取消委托
    const result = await tronService.undelegateResource({
      ownerAddress: fromAddress,
      receiverAddress: toAddress,
      balance: amount,
      resource: 'ENERGY'
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          txId: result.txid,
          message: 'Energy undelegation successful'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Undelegation failed'
      });
    }
  } catch (error) {
    console.error('Undelegate energy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to undelegate energy'
    });
  }
});

/**
 * 获取交易信息
 */
router.get('/transaction/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    
    const transaction = await tronService.getTransaction(txId);
    
    if (transaction) {
      res.json({
        success: true,
        data: transaction
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction'
    });
  }
});

/**
 * 验证地址格式
 */
router.post('/validate-address', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }
    
    const isValid = tronService.isValidAddress(address);
    const hexAddress = isValid ? tronService.addressToHex(address) : null;
    
    res.json({
      success: true,
      data: {
        isValid,
        address,
        hexAddress
      }
    });
  } catch (error) {
    console.error('Validate address error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate address'
    });
  }
});

/**
 * 获取能量池状态
 */
router.get('/energy-pools', async (req, res) => {
  try {
    const pools = await energyPoolService.getActivePoolAccounts();
    
    res.json({
      success: true,
      data: pools
    });
  } catch (error) {
    console.error('Get energy pools error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get energy pools'
    });
  }
});

/**
 * 获取能量池统计
 */
router.get('/energy-pools/stats', async (req, res) => {
  try {
    const stats = await energyPoolService.getPoolStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get energy pool stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get energy pool stats'
    });
  }
});

/**
 * 优化能量分配
 */
router.post('/optimize-allocation', async (req, res) => {
  try {
    const { energyAmount } = req.body;
    
    if (!energyAmount || energyAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid energy amount is required'
      });
    }
    
    const optimization = await energyPoolService.optimizeEnergyAllocation(energyAmount);
    
    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    console.error('Optimize allocation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize allocation'
    });
  }
});

export default router;