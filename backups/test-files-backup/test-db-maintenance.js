const mysql = require('mysql2/promise');

async function checkMaintenanceAccounts() {
  let connection;
  
  try {
    // 数据库连接配置
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '123456',
      database: 'tron_energy_rental'
    });

    console.log('🔍 检查数据库中的维护中状态账户...\n');

    // 查询所有账户的状态信息
    const [rows] = await connection.execute(`
      SELECT 
        id, 
        name, 
        status, 
        is_enabled,
        account_type,
        created_at,
        updated_at
      FROM energy_pool_accounts 
      ORDER BY created_at DESC
    `);

    console.log('📊 数据库中的账户状态统计:');
    const statusCount = {};
    const enabledCount = {};
    
    rows.forEach(row => {
      statusCount[row.status] = (statusCount[row.status] || 0) + 1;
      enabledCount[row.is_enabled] = (enabledCount[row.is_enabled] || 0) + 1;
    });

    console.log('状态字段分布:', statusCount);
    console.log('is_enabled字段分布:', enabledCount);
    console.log('\n📋 所有账户详细信息:');
    
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name}`);
      console.log(`   状态: ${row.status} (类型: ${typeof row.status})`);
      console.log(`   启用: ${row.is_enabled} (类型: ${typeof row.is_enabled})`);
      console.log(`   类型: ${row.account_type}`);
      console.log(`   创建时间: ${row.created_at}`);
      console.log(`   更新时间: ${row.updated_at}`);
      console.log('');
    });

    // 特别检查维护中状态
    const maintenanceAccounts = rows.filter(row => row.status === 'maintenance');
    if (maintenanceAccounts.length > 0) {
      console.log('✅ 找到维护中状态的账户:');
      maintenanceAccounts.forEach(account => {
        console.log(`   - ${account.name} (ID: ${account.id})`);
      });
    } else {
      console.log('❌ 没有找到维护中状态的账户');
      console.log('💡 可能的原因:');
      console.log('   1. 数据库中没有维护中状态的记录');
      console.log('   2. 状态字段的值不是"maintenance"');
      console.log('   3. 数据被其他逻辑覆盖了');
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行检查
checkMaintenanceAccounts();
