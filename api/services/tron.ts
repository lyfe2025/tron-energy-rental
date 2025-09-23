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
      console.log(`🚀 [闪租代理] 开始为闪租业务代理能量`, {
        目标地址: toAddress,
        需要能量: totalEnergy,
        持续时间: durationHours + '小时',
        网络ID: networkId
      });

      // 1. 选择合适的能量池账户
      const selectedAccount = await this.selectEnergyPoolAccount(totalEnergy, networkId);
      if (!selectedAccount) {
        throw new Error('没有找到有足够能量的池账户');
      }

      console.log(`✅ [闪租代理] 成功选中能量池账户: ${selectedAccount.name || '未命名'} (${selectedAccount.address})`, {
        账户名称: selectedAccount.name || '未命名',
        TRON地址: selectedAccount.address,
        优先级: selectedAccount.priority,
        实时可用能量: selectedAccount.available_energy,
        需要能量: totalEnergy,
        剩余能量: selectedAccount.available_energy - totalEnergy,
        成本: selectedAccount.cost_per_energy
      });

      // 2. 设置能量池账户私钥
      console.log(`🔑 [闪租代理] 设置能量池账户私钥: ${selectedAccount.address}`);
      await this.setPoolAccountPrivateKey(selectedAccount.id);

      try {
        // 3. 执行能量代理
        const delegationParams = {
          ownerAddress: selectedAccount.address,
          receiverAddress: toAddress,
          balance: Math.ceil(totalEnergy / 1000), // 转换为TRX sun units 
          resource: 'ENERGY' as 'ENERGY',
          lock: durationHours > 0,
          lockPeriod: durationHours > 0 ? Math.ceil(durationHours * 3600 / 3) : undefined // TRON锁定期以3秒为单位
        };

        console.log(`⚡ [闪租代理] 开始执行能量代理`, {
          委托方地址: delegationParams.ownerAddress,
          接收方地址: delegationParams.receiverAddress,
          代理能量: totalEnergy,
          转换后TRX_Sun: delegationParams.balance,
          资源类型: delegationParams.resource,
          是否锁定: delegationParams.lock,
          锁定期: delegationParams.lockPeriod ? `${delegationParams.lockPeriod} 个3秒单位` : '无',
          持续时间: durationHours + '小时'
        });

        const delegationResult = await this.delegationService.delegateResource(delegationParams);

        if (!delegationResult.success) {
          console.error(`❌ [闪租代理] 能量代理失败`, {
            错误: delegationResult.error,
            委托方: selectedAccount.address,
            接收方: toAddress,
            能量: totalEnergy
          });
          throw new Error(`能量代理失败: ${delegationResult.error}`);
        }

        console.log(`✅ [闪租代理] 能量代理成功!`, {
          交易ID: delegationResult.txid,
          委托方: selectedAccount.address,
          接收方: toAddress,
          代理能量: totalEnergy,
          持续时间: durationHours + '小时'
        });
        
        return delegationResult.txid!;

      } finally {
        // 4. 恢复默认私钥
        console.log(`🔄 [闪租代理] 恢复默认私钥`);
        await this.restoreDefaultPrivateKey();
      }
    } catch (error) {
      console.error('❌ [闪租代理] 闪租能量代理失败:', {
        错误消息: error.message,
        目标地址: toAddress,
        需要能量: totalEnergy,
        持续时间: durationHours + '小时',
        网络ID: networkId,
        错误栈: error.stack
      });
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
      console.log(`🔍 [能量池选择] 开始选择能量池账户`, {
        需要能量: requiredEnergy,
        网络ID: networkId
      });

      // 按优先级查询能量池账户
      const result = await query(
        `SELECT id, name, tron_address, private_key_encrypted, total_energy, 
                available_energy, status, priority, cost_per_energy
         FROM energy_pools
         WHERE status = 'active'
         ORDER BY priority DESC`,
        []
      );

      if (!result.rows || result.rows.length === 0) {
        console.error(`❌ [能量池选择] 未找到活跃的能量池账户`);
        return null;
      }

      console.log(`📋 [能量池选择] 找到 ${result.rows.length} 个活跃的能量池账户:`);
      result.rows.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.name || '未命名'} (${account.tron_address})`, {
          优先级: account.priority,
          数据库总能量: account.total_energy,
          数据库可用能量: account.available_energy,
          状态: account.status,
          单位成本: account.cost_per_energy
        });
      });

      // 依次检查每个账户的可用能量
      let checkedCount = 0;
      for (const account of result.rows) {
        checkedCount++;
        console.log(`🔍 [能量池选择] 检查第 ${checkedCount} 个账户: ${account.name || '未命名'} (${account.tron_address})`);
        
        try {
          const realTimeAvailableEnergy = await this.checkAvailableEnergy(account.tron_address, networkId);
          
          console.log(`📊 [能量池选择] 账户 ${account.tron_address} 能量检查结果:`, {
            账户名称: account.name || '未命名',
            地址: account.tron_address,
            需要能量: requiredEnergy,
            实时可用能量: realTimeAvailableEnergy,
            数据库可用能量: account.available_energy,
            是否足够: realTimeAvailableEnergy >= requiredEnergy ? '✅ 足够' : '❌ 不足',
            差额: realTimeAvailableEnergy - requiredEnergy
          });
          
          if (realTimeAvailableEnergy >= requiredEnergy) {
            console.log(`✅ [能量池选择] 选中账户: ${account.name || '未命名'} (${account.tron_address})`, {
              优先级: account.priority,
              实时可用能量: realTimeAvailableEnergy,
              需要能量: requiredEnergy,
              剩余能量: realTimeAvailableEnergy - requiredEnergy
            });
            
            return {
              ...account,
              address: account.tron_address, // 保持向后兼容
              private_key: account.private_key_encrypted, // 保持向后兼容
              available_energy: realTimeAvailableEnergy
            };
          } else {
            console.warn(`⚠️ [能量池选择] 账户 ${account.tron_address} 能量不足`, {
              需要: requiredEnergy,
              可用: realTimeAvailableEnergy,
              缺少: requiredEnergy - realTimeAvailableEnergy
            });
          }
        } catch (error) {
          console.error(`❌ [能量池选择] 检查账户 ${account.tron_address} 能量失败:`, {
            错误: error.message,
            账户名称: account.name || '未命名'
          });
          continue;
        }
      }

      console.error(`❌ [能量池选择] 所有 ${result.rows.length} 个能量池账户都无法满足需求`, {
        需要能量: requiredEnergy,
        检查了账户数: checkedCount
      });
      return null;
    } catch (error) {
      console.error('❌ [能量池选择] 选择能量池账户失败:', error);
      return null;
    }
  }

  /**
   * 检查账户可用能量（根据指定网络获取实时数据）
   */
  private async checkAvailableEnergy(address: string, networkId: string): Promise<number> {
    try {
      console.log(`🔍 [能量检查] 开始检查账户能量: ${address}`, {
        网络ID: networkId,
        检查模式: '指定网络实时获取'
      });
      
      // 使用能量池管理中已实现的网络特定实时数据获取接口
      const response = await fetch('/api/energy-pool/accounts/validate-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: address,
          network_id: networkId
        })
      });

      if (!response.ok) {
        console.error(`❌ [能量检查] 网络请求失败: ${response.status} ${response.statusText}`);
        return 0;
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        console.error(`❌ [能量检查] 获取账户资源失败: ${address}`, {
          错误: result.message || '未知错误',
          网络ID: networkId
        });
        return 0;
      }

      const accountData = result.data;
      const energy = accountData.energy;
      
      // 从实时数据中获取可用能量
      const totalEnergyLimit = energy?.total || energy?.limit || 0;
      const usedEnergy = energy?.used || 0;
      const availableEnergy = energy?.available || (totalEnergyLimit - usedEnergy);
      const finalAvailableEnergy = Math.max(0, availableEnergy);

      console.log(`📊 [能量检查] 账户 ${address} 在 ${accountData.networkInfo?.name || '指定网络'} 的能量详情:`, {
        网络信息: {
          ID: accountData.networkInfo?.id,
          名称: accountData.networkInfo?.name,
          类型: accountData.networkInfo?.type,
          RPC: accountData.networkInfo?.rpcUrl
        },
        账户地址: address,
        总能量限制: totalEnergyLimit,
        已使用能量: usedEnergy,
        可用能量: finalAvailableEnergy,
        能量使用率: totalEnergyLimit > 0 ? `${((usedEnergy / totalEnergyLimit) * 100).toFixed(1)}%` : '0%',
        TRX余额: (accountData.balance / 1000000).toFixed(6) + ' TRX',
        USDT余额: accountData.usdtBalance || 0,
        资源详情: {
          '🔋 能量': energy,
          '📶 带宽': accountData.bandwidth
        }
      });

      return finalAvailableEnergy;
    } catch (error) {
      console.error(`❌ [能量检查] 检查地址 ${address} 可用能量失败:`, {
        错误消息: error.message,
        网络ID: networkId,
        错误栈: error.stack
      });
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
