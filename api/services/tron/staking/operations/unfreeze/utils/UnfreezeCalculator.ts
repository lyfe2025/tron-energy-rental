
/**
 * 解质押相关计算工具类
 */
export class UnfreezeCalculator {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  /**
   * 计算解质押到期时间
   */
  calculateExpireTime(unfreezeTime: Date, networkUnlockPeriod?: number): Date {
    const unlockPeriod = networkUnlockPeriod || 14 * 24 * 60 * 60 * 1000; // 默认14天
    return new Date(unfreezeTime.getTime() + unlockPeriod);
  }

  /**
   * 检查解质押是否可以提取
   */
  isWithdrawable(withdrawableTime: Date | null): boolean {
    if (!withdrawableTime) return false;
    return withdrawableTime <= new Date();
  }

  /**
   * 计算剩余等待时间（小时）
   */
  calculateRemainingHours(withdrawableTime: Date): number {
    const now = new Date();
    return Math.ceil((withdrawableTime.getTime() - now.getTime()) / (1000 * 60 * 60));
  }

  /**
   * 计算已经过去的时间
   */
  calculateElapsedTime(startTime: Date): { hours: number, days: number } {
    const now = new Date();
    const hoursElapsed = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60 * 60));
    const daysElapsed = Math.floor(hoursElapsed / 24);
    
    return { hours: hoursElapsed, days: daysElapsed };
  }

  /**
   * 格式化TRX金额
   */
  formatTrxAmount(sunAmount: number): number {
    return sunAmount / 1000000; // 转换为TRX
  }

  /**
   * 判断解质押状态
   */
  determineUnfreezeStatus(
    unfreezeTime: Date,
    withdrawableTime: Date | null,
    isInUnfrozenV2: boolean
  ): 'unfreezing' | 'withdrawable' | 'withdrawn' {
    if (!isInUnfrozenV2) {
      const { days } = this.calculateElapsedTime(unfreezeTime);
      return days > 0 ? 'withdrawable' : 'unfreezing';
    }

    if (withdrawableTime && this.isWithdrawable(withdrawableTime)) {
      return 'withdrawable';
    }

    return 'unfreezing';
  }

  /**
   * 匹配解质押记录与TRON网络状态
   */
  matchUnfreezeStatus(amount: number, unfrozenStatus: any[]): any | null {
    return unfrozenStatus.find((unfrozen: any) => {
      // 允许小量误差匹配
      const amountMatch = Math.abs(unfrozen.unfreeze_amount - amount) < 1000;
      return amountMatch;
    });
  }
}
