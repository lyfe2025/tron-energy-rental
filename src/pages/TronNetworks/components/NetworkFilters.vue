<template>
  <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <el-input
        :model-value="searchForm.keyword"
        @update:model-value="updateKeyword"
        placeholder="搜索网络名称或Chain ID"
        clearable
        @input="emit('search')"
      >
        <template #prefix>
          <Search class="w-4 h-4 text-gray-400" />
        </template>
      </el-input>
      
      <el-select
        :model-value="searchForm.status"
        @update:model-value="updateStatus"
        placeholder="连接状态"
        clearable
        @change="emit('search')"
      >
        <el-option label="全部" value="" />
        <el-option label="在线" value="connected" />
        <el-option label="连接中" value="connecting" />
        <el-option label="离线" value="disconnected" />
      </el-select>
      
      <el-select
        :model-value="searchForm.type"
        @update:model-value="updateType"
        placeholder="网络类型"
        clearable
        @change="emit('search')"
      >
        <el-option label="全部" value="" />
        <el-option label="主网" value="mainnet" />
        <el-option label="测试网" value="testnet" />
        <el-option label="私有网" value="private" />
      </el-select>
      
      <el-button @click="emit('reset')">重置</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next';

interface SearchForm {
  keyword: string
  status: string
  type: string
}

const props = defineProps<{
  searchForm: SearchForm
}>()

const emit = defineEmits<{
  search: []
  reset: []
  'update:searchForm': [value: SearchForm]
}>()

const updateKeyword = (value: string) => {
  emit('update:searchForm', { ...props.searchForm, keyword: value })
}

const updateStatus = (value: string) => {
  emit('update:searchForm', { ...props.searchForm, status: value })
}

const updateType = (value: string) => {
  emit('update:searchForm', { ...props.searchForm, type: value })
}
</script>

