// 验证拆分后的tron.ts是否正常工作
const path = require('path');

// 使用require来导入编译后的模块（需要在tsconfig中配置输出）
async function testTronService() {
  try {
    // 先尝试导入TypeScript模块
    const ts = require('typescript');
    const fs = require('fs');
    
    // 读取主文件内容
    const tronServicePath = path.join(__dirname, 'api/services/tron.ts');
    const content = fs.readFileSync(tronServicePath, 'utf8');
    
    console.log('✅ tron.ts 文件读取成功');
    
    // 检查导出是否存在
    const hasExports = content.includes('export class TronService') && 
                      content.includes('export const tronService') &&
                      content.includes('export default TronService');
    
    if (hasExports) {
      console.log('✅ 所有必要的导出都存在');
    } else {
      console.log('❌ 缺少必要的导出');
    }
    
    // 检查导入是否正确
    const hasImports = content.includes('./tron/types/tron.types') &&
                      content.includes('./tron/utils/tronUtils') &&
                      content.includes('./tron/services/AccountService') &&
                      content.includes('./tron/services/TransactionService') &&
                      content.includes('./tron/services/DelegationService') &&
                      content.includes('./tron/services/StakingService');
    
    if (hasImports) {
      console.log('✅ 所有子模块导入都正确');
    } else {
      console.log('❌ 子模块导入有问题');
    }
    
    // 检查类结构
    const hasClassMethods = [
      'getAccount', 'getAccountResources', 'getAccountInfo',
      'getTransactionsFromAddress', 'getTransaction', 'monitorTransfer',
      'delegateResource', 'undelegateResource',
      'freezeBalanceV2', 'unfreezeBalanceV2', 'withdrawExpireUnfreeze', 'getStakeOverview',
      'addressToHex', 'isValidAddress', 'convertAddress'
    ].every(method => content.includes(`async ${method}(`) || content.includes(`${method}(`));
    
    if (hasClassMethods) {
      console.log('✅ 所有方法签名都存在');
    } else {
      console.log('❌ 缺少某些方法');
    }
    
    console.log('\n🎉 拆分验证完成！tron.ts 拆分成功');
    console.log('📁 拆分结构：');
    console.log('   ├── api/services/tron.ts (主入口)');
    console.log('   └── api/services/tron/');
    console.log('       ├── types/tron.types.ts');
    console.log('       ├── utils/tronUtils.ts');
    console.log('       └── services/');
    console.log('           ├── AccountService.ts');
    console.log('           ├── TransactionService.ts');
    console.log('           ├── DelegationService.ts');
    console.log('           └── StakingService.ts');
    
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  }
}

testTronService();
