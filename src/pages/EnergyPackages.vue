<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 页面标题 -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <h1 class="text-2xl font-bold text-gray-900">能量包管理</h1>
          <p class="mt-1 text-sm text-gray-500">管理和配置能量包产品</p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 统计卡片 -->
    <PackageStats :packages="packages" />

      <!-- 搜索和筛选 -->
      <PackageSearch
        v-model="filters"
        @refresh="refreshPackages"
        @export="exportPackages"
        @create="showCreatePackageModal"
      />

      <!-- 能量包列表 -->
    <PackageList
      :packages="paginatedPackages"
      :current-page="pagination.currentPage"
      :page-size="pagination.pageSize"
      :selected-packages="selectedPackages"
      :is-loading="isLoading"
      :show-package-menu="showPackageMenu"
      :total-pages="totalPages"
      @update:current-page="pagination.currentPage = $event"
      @update:selected-packages="selectedPackages = $event"
      @update:show-package-menu="showPackageMenu = $event"
      @view="viewPackage"
      @edit="editPackage"
      @toggle-status="togglePackageStatus"
      @duplicate="duplicatePackage"
      @view-stats="viewPackageStats"
      @delete="deletePackage"
    />

      <!-- 批量操作 -->
      <BatchActions
        :selected-packages="selectedPackages"
        @batch-enable="batchEnablePackages"
        @batch-disable="batchDisablePackages"
        @batch-delete="batchDeletePackages"
        @clear-selection="clearSelection"
      />

      <!-- 能量包模态框 -->
      <PackageModal
        :show="showPackageModal"
        :mode="modalMode"
        :package="selectedPackage"
        :form="packageForm"
        :is-saving="isSaving"
        @close="closePackageModal"
        @save="savePackage"
        @edit="editPackage"
        @duplicate="duplicatePackage"
        @update:form="packageForm = $event"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import PackageStats from './EnergyPackages/components/PackageStats.vue'
import PackageSearch from './EnergyPackages/components/PackageSearch.vue'
import PackageList from './EnergyPackages/components/PackageList.vue'
import BatchActions from './EnergyPackages/components/BatchActions.vue'
import PackageModal from './EnergyPackages/components/PackageModal.vue'
import { useEnergyPackages } from './EnergyPackages/composables/useEnergyPackages'

// 使用 composable 获取所有状态和方法
const {
  // 响应式状态
  isLoading,
  isSaving,
  packages,
  filters,
  pagination,
  selectedPackages,
  showPackageModal,
  modalMode,
  selectedPackage,
  showPackageMenu,
  packageForm,
  
  // 计算属性
  filteredPackages,
  paginatedPackages,
  totalPages,
  
  // 数据操作
  refreshPackages,
  
  // 模态框操作
  viewPackage,
  editPackage,
  showCreatePackageModal,
  closePackageModal,
  savePackage,
  
  // 能量包操作
  togglePackageStatus,
  duplicatePackage,
  viewPackageStats,
  deletePackage,
  
  // 批量操作
  batchEnablePackages,
  batchDisablePackages,
  batchDeletePackages,
  clearSelection,
  
  // 其他操作
  exportPackages
} = useEnergyPackages()
</script>

<style scoped>
/* 页面特定样式 */
.min-h-screen {
  min-height: 100vh;
}
</style>