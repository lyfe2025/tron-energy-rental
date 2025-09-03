<template>
  <!-- 系统资源监控 -->
  <div class="bg-white rounded-lg shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">系统资源监控</h2>
    </div>
    
    <div class="p-6">
      <div v-if="systemStats" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- CPU 使用率 -->
        <div class="text-center">
          <div class="relative inline-flex items-center justify-center w-24 h-24 mb-3">
            <svg class="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#e5e7eb"
                stroke-width="8"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                :stroke="getCpuColor(systemStats.cpu.usage)"
                stroke-width="8"
                fill="none"
                stroke-linecap="round"
                :stroke-dasharray="`${2 * Math.PI * 40}`"
                :stroke-dashoffset="`${2 * Math.PI * 40 * (1 - (systemStats.cpu?.usage || 0) / 100)}`"
                class="transition-all duration-300"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-lg font-bold text-gray-900">{{ Math.round(systemStats.cpu?.usage || 0) }}%</span>
            </div>
          </div>
          <h3 class="text-sm font-medium text-gray-900 mb-1">CPU 使用率</h3>
          <p class="text-xs text-gray-500">{{ systemStats.cpu?.cores || '-' }} 核心</p>
        </div>
        
        <!-- 内存使用率 -->
        <div class="text-center">
          <div class="relative inline-flex items-center justify-center w-24 h-24 mb-3">
            <svg class="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#e5e7eb"
                stroke-width="8"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                :stroke="getMemoryColor(systemStats.memory?.usage || 0)"
                stroke-width="8"
                fill="none"
                stroke-linecap="round"
                :stroke-dasharray="`${2 * Math.PI * 40}`"
                :stroke-dashoffset="`${2 * Math.PI * 40 * (1 - (systemStats.memory?.usage || 0) / 100)}`"
                class="transition-all duration-300"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-lg font-bold text-gray-900">{{ Math.round(systemStats.memory?.usage || 0) }}%</span>
            </div>
          </div>
          <h3 class="text-sm font-medium text-gray-900 mb-1">内存使用率</h3>
          <p class="text-xs text-gray-500">{{ formatSize(systemStats.memory?.used || 0) }} / {{ formatSize(systemStats.memory?.total || 0) }}</p>
        </div>
        
        <!-- 磁盘使用率 -->
        <div class="text-center">
          <div class="relative inline-flex items-center justify-center w-24 h-24 mb-3">
            <svg class="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#e5e7eb"
                stroke-width="8"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                :stroke="getDiskColor(systemStats.disk?.usage || 0)"
                stroke-width="8"
                fill="none"
                stroke-linecap="round"
                :stroke-dasharray="`${2 * Math.PI * 40}`"
                :stroke-dashoffset="`${2 * Math.PI * 40 * (1 - (systemStats.disk?.usage || 0) / 100)}`"
                class="transition-all duration-300"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-lg font-bold text-gray-900">{{ Math.round(systemStats.disk?.usage || 0) }}%</span>
            </div>
          </div>
          <h3 class="text-sm font-medium text-gray-900 mb-1">磁盘使用率</h3>
          <p class="text-xs text-gray-500">{{ formatSize(systemStats.disk?.used || 0) }} / {{ formatSize(systemStats.disk?.total || 0) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SystemStats } from '../types/service-status.types'

interface Props {
  systemStats: SystemStats
  getCpuColor: (usage: number) => string
  getMemoryColor: (usage: number) => string
  getDiskColor: (usage: number) => string
  formatSize: (bytes: number) => string
}

defineProps<Props>()
</script>
