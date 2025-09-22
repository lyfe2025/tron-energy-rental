/**
 * 闪租订单创建器
 * 负责创建新的闪租订单
 */
import { orderLogger } from '../../../utils/logger';
import type { Order } from '../../order/types.js';
import { OrderCalculationService } from '../OrderCalculationService';
import { OrderConfigService } from '../OrderConfigService';
import type { FlashRentOrderParams } from '../types';
import { FlashRentOrderDelegator } from './FlashRentOrderDelegator';
import { FlashRentOrderNumberGenerator } from './FlashRentOrderNumberGenerator';
import { FlashRentOrderRepository } from './FlashRentOrderRepository';

export class FlashRentOrderCreator {
  private calculationService: OrderCalculationService;
  private configService: OrderConfigService;
  private numberGenerator: FlashRentOrderNumberGenerator;
  private repository: FlashRentOrderRepository;
  private delegator: FlashRentOrderDelegator;

  constructor() {
    this.calculationService = new OrderCalculationService();
    this.configService = new OrderConfigService();
    this.numberGenerator = new FlashRentOrderNumberGenerator();
    this.repository = new FlashRentOrderRepository();
    this.delegator = new FlashRentOrderDelegator(this.repository);
  }

  /**
   * 创建新的闪租订单
   */
  async createNewFlashRentOrder(params: FlashRentOrderParams): Promise<Order> {
    const { fromAddress, trxAmount, networkId, txId } = params;

    try {
      // 步骤5: 获取和验证闪租配置
      const config = await this.getAndValidateConfig(networkId, txId);

      // 步骤6: 计算订单参数
      const calculation = await this.calculateOrderParams(trxAmount, config, txId);

      // 步骤7: 生成订单号
      const orderNumber = await this.generateOrderNumber(txId);

      // 步骤8: 创建订单记录
      const order = await this.createOrderRecord(
        orderNumber,
        fromAddress,
        trxAmount,
        networkId,
        txId,
        calculation,
        config
      );

      // 步骤9: 执行能量代理
      return await this.delegator.executeEnergyDelegation(
        order,
        fromAddress,
        calculation.totalEnergy,
        config.expiry_hours,
        networkId,
        txId,
        orderNumber
      );

    } catch (error) {
      orderLogger.error(`   ❌ 创建闪租订单失败`, {
        txId: txId,
        error: {
          错误信息: error.message,
          错误堆栈: error.stack
        },
        orderParams: {
          fromAddress,
          trxAmount,
          networkId,
          txId
        }
      });
      throw error;
    }
  }

  /**
   * 获取和验证闪租配置
   */
  private async getAndValidateConfig(networkId: string, txId: string): Promise<any> {
    orderLogger.info(`   5. 获取闪租配置`, {
      txId: txId,
      networkId: networkId,
      step: 5
    });

    const config = await this.configService.getFlashRentConfig(networkId);
    const configValidation = this.configService.validateFlashRentConfig(config);

    if (!configValidation.isValid) {
      orderLogger.error(`   ❌ 闪租配置无效`, {
        txId: txId,
        networkId: networkId,
        step: 5,
        reason: configValidation.reason
      });
      throw new Error(`Flash rent config invalid for network: ${networkId} - ${configValidation.reason}`);
    }

    orderLogger.info(`   ✅ 获取配置成功`, {
      txId: txId,
      step: 5,
      config: {
        单价: this.configService.getPricePerUnit(config!) + ' TRX',
        每笔能量: config!.energy_per_unit,
        最大笔数: this.configService.getMaxUnits(config!),
        收款地址: config!.payment_address,
        持续时长: config!.expiry_hours + '小时'
      }
    });

    return config;
  }

  /**
   * 计算订单参数
   */
  private async calculateOrderParams(trxAmount: number, config: any, txId: string): Promise<any> {
    orderLogger.info(`   6. 开始计算订单参数`, {
      txId: txId,
      step: 6
    });

    const calculation = this.calculationService.performFullCalculation(trxAmount, config);

    if (!calculation.isValid) {
      orderLogger.error(`   ❌ 订单计算失败`, {
        txId: txId,
        step: 6,
        trxAmount: trxAmount,
        reason: calculation.reason
      });
      throw new Error(calculation.reason!);
    }

    orderLogger.info(`   ✅ 计算完成`, {
      txId: txId,
      step: 6,
      calculation: {
        支付金额: trxAmount + ' TRX',
        计算笔数: calculation.calculatedUnits,
        总能量: calculation.totalEnergy,
        实际价值: calculation.orderPrice + ' TRX'
      }
    });

    return calculation;
  }

  /**
   * 生成订单号
   */
  private async generateOrderNumber(txId: string): Promise<string> {
    orderLogger.info(`   7. 生成订单号`, {
      txId: txId,
      step: 7
    });

    const orderNumber = await this.numberGenerator.generateOrderNumber();

    orderLogger.info(`   ✅ 订单号生成成功`, {
      txId: txId,
      step: 7,
      orderNumber: orderNumber
    });

    return orderNumber;
  }

  /**
   * 创建订单记录
   */
  private async createOrderRecord(
    orderNumber: string,
    fromAddress: string,
    trxAmount: number,
    networkId: string,
    txId: string,
    calculation: any,
    config: any
  ): Promise<any> {
    orderLogger.info(`   8. 创建订单记录到数据库`, {
      txId: txId,
      step: 8,
      orderDetails: {
        订单号: orderNumber,
        网络ID: networkId,
        订单类型: 'energy_flash',
        目标地址: fromAddress,
        能量数量: calculation.totalEnergy,
        支付金额: trxAmount + ' TRX',
        计算笔数: calculation.calculatedUnits,
        交易哈希: txId
      }
    });

    const order = await this.repository.insertOrderRecord(
      orderNumber,
      fromAddress,
      trxAmount,
      networkId,
      txId,
      calculation,
      config
    );

    orderLogger.info(`   ✅ 订单记录创建成功`, {
      txId: txId,
      step: 8,
      orderNumber: orderNumber,
      orderInfo: {
        数据库ID: order.id,
        状态: order.status,
        支付状态: order.payment_status,
        能量数量: order.energy_amount,
        计算笔数: order.calculated_units
      }
    });

    return order;
  }
}
