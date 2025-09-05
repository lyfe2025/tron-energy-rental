<!--
 * TRON网络同步配置对话框 - 重构后的主组件
 * 职责：协调各个子组件，管理对话框状态
-->
<template>
  <el-dialog
    v-model="visible"
    title="同步配置"
    width="600px"
    :before-close="handleClose"
  >
    <div v-loading="loading" class="network-sync">
      <!-- 网络信息展示 -->
      <NetworkSyncInfo :network-info="networkInfo" />

      <!-- 同步选项配置 -->
      <SyncOptions
        v-model:options="syncOptions"
        :disabled="loading"
      />

      <!-- 同步进度展示 -->
      <SyncProgress :steps="syncProgress" />

      <!-- 同步结果展示 -->
      <SyncResult :result="syncResult" />
    </div>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <el-button @click="handleClose" :disabled="loading">关闭</el-button>
        <el-button 
          type="primary" 
          @click="handleStartSync" 
          :loading="loading"
          :disabled="!hasSelectedOptions"
        >
          {{ loading ? '同步中...' : '开始同步' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import NetworkSyncInfo from './TronNetworkSync/NetworkSyncInfo.vue'
import SyncOptions from './TronNetworkSync/SyncOptions.vue'
import SyncProgress from './TronNetworkSync/SyncProgress.vue'
import SyncResult from './TronNetworkSync/SyncResult.vue'
import { useTronNetworkSync } from './TronNetworkSync/useTronNetworkSync'

interface Props {
  modelValue: boolean
  networkId?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 对话框显示状态
const visible = ref(false)

// 使用同步逻辑composable
const {
  // 状态
  loading,
  networkInfo,
  syncProgress,
  syncResult,
  syncOptions,

  // 计算属性
  hasSelectedOptions,

  // 方法
  fetchNetworkInfo,
  resetSync,
  startSync
} = useTronNetworkSync(computed(() => props.networkId || ''))

// 监听对话框状态
watch(() => props.modelValue, (newVal) => {
  console.log('🔄 对话框状态变化:', { newVal, networkId: props.networkId })
  visible.value = newVal
  if (newVal && props.networkId) {
    console.log('📋 满足初始化条件，开始初始化同步对话框')
    initializeSync()
  } else if (newVal && !props.networkId) {
    console.error('❌ 对话框打开但缺少networkId参数')
    ElMessage.error('缺少网络ID参数')
  }
})

watch(visible, (newVal) => {
  if (!newVal) {
    emit('update:modelValue', false)
  }
})

// 初始化同步
const initializeSync = async () => {
  try {
    console.log('🚀 初始化同步对话框，networkId:', props.networkId)
    if (!props.networkId) {
      console.error('❌ 初始化失败: networkId 为空')
      ElMessage.error('无法初始化同步：网络ID丢失')
      return
    }
    
    await fetchNetworkInfo()
    resetSync()
    console.log('✅ 同步对话框初始化完成')
  } catch (error) {
    console.error('❌ 初始化同步失败:', error)
    ElMessage.error('初始化同步失败，请重试')
  }
}

// 处理开始同步
const handleStartSync = async () => {
  if (!props.networkId) {
    ElMessage.error('网络ID不能为空')
    return
  }
  
  if (!networkInfo.value) {
    ElMessage.error('网络信息未加载，请重新打开对话框')
    return
  }
  
  if (!hasSelectedOptions.value) {
    ElMessage.error('请至少选择一项同步选项')
    return
  }
  
  await startSync(() => {
    emit('success')
  })
}

// 处理关闭对话框
const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
.network-sync {
  min-height: 300px;
}

.flex {
  display: flex;
}

.justify-end {
  justify-content: flex-end;
}

.space-x-2 > * + * {
  margin-left: 0.5rem;
}
</style>