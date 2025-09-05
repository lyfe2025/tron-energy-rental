<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      :disabled="disabled"
      :class="[
        'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500',
        disabled ? 'bg-gray-50 text-gray-500' : 'border-gray-300',
        error ? 'border-red-300' : ''
      ]"
      :required="required"
    >
      <option value="">{{ placeholder }}</option>
      <option 
        v-for="bot in availableBots" 
        :key="bot.id" 
        :value="bot.id"
      >
        {{ bot.name }} (@{{ bot.username }})
      </option>
    </select>
    
    <div v-if="loading" class="mt-1 text-sm text-gray-500">
      <Loader2 class="h-3 w-3 animate-spin inline mr-1" />
      加载机器人列表...
    </div>
    
    <div v-if="error" class="mt-1 text-sm text-red-600">
      {{ errorMessage }}
    </div>
    
    <div v-if="description" class="mt-1 text-sm text-gray-500">
      {{ description }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { apiClient } from '../services/api/core/apiClient'

interface Bot {
  id: string
  name: string
  username: string
  is_active: boolean
}

interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  description?: string
  showOnlyActive?: boolean
}

interface Emits {
  'update:modelValue': [value: string]
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择机器人',
  showOnlyActive: true
})

const emit = defineEmits<Emits>()

// 状态管理
const loading = ref(false)
const error = ref(false)
const errorMessage = ref('')
const availableBots = ref<Bot[]>([])

// 获取机器人列表
const fetchBots = async () => {
  try {
    loading.value = true
    error.value = false
    errorMessage.value = ''
    
    console.log('🔍 [BotSelector] 获取机器人列表...')
    
    const response = await apiClient.get('/api/bots/selector')
    const data = response.data
    console.log('🔍 [BotSelector] API响应:', data)
    
    if (data.success && data.data?.bots) {
      let bots = data.data.bots
      
      // 如果只显示活跃的机器人
      if (props.showOnlyActive) {
        bots = bots.filter((bot: any) => bot.status === 'active' || bot.is_active)
      }
      
      availableBots.value = bots.map((bot: any) => ({
        id: bot.id,
        name: bot.name || bot.bot_name || '未命名机器人',
        username: bot.username || bot.bot_username || 'unknown',
        is_active: bot.status === 'active' || bot.is_active
      }))
      
      console.log('✅ [BotSelector] 机器人列表加载完成:', {
        total: availableBots.value.length,
        bots: availableBots.value.map(b => ({ id: b.id, name: b.name, username: b.username }))
      })
    } else {
      throw new Error(data.message || '获取机器人列表失败')
    }
  } catch (err: any) {
    console.error('❌ [BotSelector] 获取机器人列表失败:', err)
    error.value = true
    errorMessage.value = err.response?.data?.message || err.message || '获取机器人列表失败'
    availableBots.value = []
  } finally {
    loading.value = false
  }
}

// 组件挂载时获取机器人列表
onMounted(() => {
  fetchBots()
})
</script>

<style scoped>
.border-red-300 {
  border-color: #fca5a5;
}
</style>
