#!/usr/bin/env ts-node

/**
 * 验证数据库字段中文注释脚本
 * 检查TRON能量租赁系统数据库的所有表字段注释是否添加成功
 */

import pool from '../../api/config/database';

async function verifyComments() {
  console.log('🔍 开始验证数据库字段中文注释...\n');

  try {
    // 查询表注释
    console.log('📋 检查表级别注释...');
    const tableCommentsQuery = `
      SELECT 
        schemaname,
        tablename,
        obj_description((schemaname||'.'||tablename)::regclass) as table_comment
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    
    const tableComments = await pool.query(tableCommentsQuery);
    
    console.log(`📊 找到 ${tableComments.rows.length} 个表：\n`);
    
    let tablesWithComments = 0;
    let tablesWithoutComments = 0;
    
    for (const row of tableComments.rows) {
      if (row.table_comment) {
        console.log(`✅ ${row.tablename}: ${row.table_comment}`);
        tablesWithComments++;
      } else {
        console.log(`❌ ${row.tablename}: 无注释`);
        tablesWithoutComments++;
      }
    }
    
    console.log(`\n📈 表注释统计:`);
    console.log(`   ✅ 有注释: ${tablesWithComments} 个`);
    console.log(`   ❌ 无注释: ${tablesWithoutComments} 个`);
    console.log(`   📁 总计: ${tableComments.rows.length} 个\n`);

    // 查询字段注释
    console.log('🔍 检查字段级别注释...');
    const columnCommentsQuery = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        col_description((t.table_schema||'.'||t.table_name)::regclass, c.ordinal_position) as column_comment
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position;
    `;
    
    const columnComments = await pool.query(columnCommentsQuery);
    
    console.log(`📊 找到 ${columnComments.rows.length} 个字段：\n`);
    
    let columnsWithComments = 0;
    let columnsWithoutComments = 0;
    let currentTable = '';
    
    for (const row of columnComments.rows) {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\n📋 表: ${currentTable}`);
      }
      
      if (row.column_comment) {
        console.log(`   ✅ ${row.column_name} (${row.data_type}): ${row.column_comment}`);
        columnsWithComments++;
      } else {
        console.log(`   ❌ ${row.column_name} (${row.data_type}): 无注释`);
        columnsWithoutComments++;
      }
    }
    
    console.log(`\n📈 字段注释统计:`);
    console.log(`   ✅ 有注释: ${columnsWithComments} 个`);
    console.log(`   ❌ 无注释: ${columnsWithoutComments} 个`);
    console.log(`   📁 总计: ${columnComments.rows.length} 个\n`);

    // 计算注释覆盖率
    const tableCoverage = ((tablesWithComments / tableComments.rows.length) * 100).toFixed(1);
    const columnCoverage = ((columnsWithComments / columnComments.rows.length) * 100).toFixed(1);
    
    console.log('🎯 注释覆盖率统计:');
    console.log(`   📋 表注释覆盖率: ${tableCoverage}%`);
    console.log(`   🔍 字段注释覆盖率: ${columnCoverage}%\n`);

    // 生成报告
    if (parseFloat(tableCoverage) >= 90 && parseFloat(columnCoverage) >= 90) {
      console.log('🎉 恭喜！数据库注释覆盖率已达到优秀水平！');
      console.log('✨ 数据库的可读性和维护性得到显著提升！');
    } else if (parseFloat(tableCoverage) >= 70 && parseFloat(columnCoverage) >= 70) {
      console.log('👍 数据库注释覆盖率已达到良好水平！');
      console.log('💡 建议继续完善剩余的注释以提高覆盖率。');
    } else {
      console.log('⚠️  数据库注释覆盖率较低，建议执行注释迁移脚本。');
      console.log('📝 可以运行: npm run apply-comments 或 ./scripts/apply-chinese-comments.sh');
    }

    // 显示无注释的表和字段
    if (tablesWithoutComments > 0 || columnsWithoutComments > 0) {
      console.log('\n📝 需要添加注释的项目:');
      
      if (tablesWithoutComments > 0) {
        console.log('\n📋 无注释的表:');
        for (const row of tableComments.rows) {
          if (!row.table_comment) {
            console.log(`   - ${row.tablename}`);
          }
        }
      }
      
      if (columnsWithoutComments > 0) {
        console.log('\n🔍 无注释的字段:');
        let currentTable = '';
        for (const row of columnComments.rows) {
          if (!row.column_comment) {
            if (row.table_name !== currentTable) {
              currentTable = row.table_name;
              console.log(`   📋 ${currentTable}:`);
            }
            console.log(`      - ${row.column_name}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await pool.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 执行验证
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyComments().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

export default verifyComments;
