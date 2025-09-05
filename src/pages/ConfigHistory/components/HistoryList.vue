<template>
  <!-- 历史记录列表 -->
  <div class="history-list">
    <el-card>
      <div v-if="loading" class="text-center py-8">
        <el-icon class="is-loading" size="32"><Loading /></el-icon>
        <p class="mt-2 text-gray-500">加载中...</p>
      </div>

      <div v-else-if="paginatedHistory.length === 0" class="text-center py-8">
        <el-icon size="48" class="text-gray-400"><DocumentCopy /></el-icon>
        <p class="mt-2 text-gray-500">暂无历史记录</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="record in paginatedHistory"
          :key="record.id"
          class="history-item border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex justify-between items-start">
            <!-- 左侧信息 -->
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <el-tag :type="getActionTypeColor(record.action_type)" size="small">
                  {{ getActionTypeText(record.action_type) }}
                </el-tag>
                <el-tag type="info" size="small">
                  {{ getConfigTypeText(record.config_type) }}
                </el-tag>
                <span class="text-sm text-gray-500">
                  {{ formatTime(record.created_at) }}
                </span>
              </div>
              
              <h3 class="font-medium text-gray-900 mb-1">
                {{ record.title }}
              </h3>
              
              <p class="text-gray-600 text-sm mb-2">
                {{ record.description }}
              </p>
              
              <div class="flex items-center space-x-4 text-sm text-gray-500">
                <span>
                  <el-icon><User /></el-icon>
                  操作者: {{ record.operator }}
                </span>
                <span v-if="record.ip_address">
                  <el-icon><Monitor /></el-icon>
                  IP: {{ record.ip_address }}
                </span>
              </div>
            </div>
            
            <!-- 右侧操作 -->
            <div class="flex items-center space-x-2">
              <el-button
                size="small"
                @click="$emit('viewDetails', record)"
              >
                查看详情
              </el-button>
              <el-button
                v-if="record.can_rollback"
                size="small"
                type="warning"
                @click="$emit('rollbackConfig', record)"
              >
                回滚
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { DocumentCopy, Loading, Monitor, User } from '@element-plus/icons-vue'

interface ConfigHistoryRecord {
  id: string
  config_type: 'bot' | 'network' | 'energy_pool' | 'system'
  action_type: 'create' | 'update' | 'delete' | 'enable' | 'disable'
  title: string
  description: string
  operator: string
  ip_address?: string
  created_at: string
  changes?: any
  remarks?: string
  can_rollback: boolean
}

interface Props {
  loading: boolean
  paginatedHistory: ConfigHistoryRecord[]
}

interface Emits {
  (e: 'viewDetails', record: ConfigHistoryRecord): void
  (e: 'rollbackConfig', record: ConfigHistoryRecord): void
}

defineProps<Props>()
defineEmits<Emits>()

const getActionTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    enable: '启用',
    disable: '禁用'
  }
  return typeMap[type] || type
}

const getActionTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
    enable: 'success',
    disable: 'warning'
  }
  return colorMap[type] || 'info'
}

const getConfigTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    bot: '机器人配置',
    network: '网络配置',
    energy_pool: '能量池配置',
    system: '系统配置'
  }
  return typeMap[type] || type
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}
</script>

<style scoped>
.history-item {
  transition: all 0.2s ease;
}

.history-item:hover {
  border-color: #409eff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.p-4 {
  padding: 1rem;
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.border {
  border-width: 1px;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.text-center {
  text-align: center;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.font-medium {
  font-weight: 500;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-600 {
  color: #4b5563;
}

.text-gray-900 {
  color: #111827;
}

.flex {
  display: flex;
}

.flex-1 {
  flex: 1 1 0%;
}

.items-start {
  align-items: flex-start;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.space-x-2 > * + * {
  margin-left: 0.5rem;
}

.space-x-3 > * + * {
  margin-left: 0.75rem;
}

.space-x-4 > * + * {
  margin-left: 1rem;
}
</style>
