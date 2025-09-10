<template>
  <div class="detailed-stats mb-6">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="text-gray-900">📋 详细统计数据</span>
          <div class="flex items-center gap-2">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索通知类型..."
              :prefix-icon="Search"
              clearable
              size="small"
              class="w-48"
            />
            <el-select v-model="statusFilter" size="small" class="w-32">
              <el-option label="全部状态" value="" />
              <el-option label="成功" value="success" />
              <el-option label="失败" value="failed" />
              <el-option label="等待中" value="pending" />
            </el-select>
          </div>
        </div>
      </template>
      
      <el-table :data="filteredDetailedStats" style="width: 100%" v-loading="loading">
        
        <el-table-column prop="notification_type" label="通知类型" width="180">
          <template #default="scope">
            <div class="flex items-center">
              <el-tag :type="getNotificationTypeColor(scope.row.notification_type)" size="small" class="mr-2">
                {{ getNotificationTypeName(scope.row.notification_type) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="sent_count" label="发送数量" width="120" sortable>
          <template #default="scope">
            <span class="font-mono">{{ formatNumber(scope.row.sent_count) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="success_count" label="成功数量" width="120" sortable>
          <template #default="scope">
            <span class="font-mono text-green-400">{{ formatNumber(scope.row.success_count) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="failed_count" label="失败数量" width="120" sortable>
          <template #default="scope">
            <span class="font-mono text-red-400">{{ formatNumber(scope.row.failed_count) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="成功率" width="100" sortable="custom">
          <template #default="scope">
            <div class="flex items-center">
              <div class="w-12 h-2 bg-gray-700 rounded-full mr-2">
                <div 
                  class="h-full bg-green-500 rounded-full"
                  :style="{ width: `${scope.row.success_rate}%` }"
                ></div>
              </div>
              <span class="text-sm">{{ scope.row.success_rate }}%</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="avg_response_time" label="平均响应时间" width="140" sortable>
          <template #default="scope">
            <span class="font-mono">{{ scope.row.avg_response_time }}ms</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="click_count" label="点击数" width="100" sortable>
          <template #default="scope">
            <span class="font-mono">{{ formatNumber(scope.row.click_count) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="点击率" width="100" sortable="custom">
          <template #default="scope">
            <span class="text-blue-400">{{ scope.row.click_rate }}%</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="last_sent" label="最后发送时间" width="160" sortable>
          <template #default="scope">
            <span class="text-gray-600">{{ formatDateTime(scope.row.last_sent) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button 
              size="small" 
              @click="$emit('view-details', scope.row)"
            >
              📊 详情
            </el-button>
            <el-button 
              size="small" 
              type="info"
              @click="$emit('export-type-report', scope.row)"
            >
              📄 报告
            </el-button>
            <el-button 
              size="small" 
              type="success"
              @click="$emit('optimize-suggestions', scope.row)"
            >
              💡 优化
            </el-button>
          </template>
        </el-table-column>
        
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper mt-4">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="$emit('page-size-change')"
          @current-change="$emit('page-change')"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import type { DetailedStat, Pagination } from '../types/analytics.types'

interface Props {
  detailedStats: DetailedStat[]
  pagination: Pagination
  loading?: boolean
}

interface Emits {
  (e: 'view-details', notification: DetailedStat): void
  (e: 'export-type-report', notification: DetailedStat): void
  (e: 'optimize-suggestions', notification: DetailedStat): void
  (e: 'page-change'): void
  (e: 'page-size-change'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// 搜索和筛选
const searchKeyword = ref('')
const statusFilter = ref('')

// 计算过滤后的数据
const filteredDetailedStats = computed(() => {
  let filtered = props.detailedStats
  
  if (searchKeyword.value) {
    filtered = filtered.filter(item => 
      item.notification_type.toLowerCase().includes(searchKeyword.value.toLowerCase())
    )
  }
  
  if (statusFilter.value) {
    filtered = filtered.filter(item => {
      if (statusFilter.value === 'success') {
        return item.success_rate > 90
      } else if (statusFilter.value === 'failed') {
        return item.success_rate < 50
      } else if (statusFilter.value === 'pending') {
        return item.pending_count && item.pending_count > 0
      }
      return true
    })
  }
  
  return filtered
})

// 工具函数
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

const getNotificationTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    order_created: 'primary',
    payment_success: 'success',
    system_maintenance: 'danger',
    agent_approved: 'warning',
    marketing: 'info'
  }
  return colors[type] || 'info'
}

const getNotificationTypeName = (type: string) => {
  const names: Record<string, string> = {
    order_created: '订单创建',
    payment_success: '支付成功',
    system_maintenance: '系统维护',
    agent_approved: '代理审核',
    marketing: '营销推广'
  }
  return names[type] || type
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}
</script>

<style scoped>
:deep(.el-card) {
  @apply bg-white border-gray-200;
}

:deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.card-header {
  @apply flex items-center justify-between;
}

:deep(.el-table) {
  @apply bg-white;
}

:deep(.el-table th) {
  @apply bg-gray-50 border-gray-200 text-gray-700;
}

:deep(.el-table td) {
  @apply bg-white border-gray-200;
}

:deep(.el-table tr:hover > td) {
  @apply bg-gray-50;
}

:deep(.el-input__inner),
:deep(.el-select .el-input__inner) {
  @apply bg-gray-50 border-gray-600 text-gray-900;
}

.pagination-wrapper :deep(.el-pagination) {
  @apply justify-center;
}
</style>
