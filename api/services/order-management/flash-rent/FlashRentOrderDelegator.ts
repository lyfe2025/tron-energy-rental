/**
 * 闪租订单能量代理器
 * 负责处理能量代理相关的逻辑
 */
import { orderLogger } from '../../../utils/logger';
import type { Order } from '../../order/types.ts';
import { tronService } from '../../tron.ts';
import { FlashRentOrderRepository } from './FlashRentOrderRepository';

export class FlashRentOrderDelegator {
  constructor(private repository: FlashRentOrderRepository) {}

  /**
   * 执行能量代理
   */
  async executeEnergyDelegation(
    order: any,
    fromAddress: string,
    totalEnergy: number,
    expiryHours: number,
    networkId: string,
    txId: string,
    orderNumber: string
  ): Promise<Order> {
    orderLogger.info(`   9. 开始能量代理`, {
      txId: txId,
      step: 9,
      orderNumber: orderNumber,
      delegationParams: {
        目标地址: fromAddress,
        代理能量: totalEnergy,
        代理时长: expiryHours + '小时',
        网络ID: networkId
      }
    });

    try {
      const delegationTxId = await this.performEnergyDelegation(
        fromAddress,
        totalEnergy,
        expiryHours,
        networkId
      );

      orderLogger.info(`   ✅ 能量代理成功`, {
        txId: txId,
        step: 9,
        orderNumber: orderNumber,
        delegationResult: {
          代理交易ID: delegationTxId,
          代理状态: '成功'
        }
      });

      // 更新订单状态为完成
      return await this.repository.updateOrderToCompleted(
        order.id,
        totalEnergy,
        delegationTxId,
        txId,
        orderNumber
      );

    } catch (delegationError) {
      orderLogger.error(`   ❌ 能量代理失败`, {
        txId: txId,
        step: 9,
        orderNumber: orderNumber,
        error: {
          错误信息: delegationError.message,
          错误堆栈: delegationError.stack,
          订单ID: order.id
        }
      });

      // 更新订单状态为失败
      return await this.repository.updateOrderToFailed(
        order.id,
        delegationError.message,
        txId,
        orderNumber
      );
    }
  }

  /**
   * 执行实际的能量代理操作
   */
  private async performEnergyDelegation(
    toAddress: string,
    energyAmount: number,
    durationHours: number,
    networkId: string
  ): Promise<string> {
    return await tronService.delegateEnergyForFlashRent(
      toAddress,
      energyAmount,
      durationHours,
      networkId
    );
  }

  /**
   * 验证代理参数
   */
  validateDelegationParams(
    fromAddress: string,
    totalEnergy: number,
    expiryHours: number,
    networkId: string
  ): { isValid: boolean; reason?: string } {
    if (!fromAddress || fromAddress.trim() === '') {
      return { isValid: false, reason: 'Invalid from address' };
    }

    if (!totalEnergy || totalEnergy <= 0) {
      return { isValid: false, reason: 'Invalid total energy amount' };
    }

    if (!expiryHours || expiryHours <= 0) {
      return { isValid: false, reason: 'Invalid expiry hours' };
    }

    if (!networkId || networkId.trim() === '') {
      return { isValid: false, reason: 'Invalid network ID' };
    }

    return { isValid: true };
  }
}
