<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    @click="$emit('close')"
  >
    <div 
      class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white"
      @click.stop
    >
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-medium text-gray-900">
          <span v-if="mode === 'view'">用户详情</span>
          <span v-else-if="mode === 'edit'">编辑用户</span>
          <span v-else>添加用户</span>
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="h-6 w-6" />
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- 基本信息 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              用户名 <span v-if="mode !== 'view'" class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.username"
              type="text"
              :readonly="mode === 'view'"
              :class="[
                'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500',
                mode === 'view' ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
              ]"
              placeholder="请输入用户名"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              邮箱 <span v-if="mode !== 'view'" class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.email"
              type="email"
              :readonly="mode === 'view'"
              :class="[
                'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500',
                mode === 'view' ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
              ]"
              placeholder="请输入邮箱"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              手机号
            </label>
            <input
              v-model="formData.phone"
              type="tel"
              :readonly="mode === 'view'"
              :class="[
                'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500',
                mode === 'view' ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
              ]"
              placeholder="请输入手机号"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              角色 <span v-if="mode !== 'view'" class="text-red-500">*</span>
            </label>
            <select
              v-model="formData.role"
              :disabled="mode === 'view'"
              :class="[
                'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500',
                mode === 'view' ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
              ]"
              required
            >
              <option value="">请选择角色</option>
              <option value="user">普通用户</option>
              <option value="vip">VIP用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              状态
            </label>
            <select
              v-model="formData.status"
              :disabled="mode === 'view'"
              :class="[
                'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500',
                mode === 'view' ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
              ]"
            >
              <option value="active">正常</option>
              <option value="inactive">停用</option>
              <option value="banned">封禁</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              余额 (TRX)
            </label>
            <input
              v-model.number="formData.balance"
              type="number"
              step="0.01"
              min="0"
              :readonly="mode === 'view'"
              :class="[
                'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500',
                mode === 'view' ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
              ]"
              placeholder="0.00"
            />
          </div>
        </div>
        
        <!-- 密码设置（仅创建和编辑模式） -->
        <div v-if="mode !== 'view'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              密码 <span v-if="mode === 'create'" class="text-red-500">*</span>
              <span v-else class="text-gray-500">(留空则不修改)</span>
            </label>
            <input
              v-model="formData.password"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="请输入密码"
              :required="mode === 'create'"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              确认密码 <span v-if="mode === 'create'" class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.confirmPassword"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="请确认密码"
              :required="mode === 'create'"
            />
          </div>
        </div>
        
        <!-- 其他信息（仅查看模式） -->
        <div v-if="mode === 'view'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              注册时间
            </label>
            <input
              :value="formatDateTime(formData.created_at)"
              type="text"
              readonly
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              最后登录
            </label>
            <input
              :value="formData.last_login ? formatDateTime(formData.last_login) : '从未登录'"
              type="text"
              readonly
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              更新时间
            </label>
            <input
              :value="formatDateTime(formData.updated_at)"
              type="text"
              readonly
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              用户ID
            </label>
            <input
              :value="formData.id"
              type="text"
              readonly
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
            />
          </div>
        </div>
        
        <!-- 备注 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            备注
          </label>
          <textarea
            v-model="formData.remark"
            :readonly="mode === 'view'"
            :class="[
              'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500',
              mode === 'view' ? 'bg-gray-50 text-gray-500' : 'border-gray-300'
            ]"
            rows="3"
            placeholder="请输入备注信息"
          ></textarea>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {{ mode === 'view' ? '关闭' : '取消' }}
          </button>
          <button
            v-if="mode !== 'view'"
            type="submit"
            :disabled="isSubmitting"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin mr-2 inline" />
            {{ mode === 'create' ? '创建' : '保存' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2, X } from 'lucide-vue-next'
import type { User, UserFormData } from '../types/user.types'

interface Props {
  isOpen: boolean
  mode: 'view' | 'edit' | 'create'
  user?: User
  isSubmitting: boolean
  formatDateTime: (date: string) => string
}

interface Emits {
  'close': []
  'submit': [formData: UserFormData]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 表单数据
const formData = ref<UserFormData>({
  id: '',
  username: '',
  email: '',
  phone: '',
  role: '',
  status: 'active',
  balance: 0,
  password: '',
  confirmPassword: '',
  remark: '',
  created_at: '',
  updated_at: '',
  last_login: ''
})

// 监听用户数据变化，更新表单
watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      formData.value = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone || '',
        role: newUser.role,
        status: newUser.status,
        balance: newUser.balance,
        password: '',
        confirmPassword: '',
        remark: newUser.remark || '',
        created_at: newUser.created_at,
        updated_at: newUser.updated_at,
        last_login: newUser.last_login || ''
      }
    } else {
      // 重置表单
      formData.value = {
        id: '',
        username: '',
        email: '',
        phone: '',
        role: '',
        status: 'active',
        balance: 0,
        password: '',
        confirmPassword: '',
        remark: '',
        created_at: '',
        updated_at: '',
        last_login: ''
      }
    }
  },
  { immediate: true }
)

// 表单提交
const handleSubmit = () => {
  // 密码确认验证
  if (props.mode !== 'view' && formData.value.password && formData.value.password !== formData.value.confirmPassword) {
    alert('密码和确认密码不一致')
    return
  }
  
  emit('submit', formData.value)
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>