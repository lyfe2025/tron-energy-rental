<template>
  <div class="space-y-6">
    <!-- 页面头部 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">机器人管理</h1>
        <p class="mt-1 text-sm text-gray-500">管理TRON能量租赁系统的机器人配置和状态监控</p>
      </div>
      <div class="mt-4 sm:mt-0 flex space-x-3">
        <button
          @click="refreshBots"
          :disabled="isLoading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': isLoading }]" />
          刷新
        </button>
        <button
          @click="showCreateBotModal"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus class="h-4 w-4 mr-2" />
          添加机器人
        </button>
      </div>
    </div>

    <!-- 机器人统计 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div 
        v-for="stat in botStats" 
        :key="stat.label"
        class="bg-white rounded-lg shadow-sm p-6"
      >
        <div class="flex items-center">
          <div :class="['h-12 w-12 rounded-lg flex items-center justify-center', stat.bgColor]">
            <component :is="stat.icon" :class="['h-6 w-6', stat.iconColor]" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
            <p v-if="stat.change" :class="['text-sm', stat.changeColor]">{{ stat.change }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
        <div class="flex-1 max-w-lg">
          <div class="relative">
            <Search class="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索机器人名称或地址"
              class="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          <select
            v-model="statusFilter"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">所有状态</option>
            <option value="online">在线</option>
            <option value="offline">离线</option>
            <option value="error">错误</option>
            <option value="maintenance">维护中</option>
          </select>
          
          <select
            v-model="typeFilter"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">所有类型</option>
            <option value="energy">能量机器人</option>
            <option value="bandwidth">带宽机器人</option>
            <option value="mixed">混合机器人</option>
          </select>
          
          <button
            @click="exportBots"
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download class="h-4 w-4 mr-2" />
            导出
          </button>
        </div>
      </div>
    </div>

    <!-- 机器人列表 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
        <span class="ml-2 text-gray-600">加载中...</span>
      </div>
      
      <div v-else-if="filteredBots.length > 0">
        <!-- 桌面端表格 -->
        <div class="hidden md:block overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    v-model="selectAll"
                    @change="toggleSelectAll"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  机器人信息
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  余额
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  今日订单
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后活动
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr 
                v-for="bot in paginatedBots" 
                :key="bot.id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    v-model="selectedBots"
                    :value="bot.id"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Bot class="h-5 w-5 text-indigo-600" />
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ bot.name }}</div>
                      <div class="text-sm text-gray-500 font-mono">{{ formatAddress(bot.address) }}</div>
                      <div v-if="bot.description" class="text-sm text-gray-500">{{ bot.description }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      getTypeColor(bot.type)
                    ]"
                  >
                    {{ getTypeText(bot.type) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div 
                      :class="[
                        'h-2 w-2 rounded-full mr-2',
                        getStatusDotColor(bot.status)
                      ]"
                    ></div>
                    <span 
                      :class="[
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getStatusColor(bot.status)
                      ]"
                    >
                      {{ getStatusText(bot.status) }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ formatCurrency(bot.balance) }} TRX
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ formatCurrency(bot.energy_balance) }} Energy
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div class="flex items-center">
                    <ShoppingCart class="h-4 w-4 text-gray-400 mr-1" />
                    {{ bot.today_orders || 0 }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ bot.last_activity ? formatDateTime(bot.last_activity) : '从未活动' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center space-x-2">
                    <button
                      @click="viewBot(bot)"
                      class="text-indigo-600 hover:text-indigo-900"
                      title="查看详情"
                    >
                      <Eye class="h-4 w-4" />
                    </button>
                    <button
                      @click="editBot(bot)"
                      class="text-green-600 hover:text-green-900"
                      title="编辑"
                    >
                      <Edit class="h-4 w-4" />
                    </button>
                    <button
                      @click="toggleBotStatus(bot)"
                      :class="[
                        'hover:opacity-75',
                        bot.status === 'active' ? 'text-red-600' : 'text-green-600'
                      ]"
                      :title="bot.status === 'active' ? '停用' : '启用'"
                    >
                      <Power class="h-4 w-4" />
                    </button>
                    <div class="relative">
                      <button
                        @click="toggleBotMenu(bot.id)"
                        class="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical class="h-4 w-4" />
                      </button>
                      <div 
                        v-if="showBotMenu === bot.id"
                        class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                      >
                        <div class="py-1">
                          <button
                            @click="testBot(bot)"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Zap class="h-4 w-4 mr-2 inline" />
                            测试连接
                          </button>
                          <button
                            @click="rechargeBot(bot)"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <DollarSign class="h-4 w-4 mr-2 inline" />
                            充值余额
                          </button>
                          <button
                            @click="viewBotLogs(bot)"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <FileText class="h-4 w-4 mr-2 inline" />
                            查看日志
                          </button>
                          <button
                            @click="resetBot(bot)"
                            class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            <RotateCcw class="h-4 w-4 mr-2 inline" />
                            重置机器人
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- 移动端卡片 -->
        <div class="md:hidden space-y-4 p-4">
          <div 
            v-for="bot in paginatedBots" 
            :key="bot.id"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <input
                  type="checkbox"
                  v-model="selectedBots"
                  :value="bot.id"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                />
                <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Bot class="h-5 w-5 text-indigo-600" />
                </div>
                <div class="ml-3">
                  <div class="text-sm font-medium text-gray-900">{{ bot.name }}</div>
                  <div class="text-sm text-gray-500 font-mono">{{ formatAddress(bot.address) }}</div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div 
                  :class="[
                    'h-2 w-2 rounded-full',
                    getStatusDotColor(bot.status)
                  ]"
                ></div>
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    getStatusColor(bot.status)
                  ]"
                >
                  {{ getStatusText(bot.status) }}
                </span>
                <button
                  @click="toggleBotMenu(bot.id)"
                  class="text-gray-400 hover:text-gray-600"
                >
                  <MoreVertical class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-gray-500">类型:</span>
                <span class="ml-1 font-medium">{{ getTypeText(bot.type) }}</span>
              </div>
              <div>
                <span class="text-gray-500">余额:</span>
                <span class="ml-1 font-medium">{{ formatCurrency(bot.balance) }} TRX</span>
              </div>
              <div>
                <span class="text-gray-500">今日订单:</span>
                <span class="ml-1">{{ bot.today_orders || 0 }}</span>
              </div>
              <div>
                <span class="text-gray-500">最后活动:</span>
                <span class="ml-1">{{ bot.last_activity ? formatDate(bot.last_activity) : '从未' }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 分页 -->
        <div class="px-6 py-4 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
              显示 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, filteredBots.length) }} 条，
              共 {{ filteredBots.length }} 条记录
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span class="px-3 py-1 text-sm text-gray-700">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-12">
        <Bot class="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无机器人数据</h3>
        <p class="text-gray-500 mb-4">系统中还没有配置机器人</p>
        <button
          @click="showCreateBotModal"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus class="h-4 w-4 mr-2" />
          添加机器人
        </button>
      </div>
    </div>

    <!-- 批量操作 -->
    <div 
      v-if="selectedBots.length > 0"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
    >
      <div class="flex items-center space-x-4">
        <span class="text-sm text-gray-600">已选择 {{ selectedBots.length }} 个机器人</span>
        <div class="flex items-center space-x-2">
          <button
            @click="batchStart"
            class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            批量启动
          </button>
          <button
            @click="batchStop"
            class="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            批量停止
          </button>
          <button
            @click="batchTest"
            class="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            批量测试
          </button>
          <button
            @click="clearSelection"
            class="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
          >
            取消选择
          </button>
        </div>
      </div>
    </div>

    <!-- 机器人详情/编辑模态框 -->
    <div 
      v-if="showBotModal" 
      class="fixed inset-0 z-50 overflow-y-auto"
      @click="closeBotModal"
    >
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>
        <div 
          class="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg"
          @click.stop
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-medium text-gray-900">
              {{ modalMode === 'view' ? '机器人详情' : (modalMode === 'edit' ? '编辑机器人' : '添加机器人') }}
            </h3>
            <button
              @click="closeBotModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <X class="h-6 w-6" />
            </button>
          </div>
          
          <div v-if="modalMode === 'view' && selectedBot" class="space-y-6">
            <!-- 机器人基本信息 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="text-sm font-medium text-gray-900 mb-3">基本信息</h4>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">名称:</span>
                    <span class="text-sm font-medium text-gray-900">{{ selectedBot.name }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">地址:</span>
                    <span class="text-sm font-medium text-gray-900 font-mono">{{ selectedBot.address }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">类型:</span>
                    <span class="text-sm font-medium text-gray-900">{{ getTypeText(selectedBot.type) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">状态:</span>
                    <span 
                      :class="[
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getStatusColor(selectedBot.status)
                      ]"
                    >
                      {{ getStatusText(selectedBot.status) }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 class="text-sm font-medium text-gray-900 mb-3">余额信息</h4>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">TRX余额:</span>
                    <span class="text-sm font-medium text-gray-900">{{ formatCurrency(selectedBot.balance) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">能量余额:</span>
                    <span class="text-sm font-medium text-gray-900">{{ formatCurrency(selectedBot.energy_balance) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">今日订单:</span>
                    <span class="text-sm font-medium text-gray-900">{{ selectedBot.today_orders || 0 }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">总订单:</span>
                    <span class="text-sm font-medium text-gray-900">{{ selectedBot.total_orders || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                @click="editBot(selectedBot)"
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                编辑机器人
              </button>
              <button
                @click="testBot(selectedBot)"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                测试连接
              </button>
            </div>
          </div>
          
          <form v-else-if="modalMode === 'edit' || modalMode === 'create'" @submit.prevent="saveBot">
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">机器人名称</label>
                  <input
                    v-model="botForm.name"
                    type="text"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="请输入机器人名称"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">TRON地址</label>
                  <input
                    v-model="botForm.address"
                    type="text"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="请输入TRON地址"
                  />
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">私钥</label>
                  <input
                    v-model="botForm.private_key"
                    type="password"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="请输入私钥"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">机器人类型</label>
                  <select
                    v-model="botForm.type"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="energy">能量机器人</option>
                    <option value="bandwidth">带宽机器人</option>
                    <option value="mixed">混合机器人</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
                <textarea
                  v-model="botForm.description"
                  rows="3"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="请输入机器人描述"
                ></textarea>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">最小订单金额 (TRX)</label>
                  <input
                    v-model.number="botForm.min_order_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">最大订单金额 (TRX)</label>
                  <input
                    v-model.number="botForm.max_order_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div class="flex items-center">
                <input
                  v-model="botForm.is_active"
                  type="checkbox"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label class="ml-2 block text-sm text-gray-900">
                  启用机器人
                </label>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="closeBotModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Loader2 v-if="isSaving" class="animate-spin h-4 w-4 mr-2" />
                {{ isSaving ? '保存中...' : (modalMode === 'edit' ? '更新' : '创建') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { botsAPI } from '@/services/api'
import type { Bot } from '@/types/api'
import {
  AlertTriangle,
  Cpu,
  DollarSign,
  Download,
  Edit,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Wifi,
  WifiOff,
  X,
  Zap
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

// 响应式数据
const isLoading = ref(false)
const isSaving = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const selectAll = ref(false)
const selectedBots = ref<string[]>([])
const showBotMenu = ref('')
const showBotModal = ref(false)
const modalMode = ref<'view' | 'edit' | 'create'>('view')
const selectedBot = ref<Bot | null>(null)

// 数据
const bots = ref<Bot[]>([])

// 机器人统计
const botStats = ref([
  {
    label: '总机器人',
    value: 0,
    icon: Cpu,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    change: null,
    changeColor: ''
  },
  {
    label: '在线机器人',
    value: 0,
    icon: Wifi,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    change: null,
    changeColor: ''
  },
  {
    label: '离线机器人',
    value: 0,
    icon: WifiOff,
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    change: null,
    changeColor: ''
  },
  {
    label: '异常机器人',
    value: 0,
    icon: AlertTriangle,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    change: null,
    changeColor: ''
  }
])

// 机器人表单
const botForm = reactive({
  name: '',
  address: '',
  private_key: '',
  type: 'energy',
  description: '',
  min_order_amount: 0,
  max_order_amount: 0,
  is_active: true
})

// 计算属性
const filteredBots = computed(() => {
  let filtered = bots.value
  
  // 搜索过滤
  if (searchQuery.value.trim()) {
    const search = searchQuery.value.toLowerCase()
    filtered = filtered.filter(bot => 
      bot.name.toLowerCase().includes(search) ||
      bot.address.toLowerCase().includes(search)
    )
  }
  
  // 状态过滤
  if (statusFilter.value) {
    filtered = filtered.filter(bot => bot.status === statusFilter.value)
  }
  
  // 类型过滤
  if (typeFilter.value) {
    filtered = filtered.filter(bot => bot.type === typeFilter.value)
  }
  
  return filtered
})

const totalPages = computed(() => {
  return Math.ceil(filteredBots.value.length / pageSize.value)
})

const paginatedBots = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredBots.value.slice(start, end)
})

// 方法
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

const formatAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    energy: '能量机器人',
    bandwidth: '带宽机器人',
    mixed: '混合机器人'
  }
  return typeMap[type] || type
}

const getTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    energy: 'bg-blue-100 text-blue-800',
    bandwidth: 'bg-purple-100 text-purple-800',
    mixed: 'bg-green-100 text-green-800'
  }
  return colorMap[type] || 'bg-gray-100 text-gray-800'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    online: '在线',
    offline: '离线',
    error: '错误',
    maintenance: '维护中'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    online: 'bg-green-100 text-green-800',
    offline: 'bg-gray-100 text-gray-800',
    error: 'bg-red-100 text-red-800',
    maintenance: 'bg-yellow-100 text-yellow-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}

const getStatusDotColor = (status: string) => {
  const colorMap: Record<string, string> = {
    online: 'bg-green-400',
    offline: 'bg-gray-400',
    error: 'bg-red-400',
    maintenance: 'bg-yellow-400'
  }
  return colorMap[status] || 'bg-gray-400'
}

// 加载机器人数据
const loadBots = async () => {
  try {
    isLoading.value = true
    
    const response = await botsAPI.getBots({
      page: 1,
      limit: 1000 // 加载所有机器人用于前端分页和搜索
    })
    
    if (response.data.success) {
      bots.value = response.data.data?.items || []
      updateBotStats()
    }
  } catch (error) {
    console.error('加载机器人数据失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 更新机器人统计
const updateBotStats = () => {
  const totalBots = bots.value.length
  const onlineBots = bots.value.filter(b => b.status === 'active').length
  const offlineBots = bots.value.filter(b => b.status === 'inactive').length
  const errorBots = bots.value.filter(b => b.status === 'maintenance').length
  
  botStats.value[0].value = totalBots
  botStats.value[1].value = onlineBots
  botStats.value[2].value = offlineBots
  botStats.value[3].value = errorBots
}

// 刷新数据
const refreshBots = () => {
  loadBots()
}

// 机器人操作
const viewBot = (bot: Bot) => {
  selectedBot.value = bot
  modalMode.value = 'view'
  showBotModal.value = true
  showBotMenu.value = ''
}

const editBot = (bot: Bot) => {
  selectedBot.value = bot
  modalMode.value = 'edit'
  Object.assign(botForm, {
    name: bot.name,
    address: bot.address,
    private_key: bot.private_key || '',
    type: bot.type,
    description: bot.description || '',
    min_order_amount: bot.min_order_amount || 0,
    max_order_amount: bot.max_order_amount || 0,
    is_active: bot.status === 'active'
  })
  showBotModal.value = true
  showBotMenu.value = ''
}

const showCreateBotModal = () => {
  selectedBot.value = null
  modalMode.value = 'create'
  resetBotForm()
  showBotModal.value = true
}

const closeBotModal = () => {
  showBotModal.value = false
  selectedBot.value = null
  resetBotForm()
}

const resetBotForm = () => {
  Object.assign(botForm, {
    name: '',
    address: '',
    private_key: '',
    type: 'energy',
    description: '',
    min_order_amount: 0,
    max_order_amount: 0,
    is_active: true
  })
}

const saveBot = async () => {
  try {
    isSaving.value = true
    
    let response
    if (modalMode.value === 'edit' && selectedBot.value) {
      response = await botsAPI.updateBot(selectedBot.value.id, {
        name: botForm.name,
        address: botForm.address,
        private_key: botForm.private_key,
        type: botForm.type,
        description: botForm.description,
        min_order_amount: botForm.min_order_amount,
        max_order_amount: botForm.max_order_amount,
        status: botForm.is_active ? 'active' : 'inactive'
      })
    } else {
      response = await botsAPI.createBot({
        name: botForm.name,
        address: botForm.address,
        private_key: botForm.private_key,
        type: botForm.type,
        description: botForm.description,
        min_order_amount: botForm.min_order_amount,
        max_order_amount: botForm.max_order_amount,
        status: botForm.is_active ? 'active' : 'inactive'
      })
    }
    
    if (response.data.success) {
      await loadBots()
      closeBotModal()
    }
  } catch (error) {
    console.error('保存机器人失败:', error)
  } finally {
    isSaving.value = false
  }
}

const toggleBotStatus = async (bot: Bot) => {
  try {
    const newStatus = bot.status === 'active' ? 'inactive' : 'active'
    const response = await botsAPI.updateBot(bot.id, { status: newStatus })
    
    if (response.data.success) {
      bot.status = newStatus
      updateBotStats()
    }
  } catch (error) {
    console.error('更新机器人状态失败:', error)
  }
  
  showBotMenu.value = ''
}

const testBot = async (bot: any) => {
  try {
    const response = await botsAPI.testBot(bot.id)
    
    if (response.data.success) {
      alert('机器人连接测试成功！')
    } else {
      alert(`机器人连接测试失败：${response.data.message}`)
    }
  } catch (error) {
    console.error('测试机器人失败:', error)
    alert('机器人连接测试失败，请检查网络连接')
  }
  
  showBotMenu.value = ''
}

const rechargeBot = (bot: any) => {
  const amount = prompt(`请输入要充值的TRX金额（当前余额：${bot.balance} TRX）：`)
  if (amount === null) return
  
  const rechargeAmount = parseFloat(amount)
  if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
    alert('请输入有效的充值金额')
    return
  }
  
  // TODO: 实现机器人充值API调用
  console.log('充值机器人:', bot.id, rechargeAmount)
  showBotMenu.value = ''
}

const viewBotLogs = (bot: any) => {
  // TODO: 跳转到机器人日志页面
  console.log('查看机器人日志:', bot.id)
  showBotMenu.value = ''
}

const resetBot = async (bot: any) => {
  if (!confirm(`确定要重置机器人 "${bot.name}" 吗？这将清除所有缓存数据。`)) {
    return
  }
  
  try {
    const response = await botsAPI.resetBot(bot.id)
    
    if (response.data.success) {
      alert('机器人重置成功！')
      await loadBots()
    }
  } catch (error) {
    console.error('重置机器人失败:', error)
  }
  
  showBotMenu.value = ''
}

const toggleBotMenu = (botId: string) => {
  showBotMenu.value = showBotMenu.value === botId ? '' : botId
}

// 批量操作
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedBots.value = paginatedBots.value.map(bot => bot.id)
  } else {
    selectedBots.value = []
  }
}

const batchStart = async () => {
  if (!confirm(`确定要启动选中的 ${selectedBots.value.length} 个机器人吗？`)) {
    return
  }
  
  try {
    await Promise.all(
      selectedBots.value.map(botId => 
        botsAPI.updateBot(botId, { status: 'active' })
      )
    )
    
    await loadBots()
    clearSelection()
  } catch (error) {
    console.error('批量启动失败:', error)
  }
}

const batchStop = async () => {
  if (!confirm(`确定要停止选中的 ${selectedBots.value.length} 个机器人吗？`)) {
    return
  }
  
  try {
    await Promise.all(
      selectedBots.value.map(botId => 
        botsAPI.updateBot(botId, { status: 'inactive' })
      )
    )
    
    await loadBots()
    clearSelection()
  } catch (error) {
    console.error('批量停止失败:', error)
  }
}

const batchTest = async () => {
  if (!confirm(`确定要测试选中的 ${selectedBots.value.length} 个机器人吗？`)) {
    return
  }
  
  try {
    const results = await Promise.allSettled(
      selectedBots.value.map(botId => botsAPI.testBot(botId))
    )
    
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failCount = results.length - successCount
    
    alert(`批量测试完成：成功 ${successCount} 个，失败 ${failCount} 个`)
    clearSelection()
  } catch (error) {
    console.error('批量测试失败:', error)
  }
}

const clearSelection = () => {
  selectedBots.value = []
  selectAll.value = false
}

// 导出功能
const exportBots = () => {
  const csvContent = [
    ['名称', '地址', '类型', '状态', 'TRX余额', '能量余额', '今日订单', '最后活动'].join(','),
    ...filteredBots.value.map(bot => [
      bot.name,
      bot.address,
      getTypeText(bot.type),
      getStatusText(bot.status),
      bot.balance,
      bot.energy_balance,
      bot.today_orders || 0,
      bot.last_activity ? formatDateTime(bot.last_activity) : '从未活动'
    ].join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `bots_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

// 点击外部关闭菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showBotMenu.value = ''
  }
}

// 生命周期
onMounted(() => {
  loadBots()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>