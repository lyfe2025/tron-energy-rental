import { configService, type TronNetworkConfig } from './config/ConfigService.js';
import { AccountService } from './tron/services/AccountService';
import { DelegationService } from './tron/services/DelegationService';
import { StakingService } from './tron/services/StakingService';
import { TransactionService } from './tron/services/TransactionService';
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
} from './tron/types/tron.types';
import { TronUtils } from './tron/utils/tronUtils';

export class TronService {
  private tronWeb: any;
  private config: TronConfig;
  private utils: TronUtils;
  private accountService: AccountService;
  private transactionService: TransactionService;
  private delegationService: DelegationService;
  private stakingService: StakingService;
  private currentNetwork: TronNetworkConfig | null = null;
  private isInitialized: boolean = false;

  constructor(config?: TronConfig) {
    // 如果提供了配置，使用传统方式初始化
    if (config) {
      this.config = config;
      this.initializeTronWeb();
      this.initializeServices();
      this.isInitialized = true;
    } else {
      // 否则从数据库加载配置
      this.initializeFromDatabase();
    }
  }

  /**
   * 从数据库初始化网络配置
   */
  private async initializeFromDatabase(): Promise<void> {
    try {
      // 获取默认网络配置
      const defaultNetwork = await configService.getDefaultTronNetwork();
      
      if (!defaultNetwork) {
        console.warn('未找到默认TRON网络配置，使用环境变量配置');
        await this.initializeFromEnv();
        return;
      }

      this.currentNetwork = defaultNetwork;
      
      // 转换为TronConfig格式
      this.config = this.networkConfigToTronConfig(defaultNetwork);
      
      this.initializeTronWeb();
      this.initializeServices();
      this.setupConfigChangeListener();
      
      this.isInitialized = true;
      console.log(`✅ TronService已从数据库配置初始化: ${defaultNetwork.name}`);
      
    } catch (error) {
      console.error('从数据库初始化TRON网络配置失败:', error);
      console.log('回退到环境变量配置...');
      await this.initializeFromEnv();
    }
  }

  /**
   * 从环境变量初始化（回退方案）
   */
  private async initializeFromEnv(): Promise<void> {
    this.config = {
      fullHost: process.env.TRON_FULL_HOST || 'https://api.trongrid.io',
      privateKey: process.env.TRON_PRIVATE_KEY,
      solidityNode: process.env.TRON_SOLIDITY_NODE,
      eventServer: process.env.TRON_EVENT_SERVER
    };
    
    this.initializeTronWeb();
    this.initializeServices();
    
    this.isInitialized = true;
    console.log('✅ TronService已从环境变量配置初始化');
  }

  /**
   * 将网络配置转换为TronConfig格式
   */
  private networkConfigToTronConfig(network: TronNetworkConfig): TronConfig {
    const config: TronConfig = {
      fullHost: network.rpcUrl,
      privateKey: process.env.TRON_PRIVATE_KEY // 私钥仍从环境变量获取
    };

    // 解析额外配置
    if (network.config) {
      const networkConfig = typeof network.config === 'string' 
        ? JSON.parse(network.config) 
        : network.config;
      
      if (networkConfig.solidityNode) {
        config.solidityNode = networkConfig.solidityNode;
      }
      
      if (networkConfig.eventServer) {
        config.eventServer = networkConfig.eventServer;
      }
      
      if (networkConfig.headers && network.apiKey) {
        config.headers = {
          ...networkConfig.headers,
          'TRON-PRO-API-KEY': network.apiKey
        };
      }
    }

    return config;
  }

  /**
   * 设置配置变更监听器
   */
  private setupConfigChangeListener(): void {
    configService.onConfigChange(async (event) => {
      if (event.type === 'tron_networks') {
        console.log('检测到TRON网络配置变更，重新加载配置...');
        await this.reloadNetworkConfiguration();
      }
    });
  }

  /**
   * 重新加载网络配置
   */
  async reloadNetworkConfiguration(): Promise<void> {
    try {
      const defaultNetwork = await configService.getDefaultTronNetwork();
      
      if (!defaultNetwork) {
        console.error('无法找到默认TRON网络配置');
        return;
      }

      this.currentNetwork = defaultNetwork;
      this.config = this.networkConfigToTronConfig(defaultNetwork);
      
      // 重新初始化TronWeb和服务
      this.initializeTronWeb();
      this.initializeServices();
      
      console.log(`✅ TRON网络配置已重新加载: ${defaultNetwork.name}`);
      
    } catch (error) {
      console.error('重新加载TRON网络配置失败:', error);
    }
  }

