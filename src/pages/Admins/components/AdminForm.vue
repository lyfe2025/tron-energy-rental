<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    @click="handleBackdropClick"
  >
    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">
          {{ isEdit ? '编辑管理员' : '新建管理员' }}
        </h3>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="h-6 w-6" />
        </button>
      </div>

      <!-- 表单内容 -->
      <form @submit.prevent="handleSubmit" class="mt-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 用户名 -->
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
              用户名 <span class="text-red-500">*</span>
            </label>
            <input
              id="username"
              v-model="formData.username"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入用户名"
            />
            <p v-if="errors.username" class="mt-1 text-sm text-red-600">{{ errors.username }}</p>
          </div>

          <!-- 邮箱 -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              邮箱 <span class="text-red-500">*</span>
            </label>
            <input
              id="email"
              v-model="formData.email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入邮箱地址"
            />
            <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
          </div>

          <!-- 密码 -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              密码 <span v-if="!isEdit" class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                :required="!isEdit"
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                :placeholder="isEdit ? '留空则不修改密码' : '请输入密码'"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <Eye v-if="!showPassword" class="h-4 w-4 text-gray-400" />
                <EyeOff v-else class="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
            <p v-if="!isEdit" class="mt-1 text-xs text-gray-500">密码长度至少6位</p>
          </div>

          <!-- 确认密码 -->
          <div v-if="formData.password">
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
              确认密码 <span class="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              v-model="formData.confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请再次输入密码"
            />
            <p v-if="errors.confirmPassword" class="mt-1 text-sm text-red-600">{{ errors.confirmPassword }}</p>
          </div>

          <!-- 角色 -->
          <div>
            <label for="role" class="block text-sm font-medium text-gray-700 mb-1">
              角色 <span class="text-red-500">*</span>
            </label>
            <select
              id="role"
              v-model="formData.role"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择角色</option>
              <option
                v-for="option in ADMIN_ROLE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <p v-if="errors.role" class="mt-1 text-sm text-red-600">{{ errors.role }}</p>
          </div>

          <!-- 状态 -->
          <div>
            <label for="status" class="block text-sm font-medium text-gray-700 mb-1">
              状态 <span class="text-red-500">*</span>
            </label>
            <select
              id="status"
              v-model="formData.status"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">活跃</option>
              <option value="inactive">停用</option>
            </select>
            <p v-if="errors.status" class="mt-1 text-sm text-red-600">{{ errors.status }}</p>
          </div>
        </div>

        <!-- 备注 -->
        <div class="mt-6">
          <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
            备注
          </label>
          <textarea
            id="notes"
            v-model="formData.notes"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="请输入备注信息（可选）"
          ></textarea>
        </div>

        <!-- 按钮组 -->
        <div class="mt-8 flex items-center justify-end space-x-3">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            取消
          </button>
          <button
            type="button"
            @click="handleReset"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            重置
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <span v-if="loading" class="inline-flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isEdit ? '更新中...' : '创建中...' }}
            </span>
            <span v-else>
              {{ isEdit ? '更新' : '创建' }}
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, Eye, EyeOff } from 'lucide-vue-next';
import type { Admin, CreateAdminRequest, UpdateAdminRequest } from '../types';
import { ADMIN_ROLE_OPTIONS } from '../types';

interface Props {
  visible: boolean;
  admin?: Admin | null;
  loading?: boolean;
}

interface Emits {
  'update:visible': [visible: boolean];
  submit: [data: CreateAdminRequest | UpdateAdminRequest];
  close: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 是否为编辑模式
const isEdit = computed(() => !!props.admin);

// 显示密码
const showPassword = ref(false);

// 表单数据
const formData = ref<CreateAdminRequest & { confirmPassword?: string }>({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: undefined,
  status: 'active',
  notes: ''
});

// 表单错误
const errors = ref<Record<string, string>>({});

// 重置表单
const resetForm = () => {
  formData.value = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: undefined,
    status: 'active',
    notes: ''
  };
  errors.value = {};
  showPassword.value = false;
};

// 填充表单数据（编辑模式）
const fillForm = (admin: Admin) => {
  formData.value = {
    username: admin.username,
    email: admin.email,
    password: '',
    confirmPassword: '',
    role: admin.role,
    status: admin.status,
    notes: admin.notes || ''
  };
  errors.value = {};
};

// 验证表单
const validateForm = (): boolean => {
  errors.value = {};
  
  // 用户名验证
  if (!formData.value.username.trim()) {
    errors.value.username = '请输入用户名';
  } else if (formData.value.username.length < 3) {
    errors.value.username = '用户名长度至少3位';
  }
  
  // 邮箱验证
  if (!formData.value.email.trim()) {
    errors.value.email = '请输入邮箱地址';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = '请输入有效的邮箱地址';
  }
  
  // 密码验证（新建时必填，编辑时可选）
  if (!isEdit.value && !formData.value.password) {
    errors.value.password = '请输入密码';
  } else if (formData.value.password && formData.value.password.length < 6) {
    errors.value.password = '密码长度至少6位';
  }
  
  // 确认密码验证
  if (formData.value.password && formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = '两次输入的密码不一致';
  }
  
  // 角色验证
  if (!formData.value.role) {
    errors.value.role = '请选择角色';
  }
  
  return Object.keys(errors.value).length === 0;
};

// 处理提交
const handleSubmit = () => {
  if (!validateForm()) {
    return;
  }
  
  const submitData = { ...formData.value };
  delete submitData.confirmPassword;
  
  // 如果是编辑模式且密码为空，则不包含密码字段
  if (isEdit.value && !submitData.password) {
    delete submitData.password;
  }
  
  emit('submit', submitData);
};

// 处理重置
const handleReset = () => {
  if (isEdit.value && props.admin) {
    fillForm(props.admin);
  } else {
    resetForm();
  }
};

// 处理关闭
const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

// 处理背景点击
const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    handleClose();
  }
};

// 监听弹窗显示状态
watch(() => props.visible, (visible) => {
  if (visible) {
    if (isEdit.value && props.admin) {
      fillForm(props.admin);
    } else {
      resetForm();
    }
  }
});

// 监听管理员数据变化
watch(() => props.admin, (admin) => {
  if (admin && props.visible) {
    fillForm(admin);
  }
});
</script>