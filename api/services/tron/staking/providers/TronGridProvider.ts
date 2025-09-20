import type {
  ChainParametersResponse,
  NetworkConfig,
  ServiceResponse,
  TronGridAccountResponse
} from '../types/staking.types.ts';

import { TronGridApiClient } from './tron-grid/TronGridApiClient.ts';
import { TronGridDataFormatter } from './tron-grid/TronGridDataFormatter.ts';
import { TronGridErrorHandler } from './tron-grid/TronGridErrorHandler.ts';
import { TronGridValidator } from './tron-grid/TronGridValidator.ts';

/**
 * TronGrid API提供者主协调器
 * 整合API客户端、数据格式化、错误处理和验证等服务
 */
export class TronGridProvider {
  private apiClient: TronGridApiClient;
  private dataFormatter: TronGridDataFormatter;
  private errorHandler: TronGridErrorHandler;
  private validator: TronGridValidator;
  private tronWeb: any; // TronWeb实例用于地址格式转换

  constructor(networkConfig?: NetworkConfig, tronWeb?: any) {
    this.apiClient = new TronGridApiClient(networkConfig);
    this.dataFormatter = new TronGridDataFormatter();
    this.errorHandler = new TronGridErrorHandler();
    this.validator = new TronGridValidator();
    this.tronWeb = tronWeb; // 保存TronWeb实例
  }

  // Getter方法用于访问内部组件
  getApiClient() {
    return this.apiClient;
  }

  getErrorHandler() {
    return this.errorHandler;
  }

  getValidator() {
    return this.validator;
  }

  /**
   * 设置网络配置
   */
  setNetworkConfig(config: NetworkConfig): void {
    // 验证配置
    const validation = this.errorHandler.validateNetworkConfig(config);
    if (!validation.isValid) {
      console.error(`[TronGridProvider] 网络配置无效: ${validation.error}`);
      return;
    }

    this.apiClient.setNetworkConfig(config);
  }

  /**
   * 获取账户的所有交易记录
   */
  async getAccountTransactions(
    address: string, 
    limit: number = 20, 
    orderBy: string = 'block_timestamp,desc'
  ): Promise<ServiceResponse<any[]>> {
    // 验证参数
    const validation = this.validator.validateSearchParams({ address, limit });
    if (!validation.isValid) {
      return this.errorHandler.handleException(
        new Error(validation.errors.join(', ')),
        '获取账户交易记录',
        []
      );
    }

    return this.errorHandler.handleApiCall(
      () => this.apiClient.getRequest(`/v1/accounts/${address}/transactions?limit=${Math.min(limit * 10, 200)}&order_by=${orderBy}&visible=true`),
      '获取账户交易记录',
      async (response) => {
        const data = await response.json();
        let transactions = data.data || [];

        console.log(`[TronGridProvider] 🔍 API原始响应分析:`, {
          dataType: typeof data.data,
          isArray: Array.isArray(data.data),
          firstTransaction: data.data?.[0] ? {
            txID: data.data[0].txID?.substring(0, 12),
            contractType: data.data[0].raw_data?.contract?.[0]?.type,
            owner_address: data.data[0].raw_data?.contract?.[0]?.parameter?.value?.owner_address,
            receiver_address: data.data[0].raw_data?.contract?.[0]?.parameter?.value?.receiver_address
          } : 'N/A'
        });

        // 处理TronGrid API可能返回对象而非数组的情况
        if (transactions && typeof transactions === 'object' && !Array.isArray(transactions)) {
          console.log(`[TronGridProvider] 🔧 检测到对象格式数据，转换为数组`);
          
          // 将对象的值转换为数组
          const transactionValues = Object.values(transactions);
          console.log(`[TronGridProvider] 转换前对象键数: ${Object.keys(transactions).length}`);
          console.log(`[TronGridProvider] 转换后数组长度: ${transactionValues.length}`);
          
          // 调试：检查转换后的第一个交易是否有正确的结构
          if (transactionValues.length > 0) {
            const firstTx = transactionValues[0] as any;
            console.log(`[TronGridProvider] 🔍 转换后第一条交易结构检查:`, {
              hasTxID: !!firstTx?.txID,
              hasRawData: !!firstTx?.raw_data,
              hasContract: !!firstTx?.raw_data?.contract,
              contractType: firstTx?.raw_data?.contract?.[0]?.type,
              txID: firstTx?.txID?.substring(0, 12) + '...'
            });
          }
          
          transactions = transactionValues;
        }

        // 确保transactions是数组
        if (!Array.isArray(transactions)) {
          console.warn(`[TronGridProvider] ⚠️ 无法处理数据格式:`, typeof transactions);
          transactions = [];
        }

        // 最终验证：检查数组中的交易是否有正确的结构
        if (transactions.length > 0) {
          const validTransactions = transactions.filter(tx => tx && typeof tx === 'object');
          console.log(`[TronGridProvider] 📊 数据验证: 总数 ${transactions.length}, 有效交易 ${validTransactions.length}`);
          
          if (validTransactions.length !== transactions.length) {
            console.warn(`[TronGridProvider] ⚠️ 发现 ${transactions.length - validTransactions.length} 条无效交易数据`);
            transactions = validTransactions;
          }
        }

        // 验证响应数据
        const responseValidation = this.validator.validateTransactionList(transactions);
        if (!responseValidation.isValid) {
          console.warn('[TronGridProvider] 交易数据验证失败:', responseValidation.errors);
        }

        console.log(`[TronGridProvider] 成功获取 ${transactions.length} 条交易记录`);
        
        // 🔄 地址格式标准化：确保所有地址都是Base58格式
        transactions = this.normalizeAddressFormats(transactions);
        
        const sanitizedData = this.validator.sanitizeResponseData(transactions);
        
        return sanitizedData;
      },
      []
    );
  }

