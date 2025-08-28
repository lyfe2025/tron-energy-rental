<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    @click="handleBackdropClick"
  >
    <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h3 class="text-lg font-medium text-gray-900">
            权限配置
          </h3>
          <p v-if="admin" class="text-sm text-gray-500 mt-1">
            管理员：{{ admin.username }} ({{ admin.email }})
          </p>
        </div>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="h-6 w-6" />
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-gray-600">加载中...</span>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="py-8">
        <div class="text-center">
          <AlertCircle class="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button
            @click="loadPermissions"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>

      <!-- 权限配置内容 -->
      <div v-else class="mt-6">
        <!-- 角色选择 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            管理员角色
          </label>
          <div class="flex space-x-4">
            <label
              v-for="role in availableRoles"
              :key="role.id"
              class="flex items-center cursor-pointer"
            >
              <input
                v-model="selectedRole"
                :value="role.id"
                type="radio"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span class="ml-2 text-sm text-gray-700">
                {{ role.name }}
                <span class="text-gray-500">({{ role.description }})</span>
              </span>
            </label>
          </div>
        </div>

        <!-- 权限列表 -->
        <div class="space-y-6">
          <div
            v-for="(group, groupName) in groupedPermissions"
            :key="groupName"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-md font-medium text-gray-900">
                {{ getGroupDisplayName(groupName) }}
              </h4>
              <div class="flex items-center space-x-2">
                <button
                  @click="selectAllInGroup(groupName, true)"
                  class="text-xs text-blue-600 hover:text-blue-800"
                >
                  全选
                </button>
                <span class="text-gray-300">|</span>
                <button
                  @click="selectAllInGroup(groupName, false)"
                  class="text-xs text-gray-600 hover:text-gray-800"
                >
                  取消全选
                </button>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <label
                v-for="permission in group"
                :key="permission.id"
                class="flex items-center p-2 rounded border hover:bg-gray-50 cursor-pointer"
                :class="{
                  'bg-blue-50 border-blue-200': selectedPermissions.includes(permission.id),
                  'border-gray-200': !selectedPermissions.includes(permission.id)
                }"
              >
                <input
                  v-model="selectedPermissions"
                  :value="permission.id"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div class="ml-3 flex-1">
                  <div class="text-sm font-medium text-gray-900">
                    {{ permission.name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ permission.description }}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- 已选权限统计 -->
        <div class="mt-6 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">
              已选择权限：{{ selectedPermissions.length }} / {{ allPermissions.length }}
            </span>
            <button
              @click="clearAllPermissions"
              class="text-sm text-red-600 hover:text-red-800"
            >
              清空所有权限
            </button>
          </div>
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
            @click="handleSave"
            :disabled="saving"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <span v-if="saving" class="inline-flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              保存中...
            </span>
            <span v-else>保存权限</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle, X } from 'lucide-vue-next';
import { computed, ref, watch, defineProps, defineEmits } from 'vue';
import { useAdminStore } from '../composables/useAdminStore';
import { AdminService } from '../../../services/adminService';
import type { Admin, AdminPermission, AdminRoleInfo } from '../types';

interface Props {
  visible: boolean;
  admin?: Admin | null;
}

