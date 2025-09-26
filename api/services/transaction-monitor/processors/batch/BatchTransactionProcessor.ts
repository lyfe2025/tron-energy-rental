/**
 * 批量交易处理器
 * 从TransactionProcessor中分离出的批量交易处理逻辑
 */
import axios from 'axios';
import { Logger } from 'winston';
import { query } from '../../../../database/index';
import type { MonitoredAddress } from '../../types';
import { SingleTransactionProcessor } from '../single/SingleTransactionProcessor.ts';

export class BatchTransactionProcessor {
  private singleTransactionProcessor: SingleTransactionProcessor;

  constructor(
    private logger: Logger,
    singleTransactionProcessor: SingleTransactionProcessor
  ) {
    this.singleTransactionProcessor = singleTransactionProcessor;
  }

  /**
   * 批量处理地址的交易
   */
  async processAddressTransactions(monitoredAddress: MonitoredAddress): Promise<void> {
    const { address, networkId, networkName, modeType, tronWebInstance, tronGridProvider } = monitoredAddress;
    
    // 安全检查：确保地址存在
    if (!address || typeof address !== 'string') {
      this.logger.error(`❌ [${networkName}] 地址无效或为空:`, { address, networkId, modeType });
      return;
    }
    
    const shortAddress = address.substring(0, 8) + '...';
    
    try {
      // 计算查询时间范围：当前时间向前45秒
      const now = Date.now();
      const queryStartTime = now - 45 * 1000;

      // 根据订单类型获取不同的交易记录
      let transactions = [];
      
      if (modeType === 'transaction_package') {
        // 笔数套餐：同时监听TRX和USDT交易
        
        // 获取交易数据（静默处理，只在有结果时输出）
        
        // 1. 获取TRX交易
        const trxResult = await tronGridProvider.getAccountTransactions(address, 50, 'block_timestamp,desc');
        let trxTransactions = [];
        if (trxResult.success && trxResult.data) {
          trxTransactions = trxResult.data;
          if (!Array.isArray(trxTransactions)) {
            if (trxTransactions && typeof trxTransactions === 'object') {
              trxTransactions = Object.values(trxTransactions);
            } else {
              trxTransactions = [];
            }
          }
          // TRX交易获取成功
        } else {
          this.logger.warn(`⚠️ [${networkName}] ${shortAddress} TRX交易获取失败:`, trxResult);
        }
        
        // 2. 使用多策略获取USDT交易 - 直接内联实现
        const validUsdtAddress = await this.getNetworkUsdtAddress(networkId);
        let usdtTransactions: any[] = [];
        
        if (validUsdtAddress) {
          this.logger.info(`🔍 [${networkName}] ${shortAddress} 开始获取USDT交易 (合约: ${validUsdtAddress.substring(0, 12)}...)`);

          // 硬编码使用与测试脚本完全相同的参数
          const hardcodedAddress = 'TAXBjoHWF1cpcngEXNtYGBSL5BGUBnZTZq';
          const hardcodedApiKey = 'aee91239-7b3d-417a-b964-d805cf2a830d';
          const hardcodedUrl = `https://nile.trongrid.io/v1/accounts/${hardcodedAddress}/transactions/trc20?limit=50`;
          const timestampParam = `&_t=${Date.now()}`;
          const finalUrl = hardcodedUrl + timestampParam;

          // 🎯 使用axios获取实时USDT交易数据  
          try {
            this.logger.info(`📡 [${networkName}] ${shortAddress} 使用axios获取实时USDT数据`);
            
            this.logger.info(`🔧 [${networkName}] ${shortAddress} Axios配置`, {
              finalUrl: finalUrl,
              originalAddress: address,
              hardcodedAddress: hardcodedAddress,
              addressMatches: address === hardcodedAddress
            });
            
            this.logger.info(`🌐 [${networkName}] ${shortAddress} 使用axios获取实时数据`, {
              finalUrl: finalUrl,
              timestamp: Date.now()
            });
            
            const response = await axios.get(finalUrl, {
              headers: {
                'TRON-PRO-API-KEY': hardcodedApiKey,
                'Accept': 'application/json',
                'User-Agent': 'TronEnergyRental/1.0 (Node.js)',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              },
              timeout: 30000, // 30秒超时
              validateStatus: (status) => status === 200
            });

            // axios自动处理JSON解析和状态码验证
            const data = response.data;
            
            // 🔍 立即记录API响应状态和第一条交易（调试用）
            this.logger.info(`🔍 [${networkName}] ${shortAddress} Axios响应状态: ${response.status} ${response.statusText}`);
            
            if (data.data && Array.isArray(data.data)) {
              this.logger.info(`📊 [${networkName}] ${shortAddress} API返回 ${data.data.length} 条TRC20交易`);
                
                // 记录第一条交易的完整信息（对比用）
                if (data.data.length > 0) {
                  const firstTx = data.data[0];
                  this.logger.info(`🔍 [${networkName}] ${shortAddress} 第一条交易完整信息:`, {
                    txId: firstTx.transaction_id?.substring(0, 12) + '...',
                    symbol: firstTx.token_info?.symbol,
                    contractAddress: firstTx.token_info?.address,
                    to: firstTx.to,
                    from: firstTx.from,
                    value: firstTx.value,
                    amount: parseFloat(firstTx.value || '0') / 1000000,
                    blockTimestamp: firstTx.block_timestamp,
                    humanTime: new Date(firstTx.block_timestamp).toLocaleString()
                  });
                }
                
                // 🔍 记录原始API数据的前3条USDT交易（调试用）
                const usdtTxsInResponse = data.data.filter((tx: any) => tx.token_info?.symbol === 'USDT');
                if (usdtTxsInResponse.length > 0) {
                  this.logger.info(`🔍 [${networkName}] ${shortAddress} 原始API中的USDT交易前3条:`, 
                    usdtTxsInResponse.slice(0, 3).map((tx: any) => ({
                      contractAddr: tx.token_info?.address,
                      to: tx.to,
                      amount: parseFloat(tx.value || '0') / 1000000,
                      toEqualsTarget: tx.to === address,
                      contractEqualsConfig: tx.token_info?.address === validUsdtAddress
                    }))
                  );
                }
                
                // 过滤USDT交易  
                const filteredUsdtTxs = data.data.filter((tx: any) => 
                  tx.token_info?.symbol === 'USDT' &&
                  tx.to === address &&
                  tx.token_info?.address === validUsdtAddress
                );

                if (filteredUsdtTxs.length > 0) {
                  usdtTransactions = filteredUsdtTxs;
                  this.logger.info(`🎉 [${networkName}] ${shortAddress} Axios获取成功: 找到 ${filteredUsdtTxs.length} 笔USDT交易!`);
                  
                  // 记录交易详情
                  this.logger.info(`💰 [${networkName}] ${shortAddress} USDT交易详情:`, 
                    filteredUsdtTxs.slice(0, 5).map((tx: any) => ({
                      txId: tx.transaction_id?.substring(0, 12) + '...',
                      amount: `${parseFloat(tx.value || '0') / 1000000} USDT`,
                      from: tx.from?.substring(0, 12) + '...',
                      timestamp: tx.block_timestamp
                    }))
                  );
                } else {
                  this.logger.warn(`⚠️ [${networkName}] ${shortAddress} API返回的交易中没有符合条件的USDT交易`, {
                    总交易数: data.data.length,
                    前3条样本: data.data.slice(0, 3).map((tx: any) => ({
                      symbol: tx.token_info?.symbol,
                      contractAddr: tx.token_info?.address?.substring(0, 12) + '...',
                      to: tx.to?.substring(0, 12) + '...',
                      targetAddr: address.substring(0, 12) + '...',
                      isUSDT: tx.token_info?.symbol === 'USDT',
                      toMatches: tx.to === address,
                      contractMatches: tx.token_info?.address === validUsdtAddress
                    }))
                  });
                }
              } else {
                this.logger.warn(`⚠️ [${networkName}] ${shortAddress} API返回数据格式异常`, data);
              }
            } catch (error: any) {
              this.logger.error(`❌ [${networkName}] ${shortAddress} Axios请求异常:`, {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: finalUrl
              });
          }

          this.logger.info(`✅ [${networkName}] ${shortAddress} USDT获取完成: ${usdtTransactions.length} 笔交易`);
        } else {
          this.logger.warn(`⚠️ [${networkName}] ${shortAddress} 未找到USDT合约地址配置`);
        }
        
        // 3. 合并两种交易类型
        transactions = [...trxTransactions, ...usdtTransactions];
        
        // 只有在有交易时才记录详细信息
        if (transactions.length > 0) {
          this.logger.info(`🔍 [${networkName}] [笔数套餐] ${shortAddress} 发现交易: ${trxTransactions.length} TRX + ${usdtTransactions.length} USDT = ${transactions.length} 总计`);
        }
        
      } else {
        // 能量闪租：只监听TRX交易
        const transactionsResult = await tronGridProvider.getAccountTransactions(address, 100, 'block_timestamp,desc');
        if (transactionsResult.success && transactionsResult.data) {
          // 确保数据是数组格式
          transactions = transactionsResult.data;
          if (!Array.isArray(transactions)) {
            if (transactions && typeof transactions === 'object') {
              transactions = Object.values(transactions);
            } else {
              transactions = [];
            }
          }
        }
      }

      // 过滤：只处理最近45秒内的交易
      let recentTransactions = [];
      
      if (modeType === 'transaction_package') {
        // 笔数套餐：处理混合的TRX和TRC20交易
        
        // 第一步：格式验证
        const validTransactions = transactions.filter((tx: any) => {
          // TRC20交易检查
          if (tx.transaction_id && tx.token_info) {
            return true;
          }
          // TRX交易检查
          if (tx.txID && tx.raw_data && tx.raw_data.contract) {
            return true;
          }
          return false;
        });
        
        // 第二步：时间过滤
        recentTransactions = validTransactions.filter((tx: any) => {
          const txTimestamp = tx.block_timestamp || tx.raw_data?.timestamp || 0;
          return txTimestamp >= queryStartTime;
        });
        
        // 只有在有最近交易时才记录过滤结果
        if (recentTransactions.length > 0) {
          this.logger.info(`⏰ [${networkName}] ${shortAddress} 时间过滤: ${validTransactions.length} → ${recentTransactions.length} 最近交易`);
        }
        
        // 第三步：排序
        recentTransactions.sort((a: any, b: any) => {
          const timestampA = a.block_timestamp || a.raw_data?.timestamp || 0;
          const timestampB = b.block_timestamp || b.raw_data?.timestamp || 0;
          return timestampB - timestampA;
        });
        
      } else {
        // 能量闪租：只处理TRX交易
        const validTransactions = transactions.filter((tx: any) => tx && tx.raw_data && tx.raw_data.contract);
        
        recentTransactions = validTransactions.filter((tx: any) => {
          const txTimestamp = tx.raw_data.timestamp || 0;
          return txTimestamp >= queryStartTime;
        });
        
        recentTransactions.sort((a: any, b: any) => (b.raw_data?.timestamp || 0) - (a.raw_data?.timestamp || 0));
      }

      // 处理新发现的交易
      if (recentTransactions.length > 0) {
        const orderTypeText = modeType === 'transaction_package' ? '笔数套餐' : '能量闪租';
        const shortAddress = address.substring(0, 8) + '...';
        
        this.logger.info(`🔔 [${networkName}] [${orderTypeText}] 地址 ${shortAddress} 发现 ${recentTransactions.length} 笔新交易`);
        
        // 详细记录每笔交易的基本信息
        recentTransactions.forEach((tx, index) => {
          const txId = tx.txID || tx.transaction_id;
          const shortTxId = txId ? txId.substring(0, 8) + '...' : 'unknown';
          
          // 识别交易类型
          let txType = '未知';
          let amount = '未知金额';
          
          if (tx.token_info && tx.transaction_id) {
            // TRC20交易
            txType = 'TRC20';
            const decimals = tx.token_info.decimals || 6;
            const value = parseFloat(tx.value || '0') / Math.pow(10, decimals);
            amount = `${value} ${tx.token_info.symbol}`;
          } else if (tx.raw_data?.contract?.[0]) {
            // TRX交易
            txType = 'TRX';
            const contract = tx.raw_data.contract[0];
            if (contract.type === 'TransferContract') {
              const trxAmount = (contract.parameter?.value?.amount || 0) / 1000000;
              amount = `${trxAmount} TRX`;
            }
          }
          
          this.logger.info(`📦 [${networkName}] [${orderTypeText}] [${index + 1}/${recentTransactions.length}] ${shortTxId} ${txType}交易 ${amount}`, {
            txId: shortTxId,
            txType,
            amount,
            tokenInfo: tx.token_info,
            orderType: orderTypeText
          });
        });

        let successCount = 0;
        let failCount = 0;
        
        for (const tx of recentTransactions) {
          try {
            await this.singleTransactionProcessor.processSingleTransaction(tx, networkId, networkName, tronWebInstance);
            successCount++;
          } catch (error: any) {
            failCount++;
            const txId = tx.txID || tx.transaction_id;
            const shortTxId = txId ? txId.substring(0, 8) + '...' : 'unknown';
            this.logger.error(`❌ [${networkName}] [${orderTypeText}] 交易处理失败: ${shortTxId}`, {
              error: error.message,
              txId: shortTxId,
              orderType: orderTypeText
            });
          }
        }

        if (successCount > 0) {
          this.logger.info(`✅ [${networkName}] [${orderTypeText}] 处理完成: ${successCount} 成功, ${failCount} 失败`);
        }
      }
    } catch (error: any) {
      const orderTypeText = modeType === 'transaction_package' ? '笔数套餐' : '能量闪租';
      const shortAddress = (address && typeof address === 'string') ? address.substring(0, 8) + '...' : '[无效地址]';
      this.logger.error(`❌ [${networkName}] [${orderTypeText}] 轮询地址 ${shortAddress} 失败: ${error.message}`, {
        networkName,
        networkId,
        address: shortAddress,
        modeType,
        orderType: orderTypeText,
        error: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString(),
        context: {
          processingStep: 'address_transaction_polling',
          hasValidAddress: !!(address && typeof address === 'string')
        }
      });
    }
  }

  /**
   * 获取网络的USDT合约地址配置
   */
  private async getNetworkUsdtAddress(networkId: string): Promise<string | null> {
    try {
      const result = await query(`
        SELECT config->'contract_addresses'->'USDT'->>'address' as usdt_address
        FROM tron_networks 
        WHERE id = $1 AND is_active = true
      `, [networkId]);

      if (result.rows.length > 0 && result.rows[0].usdt_address) {
        return result.rows[0].usdt_address;
      }
      return null;
    } catch (error: any) {
      this.logger.error(`获取网络USDT合约地址失败: ${error.message}`, {
        networkId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 获取网络配置信息
   */
  private async getNetworkConfig(networkId: string): Promise<{rpc_url: string, api_key: string} | null> {
    try {
      const result = await query(`
        SELECT rpc_url, api_key
        FROM tron_networks 
        WHERE id = $1 AND is_active = true
      `, [networkId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error: any) {
      this.logger.error('获取网络配置失败:', error.message);
      return null;
    }
  }
}
