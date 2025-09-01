<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
      <!-- 对话框头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-100 rounded-lg">
            <Building2 class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ isEditing ? '编辑部门' : '新增部门' }}
            </h3>
            <p class="text-sm text-gray-500">
              {{ isEditing ? '修改部门信息' : '创建新的部门' }}
            </p>
          </div>
        </div>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 表单内容 -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <!-- 部门名称 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            部门名称 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            placeholder="请输入部门名称"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 'border-red-500': errors.name }"
            required
          />
          <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
        </div>

        <!-- 部门编码 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            部门编码 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.code"
            type="text"
            placeholder="请输入部门编码"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 'border-red-500': errors.code }"
            required
          />
          <p class="text-gray-500 text-xs mt-1">部门编码用于系统内部标识，必须唯一</p>
          <p v-if="errors.code" class="text-red-500 text-xs mt-1">{{ errors.code }}</p>
        </div>

        <!-- 上级部门 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            上级部门
          </label>
          <select
            v-model="form.parent_id"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 'border-red-500': errors.parent_id }"
          >
            <option value="">无上级部门（顶级部门）</option>
            <option
              v-for="option in availableParentOptions"
              :key="option.id"
              :value="option.id"
              :disabled="option.disabled"
            >
              {{ option.name }}
            </option>
          </select>
          <p v-if="errors.parent_id" class="text-red-500 text-xs mt-1">{{ errors.parent_id }}</p>
        </div>

        <!-- 部门描述 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            部门描述
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="请输入部门描述"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            :class="{ 'border-red-500': errors.description }"
          ></textarea>
          <p v-if="errors.description" class="text-red-500 text-xs mt-1">{{ errors.description }}</p>
        </div>

        <!-- 排序 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            排序
          </label>
          <input
            v-model.number="form.sort_order"
            type="number"
            min="0"
            placeholder="请输入排序值"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 'border-red-500': errors.sort_order }"
          />
          <p class="text-gray-500 text-xs mt-1">数值越小排序越靠前</p>
          <p v-if="errors.sort_order" class="text-red-500 text-xs mt-1">{{ errors.sort_order }}</p>
        </div>

        <!-- 状态 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            状态
          </label>
          <div class="flex items-center gap-4">
            <label class="flex items-center">
              <input
                v-model="form.status"
                type="radio"
                :value="DepartmentStatus.ACTIVE"
                class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700">正常</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="form.status"
                type="radio"
                :value="DepartmentStatus.INACTIVE"
                class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700">停用</span>
            </label>
          </div>
          <p v-if="errors.status" class="text-red-500 text-xs mt-1">{{ errors.status }}</p>
        </div>
      </form>

      <!-- 对话框底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
        <button
          type="button"
          @click="handleClose"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          {{ loading ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, Building2 } from 'lucide-vue-next'
import type { Department, DepartmentOption } from '../types'
import { DepartmentStatus } from '../types'

interface Props {
  visible: boolean
  department?: Department | null
  parentOptions: DepartmentOption[]
}

interface Emits {
  close: []
  submit: [data: Partial<Department>]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const loading = ref(false)
const form = ref({
  name: '',
  code: '',
  description: '',
  parent_id: undefined as number | undefined,
  sort_order: 0,
  status: DepartmentStatus.ACTIVE
})
const errors = ref<Record<string, string>>({})

// 计算属性
const isEditing = computed(() => !!props.department?.id)

const availableParentOptions = computed(() => {
  if (!isEditing.value) {
    return props.parentOptions
  }
  
  // 编辑时排除自己和自己的子部门
  return props.parentOptions.filter(option => {
    return option.id !== props.department?.id
  })
})

// 监听器
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
      if (props.department) {
        form.value = {
          name: props.department.name,
          code: props.department.code || '',
          description: props.department.description || '',
          parent_id: props.department.parent_id,
          sort_order: props.department.sort_order,
          status: props.department.status
        }
      }
    }
  }
)

// 方法
const resetForm = () => {
  form.value = {
    name: '',
    code: '',
    description: '',
    parent_id: undefined,
    sort_order: 0,
    status: DepartmentStatus.ACTIVE
  }
  errors.value = {}
}

const validateForm = (): boolean => {
  errors.value = {}
  
  if (!form.value.name.trim()) {
    errors.value.name = '请输入部门名称'
  } else if (form.value.name.length > 50) {
    errors.value.name = '部门名称不能超过50个字符'
  }
  
  if (!form.value.code.trim()) {
    errors.value.code = '请输入部门编码'
  } else if (!/^[A-Z0-9_-]+$/i.test(form.value.code)) {
    errors.value.code = '部门编码只能包含字母、数字、下划线和横线'
  } else if (form.value.code.length > 20) {
    errors.value.code = '部门编码不能超过20个字符'
  }
  
  if (form.value.description && form.value.description.length > 200) {
    errors.value.description = '部门描述不能超过200个字符'
  }
  
  if (form.value.sort_order < 0) {
    errors.value.sort_order = '排序值不能小于0'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }
  
  loading.value = true
  
  try {
    const submitData: Partial<Department> = {
      name: form.value.name.trim(),
      code: form.value.code.trim(),
      description: form.value.description.trim() || undefined,
      parent_id: form.value.parent_id || undefined,
      sort_order: form.value.sort_order,
      status: form.value.status
    }
    
    emit('submit', submitData)
  } catch (error) {
    console.error('提交表单失败:', error)
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  if (!loading.value) {
    emit('close')
  }
}
</script>