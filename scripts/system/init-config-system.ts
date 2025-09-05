#!/usr/bin/env tsx

/**
 * 系统配置初始化脚本
 * 用于检查和初始化配置管理系统的数据库表和默认数据
 */

import { query } from '../../api/config/database';
import { logger } from '../../api/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// 配置表结构定义
const CONFIG_TABLES = {
  system_configs: `
    CREATE TABLE IF NOT EXISTS system_configs (
      id SERIAL PRIMARY KEY,
      key VARCHAR(255) UNIQUE NOT NULL,
      value TEXT,
      type VARCHAR(50) DEFAULT 'string',
      category VARCHAR(100) DEFAULT 'general',
      description TEXT,
      is_encrypted BOOLEAN DEFAULT false,
      is_public BOOLEAN DEFAULT false,
      validation_rule TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  tron_networks: `
    CREATE TABLE IF NOT EXISTS tron_networks (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      network_type VARCHAR(20) CHECK (network_type IN ('mainnet', 'testnet', 'private')),
      rpc_url TEXT NOT NULL,
      api_key TEXT,
      chain_id VARCHAR(50),
      block_explorer_url TEXT,
      is_active BOOLEAN DEFAULT true,
      is_default BOOLEAN DEFAULT false,
      priority INTEGER DEFAULT 0,
      timeout_ms INTEGER DEFAULT 30000,
      retry_count INTEGER DEFAULT 3,
      rate_limit_per_second INTEGER DEFAULT 10,
      config JSONB,
      health_check_url TEXT,
      last_health_check TIMESTAMP,
      health_status VARCHAR(20) DEFAULT 'unknown',
      description TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  bot_configs: `
    CREATE TABLE IF NOT EXISTS bot_configs (
      id SERIAL PRIMARY KEY,
      bot_name VARCHAR(100) NOT NULL,
      bot_token TEXT NOT NULL,
      webhook_url TEXT,
      is_active BOOLEAN DEFAULT true,
      is_default BOOLEAN DEFAULT false,
      allowed_users TEXT[],
      admin_users TEXT[],
      config JSONB,
      description TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `
};

// 默认系统配置
const DEFAULT_SYSTEM_CONFIGS = [
  {
    config_key: 'api.rate_limit_per_hour',
    config_value: '1000',
    config_type: 'number',
    category: 'api',
    description: 'API每小时请求限制',
    is_public: true
  },
  {
    config_key: 'api.rate_limit_per_minute',
    config_value: '60',
    config_type: 'number',
    category: 'api',
    description: 'API每分钟请求限制',
    is_public: true
  },
  {
    config_key: 'business.default_commission_rate',
    config_value: '0.05',
    config_type: 'number',
    category: 'business',
    description: '默认佣金比例',
    is_public: true
  },
  {
    config_key: 'business.max_order_amount',
    config_value: '10000',
    config_type: 'number',
    category: 'business',
    description: '最大订单金额(TRX)',
    is_public: true
  },
  {
    config_key: 'system.maintenance_mode',
    config_value: 'false',
    config_type: 'boolean',
    category: 'system',
    description: '系统维护模式',
    is_public: true
  },
  {
    config_key: 'notification.email_enabled',
    config_value: 'true',
    config_type: 'boolean',
    category: 'notification',
    description: '邮件通知开关',
    is_public: false
  }
];

// 默认TRON网络配置
const DEFAULT_TRON_NETWORKS = [
  {
    name: 'TRON Mainnet',
    network_type: 'mainnet',
    rpc_url: 'https://api.trongrid.io',
    chain_id: '0x2b6653dc',
    block_explorer_url: 'https://tronscan.org',
    is_active: true,
    is_default: true,
    priority: 1,
    health_check_url: 'https://api.trongrid.io/wallet/getnowblock',
    description: 'TRON主网'
  },
  {
    name: 'Shasta Testnet',
    network_type: 'testnet',
    rpc_url: 'https://api.shasta.trongrid.io',
    chain_id: '0x94a9059e',
    block_explorer_url: 'https://shasta.tronscan.org',
    is_active: true,
    is_default: false,
    priority: 2,
    health_check_url: 'https://api.shasta.trongrid.io/wallet/getnowblock',
    description: 'TRON Shasta测试网'
  },
  {
    name: 'Nile Testnet',
    network_type: 'testnet',
    rpc_url: 'https://nile.trongrid.io',
    chain_id: '0xcd8690dc',
    block_explorer_url: 'https://nile.tronscan.org',
    is_active: true,
    is_default: false,
    priority: 3,
    health_check_url: 'https://nile.trongrid.io/wallet/getnowblock',
    description: 'TRON Nile测试网'
  }
];

/**
 * 检查表是否存在
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    logger.error(`检查表 ${tableName} 是否存在时出错:`, error);
    return false;
  }
}

/**
 * 创建配置表
 */
async function createConfigTables(): Promise<void> {
  logger.info('开始创建配置管理表...');
  
  for (const [tableName, createSQL] of Object.entries(CONFIG_TABLES)) {
    try {
      const exists = await checkTableExists(tableName);
      if (exists) {
        logger.info(`表 ${tableName} 已存在，跳过创建`);
        continue;
      }
      
      await query(createSQL);
      logger.info(`成功创建表: ${tableName}`);
    } catch (error) {
      logger.error(`创建表 ${tableName} 失败:`, error);
      throw error;
    }
  }
}

/**
 * 初始化默认系统配置
 */
async function initDefaultSystemConfigs(): Promise<void> {
  logger.info('开始初始化默认系统配置...');
  
  for (const config of DEFAULT_SYSTEM_CONFIGS) {
    try {
      // 检查配置是否已存在
      const existing = await query(
        'SELECT id FROM system_configs WHERE config_key = $1',
        [config.config_key]
      );
      
      if (existing.rows.length > 0) {
        logger.info(`配置 ${config.config_key} 已存在，跳过初始化`);
        continue;
      }
      
      // 插入新配置
      await query(
        `INSERT INTO system_configs (config_key, config_value, config_type, category, description, is_public)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [config.config_key, config.config_value, config.config_type, config.category, config.description, config.is_public]
      );
      
      logger.info(`成功初始化配置: ${config.config_key}`);
    } catch (error) {
      logger.error(`初始化配置 ${config.config_key} 失败:`, error);
      throw error;
    }
  }
}

/**
 * 初始化默认TRON网络配置
 */
async function initDefaultTronNetworks(): Promise<void> {
  logger.info('开始初始化默认TRON网络配置...');
  
  for (const network of DEFAULT_TRON_NETWORKS) {
    try {
      // 检查网络是否已存在
      const existing = await query(
        'SELECT id FROM tron_networks WHERE name = $1',
        [network.name]
      );
      
      if (existing.rows.length > 0) {
        logger.info(`TRON网络 ${network.name} 已存在，跳过初始化`);
        continue;
      }
      
      // 插入新网络配置
      await query(
        `INSERT INTO tron_networks (
          name, network_type, rpc_url, chain_id, block_explorer_url,
          is_active, is_default, priority, health_check_url, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          network.name, network.network_type, network.rpc_url, network.chain_id,
          network.block_explorer_url, network.is_active, network.is_default,
          network.priority, network.health_check_url, network.description
        ]
      );
      
      logger.info(`成功初始化TRON网络: ${network.name}`);
    } catch (error) {
      logger.error(`初始化TRON网络 ${network.name} 失败:`, error);
      throw error;
    }
  }
}

/**
 * 验证配置系统
 */
async function validateConfigSystem(): Promise<void> {
  logger.info('开始验证配置系统...');
  
  try {
    // 检查系统配置表
    const systemConfigCount = await query('SELECT COUNT(*) FROM system_configs');
    logger.info(`系统配置数量: ${systemConfigCount.rows[0].count}`);
    
    // 检查TRON网络配置表
    const tronNetworkCount = await query('SELECT COUNT(*) FROM tron_networks');
    logger.info(`TRON网络配置数量: ${tronNetworkCount.rows[0].count}`);
    
    // 检查默认网络
    const defaultNetwork = await query(
      'SELECT name FROM tron_networks WHERE is_default = true'
    );
    if (defaultNetwork.rows.length > 0) {
      logger.info(`默认TRON网络: ${defaultNetwork.rows[0].name}`);
    } else {
      logger.warn('未找到默认TRON网络');
    }
    
    logger.info('配置系统验证完成');
  } catch (error) {
    logger.error('验证配置系统失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    logger.info('开始初始化配置管理系统...');
    
    // 1. 创建配置表
    await createConfigTables();
    
    // 2. 初始化默认系统配置
    await initDefaultSystemConfigs();
    
    // 3. 初始化默认TRON网络配置
    await initDefaultTronNetworks();
    
    // 4. 验证配置系统
    await validateConfigSystem();
    
    logger.info('配置管理系统初始化完成！');
    
  } catch (error) {
    logger.error('配置管理系统初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as initConfigSystem };