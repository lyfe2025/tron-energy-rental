<template>
  <div class="bg-white border border-gray-200 rounded-xl p-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
          <span class="text-green-600 text-lg">✅</span>
        </div>
        <div>
          <p class="font-medium text-gray-900">配置状态</p>
          <p class="text-sm text-gray-600" v-if="!saving">
            {{ enabled ? '通知功能已启用' : '通知功能已禁用' }}
          </p>
          <p class="text-sm text-blue-600" v-else>正在保存配置...</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <el-button @click="$emit('reset')" :disabled="saving">
          重置配置
        </el-button>
        <el-button 
          type="primary" 
          @click="$emit('save')" 
          :loading="saving"
          class="px-6"
        >
          {{ saving ? '保存中...' : '保存配置' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  enabled: boolean
  saving: boolean
}

interface Emits {
  (e: 'save'): void
  (e: 'reset'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
