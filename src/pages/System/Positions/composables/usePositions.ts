import { ref, reactive } from 'vue'
import type {
  Position,
  PositionQuery,
  CreatePositionRequest,
  UpdatePositionRequest,
  PositionListResponse,
  PositionDetailResponse,
  CreatePositionResponse,
  UpdatePositionResponse,
  DeletePositionResponse,
  PositionStats,
  PositionStatsResponse,
  BatchPositionOperation,
  BatchOperationResponse,
  MovePositionRequest,
  MovePositionResponse,
  Pagination
} from '../types'

// API 基础路径
const API_BASE = '/api/system/positions'

export function usePositions() {
  // 响应式状态
  const positions = ref<Position[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // 分页信息
  const pagination = reactive<Pagination>({
    page: 1,
    limit: 20,
    total: 0
  })

  // 统计信息
  const stats = ref<PositionStats | null>(null)

  // 通用请求函数
  const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem('admin_token')
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || '操作失败')
    }

    return data
  }

  // 加载岗位列表
  const loadPositions = async (query: PositionQuery = {}, page = 1) => {
    try {
      loading.value = true
      error.value = null

      const params = new URLSearchParams()
      if (query.search) params.append('search', query.search)
      if (query.department_id) params.append('department_id', query.department_id.toString())
      if (query.status !== undefined) params.append('status', query.status.toString())
      params.append('page', page.toString())
      params.append('limit', pagination.limit.toString())

      const response = await request<PositionListResponse>(
        `${API_BASE}?${params.toString()}`
      )

      positions.value = response.data.positions
      pagination.page = response.data.page
      pagination.limit = response.data.limit
      pagination.total = response.data.total
      
      return response.data.positions
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载岗位列表失败'
      console.error('加载岗位列表失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // 获取岗位详情
  const getPositionById = async (id: number): Promise<Position | null> => {
    try {
      loading.value = true
      error.value = null

      const response = await request<PositionDetailResponse>(`${API_BASE}/${id}`)
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取岗位详情失败'
      console.error('获取岗位详情失败:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // 创建岗位
  const createPosition = async (data: CreatePositionRequest): Promise<Position | null> => {
    try {
      loading.value = true
      error.value = null

      const response = await request<CreatePositionResponse>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data)
      })

      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建岗位失败'
      console.error('创建岗位失败:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // 更新岗位
  const updatePosition = async (id: number, data: UpdatePositionRequest): Promise<Position | null> => {
    try {
      loading.value = true
      error.value = null

      const response = await request<UpdatePositionResponse>(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })

      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新岗位失败'
      console.error('更新岗位失败:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // 删除岗位
  const deletePositionById = async (id: number): Promise<boolean> => {
    try {
      loading.value = true
      error.value = null

      await request<DeletePositionResponse>(`${API_BASE}/${id}`, {
        method: 'DELETE'
      })

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除岗位失败'
      console.error('删除岗位失败:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // 批量操作
  const batchOperation = async (operation: BatchPositionOperation): Promise<boolean> => {
    try {
      loading.value = true
      error.value = null

      const response = await request<BatchOperationResponse>(`${API_BASE}/batch`, {
        method: 'POST',
        body: JSON.stringify(operation)
      })

      return response.success
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量操作失败'
      console.error('批量操作失败:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // 移动岗位到其他部门
  const movePosition = async (moveRequest: MovePositionRequest): Promise<Position | null> => {
    try {
      loading.value = true
      error.value = null

      const response = await request<MovePositionResponse>(`${API_BASE}/move`, {
        method: 'POST',
        body: JSON.stringify(moveRequest)
      })

      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '移动岗位失败'
      console.error('移动岗位失败:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // 获取岗位统计信息
  const loadPositionStats = async (): Promise<PositionStats | null> => {
    try {
      loading.value = true
      error.value = null

      const response = await request<PositionStatsResponse>(`${API_BASE}/stats`)
      stats.value = response.data
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取统计信息失败'
      console.error('获取统计信息失败:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // 获取部门下的岗位列表
  const getPositionsByDepartment = async (departmentId: number): Promise<Position[]> => {
    try {
      const query: PositionQuery = {
        department_id: departmentId,
        status: 1 // 1表示启用状态
      }
      
      return await loadPositions(query) || []
    } catch (err) {
      console.error('获取部门岗位失败:', err)
      return []
    }
  }

  // 检查岗位名称是否可用
  const checkPositionNameAvailable = async (name: string, departmentId: number, excludeId?: number): Promise<boolean> => {
    try {
      const params = new URLSearchParams()
      params.append('name', name)
      params.append('department_id', departmentId.toString())
      if (excludeId) params.append('exclude_id', excludeId.toString())

      const response = await fetch(`${API_BASE}/check-name?${params.toString()}`)
      const data: { available: boolean } = await response.json()
      
      return data.available
    } catch (err) {
      console.error('检查岗位名称失败:', err)
      return false
    }
  }

  // 获取岗位选项（用于下拉框）
  const getPositionOptions = async (departmentId?: number) => {
    try {
      const query: PositionQuery = {
        status: 1 // 1表示启用状态
      }
      
      if (departmentId) {
        query.department_id = departmentId
      }
      
      const positionList = await loadPositions(query)
      
      return positionList.map(position => ({
        value: position.id,
        label: position.name
      }))
    } catch (err) {
      console.error('获取岗位选项失败:', err)
      return []
    }
  }

  // 重置状态
  const resetState = () => {
    positions.value = []
    error.value = null
    stats.value = null
    Object.assign(pagination, {
      page: 1,
      limit: 20,
      total: 0
    })
  }

  return {
    // 状态
    positions,
    loading,
    error,
    pagination,
    stats,
    
    // 方法
    loadPositions,
    getPositionById,
    createPosition,
    updatePosition,
    deletePositionById,
    batchOperation,
    movePosition,
    loadPositionStats,
    getPositionsByDepartment,
    checkPositionNameAvailable,
    getPositionOptions,
    resetState
  }
}