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
            <Shield class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ isEditing ? '编辑角色' : '新增角色' }}
            </h3>
            <p class="text-sm text-gray-500">
              {{ isEditing ? '修改角色信息' : '创建新的角色' }}
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
        <!-- 角色名称 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            角色名称 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            placeholder="请输入角色名称"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 'border-red-500': errors.name }"
            required
          />
          <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
        </div>

        <!-- 角色代码 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            角色代码 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.code"
            type="text"
            placeholder="请输入角色代码（英文字母、数字、下划线）"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 
              'border-red-500': errors.code,
              'bg-gray-100 text-gray-500 cursor-not-allowed': isEditing
            }"
            :disabled="isEditing"
            required
          />
          <p class="text-gray-500 text-xs mt-1">
            {{ isEditing ? '角色代码不可修改' : '用于系统内部标识，创建后不可修改' }}
          </p>
          <p v-if="errors.code" class="text-red-500 text-xs mt-1">{{ errors.code }}</p>
        </div>

        <!-- 角色描述 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            角色描述
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="请输入角色描述"
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
                :value="1"
                class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                :disabled="isEditing && role?.is_system"
              />
              <span class="ml-2 text-sm text-gray-700">正常</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="form.status"
                type="radio"
                :value="0"
                class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                :disabled="isEditing && role?.is_system"
              />
              <span class="ml-2 text-sm text-gray-700">停用</span>
            </label>
          </div>
          <p v-if="errors.status" class="text-red-500 text-xs mt-1">{{ errors.status }}</p>
        </div>

        <!-- 系统角色提示 -->
        <div v-if="isEditing && role?.is_system" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-start gap-2">
            <AlertTriangle class="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p class="text-sm text-yellow-800">
              这是系统内置角色，部分字段不可修改
            </p>
          </div>
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
import { X, Shield, AlertTriangle } from 'lucide-vue-next'
import type { Role } from '../types'
import { RoleStatus } from '../types'
import { useRoles } from '../composables/useRoles'

interface Props {
  visible: boolean
  role?: Role | null
}

interface Emits {
  close: []
  submit: [data: Partial<Role>]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { checkRoleCodeAvailable } = useRoles()

// 响应式数据
const loading = ref(false)
const form = ref({
  name: '',
  code: '',
  description: '',
  sort_order: 0,
  status: 1
})
const errors = ref<Record<string, string>>({})

// 计算属性
const isEditing = computed(() => !!props.role?.id)

// 监听器
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
      if (props.role) {
        form.value = {
          name: props.role.name,
          code: props.role.code,
          description: props.role.description || '',
          sort_order: props.role.sort_order,
          status: props.role.status
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
    sort_order: 0,
    status: RoleStatus.ACTIVE
  }
  errors.value = {}
}

const validateForm = async (): Promise<boolean> => {
  errors.value = {}
  
  // 角色名称验证
  if (!form.value.name.trim()) {
    errors.value.name = '请输入角色名称'
  } else if (form.value.name.length > 50) {
    errors.value.name = '角色名称不能超过50个字符'
  }
  
  // 角色代码验证
  if (!form.value.code.trim()) {
    errors.value.code = '请输入角色代码'
  } else if (!/^[a-zA-Z0-9_]+$/.test(form.value.code)) {
    errors.value.code = '角色代码只能包含英文字母、数字和下划线'
  } else if (form.value.code.length > 50) {
    errors.value.code = '角色代码不能超过50个字符'
  } else {
    // 检查代码是否已存在
    const available = await checkRoleCodeAvailable(
      form.value.code,
      isEditing.value ? props.role?.id : undefined
    )
    if (!available) {
      errors.value.code = '角色代码已存在'
    }
  }
  
  // 描述验证
  if (form.value.description && form.value.description.length > 200) {
    errors.value.description = '角色描述不能超过200个字符'
  }
  
  // 排序验证
  if (form.value.sort_order < 0) {
    errors.value.sort_order = '排序值不能小于0'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!(await validateForm())) {
    return
  }
  
  loading.value = true
  
  try {
    const submitData: Partial<Role> = {
      name: form.value.name.trim(),
      code: form.value.code.trim(),
      description: form.value.description.trim() || undefined,
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