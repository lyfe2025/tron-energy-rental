<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click="handleBackdrop"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">
          {{ isEdit ? '编辑代理商' : '新建代理商' }}
        </h2>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- 表单内容 -->
      <form @submit.prevent="handleSubmit" class="p-6">
        <div class="space-y-6">
          <!-- 基本信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 用户名 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                用户名 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.username"
                type="text"
                required
                :disabled="isEdit"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="请输入用户名"
              />
              <p v-if="isEdit" class="text-xs text-gray-500 mt-1">
                用户名创建后不可修改
              </p>
            </div>

            <!-- 邮箱 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                邮箱 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入邮箱地址"
              />
            </div>

            <!-- 手机号 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                手机号
              </label>
              <input
                v-model="formData.phone"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入手机号"
              />
            </div>

            <!-- 状态 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                状态 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="formData.status"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">待审核</option>
                <option value="active">活跃</option>
                <option value="suspended">暂停</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>
          </div>

          <!-- 代理商信息 -->
          <div class="border-t border-gray-200 pt-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">代理商信息</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- 代理商等级 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  代理商等级 <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="formData.agent_level"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1">一级代理商</option>
                  <option value="2">二级代理商</option>
                  <option value="3">三级代理商</option>
                </select>
              </div>

              <!-- 佣金率 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  佣金率 (%) <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="formData.commission_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入佣金率"
                />
              </div>

              <!-- 最大折扣率 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  最大折扣率 (%)
                </label>
                <input
                  v-model.number="formData.max_discount_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入最大折扣率"
                />
              </div>

              <!-- 信用额度 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  信用额度 (TRX)
                </label>
                <input
                  v-model.number="formData.credit_limit"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入信用额度"
                />
              </div>
            </div>
          </div>

          <!-- 联系信息 -->
          <div class="border-t border-gray-200 pt-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">联系信息</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- 公司名称 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  公司名称
                </label>
                <input
                  v-model="formData.company_name"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入公司名称"
                />
              </div>

              <!-- 联系人 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  联系人
                </label>
                <input
                  v-model="formData.contact_person"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入联系人姓名"
                />
              </div>
            </div>

            <!-- 地址 -->
            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                地址
              </label>
              <textarea
                v-model="formData.address"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入详细地址"
              ></textarea>
            </div>
          </div>

          <!-- 机器人关联 -->
          <div class="border-t border-gray-200 pt-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">机器人关联</h3>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                关联机器人
              </label>
              <select
                v-model="formData.bot_id"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择机器人（可选）</option>
                <option
                  v-for="bot in availableBots"
                  :key="bot.id"
                  :value="bot.id"
                >
                  {{ bot.name }} (@{{ bot.username }})
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                选择一个机器人与此代理商关联，用于独立核算
              </p>
            </div>
          </div>

          <!-- 备注 -->
          <div class="border-t border-gray-200 pt-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              备注
            </label>
            <textarea
              v-model="formData.notes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入备注信息"
            ></textarea>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            @click="handleClose"
            class="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="submitting"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ submitting ? '保存中...' : (isEdit ? '更新' : '创建') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { X } from 'lucide-vue-next';
import type { Agent, CreateAgentRequest, UpdateAgentRequest } from '@/pages/Agents/types';
import { agentApi } from '@/api/agents';

interface Props {
  visible: boolean;
  agent?: Agent | null;
  submitting?: boolean;
}

interface Emits {
  close: [];
  submit: [data: CreateAgentRequest | UpdateAgentRequest];
}

const props = withDefaults(defineProps<Props>(), {
  agent: null,
  submitting: false
});

const emit = defineEmits<Emits>();

// 计算属性
const isEdit = computed(() => !!props.agent);

// 表单数据
const formData = reactive({
  username: '',
  email: '',
  phone: '',
  status: 'pending' as const,
  agent_level: 1,
  commission_rate: 0,
  max_discount_rate: 0,
  credit_limit: 0,
  company_name: '',
  contact_person: '',
  address: '',
  notes: '',
  bot_id: ''
});

// 可用机器人列表
const availableBots = ref<Array<{ id: string; name: string; username: string; status: string }>>([]);

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    username: '',
    email: '',
    phone: '',
    status: 'pending',
    agent_level: 1,
    commission_rate: 0,
    max_discount_rate: 0,
    credit_limit: 0,
    company_name: '',
    contact_person: '',
    address: '',
    notes: '',
    bot_id: ''
  });
};

// 填充表单数据
const fillForm = (agent: Agent) => {
  Object.assign(formData, {
    username: agent.user?.username || '',
    email: agent.user?.email || '',
    phone: agent.user?.phone || '',
    status: agent.status,
    agent_level: agent.agent_level || 1,
    commission_rate: agent.commission_rate || 0,
    max_discount_rate: agent.max_discount_rate || 0,
    credit_limit: agent.credit_limit || 0,
    company_name: agent.company_name || '',
    contact_person: agent.contact_person || '',
    address: agent.address || '',
    notes: agent.notes || '',
    bot_id: agent.bot_id || ''
  });
};

// 获取可用机器人列表
const loadAvailableBots = async () => {
  try {
    const response = await agentApi.getAvailableBots();
    if (response.success) {
      availableBots.value = response.data;
    }
  } catch (error) {
    console.error('获取机器人列表失败:', error);
  }
};

// 组件挂载时加载机器人列表
onMounted(() => {
  loadAvailableBots();
});

// 监听代理商数据变化
watch(
  () => props.agent,
  (newAgent) => {
    if (newAgent) {
      fillForm(newAgent);
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

// 监听弹窗显示状态
watch(
  () => props.visible,
  (visible) => {
    if (visible && !props.agent) {
      resetForm();
    }
  }
);

// 事件处理
const handleClose = () => {
  emit('close');
};

const handleBackdrop = (event: Event) => {
  if (event.target === event.currentTarget) {
    handleClose();
  }
};

const handleSubmit = () => {
  const submitData = { ...formData };
  
  // 清理空值
  Object.keys(submitData).forEach(key => {
    const value = submitData[key as keyof typeof submitData];
    if (value === '' || value === null || value === undefined) {
      delete submitData[key as keyof typeof submitData];
    }
  });
  
  emit('submit', submitData);
};
</script>