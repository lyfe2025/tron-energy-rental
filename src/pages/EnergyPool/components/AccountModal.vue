<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900">
          {{ isEdit ? '编辑账户' : '添加账户' }}
        </h2>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- 账户名称 -->
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
            账户名称 *
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            placeholder="请输入账户名称"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{ 'border-red-500': errors.name }"
          />
          <p v-if="errors.name" class="mt-1 text-sm text-red-600">{{ errors.name }}</p>
        </div>

        <!-- 钱包地址 -->
        <div>
          <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
            钱包地址 *
          </label>
          <input
            id="address"
            v-model="form.address"
            type="text"
            required
            placeholder="请输入TRON钱包地址"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{ 'border-red-500': errors.address }"
          />
          <p v-if="errors.address" class="mt-1 text-sm text-red-600">{{ errors.address }}</p>
        </div>

        <!-- 私钥 -->
        <div>
          <label for="private_key" class="block text-sm font-medium text-gray-700 mb-1">
            私钥 *
          </label>
          <div class="relative">
            <input
              id="private_key"
              v-model="form.private_key"
              :type="showPrivateKey ? 'text' : 'password'"
              required
              placeholder="请输入私钥"
              class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :class="{ 'border-red-500': errors.private_key }"
            />
            <button
              type="button"
              @click="showPrivateKey = !showPrivateKey"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <Eye v-if="!showPrivateKey" class="w-5 h-5" />
              <EyeOff v-else class="w-5 h-5" />
            </button>
          </div>
          <p v-if="errors.private_key" class="mt-1 text-sm text-red-600">{{ errors.private_key }}</p>
        </div>

        <!-- 总能量 -->
        <div>
          <label for="total_energy" class="block text-sm font-medium text-gray-700 mb-1">
            总能量 *
          </label>
          <input
            id="total_energy"
            v-model.number="form.total_energy"
            type="number"
            required
            min="0"
            placeholder="请输入总能量数量"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{ 'border-red-500': errors.total_energy }"
          />
          <p v-if="errors.total_energy" class="mt-1 text-sm text-red-600">{{ errors.total_energy }}</p>
        </div>

        <!-- 可用能量 -->
        <div>
          <label for="available_energy" class="block text-sm font-medium text-gray-700 mb-1">
            可用能量
          </label>
          <input
            id="available_energy"
            v-model.number="form.available_energy"
            type="number"
            min="0"
            :max="form.total_energy"
            placeholder="默认等于总能量"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{ 'border-red-500': errors.available_energy }"
          />
          <p v-if="errors.available_energy" class="mt-1 text-sm text-red-600">{{ errors.available_energy }}</p>
        </div>

        <!-- 单位成本 -->
        <div>
          <label for="cost_per_energy" class="block text-sm font-medium text-gray-700 mb-1">
            单位能量成本 (TRX) *
          </label>
          <input
            id="cost_per_energy"
            v-model.number="form.cost_per_energy"
            type="number"
            step="0.000001"
            required
            min="0"
            placeholder="请输入每单位能量的成本"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{ 'border-red-500': errors.cost_per_energy }"
          />
          <p v-if="errors.cost_per_energy" class="mt-1 text-sm text-red-600">{{ errors.cost_per_energy }}</p>
        </div>

        <!-- 账户类型 -->
        <div>
          <label for="account_type" class="block text-sm font-medium text-gray-700 mb-1">
            账户类型 *
          </label>
          <select
            id="account_type"
            v-model="form.account_type"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="own_energy">自有能量源</option>
            <option value="agent_energy">代理商能量源</option>
            <option value="third_party">第三方供应商</option>
          </select>
        </div>

        <!-- 优先级 -->
        <div>
          <label for="priority" class="block text-sm font-medium text-gray-700 mb-1">
            优先级 *
          </label>
          <input
            id="priority"
            v-model.number="form.priority"
            type="number"
            required
            min="1"
            max="100"
            placeholder="数值越小优先级越高"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{ 'border-red-500': errors.priority }"
          />
          <p v-if="errors.priority" class="mt-1 text-sm text-red-600">{{ errors.priority }}</p>
          <p class="mt-1 text-xs text-gray-500">数值越小优先级越高（1-100）</p>
        </div>

        <!-- 描述 -->
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
            描述
          </label>
          <textarea
            id="description"
            v-model="form.description"
            rows="3"
            placeholder="请输入账户描述信息"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <!-- 每日限额 -->
        <div>
          <label for="daily_limit" class="block text-sm font-medium text-gray-700 mb-1">
            每日限额
          </label>
          <input
            id="daily_limit"
            v-model.number="form.daily_limit"
            type="number"
            min="0"
            placeholder="每日最大能量使用量（可选）"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- 每月限额 -->
        <div>
          <label for="monthly_limit" class="block text-sm font-medium text-gray-700 mb-1">
            每月限额
          </label>
          <input
            id="monthly_limit"
            v-model.number="form.monthly_limit"
            type="number"
            min="0"
            placeholder="每月最大能量使用量（可选）"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- 状态 -->
        <div>
          <label for="status" class="text-sm font-medium text-gray-700 mb-1">
            状态
          </label>
          <select
            id="status"
            v-model="form.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="active">已启用</option>
            <option value="inactive">已停用</option>
            <option value="maintenance">维护中</option>
          </select>
        </div>

        <!-- 按钮 -->
        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <span>{{ isEdit ? '更新' : '添加' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Eye, EyeOff, Loader2, X } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import type { EnergyPoolAccount } from '../composables/useEnergyPool'
import { useEnergyPool } from '../composables/useEnergyPool'

interface Props {
  visible: boolean
  account?: EnergyPoolAccount | null
}

interface Emits {
  close: []
  success: [data: any]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { addAccount, updateAccount } = useEnergyPool()

const loading = ref(false)
const showPrivateKey = ref(false)

// 表单数据
const form = reactive({
  name: '',
  address: '',
  private_key: '',
  total_energy: 0,
  available_energy: 0,
  cost_per_energy: 0,
  status: 'active' as 'active' | 'inactive' | 'maintenance',
  account_type: 'own_energy' as 'own_energy' | 'agent_energy' | 'third_party',
  priority: 1,
  description: '',
  daily_limit: null as number | null,
  monthly_limit: null as number | null
})

// 表单错误
const errors = reactive({
  name: '',
  address: '',
  private_key: '',
  total_energy: '',
  available_energy: '',
  cost_per_energy: '',
  priority: ''
})

// 是否为编辑模式
const isEdit = computed(() => !!props.account)

// 重置表单
const resetForm = () => {
  form.name = ''
  form.address = ''
  form.private_key = ''
  form.total_energy = 0
  form.available_energy = 0
  form.cost_per_energy = 0
  form.status = 'active'
  form.account_type = 'own_energy'
  form.priority = 1
  form.description = ''
  form.daily_limit = null
  form.monthly_limit = null
  clearErrors()
}

// 清除错误
const clearErrors = () => {
  errors.name = ''
  errors.address = ''
  errors.private_key = ''
  errors.total_energy = ''
  errors.available_energy = ''
  errors.cost_per_energy = ''
  errors.priority = ''
}

// 监听账户变化，填充表单
watch(() => props.account, (account) => {
  if (account) {
    form.name = account.name || ''
    form.address = account.tron_address
    form.private_key = account.private_key_encrypted
    form.total_energy = account.total_energy
    form.available_energy = account.available_energy
    form.cost_per_energy = account.cost_per_energy
    form.status = account.status || 'active'
    form.account_type = account.account_type || 'own_energy'
    form.priority = account.priority || 1
    form.description = account.description || ''
    form.daily_limit = account.daily_limit
    form.monthly_limit = account.monthly_limit
  } else {
    resetForm()
  }
}, { immediate: true })

// 监听总能量变化，自动设置可用能量
watch(() => form.total_energy, (newValue) => {
  if (!isEdit.value && newValue > 0 && form.available_energy === 0) {
    form.available_energy = newValue
  }
})

// 验证表单
const validateForm = (): boolean => {
  clearErrors()
  let isValid = true

  // 验证账户名称
  if (!form.name.trim()) {
    errors.name = '请输入账户名称'
    isValid = false
  } else if (form.name.trim().length < 2) {
    errors.name = '账户名称至少需要2个字符'
    isValid = false
  } else if (form.name.trim().length > 50) {
    errors.name = '账户名称不能超过50个字符'
    isValid = false
  }

  // 验证地址
  if (!form.address.trim()) {
    errors.address = '请输入钱包地址'
    isValid = false
  } else if (!/^T[A-Za-z1-9]{33}$/.test(form.address.trim())) {
    errors.address = '请输入有效的TRON钱包地址'
    isValid = false
  }

  // 验证私钥
  if (!form.private_key.trim()) {
    errors.private_key = '请输入私钥'
    isValid = false
  } else if (!/^[0-9a-fA-F]{64}$/.test(form.private_key.trim())) {
    errors.private_key = '请输入有效的私钥（64位十六进制字符）'
    isValid = false
  }

  // 验证总能量
  if (form.total_energy <= 0) {
    errors.total_energy = '总能量必须大于0'
    isValid = false
  }

  // 验证可用能量
  if (form.available_energy < 0) {
    errors.available_energy = '可用能量不能为负数'
    isValid = false
  } else if (form.available_energy > form.total_energy) {
    errors.available_energy = '可用能量不能超过总能量'
    isValid = false
  }

  // 验证成本
  if (form.cost_per_energy <= 0) {
    errors.cost_per_energy = '单位成本必须大于0'
    isValid = false
  }

  // 验证优先级
  if (form.priority < 1 || form.priority > 100) {
    errors.priority = '优先级必须在1-100之间'
    isValid = false
  }

  return isValid
}

// 处理提交
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  try {
    const submitData = {
      name: form.name.trim(),
      tron_address: form.address.trim(),
      private_key_encrypted: form.private_key.trim(),
      total_energy: form.total_energy,
      available_energy: form.available_energy || form.total_energy,
      cost_per_energy: form.cost_per_energy,
      status: form.status,
      account_type: form.account_type,
      priority: form.priority,
      description: form.description || null,
      daily_limit: form.daily_limit,
      monthly_limit: form.monthly_limit
    }

    if (isEdit.value && props.account) {
      // 编辑模式：调用updateAccount API
      await updateAccount(props.account.id, submitData)
    } else {
      // 添加模式：调用addAccount API
      await addAccount({
        name: submitData.name,
        tron_address: submitData.tron_address,
        private_key_encrypted: submitData.private_key_encrypted,
        total_energy: submitData.total_energy
      })
    }

    // API调用成功后emit success事件
    emit('success', submitData)
  } catch (error) {
    console.error('Submit error:', error)
    // API调用失败时不emit success事件，让用户可以重试
  } finally {
    loading.value = false
  }
}

// 处理关闭
const handleClose = () => {
  if (!loading.value) {
    resetForm()
    emit('close')
  }
}
</script>