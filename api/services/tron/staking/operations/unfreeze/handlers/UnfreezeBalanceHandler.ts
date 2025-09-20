import type {
    UnfreezeBalanceV2Params,
    UnfreezeOperationResult
} from '../../../types/staking.types';
import { AddressConverter } from '../utils/AddressConverter';
import { UnfreezeCalculator } from '../utils/UnfreezeCalculator';
import { UnfreezeValidator } from '../validators/UnfreezeValidator';

/**
 * 解质押余额处理器
 * 负责处理解质押交易的构建、签名和广播
 */
export class UnfreezeBalanceHandler {
  private tronWeb: any;
  private validator: UnfreezeValidator;
  private addressConverter: AddressConverter;
  private calculator: UnfreezeCalculator;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
    this.validator = new UnfreezeValidator(tronWeb);
    this.addressConverter = new AddressConverter(tronWeb);
    this.calculator = new UnfreezeCalculator(tronWeb);
  }

  /**
   * 执行解质押操作 - 完整生命周期日志版本
   * 参考: https://developers.tron.network/reference/unfreezebalancev2-1
   */
  async executeUnfreeze(
    params: UnfreezeBalanceV2Params, 
    networkUnlockPeriod?: number
  ): Promise<UnfreezeOperationResult> {
    const startTime = Date.now();
    console.log('\n' + '='.repeat(80));
    console.log('🚀 [TRON解质押交易生命周期] 开始执行 UnfreezeBalanceV2');
    console.log('='.repeat(80));
    
    try {
      const { ownerAddress, unfreezeBalance, resource } = params;

      // ==================== 第1步：参数验证和预处理 ====================
      console.log('\n📋 [步骤1/8] 参数验证和预处理:');
      console.log('  原始参数:', {
        ownerAddress,
        unfreezeBalance: `${unfreezeBalance} SUN (${unfreezeBalance / 1000000} TRX)`,
        resource: resource,
        timestamp: new Date().toISOString()
      });

      // 验证参数
      this.validator.validateUnfreezeParams(params);
      console.log('  ✅ 参数验证通过');

      // ==================== 第2步：地址格式转换 ====================
      console.log('\n🔄 [步骤2/8] 地址格式转换:');
      const ownerBase58 = this.addressConverter.convertToBase58Address(ownerAddress);
      
      console.log('  地址转换结果:', {
        '输入地址': ownerAddress,
        '输出地址': ownerBase58,
        '格式检查': ownerBase58.startsWith('T') ? '✅ Base58格式正确' : '❌ 格式错误',
        '长度检查': ownerBase58.length === 34 ? '✅ 长度正确(34)' : `❌ 长度错误(${ownerBase58.length})`
      });

      this.validator.validateAddress(ownerBase58);

      // ==================== 第3步：获取网络信息 ====================
      console.log('\n🌐 [步骤3/8] 获取网络信息:');
      console.log('  网络解锁期:', {
        '解锁期(毫秒)': networkUnlockPeriod,
        '解锁期(小时)': networkUnlockPeriod ? networkUnlockPeriod / (1000 * 60 * 60) : '未知',
        '解锁期(天)': networkUnlockPeriod ? networkUnlockPeriod / (1000 * 60 * 60 * 24) : '未知'
      });

      // ==================== 第4步：构建交易 ====================
      console.log('\n🏗️ [步骤4/8] 构建UnfreezeBalanceV2交易:');
      console.log('  调用TronWeb API:', {
        '方法': 'tronWeb.transactionBuilder.unfreezeBalanceV2',
        '参数1-金额': `${unfreezeBalance} SUN`,
        '参数2-资源': resource,
        '参数3-地址': ownerBase58,
        '参数4-选项': '{ visible: true }',
        '官方文档': 'https://developers.tron.network/reference/unfreezebalancev2-1'
      });
      
      const transactionBuildStart = Date.now();
      const transaction = await this.tronWeb.transactionBuilder.unfreezeBalanceV2(
        unfreezeBalance,  // amount (number) - 金额，单位为SUN
        resource,         // resource (string) - ENERGY 或 BANDWIDTH  
        ownerBase58,      // address (string) - Base58地址格式
        { visible: true } // options - 指定使用Base58地址格式
      );
      const transactionBuildTime = Date.now() - transactionBuildStart;

      console.log('  ✅ 交易构建完成:', {
        '耗时': `${transactionBuildTime}ms`,
        '交易哈希': transaction.txID || '待签名',
        '交易大小': JSON.stringify(transaction).length + ' 字节',
        'visible参数': transaction.visible || false
      });

      // ==================== 第5步：签名交易 ====================
      console.log('\n✍️ [步骤5/8] 签名交易:');
      const signStart = Date.now();
      
      try {
        const signedTransaction = await this.tronWeb.trx.sign(transaction);
        const signTime = Date.now() - signStart;
        
        console.log('  ✅ 交易签名完成:', {
          '耗时': `${signTime}ms`,
          '签名哈希': signedTransaction.txID,
          '签名长度': signedTransaction.signature?.[0]?.length || 0,
          '签名数量': signedTransaction.signature?.length || 0
        });

        // ==================== 第6步：广播交易 ====================
        console.log('\n📡 [步骤6/8] 广播交易到TRON网络:');
        const broadcastStart = Date.now();
        
        const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
        const broadcastTime = Date.now() - broadcastStart;
        
        console.log('  广播结果:', {
          '耗时': `${broadcastTime}ms`,
          '成功': result.result || false,
          '交易ID': result.txid || result.transaction?.txID,
          '能量消耗': result.energy_used || '未知',
          '带宽消耗': result.net_used || '未知',
          '错误信息': result.message || '无'
        });

        // ==================== 第7步：处理结果 ====================
        console.log('\n🎯 [步骤7/8] 处理交易结果:');
        
        if (result.result) {
          const unfreezeTime = new Date();
          const expireTime = this.calculator.calculateExpireTime(unfreezeTime, networkUnlockPeriod);

          console.log('  ✅ 解质押交易成功:', {
            '交易ID': result.txid,
            '解质押时间': unfreezeTime.toISOString(),
            '预计可提取时间': expireTime.toISOString(),
            '等待期': networkUnlockPeriod ? `${networkUnlockPeriod / (1000 * 60 * 60 * 24)}天` : '14天(默认)',
            '能量消耗': result.energy_used || 0,
            '带宽消耗': result.net_used || 0
          });

          // ==================== 第8步：生命周期总结 ====================
          const totalTime = Date.now() - startTime;
          console.log('\n📊 [步骤8/8] 交易生命周期总结:');
          console.log('  性能指标:', {
            '总耗时': `${totalTime}ms`,
            '构建交易': `${transactionBuildTime}ms`,
            '签名交易': `${signTime}ms`,
            '广播交易': `${broadcastTime}ms`,
            '平均TPS': `${(1000 / totalTime).toFixed(2)} 交易/秒`
          });

          console.log('\n' + '='.repeat(80));
          console.log('🎉 [TRON解质押交易生命周期] 成功完成');
          console.log('='.repeat(80) + '\n');

          return {
            success: true,
            txid: result.txid,
            energyUsed: result.energy_used,
            netUsed: result.net_used,
            unfreezeTime,
            expireTime
          };
        } else {
          // 处理失败情况
          console.log('  ❌ 解质押交易失败:', {
            '错误代码': result.code || '未知',
            '错误信息': result.message || 'Unfreeze transaction failed',
            '详细错误': result
          });

          console.log('\n' + '='.repeat(80));
          console.log('❌ [TRON解质押交易生命周期] 交易失败');
          console.log('='.repeat(80) + '\n');

          return {
            success: false,
            error: result.message || 'Unfreeze transaction failed'
          };
        }

      } catch (signError: any) {
        console.log('  ❌ 交易签名失败:', {
          '错误类型': signError.constructor.name,
          '错误信息': signError.message,
          '错误堆栈': signError.stack?.split('\n').slice(0, 3)
        });
        throw signError;
      }

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.log('\n💥 [解质押异常处理]:');
      console.log('  异常详情:', {
        '错误类型': error.constructor.name,
        '错误信息': error.message,
        '发生时间': new Date().toISOString(),
        '总耗时': `${totalTime}ms`,
        '错误堆栈': error.stack?.split('\n').slice(0, 5)
      });

      console.log('\n' + '='.repeat(80));
      console.log('💥 [TRON解质押交易生命周期] 异常终止');
      console.log('='.repeat(80) + '\n');

      return {
        success: false,
        error: error.message
      };
    }
  }
}
