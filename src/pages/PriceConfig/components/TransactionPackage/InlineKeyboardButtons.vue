<template>
  <!-- 高级按钮配置 -->
  <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-lg">⚙️</span>
        <h4 class="text-lg font-semibold text-gray-900">按钮配置</h4>
        <span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{{ buttons.length }} 个按钮</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="bulkEdit = !bulkEdit"
          :class="[
            'px-3 py-2 text-sm rounded-lg transition-all duration-200',
            bulkEdit ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          ]"
        >
          📝 {{ bulkEdit ? '退出批量' : '批量编辑' }}
        </button>
        <button
          @click="addButton"
          class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-sm"
        >
          ➕ 添加按钮
        </button>
      </div>
    </div>

    <!-- 批量操作面板 -->
    <div v-if="bulkEdit" class="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-orange-600">📝</span>
        <span class="font-medium text-orange-800">批量操作</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button
          @click="selectAllButtons"
          class="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
        >
          全选
        </button>
        <button
          @click="clearSelection"
          class="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
        >
          取消选择
        </button>
        <button
          @click="deleteSelectedButtons"
          :disabled="selectedButtons.length === 0"
          class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          删除选中 ({{ selectedButtons.length }})
        </button>
        <button
          @click="duplicateSelectedButtons"
          :disabled="selectedButtons.length === 0"
          class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          复制选中
        </button>
      </div>
    </div>
    
    <!-- 按钮列表 -->
    <div class="space-y-3">
      <div
        v-for="(button, index) in buttons"
        :key="button.id || index"
        :class="[
          'p-4 border-2 rounded-xl bg-white transition-all duration-200 cursor-pointer',
          bulkEdit && selectedButtons.includes(index) 
            ? 'border-orange-300 bg-orange-50' 
            : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
        ]"
        @click="bulkEdit && toggleButtonSelection(index)"
      >
        <div class="flex items-start gap-3">
          <!-- 批量选择复选框 -->
          <div v-if="bulkEdit" class="flex items-center pt-1">
            <input
              type="checkbox"
              :checked="selectedButtons.includes(index)"
              @change="toggleButtonSelection(index)"
              class="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
          </div>
          
          <!-- 拖拽手柄 -->
          <div v-if="!bulkEdit" class="flex items-center pt-1 cursor-grab text-gray-400 hover:text-gray-600">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
            </svg>
          </div>
          
          <!-- 按钮配置表单 -->
          <div class="flex-1">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">按钮文本</label>
                <input
                  :value="button.text"
                  @input="updateButton(index, 'text', ($event.target as HTMLInputElement).value)"
                  type="text"
                  placeholder="5笔 - 450 TRX"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">笔数</label>
                <input
                  :value="button.transaction_count"
                  @input="updateButtonWithAutoText(index, 'transaction_count', parseInt(($event.target as HTMLInputElement).value))"
                  type="number"
                  min="1"
                  placeholder="5"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">价格 (TRX)</label>
                <input
                  :value="button.price"
                  @input="updateButtonWithAutoText(index, 'price', parseFloat(($event.target as HTMLInputElement).value))"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="450"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div class="flex items-end gap-2">
                <button
                  @click="moveButtonUp(index)"
                  :disabled="index === 0"
                  class="px-3 py-2 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⬆️
                </button>
                <button
                  @click="moveButtonDown(index)"
                  :disabled="index === buttons.length - 1"
                  class="px-3 py-2 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⬇️
                </button>
                <button
                  @click="duplicateButton(index)"
                  class="px-3 py-2 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600"
                >
                  📋
                </button>
                <button
                  @click="removeButton(index)"
                  class="px-3 py-2 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">按钮描述</label>
              <input
                :value="button.description"
                @input="updateButton(index, 'description', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="5笔套餐，节省50 TRX"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="buttons.length === 0" class="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
        <div class="text-4xl mb-2">🎯</div>
        <div class="text-gray-600 font-medium mb-2">还没有配置按钮</div>
        <div class="text-sm text-gray-500 mb-4">点击上方"添加按钮"或选择快速模板开始配置</div>
        <button
          @click="addButton"
          class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          添加第一个按钮
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Button {
  id: string
  text: string
  callback_data: string
  transaction_count: number
  price: number
  description: string
}

