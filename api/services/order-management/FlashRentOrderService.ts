/**
 * 闪租订单服务 - 重构版
 * 负责闪租订单的创建、更新和处理逻辑的协调
 * 此版本将复杂逻辑拆分到专门的子服务中，提高可维护性
 */
import { orderLogger } from '../../utils/logger';
import type { Order } from '../order/types.js';
import { FlashRentOrderCreator } from './flash-rent/FlashRentOrderCreator';
import { FlashRentOrderUpdater } from './flash-rent/FlashRentOrderUpdater';
import type { FlashRentOrderParams } from './types';

export class FlashRentOrderService {
  private orderCreator: FlashRentOrderCreator;
  private orderUpdater: FlashRentOrderUpdater;

  constructor() {
    this.orderCreator = new FlashRentOrderCreator();
    this.orderUpdater = new FlashRentOrderUpdater();
  }

  /**
   * 创建新的闪租订单
   */
  async createNewFlashRentOrder(params: FlashRentOrderParams): Promise<Order> {
    const { fromAddress, trxAmount, networkId, txId } = params;

    orderLogger.info(`🆕 开始创建新的闪租订单`, {
      txId: txId,
      networkId: networkId,
      fromAddress: fromAddress,
      trxAmount: trxAmount,
      operation: 'create_new_order'
    });

    try {
      const result = await this.orderCreator.createNewFlashRentOrder(params);
      
      orderLogger.info(`✅ 新闪租订单创建完成`, {
        txId: txId,
        orderId: result.id,
        orderNumber: result.order_number || 'N/A',
        status: result.status,
        operation: 'create_new_order'
      });

      return result;
    } catch (error) {
      orderLogger.error(`❌ 新闪租订单创建失败`, {
        txId: txId,
        error: error.message,
        operation: 'create_new_order'
      });
      throw error;
    }
  }

  /**
   * 更新现有的闪租订单
   */
  async updateExistingFlashRentOrder(params: FlashRentOrderParams): Promise<Order> {
    const { existingOrderId, fromAddress, trxAmount, networkId, txId } = params;

    orderLogger.info(`🔄 开始更新现有闪租订单`, {
      txId: txId,
      existingOrderId: existingOrderId,
      networkId: networkId,
      fromAddress: fromAddress,
      trxAmount: trxAmount,
      operation: 'update_existing_order'
    });

    try {
      const result = await this.orderUpdater.updateExistingFlashRentOrder(params);
      
      orderLogger.info(`✅ 现有闪租订单更新完成`, {
        txId: txId,
        orderId: result.id,
        orderNumber: result.order_number || 'N/A',
        status: result.status,
        operation: 'update_existing_order'
      });

      return result;
    } catch (error) {
      orderLogger.error(`❌ 现有闪租订单更新失败`, {
        txId: txId,
        existingOrderId: existingOrderId,
        error: error.message,
        operation: 'update_existing_order'
      });
      throw error;
    }
  }

  /**
   * 根据参数智能选择创建或更新订单
   */
  async processFlashRentOrder(params: FlashRentOrderParams): Promise<Order> {
    const { existingOrderId, txId } = params;

    if (existingOrderId) {
      orderLogger.info(`📝 检测到现有订单ID，执行更新操作`, {
        txId: txId,
        existingOrderId: existingOrderId,
        operation: 'smart_process'
      });
      return await this.updateExistingFlashRentOrder(params);
    } else {
      orderLogger.info(`🆕 未检测到现有订单ID，执行创建操作`, {
        txId: txId,
        operation: 'smart_process'
      });
      return await this.createNewFlashRentOrder(params);
    }
  }

  /**
   * 验证闪租订单参数
   */
  validateFlashRentOrderParams(params: FlashRentOrderParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { fromAddress, trxAmount, networkId, txId } = params;

    // 验证基本参数
    if (!fromAddress || fromAddress.trim() === '') {
      errors.push('From address is required');
    }

    if (!trxAmount || trxAmount <= 0) {
      errors.push('TRX amount must be greater than 0');
    }

    if (!networkId || networkId.trim() === '') {
      errors.push('Network ID is required');
    }

    if (!txId || txId.trim() === '') {
      errors.push('Transaction ID is required');
    }

    // 验证地址格式（TRON地址格式）
    if (fromAddress && !this.isValidTronAddress(fromAddress)) {
      errors.push('Invalid TRON address format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证TRON地址格式
   */
  private isValidTronAddress(address: string): boolean {
    // TRON地址以T开头，长度为34位
    return /^T[A-Za-z1-9]{33}$/.test(address);
  }

  /**
   * 获取订单处理统计信息
   */
  getProcessingStats(): {
    totalProcessed: number;
    successfulCreations: number;
    successfulUpdates: number;
    failures: number;
  } {
    // 这里可以添加统计逻辑，目前返回模拟数据
    return {
      totalProcessed: 0,
      successfulCreations: 0,
      successfulUpdates: 0,
      failures: 0
    };
  }
}