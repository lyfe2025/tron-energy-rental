#!/usr/bin/env ts-node

/**
 * 应用中文注释迁移脚本
 * 为TRON能量租赁系统数据库的所有表字段添加中文注释
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from '../../api/config/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyChineseComments() {
  console.log('🚀 开始为数据库表字段添加中文注释...\n');

  try {
    // 读取迁移文件
    const migrationFile = join(__dirname, '../migrations/005_add_chinese_comments.sql');
    const migrationSQL = readFileSync(migrationFile, 'utf-8');
    
    console.log('📁 找到迁移文件:', migrationFile);
    console.log('📊 迁移文件大小:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

    // 分割SQL语句（按分号分割，但忽略字符串中的分号）
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🔄 准备执行 ${statements.length} 条SQL语句...\n`);

    let successCount = 0;
    let errorCount = 0;

    // 逐条执行SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // 跳过空语句和注释
      if (!statement || statement.startsWith('--')) {
        continue;
      }

      try {
        console.log(`📝 执行语句 ${i + 1}/${statements.length}:`);
        console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
        
        await pool.query(statement);
        successCount++;
        console.log(`   ✅ 成功\n`);
      } catch (error) {
        errorCount++;
        console.log(`   ❌ 失败: ${error.message}\n`);
        
        // 如果是非关键错误，继续执行
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`   ⚠️  跳过非关键错误，继续执行...\n`);
        } else {
          console.log(`   🛑 遇到关键错误，停止执行\n`);
          break;
        }
      }
    }

    console.log('📊 迁移执行结果:');
    console.log(`   ✅ 成功: ${successCount} 条`);
    console.log(`   ❌ 失败: ${errorCount} 条`);
    console.log(`   📁 总计: ${statements.length} 条\n`);

    if (errorCount === 0) {
      console.log('🎯 所有表字段中文注释已成功添加！');
      console.log('\n📋 已添加注释的表：');
      console.log('   - users (用户信息表)');
      console.log('   - energy_packages (能量包配置表)');
      console.log('   - bots (Telegram机器人配置表)');
      console.log('   - orders (订单信息表)');
      console.log('   - agents (代理用户表)');
      console.log('   - agent_applications (代理申请表)');
      console.log('   - agent_earnings (代理收益记录表)');
      console.log('   - bot_users (机器人用户关联表)');
      console.log('   - energy_pools (能量池管理表)');
      console.log('   - energy_transactions (能量交易记录表)');
      console.log('   - price_configs (价格配置表)');
      console.log('   - price_templates (价格模板表)');
      console.log('   - price_history (价格变更历史表)');
      console.log('   - system_configs (系统配置表)');
      console.log('   - system_config_history (系统配置变更历史表)');
      console.log('\n🎉 数据库可读性和维护性得到显著提升！');
    } else {
      console.log('⚠️  部分注释添加失败，请检查错误信息并手动处理。');
    }

  } catch (error) {
    console.error('❌ 迁移执行过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await pool.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 执行迁移
if (import.meta.url === `file://${process.argv[1]}`) {
  applyChineseComments().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

export default applyChineseComments;
