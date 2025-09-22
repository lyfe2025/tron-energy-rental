/**
 * 交易监听服务主入口
 * 重新导向到分离后的交易监听服务，保持向后兼容
 */
// 重新导出分离后的服务
export { TransactionMonitorService } from './transaction-monitor/TransactionMonitorService';
export type { MonitoredAddress, Transaction } from './transaction-monitor/types';