interface Emits {
  'update:visible': [visible: boolean];
  close: [];
  saved: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const adminStore = useAdminStore();

// 状态
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const availableRoles = ref<AdminRoleInfo[]>([]);
const allPermissions = ref<AdminPermission[]>([]);
const selectedRole = ref('');
const selectedPermissions = ref<string[]>([]);

// 权限分组
const groupedPermissions = computed(() => {
  const groups: Record<string, AdminPermission[]> = {};
  
  allPermissions.value.forEach(permission => {
    const group = permission.resource || 'other';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(permission);
  });
  
  return groups;
});

// 获取分组显示名称
const getGroupDisplayName = (groupName: string): string => {
  const groupNames: Record<string, string> = {
    users: '用户管理',
    agents: '代理商管理',
    admins: '管理员管理',
    orders: '订单管理',
    pricing: '价格配置',
    bots: '机器人管理',
    energy: '能量管理',
    statistics: '统计分析',
    system: '系统设置',
    other: '其他权限'
  };
  
  return groupNames[groupName] || groupName;
};

// 加载权限数据
const loadPermissions = async () => {
  if (!props.admin) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    // 加载角色列表
    await adminStore.fetchRoles();
    availableRoles.value = adminStore.roles.value;
    
    // 加载管理员详情（包含权限）
    await adminStore.fetchAdminDetail(props.admin.id);
    const adminDetail = adminStore.currentAdmin.value;
    
    if (adminDetail) {
      selectedRole.value = adminDetail.role;
      selectedPermissions.value = adminDetail.permissions?.map(p => p.id) || [];
    }
    
    // 从API获取所有可用权限
    try {
      const permissionsData = await AdminService.getAllPermissions();
      allPermissions.value = permissionsData.permissions.map(permission => ({
        ...permission,
        admin_id: '',
        role_id: '',
        role_name: '',
        role_description: '',
        permissions: [],
        granted_at: ''
      }));
    } catch (error) {
      console.error('获取权限列表失败:', error);
      error.value = '获取权限列表失败';
      // 如果API失败，使用默认权限列表作为备选
      allPermissions.value = [
        // 用户管理权限
        { id: 'users:read', name: '查看用户', description: '查看用户列表和详情', resource: 'users', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'users:create', name: '创建用户', description: '创建新用户', resource: 'users', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'users:update', name: '编辑用户', description: '编辑用户信息', resource: 'users', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'users:delete', name: '删除用户', description: '删除用户账户', resource: 'users', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'users:status', name: '用户状态', description: '修改用户状态', resource: 'users', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        
        // 代理商管理权限
        { id: 'agents:read', name: '查看代理商', description: '查看代理商列表和详情', resource: 'agents', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'agents:create', name: '创建代理商', description: '创建新代理商', resource: 'agents', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'agents:update', name: '编辑代理商', description: '编辑代理商信息', resource: 'agents', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'agents:delete', name: '删除代理商', description: '删除代理商账户', resource: 'agents', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        
        // 管理员管理权限
        { id: 'admins:read', name: '查看管理员', description: '查看管理员列表和详情', resource: 'admins', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'admins:create', name: '创建管理员', description: '创建新管理员', resource: 'admins', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'admins:update', name: '编辑管理员', description: '编辑管理员信息', resource: 'admins', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'admins:delete', name: '删除管理员', description: '删除管理员账户', resource: 'admins', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'admins:permissions', name: '权限配置', description: '配置管理员权限', resource: 'admins', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        
        // 订单管理权限
        { id: 'orders:read', name: '查看订单', description: '查看订单列表和详情', resource: 'orders', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'orders:update', name: '处理订单', description: '处理和更新订单', resource: 'orders', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'orders:refund', name: '订单退款', description: '处理订单退款', resource: 'orders', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        
        // 机器人管理权限
        { id: 'bots:read', name: '查看机器人', description: '查看机器人列表和详情', resource: 'bots', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'bots:create', name: '创建机器人', description: '创建新机器人', resource: 'bots', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'bots:update', name: '编辑机器人', description: '编辑机器人信息', resource: 'bots', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'bots:delete', name: '删除机器人', description: '删除机器人', resource: 'bots', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        
        // 统计分析权限
        { id: 'statistics:read', name: '查看统计', description: '查看统计数据和报表', resource: 'statistics', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        
        // 系统配置权限
        { id: 'system:read', name: '查看配置', description: '查看系统配置', resource: 'system', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' },
        { id: 'system:update', name: '修改配置', description: '修改系统配置', resource: 'system', admin_id: '', role_id: '', role_name: '', role_description: '', permissions: [], granted_at: '' }
      ];
    }
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载权限数据失败';
  } finally {
    loading.value = false;
  }
};

// 选择分组中的所有权限
const selectAllInGroup = (groupName: string, select: boolean) => {
  const groupPermissions = groupedPermissions.value[groupName] || [];
  const permissionIds = groupPermissions.map(p => p.id);
  
  if (select) {
    // 添加该分组的所有权限
    permissionIds.forEach(id => {
      if (!selectedPermissions.value.includes(id)) {
        selectedPermissions.value.push(id);
      }
    });
  } else {
    // 移除该分组的所有权限
    selectedPermissions.value = selectedPermissions.value.filter(
      id => !permissionIds.includes(id)
    );
  }
};

// 清空所有权限
const clearAllPermissions = () => {
  selectedPermissions.value = [];
};

// 保存权限配置
const handleSave = async () => {
  if (!props.admin) return;
  
  saving.value = true;
  
  try {
    // 分配权限
    await adminStore.assignPermissions(props.admin.id, selectedPermissions.value);
    
    emit('saved');
    emit('update:visible', false);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存权限配置失败';
  } finally {
    saving.value = false;
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

// 角色默认权限映射
const roleDefaultPermissions: Record<string, string[]> = {
  super_admin: [], // 超级管理员拥有所有权限，在选择时会自动选择全部
  admin: [
    'users:read', 'users:create', 'users:update', 'users:status',
    'orders:read', 'orders:update',
    'statistics:read'
  ],
  customer_service: [
    'users:read',
    'orders:read', 'orders:update'
  ],
  operator: [
    'users:read',
    'agents:read', 'agents:create', 'agents:update',
    'statistics:read'
  ]
};

// 根据角色设置默认权限
const setDefaultPermissionsByRole = (role: string) => {
  if (!role) return;
  
  if (role === 'super_admin') {
    // 超级管理员选择所有权限
    selectedPermissions.value = allPermissions.value.map(p => p.id);
  } else {
    // 其他角色使用预定义的默认权限
    const defaultPerms = roleDefaultPermissions[role] || [];
    selectedPermissions.value = defaultPerms.filter(permId => 
      allPermissions.value.some(p => p.id === permId)
    );
  }
};

// 监听角色选择变化
watch(() => selectedRole.value, (newRole, oldRole) => {
  // 只有在用户主动选择角色时才自动分配权限（不是初始加载时）
  if (newRole && newRole !== oldRole && allPermissions.value.length > 0) {
    setDefaultPermissionsByRole(newRole);
  }
});

// 监听弹窗显示状态
watch(() => props.visible, (visible) => {
  if (visible && props.admin) {
    loadPermissions();
  }
});

// 监听管理员变化
watch(() => props.admin, (admin) => {
  if (admin && props.visible) {
    loadPermissions();
  }
});
</script>