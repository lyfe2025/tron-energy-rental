import { createRequire } from 'module';
import { query } from '../database/index';
const require = createRequire(import.meta.url);
const TronWeb = require('tronweb');

export interface TronConfig {
  fullHost: string;
  privateKey?: string;
  solidityNode?: string;
  eventServer?: string;
}

export interface DelegateResourceParams {
  ownerAddress: string;
  receiverAddress: string;
  balance: number;
  resource: 'ENERGY' | 'BANDWIDTH';
  lock: boolean;
  lockPeriod?: number;
}

export interface TransactionResult {
  success: boolean;
  txid?: string;
  error?: string;
  energyUsed?: number;
  netUsed?: number;
}

export interface FreezeBalanceV2Params {
  ownerAddress: string;
  frozenBalance: number;
  resource: 'ENERGY' | 'BANDWIDTH';
}

export interface UnfreezeBalanceV2Params {
  ownerAddress: string;
  unfreezeBalance: number;
  resource: 'ENERGY' | 'BANDWIDTH';
}

export interface WithdrawExpireUnfreezeParams {
  ownerAddress: string;
}

export interface StakeOverview {
  totalStaked: number;
  totalDelegated: number;
  availableEnergy: number;
  availableBandwidth: number;
  pendingUnfreeze: number;
  withdrawableAmount: number;
}

export class TronService {
  private tronWeb: any;
  private config: TronConfig;

  constructor(config: TronConfig) {
    this.config = config;
    this.initializeTronWeb();
  }

  private initializeTronWeb() {
    try {
      console.log('TronWeb type:', typeof TronWeb);
      console.log('TronWeb:', TronWeb);
      
      // 使用TronWeb.TronWeb构造函数
        if (TronWeb && TronWeb.TronWeb) {
          // 初始化时不设置私钥，后续根据需要设置
          const config: any = {
            fullHost: this.config.fullHost
          };
          
          if (this.config.solidityNode) {
            config.solidityNode = this.config.solidityNode;
          }
          
          if (this.config.eventServer) {
            config.eventServer = this.config.eventServer;
          }
          
          this.tronWeb = new TronWeb.TronWeb(config);
          
          // 如果提供了有效的私钥，则设置
          if (this.config.privateKey && this.config.privateKey.length === 64) {
            this.tronWeb.setPrivateKey(this.config.privateKey);
          }
        } else {
          throw new Error('TronWeb.TronWeb constructor not found');
        }
      
      console.log('TronWeb initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TronWeb:', error);
      throw error;
    }
  }

