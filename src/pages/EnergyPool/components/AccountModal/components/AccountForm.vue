<template>
  <div class="space-y-4">
    <!-- 账户名称 -->
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
        账户名称 *
      </label>
      <input
        id="name"
        :model-value="form.name"
        @input="onInput('name', $event)"
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
        :model-value="form.address"
        @input="onInput('address', $event)"
        type="text"
        required
        placeholder="请输入TRON钱包地址"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        :class="{ 'border-red-500': errors.address }"
      />
      <p v-if="errors.address" class="mt-1 text-sm text-red-600">{{ errors.address }}</p>
    </div>

    <!-- 私钥输入组件 -->
    <PrivateKeyInput
      v-model="form.private_key"
      v-model:input-mode="privateKeyInputMode"
      v-model:mnemonic-value="form.mnemonic"
      :error="errors.private_key"
      :mnemonic-error="errors.mnemonic"
      :generating="generatingPrivateKey"
      @generate="onGeneratePrivateKey"
      @blur="onPrivateKeyBlur"
      @mnemonic-blur="onMnemonicBlur"
    />

    <!-- TRON数据验证显示 -->
    <ValidationDisplay
      :address="form.address"
      :private-key="form.private_key"
      :tron-data="tronData"
      :tron-data-error="tronDataError"
      :fetching-tron-data="fetchingTronData"
      @refresh="onRefreshTronData"
    />

    <!-- 账户类型 -->
    <div>
      <label for="account_type" class="block text-sm font-medium text-gray-700 mb-1">
        账户类型 *
      </label>
      <select
        id="account_type"
        :model-value="form.account_type"
        @change="onSelect('account_type', $event)"
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
        :model-value="form.priority"
        @input="onNumberInput('priority', $event)"
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
        :model-value="form.description"
        @input="onInput('description', $event)"
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
        :model-value="form.daily_limit"
        @input="onNumberInput('daily_limit', $event)"
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
        :model-value="form.monthly_limit"
        @input="onNumberInput('monthly_limit', $event)"
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
        :model-value="form.status"
        @change="onSelect('status', $event)"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="active">已启用</option>
        <option value="inactive">已停用</option>
        <option value="maintenance">维护中</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { 
  AccountFormData, 
  AccountFormErrors, 
  PrivateKeyInputMode,
  TronData
} from '../types/account-modal.types'
import PrivateKeyInput from './PrivateKeyInput.vue'
import ValidationDisplay from './ValidationDisplay.vue'

interface Props {
  form: AccountFormData
  errors: AccountFormErrors
  privateKeyInputMode: PrivateKeyInputMode
  generatingPrivateKey: boolean
  tronData: TronData | null
  tronDataError: string
  fetchingTronData: boolean
}

interface Emits {
  'update:form': [form: Partial<AccountFormData>]
  'update:privateKeyInputMode': [mode: PrivateKeyInputMode]
  generatePrivateKey: []
  privateKeyBlur: []
  mnemonicBlur: []
  refreshTronData: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const onInput = (field: keyof AccountFormData, event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  emit('update:form', { [field]: target.value })
}

const onNumberInput = (field: keyof AccountFormData, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value === '' ? null : Number(target.value)
  emit('update:form', { [field]: value })
}

const onSelect = (field: keyof AccountFormData, event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:form', { [field]: target.value })
}

const onGeneratePrivateKey = () => {
  emit('generatePrivateKey')
}

const onPrivateKeyBlur = () => {
  emit('privateKeyBlur')
}

const onMnemonicBlur = () => {
  emit('mnemonicBlur')
}

const onRefreshTronData = () => {
  emit('refreshTronData')
}
</script>
