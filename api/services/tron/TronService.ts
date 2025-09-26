import { AccountService } from './services/AccountService';
import { DelegationService } from './services/DelegationService';
import { StakingService } from './services/StakingService';
import { TransactionService } from './services/TransactionService';
import type {
  AccountData,
  DelegateResourceParams,
  FreezeBalanceV2Params,
  ResourceData,
  ServiceResponse,
  StakeOverview,
  TransactionResult,
  TronConfig,
  UnfreezeBalanceV2Params,
  WithdrawExpireUnfreezeParams
} from './types/tron.types';
import { TronUtils } from './utils/tronUtils';

export class TronService {
  private tronWeb: any;
  private config: TronConfig;
  private utils: TronUtils;
  private accountService: AccountService;
  private transactionService: TransactionService;
  private delegationService: DelegationService;
  private stakingService: StakingService;

  constructor(config: TronConfig) {
    this.config = config;
    this.initializeTronWeb();
    this.initializeServices();
  }

  private initializeTronWeb() {
    this.tronWeb = TronUtils.initializeTronWeb(this.config);
  }

  private initializeServices() {
    this.utils = new TronUtils(this.tronWeb);
    this.accountService = new AccountService(this.tronWeb);
    this.transactionService = new TransactionService(this.tronWeb);
    this.delegationService = new DelegationService(this.tronWeb, this.transactionService);
    this.stakingService = new StakingService(this.tronWeb);
  }

  // ===== 账户相关方法 =====
  async getAccount(address: string): Promise<ServiceResponse<AccountData>> {
    return await this.accountService.getAccount(address);
  }

  async getAccountResources(address: string): Promise<ServiceResponse<ResourceData>> {
    return await this.accountService.getAccountResources(address);
  }

  async getAccountInfo(address: string): Promise<ServiceResponse<AccountData>> {
    return await this.accountService.getAccountInfo(address);
  }

  // ===== 交易相关方法 =====
  async getTransactionsFromAddress(address: string, limit: number = 10, offset: number = 0) {
    return await this.transactionService.getTransactionsFromAddress(address, limit, offset);
  }

  async getTransaction(txid: string): Promise<ServiceResponse> {
    return await this.transactionService.getTransaction(txid);
  }

  async monitorTransfer(toAddress: string, amount: number, timeout: number = 300000) {
    return await this.transactionService.monitorTransfer(toAddress, amount, timeout);
  }

  // ===== 委托相关方法 =====
  async delegateResource(params: DelegateResourceParams): Promise<TransactionResult> {
    // 🔧 关键修复：在所有代理操作前验证可代理余额，防止FreezeEnergyV2余额不足错误
    if (params.resource === 'ENERGY') {
      console.log(`🔍 [TronService] 代理前余额验证: ${params.ownerAddress}`, {
        请求代理: `${params.balance} SUN`,
        '请求代理TRX': (params.balance / 1000000).toFixed(6),
        接收地址: params.receiverAddress
      });
      
      // 获取账户实际可代理余额
      const resourceResult = await this.getAccountResources(params.ownerAddress);
      if (resourceResult.success && resourceResult.data.energy) {
        const energyInfo = resourceResult.data.energy;
        const delegatedOut = energyInfo.delegatedOut || 0;
        const totalStaked = energyInfo.totalStaked || 0;
        
        // 计算可代理余额（与能量闪兑使用相同逻辑）
        const availableDelegateBalance = Math.max(0, totalStaked - delegatedOut); // SUN单位
        
        if (params.balance > availableDelegateBalance) {
          const deficit = params.balance - availableDelegateBalance;
          console.error(`❌ [TronService] 代理余额验证失败`, {
            账户地址: params.ownerAddress,
            '总质押TRX': (totalStaked / 1000000).toFixed(6),
            '已代理TRX': (delegatedOut / 1000000).toFixed(6), 
            '可代理TRX': (availableDelegateBalance / 1000000).toFixed(6),
            '请求代理TRX': (params.balance / 1000000).toFixed(6),
            '缺少TRX': (deficit / 1000000).toFixed(6),
            '验证结果': '❌ 余额不足'
          });
          
          return {
            success: false,
            error: `代理余额不足: 账户 ${params.ownerAddress} 可代理 ${(availableDelegateBalance / 1000000).toFixed(6)} TRX，请求代理 ${(params.balance / 1000000).toFixed(6)} TRX，缺少 ${(deficit / 1000000).toFixed(6)} TRX`
          };
        }
        
        console.log(`✅ [TronService] 代理余额验证通过`, {
          账户地址: params.ownerAddress,
          '可代理TRX': (availableDelegateBalance / 1000000).toFixed(6),
          '请求代理TRX': (params.balance / 1000000).toFixed(6),
          '剩余TRX': ((availableDelegateBalance - params.balance) / 1000000).toFixed(6),
          '验证结果': '✅ 余额充足'
        });
      }
    }
    
    return await this.delegationService.delegateResource(params);
  }

