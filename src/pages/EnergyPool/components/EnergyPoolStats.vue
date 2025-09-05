<template>
  <div>
    <!-- 今日消耗统计 -->
    <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold mb-2">今日能量消耗统计</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p class="text-sm opacity-90">消耗能量</p>
              <p class="text-2xl font-bold">{{ formatEnergy(todayConsumption?.total_consumed_energy || 0) }}</p>
            </div>
            <div>
              <p class="text-sm opacity-90">总成本</p>
              <p class="text-2xl font-bold">{{ (todayConsumption?.total_cost || 0).toFixed(6) }} TRX</p>
            </div>
            <div>
              <p class="text-sm opacity-90">交易次数</p>
              <p class="text-2xl font-bold">{{ todayConsumption?.total_transactions || 0 }}</p>
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
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
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
          <div class="p-2 bg-orange-100 rounded-lg">
            <Lock class="h-6 w-6 text-orange-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">预留能量</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(statistics.reservedEnergy) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-red-100 rounded-lg">
            <DollarSign class="h-6 w-6 text-red-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">平均成本</p>
            <p class="text-2xl font-bold text-gray-900">{{ typeof statistics.averageCost === 'number' ? statistics.averageCost.toFixed(6) : '0.000000' }}</p>
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
    DollarSign,
    Lock,
    RefreshCw,
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
