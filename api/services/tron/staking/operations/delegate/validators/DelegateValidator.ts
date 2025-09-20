import type {
    DelegateResourceParams,
    UndelegateResourceParams
} from '../../../types/staking.types';

/**
 * 委托验证器
 * 负责验证委托操作的参数
 */
export class DelegateValidator {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  /**
   * 验证委托资源参数
   */
  validateDelegateResourceParams(params: DelegateResourceParams): void {
    const { ownerAddress, receiverAddress, balance, resource, lock, lockPeriod } = params;

    this.validateAddress(ownerAddress, 'ownerAddress');
    this.validateAddress(receiverAddress, 'receiverAddress');
    this.validateBalance(balance);
    this.validateResource(resource);
    this.validateLockSettings(lock, lockPeriod);
  }

  /**
   * 验证取消委托资源参数
   */
  validateUndelegateResourceParams(params: UndelegateResourceParams): void {
    const { ownerAddress, receiverAddress, balance, resource } = params;

    this.validateAddress(ownerAddress, 'ownerAddress');
    this.validateAddress(receiverAddress, 'receiverAddress');
    this.validateBalance(balance);
    this.validateResource(resource);
  }

  /**
   * 验证地址参数
   */
  private validateAddress(address: string, fieldName: string): void {
    if (!address || typeof address !== 'string') {
      throw new Error(`Invalid ${fieldName}: ${address} (type: ${typeof address})`);
    }

    // 检查是否为有效的TRON地址格式
    if (address.startsWith('T') && address.length === 34) {
      // Base58格式地址，使用TronWeb验证
      if (this.tronWeb && !this.tronWeb.isAddress(address)) {
        throw new Error(`Invalid ${fieldName}: ${address} - TronWeb validation failed`);
      }
      return;
    }

    // 检查是否为十六进制格式
    if (address.startsWith('41') && address.length === 42) {
      // 十六进制格式，可以接受
      return;
    }

    throw new Error(`Invalid ${fieldName} format: ${address} - expected Base58 (T...) or Hex (41...) format`);
  }

  /**
   * 验证余额参数
   */
  private validateBalance(balance: number): void {
    if (!balance || typeof balance !== 'number' || balance <= 0) {
      throw new Error(`Invalid balance: ${balance} - must be positive number`);
    }

    // 检查是否超过最大值（防止溢出）
    const MAX_BALANCE = Number.MAX_SAFE_INTEGER;
    if (balance > MAX_BALANCE) {
      throw new Error(`Balance too large: ${balance} - must be less than ${MAX_BALANCE}`);
    }
  }

  /**
   * 验证资源类型
   */
  private validateResource(resource: string): void {
    if (!resource || typeof resource !== 'string') {
      throw new Error(`Invalid resource: ${resource} - must be string`);
    }

    const validResources = ['ENERGY', 'BANDWIDTH'];
    if (!validResources.includes(resource)) {
      throw new Error(`Invalid resource type: ${resource} - must be ${validResources.join(' or ')}`);
    }
  }

  /**
   * 验证锁定设置
   */
  private validateLockSettings(lock: boolean | undefined, lockPeriod: number | undefined): void {
    if (lock !== undefined && typeof lock !== 'boolean') {
      throw new Error(`Invalid lock parameter: ${lock} - must be boolean`);
    }

    if (lockPeriod !== undefined) {
      if (typeof lockPeriod !== 'number' || lockPeriod < 0) {
        throw new Error(`Invalid lockPeriod: ${lockPeriod} - must be non-negative number`);
      }

      // TRON锁定期限制（通常最大为72小时，即3天）
      const MAX_LOCK_PERIOD = 72;
      if (lockPeriod > MAX_LOCK_PERIOD) {
        throw new Error(`Lock period too long: ${lockPeriod} - maximum is ${MAX_LOCK_PERIOD} hours`);
      }
    }
  }

  /**
   * 验证地址不相同（不能委托给自己）
   */
  validateAddressesNotSame(ownerAddress: string, receiverAddress: string): void {
    const normalizedOwner = ownerAddress.toLowerCase();
    const normalizedReceiver = receiverAddress.toLowerCase();

    if (normalizedOwner === normalizedReceiver) {
      throw new Error('代理失败：接收方地址不能是当前账户的地址，请选择其他接收方地址');
    }
  }
}
