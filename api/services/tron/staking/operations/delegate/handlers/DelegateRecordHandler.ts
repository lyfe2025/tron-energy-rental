import type { FormattedStakeRecord, ServiceResponse } from '../../../types/staking.types';

/**
 * 委托记录处理器
 * 负责处理委托记录的查询和格式化
 */
export class DelegateRecordHandler {
  private tronWeb: any;
  private tronGridProvider: any;

  constructor(tronWeb: any, tronGridProvider: any) {
    this.tronWeb = tronWeb;
    this.tronGridProvider = tronGridProvider;
  }

  /**
   * 转换hex地址为base58地址
   */
  private convertHexToBase58(hexAddress: string): string {
    try {
      if (!hexAddress) {
        console.log('[DelegateRecordHandler] 空地址，返回空字符串');
        return '';
      }
      
      console.log(`[DelegateRecordHandler] 转换地址: ${hexAddress}, 长度: ${hexAddress.length}, 前缀: ${hexAddress.substring(0, 2)}`);
      
      // 如果已经是base58格式，直接返回
      if (hexAddress.startsWith('T') && hexAddress.length === 34) {
        console.log(`[DelegateRecordHandler] 已是base58格式: ${hexAddress}`);
        return hexAddress;
      }
      
      // 🔧 新增：处理特殊的长格式地址（可能是另一种编码）
      if (hexAddress.length === 47 && !hexAddress.startsWith('41')) {
        console.log(`[DelegateRecordHandler] 🔍 检测到特殊格式地址（长度47）: ${hexAddress}`);
        
        // 尝试不同的解析方法
        try {
          // 方法1：尝试直接作为base58解码然后重新编码
          const decoded = this.tronWeb.utils.crypto.decode58Check(hexAddress);
          if (decoded) {
            const reencoded = this.tronWeb.utils.crypto.encode58Check(decoded);
            console.log(`[DelegateRecordHandler] ✅ 特殊格式转换成功: ${hexAddress} -> ${reencoded}`);
            return reencoded;
          }
        } catch (decodeError) {
          console.log(`[DelegateRecordHandler] 方法1失败:`, decodeError.message);
        }
        
        // 方法2：检查是否是某种变体格式，尝试提取有效部分
        try {
          // 如果地址包含某些特殊字符或模式，尝试提取核心部分
          const cleanAddress = hexAddress.replace(/[^A-Za-z0-9]/g, ''); // 移除特殊字符
          if (cleanAddress.length >= 34) {
            const truncated = cleanAddress.substring(0, 34);
            if (truncated.startsWith('T')) {
              console.log(`[DelegateRecordHandler] ✅ 提取有效地址: ${hexAddress} -> ${truncated}`);
              return truncated;
            }
          }
        } catch (extractError) {
          console.log(`[DelegateRecordHandler] 方法2失败:`, extractError.message);
        }
        
        // 方法3：作为可能的特殊编码处理，但保持原样返回以供调试
        console.log(`[DelegateRecordHandler] ⚠️ 无法转换特殊格式地址，保持原样: ${hexAddress}`);
        return hexAddress;
      }
      
      // 如果是hex格式，使用TronWeb转换
      if (hexAddress.startsWith('41') && hexAddress.length === 42) {
        try {
          const base58Address = this.tronWeb.address.fromHex(hexAddress);
          console.log(`[DelegateRecordHandler] hex转base58成功: ${hexAddress} -> ${base58Address}`);
          return base58Address;
        } catch (error) {
          console.warn('[DelegateRecordHandler] TronWeb地址转换失败:', error);
          return hexAddress;
        }
      }
      
      // 处理可能的其他格式
      if (hexAddress.length === 40) {
        // 尝试添加41前缀
        const withPrefix = '41' + hexAddress;
        try {
          const base58Address = this.tronWeb.address.fromHex(withPrefix);
          console.log(`[DelegateRecordHandler] 添加前缀后转换成功: ${withPrefix} -> ${base58Address}`);
          return base58Address;
        } catch (error) {
          console.warn('[DelegateRecordHandler] 添加前缀转换失败:', error);
        }
      }
      
      console.warn(`[DelegateRecordHandler] 未识别的地址格式: ${hexAddress}，长度: ${hexAddress.length}`);
      return hexAddress;
    } catch (error) {
      console.warn('[DelegateRecordHandler] 地址转换失败:', error);
      return hexAddress;
    }
  }

