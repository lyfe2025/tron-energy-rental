<template>
  <!-- 详情对话框 -->
  <el-dialog
    :model-value="visible"
    title="配置变更详情"
    width="800px"
    :before-close="handleClose"
    destroy-on-close
  >
    <div v-if="record" class="config-details" @error="handleError">
      <!-- 调试信息 -->
      <div v-if="false" class="debug-info mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
        <h4>调试信息：</h4>
        <pre>{{ getDebugInfo(record) }}</pre>
      </div>
      <!-- 基本信息 -->
      <div class="basic-info mb-6">
        <h3 class="text-lg font-semibold mb-3">基本信息</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="text-gray-600">操作类型：</span>
            <el-tag :type="safeGetActionTypeColor(record.operation_type)" size="small">
              {{ safeGetActionTypeText(record.operation_type) }}
            </el-tag>
          </div>
          <div>
            <span class="text-gray-600">配置类型：</span>
            <el-tag type="info" size="small">
              {{ safeGetConfigTypeText(record.entity_type) }}
            </el-tag>
          </div>
          <div>
            <span class="text-gray-600">操作时间：</span>
            <span>{{ safeFormatTime(record.created_at) }}</span>
          </div>
          <div>
            <span class="text-gray-600">操作者：</span>
            <span>{{ safeGetUserType(record.user_type) }}</span>
          </div>
        </div>
      </div>

      <!-- 变更内容 -->
      <div class="change-content mb-6" v-if="hasChangeContent(record)">
        <h3 class="text-lg font-semibold mb-3">变更内容</h3>
        <div class="bg-gray-50 p-4 rounded-lg">
          <div v-if="record.old_value !== null && record.old_value !== undefined" class="mb-2">
            <strong>变更前：</strong>
            <pre class="text-sm">{{ safeStringify(record.old_value) }}</pre>
          </div>
          <div v-if="record.new_value !== null && record.new_value !== undefined">
            <strong>变更后：</strong>
            <pre class="text-sm">{{ safeStringify(record.new_value) }}</pre>
          </div>
        </div>
      </div>

      <!-- 备注信息 -->
      <div class="remarks" v-if="hasRemarks(record)">
        <h3 class="text-lg font-semibold mb-3">备注信息</h3>
        <div class="bg-blue-50 p-4 rounded-lg">
          <p v-if="record.change_reason" class="text-sm mb-2"><strong>变更原因：</strong>{{ record.change_reason }}</p>
          <p v-if="record.change_description" class="text-sm"><strong>变更描述：</strong>{{ record.change_description }}</p>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button
          v-if="canShowRollback(record)"
          type="warning"
          @click="handleRollback(record)"
        >
          回滚此配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { ConfigHistoryRecord } from '@/services/api'

interface Props {
  visible: boolean
  record: ConfigHistoryRecord | null
}

interface Emits {
  (e: 'close'): void
  (e: 'rollback', record: ConfigHistoryRecord): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// 安全的工具函数，避免任何可能的错误
const safeGetActionTypeText = (type: any): string => {
  try {
    if (!type) return '未知操作'
    const typeMap: Record<string, string> = {
      create: '创建',
      update: '更新', 
      delete: '删除',
      enable: '启用',
      disable: '禁用',
      activate: '启用',
      deactivate: '禁用'
    }
    return typeMap[String(type)] || String(type)
  } catch (error) {
    console.error('getActionTypeText error:', error)
    return '未知操作'
  }
}

const safeGetActionTypeColor = (type: any): string => {
  try {
    if (!type) return 'info'
    const colorMap: Record<string, string> = {
      create: 'success',
      update: 'primary',
      delete: 'danger', 
      enable: 'success',
      disable: 'warning',
      activate: 'success',
      deactivate: 'warning'
    }
    return colorMap[String(type)] || 'info'
  } catch (error) {
    console.error('getActionTypeColor error:', error)
    return 'info'
  }
}

const safeGetConfigTypeText = (type: any): string => {
  try {
    if (!type) return '未知配置'
    const typeMap: Record<string, string> = {
      bot: '机器人配置',
      telegram_bot: '机器人配置',
      network: '网络配置', 
      tron_network: '网络配置',
      energy_pool: '能量池配置',
      system: '系统配置',
      system_config: '系统配置',
      bot_network_config: '机器人网络配置'
    }
    return typeMap[String(type)] || String(type)
  } catch (error) {
    console.error('getConfigTypeText error:', error)
    return '未知配置'
  }
}

const safeFormatTime = (time: any): string => {
  try {
    if (!time) return '未知时间'
    return new Date(time).toLocaleString('zh-CN')
  } catch (error) {
    console.error('formatTime error:', error)
    return String(time) || '未知时间'
  }
}

const safeGetUserType = (userType: any): string => {
  try {
    if (!userType) return '系统'
    return userType === 'admin' ? '管理员' : String(userType)
  } catch (error) {
    console.error('getUserType error:', error)
    return '系统'
  }
}

const safeStringify = (obj: any): string => {
  try {
    if (obj === null || obj === undefined) return 'null'
    return JSON.stringify(obj, null, 2)
  } catch (error) {
    console.error('JSON stringify error:', error)
    return String(obj) || 'null'
  }
}

// 检查是否有变更内容
const hasChangeContent = (record: ConfigHistoryRecord | null): boolean => {
  try {
    if (!record) return false
    return (record.old_value !== null && record.old_value !== undefined) || 
           (record.new_value !== null && record.new_value !== undefined)
  } catch (error) {
    console.error('hasChangeContent error:', error)
    return false
  }
}

// 检查是否有备注信息
const hasRemarks = (record: ConfigHistoryRecord | null): boolean => {
  try {
    if (!record) return false
    return !!(record.change_reason || record.change_description)
  } catch (error) {
    console.error('hasRemarks error:', error)
    return false
  }
}

// 获取调试信息
const getDebugInfo = (record: ConfigHistoryRecord | null): string => {
  try {
    if (!record) return 'record is null'
    return JSON.stringify(record, null, 2)
  } catch (error) {
    console.error('getDebugInfo error:', error, record)
    return `Debug error: ${error}. Record type: ${typeof record}`
  }
}

// 错误处理函数
const handleError = (error: Event) => {
  console.error('Component error:', error)
}

// 处理关闭对话框
const handleClose = () => {
  try {
    emit('close')
  } catch (error) {
    console.error('Close dialog error:', error)
  }
}

// 处理回滚操作
const handleRollback = (record: ConfigHistoryRecord | null) => {
  try {
    if (record) {
      emit('rollback', record)
    }
  } catch (error) {
    console.error('Rollback error:', error)
  }
}

// 检查是否可以显示回滚按钮
const canShowRollback = (record: ConfigHistoryRecord | null): boolean => {
  try {
    return !!(record && record.operation_type === 'update' && !record.is_rollback)
  } catch (error) {
    console.error('canShowRollback error:', error)
    return false
  }
}

</script>

<style scoped>
.config-details pre {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gap-4 {
  gap: 1rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.p-4 {
  padding: 1rem;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.bg-blue-50 {
  background-color: #eff6ff;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.font-semibold {
  font-weight: 600;
}

.text-gray-600 {
  color: #4b5563;
}
</style>
