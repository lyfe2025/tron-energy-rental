<!--
 * 机器人信息卡片组件
 * 职责：显示机器人的基本信息和统计数据
-->
<template>
  <el-card class="mb-6">
    <div class="flex items-center space-x-4">
      <div class="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
        <Bot class="h-6 w-6 text-blue-600" />
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-gray-900">{{ botInfo.name }}</h3>
        <p class="text-sm text-gray-500">@{{ botInfo.username }}</p>
      </div>
      <div class="text-right">
        <el-tag :type="botInfo.is_active ? 'success' : 'danger'" size="small">
          {{ botInfo.is_active ? '启用' : '禁用' }}
        </el-tag>
        <p class="text-sm text-gray-500 mt-1">
          关联网络: {{ networkCount }} 个
        </p>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Bot } from 'lucide-vue-next'

interface BotInfo {
  id: string
  name: string
  username: string
  is_active: boolean
}

interface Props {
  botInfo: BotInfo
  networkCount: number
}

defineProps<Props>()
</script>
