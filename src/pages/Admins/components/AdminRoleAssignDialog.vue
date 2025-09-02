<template>
  <div v-if="visible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <!-- 标题 -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">分配角色</h3>
          <button
            @click="handleClose"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- 管理员信息 -->
        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center space-x-3">
            <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              <User class="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ admin?.username }}</p>
              <p class="text-xs text-gray-500">{{ admin?.email }}</p>
            </div>
          </div>
          <div class="mt-2">
            <span class="text-xs text-gray-500">当前角色：</span>
            <span :class="getRoleClass(admin?.role || '')" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-1">
              {{ getRoleLabel(admin?.role || '') }}
            </span>
          </div>
        </div>

        <!-- 角色选择 -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            选择新角色 <span class="text-red-500">*</span>
          </label>
          <select
            v-model="selectedRoleId"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            :class="{ 'border-red-300': errors.roleId }"
          >
            <option value="">请选择角色</option>
            <option
              v-for="role in availableRoles"
              :key="role.id"
              :value="role.id"
            >
              {{ role.name }}
            </option>
          </select>
          <p v-if="errors.roleId" class="mt-1 text-sm text-red-600">{{ errors.roleId }}</p>
        </div>

        <!-- 操作原因 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            操作原因
          </label>
          <textarea
            v-model="reason"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="请输入分配角色的原因（可选）"
          ></textarea>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center justify-end space-x-3">
          <button
            @click="handleClose"
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            取消
          </button>
          <button
            @click="handleSubmit"
            :disabled="loading"
            type="button"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
            <span v-else>确认分配</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X, User } from 'lucide-vue-next';
import { useRoles } from '@/pages/System/Roles/composables/useRoles';
import type { Admin } from '../types';
import { ADMIN_ROLE_LABELS } from '../types';

interface Props {
  visible: boolean;
  admin: Admin | null;
}

interface Emits {
  'update:visible': [visible: boolean];
  'assign': [adminId: string, roleId: number, reason?: string];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { getRoleOptions } = useRoles();

// 表单数据
const selectedRoleId = ref<number | null>(null);
const reason = ref<string>('');
const loading = ref(false);
const errors = ref<{ roleId?: string }>({});

// 可用角色列表
const availableRoles = ref<Array<{ id: number; name: string }>>([]);

// 监听对话框显示状态
watch(() => props.visible, async (visible) => {
  if (visible) {
    await loadRoles();
    resetForm();
  }
});

// 加载角色列表
const loadRoles = async () => {
  try {
    const roles = await getRoleOptions();
    availableRoles.value = roles;
  } catch (error) {
    console.error('加载角色列表失败:', error);
  }
};

// 重置表单
  const resetForm = () => {
    selectedRoleId.value = null
    reason.value = ''
    errors.value = {}
  }

// 表单验证
const validateForm = () => {
  errors.value = {}
  
  if (!selectedRoleId.value) {
    errors.value.roleId = '请选择角色'
    return false
  }
  
  return true
}

// 获取角色样式
const getRoleClass = (role: string) => {
  const classes = {
    super_admin: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    operator: 'bg-orange-100 text-orange-800',
    customer_service: 'bg-green-100 text-green-800'
  };
  return classes[role as keyof typeof classes] || 'bg-gray-100 text-gray-800';
};

// 获取角色标签
const getRoleLabel = (role: string) => {
  return ADMIN_ROLE_LABELS[role as keyof typeof ADMIN_ROLE_LABELS] || role;
};

// 提交表单
const handleSubmit = async () => {
  if (!validateForm() || !props.admin) {
    return;
  }
  
  loading.value = true;
  try {
    emit('assign', props.admin.id, selectedRoleId.value, reason.value || undefined);
  } finally {
    loading.value = false;
  }
};

// 关闭对话框
const handleClose = () => {
  emit('update:visible', false);
};
</script>