<template>
  <!-- 搜索和筛选 -->
  <div class="bg-white rounded-lg shadow p-6 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">搜索账户</label>
        <input
          :value="searchQuery"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="搜索账户名称或地址"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">状态筛选</label>
        <select
          :value="statusFilter"
          @change="$emit('update:statusFilter', ($event.target as HTMLSelectElement).value)"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部状态</option>
          <option value="active">活跃</option>
          <option value="inactive">停用</option>
          <option value="maintenance">维护中</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">网络筛选</label>
        <div class="relative">
          <select
            :value="networkFilter"
            @change="$emit('update:networkFilter', ($event.target as HTMLSelectElement).value)"
            :disabled="networksLoading"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">{{ networksLoading ? '加载中...' : '全部网络' }}</option>
            <option v-for="network in availableNetworks" :key="network.id" :value="network.id">
              {{ network.name }} {{ network.is_active ? '' : '(不可用)' }}
            </option>
          </select>
          <!-- 加载指示器 -->
          <div v-if="networksLoading" class="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
          <!-- 错误提示 -->
          <div v-if="networksError" class="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span class="text-red-500 text-sm" :title="networksError">⚠️</span>
          </div>
        </div>
        <!-- 网络状态提示 -->
        <div v-if="networksError" class="mt-1 text-xs text-red-600">
          {{ networksError }}
        </div>
        <div v-else-if="availableNetworks.length === 0 && !networksLoading" class="mt-1 text-xs text-gray-500">
          暂无可用网络
        </div>
      </div>
      <div class="flex items-end">
        <button
          @click="$emit('resetFilters')"
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          重置筛选
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Network {
  id: string
  name: string
  is_active?: boolean
}

interface Props {
  searchQuery: string
  statusFilter: string
  networkFilter: string
  availableNetworks: Network[]
  networksLoading?: boolean
  networksError?: string
}

defineProps<Props>()

defineEmits<{
  'update:searchQuery': [value: string]
  'update:statusFilter': [value: string]
  'update:networkFilter': [value: string]
  resetFilters: []
}>()
</script>

<style scoped>
</style>
