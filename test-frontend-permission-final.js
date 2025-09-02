import axios from 'axios';

/**
 * 最终前端权限状态验证脚本
 * 验证修复后的完整权限控制流程
 */

const API_BASE = 'http://localhost:3001';

// 模拟前端AuthStore的权限计算逻辑
function simulateAuthStorePermissions(user) {
  if (!user || !user.role) {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      canCreateAdmin: false
    };
  }

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const isSuperAdmin = user.role === 'super_admin';
  const canCreateAdmin = isSuperAdmin; // 只有超级管理员可以创建管理员

  return {
    isAdmin,
    isSuperAdmin,
    canCreateAdmin
  };
}

async function testFinalPermissionState() {
  console.log('🔍 最终权限状态验证测试...');
  
  try {
    // 1. 登录获取token
    console.log('\n1. 执行登录获取用户信息');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@tronrental.com',
      password: 'admin123456'
    });
    
    const { token, user } = loginResponse.data.data;
    console.log(`✅ 登录成功`);
    console.log(`   用户ID: ${user.id}`);
    console.log(`   用户名: ${user.username}`);
    console.log(`   用户角色: ${user.role}`);
    
    // 2. 获取用户详情（模拟前端获取完整用户信息）
    console.log('\n2. 获取用户详情信息');
    const userDetailResponse = await axios.get(`${API_BASE}/api/admins/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const userDetail = userDetailResponse.data.data;
    console.log(`✅ 用户详情获取成功`);
    console.log(`   详情中的角色: ${userDetail.role}`);
    console.log(`   状态: ${userDetail.status}`);
    
    // 3. 模拟前端AuthStore权限计算
    console.log('\n3. 模拟前端AuthStore权限计算');
    const permissions = simulateAuthStorePermissions(userDetail);
    console.log(`   isAdmin: ${permissions.isAdmin}`);
    console.log(`   isSuperAdmin: ${permissions.isSuperAdmin}`);
    console.log(`   canCreateAdmin: ${permissions.canCreateAdmin}`);
    
    // 4. 验证管理员列表API访问
    console.log('\n4. 验证管理员列表API访问');
    const adminsResponse = await axios.get(`${API_BASE}/api/admins`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ 管理员列表API访问成功`);
    console.log(`   管理员数量: ${adminsResponse.data.data.length}`);
    
    // 5. 测试权限控制API
    console.log('\n5. 测试权限控制相关API');
    try {
      const permissionsResponse = await axios.get(`${API_BASE}/api/admins/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ 权限列表API访问成功`);
      console.log(`   权限数量: ${permissionsResponse.data.data.permissions.length}`);
    } catch (error) {
      console.log(`❌ 权限列表API访问失败: ${error.response?.data?.error || error.message}`);
    }
    
    // 6. 最终结论
    console.log('\n🎯 最终权限状态验证结果:');
    console.log(`   ✅ 用户登录状态: 正常`);
    console.log(`   ✅ 用户角色信息: ${userDetail.role}`);
    console.log(`   ✅ 权限计算结果: canCreateAdmin = ${permissions.canCreateAdmin}`);
    
    if (permissions.canCreateAdmin) {
      console.log('\n🔑 权限验证结论:');
      console.log('   ✅ 当前用户具有创建管理员的权限');
      console.log('   ✅ 前端应该显示"新建管理员"按钮');
      console.log('   ✅ 如果按钮仍未显示，请检查前端组件的权限判断逻辑');
    } else {
      console.log('\n❌ 权限验证结论:');
      console.log('   ❌ 当前用户没有创建管理员的权限');
      console.log('   ❌ 前端不应该显示"新建管理员"按钮');
    }
    
    // 7. 前端调试建议
    console.log('\n🔧 前端调试建议:');
    console.log('   1. 检查AuthStore中的user对象是否包含正确的role字段');
    console.log('   2. 验证computed属性canCreateAdmin的计算逻辑');
    console.log('   3. 确认组件中v-if="canCreateAdmin"的条件判断');
    console.log('   4. 检查是否有缓存导致的状态不同步问题');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.response?.data || error.message);
  }
}

// 执行测试
testFinalPermissionState();