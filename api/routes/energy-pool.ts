import { Router } from 'express';
import { energyPoolService } from '../services/energy-pool';

const router: Router = Router();

/**
 * 获取能量池统计信息
 */
router.get('/statistics', async (req, res) => {
  try {
    const result = await energyPoolService.getPoolStatistics();
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
 */
router.get('/today-consumption', async (req, res) => {
  try {
    const consumption = await energyPoolService.getTodayConsumption();
    res.json({
      success: true,
      data: consumption
    });
  } catch (error) {
    console.error('获取今日消耗统计失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取今日消耗统计失败'
    });
  }
});

/**
 * 获取所有能量池账户（包括已停用的）
 */
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await energyPoolService.getAllPoolAccounts();
    
    // 隐藏私钥信息
    const safeAccounts = accounts.map(account => ({
      ...account,
      private_key_encrypted: '***'
    }));
    
    res.json({
      success: true,
      data: safeAccounts
    });
  } catch (error) {
    console.error('Get pool accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pool accounts'
    });
  }
});

/**
 * 获取特定能量池账户详情
 */
router.get('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const account = await energyPoolService.getPoolAccountById(id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Pool account not found'
      });
    }
    
    // 隐藏私钥信息
    const safeAccount = {
      ...account,
      private_key_encrypted: '***'
    };
    
    res.json({
      success: true,
      data: safeAccount
    });
  } catch (error) {
    console.error('Get pool account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pool account'
    });
  }
});

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
 * 添加新的能量池账户
 */
router.post('/accounts', async (req, res) => {
  try {
    const {
      name,
      tron_address,
      private_key_encrypted,
      total_energy,
      available_energy,
      status = 'active'
    } = req.body;
    
    if (!name || !tron_address || !private_key_encrypted || !total_energy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, tron_address, private_key_encrypted, total_energy'
      });
    }
    
    const accountId = await energyPoolService.addPoolAccount({
      name,
      tron_address,
      private_key_encrypted,
      total_energy,
      available_energy: available_energy || total_energy,
      reserved_energy: 0,
      status
    });
    
    res.status(201).json({
      success: true,
      data: { id: accountId },
      message: 'Pool account added successfully'
    });
  } catch (error) {
    console.error('Add pool account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add pool account'
    });
  }
});

/**
 * 更新能量池账户
 */
router.put('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // 移除不允许更新的字段
    delete updates.id;
    delete updates.last_updated_at;
    delete updates.created_at;
    delete updates.updated_at;
    
    const success = await energyPoolService.updatePoolAccount(id, updates);
    
    if (success) {
      res.json({
        success: true,
        message: 'Pool account updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Pool account not found'
      });
    }
  } catch (error) {
    console.error('Update pool account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pool account'
    });
  }
});

/**
 * 启用账户
 */
router.put('/accounts/:id/enable', async (req, res) => {
  try {
    const { id } = req.params;
    
    const updatedAccount = await energyPoolService.updatePoolAccount(id, { 
      status: 'active'
    });
    
    res.json({
      success: true,
      data: updatedAccount,
      message: '账户已启用'
    });
  } catch (error) {
    console.error('启用账户失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '启用账户失败'
    });
  }
});

/**
 * 停用账户
 */
router.put('/accounts/:id/disable', async (req, res) => {
  try {
    const { id } = req.params;
    
    const updatedAccount = await energyPoolService.updatePoolAccount(id, { 
      status: 'inactive'
    });
    
    res.json({
      success: true,
      data: updatedAccount,
      message: '账户已停用'
    });
  } catch (error) {
    console.error('停用账户失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '停用账户失败'
    });
  }
});

/**
 * 批量停用账户
 */
router.put('/accounts/batch/disable', async (req, res) => {
  try {
    const { accountIds } = req.body;
    
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的账户ID列表'
      });
    }
    
    const results = await energyPoolService.batchUpdateAccounts(accountIds, { status: 'inactive' });
    
    res.json({
      success: true,
      data: results,
      message: `成功停用 ${results.successCount} 个账户`
    });
  } catch (error) {
    console.error('批量停用账户失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '批量停用账户失败'
    });
  }
});

/**
 * 批量启用账户
 */
router.put('/accounts/batch/enable', async (req, res) => {
  try {
    const { accountIds } = req.body;
    
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的账户ID列表'
      });
    }
    
    const results = await energyPoolService.batchUpdateAccounts(accountIds, { status: 'active' });
    
    res.json({
      success: true,
      data: results,
      message: `成功启用 ${results.successCount} 个账户`
    });
  } catch (error) {
    console.error('批量启用账户失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '批量启用账户失败'
    });
  }
});

/**
 * 删除账户
 */
router.delete('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await energyPoolService.deletePoolAccount(id);
    
    if (success) {
      res.json({
        success: true,
        message: '账户已删除'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '账户不存在'
      });
    }
  } catch (error) {
    console.error('删除账户失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '删除账户失败'
    });
  }
});



export default router;