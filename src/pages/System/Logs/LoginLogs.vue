<template>
  <div class="login-logs-page">
    <div class="page-header">
      <h2>登录日志</h2>
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
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 120px"
          >
            <el-option label="成功" value="1" />
            <el-option label="失败" value="0" />
          </el-select>
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
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="ip_address" label="IP地址" width="140" />
        <el-table-column prop="user_agent" label="用户代理" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="failure_reason" label="失败原因" width="150" show-overflow-tooltip />
        <el-table-column prop="created_at" label="登录时间" width="180">
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
      title="登录日志详情"
      width="600px"
    >
      <div v-if="currentRow" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentRow.id }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ currentRow.user_id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ currentRow.username }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentRow.email }}</el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ currentRow.ip_address }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentRow.status === 1 ? 'success' : 'danger'">
              {{ currentRow.status === 1 ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="失败原因" :span="2">{{ currentRow.failure_reason || '无' }}</el-descriptions-item>
          <el-descriptions-item label="用户代理" :span="2">{{ currentRow.user_agent }}</el-descriptions-item>
          <el-descriptions-item label="登录时间" :span="2">{{ formatDateTime(currentRow.created_at) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { loginLogApi } from '@/api/system/logs'
import { useToast } from '@/composables/useToast'
import { formatDateTime } from '@/utils/date'
import { onMounted, reactive, ref } from 'vue'

// Toast 通知  
const { error } = useToast()

// 响应式数据
const loading = ref(false)
const tableData = ref([])
const dialogVisible = ref(false)
const currentRow = ref(null)

// 搜索表单
const searchForm = reactive({
  user_id: '',
  status: '',
  start_date: '',
  end_date: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 获取登录日志列表
const getLoginLogs = async () => {
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
    
    const response = await loginLogApi.getList(params)
    if (response.success) {
      tableData.value = response.data.logs
      pagination.total = response.data.pagination.total
    } else {
      error(response.error || '获取登录日志失败')
    }
  } catch (error) {
    console.error('获取登录日志失败:', error)
    error('获取登录日志失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  getLoginLogs()
}

// 重置
const handleReset = () => {
  Object.assign(searchForm, {
    user_id: '',
    status: '',
    start_date: '',
    end_date: ''
  })
  pagination.page = 1
  getLoginLogs()
}

// 分页大小改变
const handleSizeChange = (size: number) => {
  pagination.limit = size
  pagination.page = 1
  getLoginLogs()
}

// 当前页改变
const handleCurrentChange = (page: number) => {
  pagination.page = page
  getLoginLogs()
}

// 查看详情
const handleView = (row: any) => {
  currentRow.value = row
  dialogVisible.value = true
}

// 组件挂载时获取数据
onMounted(() => {
  getLoginLogs()
})
</script>

<style scoped>
.login-logs-page {
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
</style>