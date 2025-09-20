import TronWeb from 'tronweb';
import { Logger } from 'winston';
import { DatabaseService } from '../database/DatabaseService';
import { createBotLogger } from '../utils/logger';
import { RedisService } from './cache/RedisService';
import { PaymentService } from './payment';

interface MonitoredAddress {
  address: string;
  networkId: string;
  networkName: string;
  tronWebInstance: any;
}

interface Transaction {
  txID: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  confirmed: boolean;
}

export class TransactionMonitorService {
  private logger: Logger;
  private intervalId?: NodeJS.Timeout;
  private readonly POLL_INTERVAL = 5000; // 5秒轮询
  private readonly PROCESSED_TX_TTL = 86400; // 24小时
  private monitoredAddresses: Map<string, MonitoredAddress> = new Map();
  private isRunning = false;

  constructor(
    private redisService: RedisService,
    private paymentService: PaymentService,
    private databaseService: DatabaseService
  ) {
    this.logger = createBotLogger('TransactionMonitor');
  }

  /**
   * 启动交易监听服务
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('TransactionMonitorService已在运行中');
      return;
    }

    try {
      // 加载需要监听的地址
      await this.loadMonitoredAddresses();
      
      if (this.monitoredAddresses.size === 0) {
        this.logger.warn('没有需要监听的地址，跳过启动监听服务');
        return;
      }

      this.isRunning = true;
      this.logger.info(`启动交易监听服务，监听 ${this.monitoredAddresses.size} 个地址`);
      
      // 立即执行一次轮询
      await this.pollTransactions();
      
      // 启动定时轮询
      this.intervalId = setInterval(async () => {
        try {
          await this.pollTransactions();
        } catch (error) {
          this.logger.error('轮询交易时发生错误:', error);
        }
      }, this.POLL_INTERVAL);

      this.logger.info('交易监听服务启动成功');
    } catch (error) {
      this.isRunning = false;
      this.logger.error('启动交易监听服务失败:', error);
      throw error;
    }
  }

  /**
   * 停止交易监听服务
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.monitoredAddresses.clear();
    this.logger.info('交易监听服务已停止');
  }

  /**
   * 重新加载监听地址（当配置更新时调用）
   */
  async reloadAddresses(): Promise<void> {
    this.logger.info('重新加载监听地址...');
    await this.loadMonitoredAddresses();
    this.logger.info(`重新加载完成，当前监听 ${this.monitoredAddresses.size} 个地址`);
  }

  /**
   * 加载需要监听的地址
   */
  private async loadMonitoredAddresses(): Promise<void> {
    try {
      // 清空现有地址
      this.monitoredAddresses.clear();

      // 从数据库获取所有激活的能量闪租配置
      const query = `
        SELECT 
          pc.config->>'payment_address' as payment_address,
          pc.network_id,
          tn.name as network_name,
          tn.config
        FROM price_configs pc
        JOIN tron_networks tn ON pc.network_id = tn.id
        WHERE pc.mode_type = 'energy_flash' 
          AND pc.is_active = true
          AND pc.config->>'payment_address' IS NOT NULL
      `;

      const result = await this.databaseService.query(query);

      for (const row of result.rows) {
        const address = row.payment_address;
        const networkId = row.network_id;
        const networkName = row.network_name;
        const networkConfig = row.config;

        if (!address || !networkId) {
          this.logger.warn(`跳过无效配置: address=${address}, networkId=${networkId}`);
          continue;
        }

        try {
          // 创建对应网络的TronWeb实例
          const tronWebInstance = new (TronWeb as any)({
            fullHost: networkConfig.fullNode,
            headers: { "TRON-PRO-API-KEY": networkConfig.apiKey || '' },
            privateKey: '01' // 临时私钥，仅用于查询
          });

          // 验证地址格式
          if (!tronWebInstance.isAddress(address)) {
            this.logger.warn(`无效的TRON地址: ${address}`);
            continue;
          }

          const monitoredAddress: MonitoredAddress = {
            address,
            networkId,
            networkName,
            tronWebInstance
          };

          this.monitoredAddresses.set(`${networkId}_${address}`, monitoredAddress);
          this.logger.info(`添加监听地址: ${address} (${networkName})`);
        } catch (error) {
          this.logger.error(`创建${networkName}网络TronWeb实例失败:`, error);
        }
      }
    } catch (error) {
      this.logger.error('加载监听地址失败:', error);
      throw error;
    }
  }