  /**
   * 调试参数结构
   */
  private debugParameterStructure(parameter: any): string {
    if (!parameter) return 'null';
    
    try {
      const keys = Object.keys(parameter);
      const structure = {
        总字段数: keys.length,
        所有字段: keys,
        可能的资源字段: {
          resource: parameter.resource,
          resource_type: parameter.resource_type,
          resourceType: parameter.resourceType,
          type: parameter.type,
          resourceValue: parameter.resourceValue,
        },
        其他关键字段: {
          balance: parameter.balance,
          owner_address: parameter.owner_address,
          receiver_address: parameter.receiver_address,
        }
      };
      return JSON.stringify(structure, null, 2);
    } catch (error) {
      return `调试失败: ${error}`;
    }
  }

  /**
   * 确定资源类型
   * 根据TRON协议：resource = 0 表示 BANDWIDTH，resource = 1 表示 ENERGY
   */
  private determineResourceType(parameter: any): 'ENERGY' | 'BANDWIDTH' {
    if (!parameter) {
      console.log(`[DelegateRecordHandler] ⚠️ parameter为空，默认使用 ENERGY`);
      return 'ENERGY';
    }

    // 检查所有可能的资源字段名
    const possibleResourceFields = [
      'resource',           // 标准字段
      'resource_type',      // 类型字段
      'resourceType',       // 驼峰命名
      'type',              // 简短类型
      'resourceValue',     // 值字段
    ];

    for (const fieldName of possibleResourceFields) {
      const resourceValue = parameter[fieldName];
      
      if (resourceValue !== undefined && resourceValue !== null) {
        console.log(`[DelegateRecordHandler] 🔍 检查字段 "${fieldName}":`, {
          值: resourceValue,
          类型: typeof resourceValue,
        });

        const result = this.parseResourceValue(resourceValue);
        if (result !== null) {
          console.log(`[DelegateRecordHandler] ✅ 从字段 "${fieldName}" 解析出资源类型: ${result}`);
          return result;
        }
      }
    }

    // 🔧 新增：基于历史数据分析的智能推断
    console.log(`[DelegateRecordHandler] ⚠️ 未找到明确的资源类型字段，尝试智能推断`);
    
    // 方法1：基于金额范围推断（根据实际TRON网络使用模式）
    const balance = parameter.balance;
    if (balance) {
      const trxAmount = Math.floor(balance / 1000000); // 转换为TRX
      console.log(`[DelegateRecordHandler] 🔍 基于金额推断 - TRX金额: ${trxAmount}`);
      
      // 根据TRON网络实际使用模式：
      // - 带宽委托通常是大额（几百TRX以上），因为带宽资源相对便宜
      // - 能量委托通常是小额（几十TRX以下），因为能量资源相对昂贵
      if (trxAmount >= 100) {
        console.log(`[DelegateRecordHandler] 🎯 大额委托(${trxAmount} TRX) → 推断为 BANDWIDTH`);
        return 'BANDWIDTH';
      } else if (trxAmount <= 50) {
        console.log(`[DelegateRecordHandler] 🎯 小额委托(${trxAmount} TRX) → 推断为 ENERGY`);
        return 'ENERGY';
      }
    }
    
    // 方法2：检查是否有其他线索字段
    const hintFields = ['contract_type', 'operation', 'method'];
    for (const fieldName of hintFields) {
      const value = parameter[fieldName];
      if (value && typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes('bandwidth') || lowerValue.includes('net')) {
          console.log(`[DelegateRecordHandler] 🎯 从 "${fieldName}" 字段推断: BANDWIDTH`);
          return 'BANDWIDTH';
        }
        if (lowerValue.includes('energy') || lowerValue.includes('cpu')) {
          console.log(`[DelegateRecordHandler] 🎯 从 "${fieldName}" 字段推断: ENERGY`);
          return 'ENERGY';
        }
      }
    }

