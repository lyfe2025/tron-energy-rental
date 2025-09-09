<template>
  <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <!-- 头部 -->
    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
            </svg>
          </div>
          <div>
            <h4 class="font-semibold text-gray-900">按钮管理</h4>
            <p class="text-xs text-gray-600">{{ buttons.length }} 个按钮</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="showBulkActions = !showBulkActions"
            :class="[
              'px-3 py-1.5 text-xs rounded-lg transition-all duration-200 font-medium',
              showBulkActions 
                ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            ]"
          >
            {{ showBulkActions ? '🔙 退出批量' : '📝 批量操作' }}
          </button>
          <button
            @click="addButton"
            class="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-sm"
          >
            ➕ 添加按钮
          </button>
        </div>
      </div>
    </div>

    <!-- 批量操作面板 -->
    <div v-if="showBulkActions" class="bg-amber-50 border-b border-amber-200 p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          <span class="font-medium text-amber-800">批量操作</span>
        </div>
        <span class="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
          已选择 {{ selectedButtons.length }} 个按钮
        </span>
      </div>
      
      <div class="flex items-center gap-2 flex-wrap">
        <button
          @click="selectAllButtons"
          class="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-colors font-medium"
        >
          全选
        </button>
        <button
          @click="clearSelection"
          class="px-3 py-1.5 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          取消选择
        </button>
        <button
          @click="deleteSelectedButtons"
          :disabled="selectedButtons.length === 0"
          class="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          删除选中 ({{ selectedButtons.length }})
        </button>
        <button
          @click="duplicateSelectedButtons"
          :disabled="selectedButtons.length === 0"
          class="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          复制选中
        </button>
      </div>
    </div>

    <!-- 按钮列表 -->
    <div class="p-4 space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
      <!-- 空状态 -->
      <div v-if="buttons.length === 0" class="text-center py-12">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">还没有按钮</h3>
        <p class="text-gray-600 mb-4">添加按钮让用户可以快速选择套餐</p>
        <button
          @click="addButton"
          class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          添加第一个按钮
        </button>
      </div>

      <!-- 按钮配置项 -->
      <div
        v-for="(button, index) in buttons"
        :key="button.id || index"
        :class="[
          'group relative bg-white border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer',
          showBulkActions && selectedButtons.includes(index)
            ? 'border-amber-300 bg-amber-50 shadow-md'
            : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
        ]"
        @click="showBulkActions && toggleButtonSelection(index)"
      >
        <!-- 批量选择指示器 -->
        <div v-if="showBulkActions" class="absolute top-2 left-2">
          <div :class="[
            'w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center',
            selectedButtons.includes(index) 
              ? 'bg-amber-500 border-amber-500' 
              : 'border-gray-300 bg-white'
          ]">
            <svg v-if="selectedButtons.includes(index)" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        </div>

        <!-- 拖拽手柄 -->
        <div v-if="!showBulkActions" class="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg class="w-4 h-4 text-gray-400 cursor-grab" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
          </svg>
        </div>

        <!-- 按钮内容 -->
        <div :class="{ 'ml-8': showBulkActions }">
          <!-- 按钮预览 -->
          <div class="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-medium text-blue-700">预览效果</span>
              <div class="h-1 w-1 bg-blue-400 rounded-full"></div>
              <span class="text-xs text-blue-600">用户将看到</span>
            </div>
            <div class="bg-blue-100 border border-blue-300 rounded-lg px-4 py-2 text-center">
              <span class="text-sm font-medium text-blue-800">{{ button.text || '按钮文本' }}</span>
            </div>
          </div>

          <!-- 配置表单 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                按钮文本 *
                <span class="text-gray-500">(用户看到的文字)</span>
              </label>
              <input
                :value="button.text"
                @input="updateButton(index, 'text', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="5笔 - 450 TRX"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                :class="{ 'border-red-300 focus:ring-red-500': !button.text }"
              />
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                交易笔数 *
                <span class="text-gray-500">(数字)</span>
              </label>
              <input
                :value="button.transaction_count"
                @input="updateButtonWithAutoText(index, 'transaction_count', parseInt(($event.target as HTMLInputElement).value))"
                type="number"
                min="1"
                placeholder="5"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                :class="{ 'border-red-300 focus:ring-red-500': !button.transaction_count }"
              />
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                价格 (TRX) *
                <span class="text-gray-500">(支持小数)</span>
              </label>
              <input
                :value="button.price"
                @input="updateButtonWithAutoText(index, 'price', parseFloat(($event.target as HTMLInputElement).value))"
                type="number"
                step="0.1"
                min="0"
                placeholder="450"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                :class="{ 'border-red-300 focus:ring-red-500': !button.price }"
              />
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                按钮描述
                <span class="text-gray-500">(内部备注)</span>
              </label>
              <input
                :value="button.description"
                @input="updateButton(index, 'description', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="5笔套餐，节省50 TRX"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
              />
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center justify-between pt-3 border-t border-gray-100">
            <div class="flex items-center gap-2">
              <!-- 排序按钮 -->
              <div class="flex items-center bg-gray-50 rounded-lg">
                <button
                  @click="moveButtonUp(index)"
                  :disabled="index === 0"
                  class="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="上移"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                  </svg>
                </button>
                <button
                  @click="moveButtonDown(index)"
                  :disabled="index === buttons.length - 1"
                  class="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="下移"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V4"/>
                  </svg>
                </button>
              </div>

              <!-- 复制按钮 -->
              <button
                @click="duplicateButton(index)"
                class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                title="复制按钮"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </button>
            </div>

            <!-- 验证状态 -->
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1">
                <div :class="[
                  'w-2 h-2 rounded-full',
                  isButtonValid(button) ? 'bg-green-500' : 'bg-red-500'
                ]"></div>
                <span class="text-xs text-gray-600">
                  {{ isButtonValid(button) ? '配置完整' : '配置不完整' }}
                </span>
              </div>
              
              <!-- 删除按钮 -->
              <button
                @click="removeButton(index)"
                class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                title="删除按钮"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div v-if="buttons.length > 0" class="bg-gray-50 px-4 py-3 border-t border-gray-200">
      <div class="flex items-center justify-between text-xs text-gray-600">
        <div class="flex items-center gap-4">
          <span>总计 {{ buttons.length }} 个按钮</span>
          <span>{{ validButtonsCount }} 个已配置完整</span>
        </div>
        <div class="flex items-center gap-2">
          <span>拖拽调整顺序</span>
          <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Button {
  id: string
  text: string
  callback_data: string
  transaction_count: number
  price: number
  description: string
}

