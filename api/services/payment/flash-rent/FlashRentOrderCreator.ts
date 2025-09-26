/**
 * 能量闪租订单创建器
 * 负责创建各种类型的订单记录
 */

import { query } from '../../../database/index';
import { orderLogger } from '../../../utils/logger';
import type {
    EnergyConfig,
    FlashRentConfig,
    FlashRentTransaction,
    OrderCalculation
} from './types';

export class FlashRentOrderCreator {

  /**
   * 创建初始闪租订单记录
   * 在交易处理开始时创建基础订单记录，立即计算笔数和能量
   */
  async createInitialFlashRentOrder(transaction: FlashRentTransaction, networkId: string): Promise<void> {
    try {
      const { txID, from: fromAddress, amount: trxAmount, _orderNumber: orderNumber } = transaction;
      
      // 系统用户ID（已创建）
      const tempUserId = '00000000-0000-0000-0000-000000000000';
      
      orderLogger.info(`   创建初始订单记录`, {
        txId: txID,
        orderNumber: orderNumber,
        fromAddress: fromAddress,
        amount: `${trxAmount} TRX`,
        step: 'create_initial_record'
      });

      // 计算订单参数
      const calculation = await this.calculateOrderParameters(txID, trxAmount, networkId);

      // 获取闪租时长配置
      const flashRentConfig = await this.getFlashRentConfig(networkId);
      const flashRentDuration = Math.round((flashRentConfig?.expiry_hours || 1.1) * 60); // 转换为分钟

      await query(
        `INSERT INTO orders (
          order_number, user_id, network_id, order_type, target_address,
          energy_amount, price, payment_trx_amount, calculated_units,
          payment_status, status, tron_tx_hash, payment_currency,
          source_address, flash_rent_duration, error_message, processing_started_at,
          processing_details, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          orderNumber,
          tempUserId,
          networkId,
          'energy_flash',
          fromAddress, // target_address: 接收能量的地址（支付地址）
          calculation.totalEnergy, // 立即计算的能量数量
          calculation.orderPrice, // 立即计算的订单价格
          trxAmount,
          calculation.calculatedUnits, // 立即计算的笔数
          'paid', // 支付状态：已支付（能检测到交易说明已付款）
          'pending', // 订单状态：待处理
          txID,
          'TRX', // payment_currency: 能量闪租默认使用TRX支付
          fromAddress, // source_address: 支付来源地址
          flashRentDuration, // flash_rent_duration: 闪租时长（分钟）
          null, // 初始创建时无错误信息
          new Date(), // processing_started_at: 处理开始时间
          JSON.stringify({ // processing_details: 处理详情
            step: 'initial_creation_with_calculation',
            created_at: new Date().toISOString(),
            transaction_info: {
              payment_amount: trxAmount,
              payment_address: fromAddress,
              transaction_hash: txID,
              network_id: networkId
            },
            calculation: {
              calculated_units: calculation.calculatedUnits,
              total_energy: calculation.totalEnergy,
              order_price: calculation.orderPrice
            },
            status: 'Order created with calculated values'
          }),
          new Date(),
          new Date()
        ]
      );
      
      orderLogger.info(`   ✅ 初始订单记录创建成功`, {
        txId: txID,
        orderNumber: orderNumber,
        calculatedUnits: calculation.calculatedUnits,
        totalEnergy: calculation.totalEnergy,
        orderPrice: calculation.orderPrice,
        status: 'initial_order_created'
      });
      
    } catch (createError: any) {
      orderLogger.error(`❌ 创建初始订单记录失败`, {
        txId: transaction.txID,
        orderNumber: transaction._orderNumber,
        error: createError.message
      });
      
      // 处理数据库唯一约束冲突错误
      if (createError.code === '23505' && createError.constraint === 'idx_orders_unique_flash_rent_tx') {
        const friendlyError = new Error('该交易哈希对应的闪租订单已存在，无法重复创建');
        friendlyError.name = 'DuplicateFlashRentOrderError';
        throw friendlyError;
      }
      
      throw createError;
    }
  }

  /**
   * 创建失败的闪租订单记录
   * 确保失败的交易不会被重复处理
   */
  async createFailedFlashRentOrder(
    transaction: FlashRentTransaction, 
    networkId: string, 
    error: any
  ): Promise<void> {
    try {
      const { from: fromAddress, amount: trxAmount, txID } = transaction;
      
      // 生成订单号
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const orderNumber = `FL${timestamp}${random}`;
      
      // 系统用户ID（已创建）
      const tempUserId = '00000000-0000-0000-0000-000000000000';
      
      orderLogger.info(`   创建失败订单记录`, {
        txId: txID,
        orderNumber: orderNumber,
        reason: error.message,
        step: 'create_failed_order'
      });

      await query(
        `INSERT INTO orders (
          order_number, user_id, network_id, order_type, target_address,
          energy_amount, price, payment_trx_amount, calculated_units,
          payment_status, status, tron_tx_hash, payment_currency,
          source_address, flash_rent_duration, error_message, processing_started_at,
          processing_details, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          orderNumber,
          tempUserId,
          networkId,
          'energy_flash',
          fromAddress,
          0, // 失败订单没有能量
          0, // 失败订单价格为0
          trxAmount,
          0, // 失败订单没有计算单位
          'paid', // 用户已支付
          'failed', // 订单状态为失败
          txID,
          'TRX', // payment_currency: 能量闪租默认使用TRX支付
          fromAddress, // source_address: 支付来源地址
          null, // flash_rent_duration: 失败订单没有时长
          `Processing failed: ${error.message}`, // error_message: 详细错误信息
          new Date(), // processing_started_at: 处理开始时间
          JSON.stringify({ // processing_details: 处理详情
            step: 'order_creation_failed',
            error_info: {
              message: error.message,
              stack: error.stack,
              failed_at: new Date().toISOString(),
              error_type: error.constructor.name
            },
            transaction_info: {
              payment_amount: trxAmount,
              payment_address: fromAddress,
              transaction_hash: txID,
              network_id: networkId
            },
            failure_reason: 'Flash rent order creation or processing failed'
          }),
          new Date(),
          new Date()
        ]
      );
      
      orderLogger.info(`   ✅ 失败订单记录创建成功`, {
        txId: txID,
        orderNumber: orderNumber,
        status: 'failed_order_created'
      });
      
    } catch (createError: any) {
      orderLogger.error(`❌ 创建失败订单记录失败`, {
        txId: transaction.txID,
        error: createError.message,
        originalError: error.message
      });
      
      // 处理数据库唯一约束冲突错误 - 对于失败订单记录，我们可以忽略重复
      if (createError.code === '23505' && createError.constraint === 'idx_orders_unique_flash_rent_tx') {
        orderLogger.warn(`⚠️ 失败订单记录已存在，跳过重复创建`, {
          txId: transaction.txID,
          constraint: createError.constraint
        });
        return; // 不抛出错误，因为这只是重复的失败记录
      }
    }
  }

