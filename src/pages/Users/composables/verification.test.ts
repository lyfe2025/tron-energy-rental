/**
 * 用户管理模块分离验证脚本
 * 验证所有分离后的模块能正常工作
 */

import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useUserActions } from './useUserActions'
import { useUserData } from './useUserData'
import { useUserFilters } from './useUserFilters'
import { useUserManagement } from './useUserManagement'
import { useUserUI } from './useUserUI'
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    getStatusColor,
    getStatusText,
    getTypeColor,
    getTypeText,
    getUserTypeColor,
    getUserTypeText
} from './userFormatUtils'

describe('用户管理模块分离验证', () => {
  it('应该能正确导入所有格式化工具函数', () => {
    expect(typeof formatDateTime).toBe('function')
    expect(typeof formatDate).toBe('function')
    expect(typeof formatCurrency).toBe('function')
    expect(typeof getTypeText).toBe('function')
    expect(typeof getTypeColor).toBe('function')
    expect(typeof getUserTypeText).toBe('function')
    expect(typeof getUserTypeColor).toBe('function')
    expect(typeof getStatusText).toBe('function')
    expect(typeof getStatusColor).toBe('function')
  })

  it('格式化函数应该正常工作', () => {
    expect(getStatusText('active')).toBe('正常')
    expect(getStatusText('banned')).toBe('封禁')
    expect(getTypeText('telegram')).toBe('Telegram端')
    expect(getUserTypeText('vip')).toBe('VIP用户')
    expect(formatCurrency(123.456)).toMatch(/123/)
  })

  it('应该能正确导入用户数据管理模块', () => {
    const userData = useUserData()
    
    expect(userData.isLoading).toBeDefined()
    expect(userData.users).toBeDefined()
    expect(userData.userStats).toBeDefined()
    expect(userData.loadUsers).toBeDefined()
    expect(userData.loadUserStats).toBeDefined()
    expect(typeof userData.loadUsers).toBe('function')
    expect(typeof userData.loadUserStats).toBe('function')
  })

  it('应该能正确导入用户筛选模块', () => {
    const userFilters = useUserFilters()
    
    expect(userFilters.searchParams).toBeDefined()
    expect(userFilters.createFilteredUsers).toBeDefined()
    expect(userFilters.createPaginatedUsers).toBeDefined()
    expect(userFilters.handleSearch).toBeDefined()
    expect(typeof userFilters.handleSearch).toBe('function')
  })

  it('应该能正确导入用户UI模块', () => {
    const userUI = useUserUI()
    
    expect(userUI.selectedUsers).toBeDefined()
    expect(userUI.modalMode).toBeDefined()
    expect(userUI.isModalOpen).toBeDefined()
    expect(userUI.showConfirm).toBeDefined()
    expect(typeof userUI.showConfirm).toBe('function')
    expect(typeof userUI.viewUser).toBe('function')
    expect(typeof userUI.editUser).toBe('function')
    expect(typeof userUI.createUser).toBe('function')
  })

  it('应该能正确导入用户操作模块', () => {
    const userActions = useUserActions()
    
    expect(userActions.saveUser).toBeDefined()
    expect(userActions.deleteUser).toBeDefined()
    expect(userActions.batchActivate).toBeDefined()
    expect(userActions.resetPassword).toBeDefined()
    expect(typeof userActions.saveUser).toBe('function')
    expect(typeof userActions.deleteUser).toBe('function')
  })

  it('主组合式函数应该正确整合所有模块', () => {
    const userManagement = useUserManagement()
    
    // 验证数据相关属性
    expect(userManagement.isLoading).toBeDefined()
    expect(userManagement.users).toBeDefined()
    expect(userManagement.userStats).toBeDefined()
    
    // 验证搜索筛选
    expect(userManagement.searchParams).toBeDefined()
    expect(userManagement.filteredUsers).toBeDefined()
    expect(userManagement.handleSearch).toBeDefined()
    
    // 验证UI状态
    expect(userManagement.selectedUsers).toBeDefined()
    expect(userManagement.modalMode).toBeDefined()
    expect(userManagement.showConfirmDialog).toBeDefined()
    
    // 验证操作方法
    expect(userManagement.saveUser).toBeDefined()
    expect(userManagement.deleteUser).toBeDefined()
    expect(userManagement.batchActivate).toBeDefined()
    
    // 验证格式化函数
    expect(userManagement.formatDateTime).toBeDefined()
    expect(userManagement.formatCurrency).toBeDefined()
    expect(userManagement.getStatusText).toBeDefined()
    
    // 验证所有方法都是函数
    expect(typeof userManagement.loadUsers).toBe('function')
    expect(typeof userManagement.handleSearch).toBe('function')
    expect(typeof userManagement.viewUser).toBe('function')
    expect(typeof userManagement.saveUser).toBe('function')
    expect(typeof userManagement.formatDateTime).toBe('function')
  })

  it('筛选逻辑应该正常工作', () => {
    const userFilters = useUserFilters()
    const testUsers = ref([
      {
        id: '1',
        username: 'test1',
        email: 'test1@example.com',
        phone: '123456789',
        status: 'active',
        login_type: 'telegram',
        user_type: 'vip',
        created_at: '2024-01-01T00:00:00.000Z'
      }
    ] as any)

    const filteredUsers = userFilters.createFilteredUsers(testUsers)
    expect(filteredUsers.value.length).toBe(1)
    
    // 测试状态筛选
    userFilters.searchParams.status = 'active'
    expect(filteredUsers.value.length).toBe(1)
    
    userFilters.searchParams.status = 'banned'
    expect(filteredUsers.value.length).toBe(0)
  })

  it('分页逻辑应该正常工作', () => {
    const userFilters = useUserFilters()
    const testUsers = ref([
      { id: '1', username: 'test1' },
      { id: '2', username: 'test2' },
      { id: '3', username: 'test3' },
      { id: '4', username: 'test4' },
      { id: '5', username: 'test5' }
    ] as any)
    
    const currentPage = ref(1)
    const pageSize = ref(2)
    
    const paginatedUsers = userFilters.createPaginatedUsers(testUsers, currentPage, pageSize)
    expect(paginatedUsers.value.length).toBe(2)
    expect(paginatedUsers.value[0].id).toBe('1')
    expect(paginatedUsers.value[1].id).toBe('2')
    
    currentPage.value = 2
    expect(paginatedUsers.value.length).toBe(2)
    expect(paginatedUsers.value[0].id).toBe('3')
    expect(paginatedUsers.value[1].id).toBe('4')
  })
})