  /**
   * 标准化地址格式：将hex地址转换为Base58格式
   * 转换失败时保持原格式，确保不影响整体功能
   */
  private normalizeAddressFormats(transactions: any[]): any[] {
    try {
      console.log(`[TronGridProvider] 🔄 开始地址格式标准化，处理 ${transactions.length} 条交易`);
      
      let convertedCount = 0;
      
      const processedTransactions = transactions.map((tx, index) => {
        if (!tx || !tx.raw_data || !tx.raw_data.contract) {
          return tx;
        }
        
        // 处理每个合约中的地址
        const processedTx = { ...tx };
        processedTx.raw_data = { ...tx.raw_data };
        processedTx.raw_data.contract = tx.raw_data.contract.map((contract: any) => {
          if (!contract || !contract.parameter || !contract.parameter.value) {
            return contract;
          }
          
          const processedContract = { ...contract };
          processedContract.parameter = { ...contract.parameter };
          processedContract.parameter.value = { ...contract.parameter.value };
          
          const value = processedContract.parameter.value;
          
          // 转换owner_address
          if (value.owner_address) {
            const originalAddress = value.owner_address;
            const converted = this.convertToBase58(originalAddress);
            if (converted && converted !== originalAddress) {
              value.owner_address = converted;
              convertedCount++;
            }
          }
          
          // 转换receiver_address
          if (value.receiver_address) {
            const originalAddress = value.receiver_address;
            const converted = this.convertToBase58(originalAddress);
            if (converted && converted !== originalAddress) {
              value.receiver_address = converted;
              convertedCount++;
            }
          }
          
          // 转换to_address（如果存在）
          if (value.to_address) {
            const originalAddress = value.to_address;
            const converted = this.convertToBase58(originalAddress);
            if (converted && converted !== originalAddress) {
              value.to_address = converted;
              convertedCount++;
            }
          }
          
          return processedContract;
        });
        
        return processedTx;
      });
      
      console.log(`[TronGridProvider] ✅ 地址格式标准化完成:`, {
        总交易数: transactions.length,
        转换成功: convertedCount,
        保持原格式: transactions.length - convertedCount,
        状态: '完成（转换失败时保持原格式）'
      });
      
      return processedTransactions;
      
    } catch (error: any) {
      console.warn(`[TronGridProvider] ⚠️ 地址格式标准化失败，保持原格式:`, error.message);
      return transactions; // 发生错误时返回原数据，确保不影响整体功能
    }
  }

