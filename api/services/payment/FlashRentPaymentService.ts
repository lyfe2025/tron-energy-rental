import { query } from '../../database/index';
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
      // 🔍 步骤5: 验证交易有效性
      console.log(`🔍 [${networkName}] 步骤5: 开始验证闪租交易 - ${transaction.txID}`, {
        txID: transaction.txID,
        fromAddress: transaction.from,
        toAddress: transaction.to,
        amount: `${transaction.amount} TRX`,
        networkId: networkId
      });

      if (!this.validateFlashRentTransaction(transaction)) {
        console.warn(`❌ [${networkName}] 步骤5: 交易验证失败 - ${transaction.txID} (无效的闪租交易)`);
        return;
      }

      console.log(`✅ [${networkName}] 步骤5: 交易验证通过 - ${transaction.txID}`);

      const { from: fromAddress, amount: trxAmount } = transaction;
      
      // 📦 步骤6: 创建闪租订单
      console.log(`📦 [${networkName}] 步骤6: 开始创建闪租订单 - ${transaction.txID}`, {
        fromAddress: fromAddress,
        trxAmount: `${trxAmount} TRX`,
        networkId: networkId,
        expectedOrderType: 'FLASH_RENT'
      });

      // 调用OrderService创建闪租订单
      const orderService = await getOrderService();
      const order = await orderService.createFlashRentOrder(fromAddress, trxAmount, networkId, transaction.txID);
      
      console.log(`✅ [${networkName}] 步骤6: 闪租订单创建成功 - ${transaction.txID}`, {
        orderId: order.id,
        orderNumber: order.order_number,
        energyAmount: `${order.energy_amount} Energy`,
        calculatedUnits: order.calculated_units
      });

      console.log(`🎉 [${networkName}] 完成: 闪租支付流程完成 - ${transaction.txID}`, {
        订单号: order.order_number,
        能量数量: `${order.energy_amount} Energy`,
        计算笔数: order.calculated_units,
        支付金额: `${trxAmount} TRX`
      });
      
    } catch (error) {
      console.error(`❌ [${networkName}] 错误: 闪租支付处理失败 - ${transaction.txID}`, {
        error: error.message,
        stack: error.stack,
        transaction: {
          txID: transaction.txID,
          from: transaction.from,
          amount: `${transaction.amount} TRX`
        }
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
