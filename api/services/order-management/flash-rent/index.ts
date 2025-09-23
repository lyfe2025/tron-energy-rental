/**
 * 闪租订单服务模块导出
 * 统一导出所有闪租相关的服务类
 */

// 核心服务类
export { FlashRentOrderDelegator } from './FlashRentOrderDelegator';
export { FlashRentOrderNumberGenerator } from './FlashRentOrderNumberGenerator';
export { FlashRentOrderProcessor } from './FlashRentOrderProcessor';
export { FlashRentOrderRepository } from './FlashRentOrderRepository';
export { FlashRentOrderUpdater } from './FlashRentOrderUpdater';

// 便捷导入，用于外部直接使用
export type { FlashRentOrderParams } from '../types';