  // 获取账户信息
  async getAccount(address: string) {
    try {
      const account = await this.tronWeb.trx.getAccount(address);
      return {
        success: true,
        data: {
          address: this.tronWeb.address.fromHex(account.address),
          balance: account.balance || 0,
          energy: account.account_resource?.energy_usage || 0,
          bandwidth: account.bandwidth || 0,
          frozen: account.frozen || []
        }
      };
    } catch (error) {
      console.error('Failed to get account:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取账户资源信息
  async getAccountResources(address: string) {
    try {
      const resources = await this.tronWeb.trx.getAccountResources(address);
      return {
        success: true,
        data: {
          energy: {
            used: resources.EnergyUsed || 0,
            limit: resources.EnergyLimit || 0,
            available: (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0)
          },
          bandwidth: {
            used: resources.NetUsed || 0,
            limit: resources.NetLimit || 0,
            available: (resources.NetLimit || 0) - (resources.NetUsed || 0)
          }
        }
      };
    } catch (error) {
      console.error('Failed to get account resources:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取地址的交易历史
  async getTransactionsFromAddress(address: string, limit: number = 10, offset: number = 0) {
    try {
      const transactions = await this.tronWeb.trx.getTransactionsFromAddress(address, limit, offset);
      return transactions;
    } catch (error) {
      console.error('Failed to get transactions from address:', error);
      return [];
    }
  }

  // 委托资源
  async delegateResource(params: DelegateResourceParams): Promise<TransactionResult> {
    try {
      const {
        ownerAddress,
        receiverAddress,
        balance,
        resource,
        lock,
        lockPeriod
      } = params;

      // 构建交易
      const transaction = await this.tronWeb.transactionBuilder.delegateResource(
        this.tronWeb.address.toHex(ownerAddress),
        this.tronWeb.address.toHex(receiverAddress),
        balance,
        resource,
        lock,
        lockPeriod
      );

      // 签名交易
      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      
      // 广播交易
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 记录到数据库
        await this.recordEnergyTransaction({
          txid: result.txid,
          from_address: ownerAddress,
          to_address: receiverAddress,
          amount: balance,
          resource_type: resource.toLowerCase(),
          status: 'pending',
          lock_period: lockPeriod || 0
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Transaction failed'
        };
      }
    } catch (error) {
      console.error('Failed to delegate resource:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 取消委托资源
  async undelegateResource(params: Omit<DelegateResourceParams, 'lock' | 'lockPeriod'>): Promise<TransactionResult> {
    try {
      const {
        ownerAddress,
        receiverAddress,
        balance,
        resource
      } = params;

      const transaction = await this.tronWeb.transactionBuilder.undelegateResource(
        this.tronWeb.address.toHex(ownerAddress),
        this.tronWeb.address.toHex(receiverAddress),
        balance,
        resource
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Transaction failed'
        };
      }
    } catch (error) {
      console.error('Failed to undelegate resource:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取交易信息
  async getTransaction(txid: string) {
    try {
      const transaction = await this.tronWeb.trx.getTransaction(txid);
      const transactionInfo = await this.tronWeb.trx.getTransactionInfo(txid);
      
      return {
        success: true,
        data: {
          ...transaction,
          ...transactionInfo
        }
      };
    } catch (error) {
      console.error('Failed to get transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 监控转账交易
  async monitorTransfer(toAddress: string, amount: number, timeout: number = 300000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkTransfer = async () => {
        try {
          // 获取最近的交易
          const transactions = await this.tronWeb.trx.getTransactionsFromAddress(toAddress, 1, 0);
          
          for (const tx of transactions) {
            if (tx.raw_data.contract[0].parameter.value.amount >= amount) {
              resolve({
                success: true,
                txid: tx.txID,
                amount: tx.raw_data.contract[0].parameter.value.amount
              });
              return;
            }
          }
          
          // 检查超时
          if (Date.now() - startTime > timeout) {
            resolve({
              success: false,
              error: 'Transfer monitoring timeout'
            });
            return;
          }
          
          // 继续监控
          setTimeout(checkTransfer, 5000);
        } catch (error) {
          reject(error);
        }
      };
      
      checkTransfer();
    });
  }

  // 质押TRX (Stake 2.0)
  async freezeBalanceV2(params: FreezeBalanceV2Params): Promise<TransactionResult> {
    try {
      const { ownerAddress, frozenBalance, resource } = params;

      const transaction = await this.tronWeb.transactionBuilder.freezeBalanceV2(
        this.tronWeb.address.toHex(ownerAddress),
        frozenBalance,
        resource
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 记录质押到数据库
        await this.recordStakeTransaction({
          transactionId: result.txid,
          poolId: 1, // 默认能量池ID
          address: ownerAddress,
          amount: frozenBalance,
          resourceType: resource as 'ENERGY' | 'BANDWIDTH',
          operationType: 'freeze'
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Freeze transaction failed'
        };
      }
    } catch (error) {
      console.error('Failed to freeze balance v2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 解质押TRX (Stake 2.0)
  async unfreezeBalanceV2(params: UnfreezeBalanceV2Params): Promise<TransactionResult> {
    try {
      const { ownerAddress, unfreezeBalance, resource } = params;

      const transaction = await this.tronWeb.transactionBuilder.unfreezeBalanceV2(
        this.tronWeb.address.toHex(ownerAddress),
        unfreezeBalance,
        resource
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 记录解质押到数据库
        await this.recordStakeTransaction({
          transactionId: result.txid,
          poolId: 1, // 默认能量池ID
          address: ownerAddress,
          amount: unfreezeBalance,
          resourceType: resource as 'ENERGY' | 'BANDWIDTH',
          operationType: 'unfreeze',
          unfreezeTime: new Date(),
          expireTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14天后
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Unfreeze transaction failed'
        };
      }
    } catch (error) {
      console.error('Failed to unfreeze balance v2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 提取已到期的解质押资金
  async withdrawExpireUnfreeze(params: WithdrawExpireUnfreezeParams): Promise<TransactionResult> {
    try {
      const { ownerAddress } = params;

      const transaction = await this.tronWeb.transactionBuilder.withdrawExpireUnfreeze(
        this.tronWeb.address.toHex(ownerAddress)
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 记录提取操作到数据库
        await this.recordStakeTransaction({
          transactionId: result.txid,
          poolId: 1, // 默认能量池ID
          address: ownerAddress,
          amount: 0, // 提取金额在交易详情中
          resourceType: 'ENERGY', // 默认为ENERGY类型
          operationType: 'withdraw'
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Withdraw transaction failed'
        };
      }
    } catch (error) {
      console.error('Failed to withdraw expire unfreeze:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取账户质押概览
  async getStakeOverview(address: string): Promise<{ success: boolean; data?: StakeOverview; error?: string }> {
    try {
      const account = await this.tronWeb.trx.getAccount(address);
      const resources = await this.tronWeb.trx.getAccountResources(address);
      
      // 获取质押信息
      const frozenV2 = account.frozenV2 || [];
      const totalStakedEnergy = frozenV2
        .filter((f: any) => f.type === 'ENERGY')
        .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
      const totalStakedBandwidth = frozenV2
        .filter((f: any) => f.type === 'BANDWIDTH')
        .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
      
      // 获取委托信息
      const delegatedResources = account.delegated_frozenV2_balance_for_energy || 0;
      const delegatedBandwidth = account.delegated_frozenV2_balance_for_bandwidth || 0;
      
      // 获取待解质押信息
      const unfrozenV2 = account.unfrozenV2 || [];
      const pendingUnfreeze = unfrozenV2
        .filter((u: any) => u.unfreeze_expire_time > Date.now())
        .reduce((sum: number, u: any) => sum + (u.unfreeze_amount || 0), 0);
      
      // 获取可提取金额
      const withdrawableAmount = unfrozenV2
        .filter((u: any) => u.unfreeze_expire_time <= Date.now())
        .reduce((sum: number, u: any) => sum + (u.unfreeze_amount || 0), 0);

      return {
        success: true,
        data: {
          totalStaked: totalStakedEnergy + totalStakedBandwidth,
          totalDelegated: delegatedResources + delegatedBandwidth,
          availableEnergy: (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0),
          availableBandwidth: (resources.NetLimit || 0) - (resources.NetUsed || 0),
          pendingUnfreeze,
          withdrawableAmount
        }
      };
    } catch (error) {
      console.error('Failed to get stake overview:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 记录质押相关交易到数据库
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
    try {
      if (params.operationType === 'freeze' || params.operationType === 'unfreeze') {
        // 记录到 stake_records 表
        await query(
          `INSERT INTO stake_records 
           (transaction_id, pool_id, address, amount, resource_type, operation_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            params.transactionId,
            params.poolId,
            params.address,
            params.amount,
            params.resourceType,
            params.operationType,
            'confirmed'
          ]
        );
        
        if (params.operationType === 'unfreeze' && params.unfreezeTime && params.expireTime) {
          // 同时记录到 unfreeze_records 表
          await query(
            `INSERT INTO unfreeze_records 
             (transaction_id, pool_id, address, amount, resource_type, unfreeze_time, expire_time, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              params.transactionId,
              params.poolId,
              params.address,
              params.amount,
              params.resourceType,
              params.unfreezeTime,
              params.expireTime,
              'confirmed'
            ]
          );
        }
      } else if (params.operationType === 'delegate' || params.operationType === 'undelegate') {
        // 记录到 delegate_records 表
        await query(
          `INSERT INTO delegate_records 
           (transaction_id, pool_id, from_address, to_address, amount, resource_type, lock_period, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            params.transactionId,
            params.poolId,
            params.fromAddress || params.address,
            params.toAddress || params.address,
            params.amount,
            params.resourceType,
            params.lockPeriod || 3,
            'confirmed'
          ]
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Record stake transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  // 记录能量交易到数据库
  private async recordEnergyTransaction(data: {
    txid: string;
    from_address: string;
    to_address: string;
    amount: number;
    resource_type: string;
    status: string;
    lock_period: number;
  }) {
    try {
      await query(
        `INSERT INTO energy_transactions (
          transaction_id, from_address, to_address, amount,
          resource_type, status, lock_period, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.txid,
          data.from_address,
          data.to_address,
          data.amount,
          data.resource_type,
          data.status,
          data.lock_period,
          new Date()
        ]
      );
    } catch (error) {
      console.error('Failed to record energy transaction:', error);
    }
  }

  // 获取账户信息 (为了兼容routes中的调用)
  async getAccountInfo(address: string) {
    return await this.getAccount(address);
  }

  // 地址转换为十六进制 (为了兼容routes中的调用)
  addressToHex(address: string): string {
    return this.convertAddress(address, true) || '';
  }

  // 验证地址格式
  isValidAddress(address: string): boolean {
    try {
      return this.tronWeb.isAddress(address);
    } catch (error) {
      return false;
    }
  }

  // 转换地址格式
  convertAddress(address: string, toHex: boolean = false) {
    try {
      if (toHex) {
        return this.tronWeb.address.toHex(address);
      } else {
        return this.tronWeb.address.fromHex(address);
      }
    } catch (error) {
      console.error('Failed to convert address:', error);
      return null;
    }
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