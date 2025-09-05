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
        <select
          :value="networkFilter"
          @change="$emit('update:networkFilter', ($event.target as HTMLSelectElement).value)"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部网络</option>
          <option v-for="network in availableNetworks" :key="network.id" :value="network.id">
            {{ network.name }}
          </option>
        </select>
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
}

interface Props {
  searchQuery: string
  statusFilter: string
  networkFilter: string
  availableNetworks: Network[]
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
