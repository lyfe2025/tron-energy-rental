<template>
  <div class="template-list">
    <el-card>
      <template #header>
        <div class="template-header">
          <span class="text-gray-900">📝 消息模板库</span>
          <el-button 
            type="primary" 
            size="small"
            @click="$emit('create-template')"
            class="bg-green-600 hover:bg-green-700 border-green-600"
          >
            ➕ 新建模板
          </el-button>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div class="template-filters mb-4">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-input
              :model-value="filters.searchQuery"
              @update:model-value="$emit('update-search', $event)"
              placeholder="搜索模板名称..."
              :prefix-icon="Search"
              clearable
            />
          </el-col>
          <el-col :span="6">
            <el-select 
              :model-value="filters.filterType" 
              @update:model-value="$emit('update-type-filter', $event)"
              placeholder="通知类型" 
              clearable 
              class="w-full"
            >
              <el-option label="全部类型" value="" />
              <el-option label="订单创建" value="order_created" />
              <el-option label="支付成功" value="payment_success" />
              <el-option label="代理审核" value="application_approved" />
              <el-option label="系统维护" value="maintenance_notice" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select 
              :model-value="filters.filterCategory" 
              @update:model-value="$emit('update-category-filter', $event)"
              placeholder="分类" 
              clearable 
              class="w-full"
            >
              <el-option label="全部分类" value="" />
              <el-option label="业务通知" value="business" />
              <el-option label="代理通知" value="agent" />
              <el-option label="价格通知" value="price" />
              <el-option label="系统通知" value="system" />
              <el-option label="营销通知" value="marketing" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select 
              :model-value="filters.filterLanguage" 
              @update:model-value="$emit('update-language-filter', $event)"
              placeholder="语言" 
              clearable 
              class="w-full"
            >
              <el-option label="中文" value="zh" />
              <el-option label="English" value="en" />
              <el-option label="日本語" value="ja" />
            </el-select>
          </el-col>
        </el-row>
      </div>

      <!-- 模板表格 -->
      <el-table :data="templates" style="width: 100%" v-loading="loading">
        
        <el-table-column prop="name" label="模板名称" width="200" />
        
        <el-table-column prop="type" label="通知类型" width="150">
          <template #default="scope">
            <el-tag :type="getCategoryColor(scope.row.category)">
              {{ getTypeName(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="language" label="语言" width="100">
          <template #default="scope">
            <span class="language-badge">{{ getLanguageName(scope.row.language) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="模板预览" width="300">
          <template #default="scope">
            <div class="template-preview">
              {{ truncateText(scope.row.content, 100) }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="usage_count" label="使用次数" width="100" />
        
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.is_default" type="warning" size="small">默认</el-tag>
            <el-tag v-if="scope.row.is_active" type="success" size="small">启用</el-tag>
            <el-tag v-else type="info" size="small">禁用</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="updated_at" label="更新时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.updated_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="280">
          <template #default="scope">
            <el-button 
              size="small" 
              @click="$emit('edit-template', scope.row)"
            >
              ✏️ 编辑
            </el-button>
            <el-button 
              size="small" 
              type="success"
              @click="$emit('test-template', scope.row)"
            >
              🧪 测试
            </el-button>
            <el-button 
              size="small" 
              type="info"
              @click="$emit('duplicate-template', scope.row)"
            >
              📄 复制
            </el-button>
            <el-button 
              size="small" 
              type="danger"
              @click="$emit('delete-template', scope.row)"
              :disabled="scope.row.usage_count > 0"
            >
              🗑️ 删除
            </el-button>
          </template>
        </el-table-column>
        
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper mt-4">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="$emit('page-size-change', $event)"
          @current-change="$emit('page-change', $event)"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import type { MessageTemplate, TemplateFilters, TemplatePagination } from '../types/template.types'

interface Props {
  templates: MessageTemplate[]
  pagination: TemplatePagination
  filters: TemplateFilters
  loading?: boolean
}

interface Emits {
  (e: 'create-template'): void
  (e: 'edit-template', template: MessageTemplate): void
  (e: 'test-template', template: MessageTemplate): void
  (e: 'duplicate-template', template: MessageTemplate): void
  (e: 'delete-template', template: MessageTemplate): void
  (e: 'update-search', query: string): void
  (e: 'update-type-filter', type: string): void
  (e: 'update-category-filter', category: string): void
  (e: 'update-language-filter', language: string): void
  (e: 'page-change', page: number): void
  (e: 'page-size-change', size: number): void
}

withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits<Emits>()

// 工具函数
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    business: 'primary',
    agent: 'success',
    price: 'warning',
    system: 'danger',
    marketing: 'info'
  }
  return colors[category] || 'info'
}

const getTypeName = (type: string) => {
  const names: Record<string, string> = {
    order_created: '订单创建',
    payment_success: '支付成功',
    energy_delegation_complete: '能量代理',
    application_approved: '代理审核',
    commission_earned: '佣金到账',
    maintenance_notice: '系统维护',
    important_announcement: '重要公告'
  }
  return names[type] || type
}

const getLanguageName = (language: string) => {
  const names: Record<string, string> = {
    zh: '中文',
    en: 'English',
    ja: '日本語'
  }
  return names[language] || language
}

const truncateText = (text: string, length: number) => {
  return text.length > length ? text.substring(0, length) + '...' : text
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
:deep(.el-card) {
  @apply bg-white border-gray-200;
}

:deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.template-header {
  @apply flex items-center justify-between;
}

.template-filters :deep(.el-input__inner),
.template-filters :deep(.el-select .el-input__inner) {
  @apply bg-gray-50 border-gray-600 text-gray-900;
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

.template-preview {
  @apply text-gray-700 text-sm;
}

.language-badge {
  @apply text-gray-700 text-sm;
}

.pagination-wrapper :deep(.el-pagination) {
  @apply justify-center;
}
</style>
