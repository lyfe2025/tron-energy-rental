import { Router } from 'express';
import { energyPoolService } from '../../services/energy-pool';
import { tronService } from '../../services/tron/TronService';

const router: Router = Router();

/**
 * 添加新的能量池账户（自动获取TRON数据）
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      tron_address,
      private_key_encrypted,
      account_type = 'own_energy',
      priority = 50,
      description,
      daily_limit,
      monthly_limit,
      status = 'active'
    } = req.body;
    
    // 验证必需字段
    if (!name || !tron_address || !private_key_encrypted) {
      return res.status(400).json({
        success: false,
        message: '缺少必需字段: name, tron_address, private_key_encrypted'
      });
    }
    
    // 验证TRON地址格式
    if (!tronService.isValidAddress(tron_address)) {
      return res.status(400).json({
        success: false,
        message: '无效的TRON地址格式'
      });
    }
    
    // 验证私钥格式
    if (!/^[0-9a-fA-F]{64}$/.test(private_key_encrypted)) {
      return res.status(400).json({
        success: false,
        message: '无效的私钥格式（需要64位十六进制字符）'
      });
    }
    
    console.log(`🔍 [EnergyPool] 开始获取TRON账户信息: ${tron_address}`);
    
    // 从TRON网络获取账户信息
    const [accountInfo, resourceInfo] = await Promise.all([
      tronService.getAccount(tron_address),
      tronService.getAccountResources(tron_address)
    ]);
    
    if (!accountInfo.success) {
      console.log(`❌ [EnergyPool] 获取账户信息失败: ${accountInfo.error}`);
      return res.status(400).json({
        success: false,
        message: `获取账户信息失败: ${accountInfo.error}`
      });
    }
    
    if (!resourceInfo.success) {
      console.log(`❌ [EnergyPool] 获取资源信息失败: ${resourceInfo.error}`);
      return res.status(400).json({
        success: false,
        message: `获取账户资源信息失败: ${resourceInfo.error}`
      });
    }
    
    // 计算能量相关数据
    const energyLimit = resourceInfo.data.energy.limit || 0;
    const availableEnergy = resourceInfo.data.energy.available || 0;
    
    // 计算单位成本
    const totalFrozen = accountInfo.data.frozen?.reduce((sum, f) => sum + (f.frozen_balance || 0), 0) || 0;
    let costPerEnergy = 0.001; // 默认成本
    
    if (totalFrozen > 0 && energyLimit > 0) {
      // 基于冻结TRX计算成本（简化计算）
      costPerEnergy = (totalFrozen / 1000000) / energyLimit;
    }
    
    console.log(`✅ [EnergyPool] TRON账户信息获取成功:`, {
      total_energy: energyLimit,
      available_energy: availableEnergy,
      cost_per_energy: costPerEnergy
    });
    
    // 创建账户数据
    const accountData = {
      name: name.trim(),
      tron_address,
      private_key_encrypted,
      total_energy: energyLimit,
      available_energy: availableEnergy,
      reserved_energy: 0,
      total_bandwidth: resourceInfo.data.bandwidth.limit || 0,
      available_bandwidth: resourceInfo.data.bandwidth.available || 0,
      cost_per_energy: costPerEnergy,
      status,
      account_type,
      priority,
      description: description?.trim() || null,
      daily_limit,
      monthly_limit
    };
    
    console.log(`💾 [EnergyPool] 准备保存账户数据:`, accountData);
    
    const result = await energyPoolService.addPoolAccount(accountData);
    
    console.log(`📝 [EnergyPool] addPoolAccount结果:`, result);
    
    if (!result.success) {
      console.log(`❌ [EnergyPool] 保存到数据库失败: ${result.message}`);
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
    
    const accountId = result.accountId;
    
    res.status(201).json({
      success: true,
      data: { 
        id: accountId,
        tronData: {
          total_energy: energyLimit,
          available_energy: availableEnergy,
          cost_per_energy: costPerEnergy,
          balance: accountInfo.data.balance,
          frozen_balance: totalFrozen
        }
      },
      message: '能量池账户添加成功，已自动获取TRON网络数据'
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
 * 修复私钥占位符（管理员专用）
 */
router.post('/fix-private-keys', async (req, res) => {
  try {
    const { accounts } = req.body;
    
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要修复的账户列表'
      });
    }
    
    const results = [];
    
    for (const account of accounts) {
      const { id, private_key_encrypted } = account;
      
      if (!id || !private_key_encrypted) {
        results.push({
          id,
          success: false,
          message: '缺少ID或私钥'
        });
        continue;
      }
      
      // 验证私钥格式
      if (!/^[0-9a-fA-F]{64}$/.test(private_key_encrypted)) {
        results.push({
          id,
          success: false,
          message: '私钥格式无效（需要64位十六进制）'
        });
        continue;
      }
      
      try {
        const updateResult = await energyPoolService.updatePoolAccount(id, {
          private_key_encrypted: private_key_encrypted
        });
        
        results.push({
          id,
          success: updateResult.success,
          message: updateResult.message
        });
      } catch (error) {
        results.push({
          id,
          success: false,
          message: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;
    
    res.status(200).json({
      success: true,
      message: `私钥修复完成：成功 ${successCount} 个，失败 ${failedCount} 个`,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failedCount
        }
      }
    });
    
  } catch (error) {
    console.error('修复私钥失败:', error);
    res.status(500).json({
      success: false,
      message: '修复私钥失败'
    });
  }
});

/**
 * 更新能量池账户
 */
router.put('/:id', async (req, res) => {
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
router.put('/:id/enable', async (req, res) => {
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
router.put('/:id/disable', async (req, res) => {
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
router.put('/batch/disable', async (req, res) => {
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
router.put('/batch/enable', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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
