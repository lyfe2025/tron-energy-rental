<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <!-- 搜索框 -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          v-model="localForm.keyword"
          type="text"
          placeholder="搜索机器人名称或Token"
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          @input="handleSearch"
        />
      </div>
      
      <!-- 状态筛选 -->
      <select
        v-model="localForm.status"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @change="handleSearch"
      >
        <option value="">全部状态</option>
        <option value="active">启用</option>
        <option value="inactive">禁用</option>
      </select>
      
      <!-- 网络筛选 -->
      <select
        v-model="localForm.network"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @change="handleSearch"
      >
        <option value="">全部网络</option>
        <option
          v-for="network in networks"
          :key="network.id"
          :value="network.id"
        >
          {{ network.name }}
        </option>
      </select>
      
      <!-- 配置模板筛选 -->
      <select
        v-model="localForm.template"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @change="handleSearch"
      >
        <option value="">全部模板</option>
        <option value="energy">能量租赁</option>
        <option value="service">客服机器人</option>
        <option value="custom">自定义</option>
      </select>
      
      <!-- 重置按钮 -->
      <button
        @click="handleReset"
        class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
      >
        <RotateCcw class="w-4 h-4" />
        重置
      </button>
    </div>
    
    <!-- 批量选择提示 -->
    <div v-if="selectedBots.length > 0" class="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
      <span class="text-blue-700">已选择 {{ selectedBots.length }} 个机器人</span>
      <div class="flex gap-2">
        <button
          @click="$emit('batch-enable')"
          class="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          批量启用
        </button>
        <button
          @click="$emit('batch-disable')"
          class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          批量禁用
        </button>
        <button
          @click="$emit('clear-selection')"
          class="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          取消选择
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RotateCcw, Search } from 'lucide-vue-next'
import { reactive, watch } from 'vue'

// 类型定义
interface Network {
  id: string
  name: string
}

interface SearchForm {
  keyword: string
  status: string
  network: string
  template: string
}

// Props
interface Props {
  modelValue: SearchForm
  networks: Network[]
  selectedBots: string[]
}

const props = defineProps<Props>()

// Emits
interface Emits {
  'update:modelValue': [value: SearchForm]
  'search': []
  'reset': []
  'batch-enable': []
  'batch-disable': []
  'clear-selection': []
}

const emit = defineEmits<Emits>()

// 本地表单
const localForm = reactive<SearchForm>({ ...props.modelValue })

// 监听本地表单变化
watch(
  localForm,
  (newValue) => {
    emit('update:modelValue', newValue)
  },
  { deep: true }
)

// 监听外部变化
watch(
  () => props.modelValue,
  (newValue) => {
    Object.assign(localForm, newValue)
  },
  { deep: true }
)

// 方法
const handleSearch = () => {
  emit('search')
}

const handleReset = () => {
  Object.assign(localForm, {
    keyword: '',
    status: '',
    network: '',
    template: ''
  })
  emit('reset')
}
</script>

