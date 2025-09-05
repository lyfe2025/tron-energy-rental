#!/usr/bin/env node

/**
 * TRON能量租赁系统初始化脚本
 * 用于系统首次部署或重置时的初始化操作
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 数据库连接配置
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tron_energy_rental',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

/**
 * 执行SQL文件
 */
async function executeSqlFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`✅ 执行SQL文件成功: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ 执行SQL文件失败: ${path.basename(filePath)}`, error.message);
    throw error;
  }
}

/**
 * 检查数据库连接
 */
async function checkDatabaseConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    throw error;
  }
}

/**
 * 初始化数据库表结构
 */
async function initializeTables() {
  console.log('\n🔧 初始化数据库表结构...');
  
  const migrationFiles = [
    'migrations/20250125_create_config_change_notifications.sql',
    'migrations/create_monitoring_tables.sql'
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      await executeSqlFile(filePath);
    } else {
      console.log(`⚠️  迁移文件不存在: ${file}`);
    }
  }
}

/**
 * 初始化默认配置数据
 */
async function initializeDefaultData() {
  console.log('\n📊 初始化默认配置数据...');
  
  try {
    // 检查是否已有数据
    const { rows: existingConfigs } = await pool.query(
      'SELECT COUNT(*) as count FROM system_configs'
    );
    
    if (parseInt(existingConfigs[0].count) > 0) {
      console.log('✅ 系统配置数据已存在，跳过初始化');
    } else {
      // 执行配置迁移脚本
      const migrationScript = path.join(__dirname, 'migrate-configs.js');
      if (fs.existsSync(migrationScript)) {
        console.log('🔄 执行配置迁移脚本...');
        require(migrationScript);
      }
    }
    
    // 检查TRON网络配置
    const { rows: existingNetworks } = await pool.query(
      'SELECT COUNT(*) as count FROM tron_networks'
    );
    
    if (parseInt(existingNetworks[0].count) === 0) {
      console.log('🌐 初始化默认TRON网络配置...');
      await initializeDefaultNetworks();
    } else {
      console.log('✅ TRON网络配置已存在，跳过初始化');
    }
    
  } catch (error) {
    console.error('❌ 初始化默认数据失败:', error.message);
    throw error;
  }
}

/**
 * 初始化默认TRON网络配置
 */
async function initializeDefaultNetworks() {
  const networks = [
    {
      name: 'TRON Mainnet',
      network_type: 'mainnet',
      rpc_url: 'https://api.trongrid.io',
      chain_id: 1,
      block_explorer_url: 'https://tronscan.org',
      is_active: true,
      is_default: true,
      priority: 100,
      description: 'TRON主网，用于生产环境'
    },
    {
      name: 'Shasta Testnet',
      network_type: 'testnet',
      rpc_url: 'https://api.shasta.trongrid.io',
      chain_id: 2,
      block_explorer_url: 'https://shasta.tronscan.org',
      is_active: true,
      is_default: false,
      priority: 50,
      description: 'TRON Shasta测试网，用于开发和测试'
    },
    {
      name: 'Nile Testnet',
      network_type: 'testnet',
      rpc_url: 'https://nile.trongrid.io',
      chain_id: 3,
      block_explorer_url: 'https://nile.tronscan.org',
      is_active: false,
      is_default: false,
      priority: 30,
      description: 'TRON Nile测试网，备用测试环境'
    }
  ];

  for (const network of networks) {
    await pool.query(`
      INSERT INTO tron_networks (
        name, network_type, rpc_url, chain_id, block_explorer_url,
        is_active, is_default, priority, description,
        timeout_ms, retry_count, rate_limit_per_second
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      network.name, network.network_type, network.rpc_url, network.chain_id,
      network.block_explorer_url, network.is_active, network.is_default,
      network.priority, network.description, 30000, 3, 10
    ]);
  }
  
  console.log('✅ 默认TRON网络配置初始化完成');
}

/**
 * 验证系统状态
 */
async function validateSystemStatus() {
  console.log('\n🔍 验证系统状态...');
  
  try {
    // 检查关键表是否存在
    const tables = [
      'system_configs', 'tron_networks', 'telegram_bots',
      'config_change_logs', 'config_change_notifications'
    ];
    
    for (const table of tables) {
      const { rows } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (rows[0].exists) {
        console.log(`✅ 表 ${table} 存在`);
      } else {
        console.log(`❌ 表 ${table} 不存在`);
      }
    }
    
    // 检查配置数据
    const { rows: configCount } = await pool.query(
      'SELECT COUNT(*) as count FROM system_configs'
    );
    console.log(`📊 系统配置项数量: ${configCount[0].count}`);
    
    const { rows: networkCount } = await pool.query(
      'SELECT COUNT(*) as count FROM tron_networks'
    );
    console.log(`🌐 TRON网络配置数量: ${networkCount[0].count}`);
    
    const { rows: botCount } = await pool.query(
      'SELECT COUNT(*) as count FROM telegram_bots'
    );
    console.log(`🤖 Telegram机器人数量: ${botCount[0].count}`);
    
  } catch (error) {
    console.error('❌ 系统状态验证失败:', error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 TRON能量租赁系统初始化开始...');
  console.log('=' .repeat(50));
  
  try {
    // 1. 检查数据库连接
    await checkDatabaseConnection();
    
    // 2. 初始化表结构
    await initializeTables();
    
    // 3. 初始化默认数据
    await initializeDefaultData();
    
    // 4. 验证系统状态
    await validateSystemStatus();
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 系统初始化完成！');
    console.log('\n📋 后续步骤:');
    console.log('1. 启动服务: npm run restart');
    console.log('2. 访问管理界面: http://localhost:3000');
    console.log('3. 查看API文档: http://localhost:3001/api');
    
  } catch (error) {
    console.error('\n💥 系统初始化失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkDatabaseConnection,
  initializeTables,
  initializeDefaultData,
  validateSystemStatus
};