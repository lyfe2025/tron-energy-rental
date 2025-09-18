import type { FreezeBalanceV2Params } from '../../../types/staking.types';

/**
 * 质押验证器
 * 负责验证质押操作的参数
 */
export class FreezeValidator {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  /**
   * 验证 FreezeBalanceV2 参数
   */
  validateFreezeBalanceV2Params(params: FreezeBalanceV2Params): void {
    const { ownerAddress, frozenBalance, resource } = params;

    console.log('🔍 [FreezeValidator] 验证 freezeBalanceV2 参数:', {
      输入参数: params,
      ownerAddress类型: typeof ownerAddress,
      ownerAddress长度: ownerAddress?.length,
      ownerAddress值: ownerAddress,
      frozenBalance类型: typeof frozenBalance,
      frozenBalance值: frozenBalance,
      resource值: resource,
      tronWeb存在: !!this.tronWeb,
      tronWeb地址方法存在: !!this.tronWeb?.address?.toHex
    });

    // 验证TronWeb实例
    if (!this.tronWeb) {
      throw new Error('TronWeb instance is not initialized');
    }

    this.validateOwnerAddress(ownerAddress);
    this.validateFrozenBalance(frozenBalance);
    this.validateResource(resource);
  }

  /**
   * 验证地址参数
   */
  private validateOwnerAddress(ownerAddress: string): void {
    // 验证TRON地址格式
    if (!ownerAddress || typeof ownerAddress !== 'string') {
      throw new Error(`Invalid ownerAddress: ${ownerAddress} (type: ${typeof ownerAddress})`);
    }

    if (!ownerAddress.startsWith('T') || ownerAddress.length !== 34) {
      throw new Error(`Invalid TRON address format: ${ownerAddress} (length: ${ownerAddress.length})`);
    }

    // 🔧 使用TronWeb的内置地址验证方法
    if (!this.tronWeb.isAddress(ownerAddress)) {
      throw new Error(`Invalid TRON address: ${ownerAddress} - TronWeb validation failed`);
    }

    console.log('🔍 [FreezeValidator] ✅ 地址验证通过:', ownerAddress);
  }

  /**
   * 验证质押金额
   */
  private validateFrozenBalance(frozenBalance: number): void {
    // 验证frozenBalance参数
    if (!frozenBalance || frozenBalance <= 0) {
      throw new Error(`Invalid frozen balance: ${frozenBalance} - must be positive number`);
    }
  }

  /**
   * 验证资源类型
   */
  private validateResource(resource: string): void {
    // 验证resource参数
    if (!resource || !['ENERGY', 'BANDWIDTH'].includes(resource)) {
      throw new Error(`Invalid resource type: ${resource} - must be ENERGY or BANDWIDTH`);
    }
  }

  /**
   * 验证地址格式并转换
   */
  validateAndConvertAddress(address: string, fieldName: string = 'address'): string {
    if (!address || typeof address !== 'string') {
      throw new Error(`Invalid ${fieldName}: ${address} (type: ${typeof address})`);
    }

    // 简单验证地址格式
    if (address.startsWith('T') && address.length === 34) {
      return address;
    }

    throw new Error(`Invalid ${fieldName} format: ${address} - expected Base58 format starting with 'T'`);
  }
}