  /**
   * 将地址转换为Base58格式
   * @param address 可能是hex或Base58格式的地址
   * @returns Base58格式的地址，转换失败时返回null
   */
  private convertToBase58(address: string): string | null {
    try {
      if (!address || typeof address !== 'string') {
        return null;
      }
      
      // 🎯 根据TRON官方文档进行标准格式检查
      // Base58格式：以T开头的34字符地址
      if (address.startsWith('T') && address.length === 34) {
        // 已经是标准Base58格式，直接返回
        return address;
      }
      
      // Hex格式：以41开头的42字符十六进制地址
      if (address.length === 42 && address.startsWith('41') && /^41[0-9a-fA-F]{40}$/.test(address)) {
        // 🚀 标准Hex格式，使用TronWeb官方转换
        if (this.tronWeb && this.tronWeb.address && this.tronWeb.address.fromHex) {
          try {
            const base58Address = this.tronWeb.address.fromHex(address);
            
            // 验证转换结果符合Base58标准
            if (base58Address && base58Address.startsWith('T') && base58Address.length === 34) {
              console.log(`[TronGridProvider] ✅ 标准Hex→Base58转换: ${address.substring(0, 12)}... → ${base58Address.substring(0, 12)}...`);
              return base58Address;
            }
          } catch (conversionError: any) {
            console.log(`[TronGridProvider] ⚠️ TronWeb转换失败: ${address.substring(0, 12)}...，错误: ${conversionError.message}`);
          }
        } else {
          console.log(`[TronGridProvider] ⚠️ TronWeb不可用，无法转换标准Hex地址: ${address.substring(0, 12)}...`);
        }
      } else {
        // 非标准格式地址，记录并保持原样
        if (!address.startsWith('T')) {
          console.log(`[TronGridProvider] ⚠️ 非标准TRON地址格式: ${address.substring(0, 12)}... (长度: ${address.length})`);
          console.log(`[TronGridProvider] 📖 TRON标准格式参考: https://developers.tron.network/docs/account`);
        }
      }
      
      // 保持原格式，确保不影响整体显示
      return address;
      
    } catch (error: any) {
      console.log(`[TronGridProvider] ⚠️ 地址处理异常，保持原格式: ${error.message}`);
      return address;
    }
  }


  /**
   * 获取账户详细信息
   */
  async getAccountInfo(address: string): Promise<ServiceResponse<TronGridAccountResponse>> {
    // 验证地址格式
    const validation = this.errorHandler.validateTronAddress(address);
    if (!validation.isValid) {
      return this.errorHandler.handleException(
        new Error(validation.error || 'Invalid address'),
        '获取账户信息'
      );
    }

    return this.errorHandler.handleApiCall(
      () => this.apiClient.postRequest('/wallet/getaccount', {
        address: address,
        visible: true
      }),
      '获取账户信息',
      async (response) => {
        const accountInfo = await response.json();

        // 验证响应数据
        const responseValidation = this.validator.validateAccountInfo(accountInfo);
        if (!responseValidation.isValid) {
          console.warn('[TronGridProvider] 账户信息验证失败:', responseValidation.errors);
        }

        console.log(`[TronGridProvider] 成功获取账户信息`);
        return this.validator.sanitizeResponseData(accountInfo);
      }
    );
  }

