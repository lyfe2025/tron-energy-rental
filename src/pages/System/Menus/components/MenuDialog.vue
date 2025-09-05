<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="handleClose"></div>
      
      <!-- 对话框 -->
      <div class="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <!-- 标题 -->
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">
            {{ menu ? '编辑菜单' : '新增菜单' }}
          </h3>
          <button
            @click="handleClose"
            class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <!-- 表单 -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 基本信息表单 -->
          <MenuBasicForm
            :form="form"
            :parent-menu="parentMenu"
            :menu-options="menuOptions"
            @icon-type-change="handleIconTypeChange"
          />
          
          <!-- 高级选项 -->
          <MenuAdvancedOptions :form="form" />
          
          <!-- 按钮 -->
          <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              @click="handleClose"
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {{ loading ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { useMenuForm } from '../composables/useMenuForm'
import type {
    CreateMenuRequest,
    MenuOption,
    MenuTreeNode,
    UpdateMenuRequest
} from '../types'
import MenuAdvancedOptions from './MenuAdvancedOptions.vue'
import MenuBasicForm from './MenuBasicForm.vue'

// Props
interface Props {
  visible: boolean
  menu?: MenuTreeNode | null
  parentMenu?: MenuTreeNode | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  menu: null,
  parentMenu: null,
  loading: false
})

// Emits
interface Emits {
  close: []
  submit: [data: CreateMenuRequest | UpdateMenuRequest]
}

const emit = defineEmits<Emits>()

// 使用组合式函数
const {
  form,
  loadForm,
  loadMenuOptions,
  buildSubmitData,
  handleIconTypeChange
} = useMenuForm()

// 状态
const menuOptions = ref<MenuOption[]>([])

// 方法
const handleClose = () => {
  emit('close')
}

const handleSubmit = () => {
  const data = buildSubmitData()
  emit('submit', data)
}

const loadOptions = async () => {
  try {
    const options = await loadMenuOptions(props.menu?.id)
    menuOptions.value = options
  } catch (err) {
    console.error('加载菜单选项失败:', err)
  }
}

// 监听
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadForm(props.menu, props.parentMenu)
      loadOptions()
    }
  },
  { immediate: true }
)

// 生命周期
onMounted(() => {
  if (props.visible) {
    loadForm(props.menu, props.parentMenu)
    loadOptions()
  }
})
</script>