  /**
   * 更新闪租订单状态
   * 用于将订单状态更新为失败或其他状态
   */
  async updateFlashRentOrderStatus(transaction: FlashRentTransaction, networkId: string): Promise<void> {
    try {
      const { _orderNumber: orderNumber, _failureReason: failureReason, _updateType: updateType } = transaction;
      
      orderLogger.info(`   更新订单状态`, {
        orderNumber: orderNumber,
        updateType: updateType,
        reason: failureReason,
        step: 'update_order_status'
      });

      if (updateType === 'failed') {
        await query(
          `UPDATE orders SET 
            status = $1,
            error_message = $2,
            processing_details = $3,
            updated_at = $4
           WHERE order_number = $5`,
          [
            'failed',
            failureReason,
            JSON.stringify({
              step: 'order_failed',
              failure_info: {
                reason: failureReason,
                failed_at: new Date().toISOString(),
                update_type: updateType
              },
              status: 'Order processing failed'
            }),
            new Date(),
            orderNumber
          ]
        );
      }
      
      orderLogger.info(`   ✅ 订单状态更新成功`, {
        orderNumber: orderNumber,
        status: updateType,
        reason: failureReason
      });
      
    } catch (updateError) {
      orderLogger.error(`❌ 更新订单状态失败`, {
        orderNumber: transaction._orderNumber,
        error: updateError.message,
        updateType: transaction._updateType
      });
    }
  }

