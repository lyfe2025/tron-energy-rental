import { query } from '../../database/index';
import { orderLogger } from '../../utils/logger';
import { getNetworkName, getOrderService } from './utils';

export class FlashRentPaymentService {

  /**
   * 处理能量闪租支付
   * @param transaction - 交易详情
   * @param networkId - 网络ID
   */
  async handleFlashRentPayment(transaction: any, networkId: string): Promise<void> {
    // 获取网络名称用于日志显示
    const networkName = await getNetworkName(networkId);
    
    try {
      // 5. 验证交易有效性
      orderLogger.info(`   5. 验证交易有效性`, {
        txId: transaction.txID,
        networkName,
        step: 5
      });

      if (!this.validateFlashRentTransaction(transaction)) {
        orderLogger.warn(`   ❌ 交易验证失败`, {
          txId: transaction.txID,
          networkName,
          step: 5,
          status: 'validation_failed'
        });
        return;
      }

      orderLogger.info(`   ✅ 交易验证通过`, {
        txId: transaction.txID,
        networkName,
        step: 5,
        status: 'validation_passed'
      });

      const { from: fromAddress, amount: trxAmount } = transaction;
      
      // 6. 创建闪租订单
      orderLogger.info(`   6. 创建闪租订单`, {
        txId: transaction.txID,
        networkName,
        fromAddress,
        amount: `${trxAmount} TRX`,
        step: 6
      });

      // 调用OrderService创建闪租订单
      const orderService = await getOrderService();
      const order = await orderService.createFlashRentOrder(fromAddress, trxAmount, networkId, transaction.txID);
      
      orderLogger.info(`   ✅ 闪租订单创建成功: ${order.order_number}`, {
        txId: transaction.txID,
        orderId: order.id,
        orderNumber: order.order_number,
        energyAmount: order.energy_amount,
        networkName,
        step: 6,
        status: 'order_created'
      });
      
    } catch (error) {
      orderLogger.error(`❌ 闪租支付处理失败`, {
        txId: transaction.txID,
        networkName,
        error: error.message,
        stack: error.stack,
        fromAddress: transaction.from,
        amount: `${transaction.amount} TRX`,
        status: 'processing_failed'
      });
      
      // 记录失败的交易处理
      await this.logFailedFlashRentPayment(transaction, networkId, error);
    }
  }

  /**
   * 验证闪租交易的有效性
   */
  private validateFlashRentTransaction(transaction: any): boolean {
    try {
      // 检查基本字段
      if (!transaction.txID || !transaction.from || !transaction.to || !transaction.amount) {
        return false;
      }

      // 检查金额是否为正数
      if (transaction.amount <= 0) {
        return false;
      }

      // 检查交易是否已确认
      if (!transaction.confirmed) {
        return false;
      }

      // 检查交易时间是否过新（避免处理过旧的交易）
      const maxAge = 3600000; // 1小时
      const transactionAge = Date.now() - transaction.timestamp;
      if (transactionAge > maxAge) {
        console.log(`Transaction too old: ${transaction.txID}, age: ${transactionAge}ms`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Transaction validation error:', error);
      return false;
    }
  }

  /**
   * 记录失败的闪租支付处理
   */
  private async logFailedFlashRentPayment(
    transaction: any, 
    networkId: string, 
    error: any
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO failed_flash_rent_payments (
          tx_id, from_address, amount, network_id, error_message, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          transaction.txID,
          transaction.from,
          transaction.amount,
          networkId,
          error.message || 'Unknown error',
          new Date()
        ]
      );
    } catch (logError) {
      console.error('Failed to log failed flash rent payment:', logError);
    }
  }
}
