import { query } from '../../database/index';

/**
 * 获取网络名称用于日志显示
 */
export async function getNetworkName(networkId: string): Promise<string> {
  try {
    const result = await query('SELECT name FROM tron_networks WHERE id = $1', [networkId]);
    return result.rows[0]?.name || 'Unknown Network';
  } catch (error) {
    console.warn(`获取网络名称失败: ${networkId}`, error);
    return 'Unknown Network';
  }
}

/**
 * 动态导入orderService以避免循环依赖
 */
export async function getOrderService() {
  const { orderService } = await import('../order');
  return orderService;
}
