<template>
  <div class="space-y-6">
    <!-- 页面头部 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">能量包管理</h1>
        <p class="mt-1 text-sm text-gray-500">管理TRON能量租赁系统的能量包配置和价格设置</p>
      </div>
      <div class="mt-4 sm:mt-0 flex space-x-3">
        <button
          @click="refreshPackages"
          :disabled="isLoading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': isLoading }]" />
          刷新
        </button>
        <button
          @click="showCreatePackageModal"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus class="h-4 w-4 mr-2" />
          添加能量包
        </button>
      </div>
    </div>

    <!-- 能量包统计 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div 
        v-for="stat in packageStats" 
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
              placeholder="搜索能量包名称或描述"
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
            <option value="active">启用</option>
            <option value="inactive">禁用</option>
          </select>
          
          <select
            v-model="typeFilter"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">所有类型</option>
            <option value="energy">纯能量</option>
            <option value="bandwidth">纯带宽</option>
            <option value="mixed">混合包</option>
          </select>
          
          <button
            @click="exportPackages"
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download class="h-4 w-4 mr-2" />
            导出
          </button>
        </div>
      </div>
    </div>

    <!-- 能量包列表 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
        <span class="ml-2 text-gray-600">加载中...</span>
      </div>
      
      <div v-else-if="filteredPackages.length > 0">
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
                  能量包信息
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  能量/带宽
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  价格
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  销量
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr 
                v-for="pkg in paginatedPackages" 
                :key="pkg.id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    v-model="selectedPackages"
                    :value="pkg.id"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Package class="h-5 w-5 text-indigo-600" />
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ pkg.name }}</div>
                      <div v-if="pkg.description" class="text-sm text-gray-500">{{ pkg.description }}</div>
                      <div class="text-xs text-gray-400">ID: {{ pkg.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      getTypeColor(pkg.type)
                    ]"
                  >
                    {{ getTypeText(pkg.type) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    <div v-if="pkg.energy_amount">
                      <Zap class="h-4 w-4 inline mr-1 text-yellow-500" />
                      {{ formatNumber(pkg.energy_amount) }} Energy
                    </div>
                    <div v-if="pkg.bandwidth_amount">
                      <Wifi class="h-4 w-4 inline mr-1 text-blue-500" />
                      {{ formatNumber(pkg.bandwidth_amount) }} Bandwidth
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    <div class="font-medium">{{ formatCurrency(pkg.price) }} TRX</div>
                    <div v-if="pkg.original_price && pkg.original_price > pkg.price" class="text-xs text-gray-500 line-through">
                      {{ formatCurrency(pkg.original_price) }} TRX
                    </div>
                    <div v-if="pkg.discount_percentage" class="text-xs text-green-600">
                      {{ pkg.discount_percentage }}% 折扣
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      getStatusColor(pkg.status)
                    ]"
                  >
                    {{ getStatusText(pkg.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div class="flex items-center">
                    <ShoppingCart class="h-4 w-4 text-gray-400 mr-1" />
                    {{ pkg.sales_count || 0 }}
                  </div>
                  <div class="text-xs text-gray-500">
                    今日: {{ pkg.today_sales || 0 }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center space-x-2">
                    <button
                      @click="viewPackage(pkg)"
                      class="text-indigo-600 hover:text-indigo-900"
                      title="查看详情"
                    >
                      <Eye class="h-4 w-4" />
                    </button>
                    <button
                      @click="editPackage(pkg)"
                      class="text-green-600 hover:text-green-900"
                      title="编辑"
                    >
                      <Edit class="h-4 w-4" />
                    </button>
                    <button
                      @click="togglePackageStatus(pkg)"
                      :class="[
                        'hover:opacity-75',
                        pkg.status === 'active' ? 'text-red-600' : 'text-green-600'
                      ]"
                      :title="pkg.status === 'active' ? '禁用' : '启用'"
                    >
                      <Power class="h-4 w-4" />
                    </button>
                    <div class="relative">
                      <button
                        @click="togglePackageMenu(pkg.id)"
                        class="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical class="h-4 w-4" />
                      </button>
                      <div 
                        v-if="showPackageMenu === pkg.id"
                        class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                      >
                        <div class="py-1">
                          <button
                            @click="duplicatePackage(pkg)"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Copy class="h-4 w-4 mr-2 inline" />
                            复制能量包
                          </button>
                          <button
                            @click="viewPackageStats(pkg)"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <BarChart3 class="h-4 w-4 mr-2 inline" />
                            查看统计
                          </button>
                          <button
                            @click="deletePackage(pkg)"
                            class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            <Trash2 class="h-4 w-4 mr-2 inline" />
                            删除能量包
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
            v-for="pkg in paginatedPackages" 
            :key="pkg.id"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <input
                  type="checkbox"
                  v-model="selectedPackages"
                  :value="pkg.id"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                />
                <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Package class="h-5 w-5 text-indigo-600" />
                </div>
                <div class="ml-3">
                  <div class="text-sm font-medium text-gray-900">{{ pkg.name }}</div>
                  <div class="text-xs text-gray-400">ID: {{ pkg.id }}</div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    getStatusColor(pkg.status)
                  ]"
                >
                  {{ getStatusText(pkg.status) }}
                </span>
                <button
                  @click="togglePackageMenu(pkg.id)"
                  class="text-gray-400 hover:text-gray-600"
                >
                  <MoreVertical class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-gray-500">类型:</span>
                <span class="ml-1 font-medium">{{ getTypeText(pkg.type) }}</span>
              </div>
              <div>
                <span class="text-gray-500">价格:</span>
                <span class="ml-1 font-medium">{{ formatCurrency(pkg.price) }} TRX</span>
              </div>
              <div v-if="pkg.energy_amount">
                <span class="text-gray-500">能量:</span>
                <span class="ml-1">{{ formatNumber(pkg.energy_amount) }}</span>
              </div>
              <div v-if="pkg.bandwidth_amount">
                <span class="text-gray-500">带宽:</span>
                <span class="ml-1">{{ formatNumber(pkg.bandwidth_amount) }}</span>
              </div>
              <div>
                <span class="text-gray-500">销量:</span>
                <span class="ml-1">{{ pkg.sales_count || 0 }}</span>
              </div>
              <div>
                <span class="text-gray-500">今日销量:</span>
                <span class="ml-1">{{ pkg.today_sales || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 分页 -->
        <div class="px-6 py-4 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
              显示 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, filteredPackages.length) }} 条，
              共 {{ filteredPackages.length }} 条记录
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
        <Package class="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">暂无能量包数据</h3>
        <p class="text-gray-500 mb-4">系统中还没有配置能量包</p>
        <button
          @click="showCreatePackageModal"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus class="h-4 w-4 mr-2" />
          添加能量包
        </button>
      </div>
    </div>

    <!-- 批量操作 -->
    <div 
      v-if="selectedPackages.length > 0"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
    >
      <div class="flex items-center space-x-4">
        <span class="text-sm text-gray-600">已选择 {{ selectedPackages.length }} 个能量包</span>
        <div class="flex items-center space-x-2">
          <button
            @click="batchEnable"
            class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            批量启用
          </button>
          <button
            @click="batchDisable"
            class="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            批量禁用
          </button>
          <button
            @click="batchDelete"
            class="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
          >
            批量删除
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

    <!-- 能量包详情/编辑模态框 -->
    <div 
      v-if="showPackageModal" 
      class="fixed inset-0 z-50 overflow-y-auto"
      @click="closePackageModal"
    >
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>
        <div 
          class="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg"
          @click.stop
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-medium text-gray-900">
              {{ modalMode === 'view' ? '能量包详情' : (modalMode === 'edit' ? '编辑能量包' : '添加能量包') }}
            </h3>
            <button
              @click="closePackageModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <X class="h-6 w-6" />
            </button>
          </div>
          
          <div v-if="modalMode === 'view' && selectedPackage" class="space-y-6">
            <!-- 能量包基本信息 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="text-sm font-medium text-gray-900 mb-3">基本信息</h4>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">名称:</span>
                    <span class="text-sm font-medium text-gray-900">{{ selectedPackage.name }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">类型:</span>
                    <span class="text-sm font-medium text-gray-900">{{ getTypeText(selectedPackage.type) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">状态:</span>
                    <span 
                      :class="[
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getStatusColor(selectedPackage.status)
                      ]"
                    >
                      {{ getStatusText(selectedPackage.status) }}
                    </span>
                  </div>
                  <div v-if="selectedPackage.description" class="flex justify-between">
                    <span class="text-sm text-gray-500">描述:</span>
                    <span class="text-sm font-medium text-gray-900">{{ selectedPackage.description }}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 class="text-sm font-medium text-gray-900 mb-3">价格信息</h4>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm text-gray-500">当前价格:</span>
                    <span class="text-sm font-medium text-gray-900">{{ formatCurrency(selectedPackage.price) }} TRX</span>
                  </div>
                  <div v-if="selectedPackage.original_price" class="flex justify-between">
                    <span class="text-sm text-gray-500">原价:</span>
                    <span class="text-sm font-medium text-gray-900">{{ formatCurrency(selectedPackage.original_price) }} TRX</span>
                  </div>
                  <div v-if="selectedPackage.discount_percentage" class="flex justify-between">
                    <span class="text-sm text-gray-500">折扣:</span>
                    <span class="text-sm font-medium text-green-600">{{ selectedPackage.discount_percentage }}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 资源信息 -->
            <div>
              <h4 class="text-sm font-medium text-gray-900 mb-3">资源配置</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-if="selectedPackage.energy_amount" class="bg-yellow-50 p-4 rounded-lg">
                  <div class="flex items-center">
                    <Zap class="h-5 w-5 text-yellow-500 mr-2" />
                    <span class="text-sm font-medium text-gray-900">能量资源</span>
                  </div>
                  <div class="mt-2 text-lg font-bold text-gray-900">
                    {{ formatNumber(selectedPackage.energy_amount) }} Energy
                  </div>
                </div>
                
                <div v-if="selectedPackage.bandwidth_amount" class="bg-blue-50 p-4 rounded-lg">
                  <div class="flex items-center">
                    <Wifi class="h-5 w-5 text-blue-500 mr-2" />
                    <span class="text-sm font-medium text-gray-900">带宽资源</span>
                  </div>
                  <div class="mt-2 text-lg font-bold text-gray-900">
                    {{ formatNumber(selectedPackage.bandwidth_amount) }} Bandwidth
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 销售统计 -->
            <div>
              <h4 class="text-sm font-medium text-gray-900 mb-3">销售统计</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="text-sm text-gray-500">总销量</div>
                  <div class="text-lg font-bold text-gray-900">{{ selectedPackage.sales_count || 0 }}</div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="text-sm text-gray-500">今日销量</div>
                  <div class="text-lg font-bold text-gray-900">{{ selectedPackage.today_sales || 0 }}</div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="text-sm text-gray-500">总收入</div>
                  <div class="text-lg font-bold text-gray-900">{{ formatCurrency((selectedPackage.sales_count || 0) * selectedPackage.price) }} TRX</div>
                </div>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                @click="editPackage(selectedPackage)"
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                编辑能量包
              </button>
              <button
                @click="duplicatePackage(selectedPackage)"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                复制能量包
              </button>
            </div>
          </div>
          
          <form v-else-if="modalMode === 'edit' || modalMode === 'create'" @submit.prevent="savePackage">
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">能量包名称</label>
                  <input
                    v-model="packageForm.name"
                    type="text"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="请输入能量包名称"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">能量包类型</label>
                  <select
                    v-model="packageForm.type"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="energy">纯能量</option>
                    <option value="bandwidth">纯带宽</option>
                    <option value="mixed">混合包</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
                <textarea
                  v-model="packageForm.description"
                  rows="3"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="请输入能量包描述"
                ></textarea>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-if="packageForm.type === 'energy' || packageForm.type === 'mixed'">
                  <label class="block text-sm font-medium text-gray-700 mb-2">能量数量</label>
                  <input
                    v-model.number="packageForm.energy_amount"
                    type="number"
                    min="0"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
                
                <div v-if="packageForm.type === 'bandwidth' || packageForm.type === 'mixed'">
                  <label class="block text-sm font-medium text-gray-700 mb-2">带宽数量</label>
                  <input
                    v-model.number="packageForm.bandwidth_amount"
                    type="number"
                    min="0"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">价格 (TRX)</label>
                  <input
                    v-model.number="packageForm.price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">原价 (TRX)</label>
                  <input
                    v-model.number="packageForm.original_price"
                    type="number"
                    step="0.01"
                    min="0"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">折扣百分比 (%)</label>
                <input
                  v-model.number="packageForm.discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                />
              </div>
              
              <div class="flex items-center">
                <input
                  :checked="packageForm.status === 'active'"
                  @change="packageForm.status = ($event.target as HTMLInputElement).checked ? 'active' : 'inactive'"
                  type="checkbox"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label class="ml-2 block text-sm text-gray-900">
                  启用能量包
                </label>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="closePackageModal"
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
import { energyPackagesAPI } from '@/services/api'
import type { EnergyPackage } from '@/types/api'
import {
  BarChart3,
  Copy,
  Download,
  Edit,
  Eye,
  Loader2,
  MoreVertical,
  Package,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Wifi,
  X,
  Zap
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

// 响应式数据
const isLoading = ref(false)
const isSaving = ref(false)
const searchQuery = ref('')
const statusFilter = ref<'active' | 'inactive' | ''>('')
const typeFilter = ref<'energy' | 'bandwidth' | 'mixed' | ''>('')
const currentPage = ref(1)
const pageSize = ref(10)
const selectAll = ref(false)
const selectedPackages = ref<string[]>([])
const showPackageMenu = ref('')
const showPackageModal = ref(false)
const modalMode = ref<'view' | 'edit' | 'create'>('view')
const selectedPackage = ref<EnergyPackage | null>(null)

// 数据
const packages = ref<EnergyPackage[]>([])

// 能量包统计
const packageStats = ref([
  {
    label: '总能量包',
    value: 0,
    icon: Package,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    change: null,
    changeColor: ''
  },
  {
    label: '启用中',
    value: 0,
    icon: Zap,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    change: null,
    changeColor: ''
  },
  {
    label: '今日销量',
    value: 0,
    icon: ShoppingCart,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    change: null,
    changeColor: ''
  },
  {
    label: '总销量',
    value: 0,
    icon: BarChart3,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    change: null,
    changeColor: ''
  }
])

// 能量包表单
const packageForm = reactive<{
  name: string
  type: 'energy' | 'bandwidth' | 'mixed'
  description: string
  energy_amount: number
  bandwidth_amount: number
  price: number
  original_price: number
  discount_percentage: number
  status: 'active' | 'inactive'
}>({
  name: '',
  type: 'energy',
  description: '',
  energy_amount: 0,
  bandwidth_amount: 0,
  price: 0,
  original_price: 0,
  discount_percentage: 0,
  status: 'active'
})

// 计算属性
const filteredPackages = computed(() => {
  let filtered = packages.value
  
  // 搜索过滤
  if (searchQuery.value.trim()) {
    const search = searchQuery.value.toLowerCase()
    filtered = filtered.filter(pkg => 
      pkg.name.toLowerCase().includes(search) ||
      (pkg.description && pkg.description.toLowerCase().includes(search))
    )
  }
  
  // 状态过滤
  if (statusFilter.value) {
    filtered = filtered.filter(pkg => pkg.status === statusFilter.value)
  }
  
  // 类型过滤
  if (typeFilter.value) {
    filtered = filtered.filter(pkg => pkg.type === typeFilter.value)
  }
  
  return filtered
})

const totalPages = computed(() => {
  return Math.ceil(filteredPackages.value.length / pageSize.value)
})

const paginatedPackages = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredPackages.value.slice(start, end)
})

// 方法
const formatNumber = (num: number) => {
  return num.toLocaleString('zh-CN')
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

const getTypeText = (type: 'energy' | 'bandwidth' | 'mixed') => {
  const typeMap: Record<'energy' | 'bandwidth' | 'mixed', string> = {
    energy: '纯能量',
    bandwidth: '纯带宽',
    mixed: '混合包'
  }
  return typeMap[type]
}

const getTypeColor = (type: 'energy' | 'bandwidth' | 'mixed') => {
  const colorMap: Record<'energy' | 'bandwidth' | 'mixed', string> = {
    energy: 'bg-yellow-100 text-yellow-800',
    bandwidth: 'bg-blue-100 text-blue-800',
    mixed: 'bg-green-100 text-green-800'
  }
  return colorMap[type]
}

const getStatusText = (status: 'active' | 'inactive') => {
  const statusMap: Record<'active' | 'inactive', string> = {
    active: '启用',
    inactive: '禁用'
  }
  return statusMap[status]
}

const getStatusColor = (status: 'active' | 'inactive') => {
  const colorMap: Record<'active' | 'inactive', string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800'
  }
  return colorMap[status]
}

// 加载能量包数据
const loadPackages = async () => {
  try {
    isLoading.value = true
    
    const response = await energyPackagesAPI.getEnergyPackages({
      page: 1,
      limit: 1000 // 加载所有能量包用于前端分页和搜索
    })
    
    if (response.data.success) {
      packages.value = response.data.data.items || []
      updatePackageStats()
    }
  } catch (error) {
    console.error('加载能量包数据失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 更新能量包统计
const updatePackageStats = () => {
  const totalPackages = packages.value.length
  const activePackages = packages.value.filter(p => p.status === 'active').length
  const todaySales = packages.value.reduce((sum, p) => sum + (p.today_sales || 0), 0)
  const totalSales = packages.value.reduce((sum, p) => sum + (p.sales_count || 0), 0)
  
  packageStats.value[0].value = totalPackages
  packageStats.value[1].value = activePackages
  packageStats.value[2].value = todaySales
  packageStats.value[3].value = totalSales
}

// 刷新数据
const refreshPackages = () => {
  loadPackages()
}

// 能量包操作
const viewPackage = (pkg: EnergyPackage) => {
  selectedPackage.value = pkg
  modalMode.value = 'view'
  showPackageModal.value = true
  showPackageMenu.value = ''
}

const editPackage = (pkg: EnergyPackage) => {
  selectedPackage.value = pkg
  modalMode.value = 'edit'
  Object.assign(packageForm, {
    name: pkg.name,
    type: pkg.type,
    description: pkg.description || '',
    energy_amount: pkg.energy_amount || 0,
    bandwidth_amount: pkg.bandwidth_amount || 0,
    price: pkg.price,
    original_price: pkg.original_price || 0,
    discount_percentage: pkg.discount_percentage || 0,
    is_active: pkg.status === 'active'
  })
  showPackageModal.value = true
  showPackageMenu.value = ''
}

const showCreatePackageModal = () => {
  selectedPackage.value = null
  modalMode.value = 'create'
  resetPackageForm()
  showPackageModal.value = true
}

const closePackageModal = () => {
  showPackageModal.value = false
  selectedPackage.value = null
  resetPackageForm()
}

const resetPackageForm = () => {
  Object.assign(packageForm, {
    name: '',
    type: 'energy',
    description: '',
    energy_amount: 0,
    bandwidth_amount: 0,
    price: 0,
    original_price: 0,
    discount_percentage: 0,
    is_active: true
  })
}

const savePackage = async () => {
  try {
    isSaving.value = true
    
    let response
    if (modalMode.value === 'edit' && selectedPackage.value) {
      response = await energyPackagesAPI.updateEnergyPackage(selectedPackage.value.id, {
        name: packageForm.name,
        type: packageForm.type,
        description: packageForm.description,
        energy_amount: packageForm.energy_amount,
        bandwidth_amount: packageForm.bandwidth_amount,
        price: packageForm.price,
        original_price: packageForm.original_price,
        discount_percentage: packageForm.discount_percentage,
        status: packageForm.status
      })
    } else {
      response = await energyPackagesAPI.createEnergyPackage({
        name: packageForm.name,
        type: packageForm.type,
        description: packageForm.description,
        energy_amount: packageForm.energy_amount,
        bandwidth_amount: packageForm.bandwidth_amount,
        price: packageForm.price,
        original_price: packageForm.original_price,
        discount_percentage: packageForm.discount_percentage,
        status: packageForm.status
      })
    }
    
    if (response.data.success) {
      await loadPackages()
      closePackageModal()
    }
  } catch (error) {
    console.error('保存能量包失败:', error)
  } finally {
    isSaving.value = false
  }
}

const togglePackageStatus = async (pkg: EnergyPackage) => {
  try {
    const newStatus = pkg.status === 'active' ? 'inactive' : 'active'
    const response = await energyPackagesAPI.updateEnergyPackage(pkg.id, { status: newStatus })
    
    if (response.data.success) {
      pkg.status = newStatus
      updatePackageStats()
    }
  } catch (error) {
    console.error('更新能量包状态失败:', error)
  }
  
  showPackageMenu.value = ''
}

const duplicatePackage = async (pkg: EnergyPackage) => {
  try {
    const response = await energyPackagesAPI.createEnergyPackage({
      name: `${pkg.name} (副本)`,
      type: pkg.type,
      description: pkg.description,
      energy_amount: pkg.energy_amount,
      bandwidth_amount: pkg.bandwidth_amount,
      price: pkg.price,
      original_price: pkg.original_price,
      discount_percentage: pkg.discount_percentage,
      status: 'inactive' // 副本默认禁用
    })
    
    if (response.data.success) {
      await loadPackages()
      alert('能量包复制成功！')
    }
  } catch (error) {
    console.error('复制能量包失败:', error)
  }
  
  showPackageMenu.value = ''
}

const viewPackageStats = (pkg: EnergyPackage) => {
  // TODO: 跳转到能量包统计页面
  console.log('查看能量包统计:', pkg.id)
  showPackageMenu.value = ''
}

const deletePackage = async (pkg: EnergyPackage) => {
  if (!confirm(`确定要删除能量包 "${pkg.name}" 吗？此操作不可撤销。`)) {
    return
  }
  
  try {
    const response = await energyPackagesAPI.deleteEnergyPackage(pkg.id)
    
    if (response.data.success) {
      await loadPackages()
      alert('能量包删除成功！')
    }
  } catch (error) {
    console.error('删除能量包失败:', error)
  }
  
  showPackageMenu.value = ''
}

const togglePackageMenu = (packageId: string) => {
  showPackageMenu.value = showPackageMenu.value === packageId ? '' : packageId
}

// 批量操作
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedPackages.value = paginatedPackages.value.map(pkg => pkg.id)
  } else {
    selectedPackages.value = []
  }
}

const batchEnable = async () => {
  if (!confirm(`确定要启用选中的 ${selectedPackages.value.length} 个能量包吗？`)) {
    return
  }
  
  try {
    await Promise.all(
      selectedPackages.value.map(packageId => 
        energyPackagesAPI.updateEnergyPackage(packageId, { status: 'active' })
      )
    )
    
    await loadPackages()
    clearSelection()
  } catch (error) {
    console.error('批量启用失败:', error)
  }
}

const batchDisable = async () => {
  if (!confirm(`确定要禁用选中的 ${selectedPackages.value.length} 个能量包吗？`)) {
    return
  }
  
  try {
    await Promise.all(
      selectedPackages.value.map(packageId => 
        energyPackagesAPI.updateEnergyPackage(packageId, { status: 'inactive' })
      )
    )
    
    await loadPackages()
    clearSelection()
  } catch (error) {
    console.error('批量禁用失败:', error)
  }
}

const batchDelete = async () => {
  if (!confirm(`确定要删除选中的 ${selectedPackages.value.length} 个能量包吗？此操作不可撤销。`)) {
    return
  }
  
  try {
    await Promise.all(
      selectedPackages.value.map(packageId => 
        energyPackagesAPI.deleteEnergyPackage(packageId)
      )
    )
    
    await loadPackages()
    clearSelection()
  } catch (error) {
    console.error('批量删除失败:', error)
  }
}

const clearSelection = () => {
  selectedPackages.value = []
  selectAll.value = false
}

// 导出功能
const exportPackages = () => {
  const csvContent = [
    ['名称', '类型', '能量数量', '带宽数量', '价格', '原价', '折扣', '状态', '销量', '今日销量'].join(','),
    ...filteredPackages.value.map(pkg => [
      pkg.name,
      getTypeText(pkg.type),
      pkg.energy_amount || 0,
      pkg.bandwidth_amount || 0,
      pkg.price,
      pkg.original_price || 0,
      pkg.discount_percentage || 0,
      getStatusText(pkg.status),
      pkg.sales_count || 0,
      pkg.today_sales || 0
    ].join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `energy_packages_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

// 点击外部关闭菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showPackageMenu.value = ''
  }
}

// 生命周期
onMounted(() => {
  loadPackages()
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