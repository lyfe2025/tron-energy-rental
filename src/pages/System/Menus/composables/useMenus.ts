import { reactive, ref } from 'vue'
import type {
    BatchMenuOperation,
    BatchOperationResponse,
    CreateMenuRequest,
    Menu,
    MenuListResponse,
    MenuOption,
    MenuOptionsResponse,
    MenuQuery,
    MenuResponse,
    MenuStats,
    MenuStatsResponse,
    MenuTreeNode,
    MenuTreeResponse,
    MoveMenuRequest,
    Pagination,
    UpdateMenuRequest
} from '../types'

// 状态
const menus = ref<Menu[]>([])
const menuTree = ref<MenuTreeNode[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const pagination = reactive<Pagination>({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
})
const stats = ref<MenuStats>({
  total: 0,
  active: 0,
  inactive: 0,
  menu_count: 0,
  button_count: 0,
  link_count: 0
})

// 通用请求函数
const request = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('admin_token')
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || '请求失败')
    }

    return data
  } catch (err) {
    console.error('API request failed:', err)
    throw err
  }
}

// 构建菜单树
const buildMenuTree = (menuList: Menu[]): MenuTreeNode[] => {
  const menuMap = new Map<number, MenuTreeNode>()
  const rootMenus: MenuTreeNode[] = []

  // 创建菜单映射
  menuList.forEach(menu => {
    menuMap.set(menu.id, {
      ...menu,
      children: [],
      level: 0,
      hasChildren: false
    })
  })

  // 构建树形结构
  menuList.forEach(menu => {
    const menuNode = menuMap.get(menu.id)!
    
    if (menu.parent_id && menuMap.has(menu.parent_id)) {
      const parent = menuMap.get(menu.parent_id)!
      parent.children = parent.children || []
      parent.children.push(menuNode)
      parent.hasChildren = true
      menuNode.level = (parent.level || 0) + 1
    } else {
      rootMenus.push(menuNode)
    }
  })

  // 排序
  const sortMenus = (menus: MenuTreeNode[]) => {
    menus.sort((a, b) => a.sort_order - b.sort_order)
    menus.forEach(menu => {
      if (menu.children && menu.children.length > 0) {
        sortMenus(menu.children)
      }
    })
  }

  sortMenus(rootMenus)
  return rootMenus
}

// 获取菜单路径
const getMenuPath = (menuId: number, menuList: Menu[]): Menu[] => {
  const path: Menu[] = []
  const menuMap = new Map(menuList.map(menu => [menu.id, menu]))
  
  let currentMenu = menuMap.get(menuId)
  while (currentMenu) {
    path.unshift(currentMenu)
    currentMenu = currentMenu.parent_id ? menuMap.get(currentMenu.parent_id) : undefined
  }
  
  return path
}

// 检查是否有子菜单
const hasChildMenus = (menuId: number, menuList: Menu[]): boolean => {
  return menuList.some(menu => menu.parent_id === menuId)
}

// 获取子菜单ID列表
const getChildMenuIds = (menuId: number, menuList: Menu[]): number[] => {
  const childIds: number[] = []
  
  const findChildren = (parentId: number) => {
    menuList.forEach(menu => {
      if (menu.parent_id === parentId) {
        childIds.push(menu.id)
        findChildren(menu.id)
      }
    })
  }
  
  findChildren(menuId)
  return childIds
}

export const useMenus = () => {
  // 加载菜单列表
  const loadMenus = async (query: MenuQuery = {}) => {
    try {
      loading.value = true
      error.value = null
      
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
      
      const url = `/api/system/menus?${params.toString()}`
      const response = await request<MenuListResponse>(url)
      
      menus.value = response.data
      
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载菜单列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 加载菜单树
  const loadMenuTree = async (query: MenuQuery = {}) => {
    try {
      loading.value = true
      error.value = null
      
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
      
      const url = `/api/system/menus/tree?${params.toString()}`
      const response = await request<MenuTreeResponse>(url)
      
      menuTree.value = response.data
      
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载菜单树失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 获取单个菜单
  const getMenu = async (id: number): Promise<Menu | null> => {
    try {
      const response = await request<MenuResponse>(`/api/system/menus/${id}`)
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取菜单失败'
      throw err
    }
  }

  // 创建菜单
  const createMenu = async (data: CreateMenuRequest): Promise<Menu | null> => {
    try {
      const response = await request<MenuResponse>('/api/system/menus', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建菜单失败'
      throw err
    }
  }

  // 更新菜单
  const updateMenu = async (id: number, data: UpdateMenuRequest): Promise<Menu | null> => {
    try {
      const response = await request<MenuResponse>(`/api/system/menus/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
      
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新菜单失败'
      throw err
    }
  }

  // 删除菜单
  const deleteMenuById = async (id: number): Promise<boolean> => {
    try {
      await request(`/api/system/menus/${id}`, {
        method: 'DELETE'
      })
      
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除菜单失败'
      throw err
    }
  }

  // 批量操作
  const batchOperation = async (operation: BatchMenuOperation): Promise<BatchOperationResponse | null> => {
    try {
      const response = await request<BatchOperationResponse>('/api/system/menus/batch', {
        method: 'POST',
        body: JSON.stringify(operation)
      })
      
      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量操作失败'
      throw err
    }
  }

  // 移动菜单
  const moveMenu = async (data: MoveMenuRequest): Promise<boolean> => {
    try {
      await request('/api/system/menus/move', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '移动菜单失败'
      throw err
    }
  }

  // 加载统计信息
  const loadStats = async (): Promise<MenuStats | null> => {
    try {
      const response = await request<MenuStatsResponse>('/api/system/menus/stats')
      stats.value = response.data
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载统计信息失败'
      throw err
    }
  }

  // 获取菜单选项
  const getMenuOptions = async (excludeId?: number): Promise<MenuOption[]> => {
    try {
      const params = excludeId ? `?exclude=${excludeId}` : ''
      const response = await request<MenuOptionsResponse>(`/api/system/menus/options${params}`)
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取菜单选项失败'
      throw err
    }
  }

  // 检查菜单名称是否可用
  const checkMenuNameAvailable = async (name: string, excludeId?: number): Promise<boolean> => {
    try {
      const params = new URLSearchParams({ name })
      if (excludeId) {
        params.append('exclude', String(excludeId))
      }
      
      const response: { data: { available: boolean } } = await request(`/api/system/menus/check-name?${params.toString()}`)
      return response.data.available
    } catch (err) {
      return false
    }
  }

  // 重置状态
  const resetState = () => {
    menus.value = []
    menuTree.value = []
    loading.value = false
    error.value = null
    pagination.page = 1
    pagination.limit = 20
    pagination.total = 0
    pagination.pages = 0
    stats.value = {
      total: 0,
      active: 0,
      inactive: 0,
      menu_count: 0,
      button_count: 0,
      link_count: 0
    }
  }

  return {
    // 状态
    menus,
    menuTree,
    loading,
    error,
    pagination,
    stats,
    
    // 方法
    loadMenus,
    loadMenuTree,
    getMenu,
    createMenu,
    updateMenu,
    deleteMenuById,
    batchOperation,
    moveMenu,
    loadStats,
    getMenuOptions,
    checkMenuNameAvailable,
    resetState,
    
    // 工具函数
    buildMenuTree,
    getMenuPath,
    hasChildMenus,
    getChildMenuIds
  }
}