  /**
   * 获取TRON网络链参数
   */
  async getChainParameters(): Promise<ServiceResponse<ChainParametersResponse>> {
    return this.errorHandler.handleApiCall(
      () => this.apiClient.postRequest('/wallet/getchainparameters', {}),
      '查询TRON网络链参数',
      async (response) => {
        const chainParams = await response.json();

        // 验证响应数据
        const responseValidation = this.validator.validateChainParameters(chainParams);
        if (!responseValidation.isValid) {
          console.warn('[TronGridProvider] 链参数验证失败:', responseValidation.errors);
        }

        console.log(`[TronGridProvider] ✅ 获取到链参数`);
        return this.validator.sanitizeResponseData(chainParams);
      }
    );
  }

  /**
   * 搜索代理给指定地址的交易
   */
  async searchDelegateTransactionsByReceiver(
    receiverAddress: string,
    limit: number = 20
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log(`[TronGridProvider] 搜索代理给 ${receiverAddress} 的交易`);

      // 验证参数
      const validation = this.validator.validateSearchParams({ address: receiverAddress, limit });
      if (!validation.isValid) {
        return this.errorHandler.handleException(
          new Error(validation.errors.join(', ')),
          '搜索接收方交易',
          []
        );
      }

      // 搜索最近的代理合约交易
      const contractTypes = ['DelegateResourceContract', 'UnDelegateResourceContract'];
      const searchPromises = contractTypes.map(contractType => 
        this.searchTransactionsByContract(contractType, Math.ceil(limit / contractTypes.length * 2))
      );

      const searchResults = await Promise.all(searchPromises);
      
      // 合并所有搜索结果
      const allTransactions: any[] = [];
      for (const result of searchResults) {
        if (result.success && result.data) {
          allTransactions.push(...result.data);
        }
      }

      console.log(`[TronGridProvider] 搜索到总计 ${allTransactions.length} 条代理交易`);

      // 过滤出接收方为指定地址的交易
      const filteredTransactions = allTransactions.filter((tx: any) => {
        const contract = tx.raw_data?.contract?.[0];
        const parameter = contract?.parameter?.value;
        
        if (parameter?.receiver_address) {
          try {
            const receiverAddressBase58 = this.dataFormatter.convertHexToBase58(parameter.receiver_address);
            return receiverAddressBase58.toLowerCase() === receiverAddress.toLowerCase();
          } catch (error) {
            console.warn('[TronGridProvider] 地址转换失败:', error);
            return false;
          }
        }
        
        return false;
      });

      // 按时间戳排序并限制数量
      const sortedTransactions = filteredTransactions
        .sort((a, b) => (b.block_timestamp || 0) - (a.block_timestamp || 0))
        .slice(0, limit);

      console.log(`[TronGridProvider] 过滤后得到 ${sortedTransactions.length} 条目标交易`);

      return {
        success: true,
        data: this.validator.sanitizeResponseData(sortedTransactions)
      };
    } catch (error: any) {
      return this.errorHandler.handleException(error, '搜索接收方交易', []);
    }
  }

  /**
   * 根据合约类型搜索交易
   */
  private async searchTransactionsByContract(
    contractType: string,
    limit: number = 50
  ): Promise<ServiceResponse<any[]>> {
    // 验证合约类型
    const validation = this.validator.validateSearchParams({ contractType, limit });
    if (!validation.isValid) {
      return this.errorHandler.handleException(
        new Error(validation.errors.join(', ')),
        `搜索 ${contractType} 交易`,
        []
      );
    }

    return this.errorHandler.handleApiCall(
      () => this.apiClient.getRequest(`/v1/transactions?contract_type=${contractType}&limit=${limit}&order_by=block_timestamp,desc&visible=true`),
      `搜索 ${contractType} 交易`,
      async (response) => {
        const data = await response.json();
        const transactions = data.data || [];

        console.log(`[TronGridProvider] 找到 ${transactions.length} 条 ${contractType} 交易`);
        return this.validator.sanitizeResponseData(transactions);
      },
      []
    );
  }

  /**
   * 获取账户质押状态 - 包含解锁中和待提取的TRX
   */
  async getAccountStakeStatus(address: string): Promise<ServiceResponse<{
    unlockingTrx: number;
    withdrawableTrx: number;
    stakedEnergy: number;
    stakedBandwidth: number;
    delegatedEnergy: number;
    delegatedBandwidth: number;
  }>> {
    try {
      console.log(`[TronGridProvider] 🔍 获取账户质押状态: ${address}`);

      // 验证地址
      const addressValidation = this.errorHandler.validateTronAddress(address);
      if (!addressValidation.isValid) {
        const defaultStakeStatus = {
          unlockingTrx: 0,
          withdrawableTrx: 0,
          stakedEnergy: 0,
          stakedBandwidth: 0,
          delegatedEnergy: 0,
          delegatedBandwidth: 0
        };
        
        return this.errorHandler.handleException(
          new Error(addressValidation.error || 'Invalid address'),
          '获取账户质押状态',
          defaultStakeStatus
        );
      }

      // 并行获取账户信息和交易记录
      const [accountInfoResponse, transactionsResponse] = await Promise.all([
        this.getAccountInfo(address),
        this.getAccountTransactions(address, 50)
      ]);

      const defaultStakeStatus = {
        unlockingTrx: 0,
        withdrawableTrx: 0,
        stakedEnergy: 0,
        stakedBandwidth: 0,
        delegatedEnergy: 0,
        delegatedBandwidth: 0
      };

      if (!accountInfoResponse.success || !accountInfoResponse.data) {
        return {
          success: false,
          error: '获取账户信息失败',
          data: defaultStakeStatus
        };
      }

      const accountInfo = accountInfoResponse.data;
      console.log(`[TronGridProvider] 🔍 开始分析账户质押状态 - 地址: ${address}`);
      
      // 使用数据格式化器处理质押状态
      const stakeStatus = this.dataFormatter.formatStakeStatus(
        accountInfo, 
        transactionsResponse.success ? transactionsResponse.data : []
      );

      // 验证返回数据
      const stakeValidation = this.validator.validateStakeStatus(stakeStatus);
      if (!stakeValidation.isValid) {
        console.warn('[TronGridProvider] 质押状态数据验证失败:', stakeValidation.errors);
      }

      console.log(`[TronGridProvider] ✅ 质押状态计算完成:`, stakeStatus);

      return {
        success: true,
        data: stakeStatus
      };
    } catch (error: any) {
      const defaultStakeStatus = {
        unlockingTrx: 0,
        withdrawableTrx: 0,
        stakedEnergy: 0,
        stakedBandwidth: 0,
        delegatedEnergy: 0,
        delegatedBandwidth: 0
      };
      
      return this.errorHandler.handleException(error, '获取账户质押状态', defaultStakeStatus);
    }
  }

  /**
   * 获取网络解锁期参数
   */
  async getNetworkUnlockPeriod(): Promise<number | null> {
    try {
      const chainParamsResponse = await this.getChainParameters();
      
      if (!chainParamsResponse.success || !chainParamsResponse.data) {
        return null;
      }

      return this.dataFormatter.parseUnlockPeriodFromChainParams(chainParamsResponse.data);
    } catch (error: any) {
      console.error('[TronGridProvider] 查询网络解锁期失败:', error);
      return null;
    }
  }

  // ===================
  // 便利方法
  // ===================

  /**
   * 筛选特定类型的交易
   */
  filterTransactionsByType(transactions: any[], contractTypes: string[]): any[] {
    return this.dataFormatter.filterTransactionsByType(transactions, contractTypes);
  }

  /**
   * 写入调试日志到文件
   */
  writeDebugLog(content: string): void {
    this.errorHandler.writeDebugLog(content);
  }

  /**
   * 获取网络信息
   */
  getNetworkInfo(): {
    name: string;
    id: string;
    isTestNet: boolean;
    isValid: boolean;
  } {
    return this.apiClient.getNetworkInfo();
  }
}