import TronWeb from 'tronweb';
import { Logger } from 'winston';
import { DatabaseService } from '../database/DatabaseService';
import { createBotLogger, orderLogger } from '../utils/logger';
import { RedisService } from './cache/RedisService';
import { PaymentService } from './payment';
import { TronGridProvider } from './tron/staking/providers/TronGridProvider';

interface MonitoredAddress {
  address: string;
  networkId: string;
  networkName: string;
  tronWebInstance: any;
  tronGridProvider: TronGridProvider;
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
  
  // 🎯 智能查询配置
  private readonly ORDER_PROCESSING_TIME = 90 * 1000; // 90秒保守处理时间
  private readonly QUERY_TIME_WINDOW = this.ORDER_PROCESSING_TIME; // 查询时间窗口
  
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
      this.logger.info(`🚀 启动交易监听服务，监听 ${this.monitoredAddresses.size} 个地址`);
      
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
    this.logger.info('🔄 重新加载监听地址...');
    await this.loadMonitoredAddresses();
    this.logger.info(`✅ 重新加载完成，当前监听 ${this.monitoredAddresses.size} 个地址`);
  }

  /**
   * 加载需要监听的地址
   */
  private async loadMonitoredAddresses(): Promise<void> {
    try {
      // 清空现有地址
      this.monitoredAddresses.clear();

      // 从数据库获取所有激活的能量闪租配置（同时要求网络也激活）
      const query = `
        SELECT 
          pc.config->>'payment_address' as payment_address,
          pc.network_id,
          tn.name as network_name,
          tn.rpc_url,
          tn.api_key,
          tn.config
        FROM price_configs pc
        JOIN tron_networks tn ON pc.network_id = tn.id
        WHERE pc.mode_type = 'energy_flash' 
          AND pc.is_active = true
          AND tn.is_active = true
          AND pc.config->>'payment_address' IS NOT NULL
      `;

      const result = await this.databaseService.query(query);

      for (const row of result.rows) {
        const address = row.payment_address;
        const networkId = row.network_id;
        const networkName = row.network_name;
        const rpcUrl = row.rpc_url;
        const apiKey = row.api_key;

        if (!address || !networkId) {
          this.logger.warn(`跳过无效配置: address=${address}, networkId=${networkId}`);
          continue;
        }

        try {
          // 创建对应网络的TronWeb实例
          const tronWebInstance = new TronWeb.TronWeb({
            fullHost: rpcUrl,
            headers: { "TRON-PRO-API-KEY": apiKey || '' },
            privateKey: '01' // 临时私钥，仅用于查询
          });

          // 验证地址格式
          if (!tronWebInstance.isAddress(address)) {
            this.logger.warn(`无效的TRON地址: ${address}`);
            continue;
          }

          // 创建TronGrid提供者用于现代API调用
          const networkConfig = {
            networkId,
            networkName,
            rpcUrl,
            apiKey: apiKey || '',
            isTestNet: networkName.toLowerCase().includes('test')
          };
          const tronGridProvider = new TronGridProvider(networkConfig, tronWebInstance);

          const monitoredAddress: MonitoredAddress = {
            address,
            networkId,
            networkName,
            tronWebInstance,
            tronGridProvider
          };

          this.monitoredAddresses.set(`${networkId}_${address}`, monitoredAddress);
          this.logger.info(`🌐 [${networkName}] 添加监听地址: ${address}`);
        } catch (error) {
          this.logger.error(`❌ [${networkName}] 创建TronWeb实例失败:`, error);
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
   * 轮询单个地址的交易 - 基于时间窗口的智能查询
   */
  private async pollAddressTransactions(monitoredAddress: MonitoredAddress): Promise<void> {
    const { address, networkId, networkName, tronWebInstance, tronGridProvider } = monitoredAddress;
    
    try {
      // 🕐 计算查询时间范围：当前时间向前90秒
      const now = Date.now();
      const queryStartTime = now - this.QUERY_TIME_WINDOW;
      
      // 📥 查询最近90秒内的交易记录（增加查询数量以确保覆盖时间窗口）
      const transactionsResult = await tronGridProvider.getAccountTransactions(address, 200, 'block_timestamp,desc');
      
      if (!transactionsResult.success || !transactionsResult.data) {
        return;
      }

      // 确保数据是数组格式
      let transactions = transactionsResult.data;
      if (!Array.isArray(transactions)) {
        if (transactions && typeof transactions === 'object') {
          transactions = Object.values(transactions);
        } else {
          transactions = [];
        }
      }

      // 🎯 过滤：只处理最近90秒内的交易
      const recentTransactions = transactions
        .filter((tx: any) => tx && tx.raw_data && tx.raw_data.contract)
        .filter((tx: any) => {
          const txTimestamp = tx.raw_data.timestamp || 0;
          return txTimestamp >= queryStartTime;
        })
        .sort((a: any, b: any) => (b.raw_data?.timestamp || 0) - (a.raw_data?.timestamp || 0));

      // 📊 只显示关键信息：待处理交易数量
      if (recentTransactions.length > 0) {
        this.logger.info(`🔍 [${networkName}] 发现 ${recentTransactions.length} 条待处理交易记录`);
        
        // =============== 开始处理 ===============
        orderLogger.info(`=============== 开始处理 [${networkName}] ===============`, { 
          networkName, 
          transactionCount: recentTransactions.length 
        });
        
        let processedCount = 0;
        for (const tx of recentTransactions) {
          try {
            processedCount++;
            orderLogger.info(`${processedCount}. 处理交易: ${tx.txID}`, { 
              txId: tx.txID,
              networkName,
              step: 1
            });
            await this.processSingleTransaction(tx, networkId, networkName, tronWebInstance);
          } catch (error) {
            orderLogger.error(`❌ 处理交易失败 ${tx.txID}`, { 
              txId: tx.txID,
              networkName,
              error: error.message 
            });
          }
        }
        
        // =============== 处理结束 ===============
        orderLogger.info(`=============== 处理结束 [${networkName}] ===============`, { 
          networkName, 
          processedCount 
        });
      }
    } catch (error) {
      this.logger.error(`❌ [${networkName}] 轮询地址 ${monitoredAddress.address} 交易失败:`, error);
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
      // ✅ 修复：明确设置 visible: true 确保地址统一为Base58格式
      const txInfo = await tronWebInstance.trx.getTransactionInfo(txId, { visible: true });
      if (!txInfo.id || txInfo.result !== 'SUCCESS') {
        return; // 交易未确认或失败
      }

      // 解析交易详情
      const transaction = await this.parseTransaction(rawTx, txInfo, tronWebInstance);
      if (!transaction) {
        return;
      }

      // 2. 检测到新的TRX转账
      orderLogger.info(`   2. 检测到TRX转账: ${transaction.amount} TRX`, {
        txId: transaction.txID,
        amount: `${transaction.amount} TRX`,
        from: transaction.from,
        to: transaction.to,
        networkName,
        step: 2
      });

      // 3. 标记交易为处理中
      await this.markTransactionProcessed(txId);
      orderLogger.info(`   3. 标记交易为处理中`, {
        txId: transaction.txID,
        networkName,
        step: 3
      });

      // 4. 转交给PaymentService处理
      orderLogger.info(`   4. 转交给PaymentService处理`, {
        txId: transaction.txID,
        networkName,
        step: 4
      });
      
      await this.paymentService.handleFlashRentPayment(transaction, networkId);
      
      orderLogger.info(`   ✅ 交易处理完成`, {
        txId: transaction.txID,
        networkName,
        status: 'completed'
      });

    } catch (error) {
      this.logger.error(`❌ [${networkName}] 处理交易 ${txId} 时发生错误:`, error);
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
      // 如果是Redis连接问题，跳过去重检查让交易继续处理
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        this.logger.warn(`Redis连接不可用，跳过交易去重检查 ${txId}`);
        return false;
      }
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
      // 如果是Redis连接问题，只警告但不影响交易处理
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        this.logger.warn(`Redis连接不可用，无法标记交易处理状态 ${txId}，但交易处理将继续`);
        return;
      }
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
      // 如果是Redis连接问题，只警告但不影响交易处理
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        this.logger.warn(`Redis连接不可用，无法移除交易处理标记 ${txId}`);
        return;
      }
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
