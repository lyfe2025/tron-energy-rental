<!--
  解锁成功弹窗演示页面
  用于测试UnstakeSuccessModal组件的显示效果
-->
<template>
  <div class="p-6">
    <h2 class="text-2xl font-bold mb-4">解锁成功弹窗演示</h2>
    
    <div class="space-y-4">
      <button 
        @click="showEnergySuccess"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        测试能量解锁成功弹窗
      </button>
      
      <button 
        @click="showBandwidthSuccess"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        测试带宽解锁成功弹窗
      </button>
    </div>

    <!-- 成功弹窗 -->
    <UnstakeSuccessModal
      v-if="showModal && modalData"
      :data="modalData"
      @close="handleClose"
      @viewTransaction="handleViewTransaction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UnstakeSuccessModal, { type UnstakeSuccessData } from './UnstakeSuccessModal.vue'

const showModal = ref(false)
const modalData = ref<UnstakeSuccessData | null>(null)

const showEnergySuccess = () => {
  modalData.value = {
    amount: 280, // 匹配图片显示的数量
    resourceType: 'ENERGY',
    lostResource: 102200, // 匹配图片显示的失去能量
    unfreezeTime: new Date().toISOString(), // 当前时间作为解质押时间
    unlockPeriodText: '14天', // 网络解锁期
    transactionHash: '84e4e8fa78a9c1e508d14e7482b8d341ec51f85254d2d7790007f44917fe902b'
  }
  showModal.value = true
}

const showBandwidthSuccess = () => {
  modalData.value = {
    amount: 5,
    resourceType: 'BANDWIDTH',
    lostResource: 3000,
    unfreezeTime: new Date().toISOString(), // 当前时间作为解质押时间
    unlockPeriodText: '7天', // 测试不同的解锁期
    transactionHash: '84e4e8fa78a9c1e508d14e7482b8d341ec51f85254d2d7790007f44917fe902b'
  }
  showModal.value = true
}

const handleClose = () => {
  showModal.value = false
  modalData.value = null
}

const handleViewTransaction = (txHash: string) => {
  console.log('查看交易:', txHash)
  // 演示页面使用默认主网链接
  const url = `https://tronscan.org/#/transaction/${txHash}`
  window.open(url, '_blank')
}
</script>
