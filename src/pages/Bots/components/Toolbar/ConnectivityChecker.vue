<template>
  <button
    @click="$emit('check-connection')"
    :disabled="connectivityState.checking"
    :class="{
      'px-4 py-2 border rounded-lg transition-colors flex items-center gap-2': true,
      'text-green-600 bg-green-50 border-green-200 hover:bg-green-100': connectivityState.status === 'connected',
      'text-red-600 bg-red-50 border-red-200 hover:bg-red-100': connectivityState.status === 'disconnected',
      'text-yellow-600 bg-yellow-50 border-yellow-200 hover:bg-yellow-100': connectivityState.status === 'slow',
      'text-gray-700 bg-white border-gray-300 hover:bg-gray-50': connectivityState.status === null,
      'opacity-50 cursor-not-allowed': connectivityState.checking
    }"
  >
    <component 
      :is="getConnectivityIcon()" 
      :class="{ 'animate-spin': connectivityState.checking }" 
      class="w-4 h-4" 
    />
    {{ getConnectivityText() }}
  </button>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle, RefreshCw, Wifi, XCircle } from 'lucide-vue-next';
import type { ConnectivityState } from '../../types/connectivity.types';

interface Props {
  connectivityState: ConnectivityState
}

const props = defineProps<Props>()

defineEmits<{
  'check-connection': []
}>()

// 获取连接状态图标
const getConnectivityIcon = () => {
  if (props.connectivityState.checking) return RefreshCw
  
  switch (props.connectivityState.status) {
    case 'connected':
      return CheckCircle
    case 'slow':
      return AlertTriangle
    case 'disconnected':
      return XCircle
    default:
      return Wifi
  }
}

// 获取连接状态文本
const getConnectivityText = () => {
  if (props.connectivityState.checking) return '检测中...'
  
  switch (props.connectivityState.status) {
    case 'connected':
      return `API正常 (${props.connectivityState.latency}ms)`
    case 'slow':
      return `连接较慢 (${props.connectivityState.latency}ms)`
    case 'disconnected':
      return 'API不可用'
    default:
      return '检测连接'
  }
}
</script>
