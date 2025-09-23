import { orderLogger } from '../../utils/logger';
import { FlashRentOrderCreator } from './flash-rent/FlashRentOrderCreator';
import { FlashRentValidator } from './flash-rent/FlashRentValidator';
import { ProcessingLockManager } from './flash-rent/ProcessingLockManager';
import type { FlashRentTransaction } from './flash-rent/types';
import { getNetworkName, getOrderService } from './utils';

export class FlashRentPaymentService {
  private lockManager: ProcessingLockManager;
  private validator: FlashRentValidator;
  private orderCreator: FlashRentOrderCreator;

  constructor() {
    this.lockManager = new ProcessingLockManager();
    this.validator = new FlashRentValidator();
    this.orderCreator = new FlashRentOrderCreator();
  }

  /**
   * 处理能量闪租支付（主协调器）
   * @param transaction - 交易详情
   * @param networkId - 网络ID
   */
  async handleFlashRentPayment(transaction: any, networkId: string): Promise<void> {
    // 类型转换
    const flashRentTransaction = transaction as FlashRentTransaction;
    
    // 获取网络名称用于日志显示
    const networkName = await getNetworkName(networkId);
    
    try {
      // 1. 严格的并发安全去重检查
      orderLogger.info(`   1. 严格去重检查（并发安全）`, {
        txId: flashRentTransaction.txID,
        networkName,
        step: 1
      });

      const lockResult = await this.lockManager.acquireProcessingLock(flashRentTransaction.txID, 300); // 5分钟锁
      
      if (!lockResult.success) {
        orderLogger.warn(`   ❌ 交易正在被其他进程处理，跳过`, {
          txId: flashRentTransaction.txID,
          networkName,
          lockKey: lockResult.lockKey,
          step: 1,
          reason: 'concurrent_processing_detected'
        });
        return;
      }

      try {
        // 2. 数据库层面检查是否已存在订单
        orderLogger.info(`   2. 数据库去重检查`, {
          txId: flashRentTransaction.txID,
          networkName,
          step: 2
        });

        const existingOrder = await this.validator.checkExistingOrder(flashRentTransaction.txID);
        if (existingOrder) {
          // 检查现有订单状态，决定是否需要继续处理
          const canContinueProcessing = this.validator.canContinueProcessing(existingOrder);
          
          if (canContinueProcessing) {
            orderLogger.info(`   📝 发现现有订单，继续处理并更新状态`, {
              txId: flashRentTransaction.txID,
              networkName,
              existingOrderId: existingOrder.id,
              existingOrderNumber: existingOrder.order_number,
              existingStatus: existingOrder.status,
              step: 2,
              action: 'continue_processing_existing_order'
            });
            
            // 设置标记表示这是更新现有订单
            flashRentTransaction._existingOrderId = existingOrder.id;
            flashRentTransaction._existingOrderNumber = existingOrder.order_number;
          } else {
            orderLogger.warn(`   ⚠️ 订单已处理完成，跳过处理`, {
              txId: flashRentTransaction.txID,
              networkName,
              existingOrderId: existingOrder.id,
              existingOrderNumber: existingOrder.order_number,
              existingStatus: existingOrder.status,
              step: 2,
              status: 'order_already_completed',
              reason: `订单状态为 ${existingOrder.status}，无需重复处理`
            });
            return;
          }
        }

        // 3. 处理特殊标记的交易
        if (flashRentTransaction._isInitialCreation) {
          orderLogger.info(`   📝 处理初始订单创建请求`, {
            txId: flashRentTransaction.txID,
            networkName,
            orderNumber: flashRentTransaction._orderNumber,
            step: 'initial_creation'
          });
          
          await this.orderCreator.createInitialFlashRentOrder(flashRentTransaction, networkId);
          return;
        }

        if (flashRentTransaction._isOrderUpdate) {
          orderLogger.info(`   📝 处理订单状态更新请求`, {
            orderNumber: flashRentTransaction._orderNumber,
            updateType: flashRentTransaction._updateType,
            reason: flashRentTransaction._failureReason,
            step: 'order_update'
          });
          
          await this.orderCreator.updateFlashRentOrderStatus(flashRentTransaction, networkId);
          return;
        }

        // 4. 验证交易有效性
        orderLogger.info(`   4. 验证交易有效性`, {
          txId: flashRentTransaction.txID,
          networkName,
          step: 4
        });

        if (!this.validator.validateFlashRentTransaction(flashRentTransaction)) {
          orderLogger.warn(`   ❌ 交易验证失败`, {
            txId: flashRentTransaction.txID,
            networkName,
            step: 4,
            status: 'validation_failed'
          });
          
          // 交易验证失败，创建失败记录
          await this.orderCreator.createFailedFlashRentOrder(
            flashRentTransaction, 
            networkId, 
            new Error('Transaction validation failed')
          );
          return;
        }

        orderLogger.info(`   ✅ 交易验证通过`, {
          txId: flashRentTransaction.txID,
          networkName,
          step: 4,
          status: 'validation_passed'
        });

        const { from: fromAddress, amount: trxAmount } = flashRentTransaction;
        
        // 5. 创建闪租订单
        orderLogger.info(`   5. 创建闪租订单`, {
          txId: flashRentTransaction.txID,
          networkName,
          fromAddress,
          amount: `${trxAmount} TRX`,
          step: 5
        });

        // 调用OrderService创建或更新闪租订单
        const orderService = await getOrderService();
        const existingOrderId = flashRentTransaction._existingOrderId || null;
        const order = await orderService.createFlashRentOrder(fromAddress, trxAmount, networkId, flashRentTransaction.txID, existingOrderId);
        
        const actionText = existingOrderId ? '更新' : '创建';
        orderLogger.info(`   ✅ 闪租订单${actionText}成功: ${order.order_number}`, {
          txId: flashRentTransaction.txID,
          orderId: order.id,
          orderNumber: order.order_number,
          energyAmount: order.energy_amount,
          networkName,
          step: 5,
          status: existingOrderId ? 'order_updated' : 'order_created',
          isUpdate: !!existingOrderId
        });
        
      } catch (processingError) {
        const shortTxId = flashRentTransaction.txID.substring(0, 8) + '...';
        orderLogger.error(`📦 [${shortTxId}] ❌ 闪租支付处理失败 - 详细错误信息`, {
          txId: flashRentTransaction.txID,
          networkName,
          errorMessage: processingError.message,
          errorStack: processingError.stack,
          errorName: processingError.name,
          errorCode: processingError.code,
          processStep: '闪租支付处理服务层发生异常',
          transactionDetails: {
            fromAddress: flashRentTransaction.from,
            toAddress: flashRentTransaction.to,
            amount: `${flashRentTransaction.amount} TRX`,
            confirmed: flashRentTransaction.confirmed,
            timestamp: flashRentTransaction.timestamp
          },
          processingContext: {
            hasExistingOrderId: !!flashRentTransaction._existingOrderId,
            existingOrderId: flashRentTransaction._existingOrderId || null,
            isInitialCreation: !!flashRentTransaction._isInitialCreation,
            isOrderUpdate: !!flashRentTransaction._isOrderUpdate,
            networkId: networkId
          },
          serviceState: {
            orderServiceAvailable: 'attempted to get OrderService',
            method: 'createFlashRentOrder',
            serviceLayer: 'FlashRentPaymentService'
          },
          processingSteps: [
            '1. 严格去重检查（并发安全）',
            '2. 数据库去重检查',
            '3. 记录日志和基础数据',
            '4. 验证交易有效性',
            '5. 创建闪租订单'
          ],
          status: 'processing_failed',
          errorContext: '在处理闪租支付创建订单时发生异常'
        });
        
        // 检查是否已经有订单记录了，如果有就不再创建失败记录
        const existingOrder = await this.validator.checkExistingOrder(flashRentTransaction.txID);
        if (existingOrder) {
          orderLogger.warn(`   ⚠️ 订单已存在，不创建失败记录`, {
            txId: flashRentTransaction.txID,
            existingOrderId: existingOrder.id,
            existingOrderNumber: existingOrder.order_number,
            existingStatus: existingOrder.status
          });
        } else {
          // 如果没有现有订单，才创建失败记录
          await this.orderCreator.createFailedFlashRentOrder(flashRentTransaction, networkId, processingError);
        }
        
        throw processingError; // 重新抛出错误
        
      } finally {
        // 释放处理锁
        await this.lockManager.releaseProcessingLock(flashRentTransaction.txID);
        orderLogger.info(`   🔓 释放处理锁`, {
          txId: flashRentTransaction.txID,
          networkName,
          lockKey: `flash_rent_lock:${flashRentTransaction.txID}`,
          step: 'release_lock'
        });
      }
      
    } catch (error) {
      const shortTxId = flashRentTransaction.txID.substring(0, 8) + '...';
      orderLogger.error(`📦 [${shortTxId}] ❌ 整体处理失败（含锁操作） - 详细错误信息`, {
        txId: flashRentTransaction.txID,
        networkName,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        errorCode: error.code,
        processStep: '闪租支付处理整体流程发生异常',
        transactionDetails: {
          fromAddress: flashRentTransaction.from,
          toAddress: flashRentTransaction.to,
          amount: `${flashRentTransaction.amount} TRX`,
          confirmed: flashRentTransaction.confirmed,
          timestamp: flashRentTransaction.timestamp
        },
        lockManagement: {
          lockKey: `flash_rent_lock:${flashRentTransaction.txID}`,
          lockAcquisitionAttempted: true,
          lockReleaseAttempted: true
        },
        processingContext: {
          isInitialCreation: !!flashRentTransaction._isInitialCreation,
          isOrderUpdate: !!flashRentTransaction._isOrderUpdate,
          networkId: networkId,
          networkName: networkName
        },
        serviceState: {
          validatorAvailable: !!this.validator,
          serviceLayer: 'FlashRentPaymentService',
          method: 'handleFlashRentPayment'
        },
        status: 'overall_processing_failed',
        errorContext: '在闪租支付处理的最外层发生异常，包含锁管理操作'
      });
    }
  }

}
