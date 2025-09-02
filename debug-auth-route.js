/**
 * 调试认证和路由权限问题
 * 检查用户角色和质押管理页面的权限要求
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 读取.env文件获取数据库连接信息
dotenv.config();

// 模拟前端路由权限检查
function checkRoutePermission(userRole, requiredRoles) {
  console.log('\n=== 路由权限检查 ===');
  console.log('用户角色:', userRole);
  console.log('需要的角色:', requiredRoles);
  
  if (!userRole) {
    console.log('❌ 用户角色为空');
    return false;
  }
  
  if (!requiredRoles || requiredRoles.length === 0) {
    console.log('✅ 路由无角色限制');
    return true;
  }
  
  const hasPermission = requiredRoles.includes(userRole);
  console.log(hasPermission ? '✅ 权限检查通过' : '❌ 权限检查失败');
  return hasPermission;
}

// 检查localStorage中的用户信息
function checkLocalStorageAuth() {
  console.log('\n=== 检查本地存储的认证信息 ===');
  
  // 模拟浏览器localStorage
  const mockLocalStorage = {
    'admin_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'admin_user': JSON.stringify({
      id: '1',
      username: 'admin',
      email: 'admin@tronrental.com',
      role: 'admin',
      permissions: ['energy_pool_manage', 'stake_manage']
    })
  };
  
  const token = mockLocalStorage['admin_token'];
  const userStr = mockLocalStorage['admin_user'];
  
  console.log('Token存在:', !!token);
  console.log('用户信息存在:', !!userStr);
  
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      console.log('用户信息:', user);
      return user;
    } catch (e) {
      console.log('❌ 用户信息解析失败:', e.message);
      return null;
    }
  }
  
  return null;
}

// 主函数
async function main() {
  console.log('🔍 开始调试认证和路由权限问题\n');
  
  // 1. 检查本地存储的认证信息
  const user = checkLocalStorageAuth();
  
  // 2. 检查质押管理页面的权限要求
  const stakeRouteRoles = ['super_admin', 'admin']; // 从router/index.ts中获取
  
  if (user) {
    // 3. 验证权限
    const hasPermission = checkRoutePermission(user.role, stakeRouteRoles);
    
    console.log('\n=== 结果分析 ===');
    if (hasPermission) {
      console.log('✅ 用户应该能够访问质押管理页面');
      console.log('🔍 如果仍然被重定向，可能的原因:');
      console.log('   1. 前端AuthStore状态同步问题');
      console.log('   2. 路由守卫中的异步验证失败');
      console.log('   3. Token验证失败');
    } else {
      console.log('❌ 用户权限不足，会被重定向到dashboard');
      console.log('💡 解决方案:');
      console.log('   1. 确认用户角色是否正确');
      console.log('   2. 检查角色权限配置');
    }
  } else {
    console.log('❌ 无法获取用户信息，会被重定向到登录页');
  }
  
  // 4. 检查路由配置
  console.log('\n=== 路由配置检查 ===');
  console.log('质押管理路由路径: /business/energy-pool/stake');
  console.log('实际配置路径: energy-pool/stake');
  console.log('⚠️  路径不匹配！这可能是问题所在');
  
  console.log('\n=== 建议修复方案 ===');
  console.log('1. 检查菜单链接路径是否与路由配置匹配');
  console.log('2. 确认路由路径应该是: /energy-pool/stake');
  console.log('3. 或者修改路由配置为: /business/energy-pool/stake');
}

main().catch(console.error);