interface EnhancedInlineKeyboardButtonsProps {
  buttons: Button[]
}

const props = defineProps<EnhancedInlineKeyboardButtonsProps>()
const emit = defineEmits<{
  'update:buttons': [buttons: Button[]]
}>()

const showBulkActions = ref(false)
const selectedButtons = ref<number[]>([])

// 生成唯一ID
function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

// 验证按钮配置是否完整
const isButtonValid = (button: Button) => {
  return !!(button.text && button.transaction_count && button.price)
}

// 计算有效按钮数量
const validButtonsCount = computed(() => {
  return props.buttons.filter(button => isButtonValid(button)).length
})

const addButton = () => {
  const newButton = {
    id: generateId(),
    text: '',
    callback_data: `transaction_package_${props.buttons.length + 1}`,
    transaction_count: 0,
    price: 0,
    description: ''
  }
  const newButtons = [...props.buttons, newButton]
  emit('update:buttons', newButtons)
}

const removeButton = (index: number) => {
  if (confirm('确定要删除这个按钮吗？')) {
    // 如果在批量编辑模式下，从选中列表中移除
    if (showBulkActions.value) {
      const selectedIndex = selectedButtons.value.indexOf(index)
      if (selectedIndex > -1) {
        selectedButtons.value.splice(selectedIndex, 1)
      }
    }
    
    const newButtons = [...props.buttons]
    newButtons.splice(index, 1)
    emit('update:buttons', newButtons)
  }
}

const updateButton = (index: number, field: string, value: any) => {
  const newButtons = [...props.buttons]
  newButtons[index] = { ...newButtons[index], [field]: value }
  emit('update:buttons', newButtons)
}

const updateButtonWithAutoText = (index: number, field: string, value: any) => {
  const newButtons = [...props.buttons]
  const button = { ...newButtons[index], [field]: value }
  
  // 智能生成按钮文本和回调数据
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
  if (selectedButtons.value.length === 0) return
  
  if (confirm(`确定要删除选中的 ${selectedButtons.value.length} 个按钮吗？`)) {
    // 按索引降序排列，这样删除时不会影响其他索引
    const sortedIndices = [...selectedButtons.value].sort((a, b) => b - a)
    const newButtons = [...props.buttons]
    
    sortedIndices.forEach(index => {
      newButtons.splice(index, 1)
    })
    
    selectedButtons.value = []
    showBulkActions.value = false
    emit('update:buttons', newButtons)
  }
}

const duplicateSelectedButtons = () => {
  if (selectedButtons.value.length === 0) return
  
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
  showBulkActions.value = false
  emit('update:buttons', allButtons)
}
</script>

<style scoped>
/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 动画效果 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* 渐变边框效果 */
.gradient-border {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1px;
  border-radius: 12px;
}

.gradient-border > div {
  background: white;
  border-radius: 11px;
}

/* 按钮悬停效果 */
.button-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

/* 验证状态指示器 */
.validation-indicator {
  position: relative;
}

.validation-indicator::after {
  content: '';
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
</style>
