<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      图标
    </label>
    <div class="space-y-3">
      <!-- 图标类型选择 -->
      <div>
        <label class="block text-xs text-gray-500 mb-1">图标类型</label>
        <select
          v-model="iconType"
          class="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          @change="handleIconTypeChange"
        >
          <option value="lucide">Lucide图标</option>
          <option value="custom">自定义</option>
        </select>
      </div>
      
      <!-- 图标选择 -->
      <div>
        <label class="block text-xs text-gray-500 mb-1">
          {{ iconType === 'lucide' ? '选择图标' : '输入图标' }}
        </label>
        
        <!-- Lucide图标选择 -->
        <select
          v-if="iconType === 'lucide'"
          v-model="iconValue"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">选择图标</option>
          
          <!-- 如果当前图标不在预定义列表中，添加当前图标选项 -->
          <optgroup v-if="iconValue && !isIconInPredefinedList(iconValue)" label="当前图标">
            <option :value="iconValue">{{ iconValue }} - 当前图标</option>
          </optgroup>
          
          <optgroup 
            v-for="group in iconOptions" 
            :key="group.label" 
            :label="group.label"
          >
            <option 
              v-for="option in group.options" 
              :key="option.value" 
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </optgroup>
        </select>
        
        <!-- 自定义图标输入 -->
        <input
          v-else
          v-model="iconValue"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="输入自定义图标文字，如：U"
          maxlength="2"
        />
      </div>
      
      <!-- 图标预览 -->
      <div v-if="iconValue" class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        <span class="text-xs text-gray-500">预览:</span>
        <component
          v-if="iconType === 'lucide' && iconValue"
          :is="getLucideIcon(iconValue)"
          class="w-5 h-5 text-gray-700"
        />
        <span
          v-else-if="iconType === 'custom' && iconValue"
          class="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-blue-500 text-white rounded"
        >
          {{ iconValue }}
        </span>
        <span class="text-sm text-gray-600">{{ iconValue }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMenuIcons } from '../composables/useMenuIcons'
import { MenuIconType } from '../types'

// Props
interface Props {
  modelValue?: string
  iconType?: MenuIconType
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  iconType: MenuIconType.LUCIDE
})

// Emits
interface Emits {
  'update:modelValue': [value: string]
  'update:iconType': [type: MenuIconType]
  'iconTypeChange': []
}

const emit = defineEmits<Emits>()

// 使用图标管理
const { 
  isIconInPredefinedList, 
  getLucideIcon,
  getIconOptions
} = useMenuIcons()

// 计算属性
const iconValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

const iconType = computed({
  get: () => props.iconType,
  set: (type: MenuIconType) => emit('update:iconType', type)
})

const iconOptions = computed(() => getIconOptions())

// 方法
const handleIconTypeChange = () => {
  emit('iconTypeChange')
}
</script>