interface InlineKeyboardButtonsProps {
  buttons: Button[]
}

const props = defineProps<InlineKeyboardButtonsProps>()
const emit = defineEmits<{
  'update:buttons': [buttons: Button[]]
}>()

const bulkEdit = ref(false)
const selectedButtons = ref<number[]>([])

// 生成唯一ID
function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

const addButton = () => {
  const newButton = {
    id: generateId(),
    text: '新按钮',
    callback_data: `transaction_package_${props.buttons.length + 1}`,
    transaction_count: 10,
    price: 200,
    description: '请设置描述'
  }
  const newButtons = [...props.buttons, newButton]
  emit('update:buttons', newButtons)
}

const removeButton = (index: number) => {
  // 如果在批量编辑模式下，从选中列表中移除
  if (bulkEdit.value) {
    const selectedIndex = selectedButtons.value.indexOf(index)
    if (selectedIndex > -1) {
      selectedButtons.value.splice(selectedIndex, 1)
    }
  }
  
  const newButtons = [...props.buttons]
  newButtons.splice(index, 1)
  emit('update:buttons', newButtons)
}

const updateButton = (index: number, field: string, value: any) => {
  const newButtons = [...props.buttons]
  newButtons[index] = { ...newButtons[index], [field]: value }
  emit('update:buttons', newButtons)
}

const updateButtonWithAutoText = (index: number, field: string, value: any) => {
  const newButtons = [...props.buttons]
  const button = { ...newButtons[index], [field]: value }
  
  // 智能生成按钮文本
  if (button.transaction_count && button.price) {
    button.text = `${button.transaction_count}笔 - ${button.price} TRX`
    button.callback_data = `transaction_package_${button.transaction_count}`
  }
  
  newButtons[index] = button
  emit('update:buttons', newButtons)
}

const duplicateButton = (index: number) => {
  const original = props.buttons[index]
  const duplicate = {
    ...original,
    id: generateId(),
    text: original.text + ' (副本)',
    callback_data: original.callback_data + '_copy'
  }
  const newButtons = [...props.buttons]
  newButtons.splice(index + 1, 0, duplicate)
  emit('update:buttons', newButtons)
}

const moveButtonUp = (index: number) => {
  if (index > 0) {
    const newButtons = [...props.buttons]
    const temp = newButtons[index]
    newButtons[index] = newButtons[index - 1]
    newButtons[index - 1] = temp
    emit('update:buttons', newButtons)
  }
}

const moveButtonDown = (index: number) => {
  if (index < props.buttons.length - 1) {
    const newButtons = [...props.buttons]
    const temp = newButtons[index]
    newButtons[index] = newButtons[index + 1]
    newButtons[index + 1] = temp
    emit('update:buttons', newButtons)
  }
}

// 批量操作相关方法
const toggleButtonSelection = (index: number) => {
  const selectedIndex = selectedButtons.value.indexOf(index)
  if (selectedIndex > -1) {
    selectedButtons.value.splice(selectedIndex, 1)
  } else {
    selectedButtons.value.push(index)
  }
}

const selectAllButtons = () => {
  selectedButtons.value = Array.from({ length: props.buttons.length }, (_, i) => i)
}

const clearSelection = () => {
  selectedButtons.value = []
}

const deleteSelectedButtons = () => {
  // 按索引降序排列，这样删除时不会影响其他索引
  const sortedIndices = [...selectedButtons.value].sort((a, b) => b - a)
  const newButtons = [...props.buttons]
  
  sortedIndices.forEach(index => {
    newButtons.splice(index, 1)
  })
  
  selectedButtons.value = []
  emit('update:buttons', newButtons)
}

const duplicateSelectedButtons = () => {
  const newButtons = selectedButtons.value.map(index => {
    const original = props.buttons[index]
    return {
      ...original,
      id: generateId(),
      text: original.text + ' (副本)',
      callback_data: original.callback_data + '_copy'
    }
  })
  
  const allButtons = [...props.buttons, ...newButtons]
  selectedButtons.value = []
  emit('update:buttons', allButtons)
}
</script>
