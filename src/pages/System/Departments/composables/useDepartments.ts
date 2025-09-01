import { ref, computed } from 'vue'
import type {
  Department,
  DepartmentTreeNode,
  DepartmentOption,
  DepartmentQuery,
  DepartmentStats,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  BatchDepartmentOperation,
  MoveDepartmentRequest,
  DepartmentUser,
  DepartmentUsage,
  DepartmentChangeLog,
  DepartmentConfig,
  Pagination
} from '../types'
import { DepartmentStatus } from '../types'

export function useDepartments() {
  // 响应式状态
  const departments = ref<Department[]>([])
  const departmentTree = ref<DepartmentTreeNode[]>([])
  const departmentOptions = ref<DepartmentOption[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const stats = ref<DepartmentStats>({
    total: 0,
    active: 0,
    inactive: 0,
    topLevel: 0,
    maxDepth: 0
  })

  // 通用请求函数
  const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem('admin_token')
    const response = await fetch(`/api/system${url}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '请求失败' }))
      throw new Error(errorData.error || errorData.message || '请求失败')
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || data.message || '操作失败')
    }

    return data.data
  }

  // 加载部门列表
  const loadDepartments = async (query: DepartmentQuery = {}) => {
    loading.value = true
    error.value = null
    
    try {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
      
      const queryString = params.toString()
      const url = queryString ? `/departments?${queryString}` : '/departments'
      const response = await request<DepartmentTreeNode[]>(url)
      
      // 后端返回的已经是树形结构，但需要设置hasChildren字段
      const processTreeNodes = (nodes: DepartmentTreeNode[]): DepartmentTreeNode[] => {
        return nodes.map(node => ({
          ...node,
          hasChildren: !!(node.children && node.children.length > 0),
          children: node.children ? processTreeNodes(node.children) : []
        }))
      }
      
      departmentTree.value = processTreeNodes(response)
      
      // 从树形结构中提取平铺的部门数组
      const flatDepartments = flattenDepartmentTree(departmentTree.value)
      departments.value = flatDepartments
      
      pagination.value = {
        page: 1,
        limit: flatDepartments.length,
        total: flatDepartments.length,
        totalPages: 1
      }
      
      // 构建选项列表
      departmentOptions.value = buildDepartmentOptions(flatDepartments)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载部门列表失败'
      console.error('加载部门列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取单个部门
  const getDepartment = async (id: number): Promise<Department | null> => {
    try {
      return await request<Department>(`/departments/${id}`)
    } catch (err) {
      console.error('获取部门详情失败:', err)
      return null
    }
  }

  // 创建部门
  const createDepartment = async (departmentData: CreateDepartmentRequest): Promise<Department> => {
    return await request<Department>('/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData)
    })
  }

  // 更新部门
  const updateDepartment = async (id: number, departmentData: UpdateDepartmentRequest): Promise<Department> => {
    return await request<Department>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData)
    })
  }

  // 删除部门
  const deleteDepartment = async (id: number): Promise<void> => {
    await request<void>(`/departments/${id}`, {
      method: 'DELETE'
    })
  }

  // 批量操作
  const batchOperation = async (operation: BatchDepartmentOperation) => {
    return await request('/departments/batch', {
      method: 'POST',
      body: JSON.stringify(operation)
    })
  }

  // 移动部门
  const moveDepartment = async (moveData: MoveDepartmentRequest): Promise<void> => {
    await request<void>('/departments/move', {
      method: 'POST',
      body: JSON.stringify(moveData)
    })
  }

  // 加载统计信息
  const loadStats = async (): Promise<void> => {
    try {
      const response = await request<DepartmentStats>('/departments/stats')
      stats.value = response
    } catch (err) {
      console.error('加载统计信息失败:', err)
    }
  }

  // 获取部门选项
  const getDepartmentOptions = async (): Promise<DepartmentOption[]> => {
    try {
      // 如果已经有部门数据，直接使用本地构建
      if (departments.value.length > 0) {
        const options = buildDepartmentOptions(departments.value)
        departmentOptions.value = options
        return options
      }
      
      // 否则先加载部门数据再构建选项
      await loadDepartments()
      const options = buildDepartmentOptions(departments.value)
      departmentOptions.value = options
      return options
    } catch (err) {
      console.error('获取部门选项失败:', err)
      return []
    }
  }

  // 检查部门名称是否可用
  const checkDepartmentNameAvailable = async (name: string, excludeId?: number): Promise<boolean> => {
    try {
      const params = new URLSearchParams({ name })
      if (excludeId) {
        params.append('exclude_id', String(excludeId))
      }
      
      const response = await request<{ available: boolean }>(`/departments/check-name?${params}`)
      return response.available
    } catch (err) {
      console.error('检查部门名称失败:', err)
      return false
    }
  }

  // 获取部门用户
  const getDepartmentUsers = async (departmentId: number, query: { page?: number; limit?: number } = {}) => {
    try {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
      
      return await request<{
        users: DepartmentUser[]
        total: number
        page: number
        limit: number
      }>(`/departments/${departmentId}/users?${params}`)
    } catch (err) {
      console.error('获取部门用户失败:', err)
      return { users: [], total: 0, page: 1, limit: 20 }
    }
  }

  // 获取部门使用情况
  const getDepartmentUsage = async (departmentId: number): Promise<DepartmentUsage | null> => {
    try {
      return await request<DepartmentUsage>(`/departments/${departmentId}/usage`)
    } catch (err) {
      console.error('获取部门使用情况失败:', err)
      return null
    }
  }

  // 获取部门变更日志
  const getDepartmentChangeLogs = async (departmentId: number, query: { page?: number; limit?: number } = {}) => {
    try {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
      
      return await request<{
        logs: DepartmentChangeLog[]
        total: number
        page: number
        limit: number
      }>(`/departments/${departmentId}/logs?${params}`)
    } catch (err) {
      console.error('获取部门变更日志失败:', err)
      return { logs: [], total: 0, page: 1, limit: 20 }
    }
  }

  // 获取部门配置
  const getDepartmentConfig = async (): Promise<DepartmentConfig | null> => {
    try {
      return await request<DepartmentConfig>('/departments/config')
    } catch (err) {
      console.error('获取部门配置失败:', err)
      return null
    }
  }

  // 更新部门配置
  const updateDepartmentConfig = async (config: Partial<DepartmentConfig>): Promise<DepartmentConfig> => {
    return await request<DepartmentConfig>('/departments/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    })
  }

  // 工具函数：从树形结构中提取平铺的部门数组
  const flattenDepartmentTree = (tree: DepartmentTreeNode[]): Department[] => {
    const departments: Department[] = []
    
    const traverse = (nodes: DepartmentTreeNode[]) => {
      nodes.forEach(node => {
        // 提取部门基本信息
        const { children, hasChildren, level, ...department } = node
        departments.push(department as Department)
        
        // 递归处理子节点
        if (children && children.length > 0) {
          traverse(children)
        }
      })
    }
    
    traverse(tree)
    return departments
  }

  // 工具函数：构建部门树（用于从平铺数组构建树形结构）
  const buildDepartmentTree = (departments: Department[]): DepartmentTreeNode[] => {
    const departmentMap = new Map<number, DepartmentTreeNode>()
    const rootDepartments: DepartmentTreeNode[] = []

    // 创建部门映射
    departments.forEach(dept => {
      // 转换状态：数字状态转换为枚举状态
      const status = typeof dept.status === 'number' 
        ? (dept.status === 1 ? DepartmentStatus.ACTIVE : DepartmentStatus.INACTIVE)
        : dept.status
      
      departmentMap.set(dept.id, {
        ...dept,
        status,
        children: [],
        level: 0,
        hasChildren: false
      })
    })

    // 构建树形结构
    departments.forEach(dept => {
      const node = departmentMap.get(dept.id)!
      
      if (dept.parent_id && departmentMap.has(dept.parent_id)) {
        const parent = departmentMap.get(dept.parent_id)!
        parent.children!.push(node)
        parent.hasChildren = true
        node.level = (parent.level || 0) + 1
      } else {
        rootDepartments.push(node)
      }
    })

    // 排序
    const sortNodes = (nodes: DepartmentTreeNode[]) => {
      nodes.sort((a, b) => a.sort_order - b.sort_order)
      nodes.forEach(node => {
        if (node.children?.length) {
          sortNodes(node.children)
        }
      })
    }

    sortNodes(rootDepartments)
    return rootDepartments
  }

  // 工具函数：构建部门选项
  const buildDepartmentOptions = (departments: Department[]): DepartmentOption[] => {
    const tree = buildDepartmentTree(departments)
    const options: DepartmentOption[] = []

    const traverse = (nodes: DepartmentTreeNode[], level = 0) => {
      nodes.forEach(node => {
        options.push({
          id: node.id,
          name: '　'.repeat(level) + node.name,
          parent_id: node.parent_id,
          level,
          disabled: node.status === DepartmentStatus.INACTIVE
        })
        
        if (node.children?.length) {
          traverse(node.children, level + 1)
        }
      })
    }

    traverse(tree)
    return options
  }

  // 工具函数：获取部门路径
  const getDepartmentPath = (departmentId: number): string[] => {
    const path: string[] = []
    const findPath = (nodes: DepartmentTreeNode[], targetId: number): boolean => {
      for (const node of nodes) {
        path.push(node.name)
        
        if (node.id === targetId) {
          return true
        }
        
        if (node.children?.length && findPath(node.children, targetId)) {
          return true
        }
        
        path.pop()
      }
      return false
    }

    findPath(departmentTree.value, departmentId)
    return path
  }

  // 工具函数：检查是否有子部门
  const hasChildDepartments = (departmentId: number): boolean => {
    const findNode = (nodes: DepartmentTreeNode[], targetId: number): DepartmentTreeNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node
        }
        if (node.children?.length) {
          const found = findNode(node.children, targetId)
          if (found) return found
        }
      }
      return null
    }

    const node = findNode(departmentTree.value, departmentId)
    return !!(node?.children?.length)
  }

  // 工具函数：获取所有子部门ID
  const getChildDepartmentIds = (departmentId: number): number[] => {
    const ids: number[] = []
    
    const findNode = (nodes: DepartmentTreeNode[], targetId: number): DepartmentTreeNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node
        }
        if (node.children?.length) {
          const found = findNode(node.children, targetId)
          if (found) return found
        }
      }
      return null
    }

    const collectIds = (nodes: DepartmentTreeNode[]) => {
      nodes.forEach(node => {
        ids.push(node.id)
        if (node.children?.length) {
          collectIds(node.children)
        }
      })
    }

    const node = findNode(departmentTree.value, departmentId)
    if (node?.children?.length) {
      collectIds(node.children)
    }

    return ids
  }

  // 重置状态
  const resetState = () => {
    departments.value = []
    departmentTree.value = []
    departmentOptions.value = []
    loading.value = false
    error.value = null
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    }
    stats.value = {
      total: 0,
      active: 0,
      inactive: 0,
      topLevel: 0,
      maxDepth: 0
    }
  }

  return {
    // 状态
    departments: computed(() => departments.value),
    departmentTree: computed(() => departmentTree.value),
    departmentOptions: computed(() => departmentOptions.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    pagination: computed(() => pagination.value),
    stats: computed(() => stats.value),
    
    // 方法
    loadDepartments,
    getDepartment,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    batchOperation,
    moveDepartment,
    loadStats,
    getDepartmentOptions,
    checkDepartmentNameAvailable,
    getDepartmentUsers,
    getDepartmentUsage,
    getDepartmentChangeLogs,
    getDepartmentConfig,
    updateDepartmentConfig,
    
    // 工具函数
    flattenDepartmentTree,
    buildDepartmentTree,
    buildDepartmentOptions,
    getDepartmentPath,
    hasChildDepartments,
    getChildDepartmentIds,
    resetState
  }
}