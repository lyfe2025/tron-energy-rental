import { query } from '../database/index.js';
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
      
      // 更新StakingService的网络配置
      if (this.stakingService) {
        this.stakingService.setNetworkConfig(this.currentNetwork);
      }
      
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
  async switchToNetwork(networkId: string | number): Promise<void> {
    try {
      console.log(`[TronService] 🔀 开始切换网络，ID: ${networkId}`);
      const network = await configService.getTronNetworkById(networkId.toString());
      
      if (!network) {
        throw new Error(`网络配置不存在: ${networkId}`);
      }

      if (!network.isActive) {
        throw new Error(`网络已禁用: ${network.name}`);
      }

      console.log(`[TronService] 📋 网络配置详情:`, {
        name: network.name,
        rpc_url: network.rpcUrl,
        api_key: network.apiKey ? `${network.apiKey.substring(0, 8)}...` : 'none'
      });

      this.currentNetwork = network;
      this.config = this.networkConfigToTronConfig(network);
      
      // 重新初始化TronWeb和服务
      this.initializeTronWeb();
      this.initializeServices();
      
      // 更新StakingService的网络配置
      if (this.stakingService) {
        console.log(`[TronService] 📤 更新StakingService网络配置`);
        this.stakingService.setNetworkConfig(this.currentNetwork);
        console.log(`[TronService] ✅ StakingService网络配置已更新`);
      }
      
      console.log(`✅ 已切换到网络: ${network.name} (${network.rpcUrl})`);
      
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
    this.stakingService = new StakingService(this.tronWeb, this.currentNetwork);
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
    const { appendFileSync } = await import('fs');
    appendFileSync('/tmp/tron-debug.log', `=== TronService.getStakeTransactionHistory 被调用 ${new Date().toISOString()} ===\n`);
    appendFileSync('/tmp/tron-debug.log', `地址: ${address}, 限制: ${limit}, 偏移: ${offset}\n`);
    appendFileSync('/tmp/tron-debug.log', `stakingService存在: ${!!this.stakingService}\n`);
    
    await this.waitForInitialization();
    appendFileSync('/tmp/tron-debug.log', `初始化完成，调用stakingService...\n`);
    
    const result = await this.stakingService.getStakeTransactionHistory(address, limit, offset);
    appendFileSync('/tmp/tron-debug.log', `stakingService返回结果: ${JSON.stringify({success: result.success, dataLength: result.data?.length})}\n\n`);
    
    return result;
  }

  // 获取委托交易记录
  async getDelegateTransactionHistory(address: string, limit: number = 20, offset: number = 0): Promise<ServiceResponse<any[]>> {
    const { appendFileSync } = await import('fs');
    appendFileSync('/tmp/tron-debug.log', `=== TronService.getDelegateTransactionHistory 被调用 ${new Date().toISOString()} ===\n`);
    appendFileSync('/tmp/tron-debug.log', `地址: ${address}, 限制: ${limit}, 偏移: ${offset}\n`);
    
    await this.waitForInitialization();
    appendFileSync('/tmp/tron-debug.log', `初始化完成，调用stakingService...\n`);
    
    const result = await this.stakingService.getDelegateTransactionHistory(address, limit, offset);
    appendFileSync('/tmp/tron-debug.log', `stakingService返回结果: ${JSON.stringify({success: result.success, dataLength: result.data?.length})}\n`);
    
    // 如果有数据，记录前几条的详细信息
    if (result.success && result.data && result.data.length > 0) {
      appendFileSync('/tmp/tron-debug.log', `前3条记录详情:\n`);
      result.data.slice(0, 3).forEach((record, index) => {
        appendFileSync('/tmp/tron-debug.log', `记录${index + 1}: ${JSON.stringify({
          operation_type: record.operation_type,
          amount: record.amount,
          to_address: record.to_address,
          from_address: record.from_address,
          transaction_id: record.transaction_id?.substring(0, 12)
        })}\n`);
      });
    }
    appendFileSync('/tmp/tron-debug.log', `\n`);
    
    return result;
  }

  // 新增：智能代理记录获取方法
  async getDelegateRecords(
    address: string,
    direction?: 'out' | 'in',
    limit: number = 20,
    offset: number = 0,
    useOfficialAPI: boolean = true
  ): Promise<ServiceResponse<any[]>> {
    const { appendFileSync } = await import('fs');
    appendFileSync('/tmp/tron-debug.log', `=== TronService.getDelegateRecords 被调用 ${new Date().toISOString()} ===\n`);
    appendFileSync('/tmp/tron-debug.log', `参数: address=${address}, direction=${direction}, useOfficialAPI=${useOfficialAPI}\n`);
    
    await this.waitForInitialization();
    
    const result = await this.stakingService.getDelegateRecords(address, direction, limit, offset, useOfficialAPI);
    appendFileSync('/tmp/tron-debug.log', `智能代理记录结果: ${JSON.stringify({success: result.success, dataLength: result.data?.length})}\n`);
    
    return result;
  }

  /**
   * 根据能量池账户ID获取私钥并临时设置给TronWeb实例
   */
  async setPoolAccountPrivateKey(poolAccountId: string): Promise<void> {
    try {
      console.log(`🔍 [TronService] 获取能量池账户私钥: ${poolAccountId}`);
      
      // 查询能量池的私钥
      const result = await query(
        'SELECT private_key_encrypted FROM energy_pools WHERE id = $1',
        [poolAccountId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`能量池账户不存在: ${poolAccountId}`);
      }
      
      const privateKey = result.rows[0].private_key_encrypted;
      
      if (!privateKey || privateKey.length !== 64) {
        throw new Error(`能量池账户私钥格式无效: ${poolAccountId}`);
      }
      
      // 设置私钥到TronWeb实例
      this.tronWeb.setPrivateKey(privateKey);
      console.log(`✅ [TronService] 已设置能量池账户私钥: ${poolAccountId}`);
      
    } catch (error) {
      console.error(`❌ [TronService] 设置能量池账户私钥失败:`, error);
      throw error;
    }
  }

  /**
   * 恢复默认私钥
   */
  async restoreDefaultPrivateKey(): Promise<void> {
    try {
      if (this.config.privateKey && this.config.privateKey.length === 64) {
        this.tronWeb.setPrivateKey(this.config.privateKey);
        console.log(`✅ [TronService] 已恢复默认私钥`);
      }
    } catch (error) {
      console.error(`❌ [TronService] 恢复默认私钥失败:`, error);
      throw error;
    }
  }

  // 获取解质押记录
  async getUnfreezeTransactionHistory(address: string, limit: number = 20, offset: number = 0): Promise<ServiceResponse<any[]>> {
    await this.waitForInitialization();
    return await this.stakingService.getUnfreezeTransactionHistory(address, limit, offset);
  }

  /**
   * 为闪租业务代理能量
   * @param toAddress - 接收能量的地址
   * @param totalEnergy - 需要代理的总能量
   * @param durationHours - 代理持续时间（小时）
   * @param networkId - 网络ID
   */
  async delegateEnergyForFlashRent(
    toAddress: string,
    totalEnergy: number,
    durationHours: number,
    networkId: string
  ): Promise<string> {
    await this.waitForInitialization();
    
    try {
      console.log(`开始为闪租业务代理能量`, {
        toAddress,
        totalEnergy,
        durationHours,
        networkId
      });

      // 1. 选择合适的能量池账户
      const selectedAccount = await this.selectEnergyPoolAccount(totalEnergy, networkId);
      if (!selectedAccount) {
        throw new Error('没有找到有足够能量的池账户');
      }

      console.log(`选中能量池账户: ${selectedAccount.address}`, {
        priority: selectedAccount.priority,
        available_energy: selectedAccount.available_energy
      });

      // 2. 设置能量池账户私钥
      await this.setPoolAccountPrivateKey(selectedAccount.id);

      try {
        // 3. 执行能量代理
        const delegationResult = await this.delegationService.delegateResource({
          ownerAddress: selectedAccount.address,
          receiverAddress: toAddress,
          balance: Math.ceil(totalEnergy / 1000), // 转换为TRX sun units 
          resource: 'ENERGY',
          lock: durationHours > 0,
          lockPeriod: durationHours > 0 ? Math.ceil(durationHours * 3600 / 3) : undefined // TRON锁定期以3秒为单位
        });

        if (!delegationResult.success) {
          throw new Error(`能量代理失败: ${delegationResult.error}`);
        }

        console.log(`能量代理成功: ${delegationResult.txid}`);
        return delegationResult.txid!;

      } finally {
        // 4. 恢复默认私钥
        await this.restoreDefaultPrivateKey();
      }
    } catch (error) {
      console.error('闪租能量代理失败:', error);
      throw error;
    }
  }

  /**
   * 选择合适的能量池账户
   */
  private async selectEnergyPoolAccount(
    requiredEnergy: number,
    networkId: string
  ): Promise<any> {
    try {
      // 按优先级查询能量池账户
      const result = await query(
        `SELECT ep.*, a.address, a.private_key
         FROM energy_pools ep
         JOIN accounts a ON ep.account_id = a.id
         WHERE ep.network_id = $1 
           AND ep.is_active = true 
           AND ep.status = 'active'
         ORDER BY ep.priority DESC`,
        [networkId]
      );

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      // 依次检查每个账户的可用能量
      for (const account of result.rows) {
        try {
          const availableEnergy = await this.checkAvailableEnergy(account.address, networkId);
          
          if (availableEnergy >= requiredEnergy) {
            return {
              ...account,
              available_energy: availableEnergy
            };
          }
        } catch (error) {
          console.warn(`检查账户 ${account.address} 能量失败:`, error);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('选择能量池账户失败:', error);
      return null;
    }
  }

  /**
   * 检查账户可用能量
   */
  private async checkAvailableEnergy(address: string, networkId: string): Promise<number> {
    try {
      // 获取账户资源信息
      const resourceResult = await this.getAccountResources(address);
      
      if (!resourceResult.success) {
        return 0;
      }

      const resources = resourceResult.data;
      
      // 计算可用能量
      const totalEnergyLimit = resources.energy?.limit || 0;
      const usedEnergy = resources.energy?.used || 0;
      const availableEnergy = totalEnergyLimit - usedEnergy;

      return Math.max(0, availableEnergy);
    } catch (error) {
      console.error(`检查地址 ${address} 可用能量失败:`, error);
      return 0;
    }
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
// 延迟初始化，避免模块加载时阻塞
let _tronService: TronService | null = null;

export const tronService = (() => {
  if (!_tronService) {
    _tronService = new TronService();
  }
  return _tronService;
})();

// 创建传统配置实例的工厂函数
export function createTronServiceWithConfig(config: TronConfig): TronService {
  return new TronService(config);
}
export default TronService;

// 导出所有类型以保持向后兼容
export * from './tron/types/tron.types';