  /**
   * 计算订单参数（笔数、能量、价格）
   */
  private async calculateOrderParameters(
    txID: string, 
    trxAmount: number, 
    networkId: string
  ): Promise<OrderCalculation> {
    let calculatedUnits = 0;
    let totalEnergy = 0;
    let orderPrice = 0;
    let singlePrice = 3; // 默认值
    let energyPerUnit = 66300; // 默认值（与系统配置默认值一致：65000 * 1.02）

    try {
      // 获取网络的闪租配置
      const flashRentConfig = await this.getFlashRentConfig(networkId);
      if (flashRentConfig) {
        singlePrice = flashRentConfig.single_price || flashRentConfig.price_per_unit || 3;
        const maxAmount = flashRentConfig.max_amount || flashRentConfig.max_transactions || 999;

        // 始终从系统配置获取能量消耗参数（忽略price_configs中的硬编码值）
        const energyConfig = await this.getEnergyConfig();
        if (energyConfig) {
          // 计算：单笔需要消耗的能量 = 标准转账能量消耗 * (1 + 安全缓冲百分比)
          energyPerUnit = Math.round(energyConfig.standard_energy * (1 + energyConfig.buffer_percentage / 100));

          orderLogger.info(`   🧮 动态计算单笔能量消耗 (忽略配置硬编码)`, {
            txId: txID,
            标准能量消耗: energyConfig.standard_energy,
            缓冲百分比: energyConfig.buffer_percentage + '%',
            计算公式: `${energyConfig.standard_energy} * (1 + ${energyConfig.buffer_percentage}/100)`,
            单笔能量消耗: energyPerUnit,
            忽略的配置值: flashRentConfig.energy_per_unit || 'null'
          });
        } else {
          orderLogger.warn(`   ⚠️ 无法获取系统配置，使用默认值`, {
            txId: txID,
            默认energyPerUnit: energyPerUnit
          });
        }

        // 计算笔数（向下取整，确保不超过用户支付能力）
        calculatedUnits = Math.floor(trxAmount / singlePrice);
        // 限制在最大笔数范围内 - 重要：允许0笔（支付金额不足时），限制最大笔数
        calculatedUnits = Math.min(maxAmount, calculatedUnits);
        // 计算总能量
        totalEnergy = calculatedUnits * energyPerUnit;
        // 计算订单价格（实际使用的价格，可能少于支付金额）
        orderPrice = calculatedUnits * singlePrice;

        orderLogger.info(`   🧮 订单计算完成`, {
          txId: txID,
          支付金额: trxAmount + ' TRX',
          单价: singlePrice + ' TRX',
          计算笔数: calculatedUnits,
          总能量: totalEnergy,
          订单价格: orderPrice + ' TRX'
        });
      }
    } catch (configError) {
      orderLogger.warn(`   ⚠️ 获取配置失败，使用默认计算`, {
        txId: txID,
        error: configError.message
      });
    }

    // 如果没有获取到配置或计算失败，使用默认配置
    if (calculatedUnits === 0 && trxAmount >= singlePrice) {
      calculatedUnits = Math.floor(trxAmount / singlePrice);
      calculatedUnits = Math.min(13, calculatedUnits); // 允许0笔，限制最大13笔
      totalEnergy = calculatedUnits * energyPerUnit;
      orderPrice = calculatedUnits * singlePrice;
      
      orderLogger.info(`   🔧 使用默认配置计算`, {
        txId: txID,
        计算笔数: calculatedUnits,
        总能量: totalEnergy,
        订单价格: orderPrice + ' TRX'
      });
    }

    return {
      calculatedUnits,
      totalEnergy,
      orderPrice,
      singlePrice,
      energyPerUnit
    };
  }

  /**
   * 获取闪租配置
   */
  private async getFlashRentConfig(networkId: string): Promise<FlashRentConfig | null> {
    try {
      const configResult = await query(
        `SELECT config FROM price_configs 
         WHERE mode_type = 'energy_flash' 
           AND network_id = $1 
           AND is_active = true
         LIMIT 1`,
        [networkId]
      );

      return configResult.rows.length > 0 ? configResult.rows[0].config : null;
    } catch (error) {
      orderLogger.error(`获取闪租配置失败`, {
        networkId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 获取能量消耗配置
   */
  private async getEnergyConfig(): Promise<EnergyConfig | null> {
    try {
      const energyConfigResult = await query(
        `SELECT config_key, config_value FROM system_configs 
         WHERE config_key IN (
           'resource_consumption.energy.usdt_standard_energy',
           'resource_consumption.energy.usdt_buffer_percentage'
         )`,
        []
      );

      if (energyConfigResult.rows.length >= 2) {
        const energyConfigs = energyConfigResult.rows.reduce((acc, row) => {
          acc[row.config_key] = parseFloat(row.config_value);
          return acc;
        }, {} as Record<string, number>);

        return {
          standard_energy: energyConfigs['resource_consumption.energy.usdt_standard_energy'] || 65000,
          buffer_percentage: energyConfigs['resource_consumption.energy.usdt_buffer_percentage'] || 2
        };
      }

      return null;
    } catch (error) {
      orderLogger.error(`获取能量消耗配置失败`, {
        error: error.message
      });
      return null;
    }
  }
}
