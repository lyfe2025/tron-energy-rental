import * as dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config();

// 数据库连接配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'tron_energy_rental',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true'
});

async function checkAdminAccounts() {
  try {
    console.log('正在连接数据库...');
    console.log(`数据库: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
    
    // 查询管理员账户
    const query = `
      SELECT 
        id,
        email,
        username,
        role,
        status,
        password_hash,
        created_at,
        last_login_at
      FROM users 
      WHERE role = 'admin'
      ORDER BY created_at ASC
    `;
    
    const result = await pool.query(query);
    
    console.log('\n=== 管理员账户信息 ===');
    console.log(`找到 ${result.rows.length} 个管理员账户:\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ 没有找到管理员账户');
      console.log('\n建议检查:');
      console.log('1. 数据库迁移是否正确执行');
      console.log('2. 初始数据是否正确插入');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. 管理员账户:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   邮箱: ${user.email}`);
        console.log(`   用户名: ${user.username}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   状态: ${user.status}`);
        console.log(`   密码哈希: ${user.password_hash ? '已设置' : '未设置'}`);
        console.log(`   创建时间: ${user.created_at}`);
        console.log(`   最后登录: ${user.last_login_at || '从未登录'}`);
        console.log('');
      });
      
      console.log('\n=== 登录信息 ===');
      const adminUser = result.rows[0];
      if (adminUser.email && adminUser.password_hash) {
        console.log('✅ 可以使用以下信息登录:');
        console.log(`邮箱: ${adminUser.email}`);
        console.log('密码: admin123456 (默认密码)');
        console.log('\n注意: 如果默认密码不工作，请检查数据库迁移文件中的密码设置。');
      } else {
        console.log('❌ 管理员账户缺少必要的登录信息');
        if (!adminUser.email) console.log('- 缺少邮箱');
        if (!adminUser.password_hash) console.log('- 缺少密码哈希');
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n可能的原因:');
      console.log('1. PostgreSQL 服务未启动');
      console.log('2. 数据库连接配置错误');
      console.log('3. 数据库不存在');
    } else if (error.code === '42P01') {
      console.log('\n可能的原因:');
      console.log('1. users 表不存在');
      console.log('2. 数据库迁移未执行');
    } else if (error.code === '28P01') {
      console.log('\n可能的原因:');
      console.log('1. 数据库用户名或密码错误');
      console.log('2. 数据库用户权限不足');
    }
  } finally {
    await pool.end();
  }
}

// 执行查询
checkAdminAccounts();