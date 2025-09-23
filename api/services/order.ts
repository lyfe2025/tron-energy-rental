/**
 * 订单服务主入口
 * 重新导向到分离后的订单管理服务，保持向后兼容
 */
// 重新导出分离后的服务
export { orderService as default, orderService } from './order-management/OrderService';
export type { CreateOrderRequest, Order, OrderStats } from './order/types.ts';
