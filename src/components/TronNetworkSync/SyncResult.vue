<!--
 * 同步结果展示组件
 * 职责：显示同步完成后的详细结果
-->
<template>
  <div v-if="result" class="sync-result">
    <h4 class="text-lg font-medium mb-2">同步结果</h4>
    <div class="bg-gray-50 p-3 rounded-lg">
      <div class="grid grid-cols-1 gap-2 text-sm">
        <div v-if="result.networkParams">
          <strong>网络参数:</strong>
          <div class="ml-4 mt-1">
            <div>链ID: {{ result.networkParams.chainId }}</div>
            <div>区块时间: {{ result.networkParams.blockTime }}s</div>
            <div>确认数: {{ result.networkParams.confirmations }}</div>
          </div>
        </div>
        
        <div v-if="result.nodeInfo">
          <strong>节点信息:</strong>
          <div class="ml-4 mt-1">
            <div>版本: {{ result.nodeInfo.version }}</div>
            <div>协议版本: {{ result.nodeInfo.protocolVersion }}</div>
          </div>
        </div>
        
        <div v-if="result.blockInfo">
          <strong>区块信息:</strong>
          <div class="ml-4 mt-1">
            <div>最新区块: {{ result.blockInfo.latestBlock }}</div>
            <div>区块哈希: {{ result.blockInfo.blockHash }}</div>
            <div>同步时间: {{ formatDateTime(result.blockInfo.syncTime) }}</div>
          </div>
        </div>
        
        <div v-if="result.healthCheck">
          <strong>健康检查:</strong>
          <div class="ml-4 mt-1">
            <div>响应时间: {{ result.healthCheck.responseTime }}ms</div>
            <div>状态: 
              <el-tag :type="result.healthCheck.status === 'healthy' ? 'success' : 'danger'" size="small">
                {{ result.healthCheck.status === 'healthy' ? '健康' : '异常' }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SyncResult {
  networkParams?: {
    chainId: number
    blockTime: number
    confirmations: number
  }
  nodeInfo?: {
    version: string
    protocolVersion: string
  }
  blockInfo?: {
    latestBlock: number
    blockHash: string
    syncTime: string
  }
  healthCheck?: {
    status: 'healthy' | 'unhealthy'
    responseTime: number
  }
}

interface Props {
  result: SyncResult | null
}

defineProps<Props>()

const formatDateTime = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString('zh-CN')
  } catch (error) {
    return dateStr
  }
}
</script>

<style scoped>
.mb-2 {
  margin-bottom: 0.5rem;
}

.mt-1 {
  margin-top: 0.25rem;
}

.ml-4 {
  margin-left: 1rem;
}

.p-3 {
  padding: 0.75rem;
}

.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.gap-2 {
  gap: 0.5rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.rounded-lg {
  border-radius: 0.5rem;
}
</style>
