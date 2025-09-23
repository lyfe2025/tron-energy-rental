/**
 * 闪租订单数据仓库
 * 负责所有闪租订单相关的数据库操作
 */
import { query } from '../../../database/index.js';
import { orderLogger } from '../../../utils/logger';
import type { Order } from '../../order/types.js';

export class FlashRentOrderRepository {
  /**
   * 插入新的订单记录
   */
  async insertOrderRecord(
    orderNumber: string,
    fromAddress: string,
    trxAmount: number,
    networkId: string,
    txId: string,
    calculation: any,
    config: any
  ): Promise<any> {
    const tempUserId = '00000000-0000-0000-0000-000000000000';

    const result = await query(
      `INSERT INTO orders (
        order_number, user_id, network_id, order_type, target_address,
        energy_amount, price, payment_trx_amount, calculated_units,
        payment_status, status, tron_tx_hash, 
        source_address, processing_started_at,
        processing_details, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
      RETURNING *`,
      [
        orderNumber,
        tempUserId,
        networkId,
        'energy_flash',
        fromAddress,
        calculation.totalEnergy,
        calculation.orderPrice,
        trxAmount,
        calculation.calculatedUnits,
        'paid',
        'pending_delegation',
        txId,
        fromAddress,
        new Date(),
        JSON.stringify({
          步骤: '订单创建',
          配置: {
            单价: config.price_per_unit || config.single_price,
            每笔能量: config.energy_per_unit,
            最大笔数: config.max_units || config.max_amount
          },
          计算结果: {
            支付金额: trxAmount,
            计算笔数: calculation.calculatedUnits,
            总能量: calculation.totalEnergy
          }
        }),
        new Date(),
        new Date()
      ]
    );

    return result.rows[0];
  }

  /**
   * 更新订单基本信息
   */
  async updateOrderRecord(
    existingOrderId: string,
    fromAddress: string,
    trxAmount: number,
    calculation: any,
    config: any,
    txId: string,
    orderNumber: string
  ): Promise<void> {
    orderLogger.info(`   4. 更新订单信息`, {
      txId: txId,
      existingOrderId: existingOrderId,
      step: 4
    });

    await query(
      `UPDATE orders SET 
        energy_amount = $1,
        price = $2,
        payment_trx_amount = $3,
        calculated_units = $4,
        payment_status = 'paid',
        status = 'pending_delegation',
        source_address = $5,
        processing_started_at = $6,
        processing_details = $7,
        updated_at = $8
       WHERE id = $9`,
      [
        calculation.totalEnergy,
        calculation.orderPrice,
        trxAmount,
        calculation.calculatedUnits,
        fromAddress,
        new Date(),
        JSON.stringify({
          step: 'order_updated',
          config: {
            price_per_unit: config.price_per_unit || config.single_price,
            energy_per_unit: config.energy_per_unit,
            max_units: config.max_units || config.max_amount
          },
          calculation: {
            payment_amount: trxAmount,
            calculated_units: calculation.calculatedUnits,
            total_energy: calculation.totalEnergy
          },
          updated_at: new Date().toISOString()
        }),
        new Date(),
        existingOrderId
      ]
    );

    orderLogger.info(`   ✅ 订单信息更新成功`, {
      txId: txId,
      existingOrderId: existingOrderId,
      orderNumber: orderNumber,
      step: 4
    });
  }

  /**
   * 更新订单状态为完成
   */
  async updateOrderToCompleted(
    orderId: string,
    totalEnergy: number,
    delegationTxId: string,
    txId: string,
    orderNumber: string
  ): Promise<Order> {
    orderLogger.info(`   10. 更新订单状态为完成`, {
      txId: txId,
      step: 10,
      orderNumber: orderNumber,
      updateParams: {
        新状态: 'completed',
        代理能量: totalEnergy,
        代理交易ID: delegationTxId
      }
    });

    const finalResult = await query(
      `UPDATE orders SET 
        status = $1,
        delegated_energy_amount = $2,
        delegation_tx_id = $3,
        completed_at = $4,
        delegation_started_at = $5,
        processing_details = $6,
        updated_at = $7
       WHERE id = $8
       RETURNING *`,
      [
        'completed',
        totalEnergy,
        delegationTxId,
        new Date(),
        new Date(),
        JSON.stringify({
          step: 'order_completed',
          delegation_info: {
            status: 'success',
            delegation_tx_id: delegationTxId,
            delegated_energy: totalEnergy,
            completed_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }),
        new Date(),
        orderId
      ]
    );

    const updatedOrder = finalResult.rows[0];

    orderLogger.info(`   🎉 订单处理完成`, {
      txId: txId,
      orderNumber: orderNumber,
      summary: {
        订单号: orderNumber,
        数据库ID: orderId,
        获得能量: totalEnergy,
        支付交易: txId,
        代理交易: delegationTxId,
        最终状态: 'completed'
      }
    });

    return updatedOrder;
  }

  /**
   * 更新订单状态为失败
   */
  async updateOrderToFailed(
    orderId: string,
    errorMessage: string,
    txId: string,
    orderNumber: string
  ): Promise<Order> {
    orderLogger.info(`   10. 更新订单状态为失败`, {
      txId: txId,
      step: 10,
      orderNumber: orderNumber,
      reason: 'delegation_failed'
    });

    await query(
      `UPDATE orders SET 
        status = $1,
        error_message = $2,
        retry_count = retry_count + 1,
        processing_details = $3,
        updated_at = $4
       WHERE id = $5`,
      [
        'failed',
        `能量代理失败: ${errorMessage}`,
        JSON.stringify({
          step: 'delegation_failed',
          error_info: {
            step: 'energy_delegation',
            error_message: errorMessage,
            failed_at: new Date().toISOString()
          }
        }),
        new Date(),
        orderId
      ]
    );

    // 重新获取更新后的订单信息并返回
    const failedResult = await query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );

    orderLogger.error(`   ❌ 订单处理失败`, {
      txId: txId,
      orderNumber: orderNumber,
      failure: {
        订单ID: orderId,
        失败原因: errorMessage,
        当前状态: 'failed'
      }
    });

    return failedResult.rows[0];
  }

  /**
   * 获取现有订单
   */
  async getExistingOrder(existingOrderId: string): Promise<any> {
    const existingOrderResult = await query(
      `SELECT * FROM orders WHERE id = $1`,
      [existingOrderId]
    );

    if (!existingOrderResult.rows || existingOrderResult.rows.length === 0) {
      throw new Error(`Existing order not found: ${existingOrderId}`);
    }

    return existingOrderResult.rows[0];
  }

  /**
   * 根据订单ID获取订单
   */
  async getOrderById(orderId: string): Promise<any> {
    const result = await query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );

    return result.rows[0] || null;
  }
}
