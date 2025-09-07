<template>
  <div class="bg-gray-50 p-4 rounded-lg mb-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-medium flex items-center">
        <FileText class="w-4 h-4 mr-2 text-green-600" />
        合约地址配置
      </h3>
      <el-button size="small" @click="addContract">
        <Plus class="w-4 h-4 mr-1" />
        添加合约
      </el-button>
    </div>
    
    <div v-if="contractAddresses.length === 0" class="text-center py-4 text-gray-500">
      <p class="text-sm">暂未配置合约地址</p>
      <p class="text-xs">点击「添加合约」开始配置</p>
    </div>
    
    <div v-else class="space-y-3">
      <div 
        v-for="(contract, index) in contractAddresses" 
        :key="index"
        class="border rounded-lg p-3 bg-white"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center space-x-2">
            <el-tag size="small" :type="contract.is_active ? 'success' : 'danger'">
              {{ contract.symbol || 'TOKEN' }}
            </el-tag>
            <span class="text-sm font-medium">{{ contract.name || '未命名' }}</span>
          </div>
          <el-button 
            size="small" 
            type="danger" 
            text 
            @click="removeContract(index)"
          >
            <X class="w-4 h-4" />
          </el-button>
        </div>
        
        <div class="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label class="text-xs text-gray-500">代币符号</label>
            <el-input 
              v-model="contract.symbol" 
              size="small" 
              placeholder="如: USDT"
              maxlength="10"
              @input="updateContract(index, 'symbol', $event)"
            />
          </div>
          <div>
            <label class="text-xs text-gray-500">代币名称</label>
            <el-input 
              v-model="contract.name" 
              size="small" 
              placeholder="如: Tether USD"
              @input="updateContract(index, 'name', $event)"
            />
          </div>
        </div>
        
        <div class="mb-2">
          <label class="text-xs text-gray-500">合约地址</label>
          <el-input 
            v-model="contract.address" 
            size="small" 
            placeholder="34字符的TRON合约地址"
            maxlength="34"
            show-word-limit
            @input="updateContract(index, 'address', $event)"
          />
        </div>
        
        <div class="grid grid-cols-3 gap-3 mb-2">
          <div>
            <label class="text-xs text-gray-500">精度</label>
            <el-input-number 
              v-model="contract.decimals" 
              size="small" 
              :min="0" 
              :max="18" 
              class="w-full"
              @change="updateContract(index, 'decimals', $event)"
            />
          </div>
          <div>
            <label class="text-xs text-gray-500">类型</label>
            <el-select 
              v-model="contract.type" 
              size="small" 
              class="w-full"
              @change="updateContract(index, 'type', $event)"
            >
              <el-option label="TRC20" value="TRC20" />
              <el-option label="TRC10" value="TRC10" />
            </el-select>
          </div>
          <div class="flex items-end">
            <el-checkbox 
              v-model="contract.is_active" 
              size="small"
              @change="updateContract(index, 'is_active', $event)"
            >
              启用
            </el-checkbox>
          </div>
        </div>
        
        <div>
          <label class="text-xs text-gray-500">描述</label>
          <el-input 
            v-model="contract.description" 
            size="small" 
            placeholder="合约描述信息"
            type="textarea"
            :rows="1"
            maxlength="100"
            @input="updateContract(index, 'description', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { FileText, Plus, X } from 'lucide-vue-next'

interface ContractAddress {
  symbol: string
  name: string
  address: string
  decimals: number
  type: string
  is_active: boolean
  description?: string
  source?: string
}

interface Props {
  modelValue: ContractAddress[]
}

interface Emits {
  (e: 'update:modelValue', value: ContractAddress[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const contractAddresses = ref<ContractAddress[]>([...props.modelValue])

// 监听 props 变化
watch(() => props.modelValue, (newValue) => {
  contractAddresses.value = [...newValue]
}, { deep: true })

// 监听本地变化并向上emit
watch(contractAddresses, (newValue) => {
  emit('update:modelValue', [...newValue])
}, { deep: true })

// 添加新合约
const addContract = () => {
  contractAddresses.value.push({
    symbol: 'USDT',
    name: 'Tether USD',
    address: '',
    decimals: 6,
    type: 'TRC20',
    is_active: true,
    description: '',
    source: '手动添加'
  })
}

// 移除合约
const removeContract = (index: number) => {
  contractAddresses.value.splice(index, 1)
}

// 更新合约字段
const updateContract = (index: number, field: keyof ContractAddress, value: any) => {
  if (contractAddresses.value[index]) {
    (contractAddresses.value[index] as any)[field] = value
  }
}
</script>
