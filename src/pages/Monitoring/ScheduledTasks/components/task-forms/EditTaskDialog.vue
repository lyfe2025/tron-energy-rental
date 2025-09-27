<template>
  <div v-if="visible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">编辑定时任务</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <X class="h-5 w-5" />
          </button>
        </div>
        
        <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">任务名称</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="请输入任务名称"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="请输入任务描述"
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cron表达式</label>
            <input
              v-model="form.cronExpression"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="0 2 * * * (每日凌晨2点)"
            />
            <p class="text-xs text-gray-500 mt-1">格式：分 时 日 月 周，例如：0 2 * * * 表示每日凌晨2点</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">执行命令</label>
            <input
              v-model="form.command"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="npm run backup:database"
            />
          </div>
          
          <!-- 高级选项 -->
          <div class="border-t pt-4">
            <h4 class="text-sm font-medium text-gray-700 mb-3">高级选项</h4>
            
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-700">启用任务</label>
                <p class="text-xs text-gray-500">是否启用此任务</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="form.isActive"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          
          <!-- 按钮组 -->
          <div class="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <span v-if="loading">保存中...</span>
              <span v-else>保存更改</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import type { ScheduledTask } from '@/api/monitoring'

interface EditTaskForm {
  name: string
  description: string
  cronExpression: string
  command: string
  isActive: boolean
}

interface Props {
  visible: boolean
  loading?: boolean
  task?: ScheduledTask | null
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', form: EditTaskForm): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 表单数据
const form = ref<EditTaskForm>({
  name: '',
  description: '',
  cronExpression: '',
  command: '',
  isActive: true
})

// 重置表单
const resetForm = () => {
  if (props.task) {
    form.value = {
      name: props.task.name || '',
      description: props.task.description || '',
      cronExpression: props.task.cron_expression || props.task.cronExpression || '',
      command: props.task.command || '',
      isActive: props.task.is_active ?? true
    }
  } else {
    form.value = {
      name: '',
      description: '',
      cronExpression: '',
      command: '',
      isActive: true
    }
  }
}

// 处理提交
const handleSubmit = () => {
  emit('submit', { ...form.value })
}

// 监听对话框打开，填充表单数据
watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm()
  }
})

// 监听任务数据变化
watch(() => props.task, () => {
  if (props.visible) {
    resetForm()
  }
})
</script>

<style scoped>
/* 表单对话框特定样式 */
</style>
