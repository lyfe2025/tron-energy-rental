<template>
  <div>
    <!-- 当前选中账户信息 -->
    <div v-if="selectedAccount && showAccountSection !== false" class="mb-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="relative">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wallet class="w-6 h-6 text-blue-600" />
              </div>
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <div class="flex items-center space-x-2 mb-1">
                <h3 class="text-lg font-semibold text-gray-900">{{ selectedAccount.name }}</h3>
                <span class="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                  活跃
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded border">{{ selectedAccount.tron_address }}</span>
                <button
                  @click="copyAddress"
                  class="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  :title="copySuccess ? '已复制!' : '复制地址'"
                >
                  <svg v-if="!copySuccess" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <svg v-else class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
              <!-- 能量和带宽信息 - 两行布局 -->
              <div class="space-y-2 mt-2">
                <!-- 第一行：能量信息 -->
                <div class="flex items-center space-x-3">
                  <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span class="text-sm text-gray-700">总能量: 
                      <span class="font-semibold text-orange-600">{{ formatEnergy(realTimeAccountData.realTimeData.value?.energy.total || selectedAccount.total_energy) }}</span>
                    </span>
                  </div>
                  <span class="text-gray-300">|</span>
                  <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span class="text-sm text-gray-700">可用能量: 
                      <span class="font-semibold text-blue-600">{{ formatEnergy(realTimeAccountData.realTimeData.value?.energy.available || selectedAccount.available_energy) }}</span>
                    </span>
                  </div>
                </div>
                
                <!-- 第二行：带宽信息 -->
                <div class="flex items-center space-x-3">
                  <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span class="text-sm text-gray-700">总带宽: 
                      <span class="font-semibold text-purple-600">{{ formatBandwidth(realTimeAccountData.realTimeData.value?.bandwidth.total || 0) }}</span>
                    </span>
                  </div>
                  <span class="text-gray-300">|</span>
                  <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                    <span class="text-sm text-gray-700">可用带宽: 
                      <span class="font-semibold text-pink-600">{{ formatBandwidth(realTimeAccountData.realTimeData.value?.bandwidth.available || 0) }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click="refreshRealTimeData"
              :disabled="realTimeAccountData.loading.value"
              class="flex items-center space-x-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 bg-blue-50 rounded-lg transition-colors"
            >
              <RefreshCw :class="{ 'animate-spin': realTimeAccountData.loading.value }" class="w-4 h-4" />
              <span>{{ realTimeAccountData.loading.value ? '刷新中...' : '刷新' }}</span>
            </button>
            <button
              @click="$emit('switchAccount')"
              class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
            >
              <span>切换账户</span>
              <ChevronDown class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 网络状态栏 -->
    <div v-if="currentNetwork && showNetworkSection !== false" class="mb-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-6">
            <div class="flex items-center space-x-3">
              <div class="relative">
                <div class="w-3 h-3 rounded-full" :class="currentNetwork.is_active ? 'bg-green-500' : 'bg-red-500'"></div>
                <div v-if="currentNetwork.is_active" class="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-lg font-medium text-gray-800">当前网络:</span>
                <!-- 荧光笔效果的网络名称 -->
                <div class="relative inline-block">
                  <div class="absolute inset-0 bg-yellow-300 opacity-25 rounded transform -skew-x-12"></div>
                  <span class="relative text-lg font-semibold text-red-600 px-2 py-1 bg-yellow-100 bg-opacity-50 rounded border-l-4 border-yellow-400">
                    {{ currentNetwork.name }}
                  </span>
                </div>
              </div>
            </div>
            <div class="hidden md:flex items-center space-x-2">
              <div class="flex items-center space-x-1">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span class="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded border">
                  {{ currentNetwork.rpc_url }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <div v-if="currentNetwork.is_active" class="flex items-center space-x-1 text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
              <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span>连接正常</span>
            </div>
            <button
              @click="$emit('toggleNetworkSwitcher')"
              class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              切换网络
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 质押概览统计 - 2x2 网格布局 -->
    <div v-if="realTimeAccountData.realTimeData.value && showOverviewSection !== false" class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      
      <!-- 左上：账户余额概览 -->
      <div class="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-2">
            <div class="p-1.5 bg-blue-100 rounded-md">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900">账户余额</h3>
              <p class="text-xs text-gray-600">链上实时数据</p>
            </div>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-medium text-green-600">实时</span>
          </div>
        </div>
        
        <div class="grid grid-cols-1 gap-2">
          <!-- TRX余额 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-orange-50 rounded-full">
                  <svg class="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-600">TRX 余额</p>
                  <p class="text-xs text-gray-500">TRON 主币</p>
                </div>
              </div>
              <p class="text-sm font-bold text-orange-600">{{ realTimeAccountData.formatTrx(realTimeAccountData.realTimeData.value?.balance || 0) }}</p>
            </div>
          </div>

          <!-- USDT余额 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-green-50 rounded-full">
                  <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-600">USDT 余额</p>
                  <p class="text-xs text-gray-500">TRC20 代币</p>
                </div>
              </div>
              <p class="text-sm font-bold text-green-600">{{ (realTimeAccountData.realTimeData.value?.usdtBalance || 0).toFixed(6) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右上：质押状态概览 -->
      <div class="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-2">
            <div class="p-1.5 bg-amber-100 rounded-md">
              <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900">质押状态</h3>
              <p class="text-xs text-gray-600">链上实时数据</p>
            </div>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-medium text-green-600">实时</span>
          </div>
        </div>
        
        <div class="grid grid-cols-1 gap-2">
          <!-- 解锁中 TRX -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-yellow-50 rounded-full">
                  <svg class="w-3 h-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-600">解锁中 TRX</p>
                  <p class="text-xs text-gray-500">正在解质押</p>
                </div>
              </div>
              <p class="text-sm font-bold text-yellow-600">{{ formatTrx(realTimeAccountData.realTimeData.value?.stakeStatus?.unlockingTrx || 0) }}</p>
            </div>
          </div>

          <!-- 待提取 TRX -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-purple-50 rounded-full">
                  <svg class="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-600">待提取 TRX</p>
                  <p class="text-xs text-gray-500">可立即提取</p>
                </div>
              </div>
              <p class="text-sm font-bold text-purple-600">{{ formatTrx(realTimeAccountData.realTimeData.value?.stakeStatus?.withdrawableTrx || 0) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 左下：能量资源分布 -->
      <div class="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-2">
            <div class="p-1.5 bg-green-100 rounded-md">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900">能量资源</h3>
              <p class="text-xs text-gray-600">链上实时数据</p>
            </div>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-medium text-green-600">实时</span>
          </div>
        </div>
        
        <div class="grid grid-cols-1 gap-2">
          <!-- 质押获得能量 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-green-50 rounded-full">
                  <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p class="text-xs font-medium text-gray-600">质押获得</p>
              </div>
              <p class="text-sm font-bold text-green-600">{{ realTimeAccountData.formatEnergy(realTimeAccountData.realTimeData.value?.energy.limit || 0) }}</p>
            </div>
          </div>

          <!-- 代理给他人能量 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-indigo-50 rounded-full">
                  <svg class="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p class="text-xs font-medium text-gray-600">代理出去</p>
              </div>
              <p class="text-sm font-bold text-indigo-600">{{ realTimeAccountData.formatEnergy(Math.floor(((realTimeAccountData.realTimeData.value?.energy.delegatedOut || 0) / 1000000) * 76.2)) }}</p>
            </div>
          </div>

          <!-- 代理获得能量 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-teal-50 rounded-full">
                  <svg class="w-3 h-3 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m6 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p class="text-xs font-medium text-gray-600">代理获得</p>
              </div>
              <p class="text-sm font-bold text-teal-600">{{ realTimeAccountData.formatEnergy(Math.floor(((realTimeAccountData.realTimeData.value?.energy.delegatedIn || 0) / 1000000) * 76.2)) }}</p>
            </div>
          </div>

          <!-- 已使用能量 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-red-50 rounded-full">
                  <svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p class="text-xs font-medium text-gray-600">已使用</p>
              </div>
              <p class="text-sm font-bold text-red-600">{{ realTimeAccountData.formatEnergy(realTimeAccountData.realTimeData.value?.energy.used || 0) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右下：带宽资源分布 -->
      <div class="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-2">
            <div class="p-1.5 bg-purple-100 rounded-md">
              <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900">带宽资源</h3>
              <p class="text-xs text-gray-600">链上实时数据</p>
            </div>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-medium text-purple-600">实时</span>
          </div>
        </div>
        
        <div class="grid grid-cols-1 gap-2">
          <!-- 免费带宽 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-green-50 rounded-full">
                  <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p class="text-xs font-medium text-gray-600">每日免费</p>
              </div>
              <p class="text-sm font-bold text-green-600">{{ realTimeAccountData.formatBandwidth(calculateFreeBandwidth()) }}</p>
            </div>
          </div>

          <!-- 质押获得带宽 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-orange-50 rounded-full">
                  <svg class="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <p class="text-xs font-medium text-gray-600">质押获得</p>
              </div>
              <p class="text-sm font-bold text-orange-600">{{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value?.bandwidth.limit || 0) }}</p>
            </div>
          </div>

          <!-- 代理给他人带宽 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-pink-50 rounded-full">
                  <svg class="w-3 h-3 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p class="text-xs font-medium text-gray-600">代理出去</p>
              </div>
              <p class="text-sm font-bold text-pink-600">{{ realTimeAccountData.formatBandwidth(Math.floor(((realTimeAccountData.realTimeData.value?.bandwidth.delegatedOut || 0) / 1000000) * 1000)) }}</p>
            </div>
          </div>

          <!-- 代理获得带宽 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-cyan-50 rounded-full">
                  <svg class="w-3 h-3 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m6 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p class="text-xs font-medium text-gray-600">代理获得</p>
              </div>
              <p class="text-sm font-bold text-cyan-600">{{ realTimeAccountData.formatBandwidth(Math.floor(((realTimeAccountData.realTimeData.value?.bandwidth.delegatedIn || 0) / 1000000) * 1000)) }}</p>
            </div>
          </div>

          <!-- 已使用带宽 -->
          <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="p-1 bg-red-50 rounded-full">
                  <svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p class="text-xs font-medium text-gray-600">已使用</p>
              </div>
              <p class="text-sm font-bold text-red-600">{{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value?.bandwidth.used || 0) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI';
// 使用网络store的实际类型
import { useRealTimeAccountData } from '@/composables/useRealTimeAccountData';
import type { Network } from '@/stores/network';
import { ChevronDown, RefreshCw, Wallet } from 'lucide-vue-next';
import { ref, watch } from 'vue';
type NetworkStoreNetwork = Network

// Props
const props = defineProps<{
  selectedAccount?: EnergyPoolAccount | null
  currentNetwork?: NetworkStoreNetwork | null
  formatTrx: (value: any) => string
  formatEnergy: (value: any) => string
  formatBandwidth: (value: any) => string
  formatAddress: (address: string) => string
  showAccountSection?: boolean
  showNetworkSection?: boolean
  showOverviewSection?: boolean
}>()

// Events
defineEmits<{
  switchAccount: []
  toggleNetworkSwitcher: []
}>()

// 使用实时账户数据composable
const realTimeAccountData = useRealTimeAccountData()

// 复制功能
const copySuccess = ref(false)

// 复制地址到剪贴板
const copyAddress = async () => {
  if (!props.selectedAccount?.tron_address) return
  
  try {
    await navigator.clipboard.writeText(props.selectedAccount.tron_address)
    copySuccess.value = true
    
    // 2秒后重置图标
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
    // 如果 clipboard API 不可用，使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = props.selectedAccount.tron_address
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      copySuccess.value = true
      setTimeout(() => {
        copySuccess.value = false
      }, 2000)
    } catch (fallbackErr) {
      console.error('传统复制方法也失败:', fallbackErr)
    }
    document.body.removeChild(textArea)
  }
}

// 计算免费带宽可用量
const calculateFreeBandwidth = (): number => {
  const bandwidthData = realTimeAccountData.realTimeData.value?.bandwidth
  if (!bandwidthData) return 0
  
  // TRON免费带宽通常是600，但使用API返回的数据更准确
  // 免费带宽可用 = 600 - freeUsed
  const freeLimit = 600 // TRON网络免费带宽额度
  const freeUsed = bandwidthData.freeUsed || 0
  return Math.max(0, freeLimit - freeUsed)
}

// 刷新实时数据
const refreshRealTimeData = async () => {
  if (props.selectedAccount?.tron_address) {
    console.log('🔄 [StakeOverview] 刷新实时数据（包含质押状态）')
    await realTimeAccountData.fetchRealTimeData(
      props.selectedAccount.tron_address,
      props.currentNetwork?.id,
      true, // showToast
      true  // includeStakeStatus
    )
  }
}

// 单独刷新质押状态
const refreshStakeStatus = async () => {
  if (props.selectedAccount?.tron_address) {
    console.log('🔄 [StakeOverview] 刷新质押状态')
    await realTimeAccountData.fetchStakeStatus(
      props.selectedAccount.tron_address,
      props.currentNetwork?.id
    )
  }
}

// 监听选中账户变化，自动获取实时数据
watch(
  () => props.selectedAccount,
  async (newAccount) => {
    if (newAccount?.tron_address) {
      console.log('🔍 [StakeOverview] 账户变化，获取实时数据:', newAccount.name)
      await realTimeAccountData.fetchRealTimeData(
        newAccount.tron_address,
        props.currentNetwork?.id,
        false // 不显示错误提示，避免干扰用户体验
      )
    } else {
      realTimeAccountData.clearData()
    }
  },
  { immediate: true }
)

// 监听网络变化，重新获取实时数据
watch(
  () => props.currentNetwork?.id,
  async (newNetworkId) => {
    if (newNetworkId && props.selectedAccount?.tron_address) {
      console.log('🔍 [StakeOverview] 网络变化，重新获取实时数据:', newNetworkId)
      await realTimeAccountData.fetchRealTimeData(
        props.selectedAccount.tron_address,
        newNetworkId,
        false
      )
    }
  }
)
</script>
