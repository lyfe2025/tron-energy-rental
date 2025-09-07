import { Router } from 'express';
import { energyPoolService } from '../../services/energy-pool';

const router: Router = Router();

/**
 * 获取所有能量池账户（包括已停用的）
 * 所有账户支持所有网络，不再按网络过滤
 * 保留network_id参数用于兼容性，但不影响返回结果
 */
router.get('/', async (req, res) => {
  try {
    const { network_id } = req.query;
    
    console.log('🔍 [EnergyPool] 获取账户列表，当前网络:', network_id || '未指定');
    
    const accounts = await energyPoolService.getAllPoolAccounts();
    
    // 账户网络无关性：所有账户都支持所有网络
    // 不再按network_id过滤，返回所有可用账户
    console.log(`🔍 [EnergyPool] 返回所有账户: ${accounts.length} 个账户（支持所有网络）`);
    
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { include_private_key } = req.query;
    
    const account = await energyPoolService.getPoolAccountById(id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Pool account not found'
      });
    }
    
    // 根据查询参数决定是否隐藏私钥信息
    let responseAccount;
    if (include_private_key === 'true') {
      // 编辑模式：返回真实私钥
      console.log('🔒 [EnergyPool] 编辑模式：返回完整账户信息（包含私钥）');
      responseAccount = account;
    } else {
      // 普通查看模式：隐藏私钥
      responseAccount = {
        ...account,
        private_key_encrypted: '***'
      };
    }
    
    res.json({
      success: true,
      data: responseAccount
    });
  } catch (error) {
    console.error('Get pool account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pool account'
    });
  }
});

export default router;
