<!--
 * 网络同步信息展示组件
 * 职责：显示网络基本信息和同步说明
-->
<template>
  <div class="network-sync-info">
    <!-- 同步说明 -->
    <div class="mb-4">
      <el-alert
        title="同步说明"
        type="info"
        :closable="false"
        show-icon
      >
        <template #default>
          <p class="mb-2">同步配置将执行以下操作：</p>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>检查网络连接状态</li>
            <li>获取最新的网络参数</li>
            <li>更新本地配置信息</li>
            <li>同步区块链状态数据</li>
          </ul>
        </template>
      </el-alert>
    </div>

    <!-- 网络信息 -->
    <div v-if="networkInfo" class="mb-4">
      <h4 class="text-lg font-medium mb-2">网络信息</h4>
      <div class="bg-gray-50 p-3 rounded-lg">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div><strong>网络名称:</strong> {{ networkInfo.name }}</div>
          <div><strong>网络类型:</strong> {{ getTypeLabel(networkInfo.type) }}</div>
          <div><strong>RPC地址:</strong> {{ networkInfo.rpc_url }}</div>
          <div><strong>当前状态:</strong> 
            <el-tag :type="getStatusTagType(networkInfo.health_status)" size="small">
              {{ getStatusLabel(networkInfo.health_status) }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TronNetwork } from '@/types/network';

interface Props {
  networkInfo: TronNetwork | null
}

defineProps<Props>()

// 工具函数
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'mainnet': return '主网'
    case 'testnet': return '测试网'
    case 'private': return '私有网'
    default: return '未知'
  }
}

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'healthy': return 'success'
    case 'unhealthy': return 'danger'
    case 'unknown': return 'info'
    default: return 'info'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'healthy': return '健康'
    case 'unhealthy': return '异常'
    case 'unknown': return '未知'
    default: return '未知'
  }
}
</script>

<style scoped>
.space-y-1 > * + * {
  margin-top: 0.25rem;
}

.list-disc {
  list-style-type: disc;
}

.list-inside {
  list-style-position: inside;
}

.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gap-2 {
  gap: 0.5rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.p-3 {
  padding: 0.75rem;
}
</style>
