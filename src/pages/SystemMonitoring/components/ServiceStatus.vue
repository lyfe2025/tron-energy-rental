<template>
  <div class="services-status mb-6">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">服务状态</h3>
          <el-button size="small" @click="$emit('check-all')" :loading="checkingAll">
            <el-icon><Refresh /></el-icon>
            检查所有服务
          </el-button>
        </div>
      </template>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="service in services"
          :key="service.name"
          class="service-item border rounded-lg p-4"
          :class="{
            'border-green-200 bg-green-50': service.status === 'running',
            'border-red-200 bg-red-50': service.status === 'stopped',
            'border-yellow-200 bg-yellow-50': service.status === 'warning'
          }"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <el-icon
                :class="{
                  'text-green-500': service.status === 'running',
                  'text-red-500': service.status === 'stopped',
                  'text-yellow-500': service.status === 'warning'
                }"
              >
                <CircleCheck v-if="service.status === 'running'" />
                <CircleClose v-else-if="service.status === 'stopped'" />
                <Warning v-else />
              </el-icon>
              <span class="font-medium">{{ service.name }}</span>
            </div>
            <el-tag
              :type="getServiceTagType(service.status)"
              size="small"
            >
              {{ getServiceStatusText(service.status) }}
            </el-tag>
          </div>
          
          <p class="text-sm text-gray-600 mb-2">{{ service.description }}</p>
          
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>运行时间: {{ service.uptime }}</span>
            <span>最后检查: {{ formatTime(service.last_check) }}</span>
          </div>
          
          <div class="mt-3 flex space-x-2">
            <el-button
              size="small"
              @click="$emit('check-service', service)"
              :loading="service.checking"
            >
              检查
            </el-button>
            <el-button
              v-if="service.status === 'stopped'"
              size="small"
              type="primary"
              @click="$emit('start-service', service)"
              :loading="service.starting"
            >
              启动
            </el-button>
            <el-button
              v-else-if="service.status === 'running'"
              size="small"
              type="warning"
              @click="$emit('restart-service', service)"
              :loading="service.restarting"
            >
              重启
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import {
    CircleCheck,
    CircleClose,
    Refresh,
    Warning
} from '@element-plus/icons-vue'

// 类型定义
interface Service {
  name: string
  description: string
  status: 'running' | 'stopped' | 'warning'
  uptime: string
  last_check: string
  checking?: boolean
  starting?: boolean
  restarting?: boolean
}

// Props
interface Props {
  services: Service[]
  checkingAll?: boolean
}

defineProps<Props>()

// Emits
interface Emits {
  'check-all': []
  'check-service': [service: Service]
  'start-service': [service: Service]
  'restart-service': [service: Service]
}

defineEmits<Emits>()

// 工具方法
const getServiceTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    running: 'success',
    stopped: 'danger',
    warning: 'warning'
  }
  return typeMap[status] || 'info'
}

const getServiceStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    running: '运行中',
    stopped: '已停止',
    warning: '警告'
  }
  return textMap[status] || status
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}
</script>

<style scoped>
.service-item {
  transition: all 0.2s ease;
}

.service-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>

