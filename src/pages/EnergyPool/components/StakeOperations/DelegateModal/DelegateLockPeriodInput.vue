<!--
  代理期限输入组件
-->
<template>
  <div>
    <!-- 代理期限开关 -->
    <div class="flex items-center justify-between mb-4">
      <label class="block text-sm font-medium text-gray-700">设置代理期限</label>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-500">{{ enableLockPeriod ? '已启用' : '已关闭' }}</span>
        <button
          type="button"
          @click="$emit('update:enableLockPeriod', !enableLockPeriod)"
          :class="[
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
            enableLockPeriod ? 'bg-green-600' : 'bg-gray-200'
          ]"
          role="switch"
          :aria-checked="enableLockPeriod"
        >
          <span
            :class="[
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
              enableLockPeriod ? 'translate-x-5' : 'translate-x-0'
            ]"
          />
        </button>
      </div>
    </div>

    <!-- 期限说明 -->
    <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="flex items-start space-x-2">
        <svg class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-sm">
          <p class="text-blue-700 font-medium mb-1">代理期限选项说明</p>
          <p class="text-blue-600" v-if="!enableLockPeriod">
            关闭：不设置代理期限，资源将永久代理给接收方，直到手动撤销
          </p>
          <p class="text-blue-600" v-else>
            开启：设置代理期限，到期后资源将自动归还，无需手动操作
          </p>
        </div>
      </div>
    </div>

    <!-- 代理期限输入（仅在启用时显示） -->
    <div v-if="enableLockPeriod && lockPeriod !== undefined">
      <label class="block text-sm font-medium text-gray-700 mb-2">代理期限</label>
      <div class="relative">
        <input
          :value="lockPeriod"
          @input="handleLockPeriodInput"
          type="number"
          :min="lockPeriodRange.min"
          :max="lockPeriodRange.max"
          step="0.01"
          required
          class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="请输入代理期限"
        />
        <div class="absolute inset-y-0 right-0 flex items-center pr-4">
          <span class="text-gray-500 font-medium text-sm">天</span>
        </div>
      </div>
      <div class="mt-2 space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-500">
            允许范围: {{ lockPeriodRange.min }}-{{ lockPeriodRange.max }}天
          </span>
          <span class="text-green-600">
            推荐: {{ lockPeriodRange.recommended }}天
          </span>
        </div>
        <p class="text-xs text-blue-600">{{ lockPeriodRange.description }}</p>
        <p class="text-xs text-gray-500">💡 提示: 0.01天 ≈ 14.4分钟，支持小数输入（如：0.5天 = 12小时）</p>
        <p class="text-xs text-orange-600">代理期间资源将被锁定，无法取回</p>
        
        <!-- 验证错误提示 -->
        <div v-if="validationError" class="text-xs text-red-600 mt-1">
          {{ validationError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LockPeriodRange {
  min: number
  max: number
  recommended: string
  description: string
}

interface Props {
  enableLockPeriod: boolean
  lockPeriod: number | undefined
  lockPeriodRange: LockPeriodRange
  validationError: string
}

interface Emits {
  'update:enableLockPeriod': [value: boolean]
  'update:lockPeriod': [value: number]
  'validate': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleLockPeriodInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  
  if (!isNaN(value)) {
    emit('update:lockPeriod', value)
  }
  
  emit('validate')
}
</script>