/**
 * 任务处理器索引文件
 * 导出所有可用的任务处理器
 */

export { CleanupExpiredHandler } from './CleanupExpiredHandler';
export { ExpiredDelegationsHandler } from './ExpiredDelegationsHandler';
export { ExpiredUnpaidOrdersHandler } from './ExpiredUnpaidOrdersHandler';
export { RefreshPoolsHandler } from './RefreshPoolsHandler';

import type { ITaskHandler } from '../interfaces/ITaskHandler';
import { CleanupExpiredHandler } from './CleanupExpiredHandler';
import { ExpiredDelegationsHandler } from './ExpiredDelegationsHandler';
import { ExpiredUnpaidOrdersHandler } from './ExpiredUnpaidOrdersHandler';
import { RefreshPoolsHandler } from './RefreshPoolsHandler';

/**
 * 获取所有内置任务处理器实例
 */
export function getAllTaskHandlers(): ITaskHandler[] {
  return [
    new ExpiredDelegationsHandler(),
    new ExpiredUnpaidOrdersHandler(),
    new RefreshPoolsHandler(),
    new CleanupExpiredHandler()
  ];
}

/**
 * 根据任务名称创建任务处理器实例
 */
export function createTaskHandler(taskName: string): ITaskHandler | null {
  switch (taskName) {
    case 'expired-delegations':
      return new ExpiredDelegationsHandler();
    case 'expired-unpaid-orders':
      return new ExpiredUnpaidOrdersHandler();
    case 'refresh-pools':
      return new RefreshPoolsHandler();
    case 'cleanup-expired':
      return new CleanupExpiredHandler();
    default:
      return null;
  }
}

/**
 * 获取所有内置任务名称
 */
export function getBuiltinTaskNames(): string[] {
  return [
    'expired-delegations',
    'expired-unpaid-orders',
    'refresh-pools',
    'cleanup-expired'
  ];
}
