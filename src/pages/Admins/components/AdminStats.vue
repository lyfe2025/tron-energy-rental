<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
    <!-- 总管理员数 -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <Users class="h-8 w-8 text-blue-600" />
        </div>
        <div class="ml-5 w-0 flex-1">
          <dl>
            <dt class="text-sm font-medium text-gray-500 truncate">
              总管理员
            </dt>
            <dd class="text-lg font-medium text-gray-900">
              {{ stats.value.total }}
            </dd>
          </dl>
        </div>
      </div>
    </div>

    <!-- 超级管理员 -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <Crown class="h-8 w-8 text-purple-600" />
        </div>
        <div class="ml-5 w-0 flex-1">
          <dl>
            <dt class="text-sm font-medium text-gray-500 truncate">
              {{ ADMIN_ROLE_LABELS.super_admin }}
            </dt>
            <dd class="text-lg font-medium text-gray-900">
              {{ stats.value.superAdmins }}
            </dd>
          </dl>
        </div>
      </div>
    </div>

    <!-- 普通管理员 -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <UserCheck class="h-8 w-8 text-green-600" />
        </div>
        <div class="ml-5 w-0 flex-1">
          <dl>
            <dt class="text-sm font-medium text-gray-500 truncate">
              {{ ADMIN_ROLE_LABELS.admin }}
            </dt>
            <dd class="text-lg font-medium text-gray-900">
              {{ stats.value.admins }}
            </dd>
          </dl>
        </div>
      </div>
    </div>

    <!-- 操作员 -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <Settings class="h-8 w-8 text-orange-600" />
        </div>
        <div class="ml-5 w-0 flex-1">
          <dl>
            <dt class="text-sm font-medium text-gray-500 truncate">
              {{ ADMIN_ROLE_LABELS.operator }}
            </dt>
            <dd class="text-lg font-medium text-gray-900">
              {{ stats.value.operators }}
            </dd>
          </dl>
        </div>
      </div>
    </div>

    <!-- 客服管理员 -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <Headphones class="h-8 w-8 text-indigo-600" />
        </div>
        <div class="ml-5 w-0 flex-1">
          <dl>
            <dt class="text-sm font-medium text-gray-500 truncate">
              {{ ADMIN_ROLE_LABELS.customer_service }}
            </dt>
            <dd class="text-lg font-medium text-gray-900">
              {{ stats.value.customerService }}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Users, UserCheck, Settings, Crown, RotateCcw, Headphones } from 'lucide-vue-next';
import { useAdminStore } from '../composables/useAdminStore';
import { ADMIN_ROLE_LABELS } from '../types';

// 管理员统计数据接口
interface AdminStats {
  total: number;
  active: number;
  inactive: number;
  superAdmins: number;
  admins: number;
  operators: number;
  customerService: number;
}

const adminStore = useAdminStore();

// 计算属性
const stats = computed(() => adminStore.stats);
const loading = computed(() => adminStore.loading);

// 活跃管理员占比
const activePercentage = computed(() => {
  const statsValue = adminStore.stats.value;
  if (statsValue.total === 0) return 0;
  return Math.round((statsValue.active / statsValue.total) * 100);
});

// 停用管理员占比
const inactivePercentage = computed(() => {
  const statsValue = adminStore.stats.value;
  if (statsValue.total === 0) return 0;
  return Math.round((statsValue.inactive / statsValue.total) * 100);
});

// 本月新增（模拟数据，实际应该从API获取）
const newThisMonth = computed(() => {
  const statsValue = adminStore.stats.value;
  // 这里应该从API获取本月新增的管理员数量
  // 暂时使用模拟数据
  return Math.floor(statsValue.total * 0.1);
});



// 刷新统计数据
const refreshStats = async () => {
  await adminStore.fetchStats();
};

// 组件挂载时获取统计数据
onMounted(() => {
  adminStore.fetchStats();
});
</script>