  async undelegateResource(params: Omit<DelegateResourceParams, 'lock' | 'lockPeriod'>): Promise<TransactionResult> {
    return await this.delegationService.undelegateResource(params);
  }

  // ===== 质押相关方法 =====
  async freezeBalanceV2(params: FreezeBalanceV2Params): Promise<TransactionResult> {
    return await this.stakingService.freezeBalanceV2(params);
  }

  async unfreezeBalanceV2(params: UnfreezeBalanceV2Params): Promise<TransactionResult> {
    return await this.stakingService.unfreezeBalanceV2(params);
  }

  async withdrawExpireUnfreeze(params: WithdrawExpireUnfreezeParams): Promise<TransactionResult> {
    return await this.stakingService.withdrawExpireUnfreeze(params);
  }

  async getStakeOverview(address: string): Promise<ServiceResponse<StakeOverview>> {
    return await this.stakingService.getStakeOverview(address);
  }

  /**
   * @deprecated 已移除数据库存储逻辑，所有质押数据从TRON网络实时获取
   * 保留此方法以避免类型错误，但不执行任何操作
   */
  async recordStakeTransaction(params: {
    transactionId: string;
    poolId: number;
    address: string;
    amount: number;
    resourceType: 'ENERGY' | 'BANDWIDTH';
    operationType: 'freeze' | 'unfreeze' | 'delegate' | 'undelegate' | 'withdraw';
    fromAddress?: string;
    toAddress?: string;
    lockPeriod?: number;
    unfreezeTime?: Date;
    expireTime?: Date;
  }): Promise<{ success: boolean; error?: string }> {
    console.log('[TronService] 🔍 recordStakeTransaction 已废弃 - 所有数据从TRON网络实时获取');
    return { success: true };
  }

  // ===== 工具方法 =====
  addressToHex(address: string): string {
    return this.utils.addressToHex(address);
  }

  isValidAddress(address: string): boolean {
    return this.utils.isValidAddress(address);
  }

  convertAddress(address: string, toHex: boolean = false) {
    return this.utils.convertAddress(address, toHex);
  }

  // ===== 私有方法 =====
  private async recordEnergyTransaction(data: {
    txid: string;
    from_address: string;
    to_address: string;
    amount: number;
    resource_type: string;
    status: string;
    lock_period: number;
  }) {
    return await this.transactionService.recordEnergyTransaction(data);
  }
}

// 创建默认实例
const tronConfig: TronConfig = {
  fullHost: process.env.TRON_FULL_HOST || 'https://api.trongrid.io',
  privateKey: process.env.TRON_PRIVATE_KEY,
  solidityNode: process.env.TRON_SOLIDITY_NODE,
  eventServer: process.env.TRON_EVENT_SERVER
};

export const tronService = new TronService(tronConfig);
export default TronService;

// 导出所有类型以保持向后兼容
export * from './types/tron.types';