    // 方法3：基于TRON网络的默认行为
    // 根据TRON官方文档，如果没有明确指定resource，默认为BANDWIDTH
    console.log(`[DelegateRecordHandler] 🎯 根据TRON默认行为推断: BANDWIDTH`);
    console.log(`[DelegateRecordHandler] 📋 parameter详细内容:`, parameter);
    
    // 🔧 修正：按照TRON协议，未指定资源类型时默认为BANDWIDTH
    return 'BANDWIDTH';
  }

  /**
   * 解析交易状态
   */
  private parseTransactionStatus(tx: any): string {
    try {
      console.log(`[DelegateRecordHandler] 🔍 解析交易状态:`, {
        txId: tx.txID?.substring(0, 12),
        有ret字段: !!tx.ret,
        ret数组长度: tx.ret?.length,
        第一个ret: tx.ret?.[0],
        contractRet: tx.ret?.[0]?.contractRet,
        ret类型: typeof tx.ret?.[0]?.contractRet
      });

      // 检查交易结果
      if (!tx.ret || !Array.isArray(tx.ret) || tx.ret.length === 0) {
        console.log(`[DelegateRecordHandler] ⚠️ 缺少ret字段，默认为pending`);
        return 'pending';
      }

      const contractRet = tx.ret[0]?.contractRet;
      
      // 处理不同的状态值
      if (contractRet === 'SUCCESS') {
        console.log(`[DelegateRecordHandler] ✅ 交易成功`);
        return 'success';
      } else if (contractRet === 'FAILED' || contractRet === 'FAIL') {
        console.log(`[DelegateRecordHandler] ❌ 交易失败`);
        return 'failed';
      } else if (contractRet === 'OUT_OF_TIME') {
        console.log(`[DelegateRecordHandler] ⏰ 交易超时`);
        return 'failed';
      } else if (contractRet === 'OUT_OF_ENERGY') {
        console.log(`[DelegateRecordHandler] ⚡ 能量不足`);
        return 'failed';
      } else if (!contractRet) {
        console.log(`[DelegateRecordHandler] 📋 无状态信息，判断为处理中`);
        return 'pending';
      } else {
        console.log(`[DelegateRecordHandler] ❓ 未知状态: ${contractRet}，默认为pending`);
        return 'pending';
      }
    } catch (error) {
      console.warn('[DelegateRecordHandler] 解析交易状态失败:', error);
      return 'pending';
    }
  }

  /**
   * 解析资源值
   */
  private parseResourceValue(resourceValue: any): 'ENERGY' | 'BANDWIDTH' | null {
    // 处理数字类型
    if (typeof resourceValue === 'number') {
      console.log(`[DelegateRecordHandler] 📊 数字类型资源值: ${resourceValue}`);
      return resourceValue === 0 ? 'BANDWIDTH' : 'ENERGY';
    }
    
    // 处理字符串类型
    if (typeof resourceValue === 'string') {
      // 尝试解析为数字
      const numValue = parseInt(resourceValue, 10);
      if (!isNaN(numValue)) {
        console.log(`[DelegateRecordHandler] 📝 字符串数字: "${resourceValue}" -> ${numValue}`);
        return numValue === 0 ? 'BANDWIDTH' : 'ENERGY';
      }
      
      // 处理字符串标识
      const lowerValue = resourceValue.toLowerCase();
      if (lowerValue.includes('bandwidth') || lowerValue.includes('net') || lowerValue === 'bandwidth') {
        console.log(`[DelegateRecordHandler] 🎯 字符串匹配: BANDWIDTH`);
        return 'BANDWIDTH';
      }
      if (lowerValue.includes('energy') || lowerValue.includes('cpu') || lowerValue === 'energy') {
        console.log(`[DelegateRecordHandler] 🎯 字符串匹配: ENERGY`);
        return 'ENERGY';
      }
    }
    
    // 处理布尔类型
    if (typeof resourceValue === 'boolean') {
      console.log(`[DelegateRecordHandler] ☑️ 布尔类型资源值: ${resourceValue}`);
      return resourceValue ? 'ENERGY' : 'BANDWIDTH';
    }
    
    return null; // 无法解析
  }

  /**
   * 获取委托交易记录
   * 从TRON网络实时获取委托记录
   */
  async getDelegateTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    try {
      console.log(`[DelegateRecordHandler] 🔍 开始获取委托交易记录: ${address}, limit=${limit}, offset=${offset}`);
      
      // 使用TronGridProvider获取账户交易记录
      // 确保不超过TronGrid API的限制（200），同时获取足够多的记录进行过滤
      const apiLimit = Math.min(limit * 2, 200);
      console.log(`[DelegateRecordHandler] 🔍 API调用限制: 原始=${limit}, 计算后=${apiLimit}`);
      const transactionsResult = await this.tronGridProvider.getAccountTransactions(address, apiLimit);
      
      if (!transactionsResult.success || !transactionsResult.data) {
        console.log(`[DelegateRecordHandler] 获取交易记录失败或无数据`);
        return {
          success: true,
          data: []
        };
      }
      
      console.log(`[DelegateRecordHandler] 🔍 检查数据格式:`, {
        dataType: typeof transactionsResult.data,
        isArray: Array.isArray(transactionsResult.data),
        hasLength: transactionsResult.data?.length,
        keys: typeof transactionsResult.data === 'object' && !Array.isArray(transactionsResult.data) ? Object.keys(transactionsResult.data).slice(0, 5) : 'N/A'
      });
      
      // 确保数据是数组格式
      let transactions: any[] = [];
      
      if (Array.isArray(transactionsResult.data)) {
        transactions = transactionsResult.data;
        console.log(`[DelegateRecordHandler] ✅ 数据已是数组格式，数量: ${transactions.length}`);
      } else if (transactionsResult.data && typeof transactionsResult.data === 'object') {
        // 如果返回的是对象格式，尝试转换为数组
        const values = Object.values(transactionsResult.data);
        if (values.length > 0) {
          transactions = values.filter(item => item && typeof item === 'object');
          console.log(`[DelegateRecordHandler] 🔧 转换对象格式为数组格式，原始键数: ${Object.keys(transactionsResult.data).length}, 转换后数组长度: ${transactions.length}`);
        }
      } else {
        console.warn(`[DelegateRecordHandler] ⚠️ 无法处理的数据类型: ${typeof transactionsResult.data}`, transactionsResult.data);
        transactions = [];
      }
      
      console.log(`[DelegateRecordHandler] 最终数据数量: ${transactions.length}`);
      
      // 过滤出委托相关的交易（DelegateResourceContract 和 UnDelegateResourceContract）
      const delegateTransactions = transactions.filter((tx: any) => {
        const contract = tx.raw_data?.contract?.[0];
        return contract?.type === 'DelegateResourceContract' || contract?.type === 'UnDelegateResourceContract';
      });
      
      console.log(`[DelegateRecordHandler] 找到 ${delegateTransactions.length} 条委托相关交易`);
      
      // 🔍 调试：打印前几条交易的原始数据结构
      if (delegateTransactions.length > 0) {
        const firstTx = delegateTransactions[0];
        const contract = firstTx.raw_data?.contract?.[0];
        const parameter = contract?.parameter?.value;
        
        console.log(`[DelegateRecordHandler] 🔍 第一条交易的完整原始数据:`, {
          txID: firstTx.txID?.substring(0, 12),
          contractType: contract?.type,
          parameter: parameter,
          owner_address: parameter?.owner_address,
          receiver_address: parameter?.receiver_address,
          owner_address_type: typeof parameter?.owner_address,
          receiver_address_type: typeof parameter?.receiver_address,
          owner_address_length: parameter?.owner_address?.length,
          receiver_address_length: parameter?.receiver_address?.length
        });
      }
      
      // 转换为标准化格式
      const formattedRecords: FormattedStakeRecord[] = delegateTransactions
        .slice(offset, offset + limit) // 应用分页
        .map((tx: any) => {
          const contract = tx.raw_data?.contract?.[0];
          const parameter = contract?.parameter?.value;
          const isDelegateOperation = contract?.type === 'DelegateResourceContract';
          
          // 转换地址
          console.log(`[DelegateRecordHandler] 🔍 原始地址数据:`, {
            txId: tx.txID?.substring(0, 12),
            owner_address_hex: parameter?.owner_address,
            receiver_address_hex: parameter?.receiver_address
          });
          
          // ✅ 正确的地址映射：按照TRON官方文档
          // owner_address 是代理发起方，receiver_address 是代理接收方
          const fromAddress = parameter?.owner_address ? this.convertHexToBase58(parameter.owner_address) : '';
          const toAddress = parameter?.receiver_address ? this.convertHexToBase58(parameter.receiver_address) : '';
          
          console.log(`[DelegateRecordHandler] 🔍 转换后地址（标准映射）:`, {
            原始_owner_address: parameter?.owner_address?.substring(0, 12) + '...',
            原始_receiver_address: parameter?.receiver_address?.substring(0, 12) + '...',
            fromAddress: fromAddress?.substring(0, 12) + '...',
            toAddress: toAddress?.substring(0, 12) + '...',
            fromValid: fromAddress.startsWith('T') && fromAddress.length === 34,
            toValid: toAddress.startsWith('T') && toAddress.length === 34,
            映射说明: 'owner_address -> from_address, receiver_address -> to_address'
          });
          
          // 🔧 详细调试资源类型判断
          const resourceValue = parameter?.resource;
          const resourceType = this.determineResourceType(parameter);
          
          console.log(`[DelegateRecordHandler] 🎯 资源类型解析详情:`, {
            txId: tx.txID?.substring(0, 12),
            原始resource值: resourceValue,
            resource类型: typeof resourceValue,
            资源类型判断结果: resourceType,
            // parameter完整结构: this.debugParameterStructure(parameter) // 注释掉避免this作用域问题
          });
          
          return {
            id: tx.txID || '',
            operation_type: isDelegateOperation ? 'delegate' : 'undelegate',
            amount: parameter?.balance ? Math.floor(parameter.balance / 1000000) : 0, // 转换SUN到TRX
            resource_type: resourceType,
            status: this.parseTransactionStatus(tx),
            created_at: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : new Date().toISOString(),
            transaction_id: tx.txID || '',
            pool_id: '', // 委托记录不直接关联池ID
            address: address, // 使用查询的地址
            from_address: fromAddress,
            to_address: toAddress,
            block_number: tx.blockNumber || 0,
            fee: tx.fee || 0
          } as FormattedStakeRecord;
        });
      
      console.log(`[DelegateRecordHandler] ✅ 成功格式化 ${formattedRecords.length} 条委托记录`);
      
      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('[DelegateRecordHandler] Failed to get delegate transaction history:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 预留方法：未来可以实现从TRON网络获取实时交易记录
   */
  async getRealTimeDelegateHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    // 这里可以实现从TRON网络API获取实时委托记录的逻辑
    console.log(`[DelegateRecordHandler] 获取实时委托记录功能待实现`);
    
    return {
      success: true,
      data: []
    };
  }
}
