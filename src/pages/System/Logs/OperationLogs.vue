<template>
  <div class="operation-logs-page">
    <div class="page-header">
      <h2>操作日志</h2>
    </div>

    <!-- 搜索表单 -->
    <div class="search-form">
      <el-form :model="searchForm" inline>
        <el-form-item label="用户ID">
          <el-input
            v-model="searchForm.user_id"
            placeholder="请输入用户ID"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="模块">
          <el-input
            v-model="searchForm.module"
            placeholder="请输入模块名称"
            clearable
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="操作">
          <el-input
            v-model="searchForm.operation"
            placeholder="请输入操作名称"
            clearable
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="searchForm.start_date"
            type="datetime"
            placeholder="选择开始日期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="searchForm.end_date"
            type="datetime"
            placeholder="选择结束日期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户名" width="120">
          <template #default="{ row }">
            {{ row.username || '系统' }}
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="resource_type" label="模块" width="120" />
        <el-table-column prop="operation" label="操作" width="120" />
        <el-table-column prop="method" label="请求方法" width="100">
          <template #default="{ row }">
            <el-tag :type="getMethodTagType(row.method)">{{ row.method }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="请求路径" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ip_address" label="IP地址" width="140" />
        <el-table-column prop="created_at" label="操作时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="操作日志详情"
      width="800px"
    >
      <div v-if="currentRow" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentRow.id }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ currentRow.user_id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ currentRow.username }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentRow.email }}</el-descriptions-item>
          <el-descriptions-item label="模块">{{ currentRow.resource_type }}</el-descriptions-item>
          <el-descriptions-item label="操作">{{ currentRow.operation }}</el-descriptions-item>
          <el-descriptions-item label="请求方法">
            <el-tag :type="getMethodTagType(currentRow.method)">{{ currentRow.method }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ currentRow.ip_address }}</el-descriptions-item>
          <el-descriptions-item label="请求路径" :span="2">{{ currentRow.url }}</el-descriptions-item>
          <el-descriptions-item label="用户代理" :span="2">{{ currentRow.user_agent }}</el-descriptions-item>
          <el-descriptions-item label="操作时间" :span="2">{{ formatDateTime(currentRow.created_at) }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-section">
          <h4>请求参数</h4>
          <el-input
            v-model="formattedDetails"
            type="textarea"
            :rows="6"
            readonly
            placeholder="无请求参数"
          />
        </div>
        
        <div v-if="detailData && detailData.response_data" class="detail-section">
          <h4>响应数据</h4>
          <el-input
            v-model="formattedResponseData"
            type="textarea"
            :rows="6"
            readonly
            placeholder="无响应数据"
          />
        </div>
        
        <div v-if="detailData && detailData.error_message" class="detail-section">
          <h4>错误信息</h4>
          <el-input
            v-model="detailData.error_message"
            type="textarea"
            :rows="3"
            readonly
            placeholder="无错误信息"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { operationLogApi } from '@/api/system/logs'
import { useToast } from '@/composables/useToast'
import { formatDateTime } from '@/utils/date'
import { computed, onMounted, reactive, ref } from 'vue'

// Toast 通知
const { error } = useToast()

// 响应式数据
const loading = ref(false)
const tableData = ref([])
const dialogVisible = ref(false)
const currentRow = ref(null)
const detailData = ref(null)

// 搜索表单
const searchForm = reactive({
  user_id: '',
  module: '',
  operation: '',
  start_date: '',
  end_date: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 格式化请求参数
const formattedDetails = computed(() => {
  if (!currentRow.value?.details) return ''
  try {
    const parsed = JSON.parse(currentRow.value.details)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return currentRow.value.details
  }
})

// 格式化响应数据
const formattedResponseData = computed(() => {
  if (!detailData.value?.response_data) return ''
  try {
    const parsed = JSON.parse(detailData.value.response_data)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return detailData.value.response_data
  }
})

// 获取请求方法标签类型
const getMethodTagType = (method: string) => {
  const typeMap = {
    GET: 'info',
    POST: 'success',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'warning'
  }
  return typeMap[method] || 'info'
}

// 获取操作日志列表
const getOperationLogs = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    
    // 过滤空值
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })
    
    const response = await operationLogApi.getList(params)
    if (response.success) {
      const backendData = response.data
      tableData.value = backendData.logs || []
      pagination.total = backendData.pagination?.total || 0
    } else {
      error(response.error || '获取操作日志失败')
    }
  } catch (error) {
    console.error('获取操作日志失败:', error)
    error('获取操作日志失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  getOperationLogs()
}

// 重置
const handleReset = () => {
  Object.assign(searchForm, {
    user_id: '',
    module: '',
    operation: '',
    start_date: '',
    end_date: ''
  })
  pagination.page = 1
  getOperationLogs()
}

// 分页大小改变
const handleSizeChange = (size: number) => {
  pagination.limit = size
  pagination.page = 1
  getOperationLogs()
}

// 当前页改变
const handleCurrentChange = (page: number) => {
  pagination.page = page
  getOperationLogs()
}

// 查看详情
const handleView = async (row: any) => {
  try {
    currentRow.value = row
    
    // 获取详细信息
    const response = await operationLogApi.getDetail(row.id)
    if (response.success) {
      detailData.value = response.data
    } else {
      error(response.error || '获取操作日志详情失败')
      return
    }
    
    dialogVisible.value = true
  } catch (error) {
    console.error('获取操作日志详情失败:', error)
    error('获取操作日志详情失败')
  }
}

// 组件挂载时获取数据
onMounted(() => {
  getOperationLogs()
})
</script>

<style scoped>
.operation-logs-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.search-form {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.table-container {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
}

.detail-content {
  padding: 20px 0;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}
</style>