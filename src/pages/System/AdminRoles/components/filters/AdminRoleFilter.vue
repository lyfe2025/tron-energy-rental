<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <!-- 搜索和筛选 -->
      <div class="flex flex-col sm:flex-row gap-4 flex-1">
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            v-model="localSearchQuery"
            type="text"
            placeholder="搜索管理员用户名、邮箱..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @keyup.enter="handleSearch"
          />
        </div>
        
        <select
          v-model="localFilterDepartment"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">全部岗位</option>
          <option
            v-for="pos in positionOptions"
            :key="pos.value"
            :value="pos.value"
          >
            {{ pos.label }}
          </option>
        </select>
        
        <select
          v-model="localFilterRole"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">全部角色</option>
          <option
            v-for="role in roleOptions"
            :key="role.value"
            :value="role.value"
          >
            {{ role.label }}
          </option>
        </select>
        
        <button
          @click="handleRefresh"
          :disabled="loading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
          刷新
        </button>
      </div>
      
      <!-- 操作按钮 -->
      <div class="flex items-center gap-2">
        <button
          v-if="canCreateAdmin"
          @click="$emit('create-admin')"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlus class="h-4 w-4 mr-2" />
          新增管理员
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw, Search, UserPlus } from 'lucide-vue-next'
import { computed, watch } from 'vue'

interface Props {
  searchQuery: string
  filterDepartment: string
  filterRole: string
  positionOptions: Array<{ value: number; label: string }>
  roleOptions: Array<{ value: number; label: string }>
  loading: boolean
  canCreateAdmin: boolean
}

interface Emits {
  (e: 'update:searchQuery', value: string): void
  (e: 'update:filterDepartment', value: string): void
  (e: 'update:filterRole', value: string): void
  (e: 'search'): void
  (e: 'refresh'): void
  (e: 'create-admin'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地状态与双向绑定
const localSearchQuery = computed({
  get: () => props.searchQuery,
  set: (value) => emit('update:searchQuery', value)
})

const localFilterDepartment = computed({
  get: () => props.filterDepartment,
  set: (value) => emit('update:filterDepartment', value)
})

const localFilterRole = computed({
  get: () => props.filterRole,
  set: (value) => emit('update:filterRole', value)
})

// 监听筛选条件变化，自动搜索
watch([localFilterDepartment, localFilterRole], () => {
  handleSearch()
})

// 事件处理
const handleSearch = () => {
  emit('search')
}

const handleRefresh = () => {
  emit('refresh')
}
</script>

<style scoped>
/* 组件特定样式 */
</style>
