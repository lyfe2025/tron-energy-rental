<template>
  <!-- 详情对话框 -->
  <el-dialog
    :model-value="visible"
    title="配置变更详情"
    width="800px"
    :before-close="$emit('close')"
  >
    <div v-if="record" class="config-details">
      <!-- 基本信息 -->
      <div class="basic-info mb-6">
        <h3 class="text-lg font-semibold mb-3">基本信息</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="text-gray-600">操作类型：</span>
            <el-tag :type="getActionTypeColor(record.action_type)" size="small">
              {{ getActionTypeText(record.action_type) }}
            </el-tag>
          </div>
          <div>
            <span class="text-gray-600">配置类型：</span>
            <el-tag type="info" size="small">
              {{ getConfigTypeText(record.config_type) }}
            </el-tag>
          </div>
          <div>
            <span class="text-gray-600">操作时间：</span>
            <span>{{ formatTime(record.created_at) }}</span>
          </div>
          <div>
            <span class="text-gray-600">操作者：</span>
            <span>{{ record.operator }}</span>
          </div>
        </div>
      </div>

      <!-- 变更内容 -->
      <div class="change-content mb-6" v-if="record.changes">
        <h3 class="text-lg font-semibold mb-3">变更内容</h3>
        <div class="bg-gray-50 p-4 rounded-lg">
          <pre class="text-sm">{{ JSON.stringify(record.changes, null, 2) }}</pre>
        </div>
      </div>

      <!-- 备注信息 -->
      <div class="remarks" v-if="record.remarks">
        <h3 class="text-lg font-semibold mb-3">备注信息</h3>
        <div class="bg-blue-50 p-4 rounded-lg">
          <p class="text-sm">{{ record.remarks }}</p>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('close')">关闭</el-button>
        <el-button
          v-if="record?.can_rollback"
          type="warning"
          @click="$emit('rollback', record)"
        >
          回滚此配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
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
  visible: boolean
  record: ConfigHistoryRecord | null
}

interface Emits {
  (e: 'close'): void
  (e: 'rollback', record: ConfigHistoryRecord): void
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
