/**
 * 错误信息格式化工具
 * 将技术性错误信息转换为用户友好的描述
 */

interface ErrorInfo {
  type: string;
  title: string;
  description: string;
  suggestions?: string[];
}

interface OrderInfo {
  energy_pool_account_used?: string;
  target_address?: string;
  recipient_address?: string;
  energy_amount?: number;
}

/**
 * 将十六进制字符串转换为ASCII文本
 * @param hexString 十六进制字符串
 * @returns ASCII文本
 */
function hexToAscii(hexString: string): string {
  try {
    let result = '';
    for (let i = 0; i < hexString.length; i += 2) {
      const hexPair = hexString.substr(i, 2);
      const charCode = parseInt(hexPair, 16);
      if (charCode >= 32 && charCode <= 126) { // 只转换可打印字符
        result += String.fromCharCode(charCode);
      }
    }
    return result;
  } catch (error) {
    return '';
  }
}

/**
 * 解析和格式化订单错误信息
 * @param errorMessage 原始错误信息
 * @param orderInfo 订单相关信息（可选）
 * @returns 格式化后的错误信息对象
 */
export function formatOrderError(errorMessage: string, orderInfo?: OrderInfo): ErrorInfo {
  if (!errorMessage) {
    return {
      type: 'unknown',
      title: '未知错误',
      description: '订单处理过程中遇到了未知问题'
    };
  }

  let lowerMessage = errorMessage.toLowerCase();
  
  // 尝试解码十六进制错误信息
  const hexMatch = errorMessage.match(/([a-f0-9]{40,})/i);
  if (hexMatch) {
    const hexError = hexToAscii(hexMatch[1]);
    if (hexError) {
      // 将解码后的错误信息也加入分析
      lowerMessage += ' ' + hexError.toLowerCase();
    }
  }
  
  // TRON合约验证错误 - 代理余额超限
  if (lowerMessage.includes('delegatebalance must be less than') || 
      lowerMessage.includes('delegatebalance') && lowerMessage.includes('available') && lowerMessage.includes('balance')) {
    
    const poolAccount = orderInfo?.energy_pool_account_used;
    const poolDisplayAccount = poolAccount ? 
      `${poolAccount.substring(0, 8)}...${poolAccount.substring(poolAccount.length - 6)}` : 
      '系统分配的能量池账户';
    
    const energyAmount = orderInfo?.energy_amount ? 
      ` (需要 ${orderInfo.energy_amount.toLocaleString()} 能量)` : 
      '';
    
    return {
      type: 'delegate_balance_exceeded',
      title: '能量池可用余额不足',
      description: `${poolDisplayAccount}的可用能量余额不足${energyAmount}`,
      suggestions: [
        poolAccount ? `能量池账户: ${poolAccount}` : '能量池账户信息未记录',
        '当前可用能量不足以完成此次代理',
        '请联系客服检查并补充能量池资源',
        '或等待其他订单释放能量后重试'
      ]
    };
  }

  // TRON合约验证错误 - 最小代理数量
  if (lowerMessage.includes('delegatebalance must be greater than') || 
      lowerMessage.includes('must be greater than or equal to 1 trx')) {
    return {
      type: 'delegate_balance_too_small',
      title: '代理数量过小',
      description: '代理的资源数量不满足TRON网络最小要求（至少1 TRX）',
      suggestions: [
        '请增加订单金额',
        'TRON网络要求单次代理至少1 TRX价值的资源'
      ]
    };
  }

  // 能量不足相关错误
  if (lowerMessage.includes('insufficient') && (lowerMessage.includes('energy') || lowerMessage.includes('bandwidth'))) {
    const poolAccount = orderInfo?.energy_pool_account_used;
    const poolDisplayAccount = poolAccount ? 
      `${poolAccount.substring(0, 8)}...${poolAccount.substring(poolAccount.length - 6)}` : 
      '能量池账户';

    return {
      type: 'insufficient_energy',
      title: '能量池资源不足',
      description: `${poolDisplayAccount}的能量余额不足以完成此次代理`,
      suggestions: [
        poolAccount ? `相关账户: ${poolAccount}` : '能量池账户信息未记录',
        '请联系客服检查并充值能量池',
        '或等待能量池资源自然恢复'
      ]
    };
  }

  // 账户余额不足
  if (lowerMessage.includes('insufficient') && (lowerMessage.includes('balance') || lowerMessage.includes('trx'))) {
    return {
      type: 'insufficient_balance',
      title: '账户余额不足',
      description: '能量池账户TRX余额不足，无法支付网络手续费',
      suggestions: [
        '请联系客服为能量池账户充值TRX',
        '通常需要少量TRX作为手续费'
      ]
    };
  }

  // 网络连接错误
  if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
    return {
      type: 'network_error',
      title: '网络连接异常',
      description: 'TRON网络连接超时或不稳定，导致交易失败',
      suggestions: [
        '系统会自动重试处理',
        '如持续失败，请联系客服'
      ]
    };
  }

  // 地址验证错误
  if (lowerMessage.includes('invalid') && lowerMessage.includes('address')) {
    return {
      type: 'invalid_address',
      title: '地址格式错误',
      description: '目标地址格式不正确或不是有效的TRON地址',
      suggestions: [
        '请检查地址格式是否正确',
        '确保使用的是TRON主网地址'
      ]
    };
  }

  // 智能合约执行错误
  if (lowerMessage.includes('revert') || lowerMessage.includes('contract')) {
    return {
      type: 'contract_error',
      title: '智能合约执行失败',
      description: 'TRON网络智能合约执行过程中遇到错误',
      suggestions: [
        '可能是网络拥堵导致',
        '系统将自动重试'
      ]
    };
  }

  // 能量代理失败但包含技术错误信息
  if (lowerMessage.includes('能量代理失败')) {
    // 提取具体的错误信息
    const match = errorMessage.match(/能量代理失败[：:]\s*(.+)/);
    if (match && match[1]) {
      const specificError = match[1].trim();
      
      // 如果是长哈希值，说明是交易失败
      if (/^[a-f0-9]{40,}$/i.test(specificError)) {
        return {
          type: 'delegation_tx_failed',
          title: '能量代理交易失败',
          description: 'TRON网络上的能量代理交易执行失败',
          suggestions: [
            '可能是网络拥堵或gas费不足',
            '系统会自动重试处理',
            '如持续失败，请联系客服'
          ]
        };
      }
      
      // 递归解析具体错误
      return formatOrderError(specificError);
    }
    
    return {
      type: 'delegation_failed',
      title: '能量代理失败',
      description: '无法将能量代理到目标地址',
      suggestions: [
        '请检查目标地址是否正确',
        '确认能量池账户状态正常'
      ]
    };
  }

  // 支付处理错误
  if (lowerMessage.includes('payment') && lowerMessage.includes('failed')) {
    return {
      type: 'payment_failed',
      title: '支付处理失败',
      description: '订单支付验证或处理过程中遇到问题',
      suggestions: [
        '请检查支付交易是否成功',
        '联系客服协助处理'
      ]
    };
  }

  // TronWeb相关错误
  if (lowerMessage.includes('tronweb') || lowerMessage.includes('broadcast')) {
    return {
      type: 'tronweb_error',
      title: 'TRON网络通信失败',
      description: '与TRON区块链网络通信时发生错误',
      suggestions: [
        '可能是节点服务暂时不可用',
        '系统会自动重试连接'
      ]
    };
  }

  // 账户激活相关
  if (lowerMessage.includes('account') && lowerMessage.includes('not') && lowerMessage.includes('exist')) {
    return {
      type: 'account_not_exist',
      title: '目标账户未激活',
      description: '目标地址尚未在TRON网络上激活',
      suggestions: [
        '请先向目标地址发送少量TRX激活',
        '或联系客服协助处理'
      ]
    };
  }

  // 如果包含很长的哈希值，简化显示
  if (/[a-f0-9]{40,}/i.test(errorMessage)) {
    return {
      type: 'transaction_error',
      title: '交易执行失败',
      description: 'TRON网络上的交易执行遇到错误',
      suggestions: [
        '交易可能因为网络拥堵失败',
        '系统会自动重试处理'
      ]
    };
  }

  // 默认处理：如果错误信息过长，截取前面部分
  let description = errorMessage;
  if (errorMessage.length > 100) {
    description = errorMessage.substring(0, 100) + '...';
  }

  return {
    type: 'generic_error',
    title: '处理失败',
    description,
    suggestions: [
      '请联系客服获取详细帮助',
      '提供订单号以便快速处理'
    ]
  };
}

/**
 * 获取错误类型对应的图标
 * @param errorType 错误类型
 * @returns 对应的emoji图标
 */
export function getErrorIcon(errorType: string): string {
  const icons: Record<string, string> = {
    'delegate_balance_exceeded': '📊',
    'delegate_balance_too_small': '📉',
    'insufficient_energy': '⚡',
    'insufficient_balance': '💰',
    'network_error': '🌐',
    'invalid_address': '📍',
    'contract_error': '📄',
    'delegation_failed': '🔗',
    'delegation_tx_failed': '💸',
    'payment_failed': '💳',
    'tronweb_error': '🔌',
    'account_not_exist': '👤',
    'transaction_error': '⚠️',
    'generic_error': '❌',
    'unknown': '❓'
  };
  
  return icons[errorType] || '❓';
}
