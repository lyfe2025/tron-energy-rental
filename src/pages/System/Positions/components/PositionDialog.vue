<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="handleClose"></div>

      <!-- 对话框 -->
      <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <!-- 标题 -->
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">
            {{ isEdit ? '编辑岗位' : '新增岗位' }}
          </h3>
          <button
            @click="handleClose"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 表单 -->
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <!-- 岗位名称 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                岗位名称 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                required
                placeholder="请输入岗位名称"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-500': errors.name }"
              />
              <p v-if="errors.name" class="mt-1 text-sm text-red-600">{{ errors.name }}</p>
            </div>

            <!-- 所属部门 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                所属部门 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="formData.department_id"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-500': errors.department_id }"
              >
                <option value="">请选择部门</option>
                <option
                  v-for="dept in departmentOptions"
                  :key="dept.id"
                  :value="dept.id"
                >
                  {{ dept.name }}
                </option>
              </select>
              <p v-if="errors.department_id" class="mt-1 text-sm text-red-600">{{ errors.department_id }}</p>
            </div>

            <!-- 岗位编码 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                岗位编码 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.code"
                type="text"
                required
                placeholder="请输入岗位编码"
                :disabled="isEdit"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 
                  'border-red-500': errors.code,
                  'bg-gray-100 text-gray-500 cursor-not-allowed': isEdit
                }"
              />
              <p v-if="errors.code" class="mt-1 text-sm text-red-600">{{ errors.code }}</p>
              <p class="mt-1 text-xs text-gray-500">
                {{ isEdit ? '岗位编码不可修改' : '岗位编码用于系统内部标识，建议使用英文大写字母和下划线' }}
              </p>
            </div>

            <!-- 岗位描述 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                岗位描述
              </label>
              <textarea
                v-model="formData.description"
                rows="3"
                placeholder="请输入岗位描述"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                :class="{ 'border-red-500': errors.description }"
              ></textarea>
              <p v-if="errors.description" class="mt-1 text-sm text-red-600">{{ errors.description }}</p>
            </div>

            <!-- 排序 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                排序
              </label>
              <input
                v-model.number="formData.sort_order"
                type="number"
                min="0"
                placeholder="请输入排序值"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-500': errors.sort_order }"
              />
              <p v-if="errors.sort_order" class="mt-1 text-sm text-red-600">{{ errors.sort_order }}</p>
              <p class="mt-1 text-xs text-gray-500">数值越小排序越靠前</p>
            </div>

            <!-- 状态 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <div class="flex gap-4">
                <label class="flex items-center">
                  <input
                    v-model="formData.status"
                    type="radio"
                    :value="1"
                    class="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">启用</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="formData.status"
                    type="radio"
                    :value="0"
                    class="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">禁用</span>
                </label>
              </div>
              <p v-if="errors.status" class="mt-1 text-sm text-red-600">{{ errors.status }}</p>
            </div>
          </div>

          <!-- 按钮 -->
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              @click="handleClose"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              :disabled="loading"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="loading || !isFormValid"
            >
              <div v-if="loading" class="flex items-center gap-2">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{{ isEdit ? '更新中...' : '创建中...' }}</span>
              </div>
              <span v-else>{{ isEdit ? '更新' : '创建' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import type { Position, CreatePositionRequest, UpdatePositionRequest, PositionStatus } from '../types'
import type { DepartmentOption } from '../../Departments/types'

interface Props {
  visible: boolean
  position?: Position | null
  loading?: boolean
  departmentOptions: DepartmentOption[]
}

interface Emits {
  close: []
  submit: [data: CreatePositionRequest | UpdatePositionRequest]
}

const props = withDefaults(defineProps<Props>(), {
  position: null,
  loading: false
})

const emit = defineEmits<Emits>()

// 表单数据
const formData = ref({
  name: '',
  code: '',
  description: '',
  department_id: 0,
  sort_order: 0,
  status: 1
})

// 表单错误
const errors = ref<Record<string, string>>({})

// 重置表单函数（需要在watch之前定义）
const resetForm = () => {
  formData.value = {
    name: '',
    code: '',
    description: '',
    department_id: 0,
    sort_order: 0,
    status: 1
  }
  errors.value = {}
}

// 计算属性
const isEdit = computed(() => !!props.position)

const isFormValid = computed(() => {
  return formData.value.name.trim() && formData.value.code.trim() && formData.value.department_id
})

// 监听 position 变化，初始化表单数据
watch(
  () => props.position,
  (newPosition) => {
    if (newPosition) {
      formData.value = {
        name: newPosition.name,
        code: newPosition.code || '',
        description: newPosition.description || '',
        department_id: newPosition.department_id,
        sort_order: newPosition.sort_order,
        status: newPosition.status
      }
    } else {
      resetForm()
    }
    errors.value = {}
  },
  { immediate: true }
)

// 监听 visible 变化
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      nextTick(() => {
        // 聚焦到第一个输入框
        const firstInput = document.querySelector('input[type="text"]') as HTMLInputElement
        if (firstInput) {
          firstInput.focus()
        }
      })
    }
  }
)



// 验证表单
const validateForm = (): boolean => {
  errors.value = {}
  
  if (!formData.value.name.trim()) {
    errors.value.name = '请输入岗位名称'
  } else if (formData.value.name.length > 50) {
    errors.value.name = '岗位名称不能超过50个字符'
  }
  
  if (!formData.value.code.trim()) {
    errors.value.code = '请输入岗位编码'
  } else if (formData.value.code.length > 20) {
    errors.value.code = '岗位编码不能超过20个字符'
  } else if (!/^[A-Z_]+$/.test(formData.value.code)) {
    errors.value.code = '岗位编码只能包含大写字母和下划线'
  }
  
  if (!formData.value.department_id) {
    errors.value.department_id = '请选择所属部门'
  }
  
  if (formData.value.description && formData.value.description.length > 200) {
    errors.value.description = '岗位描述不能超过200个字符'
  }
  
  if (formData.value.sort_order < 0) {
    errors.value.sort_order = '排序值不能小于0'
  }
  
  return Object.keys(errors.value).length === 0
}

// 处理提交
const handleSubmit = () => {
  if (!validateForm()) {
    return
  }
  
  const submitData = {
    name: formData.value.name.trim(),
    code: formData.value.code.trim(),
    description: formData.value.description.trim() || undefined,
    department_id: formData.value.department_id,
    sort_order: formData.value.sort_order,
    status: formData.value.status as PositionStatus
  }
  
  emit('submit', submitData)
}

// 处理关闭
const handleClose = () => {
  if (!props.loading) {
    emit('close')
  }
}
</script>