  /**
   * 轮询所有监听地址的交易
   */
  private async pollTransactions(): Promise<void> {
    if (!this.isRunning || this.monitoredAddresses.size === 0) {
      return;
    }

    const promises = Array.from(this.monitoredAddresses.values()).map(
      (monitoredAddress) => this.pollAddressTransactions(monitoredAddress)
    );

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      this.logger.error('批量轮询交易失败:', error);
    }
  }

  /**
   * 轮询单个地址的交易
   */
  private async pollAddressTransactions(monitoredAddress: MonitoredAddress): Promise<void> {
    try {
      const { address, networkId, networkName, tronWebInstance } = monitoredAddress;
      
      // 获取该地址的最新交易
      const transactions = await tronWebInstance.trx.getTransactionsToAddress(address, 20);
      
      if (!transactions || transactions.length === 0) {
        return;
      }

      // 按时间戳降序排序，处理最新的交易
      const sortedTx = transactions
        .filter((tx: any) => tx.raw_data && tx.raw_data.contract)
        .sort((a: any, b: any) => b.raw_data.timestamp - a.raw_data.timestamp);

      for (const tx of sortedTx) {
        try {
          await this.processSingleTransaction(tx, networkId, networkName, tronWebInstance);
        } catch (error) {
          this.logger.error(`处理交易失败 ${tx.txID}:`, error);
        }
      }
    } catch (error) {
      this.logger.error(`轮询地址 ${monitoredAddress.address} 交易失败:`, error);
    }
  }

  /**
   * 处理单个交易
   */
  private async processSingleTransaction(
    rawTx: any,
    networkId: string,
    networkName: string,
    tronWebInstance: any
  ): Promise<void> {
    const txId = rawTx.txID;
    
    // 检查是否已处理过
    if (await this.isTransactionProcessed(txId)) {
      return;
    }

    try {
      // 验证交易确认状态
      const txInfo = await tronWebInstance.trx.getTransactionInfo(txId);
      if (!txInfo.id || txInfo.result !== 'SUCCESS') {
        return; // 交易未确认或失败
      }

      // 解析交易详情
      const transaction = await this.parseTransaction(rawTx, txInfo, tronWebInstance);
      if (!transaction) {
        return;
      }

      this.logger.info(`检测到新的TRX转账: ${transaction.txID}`, {
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount,
        network: networkName
      });

      // 标记为已处理（先标记，防止重复处理）
      await this.markTransactionProcessed(txId);

      // 交给PaymentService处理
      await this.paymentService.handleFlashRentPayment(transaction, networkId);

    } catch (error) {
      this.logger.error(`处理交易 ${txId} 时发生错误:`, error);
      // 如果处理失败，移除处理标记以便重试
      await this.removeProcessedMark(txId);
    }
  }

  /**
   * 解析交易详情
   */
  private async parseTransaction(
    rawTx: any,
    txInfo: any,
    tronWebInstance: any
  ): Promise<Transaction | null> {
    try {
      const contract = rawTx.raw_data.contract[0];
      
      // 只处理TRX转账交易
      if (contract.type !== 'TransferContract') {
        return null;
      }

      const parameter = contract.parameter.value;
      const fromAddress = tronWebInstance.address.fromHex(parameter.owner_address);
      const toAddress = tronWebInstance.address.fromHex(parameter.to_address);
      const amount = parameter.amount / 1000000; // 转换为TRX

      // 只处理金额大于0的交易
      if (amount <= 0) {
        return null;
      }

      return {
        txID: rawTx.txID,
        blockNumber: txInfo.blockNumber || 0,
        timestamp: rawTx.raw_data.timestamp,
        from: fromAddress,
        to: toAddress,
        amount: amount,
        confirmed: true
      };
    } catch (error) {
      this.logger.error('解析交易详情失败:', error);
      return null;
    }
  }

  /**
   * 检查交易是否已处理
   */
  private async isTransactionProcessed(txId: string): Promise<boolean> {
    try {
      const key = `flash_rent_processed:${txId}`;
      const result = await this.redisService.get(key);
      return result !== null;
    } catch (error) {
      this.logger.error(`检查交易处理状态失败 ${txId}:`, error);
      return false;
    }
  }

  /**
   * 标记交易为已处理
   */
  private async markTransactionProcessed(txId: string): Promise<void> {
    try {
      const key = `flash_rent_processed:${txId}`;
      await this.redisService.set(key, Date.now().toString(), this.PROCESSED_TX_TTL);
    } catch (error) {
      this.logger.error(`标记交易处理状态失败 ${txId}:`, error);
    }
  }

  /**
   * 移除处理标记
   */
  private async removeProcessedMark(txId: string): Promise<void> {
    try {
      const key = `flash_rent_processed:${txId}`;
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error(`移除交易处理标记失败 ${txId}:`, error);
    }
  }

  /**
   * 获取服务状态
   */
  getStatus(): { isRunning: boolean; monitoredAddresses: number } {
    return {
      isRunning: this.isRunning,
      monitoredAddresses: this.monitoredAddresses.size
    };
  }
}
