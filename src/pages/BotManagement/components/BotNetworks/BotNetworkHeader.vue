<!--
 * 机器人网络管理页面头部组件
 * 职责：页面导航、标题显示和主要操作按钮
-->
<template>
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center space-x-4">
      <el-button @click="handleBack" text>
        <ArrowLeft class="w-4 h-4 mr-2" />
        返回
      </el-button>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">网络配置</h1>
        <p class="text-gray-600 mt-1">
          管理机器人 "{{ botInfo.name }}" 的网络关联设置
        </p>
      </div>
    </div>
    <div class="flex space-x-3">
      <el-button @click="handleRefresh" :loading="loading">
        <RefreshCw class="w-4 h-4 mr-2" />
        刷新
      </el-button>
      <el-button type="primary" @click="handleAddNetwork">
        <Plus class="w-4 h-4 mr-2" />
        添加网络
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Plus, RefreshCw } from 'lucide-vue-next'

interface BotInfo {
  id: string
  name: string
  username: string
  is_active: boolean
}

interface Props {
  botInfo: BotInfo
  loading: boolean
}

interface Emits {
  (e: 'back'): void
  (e: 'refresh'): void
  (e: 'add-network'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const handleBack = () => {
  emit('back')
}

const handleRefresh = () => {
  emit('refresh')
}

const handleAddNetwork = () => {
  emit('add-network')
}
</script>