  /**
   * 等待初始化完成
   */
  async waitForInitialization(): Promise<void> {
    while (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 获取当前网络配置
   */
  getCurrentNetwork(): TronNetworkConfig | null {
    return this.currentNetwork;
  }

  /**
   * 切换到指定网络
   */
  async switchToNetwork(networkId: number): Promise<void> {
    try {
      const network = await configService.getTronNetworkById(networkId.toString());
      
      if (!network) {
        throw new Error(`网络配置不存在: ${networkId}`);
      }

      if (!network.isActive) {
        throw new Error(`网络已禁用: ${network.name}`);
      }

      this.currentNetwork = network;
      this.config = this.networkConfigToTronConfig(network);
      
      // 重新初始化TronWeb和服务
      this.initializeTronWeb();
      this.initializeServices();
      
      console.log(`✅ 已切换到网络: ${network.name}`);
      
    } catch (error) {
      console.error('切换网络失败:', error);
      throw error;
    }
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
    await this.waitForInitialization();
    return await this.accountService.getAccount(address);
  }

  async getAccountResources(address: string): Promise<ServiceResponse<ResourceData>> {
    await this.waitForInitialization();
    return await this.accountService.getAccountResources(address);
  }

  async getAccountInfo(address: string): Promise<ServiceResponse<AccountData>> {
    await this.waitForInitialization();
    return await this.accountService.getAccountInfo(address);
  }

  // ===== 交易相关方法 =====
  async getTransactionsFromAddress(address: string, limit: number = 10, offset: number = 0) {
    await this.waitForInitialization();
    return await this.transactionService.getTransactionsFromAddress(address, limit, offset);
  }

  async getTransaction(txid: string): Promise<ServiceResponse> {
    await this.waitForInitialization();
    return await this.transactionService.getTransaction(txid);
  }

  async monitorTransfer(toAddress: string, amount: number, timeout: number = 300000) {
    await this.waitForInitialization();
    return await this.transactionService.monitorTransfer(toAddress, amount, timeout);
  }

  // ===== 委托相关方法 =====
  async delegateResource(params: DelegateResourceParams): Promise<TransactionResult> {
    await this.waitForInitialization();
    return await this.delegationService.delegateResource(params);
  }

  async undelegateResource(params: Omit<DelegateResourceParams, 'lock' | 'lockPeriod'>): Promise<TransactionResult> {
    await this.waitForInitialization();
    return await this.delegationService.undelegateResource(params);
  }

  // ===== 质押相关方法 =====
  async freezeBalanceV2(params: FreezeBalanceV2Params): Promise<TransactionResult> {
    await this.waitForInitialization();
    return await this.stakingService.freezeBalanceV2(params);
  }

  async unfreezeBalanceV2(params: UnfreezeBalanceV2Params): Promise<TransactionResult> {
    await this.waitForInitialization();
    return await this.stakingService.unfreezeBalanceV2(params);
  }

  async withdrawExpireUnfreeze(params: WithdrawExpireUnfreezeParams): Promise<TransactionResult> {
    await this.waitForInitialization();
    return await this.stakingService.withdrawExpireUnfreeze(params);
  }

  async getStakeOverview(address: string): Promise<ServiceResponse<StakeOverview>> {
    await this.waitForInitialization();
    return await this.stakingService.getStakeOverview(address);
  }

  // 获取质押交易记录
  async getStakeTransactionHistory(address: string, limit: number = 20, offset: number = 0): Promise<ServiceResponse<any[]>> {
    await this.waitForInitialization();
    return await this.stakingService.getStakeTransactionHistory(address, limit, offset);
  }

  // 获取委托交易记录
  async getDelegateTransactionHistory(address: string, limit: number = 20, offset: number = 0): Promise<ServiceResponse<any[]>> {
    await this.waitForInitialization();
    return await this.stakingService.getDelegateTransactionHistory(address, limit, offset);
  }

  // 获取解质押记录
  async getUnfreezeTransactionHistory(address: string, limit: number = 20, offset: number = 0): Promise<ServiceResponse<any[]>> {
    await this.waitForInitialization();
    return await this.stakingService.getUnfreezeTransactionHistory(address, limit, offset);
  }

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
    await this.waitForInitialization();
    return await this.stakingService.recordStakeTransaction(params);
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
    await this.waitForInitialization();
    return await this.transactionService.recordEnergyTransaction(data);
  }

  // ===== TronWeb 实例访问方法 =====
  async getTronWeb(): Promise<any> {
    await this.waitForInitialization();
    return this.tronWeb;
  }
}

// 创建默认实例（使用数据库配置）
export const tronService = new TronService();

// 创建传统配置实例的工厂函数
export function createTronServiceWithConfig(config: TronConfig): TronService {
  return new TronService(config);
}
export default TronService;

// 导出所有类型以保持向后兼容
export * from './tron/types/tron.types';
