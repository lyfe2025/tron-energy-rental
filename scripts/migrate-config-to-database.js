#!/usr/bin/env node

/**
 * 配置迁移脚本
 * 将环境变量中的配置迁移到数据库表中
 * 创建时间: 2025-01-25
 * 作者: 配置管理迁移项目
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// 数据库连接配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tron_energy_rental',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// 加密配置
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars';
const ALGORITHM = 'aes-256-gcm';

/**
 * 加密敏感信息
 */
function encrypt(text) {
  if (!text) return null;
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * 解密敏感信息
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 记录迁移日志
 */
function logMigration(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  console.log(logMessage);
  
  // 写入日志文件
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, 'config-migration.log');
  fs.appendFileSync(logFile, logMessage + '\n');
}

/**
 * 检查数据库连接
 */
async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logMigration('数据库连接成功');
    return true;
  } catch (error) {
    logMigration(`数据库连接失败: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 检查必要的表是否存在
 */
async function checkRequiredTables() {
  const requiredTables = ['tron_networks', 'telegram_bots', 'bot_network_configs'];
  
  try {
    const client = await pool.connect();
    
    for (const table of requiredTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (!result.rows[0].exists) {
        logMigration(`缺少必要的表: ${table}`, 'error');
        client.release();
        return false;
      }
    }
    
    client.release();
    logMigration('所有必要的表都存在');
    return true;
  } catch (error) {
    logMigration(`检查表结构失败: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 迁移TRON网络配置
 */
async function migrateTronNetworkConfig() {
  logMigration('开始迁移TRON网络配置...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 检查是否已有网络配置
    const existingNetworks = await client.query('SELECT COUNT(*) FROM tron_networks');
    
    if (parseInt(existingNetworks.rows[0].count) > 0) {
      logMigration('TRON网络配置已存在，获取默认网络ID');
      const defaultNetwork = await client.query('SELECT id FROM tron_networks WHERE is_default = true LIMIT 1');
      await client.query('COMMIT');
      return { networkId: defaultNetwork.rows[0]?.id, networkName: '现有默认网络' };
    }
    
    // 从环境变量读取配置
    const networkType = process.env.TRON_NETWORK || 'testnet';
    const fullNode = process.env.TRON_FULL_NODE || 'https://api.shasta.trongrid.io';
    const solidityNode = process.env.TRON_SOLIDITY_NODE || fullNode;
    const eventServer = process.env.TRON_EVENT_SERVER || fullNode;
    const apiKey = process.env.TRON_API_KEY;
    
    // 加密API密钥
    const encryptedApiKey = apiKey ? encrypt(apiKey) : null;
    
    // 根据网络类型确定配置
    let networkName, chainId, explorerUrl, isDefault;
    
    if (networkType === 'mainnet') {
      networkName = 'TRON主网';
      chainId = 1; // 使用简化的整数ID
      explorerUrl = 'https://tronscan.org';
      isDefault = true;
    } else if (networkType === 'shasta' || networkType === 'testnet') {
      networkName = 'TRON测试网(Shasta)';
      chainId = 2; // 使用简化的整数ID
      explorerUrl = 'https://shasta.tronscan.org';
      isDefault = true;
    } else {
      networkName = 'TRON Nile测试网';
      chainId = 3; // 使用简化的整数ID
      explorerUrl = 'https://nile.tronscan.org';
      isDefault = true;
    }
    
    // 插入网络配置
    const networkConfig = {
      fullNode,
      solidityNode,
      eventServer,
      features: ['energy_delegation', 'bandwidth_delegation', 'smart_contracts']
    };
    
    const insertNetworkQuery = `
      INSERT INTO tron_networks (
        name, network_type, rpc_url, api_key, chain_id, 
        explorer_url, is_active, is_default, priority, 
        config, health_check_url, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;
    
    const networkResult = await client.query(insertNetworkQuery, [
      networkName,
      networkType === 'mainnet' ? 'mainnet' : 'testnet',
      fullNode,
      encryptedApiKey ? JSON.stringify(encryptedApiKey) : null,
      chainId,
      explorerUrl,
      true,
      isDefault,
      100,
      JSON.stringify(networkConfig),
      `${fullNode}/wallet/getnowblock`,
      `从环境变量迁移的${networkName}配置`
    ]);
    
    const networkId = networkResult.rows[0].id;
    logMigration(`成功创建网络配置: ${networkName} (ID: ${networkId})`);
    
    await client.query('COMMIT');
    return { networkId, networkName };
    
  } catch (error) {
    await client.query('ROLLBACK');
    logMigration(`迁移TRON网络配置失败: ${error.message}`, 'error');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 迁移Telegram机器人配置
 */
async function migrateTelegramBotConfig(defaultNetworkId) {
  logMigration('开始迁移Telegram机器人配置...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 检查是否已有机器人配置
    const existingBots = await client.query('SELECT COUNT(*) FROM telegram_bots');
    
    if (parseInt(existingBots.rows[0].count) > 0) {
      logMigration('Telegram机器人配置已存在，更新网络关联...');
      
      // 为现有机器人创建网络关联
      const bots = await client.query('SELECT id FROM telegram_bots');
      
      for (const bot of bots.rows) {
        await createBotNetworkConfig(client, bot.id, defaultNetworkId);
      }
      
      await client.query('COMMIT');
      return true;
    }
    
    // 从环境变量读取机器人配置
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    
    if (!botToken) {
      logMigration('未找到TELEGRAM_BOT_TOKEN环境变量，跳过机器人配置迁移', 'warn');
      await client.query('COMMIT');
      return false;
    }
    
    // 加密敏感信息
    const encryptedToken = encrypt(botToken);
    const encryptedWebhookSecret = webhookSecret ? encrypt(webhookSecret) : null;
    
    // 创建机器人配置
    const botName = '系统默认机器人';
    const botUsername = 'energy_rental_bot'; // 默认用户名
    
    const networkConfig = {
      default_network_id: defaultNetworkId,
      supported_networks: [defaultNetworkId],
      auto_switch_enabled: false,
      fallback_network_id: defaultNetworkId
    };
    
    const webhookConfig = {
      url: webhookUrl || '',
      secret_token: encryptedWebhookSecret ? JSON.stringify(encryptedWebhookSecret) : '',
      max_connections: 40,
      allowed_updates: ['message', 'callback_query', 'inline_query']
    };
    
    const messageTemplates = {
      welcome: '欢迎使用TRON能量租赁服务！',
      help: '请选择您需要的服务类型',
      error: '抱歉，服务暂时不可用，请稍后重试',
      maintenance: '系统维护中，请稍后重试'
    };
    
    const rateLimits = {
      messages_per_minute: 20,
      commands_per_hour: 100,
      api_calls_per_minute: 30
    };
    
    const securitySettings = {
      enable_whitelist: false,
      allowed_chat_types: ['private', 'group'],
      block_forwarded_messages: false,
      require_user_verification: false,
      admin_chat_id: adminChatId
    };
    
    const config = {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      features: ['energy_rental', 'balance_query', 'transaction_history']
    };
    
    // 插入机器人配置
    const insertBotQuery = `
      INSERT INTO telegram_bots (
        bot_name, bot_token, bot_username, webhook_url, 
        is_active, network_config, webhook_config, 
        message_templates, rate_limits, security_settings, 
        config, health_status, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `;
    
    const botResult = await client.query(insertBotQuery, [
      botName,
      JSON.stringify(encryptedToken),
      botUsername,
      webhookUrl,
      true,
      JSON.stringify(networkConfig),
      JSON.stringify(webhookConfig),
      JSON.stringify(messageTemplates),
      JSON.stringify(rateLimits),
      JSON.stringify(securitySettings),
      JSON.stringify(config),
      'unknown',
      '从环境变量迁移的默认机器人配置'
    ]);
    
    const botId = botResult.rows[0].id;
    logMigration(`成功创建机器人配置: ${botName} (ID: ${botId})`);
    
    // 创建机器人网络关联配置
    await createBotNetworkConfig(client, botId, defaultNetworkId);
    
    await client.query('COMMIT');
    return { botId, botName };
    
  } catch (error) {
    await client.query('ROLLBACK');
    logMigration(`迁移Telegram机器人配置失败: ${error.message}`, 'error');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 创建机器人网络关联配置
 */
async function createBotNetworkConfig(client, botId, networkId) {
  const privateKey = process.env.TRON_PRIVATE_KEY;
  const walletAddress = process.env.TRON_WALLET_ADDRESS || process.env.TRON_ADDRESS;
  
  // 加密私钥
  const encryptedPrivateKey = privateKey ? encrypt(privateKey) : null;
  
  const config = {
    auto_sync: true,
    cache_enabled: true,
    batch_size: 100,
    wallet_address: walletAddress,
    private_key: encryptedPrivateKey ? JSON.stringify(encryptedPrivateKey) : null
  };
  
  const apiSettings = {
    timeout_ms: 30000,
    retry_count: 3,
    rate_limit: 10
  };
  
  const contractAddresses = {
    energy_contract: '',
    usdt_contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
  };
  
  const gasSettings = {
    gas_price: 'auto',
    gas_limit: 1000000,
    fee_limit: 100000000
  };
  
  const monitoringSettings = {
    health_check_interval: 300,
    alert_on_failure: true,
    max_consecutive_failures: 3
  };
  
  const insertConfigQuery = `
    INSERT INTO bot_network_configs (
      bot_id, network_id, is_active, is_primary, priority,
      config, api_settings, contract_addresses, 
      gas_settings, monitoring_settings, sync_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (bot_id, network_id) DO NOTHING
    RETURNING id
  `;
  
  const configResult = await client.query(insertConfigQuery, [
    botId,
    networkId,
    true,
    true,
    1,
    JSON.stringify(config),
    JSON.stringify(apiSettings),
    JSON.stringify(contractAddresses),
    JSON.stringify(gasSettings),
    JSON.stringify(monitoringSettings),
    'pending'
  ]);
  
  if (configResult.rows.length > 0) {
    logMigration(`成功创建机器人网络关联配置 (Bot: ${botId}, Network: ${networkId})`);
  }
}

/**
 * 创建配置备份
 */
function createConfigBackup() {
  logMigration('创建环境变量配置备份...');
  
  const envFile = path.join(__dirname, '../.env');
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  if (fs.existsSync(envFile)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `env_backup_${timestamp}.env`);
    
    fs.copyFileSync(envFile, backupFile);
    logMigration(`环境变量备份已保存到: ${backupFile}`);
    return backupFile;
  } else {
    logMigration('未找到.env文件，跳过备份', 'warn');
    return null;
  }
}

/**
 * 验证迁移结果
 */
async function validateMigration() {
  logMigration('验证迁移结果...');
  
  const client = await pool.connect();
  
  try {
    // 检查网络配置
    const networks = await client.query(`
      SELECT id, name, network_type, is_active, is_default 
      FROM tron_networks 
      ORDER BY priority DESC
    `);
    
    logMigration(`发现 ${networks.rows.length} 个网络配置:`);
    networks.rows.forEach(network => {
      logMigration(`  - ${network.name} (${network.network_type}) - ${network.is_active ? '激活' : '未激活'} ${network.is_default ? '[默认]' : ''}`);
    });
    
    // 检查机器人配置
    const bots = await client.query(`
      SELECT id, bot_name, bot_username, is_active 
      FROM telegram_bots
    `);
    
    logMigration(`发现 ${bots.rows.length} 个机器人配置:`);
    bots.rows.forEach(bot => {
      logMigration(`  - ${bot.bot_name} (@${bot.bot_username}) - ${bot.is_active ? '激活' : '未激活'}`);
    });
    
    // 检查机器人网络关联
    const configs = await client.query(`
      SELECT bnc.id, tb.bot_name, tn.name as network_name, bnc.is_primary
      FROM bot_network_configs bnc
      JOIN telegram_bots tb ON bnc.bot_id = tb.id
      JOIN tron_networks tn ON bnc.network_id = tn.id
    `);
    
    logMigration(`发现 ${configs.rows.length} 个机器人网络关联配置:`);
    configs.rows.forEach(config => {
      logMigration(`  - ${config.bot_name} -> ${config.network_name} ${config.is_primary ? '[主要]' : ''}`);
    });
    
    return true;
    
  } catch (error) {
    logMigration(`验证迁移结果失败: ${error.message}`, 'error');
    return false;
  } finally {
    client.release();
  }
}

/**
 * 主迁移函数
 */
async function main() {
  logMigration('开始配置迁移过程...');
  
  try {
    // 1. 检查数据库连接
    if (!(await checkDatabaseConnection())) {
      process.exit(1);
    }
    
    // 2. 检查必要的表
    if (!(await checkRequiredTables())) {
      logMigration('请先运行数据库迁移脚本创建必要的表', 'error');
      process.exit(1);
    }
    
    // 3. 创建配置备份
    createConfigBackup();
    
    // 4. 迁移TRON网络配置
    const networkResult = await migrateTronNetworkConfig();
    const defaultNetworkId = networkResult.networkId;
    
    // 5. 迁移Telegram机器人配置
    await migrateTelegramBotConfig(defaultNetworkId);
    
    // 6. 验证迁移结果
    if (await validateMigration()) {
      logMigration('配置迁移完成！');
      logMigration('请检查管理后台确认配置是否正确');
      logMigration('迁移完成后，可以考虑从.env文件中移除已迁移的配置项');
    } else {
      logMigration('迁移验证失败，请检查日志', 'error');
      process.exit(1);
    }
    
  } catch (error) {
    logMigration(`迁移过程中发生错误: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本，则执行迁移
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export {
  main,
  encrypt,
  decrypt,
  migrateTronNetworkConfig,
  migrateTelegramBotConfig,
  validateMigration
};