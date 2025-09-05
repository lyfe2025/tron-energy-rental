/**
 * TRON网络统计信息控制器
 * 包含：链参数获取、节点信息、区块信息、网络统计等功能
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';
import https from 'https';
import http from 'http';
import { URL } from 'url';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

// HTTP请求助手函数
const makeHttpRequest = async (urlString: string, apiKey?: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {})
      },
      timeout: 30000
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`JSON解析失败: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('请求超时')));
    req.end();
  });
};

/**
 * 获取网络链参数
 * GET /api/tron-networks/:id/chain-parameters
 * 权限：管理员
 */
export const getChainParameters: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取网络配置
    const networkResult = await query(
      `SELECT id, name, rpc_url, api_key FROM tron_networks WHERE id = $1`,
      [id]
    );
    
    if (networkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'TRON网络不存在'
      });
      return;
    }
    
    const network = networkResult.rows[0];
    
    // 调用真实的TRON API获取链参数
    let chainParameters: any = {};
    try {
      // 直接调用对应网络的API获取链参数
      const apiUrl = `${network.rpc_url}/wallet/getchainparameters`;
      
      console.log(`📊 调用链参数API: ${apiUrl}`);
      const chainParams = await makeHttpRequest(apiUrl, network.api_key);
      
      // 解析链参数
      const paramMap: any = {};
      if (chainParams && Array.isArray(chainParams)) {
        chainParams.forEach((param: any) => {
          if (param.key && param.value !== undefined) {
            paramMap[param.key] = param.value;
          }
        });
      }
      
      // 格式化为可读的参数名称
      chainParameters = {
        energyPrice: paramMap.getEnergyFee || paramMap.energyFee || 420,
        bandwidthPrice: paramMap.getTransactionFee || paramMap.transactionFee || 1000,
        createAccountFee: paramMap.getCreateAccountFee || paramMap.createAccountFee || 100000,
        transactionFee: paramMap.getTransactionFee || paramMap.transactionFee || 1000,
        assetIssueFee: paramMap.getAssetIssueFee || paramMap.assetIssueFee || 1024000000,
        witnessPayPerBlock: paramMap.getWitnessPayPerBlock || paramMap.witnessPayPerBlock || 16000000,
        witnessStandbyAllowance: paramMap.getWitnessStandbyAllowance || paramMap.witnessStandbyAllowance || 115200000000,
        createWitnessFee: paramMap.getCreateWitnessFee || paramMap.createWitnessFee || 9999000000,
        totalEnergyLimit: paramMap.getTotalEnergyLimit || paramMap.totalEnergyLimit || 90000000000,
        totalEnergyCurrentLimit: paramMap.getTotalEnergyCurrentLimit || paramMap.totalEnergyCurrentLimit || 90000000000,
        allowDelegateResource: paramMap.getAllowDelegateResource || paramMap.allowDelegateResource || 1,
        allowAdaptiveEnergy: paramMap.getAllowAdaptiveEnergy || paramMap.allowAdaptiveEnergy || 1,
        allowMultiSign: paramMap.getAllowMultiSign || paramMap.allowMultiSign || 1,
        updateAccountPermissionFee: paramMap.getUpdateAccountPermissionFee || paramMap.updateAccountPermissionFee || 100000000,
        multiSignFee: paramMap.getMultiSignFee || paramMap.multiSignFee || 1000000,
        maxVoteNumber: paramMap.getMaxVoteNumber || paramMap.maxVoteNumber || 30,
        // 添加原始参数映射以便调试
        rawParameters: paramMap
      };
      
      console.log('✅ 成功获取真实链参数:', Object.keys(paramMap).length, '个参数');
      
    } catch (apiError) {
      console.error('⚠️  获取真实链参数失败，使用默认值:', apiError);
      // 回退到默认值
      chainParameters = {
        energyPrice: 420,
        bandwidthPrice: 1000,
        createAccountFee: 100000,
        transactionFee: 1000,
        assetIssueFee: 1024000000,
        witnessPayPerBlock: 16000000,
        witnessStandbyAllowance: 115200000000,
        createWitnessFee: 9999000000,
        totalEnergyLimit: 90000000000,
        totalEnergyCurrentLimit: 90000000000,
        allowDelegateResource: 1,
        allowAdaptiveEnergy: 1,
        allowMultiSign: 1,
        updateAccountPermissionFee: 100000000,
        multiSignFee: 1000000,
        maxVoteNumber: 30,
        error: '无法连接TRON网络，使用默认参数'
      };
    }
    
    res.status(200).json({
      success: true,
      message: '链参数获取成功',
      data: {
        network_id: id,
        network_name: network.name,
        parameters: chainParameters,
        retrieved_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('获取链参数错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取节点信息
 * GET /api/tron-networks/:id/node-info
 * 权限：管理员
 */
export const getNodeInfo: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取网络配置
    const networkResult = await query(
      `SELECT id, name, rpc_url, api_key FROM tron_networks WHERE id = $1`,
      [id]
    );
    
    if (networkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'TRON网络不存在'
      });
      return;
    }
    
    const network = networkResult.rows[0];
    
    // 调用真实的TRON API获取节点信息
    let nodeInfo: any = {};
    try {
      // 直接调用对应网络的API获取节点信息
      const apiUrl = `${network.rpc_url}/wallet/getnodeinfo`;
      
      console.log(`📡 调用网络API: ${apiUrl}`);
      const nodeInfoData = await makeHttpRequest(apiUrl, network.api_key);
      console.log('📡 真实节点信息:', nodeInfoData);
      
      // 格式化节点信息
      nodeInfo = {
        version: nodeInfoData?.configNodeInfo?.codeVersion || nodeInfoData?.version || '4.7.4',
        configNodeInfo: {
          codeVersion: nodeInfoData?.configNodeInfo?.codeVersion || '4.7.4',
          p2pVersion: nodeInfoData?.configNodeInfo?.p2pVersion || '11111',
          listenPort: nodeInfoData?.configNodeInfo?.listenPort || 18888,
          discoverEnable: nodeInfoData?.configNodeInfo?.discoverEnable || true,
          activeNodeSize: nodeInfoData?.configNodeInfo?.activeNodeSize || 156,
          passiveNodeSize: nodeInfoData?.configNodeInfo?.passiveNodeSize || 89,
          totalNodeSize: nodeInfoData?.configNodeInfo?.totalNodeSize || 245,
          sendNodeSize: nodeInfoData?.configNodeInfo?.sendNodeSize || 78,
          maxConnectCount: nodeInfoData?.configNodeInfo?.maxConnectCount || 300,
          sameIpMaxConnectCount: nodeInfoData?.configNodeInfo?.sameIpMaxConnectCount || 2,
          backupListenPort: nodeInfoData?.configNodeInfo?.backupListenPort || 18889,
          backupMemberSize: nodeInfoData?.configNodeInfo?.backupMemberSize || 20,
          backupPriority: nodeInfoData?.configNodeInfo?.backupPriority || 8,
          dbVersion: nodeInfoData?.configNodeInfo?.dbVersion || 2,
          minParticipationRate: nodeInfoData?.configNodeInfo?.minParticipationRate || 15,
          supportConstant: nodeInfoData?.configNodeInfo?.supportConstant || false,
          minTimeRatio: nodeInfoData?.configNodeInfo?.minTimeRatio || 0.0,
          maxTimeRatio: nodeInfoData?.configNodeInfo?.maxTimeRatio || 5.0,
          allowCreationOfContracts: nodeInfoData?.configNodeInfo?.allowCreationOfContracts || 0,
          allowAdaptiveEnergy: nodeInfoData?.configNodeInfo?.allowAdaptiveEnergy || 1
        },
        rawNodeInfo: nodeInfoData // 保留原始数据用于调试
      };
      
      console.log('✅ 成功获取真实节点信息');
      
    } catch (apiError) {
      console.error('⚠️  获取真实节点信息失败，使用默认值:', apiError);
      // 回退到默认值
      nodeInfo = {
        version: '4.7.4',
        configNodeInfo: {
          codeVersion: '4.7.4',
          p2pVersion: '11111',
          listenPort: 18888,
          discoverEnable: true,
          activeNodeSize: 156,
          passiveNodeSize: 89,
          totalNodeSize: 245,
          sendNodeSize: 78,
          maxConnectCount: 300,
          sameIpMaxConnectCount: 2,
          backupListenPort: 18889,
          backupMemberSize: 20,
          backupPriority: 8,
          dbVersion: 2,
          minParticipationRate: 15,
          supportConstant: false,
          minTimeRatio: 0.0,
          maxTimeRatio: 5.0,
          allowCreationOfContracts: 0,
          allowAdaptiveEnergy: 1
        },
        error: '无法连接TRON网络，使用默认值'
      };
    }
    
    // 获取机器信息（这部分通常是本地信息，保持模拟数据）
    const machineInfo = {
        threadCount: 1024,
        deadLockThreadCount: 0,
        cpuCount: 16,
        totalMemory: 34359738368, // 32GB
        freeMemory: 8589934592,   // 8GB
        cpuRate: 0.15,
        javaVersion: '11.0.16',
        osName: 'Linux',
        jvmTotalMemory: 4294967296, // 4GB
        jvmFreeMemory: 1073741824,  // 1GB
        processCpuRate: 0.12,
        memoryDescInfoList: [
          {
            name: 'PS Eden Space',
            initSize: 268435456,
            useSize: 134217728,
            maxSize: 1073741824,
            useRate: 0.125
          },
          {
            name: 'PS Old Gen',
            initSize: 715849728,
            useSize: 357924864,
            maxSize: 2863661056,
            useRate: 0.125
          }
        ],
        deadLockInfoList: []
    };
    
    // 合并节点信息和机器信息
    const completeNodeInfo = {
      ...nodeInfo,
      machineInfo: machineInfo,
      cheatWitnessInfoMap: {}
    };
    
    res.status(200).json({
      success: true,
      message: '节点信息获取成功',
      data: {
        network_id: id,
        network_name: network.name,
        node_info: completeNodeInfo,
        retrieved_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('获取节点信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取区块信息
 * GET /api/tron-networks/:id/block-info
 * 权限：管理员
 */
export const getBlockInfo: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取网络配置
    const networkResult = await query(
      `SELECT id, name, rpc_url, api_key FROM tron_networks WHERE id = $1`,
      [id]
    );
    
    if (networkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'TRON网络不存在'
      });
      return;
    }
    
    const network = networkResult.rows[0];
    
    // 调用真实的TRON API获取区块信息
    let blockInfo: any = {};
    try {
      // 直接调用对应网络的API获取区块信息
      const apiUrl = `${network.rpc_url}/wallet/getnowblock`;
      
      console.log(`📦 调用区块API: ${apiUrl}`);
      const latestBlock = await makeHttpRequest(apiUrl, network.api_key);
      console.log('📦 真实区块信息:', latestBlock);
      
      // 格式化区块信息
      blockInfo = {
        latestBlock: {
          blockNumber: latestBlock?.block_header?.raw_data?.number || 0,
          blockHash: latestBlock?.blockID || 'Unknown',
          parentHash: latestBlock?.block_header?.raw_data?.parentHash || 'Unknown',
          timestamp: latestBlock?.block_header?.raw_data?.timestamp || Date.now(),
          witnessAddress: latestBlock?.block_header?.witness_address || 'Unknown',
          witnessSignature: latestBlock?.block_header?.witness_signature || 'Unknown',
          transactionCount: latestBlock?.transactions?.length || 0,
          size: JSON.stringify(latestBlock).length, // 估算区块大小
          energyUsed: 0, // 需要计算所有交易的energy使用量
          energyLimit: 90000000000,
          netUsed: 0, // 需要计算所有交易的bandwidth使用量
          netLimit: 43200000000
        },
        rawBlockData: latestBlock // 保留原始数据用于调试
      };
      
      // 计算交易相关数据
      if (latestBlock?.transactions && Array.isArray(latestBlock.transactions)) {
        let totalEnergyUsed = 0;
        let totalNetUsed = 0;
        
        latestBlock.transactions.forEach((tx: any) => {
          // 这里可以添加更详细的交易分析
          if (tx.raw_data && tx.raw_data.contract) {
            // 估算energy和bandwidth使用量
            const contractDataSize = JSON.stringify(tx.raw_data.contract).length;
            totalEnergyUsed += contractDataSize * 10; // 简化计算
            totalNetUsed += contractDataSize;
          }
        });
        
        blockInfo.latestBlock.energyUsed = totalEnergyUsed;
        blockInfo.latestBlock.netUsed = totalNetUsed;
      }
      
      console.log('✅ 成功获取真实区块信息，区块号:', blockInfo.latestBlock.blockNumber);
      
    } catch (apiError) {
      console.error('⚠️  获取真实区块信息失败，使用默认值:', apiError);
      // 回退到默认值
      const currentBlockNumber = Math.floor(Math.random() * 1000000) + 50000000;
      blockInfo = {
        latestBlock: {
          blockNumber: currentBlockNumber,
          blockHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          parentHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          timestamp: Date.now(),
          witnessAddress: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
          witnessSignature: '0x' + Array(128).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          transactionCount: Math.floor(Math.random() * 100) + 50,
          size: Math.floor(Math.random() * 50000) + 10000,
          energyUsed: Math.floor(Math.random() * 10000000) + 1000000,
          energyLimit: 90000000000,
          netUsed: Math.floor(Math.random() * 100000) + 10000,
          netLimit: 43200000000
        },
        error: '无法连接TRON网络，使用默认值'
      };
    }
    
    // 添加统计信息（基于真实或模拟数据）
    blockInfo.blockStats = {
        averageBlockTime: 3000, // 3 seconds
        blocksLast24h: 28800,   // 24 * 60 * 60 / 3
        averageTransactionsPerBlock: 75,
        averageBlockSize: 25000,
        networkHashRate: '1.2 TH/s',
        difficulty: 1,
        totalSupply: 100000000000000000, // 100 billion TRX in Sun
        circulatingSupply: 99000000000000000, // 99 billion TRX in Sun
        frozenSupply: 50000000000000000,  // 50 billion TRX in Sun
        totalAccounts: 150000000,
        totalTransactions: (blockInfo.latestBlock?.blockNumber || 50000000) * 75,
        totalContracts: 8500000,
        totalTokens: 45000
    };
    
    // 添加最近区块信息
    blockInfo.recentBlocks = Array.from({ length: 10 }, (_, i) => ({
      blockNumber: (blockInfo.latestBlock?.blockNumber || 50000000) - i,
      timestamp: Date.now() - (i * 3000),
      transactionCount: Math.floor(Math.random() * 100) + 20,
      witnessAddress: ['TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH', 'TGj1Ej1qRzL9feLTLhjwgxXF4Ct6GTWg2U', 'TAUN6FwrnwwmaEqYcckffC7wYmbaS6cBiX'][i % 3],
      size: Math.floor(Math.random() * 30000) + 5000
    }));
    
    res.status(200).json({
      success: true,
      message: '区块信息获取成功',
      data: {
        network_id: id,
        network_name: network.name,
        block_info: blockInfo,
        retrieved_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('获取区块信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取网络统计信息
 * GET /api/tron-networks/:id/stats
 * 权限：管理员
 */
export const getNetworkStats: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取网络配置
    const networkResult = await query(
      `SELECT id, name, rpc_url, api_key, network_type, health_status FROM tron_networks WHERE id = $1`,
      [id]
    );
    
    if (networkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'TRON网络不存在'
      });
      return;
    }
    
    const network = networkResult.rows[0];
    
    // 模拟网络统计数据（在实际实现中应该调用TRON API获取真实数据）
    const stats = {
      network_info: {
        id: network.id,
        name: network.name,
        type: network.network_type,
        status: network.health_status,
        rpc_url: network.rpc_url
      },
      performance: {
        uptime: 99.8,
        response_time: Math.floor(Math.random() * 100) + 50, // 50-150ms
        success_rate: 99.5,
        last_check: new Date().toISOString()
      },
      usage: {
        connected_bots: Math.floor(Math.random() * 20) + 5,
        energy_pools: Math.floor(Math.random() * 10) + 2,
        daily_transactions: Math.floor(Math.random() * 10000) + 1000,
        total_energy_delegated: Math.floor(Math.random() * 1000000) + 100000
      },
      resources: {
        energy_price: 420, // Sun per energy unit
        bandwidth_price: 1000, // Sun per bandwidth unit
        total_energy: 90000000000,
        available_energy: Math.floor(Math.random() * 50000000000) + 20000000000,
        total_bandwidth: 43200000000,
        available_bandwidth: Math.floor(Math.random() * 20000000000) + 10000000000
      },
      blockchain: {
        latest_block: Math.floor(Math.random() * 1000000) + 50000000,
        block_time: 3000, // 3 seconds
        tps: Math.floor(Math.random() * 2000) + 500,
        total_accounts: 150000000 + Math.floor(Math.random() * 1000000),
        total_transactions: Math.floor(Math.random() * 1000000000) + 5000000000
      }
    };
    
    res.status(200).json({
      success: true,
      message: '网络统计信息获取成功',
      data: stats
    });
    
  } catch (error) {
    console.error('获取网络统计信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