// 导出验证函数供手动测试使用
export function manualVerification() {
  console.log('🔍 开始验证用户管理模块分离...')
  
  try {
    // 测试主组合式函数
    const userManagement = useUserManagement()
    console.log('✅ 主组合式函数导入成功')
    
    // 测试格式化函数
    const dateStr = formatDateTime('2024-01-01T12:00:00.000Z')
    const statusText = getStatusText('active')
    console.log('✅ 格式化函数工作正常:', { dateStr, statusText })
    
    // 测试各个模块
    const userData = useUserData()
    const userFilters = useUserFilters()
    const userUI = useUserUI()
    const userActions = useUserActions()
    
    console.log('✅ 所有子模块导入成功')
    
    // 验证返回值结构
    const expectedProperties = [
      'isLoading', 'users', 'userStats', 'searchParams',
      'selectedUsers', 'modalMode', 'filteredUsers',
      'loadUsers', 'handleSearch', 'saveUser', 'deleteUser'
    ]
    
    const missingProperties = expectedProperties.filter(prop => 
      !(prop in userManagement)
    )
    
    if (missingProperties.length === 0) {
      console.log('✅ 所有必要属性和方法都存在')
    } else {
      console.error('❌ 缺少属性:', missingProperties)
      return false
    }
    
    console.log('🎉 用户管理模块分离验证成功！')
    return true
    
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error)
    return false
  }
}
