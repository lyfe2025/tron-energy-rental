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
                <el-tag :type="getActionTypeColor(record.operation_type)" size="small">
                  {{ getActionTypeText(record.operation_type) }}
                </el-tag>
                <el-tag type="info" size="small">
                  {{ getConfigTypeText(record.entity_type) }}
                </el-tag>
                <span class="text-sm text-gray-500">
                  {{ formatTime(record.created_at) }}
                </span>
              </div>
              
              <h3 class="font-medium text-gray-900 mb-1">
                {{ generateTitle(record) }}
              </h3>
              
              <p class="text-gray-600 text-sm mb-2">
                {{ record.change_description || record.change_reason || '配置变更' }}
              </p>
              
              <div class="flex items-center space-x-4 text-sm text-gray-500">
                <span>
                  <el-icon><User /></el-icon>
                  操作者: {{ record.user_type === 'admin' ? '管理员' : record.user_type || '系统' }}
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
                v-if="canRecordRollback(record)"
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
import type { ConfigHistoryRecord } from '@/services/api'
import { DocumentCopy, Loading, Monitor, User } from '@element-plus/icons-vue'
import {
    canRollback,
    formatTime,
    generateConfigTitle,
    getActionTypeColor,
    getActionTypeText,
    getConfigTypeText
} from '../utils/configUtils'

// 生成标题的辅助函数
const generateTitle = (record: ConfigHistoryRecord): string => {
  return generateConfigTitle(record.entity_type, record.operation_type)
}

// 判断是否可以回滚的辅助函数 - 封装工具函数
const canRecordRollback = (record: ConfigHistoryRecord): boolean => {
  return canRollback(record.operation_type, record.is_rollback)
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
