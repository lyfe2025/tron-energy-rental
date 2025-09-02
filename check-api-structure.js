/**
 * 检查API返回数据结构
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

async function checkAPIStructure() {
    try {
        // 1. 登录获取token
        console.log('🔐 正在登录...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@tronrental.com',
            password: 'admin123456'
        });
        
        if (!loginResponse.data.success) {
            console.log('❌ 登录失败');
            return;
        }
        
        const token = loginResponse.data.data.token;
        console.log('✅ 登录成功');
        
        // 2. 检查管理员列表API
        console.log('\n📋 检查管理员列表API结构...');
        const adminsResponse = await axios.get(`${API_BASE}/admins`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('管理员列表API响应:');
        console.log(JSON.stringify(adminsResponse.data, null, 2));
        
        if (adminsResponse.data.success && adminsResponse.data.data.admins.length > 0) {
            const firstAdmin = adminsResponse.data.data.admins[0];
            console.log('\n第一个管理员的数据结构:');
            console.log(JSON.stringify(firstAdmin, null, 2));
            
            console.log('\n字段检查:');
            console.log(`- id: ${firstAdmin.id}`);
            console.log(`- username: ${firstAdmin.username}`);
            console.log(`- email: ${firstAdmin.email}`);
            console.log(`- role: ${firstAdmin.role}`);
            console.log(`- status: ${firstAdmin.status}`);
        }
        
        // 3. 检查单个管理员详情API
        if (adminsResponse.data.success && adminsResponse.data.data.admins.length > 0) {
            const adminId = adminsResponse.data.data.admins[0].id;
            console.log(`\n👤 检查管理员详情API (ID: ${adminId})...`);
            
            const adminDetailResponse = await axios.get(`${API_BASE}/admins/${adminId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('管理员详情API响应:');
            console.log(JSON.stringify(adminDetailResponse.data, null, 2));
        }
        
    } catch (error) {
        console.log('❌ 检查过程中发生错误:');
        console.log('错误信息:', error.message);
        if (error.response) {
            console.log('响应状态:', error.response.status);
            console.log('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

checkAPIStructure();