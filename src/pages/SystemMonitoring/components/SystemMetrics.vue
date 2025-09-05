<template>
  <div class="system-overview mb-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- CPU使用率 -->
      <el-card class="metric-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">CPU使用率</p>
            <p class="text-2xl font-bold" :class="getCpuStatusColor(metrics.cpu_usage)">
              {{ metrics.cpu_usage }}%
            </p>
          </div>
          <div class="metric-icon cpu">
            <el-icon size="24"><Cpu /></el-icon>
          </div>
        </div>
        <div class="mt-3">
          <el-progress
            :percentage="metrics.cpu_usage"
            :color="getCpuProgressColor(metrics.cpu_usage)"
            :show-text="false"
            :stroke-width="6"
          />
        </div>
      </el-card>

      <!-- 内存使用率 -->
      <el-card class="metric-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">内存使用率</p>
            <p class="text-2xl font-bold" :class="getMemoryStatusColor(metrics.memory_usage)">
              {{ metrics.memory_usage }}%
            </p>
          </div>
          <div class="metric-icon memory">
            <el-icon size="24"><Monitor /></el-icon>
          </div>
        </div>
        <div class="mt-3">
          <el-progress
            :percentage="metrics.memory_usage"
            :color="getMemoryProgressColor(metrics.memory_usage)"
            :show-text="false"
            :stroke-width="6"
          />
        </div>
      </el-card>

      <!-- 磁盘使用率 -->
      <el-card class="metric-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">磁盘使用率</p>
            <p class="text-2xl font-bold" :class="getDiskStatusColor(metrics.disk_usage)">
              {{ metrics.disk_usage }}%
            </p>
          </div>
          <div class="metric-icon disk">
            <el-icon size="24"><FolderOpened /></el-icon>
          </div>
        </div>
        <div class="mt-3">
          <el-progress
            :percentage="metrics.disk_usage"
            :color="getDiskProgressColor(metrics.disk_usage)"
            :show-text="false"
            :stroke-width="6"
          />
        </div>
      </el-card>

      <!-- 网络延迟 -->
      <el-card class="metric-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">网络延迟</p>
            <p class="text-2xl font-bold" :class="getLatencyStatusColor(metrics.network_latency)">
              {{ metrics.network_latency }}ms
            </p>
          </div>
          <div class="metric-icon network">
            <el-icon size="24"><Connection /></el-icon>
          </div>
        </div>
        <div class="mt-3">
          <el-tag :type="getLatencyTagType(metrics.network_latency)" size="small">
            {{ getLatencyStatus(metrics.network_latency) }}
          </el-tag>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
    Connection,
    Cpu,
    FolderOpened,
    Monitor
} from '@element-plus/icons-vue'

// 类型定义
interface SystemMetrics {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_latency: number
}

// Props
interface Props {
  metrics: SystemMetrics
}

defineProps<Props>()

// 状态颜色和类型方法
const getCpuStatusColor = (usage: number) => {
  if (usage > 80) return 'text-red-500'
  if (usage > 60) return 'text-yellow-500'
  return 'text-green-500'
}

const getCpuProgressColor = (usage: number) => {
  if (usage > 80) return '#f56565'
  if (usage > 60) return '#ed8936'
  return '#48bb78'
}

const getMemoryStatusColor = (usage: number) => {
  if (usage > 85) return 'text-red-500'
  if (usage > 70) return 'text-yellow-500'
  return 'text-green-500'
}

const getMemoryProgressColor = (usage: number) => {
  if (usage > 85) return '#f56565'
  if (usage > 70) return '#ed8936'
  return '#48bb78'
}

const getDiskStatusColor = (usage: number) => {
  if (usage > 90) return 'text-red-500'
  if (usage > 75) return 'text-yellow-500'
  return 'text-green-500'
}

const getDiskProgressColor = (usage: number) => {
  if (usage > 90) return '#f56565'
  if (usage > 75) return '#ed8936'
  return '#48bb78'
}

const getLatencyStatusColor = (latency: number) => {
  if (latency > 100) return 'text-red-500'
  if (latency > 50) return 'text-yellow-500'
  return 'text-green-500'
}

const getLatencyTagType = (latency: number) => {
  if (latency > 100) return 'danger'
  if (latency > 50) return 'warning'
  return 'success'
}

const getLatencyStatus = (latency: number) => {
  if (latency > 100) return '延迟较高'
  if (latency > 50) return '延迟正常'
  return '延迟很低'
}
</script>

<style scoped>
.metric-card {
  transition: all 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-icon.cpu {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.metric-icon.memory {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.metric-icon.disk {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.metric-icon.network {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}
</style>

