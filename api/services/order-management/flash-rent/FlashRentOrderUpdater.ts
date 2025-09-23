/**
 * 闪租订单更新器
 * 负责更新现有的闪租订单
 */
import { orderLogger } from '../../../utils/logger';
import type { Order } from '../../order/types.ts';
import { OrderCalculationService } from '../OrderCalculationService';
import { OrderConfigService } from '../OrderConfigService';
import type { FlashRentOrderParams } from '../types';
import { FlashRentOrderDelegator } from './FlashRentOrderDelegator';
import { FlashRentOrderRepository } from './FlashRentOrderRepository';

export class FlashRentOrderUpdater {
  private calculationService: OrderCalculationService;
  private configService: OrderConfigService;
  private repository: FlashRentOrderRepository;
  private delegator: FlashRentOrderDelegator;

  constructor() {
    this.calculationService = new OrderCalculationService();
    this.configService = new OrderConfigService();
    this.repository = new FlashRentOrderRepository();
    this.delegator = new FlashRentOrderDelegator(this.repository);
  }

  /**
   * 更新现有的闪租订单
   */
  async updateExistingFlashRentOrder(params: FlashRentOrderParams): Promise<Order> {
    const { existingOrderId, fromAddress, trxAmount, networkId, txId } = params;

    try {
      // 1. 获取现有订单信息
      const existingOrder = await this.getExistingOrderInfo(existingOrderId!, txId);

      // 2. 获取和验证闪租配置
      const config = await this.getAndValidateConfig(networkId, txId, existingOrderId!);

      // 3. 重新计算订单参数
      const calculation = await this.recalculateOrderParams(trxAmount, config, txId, existingOrderId!);

      // 4. 更新订单记录
      await this.updateOrderRecord(
        existingOrderId!,
        fromAddress,
        trxAmount,
        calculation,
        config,
        txId,
        existingOrder.order_number
      );

      // 5. 执行能量代理
      return await this.delegator.executeEnergyDelegation(
        { ...existingOrder, id: existingOrderId },
        fromAddress,
        calculation.totalEnergy,
        config.expiry_hours,
        networkId,
        txId,
        existingOrder.order_number
      );

    } catch (error) {
      const shortTxId = txId.substring(0, 8) + '...';
      orderLogger.error(`📦 [${shortTxId}]    ❌ 更新现有闪租订单失败 - 详细错误信息`, {
        txId: txId,
        existingOrderId: existingOrderId,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        errorCode: error.code,
        processStep: '更新现有闪租订单时发生异常',
        inputParameters: {
          fromAddress: fromAddress,
          trxAmount: trxAmount,
          networkId: networkId,
          hasExistingOrderId: !!existingOrderId
        },
        processingSteps: [
          '1. 获取现有订单信息',
          '2. 获取和验证闪租配置',
          '3. 重新计算订单参数',
          '4. 更新订单记录',
          '5. 执行能量代理'
        ],
        serviceState: {
          calculationServiceAvailable: !!this.calculationService,
          configServiceAvailable: !!this.configService,
          repositoryAvailable: !!this.repository,
          delegatorAvailable: !!this.delegator
        },
        errorContext: '在处理现有闪租订单更新流程中发生异常'
      });
      throw error;
    }
  }

  /**
   * 获取现有订单信息
   */
  private async getExistingOrderInfo(existingOrderId: string, txId: string): Promise<any> {
    orderLogger.info(`   1. 获取现有订单信息`, {
      txId: txId,
      existingOrderId: existingOrderId,
      step: 1
    });

    const existingOrder = await this.repository.getExistingOrder(existingOrderId);

    orderLogger.info(`   ✅ 现有订单信息获取成功`, {
      txId: txId,
      existingOrderId: existingOrderId,
      orderNumber: existingOrder.order_number,
      currentStatus: existingOrder.status,
      step: 1
    });

    return existingOrder;
  }

  /**
   * 获取和验证闪租配置
   */
  private async getAndValidateConfig(networkId: string, txId: string, existingOrderId: string): Promise<any> {
    orderLogger.info(`   2. 获取闪租配置`, {
      txId: txId,
      existingOrderId: existingOrderId,
      networkId: networkId,
      step: 2
    });

    const config = await this.configService.getFlashRentConfig(networkId);
    const configValidation = this.configService.validateFlashRentConfig(config);

    if (!configValidation.isValid) {
      throw new Error(`Flash rent config invalid for network: ${networkId} - ${configValidation.reason}`);
    }

    return config;
  }

  /**
   * 重新计算订单参数
   */
  private async recalculateOrderParams(
    trxAmount: number,
    config: any,
    txId: string,
    existingOrderId: string
  ): Promise<any> {
    orderLogger.info(`   3. 重新计算订单参数`, {
      txId: txId,
      existingOrderId: existingOrderId,
      step: 3
    });

    const calculation = await this.calculationService.performFullCalculation(trxAmount, config);

    if (!calculation.isValid) {
      throw new Error(calculation.reason!);
    }

    orderLogger.info(`   ✅ 参数计算完成`, {
      txId: txId,
      existingOrderId: existingOrderId,
      calculation: {
        支付金额: trxAmount + ' TRX',
        计算笔数: calculation.calculatedUnits,
        总能量: calculation.totalEnergy
      },
      step: 3
    });

    return calculation;
  }

  /**
   * 更新订单记录
   */
  private async updateOrderRecord(
    existingOrderId: string,
    fromAddress: string,
    trxAmount: number,
    calculation: any,
    config: any,
    txId: string,
    orderNumber: string
  ): Promise<void> {
    await this.repository.updateOrderRecord(
      existingOrderId,
      fromAddress,
      trxAmount,
      calculation,
      config,
      txId,
      orderNumber
    );
  }

  /**
   * 验证订单是否可以更新
   */
  validateOrderCanBeUpdated(existingOrder: any): { canUpdate: boolean; reason?: string } {
    // 检查订单状态是否允许更新
    const allowedStatuses = ['pending', 'pending_delegation', 'processing'];
    
    if (!allowedStatuses.includes(existingOrder.status)) {
      return {
        canUpdate: false,
        reason: `Order status '${existingOrder.status}' does not allow updates`
      };
    }

    // 检查订单是否过期
    if (existingOrder.expires_at && new Date(existingOrder.expires_at) < new Date()) {
      return {
        canUpdate: false,
        reason: 'Order has expired'
      };
    }

    return { canUpdate: true };
  }

  /**
   * 检查订单更新的必要性
   */
  checkUpdateNecessity(
    existingOrder: any,
    newTrxAmount: number,
    newFromAddress: string
  ): { needsUpdate: boolean; reason?: string } {
    // 检查支付金额是否有变化
    if (existingOrder.payment_trx_amount !== newTrxAmount) {
      return {
        needsUpdate: true,
        reason: `Payment amount changed from ${existingOrder.payment_trx_amount} to ${newTrxAmount} TRX`
      };
    }

    // 检查目标地址是否有变化
    if (existingOrder.target_address !== newFromAddress) {
      return {
        needsUpdate: true,
        reason: `Target address changed from ${existingOrder.target_address} to ${newFromAddress}`
      };
    }

    return {
      needsUpdate: false,
      reason: 'No significant changes detected'
    };
  }
}
