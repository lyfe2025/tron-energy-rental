<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <!-- 选择信息 -->
      <div class="flex items-center space-x-4">
        <span class="text-sm text-gray-600">
          已选择 <span class="font-medium text-blue-600">{{ selectedCount }}</span> 个代理商
        </span>
        <button
          v-if="selectedCount > 0"
          @click="handleClearSelection"
          class="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          清除选择
        </button>
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- 新建代理商 -->
        <button
          @click="handleCreate"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus class="w-4 h-4 mr-2" />
          新建代理商
        </button>

        <!-- 批量操作 -->
        <template v-if="selectedCount > 0">
          <!-- 批量启用 -->
          <button
            @click="handleBatchStatus('active')"
            :disabled="submitting"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <UserCheck class="w-4 h-4 mr-2" />
            批量启用
          </button>

          <!-- 批量暂停 -->
          <button
            @click="handleBatchStatus('suspended')"
            :disabled="submitting"
            class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <UserX class="w-4 h-4 mr-2" />
            批量暂停
          </button>

          <!-- 更多操作下拉菜单 -->
          <div class="relative" ref="dropdownRef">
            <button
              @click="showDropdown = !showDropdown"
              class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
            >
              <MoreHorizontal class="w-4 h-4 mr-2" />
              更多操作
              <ChevronDown class="w-4 h-4 ml-2" />
            </button>

            <!-- 下拉菜单 -->
            <div
              v-if="showDropdown"
              class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
            >
              <div class="py-1">
                <button
                  @click="handleBatchStatus('pending')"
                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Clock class="w-4 h-4 mr-2 inline" />
                  设为待审核
                </button>
                <button
                  @click="handleBatchStatus('rejected')"
                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <UserX class="w-4 h-4 mr-2 inline" />
                  批量拒绝
                </button>
                <div class="border-t border-gray-200 my-1"></div>
                <button
                  @click="handleBatchPricing"
                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings class="w-4 h-4 mr-2 inline" />
                  批量价格配置
                </button>
                <button
                  @click="handleExportSelected"
                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Download class="w-4 h-4 mr-2 inline" />
                  导出选中
                </button>
                <div class="border-t border-gray-200 my-1"></div>
                <button
                  @click="handleBatchDelete"
                  class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 class="w-4 h-4 mr-2 inline" />
                  批量删除
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 确认对话框 -->
    <div
      v-if="showConfirmDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="handleDialogBackdrop"
    >
      <div
        class="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        @click.stop
      >
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          {{ confirmDialog.title }}
        </h3>
        <p class="text-sm text-gray-600 mb-6">
          {{ confirmDialog.message }}
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="handleCancelConfirm"
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            @click="handleConfirmAction"
            :disabled="submitting"
            :class="[
              'px-4 py-2 rounded-lg transition-colors',
              confirmDialog.type === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
            ]"
          >
            {{ submitting ? '处理中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Plus,
  UserCheck,
  UserX,
  MoreHorizontal,
  ChevronDown,
  Clock,
  Settings,
  Download,
  Trash2
} from 'lucide-vue-next';
import type { Agent } from '@/pages/Agents/types';

interface Props {
  selectedAgents: string[];
  submitting?: boolean;
}

interface Emits {
  create: [];
  clearSelection: [];
  batchStatus: [agentIds: string[], status: 'active' | 'pending' | 'rejected' | 'suspended'];
  batchPricing: [agentIds: string[]];
  batchDelete: [agentIds: string[]];
  exportSelected: [agentIds: string[]];
}

const props = withDefaults(defineProps<Props>(), {
  submitting: false
});

const emit = defineEmits<Emits>();

// 响应式状态
const showDropdown = ref(false);
const dropdownRef = ref<HTMLElement>();
const showConfirmDialog = ref(false);
const confirmDialog = ref({
  title: '',
  message: '',
  type: 'normal' as 'normal' | 'danger',
  action: null as (() => void) | null
});

// 计算属性
const selectedCount = computed(() => props.selectedAgents.length);

// 事件处理
const handleCreate = () => {
  emit('create');
};

const handleClearSelection = () => {
  emit('clearSelection');
};

const handleBatchStatus = (status: 'active' | 'pending' | 'rejected' | 'suspended') => {
  showDropdown.value = false;
  
  const statusLabels = {
    active: '启用',
    suspended: '暂停',
    pending: '设为待审核',
    rejected: '拒绝'
  };
  
  const label = statusLabels[status as keyof typeof statusLabels] || status;
  
  showConfirmDialog.value = true;
  confirmDialog.value = {
    title: `批量${label}代理商`,
    message: `确定要${label} ${selectedCount.value} 个代理商吗？`,
    type: status === 'rejected' || status === 'suspended' ? 'danger' : 'normal',
    action: () => {
      emit('batchStatus', props.selectedAgents, status);
    }
  };
};

const handleBatchPricing = () => {
  showDropdown.value = false;
  emit('batchPricing', props.selectedAgents);
};

const handleBatchDelete = () => {
  showDropdown.value = false;
  
  showConfirmDialog.value = true;
  confirmDialog.value = {
    title: '批量删除代理商',
    message: `确定要删除 ${selectedCount.value} 个代理商吗？此操作不可撤销。`,
    type: 'danger',
    action: () => {
      emit('batchDelete', props.selectedAgents);
    }
  };
};

const handleExportSelected = () => {
  showDropdown.value = false;
  emit('exportSelected', props.selectedAgents);
};

const handleDialogBackdrop = (event: Event) => {
  if (event.target === event.currentTarget) {
    handleCancelConfirm();
  }
};

const handleCancelConfirm = () => {
  showConfirmDialog.value = false;
  confirmDialog.value.action = null;
};

const handleConfirmAction = () => {
  if (confirmDialog.value.action) {
    confirmDialog.value.action();
  }
  showConfirmDialog.value = false;
  confirmDialog.value.action = null;
};

// 点击外部关闭下拉菜单
const handleClickOutside = (event: Event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>