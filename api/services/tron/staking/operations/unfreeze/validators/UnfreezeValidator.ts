import type { UnfreezeBalanceV2Params, WithdrawExpireUnfreezeParams } from '../../../types/staking.types';

/**
 * 解质押参数验证器
 */
export class UnfreezeValidator {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  /**
   * 验证解质押参数
   */
  validateUnfreezeParams(params: UnfreezeBalanceV2Params): void {
    const { ownerAddress, unfreezeBalance, resource } = params;

    // 验证参数
    if (!ownerAddress || !unfreezeBalance || !resource) {
      throw new Error('缺少必要参数：ownerAddress, unfreezeBalance, resource');
    }

    if (unfreezeBalance <= 0) {
      throw new Error('解质押金额必须大于0');
    }

    if (!['ENERGY', 'BANDWIDTH'].includes(resource)) {
      throw new Error('资源类型必须是 ENERGY 或 BANDWIDTH');
    }
  }

  /**
   * 验证提取参数
   */
  validateWithdrawParams(params: WithdrawExpireUnfreezeParams): void {
    const { ownerAddress } = params;

    if (!ownerAddress) {
      throw new Error('缺少必要参数：ownerAddress');
    }
  }

  /**
   * 验证地址格式
   */
  validateAddress(address: string): void {
    if (!address.startsWith('T') || address.length !== 34) {
      throw new Error(`地址格式错误: ${address}`);
    }
  }

  /**
   * 验证地址是否为有效的TRON地址
   */
  isValidTronAddress(address: string): boolean {
    try {
      return this.tronWeb.isAddress(address);
    } catch (error) {
      return false;
    }
  }
}
