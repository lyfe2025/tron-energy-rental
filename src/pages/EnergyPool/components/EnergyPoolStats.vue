<template>
  <div>
    <!-- 今日服务统计 -->
    <div class="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-lg p-6 mb-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold mb-2">今日服务统计</h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p class="text-sm opacity-90">代理能量</p>
              <p class="text-2xl font-bold">{{ formatEnergy(todayConsumption?.total_consumed_energy || 0) }}</p>
            </div>
            <div>
              <p class="text-sm opacity-90">服务收入</p>
              <p class="text-2xl font-bold">{{ (todayConsumption?.total_revenue || 0).toFixed(6) }} TRX</p>
            </div>
            <div>
              <p class="text-sm opacity-90">服务次数</p>
              <p class="text-2xl font-bold">{{ todayConsumption?.total_transactions || 0 }}</p>
            </div>
            <div>
              <p class="text-sm opacity-90">平均单价</p>
              <p class="text-2xl font-bold">{{ (todayConsumption?.average_price || 0).toFixed(6) }} TRX</p>
            </div>
          </div>
        </div>
        <div class="text-right">
          <button
            @click="$emit('refreshTodayConsumption')"
            :disabled="loading.statistics"
            class="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw :class="['h-4 w-4', { 'animate-spin': loading.statistics }]" />
          </button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <Database class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">总账户数</p>
            <p class="text-2xl font-bold text-gray-900">{{ statistics.totalAccounts }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <CheckCircle class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">活跃账户</p>
            <p class="text-2xl font-bold text-gray-900">{{ statistics.activeAccounts }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <Zap class="h-6 w-6 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">总能量</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(statistics.totalEnergy) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 rounded-lg">
            <Battery class="h-6 w-6 text-yellow-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">可用能量</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(statistics.availableEnergy) }}</p>
          </div>
        </div>
      </div>


      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-indigo-100 rounded-lg">
            <Signal class="h-6 w-6 text-indigo-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">总带宽</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(statistics.totalBandwidth || 0) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-cyan-100 rounded-lg">
            <Wifi class="h-6 w-6 text-cyan-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">可用带宽</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(statistics.availableBandwidth || 0) }}</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import {
    Battery,
    CheckCircle,
    Database,
    RefreshCw,
    Signal,
    Wifi,
    Zap
} from 'lucide-vue-next'

interface Props {
  statistics: any
  todayConsumption: any
  loading: any
  formatEnergy: (value: number) => string
}

defineProps<Props>()

defineEmits<{
  refreshTodayConsumption: []
}>()
</script>

<style scoped>
</style>
