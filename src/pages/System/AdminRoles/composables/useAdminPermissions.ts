import { ref } from 'vue'
import type { AdminPermissionInfo, AdminPermissionResponse } from '../types'

export function useAdminPermissions() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 通用请求函数
  const request = async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = localStorage.getItem('admin_token')
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // 获取管理员权限
  const getAdminPermissions = async (adminId: string) => {
    loading.value = true
    error.value = ''
    
    try {
      const response = await request<AdminPermissionResponse>(`/api/admins/${adminId}/permissions`, {
        method: 'GET'
      })
      
      if (response.success) {
        return response.data
      } else {
        error.value = response.message
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取管理员权限失败'
      return null
    } finally {
      loading.value = false
    }
  }

  // 权限名称映射表
  const getPermissionDisplayName = (permissionKey: string): string => {
    const permissionMap: Record<string, string> = {
      // 仪表板
      'dashboard:view': '仪表板查看',
      
      // 用户管理
      'user:list': '用户列表',
      'user:create': '创建用户',
      'user:edit': '编辑用户',
      'user:delete': '删除用户',
      'user:view': '查看用户详情',
      
      // 代理商管理
      'agent:list': '代理商列表',
      'agent:create': '创建代理商',
      'agent:edit': '编辑代理商',
      'agent:delete': '删除代理商',
      'agent:view': '查看代理商详情',
      
      // 订单管理
      'order:list': '订单列表',
      'order:create': '创建订单',
      'order:edit': '编辑订单',
      'order:delete': '删除订单',
      'order:view': '查看订单详情',
      'order:refund': '订单退款',
      
      // 机器人管理
      'bot:list': '机器人列表',
      'bot:create': '创建机器人',
      'bot:edit': '编辑机器人',
      'bot:delete': '删除机器人',
      'bot:view': '查看机器人详情',
      'bot:start': '启动机器人',
      'bot:stop': '停止机器人',
      
      // 能量池管理
      'energy:pool': '能量池管理',
      'energy:pool:view': '查看能量池',
      'energy:pool:manage': '管理能量池',
      'energy:pool:add': '新增账户',
      'energy:pool:edit': '编辑账户',
      'energy:pool:delete': '删除账户',
      'energy:pool:toggle': '切换账户状态',
      
      // 能量质押管理
      'energy:stake:manage': '质押管理',
      'business:energy:stake': '能量质押',
      'business:energy:stake:freeze': '质押操作',
      'business:energy:stake:unfreeze': '解质押操作',
      'business:energy:stake:delegate': '代理资源',
      'business:energy:stake:undelegate': '取消代理',
      'business:energy:stake:withdraw': '提取解质押',
      
      // 价格配置
      'price:config': '价格配置',
      'price:view': '查看价格',
      'price:edit': '编辑价格',
      
      // 统计分析
      'statistics:view': '统计分析',
      'statistics:export': '导出统计',
      
      // 监控中心
      'monitoring:view': '监控中心',
      'monitoring:overview': '监控概览',
      'monitoring:database': '数据库监控',
      'monitoring:cache': '缓存监控',
      'monitoring:service': '服务监控',
      'monitoring:tasks': '任务监控',
      'monitoring:users': '用户监控',
      
      // 系统管理
      'system:view': '系统管理',
      'system:user:list': '管理员管理',
      'system:user:create': '创建管理员',
      'system:user:edit': '编辑管理员',
      'system:user:delete': '删除管理员',
      'system:role:list': '角色管理',
      'system:role:create': '创建角色',
      'system:role:edit': '编辑角色',
      'system:role:delete': '删除角色',
      'system:dept:list': '部门管理',
      'system:dept:create': '创建部门',
      'system:dept:edit': '编辑部门',
      'system:dept:delete': '删除部门',
      'system:position:list': '岗位管理',
      'system:position:create': '创建岗位',
      'system:position:edit': '编辑岗位',
      'system:position:delete': '删除岗位',
      'system:menu:list': '菜单管理',
      'system:menu:create': '创建菜单',
      'system:menu:edit': '编辑菜单',
      'system:menu:delete': '删除菜单',
      'system:settings:list': '系统设置',
      'system:settings:edit': '编辑设置',
      
      // 日志管理
      'system:log:view': '日志管理',
      'system:log:login:list': '登录日志',
      'system:log:operation:list': '操作日志',
      'system:log:export': '导出日志'
    }
    
    return permissionMap[permissionKey] || permissionKey
  }

  // 权限分类映射
  const getPermissionCategory = (permissionKey: string): string => {
    if (permissionKey.startsWith('dashboard:')) return '仪表板'
    if (permissionKey.startsWith('user:')) return '用户管理'
    if (permissionKey.startsWith('agent:')) return '代理商管理'
    if (permissionKey.startsWith('order:')) return '订单管理'
    if (permissionKey.startsWith('bot:')) return '机器人管理'
    if (permissionKey.startsWith('energy:') || permissionKey.startsWith('business:energy:')) return '能量管理'
    if (permissionKey.startsWith('price:')) return '价格管理'
    if (permissionKey.startsWith('statistics:')) return '统计分析'
    if (permissionKey.startsWith('monitoring:')) return '监控中心'
    if (permissionKey.startsWith('system:')) return '系统管理'
    return '其他'
  }

  // 转换权限数据格式
  const transformPermissionData = (rawData: any): AdminPermissionInfo => {
    
    // 处理新的后端数据结构：{allPermissions, selectedPermissions, adminId}
    const selectedPermissions = rawData.selectedPermissions || []
    const allPermissions = rawData.allPermissions || []
    
    // 将选中的权限字符串数组转换为前端期望的对象数组
    const permissions = selectedPermissions.map((permissionKey: string, index: number) => {
      // 解析权限字符串，例如 "system:user:list" -> resource: "system:user", action: "list"
      const parts = permissionKey.split(':')
      const action = parts.pop() || 'unknown'
      const resource = parts.join(':') || 'unknown'
      
      // 从allPermissions中查找对应的权限详情
      const permissionDetail = allPermissions.find((p: any) => p.id === permissionKey)
      
      return {
        id: index + 1,
        name: permissionDetail?.name || getPermissionDisplayName(permissionKey), // 使用后端返回的名称或映射名称
        key: permissionKey,
        type: 'menu',
        resource: permissionDetail?.category || getPermissionCategory(permissionKey), // 使用后端返回的分类
        action: action,
        description: permissionDetail?.description || getPermissionCategory(permissionKey),
        source: 'role' as const,
        source_name: '角色权限' // 简化处理，因为当前系统主要通过角色分配权限
      }
    })

    // 处理直接权限（当前系统暂不支持直接权限分配）
    const directPermissions: any[] = []

    // 处理角色信息（从原始数据中获取，如果有的话）
    const roles = (rawData.roles || []).map((role: any) => {
      return {
        id: role.id,
        name: role.name,
        code: role.code || role.name,
        description: role.description,
        permissions: permissions // 当前用户通过此角色获得的所有权限
      }
    })

    const result = {
      admin_id: rawData.adminId || rawData.admin_id,
      username: rawData.username || 'unknown',
      permissions: [...permissions, ...directPermissions],
      roles: roles
    }
    
    return result
  }

  // 获取用户权限 (alias for getAdminPermissions)
  const getUserPermissions = async (userId: string): Promise<AdminPermissionInfo | null> => {
    const rawData = await getAdminPermissions(userId)
    if (rawData) {
      return transformPermissionData(rawData)
    }
    return null
  }

  return {
    // 状态
    loading,
    error,

    // 方法
    getAdminPermissions,
    getUserPermissions,
    getPermissionDisplayName,
    getPermissionCategory,
    transformPermissionData
  }
}
