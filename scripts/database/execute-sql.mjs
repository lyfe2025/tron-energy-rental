#!/usr/bin/env node

/**
 * 通用数据库SQL执行脚本
 * 自动读取.env文件中的数据库连接信息
 * 支持执行SQL文件和直接SQL语句
 * 
 * 使用方法:
 * 1. 执行SQL文件: node scripts/database/execute-sql.mjs --file migrations/007_remove_is_enabled_field.sql
 * 2. 执行SQL语句: node scripts/database/execute-sql.mjs --sql "SELECT * FROM energy_pools LIMIT 5"
 * 3. 交互模式: node scripts/database/execute-sql.mjs --interactive
 * 
 * 环境变量配置 (.env文件):
 * DB_HOST=localhost
 * DB_PORT=5432
 * DB_NAME=tron_energy_rental
 * DB_USER=postgres
 * DB_PASSWORD=your_password
 * DB_SSL=false
 */

import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
const envPath = resolve(__dirname, '../../.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ 已加载环境配置文件:', envPath);
} else {
  console.log('⚠️  未找到.env文件，使用默认配置');
}

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tron_energy_rental',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// 创建数据库连接池
const pool = new Pool(dbConfig);

// 连接池错误处理
pool.on('error', (err) => {
  console.error('❌ 数据库连接池错误:', err);
  process.exit(1);
});

// 测试数据库连接
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    client.release();
    
    console.log('✅ 数据库连接成功');
    console.log(`   时间: ${result.rows[0].current_time}`);
    console.log(`   版本: ${result.rows[0].db_version.split(' ')[0]}`);
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 执行SQL查询
async function executeQuery(sql, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(sql, params);
    const duration = Date.now() - start;
    
    console.log(`\n✅ SQL执行成功 (耗时: ${duration}ms)`);
    console.log(`   影响行数: ${result.rowCount}`);
    
    if (result.rows.length > 0) {
      console.log('\n📊 查询结果:');
      console.table(result.rows);
    }
    
    return result;
  } catch (error) {
    console.error(`\n❌ SQL执行失败:`, error.message);
    throw error;
  }
}

// 执行SQL文件
async function executeSqlFile(filePath) {
  try {
    const fullPath = resolve(__dirname, '../..', filePath);
    console.log(`\n📁 读取SQL文件: ${fullPath}`);
    
    if (!existsSync(fullPath)) {
      throw new Error(`文件不存在: ${fullPath}`);
    }
    
    const sqlContent = readFileSync(fullPath, 'utf8');
    console.log(`📝 SQL内容长度: ${sqlContent.length} 字符`);
    
    // 分割SQL语句（按分号分割，但忽略字符串内的分号）
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
      .filter(stmt => !stmt.startsWith('COMMENT ON')) // 跳过注释语句
      .filter(stmt => !stmt.startsWith('RAISE NOTICE')); // 跳过RAISE NOTICE语句
    
    console.log(`🔧 检测到 ${statements.length} 条SQL语句`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`\n📋 执行第 ${i + 1} 条SQL语句:`);
        console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
        
        await executeQuery(statement);
      }
    }
    
    console.log('\n🎉 SQL文件执行完成！');
    
  } catch (error) {
    console.error('❌ 执行SQL文件失败:', error.message);
    throw error;
  }
}

// 交互模式
async function interactiveMode() {
  console.log('\n🔧 进入交互模式 (输入 exit 退出)');
  console.log('提示: 每条SQL语句以分号结尾');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askQuestion = (question) => {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  };
  
  try {
    while (true) {
      const sql = await askQuestion('\n请输入SQL语句: ');
      
      if (sql.toLowerCase() === 'exit') {
        break;
      }
      
      if (sql.trim()) {
        try {
          await executeQuery(sql);
        } catch (error) {
          console.log('继续下一条语句...');
        }
      }
    }
  } finally {
    rl.close();
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
🔧 数据库SQL执行脚本

使用方法:
  node scripts/database/execute-sql.mjs [选项]

选项:
  --file <文件路径>     执行SQL文件
  --sql <SQL语句>      执行单条SQL语句
  --interactive        进入交互模式
  --help              显示此帮助信息

示例:
  # 执行迁移文件
  node scripts/database/execute-sql.mjs --file migrations/007_remove_is_enabled_field.sql
  
  # 执行查询语句
  node scripts/database/execute-sql.mjs --sql "SELECT COUNT(*) FROM energy_pools"
  
  # 交互模式
  node scripts/database/execute-sql.mjs --interactive

环境变量配置 (.env文件):
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=tron_energy_rental
  DB_USER=postgres
  DB_PASSWORD=your_password
  DB_SSL=false
`);
}

// 主函数
async function main() {
  console.log('🚀 启动数据库SQL执行脚本');
  console.log(`📍 工作目录: ${process.cwd()}`);
  console.log(`🔗 数据库: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  
  // 测试数据库连接
  if (!(await testConnection())) {
    process.exit(1);
  }
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case '--file':
        const filePath = args[1];
        if (!filePath) {
          throw new Error('请指定SQL文件路径');
        }
        await executeSqlFile(filePath);
        break;
        
      case '--sql':
        const sql = args[1];
        if (!sql) {
          throw new Error('请指定SQL语句');
        }
        await executeQuery(sql);
        break;
        
      case '--interactive':
        await interactiveMode();
        break;
        
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        if (command) {
          console.log(`❌ 未知选项: ${command}`);
        }
        showHelp();
        break;
    }
  } catch (error) {
    console.error('\n💥 脚本执行失败:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接池
    await pool.end();
    console.log('\n👋 数据库连接已关闭');
  }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
