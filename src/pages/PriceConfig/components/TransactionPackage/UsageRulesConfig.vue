<template>
  <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
    <h3 class="text-lg font-medium text-gray-900 mb-4">📋 使用规则配置</h3>
    <div class="space-y-3">
      <div
        v-for="(rule, index) in usageRules"
        :key="index"
        class="flex items-center space-x-2"
      >
        <input
          :value="rule"
          @input="updateRule(index, ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="请输入使用规则"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="removeRule(index)"
          class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex-shrink-0"
        >
          删除
        </button>
      </div>
      <button
        @click="addRule"
        class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
      >
        添加使用规则
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface UsageRulesConfigProps {
  usageRules: string[]
}

const props = defineProps<UsageRulesConfigProps>()
const emit = defineEmits<{
  'update:usage-rules': [rules: string[]]
}>()

const addRule = () => {
  const newRules = [...props.usageRules, '']
  emit('update:usage-rules', newRules)
}

const removeRule = (index: number) => {
  const newRules = [...props.usageRules]
  newRules.splice(index, 1)
  emit('update:usage-rules', newRules)
}

const updateRule = (index: number, value: string) => {
  const newRules = [...props.usageRules]
  newRules[index] = value
  emit('update:usage-rules', newRules)
}
</script>
